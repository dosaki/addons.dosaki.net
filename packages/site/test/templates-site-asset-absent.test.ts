import { describe, expect, it, vi } from 'vitest'

// Hoisted above the imports by vitest, so templates.js sees the mocked
// modules. These two fallback cases need the site to have no logo and no
// baked preview images - stated here explicitly with vi.mock rather than
// inherited from this checkout not (yet) having static/logo.svg or a baked
// site-images.json, so the suite passes identically once either file shows
// up. Mirrors site-asset-routes-absent.test.ts.
vi.mock('../src/site-icon.js', () => ({ siteLogo: null }))
vi.mock('../src/site-images.js', () => ({ siteImages: {} }))

import { addonPage } from '../src/templates.js'
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

describe('addon page metadata when the site has no logo or preview images', () => {
  it('falls back to the site favicon when the addon has none', () => {
    // The site fallback resolves to null (mocked absent), so no
    // <link rel="icon"> is emitted at all - this still pins the
    // addon.icon === undefined branch in addonMeta.
    const { icon, ...withoutIcon } = addon
    const html = addonPage(withoutIcon as AddonPage)
    expect(html).not.toContain('<link rel="icon"')
    // Proves the page actually rendered through headTags, rather than the
    // absence being an artefact of a blank page.
    expect(html).toContain('<title>SurvivalRP - World of Warcraft Addon by Dosaki</title>')
  })

  it('falls back to the site card when the bundle predates preview generation', () => {
    // addon.assets has no og.png, so the page must not claim one. Asserting
    // on the addon's own asset path, not the bare filename: a developer who
    // has baked site-images.json locally legitimately has /static/og.png -
    // which is exactly why this file mocks siteImages absent explicitly.
    const html = addonPage(addon)
    expect(html).not.toContain('/assets/survivalrp/1.2.2/og.png')
    expect(html).not.toContain('touch-icon')
    // The fallback path must still render a real page - a broken meta helper
    // that swallowed everything would trivially satisfy the two lines above.
    expect(html).toContain('<title>SurvivalRP - World of Warcraft Addon by Dosaki</title>')
    expect(html).toContain('<meta name="twitter:card" content="summary">')
  })
})
