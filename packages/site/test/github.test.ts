import { createPrivateKey, generateKeyPairSync, createVerify } from 'node:crypto'
import { describe, expect, it } from 'vitest'
import { appJwt, createIssue, downloadRedirect } from '../src/github.js'

const { privateKey, publicKey } = generateKeyPairSync('rsa', { modulusLength: 2048 })
const pem = privateKey.export({ type: 'pkcs8', format: 'pem' }).toString()

describe('appJwt', () => {
  it('is a verifiable RS256 JWT', () => {
    const token = appJwt('4458698', pem, 1_700_000_000_000)
    const [h, p, s] = token.split('.')
    expect(JSON.parse(Buffer.from(h!, 'base64url').toString())).toEqual({
      alg: 'RS256',
      typ: 'JWT',
    })
    const verify = createVerify('RSA-SHA256')
    verify.update(`${h}.${p}`)
    expect(verify.verify(publicKey, Buffer.from(s!, 'base64url'))).toBe(true)
  })

  it('backdates iat to tolerate clock skew and expires within ten minutes', () => {
    const now = 1_700_000_000_000
    const payload = JSON.parse(
      Buffer.from(appJwt('4458698', pem, now).split('.')[1]!, 'base64url').toString(),
    ) as { iat: number; exp: number; iss: string }
    expect(payload.iss).toBe('4458698')
    expect(payload.iat).toBe(Math.floor(now / 1000) - 60)
    expect(payload.exp - payload.iat).toBeLessThanOrEqual(600)
  })

  it('accepts a key whose newlines arrived escaped, as SSM often stores them', () => {
    expect(() => appJwt('1', pem.replace(/\n/g, '\\n'), 1_700_000_000_000)).not.toThrow()
  })
})

describe('downloadRedirect', () => {
  const asset = { id: 42, name: 'SurvivalRP-1.2.2.zip' }

  function fakeFetch(steps: Array<{ status: number; body?: unknown; location?: string }>) {
    const calls: Array<{ url: string; init?: RequestInit }> = []
    let i = 0
    const impl = (async (url: string, init?: RequestInit) => {
      calls.push({ url, init })
      const step = steps[i++]!
      return {
        status: step.status,
        ok: step.status < 400,
        headers: new Headers(step.location === undefined ? {} : { location: step.location }),
        json: async () => step.body,
        text: async () => JSON.stringify(step.body ?? ''),
      } as unknown as globalThis.Response
    }) as unknown as typeof fetch
    return { impl, calls }
  }

  it('returns the signed location without following it', async () => {
    const { impl, calls } = fakeFetch([
      { status: 200, body: { assets: [asset] } },
      { status: 302, location: 'https://objects.githubusercontent.com/signed' },
    ])
    const url = await downloadRedirect('dosaki/survivalrp', 'tok', impl)
    expect(url).toBe('https://objects.githubusercontent.com/signed')
    expect((calls[1]!.init as { redirect?: string }).redirect).toBe('manual')
  })

  it('picks the addon zip, not the site bundle', async () => {
    const { impl, calls } = fakeFetch([
      { status: 200, body: { assets: [{ id: 7, name: 'site-bundle.zip' }, asset] } },
      { status: 302, location: 'https://objects.githubusercontent.com/signed' },
    ])
    await downloadRedirect('dosaki/survivalrp', 'tok', impl)
    expect(calls[1]!.url).toContain('/releases/assets/42')
  })

  it('throws when the release has no downloadable asset', async () => {
    const { impl } = fakeFetch([{ status: 200, body: { assets: [{ id: 7, name: 'site-bundle.zip' }] } }])
    await expect(downloadRedirect('dosaki/survivalrp', 'tok', impl)).rejects.toThrow(/no downloadable asset/)
  })

  it('throws when GitHub does not redirect', async () => {
    const { impl } = fakeFetch([
      { status: 200, body: { assets: [asset] } },
      { status: 200 },
    ])
    await expect(downloadRedirect('dosaki/survivalrp', 'tok', impl)).rejects.toThrow(/expected a redirect/)
  })
})

describe('createIssue', () => {
  it('posts title, body and labels and returns the number', async () => {
    const calls: Array<{ url: string; init?: RequestInit }> = []
    const impl = (async (url: string, init?: RequestInit) => {
      calls.push({ url, init })
      return { ok: true, status: 201, json: async () => ({ number: 42 }), text: async () => '' } as unknown as globalThis.Response
    }) as unknown as typeof fetch

    const n = await createIssue('dosaki/x', 'tok', { title: 'T', body: 'B', labels: ['bug'] }, impl)
    expect(n).toBe(42)
    expect(calls[0]!.url).toContain('/repos/dosaki/x/issues')
    expect(JSON.parse(String(calls[0]!.init!.body))).toEqual({ title: 'T', body: 'B', labels: ['bug'] })
  })

  it('throws with the status when GitHub refuses', async () => {
    const impl = (async () => ({ ok: false, status: 410, text: async () => 'Issues are disabled' } as unknown as globalThis.Response)) as unknown as typeof fetch
    await expect(createIssue('dosaki/x', 'tok', { title: 'T', body: 'B', labels: [] }, impl))
      .rejects.toThrow(/410/)
  })
})
