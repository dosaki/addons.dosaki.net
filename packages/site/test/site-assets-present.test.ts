import { describe, expect, it, vi } from 'vitest'

// Spread the real module: these modules only use readFileSync, but a bare
// stub would break anything else in the graph that reaches node:fs.
vi.mock('node:fs', async (importOriginal) => {
  const actual = await importOriginal<typeof import('node:fs')>()
  return {
    ...actual,
    readFileSync: vi.fn((path: string, ...rest: unknown[]) => {
      if (String(path).endsWith('logo.svg')) return '<svg viewBox="0 0 10 10"></svg>'
      if (String(path).endsWith('site-images.json')) return '{"og":"QUJD","touch":"REVG"}'
      return (actual.readFileSync as never)(path, ...rest)
    }),
  }
})

// Must be imported after the mock is hoisted by vitest.
import { siteLogo } from '../src/site-icon.js'
import { siteImages } from '../src/site-images.js'

describe('siteLogo when file is present', () => {
  it('reads real svg source', () => {
    expect(siteLogo).toBe('<svg viewBox="0 0 10 10"></svg>')
  })
})

describe('siteImages when file is present', () => {
  it('reads og and touch as base64 strings', () => {
    expect(siteImages.og).toBe('QUJD')
    expect(siteImages.touch).toBe('REVG')
  })
})
