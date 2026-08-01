import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import sharp from 'sharp'
import { describe, expect, it } from 'vitest'
import { MAX_ASSET_BYTES, optimiseImage } from '../src/images.js'

const fixture = (name: string) => readFileSync(join(import.meta.dirname, 'fixtures', name))

/**
 * A deterministic 1600x1200 RGB noise buffer, seeded so the test needs no
 * external fixture. Noise is incompressible - unlike a uniform image, which
 * WebP crushes to nothing - so at quality 82 this reliably lands north of
 * the 700 KB ceiling (measured ~1328 KB), which is what makes it useful for
 * proving the ceiling check covers the WebP encode path and not only the
 * SVG passthrough.
 */
function noisePng(width: number, height: number, seed: number): Promise<Buffer> {
  const pixels = Buffer.alloc(width * height * 3)
  let state = seed >>> 0
  for (let i = 0; i < pixels.length; i++) {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0
    pixels[i] = (state >>> 24) & 0xff
  }
  return sharp(pixels, { raw: { width, height, channels: 3 } }).png({ compressionLevel: 0 }).toBuffer()
}

describe('optimiseImage', () => {
  it('brings the largest screenshot under the ceiling', async () => {
    const source = fixture('transmog-tab-survival-rp.png')
    expect(source.byteLength).toBeGreaterThan(MAX_ASSET_BYTES)

    const out = await optimiseImage('transmog-tab-survival-rp.webp', source)
    expect(out.byteLength).toBeLessThan(MAX_ASSET_BYTES)

    const meta = await sharp(Buffer.from(out)).metadata()
    expect(meta.format).toBe('webp')
    // Asserted against the literal, not MAX_WIDTH, so a mutant that changes
    // the constant (1600 -> 800) still fails this test.
    expect(meta.width).toBe(1600)
    // Pins WEBP_QUALITY's effect: at quality 10 this fixture encodes to
    // ~35 KB and at quality 5 to ~31 KB, well under this floor - so a
    // mutant that drops the constant (82 -> 10) fails here even though the
    // ceiling check alone would not catch it.
    expect(out.byteLength).toBeGreaterThan(60 * 1024)
  }, 30_000)

  it('enforces the 700 KB ceiling on the WebP encode path, not only SVG passthrough', async () => {
    const source = await noisePng(1600, 1200, 42)
    await expect(optimiseImage('huge.webp', source)).rejects.toThrow(/over the 700 KB limit/)
  }, 30_000)

  it('does not enlarge an image that is already small', async () => {
    const small = await sharp({
      create: { width: 200, height: 100, channels: 3, background: '#123456' },
    }).png().toBuffer()

    const out = await optimiseImage('small.webp', small)
    const meta = await sharp(Buffer.from(out)).metadata()
    expect(meta.width).toBe(200)
  })

  it('passes SVG through untouched', async () => {
    const svg = fixture('icon.svg')
    const out = await optimiseImage('icon.svg', svg)
    expect(Buffer.from(out).equals(svg)).toBe(true)
  })

  it('fails loudly when an asset cannot be brought under the ceiling', async () => {
    const oversized = Buffer.alloc(MAX_ASSET_BYTES + 1, 0x41)
    await expect(optimiseImage('huge.svg', oversized)).rejects.toThrow(/over the 700 KB limit/)
  })
})
