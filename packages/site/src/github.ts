import { createSign } from 'node:crypto'

const API = 'https://api.github.com'
const UA = 'addons.dosaki.net'

function b64url(input: Buffer | string): string {
  return Buffer.from(input).toString('base64url')
}

/**
 * A GitHub App JWT. iat is backdated 60s because GitHub rejects a token whose
 * iat is even slightly in the future relative to their clock.
 */
export function appJwt(appId: string, privateKey: string, now: number): string {
  const iat = Math.floor(now / 1000) - 60
  const header = b64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }))
  const payload = b64url(JSON.stringify({ iat, exp: iat + 540, iss: appId }))

  const sign = createSign('RSA-SHA256')
  sign.update(`${header}.${payload}`)
  // SSM and Actions secrets frequently deliver the PEM with escaped newlines.
  const pem = privateKey.includes('\\n') ? privateKey.replace(/\\n/g, '\n') : privateKey
  return `${header}.${payload}.${b64url(sign.sign(pem))}`
}

export async function installationToken(
  jwt: string,
  installationId: string,
  fetchImpl: typeof fetch = fetch,
): Promise<string> {
  const res = await fetchImpl(`${API}/app/installations/${installationId}/access_tokens`, {
    method: 'POST',
    headers: { authorization: `Bearer ${jwt}`, accept: 'application/vnd.github+json', 'user-agent': UA },
  })
  if (!res.ok) throw new Error(`installation token failed: ${res.status} ${await res.text()}`)
  return ((await res.json()) as { token: string }).token
}

interface ReleaseAsset {
  id: number
  name: string
}

/**
 * Resolves the latest release's addon zip to GitHub's short-lived signed URL.
 * The bytes never transit this Lambda.
 */
export async function downloadRedirect(
  repo: string,
  token: string,
  fetchImpl: typeof fetch = fetch,
): Promise<string> {
  const auth = { authorization: `Bearer ${token}`, 'user-agent': UA }

  const rel = await fetchImpl(`${API}/repos/${repo}/releases/latest`, {
    headers: { ...auth, accept: 'application/vnd.github+json' },
  })
  if (!rel.ok) throw new Error(`latest release failed: ${rel.status}`)

  const assets = ((await rel.json()) as { assets?: ReleaseAsset[] }).assets ?? []
  // site-bundle.zip is machinery for this site, never the thing a player wants.
  const wanted = assets.find((a) => a.name.endsWith('.zip') && a.name !== 'site-bundle.zip')
  if (wanted === undefined) throw new Error(`${repo}: release has no downloadable asset`)

  const asset = await fetchImpl(`${API}/repos/${repo}/releases/assets/${wanted.id}`, {
    headers: { ...auth, accept: 'application/octet-stream' },
    // MUST be manual: following it buffers the whole zip and leaks the
    // Authorization header to GitHub's storage host.
    redirect: 'manual',
  })
  const location = asset.headers.get('location')
  if (location === null) throw new Error(`${repo}: expected a redirect, got ${asset.status}`)
  return location
}

export interface IssueSummary {
  number: number
  title: string
  body: string | null
  createdAt: string
}

interface RawIssue {
  number: number
  title: string
  body: string | null
  created_at: string
  state: string
  pull_request?: unknown
}

/** Open issues only; GitHub's issues API mixes in pull requests, dropped here. */
export async function listOpenIssues(
  repo: string,
  token: string,
  fetchImpl: typeof fetch = fetch,
): Promise<IssueSummary[]> {
  const res = await fetchImpl(`${API}/repos/${repo}/issues?state=open&per_page=100`, {
    headers: { authorization: `Bearer ${token}`, accept: 'application/vnd.github+json', 'user-agent': UA },
  })
  if (!res.ok) throw new Error(`list issues failed: ${res.status} ${await res.text()}`)
  const raw = (await res.json()) as RawIssue[]
  return raw
    .filter((i) => i.pull_request === undefined)
    .map((i) => ({ number: i.number, title: i.title, body: i.body, createdAt: i.created_at }))
}

