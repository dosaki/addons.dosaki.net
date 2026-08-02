import { strFromU8, unzipSync } from 'fflate'
import { renderReadme } from './render.js'
import type { AddonPage, FormDefinition, SiteData } from './types.js'

/**
 * The compatibility seam. A bundle from a newer generator is skipped rather
 * than half-read, so one addon can never break the whole page.
 */
export const SUPPORTED_SCHEMA = 1

interface RawManifest {
  schemaVersion?: unknown
  name?: unknown
  tagline?: unknown
  version?: unknown
  icon?: unknown
}

function str(value: unknown, field: string): string {
  if (typeof value !== 'string' || value === '') {
    throw new Error(`manifest.${field} is missing or not a string`)
  }
  return value
}

const SLUG = /^[a-z0-9][a-z0-9-]*$/
const VERSION = /^[A-Za-z0-9][A-Za-z0-9._+-]*$/

/** Would collide with the /assets/* cache behaviour and route prefix. */
const RESERVED_SLUGS = new Set(['assets', 'api'])

/**
 * These reach the page inside href/src attributes. The templates HTML-escape
 * them, which stops injection but not malformed URLs, and by then there is no
 * way to reject a bad value - so the check belongs here, at the boundary.
 */
function safe(value: string, pattern: RegExp, field: string): string {
  if (!pattern.test(value)) throw new Error(`${field} "${value}" is not URL-safe`)
  return value
}

/**
 * Deliberately shallow: key/name/fields present and of the right kind. Not
 * full schema validation - the bundle comes from our own generator over an
 * authenticated channel, so the goal is only to fail at this boundary rather
 * than three modules later when something renders a malformed entry.
 */
function isForm(value: unknown): value is FormDefinition {
  if (value === null || typeof value !== 'object') return false
  const f = value as Record<string, unknown>
  return typeof f['key'] === 'string' && typeof f['name'] === 'string' && Array.isArray(f['fields'])
}

export function loadBundle(slug: string, zip: Uint8Array): AddonPage {
  if (RESERVED_SLUGS.has(slug)) {
    throw new Error(`${slug}: slug is reserved`)
  }

  const files = unzipSync(zip)

  const manifestRaw = files['manifest.json']
  if (manifestRaw === undefined) throw new Error(`${slug}: bundle has no manifest.json`)
  const manifest = JSON.parse(strFromU8(manifestRaw)) as RawManifest

  if (manifest.schemaVersion !== SUPPORTED_SCHEMA) {
    throw new Error(
      `${slug}: schemaVersion ${String(manifest.schemaVersion)} is not supported ` +
        `(this site understands ${SUPPORTED_SCHEMA})`,
    )
  }

  const readmeRaw = files['readme.md']
  if (readmeRaw === undefined) throw new Error(`${slug}: bundle has no readme.md`)
  const { html, headings } = renderReadme(strFromU8(readmeRaw))

  const formsRaw = files['forms.json']
  let forms: FormDefinition[] = []
  if (formsRaw !== undefined) {
    const parsed: unknown = JSON.parse(strFromU8(formsRaw))
    if (!Array.isArray(parsed)) throw new Error(`${slug}: forms.json is not an array`)
    // Checked rather than cast: an unchecked entry would survive to whatever
    // renders it and become a 500, instead of marking this addon unavailable.
    if (!parsed.every(isForm)) throw new Error(`${slug}: forms.json has a malformed entry`)
    forms = parsed
  }

  const assets = new Map<string, Uint8Array>()
  for (const [path, bytes] of Object.entries(files)) {
    if (path.startsWith('images/')) assets.set(path.slice('images/'.length), bytes)
  }

  const icon = typeof manifest.icon === 'string' ? manifest.icon : undefined

  const safeSlug = safe(slug, SLUG, 'slug')
  const safeVersion = safe(str(manifest.version, 'version'), VERSION, 'version')

  return {
    // The caller's slug wins: it is what the URL routes on, and addons.yml owns it.
    slug: safeSlug,
    name: str(manifest.name, 'name'),
    tagline: str(manifest.tagline, 'tagline'),
    version: safeVersion,
    icon,
    html: resolveAssetUrls(html, safeSlug, safeVersion, assets),
    headings,
    forms,
    assets,
  }
}

/**
 * rewriteReadme leaves bare bundle keys so the SITE owns URL shape. This is
 * where that shape is applied. Only keys the bundle actually carries are
 * rewritten, so external URLs and anything unrecognised are left untouched.
 */
function resolveAssetUrls(
  html: string,
  slug: string,
  version: string,
  assets: Map<string, Uint8Array>,
): string {
  return html.replace(/src="([^"]+)"/g, (match, ref: string) =>
    assets.has(ref) ? `src="/assets/${slug}/${version}/${ref}"` : match,
  )
}

export function buildSite(
  entries: Array<{ slug: string; zip: Uint8Array | null }>,
): SiteData {
  const addons: AddonPage[] = []
  const unavailable: string[] = []

  for (const entry of entries) {
    if (entry.zip === null) {
      unavailable.push(entry.slug)
      continue
    }
    try {
      addons.push(loadBundle(entry.slug, entry.zip))
    } catch (error) {
      console.error(
        `skipping ${entry.slug}:`,
        error instanceof Error ? error.message : String(error),
      )
      unavailable.push(entry.slug)
    }
  }

  return { addons, unavailable }
}
