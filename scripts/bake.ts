import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { parse } from 'yaml'

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

async function main(): Promise<void> {
  const token = process.env['GH_TOKEN']
  if (token === undefined || token === '') throw new Error('GH_TOKEN is required')

  const entries = parseAddonsYml(readFileSync('addons.yml', 'utf8'))
  const baked = []

  for (const entry of entries) {
    const bundle = await latestBundle(entry.repo, token)
    // A null bundle still gets an entry: the site marks it unavailable rather
    // than silently forgetting the addon exists.
    baked.push({ slug: entry.slug, repo: entry.repo, bundle: bundle ?? '' })
    console.log(`${entry.slug}: ${bundle === null ? 'UNAVAILABLE' : 'ok'}`)
  }

  mkdirSync('packages/site/src', { recursive: true })
  writeFileSync(join('packages/site/src', 'site-data.json'), JSON.stringify(baked))
  console.log(`baked ${baked.length} addon(s)`)
}

if (process.argv[1]?.endsWith('bake.ts')) {
  main().catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : String(error))
    process.exit(1)
  })
}
