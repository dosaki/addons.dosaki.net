import { describe, expect, it, vi } from 'vitest'

// Hoisted above the imports by vitest, so handler.js sees the mocked modules.
// handler.test.ts covers the 404 path with the real (absent) modules; this
// file covers the 200 path, which the checkout cannot otherwise exercise.
vi.mock('../src/site-icon.js', () => ({ siteLogo: '<svg viewBox="0 0 10 10"></svg>' }))
vi.mock('../src/site-images.js', () => ({ siteImages: { og: 'QUJD', touch: 'REVG' } }))

import { route } from '../src/handler.js'
import type { Response } from '../src/handler.js'
import type { SiteData } from '../src/types.js'

const site: SiteData = { addons: [], unavailable: [] }

describe('site asset routes when their sources are present', () => {
  it('serves the logo as inline svg', () => {
    const r = route(site, 'GET', '/static/logo.svg') as Response
    expect(r.statusCode).toBe(200)
    expect(r.headers['content-type']).toBe('image/svg+xml')
    expect(r.headers['cache-control']).toBe('public, max-age=3600')
    expect(r.body).toBe('<svg viewBox="0 0 10 10"></svg>')
    expect(r.isBase64Encoded).toBe(false)
  })

  it('serves the og image base64-encoded', () => {
    const r = route(site, 'GET', '/static/og.png') as Response
    expect(r.statusCode).toBe(200)
    expect(r.headers['content-type']).toBe('image/png')
    expect(r.headers['cache-control']).toBe('public, max-age=3600')
    expect(r.body).toBe('QUJD')
    expect(r.isBase64Encoded).toBe(true)
  })

  it('serves the touch icon base64-encoded', () => {
    const r = route(site, 'GET', '/static/touch-icon.png') as Response
    expect(r.statusCode).toBe(200)
    expect(r.headers['content-type']).toBe('image/png')
    expect(r.headers['cache-control']).toBe('public, max-age=3600')
    expect(r.body).toBe('REVG')
    expect(r.isBase64Encoded).toBe(true)
  })

  it('answers /favicon.ico with the touch icon as png, not the 404 page', () => {
    const r = route(site, 'GET', '/favicon.ico') as Response
    expect(r.statusCode).toBe(200)
    expect(r.headers['content-type']).toBe('image/png')
    expect(r.body).toBe('REVG')
    expect(r.isBase64Encoded).toBe(true)
  })
})
