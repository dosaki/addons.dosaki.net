import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { unzipSync, zipSync } from 'fflate'
import { parse } from 'yaml'
import { OG_KEY, TOUCH_KEY } from '../packages/site/src/meta.js'
import { ogCard, touchIcon } from '../packages/site/src/og.js'

export interface AddonEntry {
  slug: string
  repo: string
}

export function parseAddonsYml(source: string): AddonEntry[] {
  const doc = parse(source) as { addons?: unknown }
  if (!Array.isArray(doc?.addons)) throw new Error('addons.yml: expected an "addons" list')

  return doc.addons.map((raw, i) => {
    const entry = raw as Record<string, unknown>
    const slug = entry['slug']
    const repo = entry['repo']
    if (typeof slug !== 'string') throw new Error(`addons.yml: entry ${i} has no slug`)
    if (typeof repo !== 'string') throw new Error(`addons.yml: entry ${i} (${slug}) has no repo`)
    return { slug, repo }
  })
}

async function latestBundle(repo: string, token: string): Promise<string | null> {
  const headers = { authorization: `Bearer ${token}`, 'user-agent': 'addons.dosaki.net' }

  const rel = await fetch(`https://api.github.com/repos/${repo}/releases/latest`, {
    headers: { ...headers, accept: 'application/vnd.github+json' },
  })
  if (!rel.ok) {
    console.error(`${repo}: latest release ${rel.status}`)
    return null
  }

  const assets = ((await rel.json()) as { assets?: Array<{ id: number; name: string }> }).assets ?? []
  const bundle = assets.find((a) => a.name === 'site-bundle.zip')
  if (bundle === undefined) {
    console.error(`${repo}: latest release has no site-bundle.zip`)
    return null
  }

  const res = await fetch(`https://api.github.com/repos/${repo}/releases/assets/${bundle.id}`, {
    headers: { ...headers, accept: 'application/octet-stream' },
  })
  if (!res.ok) {
    console.error(`${repo}: asset download ${res.status}`)
    return null
  }
  return Buffer.from(await res.arrayBuffer()).toString('base64')
}

/**
 * Adds the link-preview rasters the site cannot make for itself: social
 * scrapers reject SVG for og:image, so the addon's icon.svg is rendered to
 * PNG here.
 *
 * This runs at bake time rather than bundle time on purpose. It reaches
 * addons that were released before previews existed - they get one on the
 * next deploy, with no new release - and it keeps the card's look in this
 * repo, next to the theme whose background it is drawn on.
 *
 * The mtime matches buildBundle's, so a bundle whose contents did not change
 * still re-zips to the same bytes.
 */
export async function withPreviewImages(zip: Uint8Array): Promise<Uint8Array> {
  const files = unzipSync(zip)
  const icon = files['images/icon.svg']
  if (icon === undefined) return zip

  // fflate's Unzipped type pins Uint8Array<ArrayBuffer>; ogCard/touchIcon
  // return the looser Uint8Array<ArrayBufferLike> that sharp's Buffer output
  // produces, so a plain copy satisfies the stricter type.
  files[`images/${OG_KEY}`] = new Uint8Array(await ogCard(icon))
  files[`images/${TOUCH_KEY}`] = new Uint8Array(await touchIcon(icon))
  return zipSync(files, { level: 9, mtime: new Date(1980, 0, 1) })
}

/**
 * Wraps withPreviewImages with the per-addon degradation main() depends on:
 * one addon's broken logo must not cost the whole deploy its previews, so on
 * failure the bundle goes in as it arrived and the failure is only logged.
 * Split out from main() so this fallback path has a unit to test directly,
 * rather than only through main()'s network calls.
 */
export async function bakeAddonBundle(slug: string, bundleBase64: string): Promise<string> {
  try {
    return Buffer.from(
      await withPreviewImages(Buffer.from(bundleBase64, 'base64')),
    ).toString('base64')
  } catch (error) {
    // One addon's broken logo must not cost the whole deploy its previews,
    // so the bundle goes in as it arrived.
    console.error(
      `${slug}: preview generation failed, bundling as-is:`,
      error instanceof Error ? error.message : String(error),
    )
    return bundleBase64
  }
}

/**
 * The card for pages with no addon in scope. A missing logo is normal - the
 * file is supplied separately - and leaves those pages without a card rather
 * than failing the deploy.
 */
async function bakeSiteImages(): Promise<Record<string, string>> {
  let svg: Buffer
  try {
    svg = readFileSync('packages/site/static/logo.svg')
  } catch {
    console.error('packages/site/static/logo.svg missing; the site gets no card of its own')
    return {}
  }

  const [og, touch] = await Promise.all([ogCard(svg), touchIcon(svg)])
  return {
    og: Buffer.from(og).toString('base64'),
    touch: Buffer.from(touch).toString('base64'),
  }
}

async function main(): Promise<void> {
  const token = process.env['GH_TOKEN']
  if (token === undefined || token === '') throw new Error('GH_TOKEN is required')

  const entries = parseAddonsYml(readFileSync('addons.yml', 'utf8'))
  const baked = []

  for (const entry of entries) {
    const bundle = await latestBundle(entry.repo, token)
    // A null bundle still gets an entry: the site marks it unavailable rather
    // than silently forgetting the addon exists.
    baked.push({
      slug: entry.slug,
      repo: entry.repo,
      bundle: bundle === null ? '' : await bakeAddonBundle(entry.slug, bundle),
    })
    console.log(`${entry.slug}: ${bundle === null ? 'UNAVAILABLE' : 'ok'}`)
  }

  mkdirSync('packages/site/src', { recursive: true })
  writeFileSync(join('packages/site/src', 'site-data.json'), JSON.stringify(baked))
  writeFileSync(join('packages/site/src', 'site-images.json'), JSON.stringify(await bakeSiteImages()))
  console.log(`baked ${baked.length} addon(s)`)
}

if (process.argv[1]?.endsWith('bake.ts')) {
  main().catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : String(error))
    process.exit(1)
  })
}
