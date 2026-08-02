import { describe, expect, it } from 'vitest'
import { addonPage, assetUrl, indexPage, notFoundPage } from '../src/templates.js'
import type { AddonPage } from '../src/types.js'

const addon: AddonPage = {
  slug: 'survivalrp',
  name: 'SurvivalRP',
  tagline: 'Optional survival mechanics for role-play.',
  version: '1.2.2',
  icon: 'icon.svg',
  html: '<h2 id="what-it-does">What it does</h2><p>Words.</p>',
  headings: [
    { id: 'what-it-does', text: 'What it does' },
    { id: 'privacy', text: 'Privacy' },
  ],
  forms: [],
  assets: new Map(),
}

describe('assetUrl', () => {
  it('is version-scoped so it can be cached forever', () => {
    expect(assetUrl('survivalrp', '1.2.2', 'tab-dm.webp'))
      .toBe('/assets/survivalrp/1.2.2/tab-dm.webp')
  })
})

describe('addonPage', () => {
  it('includes the rendered README', () => {
    expect(addonPage(addon)).toContain('What it does')
  })

  it('builds a contents link per heading', () => {
    const html = addonPage(addon)
    expect(html).toContain('href="#what-it-does"')
    expect(html).toContain('href="#privacy"')
  })

  it('points the download link at the slug route', () => {
    expect(addonPage(addon)).toContain('href="/survivalrp/download"')
  })

  it('shows the version', () => {
    expect(addonPage(addon)).toContain('1.2.2')
  })

  it('resolves the icon to a version-scoped asset url', () => {
    expect(addonPage(addon)).toContain('/assets/survivalrp/1.2.2/icon.svg')
  })

  it('omits the icon element entirely when the addon has none', () => {
    const { icon, ...rest } = addon
    const html = addonPage(rest as AddonPage)
    expect(html).not.toContain('/assets/survivalrp/1.2.2/undefined')
  })

  it('ships no script tags, since the site has no client JS', () => {
    expect(addonPage(addon)).not.toContain('<script')
  })

  it('escapes the tagline rather than trusting it', () => {
    const evil = { ...addon, tagline: '<img src=x onerror=alert(1)>' }
    const html = addonPage(evil)
    // Escaping NEUTRALISES the markup; it does not remove the characters. The
    // literal text "onerror" is still present and inert, so asserting its
    // absence would be testing the wrong property.
    expect(html).toContain('&lt;img src=x onerror=alert(1)&gt;')
    expect(html).not.toContain('<img src=x')
  })

  it('escapes the addon name in both the title and the heading', () => {
    const evil = { ...addon, name: '</title><script>alert(1)</script>' }
    const html = addonPage(evil)
    expect(html).not.toContain('<script>')
    expect(html).not.toContain('</title><')
  })
})

describe('indexPage', () => {
  it('lists each addon with a link', () => {
    expect(indexPage([addon], [])).toContain('href="/survivalrp"')
  })

  it('names an addon whose bundle could not be read', () => {
    const html = indexPage([addon], ['brokenaddon'])
    expect(html).toContain('brokenaddon')
    expect(html.toLowerCase()).toContain('unavailable')
  })
})

describe('notFoundPage', () => {
  it('lists the addons that do exist', () => {
    expect(notFoundPage([addon])).toContain('href="/survivalrp"')
  })
})
