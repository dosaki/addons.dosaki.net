import { describe, expect, it } from 'vitest'
import { addonPage, assetUrl, indexPage, notFoundPage, reportFormPage, reportListPage } from '../src/templates.js'
import type { AddonPage, FormDefinition } from '../src/types.js'

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

const aForm: FormDefinition = {
  key: 'bug_report', name: 'Bug report', description: 'Something is not working',
  labels: ['bug'],
  fields: [{ type: 'textarea', id: 'what', label: 'What happened?', required: true }],
}
const withForms = { ...addon, forms: [aForm] }

describe('reportListPage', () => {
  it('links each form by key', () => {
    const html = reportListPage(withForms)
    expect(html).toContain('href="/survivalrp/report/bug_report"')
    expect(html).toContain('Bug report')
    expect(html).toContain('Something is not working')
  })

  it('says so plainly when an addon publishes no forms', () => {
    expect(reportListPage({ ...addon, forms: [] }).toLowerCase()).toContain('not accepting')
  })

  it('reassures that no account is needed', () => {
    expect(reportListPage(withForms).toLowerCase()).toContain('no github account')
  })
})

describe('reportFormPage', () => {
  it('posts to the api route', () => {
    const html = reportFormPage(withForms, aForm)
    expect(html).toContain('action="/api/issue"')
    expect(html).toContain('method="post"')
  })

  it('carries the slug and form key so a no-JS post still identifies itself', () => {
    const html = reportFormPage(withForms, aForm)
    expect(html).toContain('name="slug" value="survivalrp"')
    expect(html).toContain('name="form" value="bug_report"')
  })

  it('mounts the island and loads exactly one script', () => {
    const html = reportFormPage(withForms, aForm)
    expect(html).toContain('id="form-root"')
    expect((html.match(/<script/g) ?? []).length).toBe(1)
    expect(html).toContain('/static/form.js')
  })

  it('renders every field server-side, so it works without the script', () => {
    expect(reportFormPage(withForms, aForm)).toContain('<textarea')
  })
})

describe('the rest of the site stays script-free', () => {
  it('addon page has no script', () => {
    expect(addonPage(withForms)).not.toContain('<script')
  })
  it('index has no script', () => {
    expect(indexPage([withForms], [])).not.toContain('<script')
  })
  it('form list has no script', () => {
    expect(reportListPage(withForms)).not.toContain('<script')
  })
})
