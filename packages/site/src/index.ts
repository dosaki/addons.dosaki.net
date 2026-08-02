import { GetParameterCommand, SSMClient } from '@aws-sdk/client-ssm'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { buildSite } from './build.js'
import { appJwt, createIssue, downloadRedirect, installationToken } from './github.js'
import { isDeferred, route } from './handler.js'
import type { FunctionUrlEvent, Response } from './handler.js'
import { esc, THEME_CSS } from './templates.js'
import { issueBody, issueTitle, validateSubmission } from './issue.js'
import type { SiteData } from './types.js'

/** Baked at deploy time by the deploy workflow. */
interface BakedEntry { slug: string; repo: string; bundle: string }

const baked = JSON.parse(
  readFileSync(join(import.meta.dirname, 'site-data.json'), 'utf8'),
) as BakedEntry[]

const REPOS = new Map(baked.map((e) => [e.slug, e.repo]))

const site: SiteData = buildSite(
  baked.map((e) => ({
    slug: e.slug,
    zip: e.bundle === '' ? null : Buffer.from(e.bundle, 'base64'),
  })),
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

async function download(slug: string): Promise<Response> {
  // route() already checked the slug exists before deferring here.
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

export interface Submission {
  slug: string
  form: string
  fields: Record<string, string>
}

/**
 * Two encodings on purpose: JSON from the React island, form-encoded from a
 * plain browser POST when the island failed to load. Both must produce an
 * identical issue.
 */
export function parseSubmission(
  contentType: string | undefined,
  body: string,
  isBase64: boolean,
): Submission {
  const raw = isBase64 ? Buffer.from(body, 'base64').toString('utf8') : body
  const type = (contentType ?? '').toLowerCase()

  if (type.includes('application/json')) {
    const parsed = JSON.parse(raw) as Partial<Submission>
    if (typeof parsed.slug !== 'string' || typeof parsed.form !== 'string') {
      throw new Error('slug and form are required')
    }
    return { slug: parsed.slug, form: parsed.form, fields: parsed.fields ?? {} }
  }

  if (type.includes('application/x-www-form-urlencoded')) {
    const params = new URLSearchParams(raw)
    const fields: Record<string, string> = {}
    for (const key of new Set(params.keys())) {
      if (key === 'slug' || key === 'form') continue
      // Repeated keys are how a checkbox group arrives; issue.ts splits on
      // "\n" to check required options, so it - not a comma - is the join.
      fields[key] = params.getAll(key).join('\n')
    }
    const slug = params.get('slug')
    const form = params.get('form')
    if (slug === null || form === null) throw new Error('slug and form are required')
    return { slug, form, fields }
  }

  throw new Error(`unsupported content-type: ${type || '(none)'}`)
}

function page(title: string, body: string): string {
  return `<!doctype html>
<html lang="en"><head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<style>${THEME_CSS}</style>
</head><body>
<div class="wrap">${body}</div>
<footer class="site"><div class="wrap">addons.dosaki.net</div></footer>
</body></html>`
}

/**
 * Files the report GitHub issue for either request shape. A JSON body (the
 * React island) gets a JSON response back; a form-encoded body (the no-JS
 * fallback POST) gets a rendered HTML page - for success AND for a
 * validation problem, since a player without JavaScript must be able to
 * read what went wrong on a page, not raw JSON.
 */
async function fileIssue(event: FunctionUrlEvent): Promise<Response> {
  const contentType = event.headers?.['content-type']
  const asJson = (contentType ?? '').toLowerCase().includes('application/json')

  function jsonResponse(statusCode: number, data: unknown): Response {
    return {
      statusCode,
      headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' },
      body: JSON.stringify(data),
      isBase64Encoded: false,
    }
  }

  function htmlResponse(statusCode: number, body: string): Response {
    return {
      statusCode,
      headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' },
      body,
      isBase64Encoded: false,
    }
  }

  function problem(statusCode: number, messages: string[]): Response {
    if (asJson) return jsonResponse(statusCode, { errors: messages })
    const items = messages.map((m) => `<li>${esc(m)}</li>`).join('')
    return htmlResponse(
      statusCode,
      page(
        'Could not file report - addons.dosaki.net',
        `<h1 class="page">Could not file report</h1><ul>${items}</ul>`,
      ),
    )
  }

  function json(statusCode: number, data: { number: number }): Response {
    if (asJson) return jsonResponse(statusCode, data)
    return htmlResponse(
      statusCode,
      page(
        'Report filed - addons.dosaki.net',
        `<h1 class="page">Thanks</h1><p>Your report was filed as issue #${data.number}.</p>`,
      ),
    )
  }

  let submission: Submission
  try {
    submission = parseSubmission(contentType, event.body ?? '', event.isBase64Encoded === true)
  } catch (error) {
    return problem(400, [error instanceof Error ? error.message : 'Unreadable request'])
  }

  const addon = site.addons.find((a) => a.slug === submission.slug)
  if (addon === undefined) return problem(404, ['No such addon'])
  const form = addon.forms.find((f) => f.key === submission.form)
  if (form === undefined) return problem(404, ['No such form'])

  const problems = validateSubmission(form, submission.fields)
  if (problems.length > 0) return problem(400, problems)

  try {
    const number = await createIssue(REPOS.get(addon.slug)!, await githubToken(), {
      title: issueTitle(form, submission.fields),
      body: issueBody(form, submission.fields),
      labels: form.labels,
    })
    return json(201, { number })
  } catch (error) {
    console.error('file issue failed:', error instanceof Error ? error.message : String(error))
    return problem(502, ['The report could not be filed just now. Please try again shortly.'])
  }
}

export async function handler(event: FunctionUrlEvent): Promise<Response> {
  const method = event.requestContext?.http?.method ?? 'GET'
  const path = event.rawPath ?? '/'

  const result = route(site, method, path)
  if (!isDeferred(result)) return result
  if (result.kind === 'download') return download(result.slug)
  return fileIssue(event)
}
