import { describe, expect, it, vi } from 'vitest'
import { route } from '../src/handler.js'
import type { Response } from '../src/handler.js'
import type { SiteData } from '../src/types.js'

// Hoisted above the imports by vitest, so handler.js sees the mocked module.
vi.mock('../src/font.js', () => ({ marcellusFont: null }))

const site: SiteData = { addons: [], unavailable: [] }

describe('route with the font file missing', () => {
  it('404s the font route instead of crashing', () => {
    const r = route(site, 'GET', '/static/marcellus.woff2') as Response
    expect(r.statusCode).toBe(404)
  })

  it('still serves pages', () => {
    expect((route(site, 'GET', '/') as Response).statusCode).toBe(200)
  })
})
