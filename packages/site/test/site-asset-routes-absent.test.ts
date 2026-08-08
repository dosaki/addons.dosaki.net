import { describe, expect, it, vi } from 'vitest'

// Hoisted above the imports by vitest, so handler.js sees the mocked
// modules. Mirror of site-asset-routes-present.test.ts: states the
// absent-source precondition explicitly instead of inheriting it from the
// checkout not (yet) having static/logo.svg or a baked site-images.json, so
// this suite passes identically once either file shows up.
vi.mock('../src/site-icon.js', () => ({ siteLogo: null }))
vi.mock('../src/site-images.js', () => ({ siteImages: {} }))

import { route } from '../src/handler.js'
import type { Response } from '../src/handler.js'
import type { SiteData } from '../src/types.js'

const site: SiteData = { addons: [], unavailable: [] }

describe('site asset routes when their sources are absent', () => {
  it('404s each one, rather than crashing', () => {
    for (const path of ['/static/logo.svg', '/static/og.png', '/static/touch-icon.png', '/favicon.ico']) {
      const r = route(site, 'GET', path) as Response
      expect(r.statusCode).toBe(404)
    }
  })
})
