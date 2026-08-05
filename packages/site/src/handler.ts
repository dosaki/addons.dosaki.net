import { clientBundle } from './client-bundle.js'
import { marcellusFont } from './font.js'
import {
  addonPage,
  indexPage,
  methodNotAllowedPage,
  notFoundPage,
  reportFormPage,
  reportListPage,
} from './templates.js'
import type { AddonPage, Deferred, SiteData } from './types.js'

export interface Response {
  statusCode: number
  headers: Record<string, string>
  body: string
  isBase64Encoded: boolean
}

/** Lambda Function URLs deliver the API-Gateway-v2 payload shape. */
export interface FunctionUrlEvent {
  rawPath?: string
  requestContext?: { http?: { method?: string } }
  headers?: Record<string, string>
  body?: string
  isBase64Encoded?: boolean
}

const HTML = { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' }
const IMMUTABLE = 'public, max-age=31536000, immutable'

const CONTENT_TYPES: Record<string, string> = {
  webp: 'image/webp',
  svg: 'image/svg+xml',
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  gif: 'image/gif',
}

function html(statusCode: number, body: string): Response {
  return { statusCode, headers: { ...HTML }, body, isBase64Encoded: false }
}

function find(site: SiteData, slug: string): AddonPage | undefined {
  return site.addons.find((a) => a.slug === slug)
}

/** `Allow` must name what THIS resource accepts, not what pages accept. */
function methodNotAllowed(allow: string): Response {
  return {
    statusCode: 405,
    headers: { ...HTML, allow },
    body: methodNotAllowedPage(),
    isBase64Encoded: false,
  }
}

/** True for a route the router cannot answer alone because it needs a GitHub call. */
export function isDeferred(r: Response | Deferred): r is Deferred {
  return 'kind' in r
}

/**
 * Returns a Deferred ONLY for routes that need a GitHub call; the caller
 * handles those. Everything else is answered from memory.
 */
export function route(site: SiteData, method: string, path: string): Response | Deferred {
  const clean = path.length > 1 && path.endsWith('/') ? path.slice(0, -1) : path
  const parts = clean.split('/').filter((p) => p !== '')

  if (clean === '/api/issue') {
    if (method !== 'POST') return methodNotAllowed('POST')
    return { kind: 'issue' }
  }

  if (clean === '/api/vote') {
    if (method !== 'POST') return methodNotAllowed('POST')
    return { kind: 'vote' }
  }

  if (method !== 'GET' && method !== 'HEAD') return methodNotAllowed('GET, HEAD')

  if (parts.length === 0) return html(200, indexPage(site.addons, site.unavailable))

  if (clean === '/static/form.js') {
    return {
      statusCode: 200,
      headers: {
        'content-type': 'text/javascript; charset=utf-8',
        // Not version-scoped, so it must revalidate rather than cache forever.
        'cache-control': 'public, max-age=300',
      },
      body: clientBundle,
      isBase64Encoded: false,
    }
  }

  if (clean === '/static/marcellus.woff2') {
    // Never changes without being renamed, so it can cache forever.
    if (marcellusFont === null) return html(404, notFoundPage(site.addons))
    return {
      statusCode: 200,
      headers: { 'content-type': 'font/woff2', 'cache-control': IMMUTABLE },
      body: marcellusFont,
      isBase64Encoded: true,
    }
  }

  if (parts[0] === 'assets') {
    // /assets/:slug/:version/:file
    if (parts.length !== 4) return html(404, notFoundPage(site.addons))
    const addon = find(site, parts[1]!)
    if (addon === undefined) return html(404, notFoundPage(site.addons))

    let key: string
    try {
      key = decodeURIComponent(parts[3]!)
    } catch {
      // A malformed percent-sequence is a bad request, not a server fault.
      return html(404, notFoundPage(site.addons))
    }

    if (parts[2] === 'latest') {
      // The site bakes exactly one bundle per addon, so "latest" is simply
      // its current version - no resolution logic, no ambiguity. This is a
      // REDIRECT, never a served body: the alias's meaning changes on every
      // release, so it must revalidate often while the versioned target it
      // points at stays immutable.
      if (!addon.assets.has(key)) return html(404, notFoundPage(site.addons))
      return {
        statusCode: 302,
        headers: {
          location: `/assets/${addon.slug}/${addon.version}/${parts[3]}`,
          'cache-control': 'public, max-age=300',
        },
        body: '',
        isBase64Encoded: false,
      }
    }

    if (addon.version !== parts[2]) return html(404, notFoundPage(site.addons))
    const bytes = addon.assets.get(key)
    if (bytes === undefined) return html(404, notFoundPage(site.addons))

    const ext = key.split('.').pop()?.toLowerCase() ?? ''
    return {
      statusCode: 200,
      headers: {
        'content-type': CONTENT_TYPES[ext] ?? 'application/octet-stream',
        'cache-control': IMMUTABLE,
      },
      body: Buffer.from(bytes).toString('base64'),
      isBase64Encoded: true,
    }
  }

  if (parts.length === 2 && parts[1] === 'download') {
    // 404 an unknown slug here rather than spending a GitHub call on it.
    if (find(site, parts[0]!) === undefined) return html(404, notFoundPage(site.addons))
    return { kind: 'download', slug: parts[0]! }
  }

  if (parts.length === 2 && parts[1] === 'reports') {
    // 404 an unknown slug here rather than spending a GitHub call on it.
    if (find(site, parts[0]!) === undefined) return html(404, notFoundPage(site.addons))
    return { kind: 'issues', slug: parts[0]! }
  }

  if (parts.length === 3 && parts[1] === 'reports') {
    // Canonical numbers only ("07" would alias "7" as a second URL).
    if (find(site, parts[0]!) === undefined || !/^[1-9]\d*$/.test(parts[2]!)) {
      return html(404, notFoundPage(site.addons))
    }
    return { kind: 'report', slug: parts[0]!, number: Number(parts[2]) }
  }

  if (parts.length === 2 && parts[1] === 'report') {
    const addon = find(site, parts[0]!)
    if (addon !== undefined) return html(200, reportListPage(addon))
  }

  if (parts.length === 3 && parts[1] === 'report') {
    const addon = find(site, parts[0]!)
    const form = addon?.forms.find((f) => f.key === parts[2])
    if (addon !== undefined && form !== undefined) return html(200, reportFormPage(addon, form))
  }

  if (parts.length === 1) {
    const addon = find(site, parts[0]!)
    if (addon !== undefined) return html(200, addonPage(addon))
  }

  return html(404, notFoundPage(site.addons))
}
