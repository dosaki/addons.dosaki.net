import { describe, expect, it } from 'vitest'
import { headTags, jsonLd, robotsTxt, sitemapXml, summarize, SITE_ORIGIN } from '../src/meta.js'
import type { PageMeta } from '../src/meta.js'
import type { AddonPage } from '../src/types.js'

const base: PageMeta = {
  title: 'SurvivalRP - World of Warcraft Addon by Dosaki',
  description: 'Optional survival mechanics for role-play.',
  path: '/survivalrp',
  image: 'https://addons.dosaki.net/assets/survivalrp/1.2.2/og.png',
  imageAlt: 'SurvivalRP logo',
  icon: '/assets/survivalrp/1.2.2/icon.svg',
  touchIcon: '/assets/survivalrp/1.2.2/touch-icon.png',
  noindex: false,
}

describe('headTags', () => {
  it('builds an absolute canonical from the origin and the path', () => {
    expect(headTags(base)).toContain(
      `<link rel="canonical" href="${SITE_ORIGIN}/survivalrp">`,
    )
  })

  it('emits no canonical or og:url for a page with no address of its own', () => {
    const html = headTags({ ...base, path: null })
    expect(html).not.toContain('rel="canonical"')
    expect(html).not.toContain('og:url')
  })

  it('marks a noindex page, and leaves an indexable one unmarked', () => {
    expect(headTags({ ...base, noindex: true })).toContain(
      '<meta name="robots" content="noindex, follow">',
    )
    expect(headTags(base)).not.toContain('name="robots"')
  })

  it('declares the card size alongside the image, for scrapers that pre-allocate', () => {
    const html = headTags(base)
    expect(html).toContain('<meta property="og:image" content="https://addons.dosaki.net/assets/survivalrp/1.2.2/og.png">')
    expect(html).toContain('<meta property="og:image:width" content="1200">')
    expect(html).toContain('<meta property="og:image:height" content="630">')
    expect(html).toContain('<meta property="og:image:alt" content="SurvivalRP logo">')
    expect(html).toContain('<meta name="twitter:card" content="summary_large_image">')
  })

  it('falls back to the small card shape when there is no image', () => {
    const html = headTags({ ...base, image: null })
    expect(html).not.toContain('og:image')
    expect(html).toContain('<meta name="twitter:card" content="summary">')
  })

  it('links the svg favicon and the png touch icon', () => {
    const html = headTags(base)
    expect(html).toContain(
      '<link rel="icon" type="image/svg+xml" href="/assets/survivalrp/1.2.2/icon.svg">',
    )
    expect(html).toContain(
      '<link rel="apple-touch-icon" href="/assets/survivalrp/1.2.2/touch-icon.png">',
    )
  })

  it('omits each icon link that has no asset behind it', () => {
    const html = headTags({ ...base, icon: null, touchIcon: null })
    expect(html).not.toContain('rel="icon"')
    expect(html).not.toContain('apple-touch-icon')
  })

  it('escapes a title that would otherwise break out of the attribute', () => {
    const html = headTags({ ...base, title: 'A "quoted" <tag>' })
    expect(html).toContain('<title>A &quot;quoted&quot; &lt;tag&gt;</title>')
    expect(html).toContain('content="A &quot;quoted&quot; &lt;tag&gt;"')
    expect(html).not.toContain('<tag>')
  })
})

describe('jsonLd', () => {
  it('wraps the payload in a typed script element', () => {
    expect(jsonLd({ '@type': 'Thing' })).toBe(
      '<script type="application/ld+json">{"@type":"Thing"}</script>',
    )
  })

  it('escapes < so a value can never close the script element early', () => {
    const html = jsonLd({ name: '</script><img onerror=alert(1)>' })
    expect(html).not.toContain('</script><img')
    expect(html).toContain('\\u003c/script')
  })

  it('leaves quotes as JSON, not HTML entities, so the data stays valid', () => {
    // esc() here would produce &quot; inside the payload and corrupt it.
    expect(jsonLd({ name: 'say "hi"' })).toContain('"name":"say \\"hi\\""')
  })
})

describe('summarize', () => {
  it('collapses a multi-line body into one line', () => {
    expect(summarize('One line.\n\nAnother   line.')).toBe('One line. Another line.')
  })

  it('strips markdown syntax that would read as noise in a search result', () => {
    expect(summarize('## Heading\n\n**bold** and [a link](http://x.test)'))
      .toBe('Heading bold and a link')
  })

  it('drops fenced code blocks entirely', () => {
    expect(summarize('Before\n```lua\nprint("x")\n```\nAfter')).toBe('Before After')
  })

  it('truncates on a word boundary so the ellipsis never lands mid-word', () => {
    const result = summarize('alpha bravo charlie delta echo', 14)
    expect(result).toBe('alpha bravo...')
  })

  it('leaves a short body untouched', () => {
    expect(summarize('Short.')).toBe('Short.')
  })
})

const stub = (slug: string): AddonPage => ({
  slug,
  name: slug,
  tagline: 't',
  version: '1',
  html: '',
  headings: [],
  forms: [],
  assets: new Map(),
})

describe('robotsTxt', () => {
  it('points crawlers at the sitemap', () => {
    expect(robotsTxt()).toContain(`Sitemap: ${SITE_ORIGIN}/sitemap.xml`)
  })

  it('keeps crawlers off the routes that cost a GitHub API call', () => {
    // Every report route renders live from the API with no cache, so an
    // unrestricted crawl would burn the installation's rate limit.
    // "/*/report" is a prefix match and covers /reports and /reports/:n too.
    expect(robotsTxt()).toContain('Disallow: /*/report')
    expect(robotsTxt()).toContain('Disallow: /api/')
  })

  it('keeps crawlers off the download route too, which costs two GitHub API calls', () => {
    // Linked from the header of every addon page, so this branch increases
    // crawl volume on it beyond what the report routes ever saw.
    expect(robotsTxt()).toContain('Disallow: /*/download')
  })

  it('leaves the root and the addon pages crawlable', () => {
    // The pages this whole feature exists to promote. Asserted as the exact
    // set of Disallow rules rather than the absence of a blanket one: a new
    // rule that happened to swallow /:slug would slip past a bare negative.
    const rules = robotsTxt()
      .split('\n')
      .filter((line) => line.startsWith('Disallow:'))
    expect(rules).toEqual(['Disallow: /api/', 'Disallow: /*/report', 'Disallow: /*/download'])
  })
})

describe('sitemapXml', () => {
  it('lists the root and every available addon', () => {
    const xml = sitemapXml([stub('survivalrp'), stub('housing-herald')])
    expect(xml).toContain(`<loc>${SITE_ORIGIN}/</loc>`)
    expect(xml).toContain(`<loc>${SITE_ORIGIN}/survivalrp</loc>`)
    expect(xml).toContain(`<loc>${SITE_ORIGIN}/housing-herald</loc>`)
  })

  it('lists no report route, since they are all disallowed', () => {
    expect(sitemapXml([stub('survivalrp')])).not.toContain('/report')
  })

  it('is a well-formed urlset', () => {
    const xml = sitemapXml([])
    expect(xml.startsWith('<?xml version="1.0" encoding="UTF-8"?>')).toBe(true)
    expect(xml).toContain('xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"')
    expect(xml.trimEnd().endsWith('</urlset>')).toBe(true)
  })
})
