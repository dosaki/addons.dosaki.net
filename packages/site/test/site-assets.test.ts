import { describe, expect, it } from 'vitest'
import { siteLogo } from '../src/site-icon.js'
import { siteImages } from '../src/site-images.js'

describe('siteLogo', () => {
  it('loads without throwing whether or not the file is there', () => {
    // static/logo.svg is supplied separately and may not exist yet. A
    // missing site logo costs the root page its favicon and card; it must
    // never cost the site its ability to boot.
    expect(siteLogo === null || typeof siteLogo === 'string').toBe(true)
  })

  it('reads real svg source when the file is present', () => {
    if (siteLogo === null) return
    expect(siteLogo).toContain('<svg')
  })
})

describe('siteImages', () => {
  it('is an object even with no baked file, so callers can just read keys', () => {
    // site-images.json is baked at deploy time and not committed, so a
    // fresh checkout has none - the same contract as site-data.json.
    expect(typeof siteImages).toBe('object')
    expect(siteImages).not.toBeNull()
  })

  it('exposes og and touch as base64 strings when they were baked', () => {
    if (siteImages.og !== undefined) expect(typeof siteImages.og).toBe('string')
    if (siteImages.touch !== undefined) expect(typeof siteImages.touch).toBe('string')
  })
})
