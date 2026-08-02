import { describe, expect, it } from 'vitest'
import { marcellusFont } from '../src/font.js'

describe('marcellusFont', () => {
  it('loads the vendored woff2 as base64', () => {
    // In this repo the file exists at packages/site/static/, so the loader
    // must find it via the ../static fallback path.
    expect(marcellusFont).not.toBeNull()
    // woff2 magic bytes are wOF2 -> "d09GMg" in base64.
    expect(marcellusFont!.startsWith('d09GMg')).toBe(true)
  })
})
