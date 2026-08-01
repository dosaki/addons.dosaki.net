import { GetParameterCommand, SSMClient } from '@aws-sdk/client-ssm'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { buildSite } from './build.js'
import { appJwt, downloadRedirect, installationToken } from './github.js'
import { route } from './handler.js'
import type { FunctionUrlEvent, Response } from './handler.js'
import type { SiteData } from './types.js'

/** Baked at deploy time by the deploy workflow. */
interface BakedEntry { slug: string; repo: string; bundle: string }

const baked = JSON.parse(
  readFileSync(join(import.meta.dirname, 'site-data.json'), 'utf8'),
) as BakedEntry[]

const REPOS = new Map(baked.map((e) => [e.slug, e.repo]))

const site: SiteData = buildSite(
  baked.map((e) => ({ slug: e.slug, zip: Buffer.from(e.bundle, 'base64') })),
)

let cachedToken: { value: string; expires: number } | null = null
let cachedKey: string | null = null

async function githubToken(): Promise<string> {
  const now = Date.now()
  if (cachedToken !== null && cachedToken.expires > now) return cachedToken.value

  if (cachedKey === null) {
    const ssm = new SSMClient({})
    const got = await ssm.send(
      new GetParameterCommand({ Name: process.env['APP_KEY_PARAM'], WithDecryption: true }),
    )
    const value = got.Parameter?.Value
    if (value === undefined) throw new Error('app private key parameter is empty')
    cachedKey = value
  }

  const jwt = appJwt(process.env['APP_ID'] ?? '', cachedKey, now)
  const token = await installationToken(jwt, process.env['APP_INSTALLATION_ID'] ?? '')
  // Installation tokens last an hour; refresh at 55 minutes.
  cachedToken = { value: token, expires: now + 55 * 60 * 1000 }
  return token
}

export async function handler(event: FunctionUrlEvent): Promise<Response> {
  const method = event.requestContext?.http?.method ?? 'GET'
  const path = event.rawPath ?? '/'

  const answered = route(site, method, path)
  if (answered !== null) return answered

  // Only /:slug/download reaches here, and route() already checked the slug.
  const slug = path.split('/').filter((p) => p !== '')[0]!
  const repo = REPOS.get(slug)!
  try {
    const location = await downloadRedirect(repo, await githubToken())
    return {
      statusCode: 302,
      headers: { location, 'cache-control': 'no-store' },
      body: '',
      isBase64Encoded: false,
    }
  } catch (error) {
    console.error('download failed:', error instanceof Error ? error.message : String(error))
    return {
      statusCode: 502,
      headers: { 'content-type': 'text/plain; charset=utf-8', 'cache-control': 'no-store' },
      body: 'The download is temporarily unavailable. Please try again shortly.',
      isBase64Encoded: false,
    }
  }
}
