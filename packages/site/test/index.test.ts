import { existsSync, rmSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import type { parseSubmission as ParseSubmission } from '../src/index.js'

// index.ts reads src/site-data.json at module load; it is baked at deploy
// time and not committed, so a fresh checkout has none. A static top-level
// import would evaluate index.ts (and that read) before this file's own
// beforeAll ever ran, so the fixture must exist before index.ts is even
// imported - hence the dynamic import below, done only once the file is
// confirmed present.
const dataPath = fileURLToPath(new URL('../src/site-data.json', import.meta.url))
let createdFixture = false
let parseSubmission: typeof ParseSubmission

beforeAll(async () => {
  if (!existsSync(dataPath)) {
    writeFileSync(dataPath, '[]')
    createdFixture = true
  }
  ;({ parseSubmission } = await import('../src/index.js'))
})

afterAll(() => {
  // Never delete a file this test did not create - a real baked one may be
  // present.
  if (createdFixture) rmSync(dataPath)
})

describe('parseSubmission', () => {
  it('reads a JSON body from the island', () => {
    const body = JSON.stringify({ slug: 'a', form: 'bug_report', fields: { what: 'It broke' } })
    expect(parseSubmission('application/json', body, false))
      .toEqual({ slug: 'a', form: 'bug_report', fields: { what: 'It broke' } })
  })

  it('reads a form-encoded body from a no-JS post', () => {
    const body = 'slug=a&form=bug_report&what=It+broke'
    expect(parseSubmission('application/x-www-form-urlencoded', body, false))
      .toEqual({ slug: 'a', form: 'bug_report', fields: { what: 'It broke' } })
  })

  it('joins repeated form-encoded keys, as checkboxes produce', () => {
    const body = 'slug=a&form=f&c=One&c=Two'
    expect(parseSubmission('application/x-www-form-urlencoded', body, false).fields['c'])
      .toBe('One\nTwo')
  })

  it('decodes a base64 body, which the Function URL may deliver', () => {
    const raw = 'slug=a&form=f&what=x'
    expect(parseSubmission('application/x-www-form-urlencoded', Buffer.from(raw).toString('base64'), true).slug)
      .toBe('a')
  })

  it('throws on a body that is neither', () => {
    expect(() => parseSubmission('text/plain', 'nonsense', false)).toThrow()
  })
})
