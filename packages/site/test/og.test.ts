import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'
import { describe, expect, it } from 'vitest'
import { ogCard, touchIcon } from '../src/og.js'

// The bundle package's fixture is a real addon logo: a 500x500 emblem.
// Resolved from import.meta.url, matching index.test.ts, rather than from
// the process cwd - vitest runs from the repo root, tests should not care.
const logo = new Uint8Array(
  readFileSync(fileURLToPath(new URL('../../bundle/test/fixtures/icon.svg', import.meta.url))),
)

/** The top-left pixel, as [r, g, b, a]. */
async function cornerPixel(png: Uint8Array): Promise<number[]> {
  const { data } = await sharp(Buffer.from(png)).raw().toBuffer({ resolveWithObject: true })
  return [...data.slice(0, 4)]
}

/**
 * True when every pixel equals color exactly - i.e. the image is a flat,
 * uncomposited field. Used to prove the logo actually landed on the canvas:
 * dimension and corner-pixel checks alone would still pass if .composite()
 * were dropped from onBackground(), since the create() canvas is already
 * the right size and already BG-colored on its own.
 */
async function isFlatField(png: Uint8Array, color: number[]): Promise<boolean> {
  const { data, info } = await sharp(Buffer.from(png)).raw().toBuffer({ resolveWithObject: true })
  for (let i = 0; i < data.length; i += info.channels) {
    for (let c = 0; c < info.channels; c++) {
      if (data[i + c] !== color[c]) return false
    }
  }
  return true
}

describe('ogCard', () => {
  it('produces the size every unfurl scraper expects', async () => {
    const meta = await sharp(Buffer.from(await ogCard(logo))).metadata()
    expect(meta.format).toBe('png')
    expect(meta.width).toBe(1200)
    expect(meta.height).toBe(630)
  })

  it('draws on the theme background rather than leaving it transparent', async () => {
    // A transparent card is flattened onto white by some clients, which
    // would put a dark logo on a white field. #0a0e18 is [10, 14, 24].
    expect(await cornerPixel(await ogCard(logo))).toEqual([10, 14, 24, 255])
  })

  it('composites the logo onto the card rather than shipping a flat background', async () => {
    // Deliberately avoids pinning an expected color at a specific
    // coordinate, which would tie the test to this fixture's artwork -
    // only that *something* other than BG was drawn onto the canvas.
    expect(await isFlatField(await ogCard(logo), [10, 14, 24, 255])).toBe(false)
  })

  it('rejects a malformed svg rather than emitting a broken image', async () => {
    await expect(ogCard(new Uint8Array(Buffer.from('<svg not actually')))).rejects.toThrow()
  })
})

describe('touchIcon', () => {
  it('produces a square at the size iOS asks for', async () => {
    const meta = await sharp(Buffer.from(await touchIcon(logo))).metadata()
    expect(meta.format).toBe('png')
    expect(meta.width).toBe(180)
    expect(meta.height).toBe(180)
  })

  it('draws on the theme background', async () => {
    // Unlike ogCard, touchIcon's logoSize equals the canvas size, so a
    // square source leaves no margin - this corner is the logo's own
    // transparent corner showing BG through, not a general background-fill
    // check. It only passes because the fixture is a round emblem; the
    // "composites the logo" test below is the one that actually proves
    // compositing happened.
    expect(await cornerPixel(await touchIcon(logo))).toEqual([10, 14, 24, 255])
  })

  it('composites the logo onto the icon rather than shipping a flat background', async () => {
    expect(await isFlatField(await touchIcon(logo), [10, 14, 24, 255])).toBe(false)
  })
})
