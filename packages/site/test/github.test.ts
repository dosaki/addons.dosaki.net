import { createPrivateKey, generateKeyPairSync, createVerify } from 'node:crypto'
import { describe, expect, it } from 'vitest'
import { appJwt, createComment, createIssue, downloadRedirect, getIssue, listComments, listOpenIssues, setIssueBody } from '../src/github.js'

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

function jsonFetch(status: number, body: unknown) {
  const calls: Array<{ url: string; init?: RequestInit }> = []
  const impl = (async (url: string, init?: RequestInit) => {
    calls.push({ url, init })
    return {
      ok: status < 400,
      status,
      json: async () => body,
      text: async () => JSON.stringify(body ?? ''),
    } as unknown as globalThis.Response
  }) as unknown as typeof fetch
  return { impl, calls }
}

describe('listOpenIssues', () => {
  const issue = {
    number: 7,
    title: 'It broke',
    body: '**Votes:** 1👍 / 0👎',
    created_at: '2026-03-01T00:00:00Z',
  }

  it('asks for open issues and maps what the page needs', async () => {
    const { impl, calls } = jsonFetch(200, [issue])
    const got = await listOpenIssues('dosaki/x', 'tok', impl)
    expect(calls[0]!.url).toContain('/repos/dosaki/x/issues?state=open')
    expect(got).toEqual([
      { number: 7, title: 'It broke', body: '**Votes:** 1👍 / 0👎', createdAt: '2026-03-01T00:00:00Z' },
    ])
  })

  it('drops pull requests, which the issues API mixes in', async () => {
    const { impl } = jsonFetch(200, [issue, { ...issue, number: 8, pull_request: { url: 'x' } }])
    expect((await listOpenIssues('dosaki/x', 'tok', impl)).map((i) => i.number)).toEqual([7])
  })

  it('throws with the status when GitHub refuses', async () => {
    const { impl } = jsonFetch(500, [])
    await expect(listOpenIssues('dosaki/x', 'tok', impl)).rejects.toThrow(/500/)
  })
})

describe('getIssue', () => {
  it('returns what both the vote and the detail page need', async () => {
    const { impl, calls } = jsonFetch(200, {
      number: 7,
      title: 'It broke',
      body: null,
      state: 'open',
      created_at: '2026-03-01T00:00:00Z',
    })
    const got = await getIssue('dosaki/x', 7, 'tok', impl)
    expect(calls[0]!.url).toContain('/repos/dosaki/x/issues/7')
    expect(got).toEqual({
      number: 7,
      title: 'It broke',
      body: null,
      state: 'open',
      createdAt: '2026-03-01T00:00:00Z',
      isPullRequest: false,
    })
  })

  it('flags a pull request', async () => {
    const { impl } = jsonFetch(200, { number: 7, title: 't', body: null, state: 'open', created_at: 'x', pull_request: {} })
    expect((await getIssue('dosaki/x', 7, 'tok', impl))!.isPullRequest).toBe(true)
  })

  it('returns null for an issue that does not exist', async () => {
    const { impl } = jsonFetch(404, { message: 'Not Found' })
    expect(await getIssue('dosaki/x', 999, 'tok', impl)).toBeNull()
  })

  it('throws with the status on any other refusal', async () => {
    const { impl } = jsonFetch(500, {})
    await expect(getIssue('dosaki/x', 7, 'tok', impl)).rejects.toThrow(/500/)
  })
})

describe('listComments', () => {
  const comment = {
    user: { login: 'dosaki' },
    author_association: 'OWNER',
    body: 'Fixed in 1.2.3',
    created_at: '2026-03-02T00:00:00Z',
  }

  it('maps what the detail page needs', async () => {
    const { impl, calls } = jsonFetch(200, [comment])
    const got = await listComments('dosaki/x', 7, 'tok', impl)
    expect(calls[0]!.url).toContain('/repos/dosaki/x/issues/7/comments')
    expect(got).toEqual([
      {
        author: 'dosaki',
        authorAssociation: 'OWNER',
        body: 'Fixed in 1.2.3',
        createdAt: '2026-03-02T00:00:00Z',
      },
    ])
  })

  it('survives a comment whose account was deleted', async () => {
    const { impl } = jsonFetch(200, [{ ...comment, user: null }])
    expect((await listComments('dosaki/x', 7, 'tok', impl))[0]!.author).toBe('ghost')
  })

  it('throws with the status when GitHub refuses', async () => {
    const { impl } = jsonFetch(500, [])
    await expect(listComments('dosaki/x', 7, 'tok', impl)).rejects.toThrow(/500/)
  })
})

describe('setIssueBody', () => {
  it('patches only the body', async () => {
    const { impl, calls } = jsonFetch(200, {})
    await setIssueBody('dosaki/x', 7, 'new body', 'tok', impl)
    expect(calls[0]!.url).toContain('/repos/dosaki/x/issues/7')
    expect(calls[0]!.init!.method).toBe('PATCH')
    expect(JSON.parse(String(calls[0]!.init!.body))).toEqual({ body: 'new body' })
  })

  it('throws with the status when GitHub refuses', async () => {
    const { impl } = jsonFetch(422, {})
    await expect(setIssueBody('dosaki/x', 7, 'b', 'tok', impl)).rejects.toThrow(/422/)
  })
})

describe('createComment', () => {
  it('posts the comment to the issue', async () => {
    let captured: { url: string; init: RequestInit } | null = null
    const fetchImpl = (async (url: unknown, init?: RequestInit) => {
      captured = { url: String(url), init: init! }
      return new Response('{}', { status: 201 })
    }) as typeof fetch

    await createComment('dosaki/survivalrp', 7, 'Same here\n', 'tok', fetchImpl)

    expect(captured!.url).toBe('https://api.github.com/repos/dosaki/survivalrp/issues/7/comments')
    expect(captured!.init.method).toBe('POST')
    expect(JSON.parse(String(captured!.init.body))).toEqual({ body: 'Same here\n' })
    expect((captured!.init.headers as Record<string, string>)['authorization']).toBe('Bearer tok')
  })

  it('throws on a non-ok response', async () => {
    const fetchImpl = (async () => new Response('nope', { status: 403 })) as typeof fetch
    await expect(createComment('o/r', 7, 'x', 't', fetchImpl))
      .rejects.toThrow('create comment failed: 403')
  })
})