export interface IssueDetail {
  number: number
  title: string
  body: string | null
  state: string
  createdAt: string
  isPullRequest: boolean
}

/** null for a missing issue - the caller turns that into its own 404. */
export async function getIssue(
  repo: string,
  number: number,
  token: string,
  fetchImpl: typeof fetch = fetch,
): Promise<IssueDetail | null> {
  const res = await fetchImpl(`${API}/repos/${repo}/issues/${number}`, {
    headers: { authorization: `Bearer ${token}`, accept: 'application/vnd.github+json', 'user-agent': UA },
  })
  if (res.status === 404) return null
  if (!res.ok) throw new Error(`get issue failed: ${res.status} ${await res.text()}`)
  const raw = (await res.json()) as RawIssue
  return {
    number: raw.number,
    title: raw.title,
    body: raw.body,
    state: raw.state,
    createdAt: raw.created_at,
    isPullRequest: raw.pull_request !== undefined,
  }
}

export interface IssueComment {
  author: string
  authorAssociation: string
  body: string
  createdAt: string
}

interface RawComment {
  user: { login: string } | null
  author_association: string
  body: string
  created_at: string
}

export async function listComments(
  repo: string,
  number: number,
  token: string,
  fetchImpl: typeof fetch = fetch,
): Promise<IssueComment[]> {
  const res = await fetchImpl(`${API}/repos/${repo}/issues/${number}/comments?per_page=100`, {
    headers: { authorization: `Bearer ${token}`, accept: 'application/vnd.github+json', 'user-agent': UA },
  })
  if (!res.ok) throw new Error(`list comments failed: ${res.status} ${await res.text()}`)
  const raw = (await res.json()) as RawComment[]
  return raw.map((c) => ({
    // "ghost" is GitHub's own name for a deleted account.
    author: c.user?.login ?? 'ghost',
    authorAssociation: c.author_association,
    body: c.body,
    createdAt: c.created_at,
  }))
}

export async function createComment(
  repo: string,
  number: number,
  body: string,
  token: string,
  fetchImpl: typeof fetch = fetch,
): Promise<void> {
  const res = await fetchImpl(`${API}/repos/${repo}/issues/${number}/comments`, {
    method: 'POST',
    headers: {
      authorization: `Bearer ${token}`,
      accept: 'application/vnd.github+json',
      'content-type': 'application/json',
      'user-agent': UA,
    },
    body: JSON.stringify({ body }),
  })
  if (!res.ok) throw new Error(`create comment failed: ${res.status} ${await res.text()}`)
}

export async function setIssueBody(
  repo: string,
  number: number,
  body: string,
  token: string,
  fetchImpl: typeof fetch = fetch,
): Promise<void> {
  const res = await fetchImpl(`${API}/repos/${repo}/issues/${number}`, {
    method: 'PATCH',
    headers: {
      authorization: `Bearer ${token}`,
      accept: 'application/vnd.github+json',
      'content-type': 'application/json',
      'user-agent': UA,
    },
    body: JSON.stringify({ body }),
  })
  if (!res.ok) throw new Error(`set issue body failed: ${res.status} ${await res.text()}`)
}

export interface NewIssue {
  title: string
  body: string
  labels: string[]
}

export async function createIssue(
  repo: string,
  token: string,
  issue: NewIssue,
  fetchImpl: typeof fetch = fetch,
): Promise<number> {
  const res = await fetchImpl(`${API}/repos/${repo}/issues`, {
    method: 'POST',
    headers: {
      authorization: `Bearer ${token}`,
      accept: 'application/vnd.github+json',
      'content-type': 'application/json',
      'user-agent': UA,
    },
    body: JSON.stringify(issue),
  })
  if (!res.ok) throw new Error(`create issue failed: ${res.status} ${await res.text()}`)
  return ((await res.json()) as { number: number }).number
}
