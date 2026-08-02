import { describe, expect, it } from 'vitest'
import { route } from '../src/handler.js'
import type { Response } from '../src/handler.js'
import type { AddonPage, SiteData } from '../src/types.js'

const addon: AddonPage = {
  slug: 'survivalrp',
  name: 'SurvivalRP',
  tagline: 'Survival mechanics.',
  version: '1.2.2',
  icon: 'icon.svg',
  html: '<h2 id="a">A</h2>',
  headings: [{ id: 'a', text: 'A' }],
  forms: [
    {
      key: 'bug_report',
      name: 'Bug report',
      description: 'Something is broken.',
      labels: [],
      fields: [],
    },
  ],
  assets: new Map<string, Uint8Array>([
    ['tab-dm.webp', new Uint8Array([1, 2, 3])],
    ['icon.svg', new Uint8Array([60, 115, 118, 103, 47, 62])],
  ]),
}
const site: SiteData = { addons: [addon], unavailable: [] }

describe('route', () => {
  it('serves the index', () => {
    const r = route(site, 'GET', '/') as Response
    expect(r.statusCode).toBe(200)
    expect(r.headers['content-type']).toContain('text/html')
    expect(r.body).toContain('SurvivalRP')
  })

  it('serves an addon page', () => {
    const r = route(site, 'GET', '/survivalrp') as Response
    expect(r.statusCode).toBe(200)
    expect(r.body).toContain('Contents')
  })

  it('never caches HTML, so a deploy is visible at once', () => {
    expect((route(site, 'GET', '/survivalrp') as Response).headers['cache-control']).toBe(
      'no-store',
    )
  })

  it('serves an asset base64-encoded with an immutable cache header', () => {
    const r = route(site, 'GET', '/assets/survivalrp/1.2.2/tab-dm.webp') as Response
    expect(r.statusCode).toBe(200)
    expect(r.isBase64Encoded).toBe(true)
    expect(Buffer.from(r.body, 'base64')).toEqual(Buffer.from([1, 2, 3]))
    expect(r.headers['cache-control']).toContain('immutable')
    expect(r.headers['content-type']).toBe('image/webp')
  })

  it('gives svg its own content type', () => {
    const r = route(site, 'GET', '/assets/survivalrp/1.2.2/icon.svg') as Response
    expect(r.headers['content-type']).toBe('image/svg+xml')
  })

  it('404s an asset from a version we do not hold', () => {
    expect((route(site, 'GET', '/assets/survivalrp/9.9.9/tab-dm.webp') as Response).statusCode).toBe(
      404,
    )
  })

  it('redirects a latest asset to its version-scoped url', () => {
    const r = route(site, 'GET', '/assets/survivalrp/latest/tab-dm.webp') as Response
    expect(r.statusCode).toBe(302)
    expect(r.headers['location']).toBe('/assets/survivalrp/1.2.2/tab-dm.webp')
  })

  it('does not let the latest alias be cached like an immutable asset', () => {
    const r = route(site, 'GET', '/assets/survivalrp/latest/tab-dm.webp') as Response
    expect(r.headers['cache-control']).not.toContain('immutable')
    expect(r.headers['cache-control']).toContain('max-age=300')
  })

  it('still serves an exact version immutably', () => {
    const r = route(site, 'GET', '/assets/survivalrp/1.2.2/tab-dm.webp') as Response
    expect(r.statusCode).toBe(200)
    expect(r.headers['cache-control']).toContain('immutable')
  })

  it('404s a latest asset the bundle does not carry', () => {
    expect((route(site, 'GET', '/assets/survivalrp/latest/nope.webp') as Response).statusCode).toBe(
      404,
    )
  })

  it('404s a latest asset for an unknown addon', () => {
    expect((route(site, 'GET', '/assets/nope/latest/tab-dm.webp') as Response).statusCode).toBe(404)
  })

  it('404s a malformed percent-sequence under latest, rather than throwing', () => {
    expect(() => route(site, 'GET', '/assets/survivalrp/latest/%zz')).not.toThrow()
    expect((route(site, 'GET', '/assets/survivalrp/latest/%zz') as Response).statusCode).toBe(404)
  })

  it('404s an unknown slug and lists what exists', () => {
    const r = route(site, 'GET', '/nope') as Response
    expect(r.statusCode).toBe(404)
    expect(r.body).toContain('/survivalrp')
  })

  it('defers download with its slug', () => {
    expect(route(site, 'GET', '/survivalrp/download')).toEqual({
      kind: 'download',
      slug: 'survivalrp',
    })
  })

  it('404s download for an unknown slug without calling GitHub', () => {
    expect((route(site, 'GET', '/nope/download') as Response).statusCode).toBe(404)
  })

  it('405s a non-GET', () => {
    const r = route(site, 'POST', '/') as Response
    expect(r.statusCode).toBe(405)
    expect(r.headers['allow']).toBe('GET, HEAD')
    expect(r.body).not.toContain('No addon lives at that address')
    expect(r.body).toContain('Method not allowed')
  })

  it('ignores a trailing slash', () => {
    expect((route(site, 'GET', '/survivalrp/') as Response).statusCode).toBe(200)
  })

  it('refuses a traversal attempt in an asset path', () => {
    const r = route(site, 'GET', '/assets/survivalrp/1.2.2/..%2Fmanifest.json') as Response
    expect(r.statusCode).toBe(404)
  })

  it('404s a malformed percent-sequence rather than throwing', () => {
    expect(() => route(site, 'GET', '/assets/survivalrp/1.2.2/%zz')).not.toThrow()
    expect((route(site, 'GET', '/assets/survivalrp/1.2.2/%zz') as Response).statusCode).toBe(404)
  })

  it('serves the form list', () => {
    const r = route(site, 'GET', '/survivalrp/report') as Response
    expect(r.statusCode).toBe(200)
    expect(r.body).toContain('Report a problem')
  })

  it('serves one form', () => {
    const r = route(site, 'GET', '/survivalrp/report/bug_report') as Response
    expect(r.statusCode).toBe(200)
    expect(r.body).toContain('action="/api/issue"')
  })

  it('404s an unknown form key', () => {
    expect((route(site, 'GET', '/survivalrp/report/nope') as Response).statusCode).toBe(404)
  })

  it('404s a form on an unknown addon', () => {
    expect((route(site, 'GET', '/nope/report/bug_report') as Response).statusCode).toBe(404)
  })

  it('defers POST /api/issue rather than answering it', () => {
    expect(route(site, 'POST', '/api/issue')).toEqual({ kind: 'issue' })
  })

  it('405s a GET to the api route, advertising POST', () => {
    const r = route(site, 'GET', '/api/issue') as Response
    expect(r.statusCode).toBe(405)
    expect(r.headers['allow']).toBe('POST')
  })

  it('405s a POST to a page route, advertising GET and HEAD', () => {
    const r = route(site, 'POST', '/survivalrp') as Response
    expect(r.statusCode).toBe(405)
    expect(r.headers['allow']).toBe('GET, HEAD')
  })

  it('serves the marcellus font base64-encoded and cached forever', () => {
    const r = route(site, 'GET', '/static/marcellus.woff2') as Response
    expect(r.statusCode).toBe(200)
    expect(r.headers['content-type']).toBe('font/woff2')
    expect(r.headers['cache-control']).toBe('public, max-age=31536000, immutable')
    expect(r.isBase64Encoded).toBe(true)
    expect(r.body.startsWith('d09GMg')).toBe(true)
  })
})
