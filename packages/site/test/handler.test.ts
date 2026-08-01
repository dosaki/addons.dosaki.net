import { describe, expect, it } from 'vitest'
import { route } from '../src/handler.js'
import type { AddonPage, SiteData } from '../src/types.js'

const addon: AddonPage = {
  slug: 'survivalrp',
  name: 'SurvivalRP',
  tagline: 'Survival mechanics.',
  version: '1.2.2',
  icon: 'icon.svg',
  html: '<h2 id="a">A</h2>',
  headings: [{ id: 'a', text: 'A' }],
  assets: new Map<string, Uint8Array>([
    ['tab-dm.webp', new Uint8Array([1, 2, 3])],
    ['icon.svg', new Uint8Array([60, 115, 118, 103, 47, 62])],
  ]),
}
const site: SiteData = { addons: [addon], unavailable: [] }

describe('route', () => {
  it('serves the index', () => {
    const r = route(site, 'GET', '/')!
    expect(r.statusCode).toBe(200)
    expect(r.headers['content-type']).toContain('text/html')
    expect(r.body).toContain('SurvivalRP')
  })

  it('serves an addon page', () => {
    const r = route(site, 'GET', '/survivalrp')!
    expect(r.statusCode).toBe(200)
    expect(r.body).toContain('Contents')
  })

  it('never caches HTML, so a deploy is visible at once', () => {
    expect(route(site, 'GET', '/survivalrp')!.headers['cache-control']).toBe('no-store')
  })

  it('serves an asset base64-encoded with an immutable cache header', () => {
    const r = route(site, 'GET', '/assets/survivalrp/1.2.2/tab-dm.webp')!
    expect(r.statusCode).toBe(200)
    expect(r.isBase64Encoded).toBe(true)
    expect(Buffer.from(r.body, 'base64')).toEqual(Buffer.from([1, 2, 3]))
    expect(r.headers['cache-control']).toContain('immutable')
    expect(r.headers['content-type']).toBe('image/webp')
  })

  it('gives svg its own content type', () => {
    const r = route(site, 'GET', '/assets/survivalrp/1.2.2/icon.svg')!
    expect(r.headers['content-type']).toBe('image/svg+xml')
  })

  it('404s an asset from a version we do not hold', () => {
    expect(route(site, 'GET', '/assets/survivalrp/9.9.9/tab-dm.webp')!.statusCode).toBe(404)
  })

  it('404s an unknown slug and lists what exists', () => {
    const r = route(site, 'GET', '/nope')!
    expect(r.statusCode).toBe(404)
    expect(r.body).toContain('/survivalrp')
  })

  it('returns null for download, which needs GitHub', () => {
    expect(route(site, 'GET', '/survivalrp/download')).toBeNull()
  })

  it('404s download for an unknown slug without calling GitHub', () => {
    expect(route(site, 'GET', '/nope/download')!.statusCode).toBe(404)
  })

  it('405s a non-GET', () => {
    expect(route(site, 'POST', '/')!.statusCode).toBe(405)
  })

  it('ignores a trailing slash', () => {
    expect(route(site, 'GET', '/survivalrp/')!.statusCode).toBe(200)
  })

  it('refuses a traversal attempt in an asset path', () => {
    const r = route(site, 'GET', '/assets/survivalrp/1.2.2/..%2Fmanifest.json')!
    expect(r.statusCode).toBe(404)
  })
})
