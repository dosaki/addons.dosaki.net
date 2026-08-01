import { addonPage, indexPage, notFoundPage } from './templates.js'
import type { AddonPage, SiteData } from './types.js'

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

/**
 * Returns null ONLY for routes that need a GitHub call; the caller handles
 * those. Everything else is answered from memory.
 */
export function route(site: SiteData, method: string, path: string): Response | null {
  if (method !== 'GET' && method !== 'HEAD') {
    return html(405, notFoundPage(site.addons))
  }

  const clean = path.length > 1 && path.endsWith('/') ? path.slice(0, -1) : path
  const parts = clean.split('/').filter((p) => p !== '')

  if (parts.length === 0) return html(200, indexPage(site.addons, site.unavailable))

  if (parts[0] === 'assets') {
    // /assets/:slug/:version/:file
    if (parts.length !== 4) return html(404, notFoundPage(site.addons))
    const addon = find(site, parts[1]!)
    if (addon === undefined || addon.version !== parts[2]) {
      return html(404, notFoundPage(site.addons))
    }
    const key = decodeURIComponent(parts[3]!)
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
    return null
  }

  if (parts.length === 1) {
    const addon = find(site, parts[0]!)
    if (addon !== undefined) return html(200, addonPage(addon))
  }

  return html(404, notFoundPage(site.addons))
}
