import { strFromU8, unzipSync } from 'fflate'
import { renderReadme } from './render.js'
import type { AddonPage, SiteData } from './types.js'

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

/**
 * These reach the page inside href/src attributes. The templates HTML-escape
 * them, which stops injection but not malformed URLs, and by then there is no
 * way to reject a bad value - so the check belongs here, at the boundary.
 */
function safe(value: string, pattern: RegExp, field: string): string {
  if (!pattern.test(value)) throw new Error(`${field} "${value}" is not URL-safe`)
  return value
}

export function loadBundle(slug: string, zip: Uint8Array): AddonPage {
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

  const assets = new Map<string, Uint8Array>()
  for (const [path, bytes] of Object.entries(files)) {
    if (path.startsWith('images/')) assets.set(path.slice('images/'.length), bytes)
  }

  const icon = typeof manifest.icon === 'string' ? manifest.icon : undefined

  return {
    // The caller's slug wins: it is what the URL routes on, and addons.yml owns it.
    slug: safe(slug, SLUG, 'slug'),
    name: str(manifest.name, 'name'),
    tagline: str(manifest.tagline, 'tagline'),
    version: safe(str(manifest.version, 'version'), VERSION, 'version'),
    icon,
    html,
    headings,
    assets,
  }
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
