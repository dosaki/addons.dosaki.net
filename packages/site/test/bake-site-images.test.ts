import { describe, expect, it, vi } from 'vitest'

// A separate file from bake.test.ts because this is the one place that
// mocks node:fs's readFileSync - keeping it isolated avoids leaking the mock
// into the other bake.ts tests, which read real fixtures off disk.
const { readFileSyncMock } = vi.hoisted(() => ({ readFileSyncMock: vi.fn() }))

// Spread the real module: readFileSync is the only fs call bakeSiteImages
// makes, but a bare stub would still break anything else in the graph that
// reaches node:fs. Only the logo.svg read is redirected to the mock.
vi.mock('node:fs', async (importOriginal) => {
  const actual = await importOriginal<typeof import('node:fs')>()
  return {
    ...actual,
    readFileSync: (path: string, encoding?: BufferEncoding) =>
      String(path).endsWith('logo.svg')
        ? readFileSyncMock(path, encoding)
        : actual.readFileSync(path, encoding),
  }
})

// Must be imported after the mock is hoisted by vitest.
import { bakeSiteImages } from '../../../scripts/bake.js'

describe('bakeSiteImages', () => {
  it('returns {} and logs when logo.svg is missing', async () => {
    readFileSyncMock.mockImplementation(() => {
      throw new Error("ENOENT: no such file or directory, open 'packages/site/static/logo.svg'")
    })
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    const result = await bakeSiteImages()

    // Not just "did not throw" - the actual fallback value, and proof the
    // failure was surfaced rather than silently absorbed.
    expect(result).toEqual({})
    expect(errorSpy).toHaveBeenCalledWith(
      expect.stringContaining('packages/site/static/logo.svg missing'),
    )

    errorSpy.mockRestore()
  })

  it('returns og and touch as base64 PNGs when logo.svg is present', async () => {
    readFileSyncMock.mockReturnValue(
      Buffer.from(
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10"><rect width="10" height="10" fill="red"/></svg>',
      ),
    )

    const result = await bakeSiteImages()

    expect(typeof result['og']).toBe('string')
    expect(typeof result['touch']).toBe('string')
    // Round-tripped through base64 to PNG magic bytes, proving these are
    // real rasters and not the svg source echoed back.
    expect([...Buffer.from(result['og']!, 'base64').subarray(0, 4)]).toEqual([
      0x89, 0x50, 0x4e, 0x47,
    ])
    expect([...Buffer.from(result['touch']!, 'base64').subarray(0, 4)]).toEqual([
      0x89, 0x50, 0x4e, 0x47,
    ])
  })
})
