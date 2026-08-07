import { readFileSync } from 'node:fs'
import { join } from 'node:path'

export interface SiteImages {
  /** base64-encoded PNG: the 1200x630 card. */
  og?: string
  /** base64-encoded PNG: the 180x180 touch icon. */
  touch?: string
}

/**
 * Baked by scripts/bake.ts from static/logo.svg, exactly like site-data.json:
 * generated at deploy time and never committed, so a fresh checkout has none.
 * Absent is a normal state, not an error - an empty object simply means the
 * pages with no addon in scope go without a card.
 */
function read(): SiteImages {
  try {
    const raw = readFileSync(join(import.meta.dirname, 'site-images.json'), 'utf8')
    return JSON.parse(raw) as SiteImages
  } catch {
    console.error('site-images.json missing; the site has no preview card of its own')
    return {}
  }
}

export const siteImages = read()
