import { describe, expect, it } from 'vitest'
import { rewriteReadme } from '../src/readme.js'

describe('rewriteReadme', () => {
  it('rewrites a markdown image to its bundle key', () => {
    const result = rewriteReadme('![DM tab](./docs/images/tab-dm.png)')
    expect(result.markdown).toBe('![DM tab](tab-dm.webp)')
    expect(result.images.get('docs/images/tab-dm.png')).toBe('tab-dm.webp')
  })

  it('rewrites an HTML img src, which the README uses for the icon', () => {
    const result = rewriteReadme('<img src="./docs/icon.svg" alt="SurvivalRP" height="256">')
    expect(result.markdown).toContain('src="icon.svg"')
    expect(result.images.get('docs/icon.svg')).toBe('icon.svg')
  })

  it('keeps SVG as SVG and converts raster to webp', () => {
    const result = rewriteReadme('![a](docs/a.svg) ![b](docs/b.jpg)')
    expect(result.images.get('docs/a.svg')).toBe('a.svg')
    expect(result.images.get('docs/b.jpg')).toBe('b.webp')
  })

  it('leaves external images alone', () => {
    const source = '![x](https://example.com/x.png)'
    const result = rewriteReadme(source)
    expect(result.markdown).toBe(source)
    expect(result.images.size).toBe(0)
  })

  it('flattens a repo-relative link, which would 404 on a public site', () => {
    const result = rewriteReadme('See [CONTRIBUTING.md](CONTRIBUTING.md) for conventions.')
    expect(result.markdown).toBe('See CONTRIBUTING.md for conventions.')
    expect(result.flattenedLinks).toEqual(['CONTRIBUTING.md'])
  })

  it('leaves external links and anchors alone', () => {
    const source = 'See [wowhead](https://www.wowhead.com/item=63296) and [below](#privacy).'
    const result = rewriteReadme(source)
    expect(result.markdown).toBe(source)
    expect(result.flattenedLinks).toEqual([])
  })

  it('refuses two images that would collide on one key', () => {
    expect(() => rewriteReadme('![a](docs/one/x.png) ![b](docs/two/x.png)'))
      .toThrow(/both map to "x.webp"/)
  })

  it('rewrites the real src, ignoring a data-src decoy attribute', () => {
    const result = rewriteReadme('<img data-src="a.png" src="./docs/b.png">')
    expect(result.markdown).toContain('src="b.webp"')
    expect(result.markdown).toContain('data-src="a.png"')
    expect(result.images.get('docs/b.png')).toBe('b.webp')
  })

  it('prefixes markdown image targets with imageBase when given', () => {
    const result = rewriteReadme('![DM tab](./docs/images/tab-dm.png)', {
      imageBase: 'https://addons.dosaki.net/assets/survivalrp/latest/',
    })
    expect(result.markdown).toBe(
      '![DM tab](https://addons.dosaki.net/assets/survivalrp/latest/tab-dm.webp)',
    )
    // The images map keeps bare keys - the bundle stores images by key,
    // regardless of how the markdown refers to them.
    expect(result.images.get('docs/images/tab-dm.png')).toBe('tab-dm.webp')
  })

  it('prefixes HTML img src with imageBase when given', () => {
    const result = rewriteReadme('<img src="./docs/icon.svg" alt="SurvivalRP" height="256">', {
      imageBase: 'https://addons.dosaki.net/assets/survivalrp/latest/',
    })
    expect(result.markdown).toContain(
      'src="https://addons.dosaki.net/assets/survivalrp/latest/icon.svg"',
    )
  })

  it('still flattens repo-relative links when imageBase is given', () => {
    const result = rewriteReadme('See [LICENSE](LICENSE).', {
      imageBase: 'https://addons.dosaki.net/assets/survivalrp/latest/',
    })
    expect(result.markdown).toBe('See LICENSE.')
  })
})

describe('rewriteReadme residual scan', () => {
  it('throws on a single-quoted src, which the rewrite does not handle', () => {
    expect(() => rewriteReadme("<img src='./docs/images/x.png'>"))
      .toThrow(/still references local image/)
  })

  it('throws on a reference-style image, which the rewrite does not handle', () => {
    const source = ['![a][ref]', '', '[ref]: docs/images/x.png'].join('\n')
    expect(() => rewriteReadme(source)).toThrow(/still references local image/)
  })

  it('throws on a path with spaces wrapped in angle brackets', () => {
    expect(() => rewriteReadme('![a](<docs/my images/x.png>)'))
      .toThrow(/still references local image/)
  })

  it('throws on a path with a trailing query string', () => {
    expect(() => rewriteReadme('![a](docs/images/x.png?raw=1)'))
      .toThrow(/still references local image/)
  })

  it('does not fire on a README that was rewritten correctly', () => {
    const source = [
      '<img src="./docs/icon.svg" alt="Icon">',
      '![Shot](./docs/images/shot.png)',
    ].join('\n')
    expect(() => rewriteReadme(source)).not.toThrow()
  })
})
