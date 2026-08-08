import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { unzipSync, zipSync } from 'fflate'
import { describe, expect, it, vi } from 'vitest'
import { bakeAddonBundle, parseAddonsYml, withPreviewImages } from '../../../scripts/bake.js'

describe('parseAddonsYml', () => {
  it('reads slug and repo pairs', () => {
    expect(parseAddonsYml('addons:\n  - slug: survivalrp\n    repo: dosaki/survivalrp\n'))
      .toEqual([{ slug: 'survivalrp', repo: 'dosaki/survivalrp' }])
  })

  it('refuses an entry missing its repo', () => {
    expect(() => parseAddonsYml('addons:\n  - slug: x\n')).toThrow(/repo/)
  })

  it('refuses a file with no addons list', () => {
    expect(() => parseAddonsYml('nope: true\n')).toThrow(/addons/)
  })
})

const iconSvg = new Uint8Array(
  readFileSync(fileURLToPath(new URL('../../bundle/test/fixtures/icon.svg', import.meta.url))),
)

describe('withPreviewImages', () => {
  it('adds a card and a touch icon beside the logo', async () => {
    const zip = zipSync({
      'manifest.json': new Uint8Array([123, 125]),
      'images/icon.svg': iconSvg,
    })
    const files = unzipSync(await withPreviewImages(zip))
    expect(Object.keys(files).sort()).toEqual([
      'images/icon.svg',
      'images/og.png',
      'images/touch-icon.png',
      'manifest.json',
    ])
  })

  it('leaves everything already in the bundle untouched', async () => {
    const zip = zipSync({
      'manifest.json': new Uint8Array([1, 2, 3]),
      'images/icon.svg': iconSvg,
    })
    const files = unzipSync(await withPreviewImages(zip))
    expect([...files['manifest.json']!]).toEqual([1, 2, 3])
    expect([...files['images/icon.svg']!]).toEqual([...iconSvg])
  })

  it('writes a real png, not an svg passed through', async () => {
    const zip = zipSync({ 'images/icon.svg': iconSvg })
    const png = unzipSync(await withPreviewImages(zip))['images/og.png']!
    // PNG magic bytes.
    expect([...png.slice(0, 4)]).toEqual([0x89, 0x50, 0x4e, 0x47])
  })

  it('returns an addon with no logo unchanged', async () => {
    const zip = zipSync({ 'manifest.json': new Uint8Array([123, 125]) })
    expect([...(await withPreviewImages(zip))]).toEqual([...zip])
  })

  it('propagates preview-generation failure rather than swallowing it', async () => {
    // withPreviewImages itself does not catch: bakeAddonBundle below is
    // where the fallback lives, so this pins that a malformed logo (proven
    // to reject in og.test.ts) actually surfaces through this function
    // instead of being silently absorbed here.
    const brokenSvg = new Uint8Array(Buffer.from('<svg not actually valid'))
    const zip = zipSync({
      'manifest.json': new Uint8Array([1, 2, 3]),
      'images/icon.svg': brokenSvg,
    })
    await expect(withPreviewImages(zip)).rejects.toThrow()
  })
})

describe('bakeAddonBundle', () => {
  it('bakes previews into a healthy bundle', async () => {
    const zip = zipSync({ 'images/icon.svg': iconSvg })
    const baked = Buffer.from(await bakeAddonBundle('good-addon', Buffer.from(zip).toString('base64')), 'base64')
    const files = unzipSync(baked)
    expect(Object.keys(files).sort()).toEqual(['images/icon.svg', 'images/og.png', 'images/touch-icon.png'])
  })

  it('falls back to the original bundle bytes and logs when preview generation throws', async () => {
    const brokenSvg = new Uint8Array(Buffer.from('<svg not actually valid'))
    const zip = zipSync({
      'manifest.json': new Uint8Array([1, 2, 3]),
      'images/icon.svg': brokenSvg,
    })
    const originalBase64 = Buffer.from(zip).toString('base64')
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    const result = await bakeAddonBundle('broken-addon', originalBase64)

    // The bundle comes back byte-for-byte as it arrived - not just "some
    // zip with the same entries" - so a broken logo can never cost the
    // addon its other assets.
    expect(result).toBe(originalBase64)
    expect(errorSpy).toHaveBeenCalledWith(
      expect.stringContaining('broken-addon: preview generation failed, bundling as-is:'),
      expect.any(String),
    )

    errorSpy.mockRestore()
  })
})
