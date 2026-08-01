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
