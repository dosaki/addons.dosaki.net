import { describe, expect, it } from 'vitest'
import { addonPage, assetUrl, indexPage, notFoundPage, reportDetailPage, reportFormPage, reportListPage, reportsPage } from '../src/templates.js'
import type { AddonPage, FormDefinition } from '../src/types.js'
import { OG_KEY, SITE_NAME, SITE_ORIGIN, TOUCH_KEY } from '../src/meta.js'

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

  it('carries a copyright line for Dosaki in the footer', () => {
    const year = new Date().getUTCFullYear()
    expect(addonPage(addon)).toContain(`&copy; ${year} Dosaki`)
    expect(indexPage([addon], [])).toContain(`&copy; ${year} Dosaki`)
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

  it('links the header icon and name back to the addon page', () => {
    const html = addonPage(addon)
    expect(html).toContain('href="/survivalrp"')
  })

  it('says "Report an Issue" on the report button', () => {
    expect(addonPage(addon)).toContain('Report an Issue')
  })

  it('omits the icon element entirely when the addon has none', () => {
    const { icon, ...rest } = addon
    const html = addonPage(rest as AddonPage)
    expect(html).not.toContain('/assets/survivalrp/1.2.2/undefined')
  })

  it('ships no client-executed script - only the JSON-LD data block', () => {
    const html = addonPage(addon)
    expect(html).not.toContain('<script src')
    expect((html.match(/<script/g) ?? []).length).toBe(1)
    expect(html).toContain('<script type="application/ld+json">')
  })

  it('links back to the addon list', () => {
    const html = addonPage(addon)
    expect(html).toContain('<p class="crumb"><a href="/">&larr; All addons</a></p>')
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

  it('shows the addon logo on its index card', () => {
    const html = indexPage([addon], [])
    expect(html).toContain('/assets/survivalrp/1.2.2/icon.svg')
  })

  it('renders a card without an icon cleanly', () => {
    const { icon, ...rest } = addon
    const html = indexPage([rest as AddonPage], [])
    expect(html).not.toContain('/assets/survivalrp/1.2.2/undefined')
    expect(html).toContain('SurvivalRP')
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
    expect(reportListPage(withForms).toLowerCase()).toContain('no account needed')
  })

  it('never mentions GitHub - users need not know where reports land', () => {
    expect(reportListPage(withForms).toLowerCase()).not.toContain('github')
    expect(reportFormPage(withForms, aForm).toLowerCase()).not.toContain('github')
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

  it('asks for the name before the template fields', () => {
    const html = reportFormPage(withForms, aForm)
    expect(html.indexOf('id="reporter-name"')).toBeLessThan(html.indexOf('What happened?'))
  })

  it('warns a visitor without JavaScript before they fill anything in', () => {
    const html = reportFormPage(withForms, aForm)
    expect(html).toContain('<noscript>')
    expect(html.indexOf('<noscript>')).toBeLessThan(html.indexOf('<form'))
  })

  it('plants the off-screen honeypot decoy', () => {
    const html = reportFormPage(withForms, aForm)
    expect(html).toContain('name="website"')
    expect(html).toContain('class="hp"')
    expect(html).toContain('tabindex="-1"')
  })
})

const someReports = [
  { number: 7, title: 'It broke', createdAt: '2026-03-01T12:00:00Z', up: 3, down: 1 },
  { number: 9, title: 'Add pets', createdAt: '2026-04-01T12:00:00Z', up: 0, down: 0 },
]

describe('reportsPage', () => {
  it('lists each report with its title and tallies', () => {
    const html = reportsPage(withForms, someReports)
    expect(html).toContain('It broke')
    expect(html).toContain('Add pets')
    expect(html).toContain('data-issue="7"')
    expect(html).toContain('>3<')
    expect(html).toContain('>1<')
  })

  it('renders reports in the order given, which the caller has sorted', () => {
    const html = reportsPage(withForms, someReports)
    expect(html.indexOf('It broke')).toBeLessThan(html.indexOf('Add pets'))
  })

  it('offers an up and a down button per report, carrying the slug', () => {
    const html = reportsPage(withForms, someReports)
    expect(html).toContain('data-slug="survivalrp"')
    expect(html).toContain('data-dir="up"')
    expect(html).toContain('data-dir="down"')
  })

  it('shows when a report was opened', () => {
    expect(reportsPage(withForms, someReports)).toContain('2026-03-01')
  })

  it('escapes report titles rather than trusting them', () => {
    const evil = [{ ...someReports[0]!, title: '<script>alert(1)</script>' }]
    expect(reportsPage(withForms, evil)).not.toContain('<script>alert(1)')
  })

  it('says so plainly when nothing has been reported', () => {
    expect(reportsPage(withForms, []).toLowerCase()).toContain('nothing has been reported')
  })

  it('degrades to an unavailable note when the list cannot be fetched', () => {
    expect(reportsPage(withForms, null).toLowerCase()).toContain('temporarily unavailable')
  })

  it('loads the client script and warns a visitor without JavaScript', () => {
    const html = reportsPage(withForms, someReports)
    expect(html).toContain('/static/form.js')
    expect(html).toContain('<noscript>')
  })

  it('never mentions GitHub - users need not know where reports live', () => {
    expect(reportsPage(withForms, someReports).toLowerCase()).not.toContain('github')
  })
})

const aDetail = {
  number: 7,
  title: 'It broke',
  createdAt: '2026-03-01T12:00:00Z',
  summary: 'The HUD vanished.',
  up: 3,
  down: 1,
  html: '<h3>What happened</h3><p>The HUD vanished</p>',
  reporter: 'Nesingwary' as string | null,
  comments: [
    { author: 'dosaki', isDeveloper: true, createdAt: '2026-03-02T12:00:00Z', html: '<p>Fixed in 1.2.3</p>' },
    { author: 'somefan', isDeveloper: false, createdAt: '2026-03-03T12:00:00Z', html: '<p>Same here</p>' },
  ],
}

describe('reportDetailPage', () => {
  it('shows the title, the rendered body, and when it was opened', () => {
    const html = reportDetailPage(withForms, aDetail)
    expect(html).toContain('It broke')
    expect(html).toContain('The HUD vanished')
    expect(html).toContain('2026-03-01')
  })

  it('credits the reporter when the report carried a name', () => {
    expect(reportDetailPage(withForms, aDetail)).toContain('Reported by Nesingwary')
  })

  it('stays silent about the reporter when there was none', () => {
    expect(reportDetailPage(withForms, { ...aDetail, reporter: null })).not.toContain('Reported by')
  })

  it('carries the same vote widget as the list', () => {
    const html = reportDetailPage(withForms, aDetail)
    expect(html).toContain('data-slug="survivalrp"')
    expect(html).toContain('data-issue="7"')
    expect(html).toContain('data-dir="up"')
  })

  it('badges the developer reply by name and names the other', () => {
    const html = reportDetailPage(withForms, aDetail)
    expect(html).toContain('Dosaki (Developer)')
    expect(html).toContain('somefan')
    expect(html).toContain('Fixed in 1.2.3')
  })

  it('asks for the name before the reply text', () => {
    const html = reportDetailPage(withForms, aDetail)
    expect(html.indexOf('id="reporter-name"')).toBeLessThan(html.indexOf('id="comment-body"'))
  })

  it('says so plainly when nobody replied', () => {
    expect(reportDetailPage(withForms, { ...aDetail, comments: [] }).toLowerCase()).toContain(
      'no replies yet',
    )
  })

  it('escapes the title and comment authors rather than trusting them', () => {
    const evil = {
      ...aDetail,
      title: '<script>alert(1)</script>',
      comments: [{ author: '<b>x</b>', isDeveloper: false, createdAt: '2026-03-03T12:00:00Z', html: '<p>hi</p>' }],
    }
    const html = reportDetailPage(withForms, evil)
    expect(html).not.toContain('<script>alert(1)')
    expect(html).not.toContain('<b>x</b>')
  })

  it('links back to the reports list', () => {
    expect(reportDetailPage(withForms, aDetail)).toContain('href="/survivalrp/reports"')
  })

  it('loads the client script and warns a visitor without JavaScript', () => {
    const html = reportDetailPage(withForms, aDetail)
    expect(html).toContain('/static/form.js')
    expect(html).toContain('<noscript>')
  })

  it('never mentions GitHub - users need not know where reports live', () => {
    expect(reportDetailPage(withForms, aDetail).toLowerCase()).not.toContain('github')
  })

  it('renders a reply form posting to the comment api', () => {
    const html = reportDetailPage(withForms, aDetail)
    expect(html).toContain('id="comment-root"')
    expect(html).toContain('action="/api/comment"')
    expect(html).toContain(`name="issue" value="${aDetail.number}"`)
    expect(html).toContain('name="slug" value="survivalrp"')
    expect(html).toContain('name="body"')
    expect(html).toContain('name="reporter-name"')
    expect(html).toContain('name="website"')
  })
})

describe('links to the reports page', () => {
  it('links each listed report title to its detail page', () => {
    expect(reportsPage(withForms, someReports)).toContain('href="/survivalrp/reports/7"')
  })

  it('from the addon page header', () => {
    expect(addonPage(withForms)).toContain('href="/survivalrp/reports"')
  })

  it('from the report chooser, framed as duplicate prevention', () => {
    const html = reportListPage(withForms)
    expect(html).toContain('href="/survivalrp/reports"')
    expect(html.toLowerCase()).toContain('already been reported')
  })
})

describe('the injected Name field', () => {
  it('appears on every report form before the submit button', () => {
    const html = reportFormPage(withForms, aForm)
    expect(html).toContain('name="reporter-name"')
    expect(html).toContain('so I know who to credit for the idea or the report')
    expect(html.indexOf('reporter-name')).toBeLessThan(html.indexOf('Send report'))
  })

  it('is optional and says so', () => {
    const html = reportFormPage(withForms, aForm)
    const input = html.slice(html.indexOf('<input type="text" id="reporter-name"'))
    expect(input.slice(0, input.indexOf('>'))).not.toContain('required')
  })

  it('is not injected twice when a template already asks for it', () => {
    const own: FormDefinition = {
      ...aForm,
      fields: [...aForm.fields, { type: 'input', id: 'reporter-name', label: 'Name', required: false }],
    }
    const html = reportFormPage({ ...addon, forms: [own] }, own)
    expect((html.match(/name="reporter-name"/g) ?? []).length).toBe(1)
  })
})

describe('the rest of the site stays script-free', () => {
  it('addon page has no client-executed script, only the JSON-LD data block', () => {
    const html = addonPage(withForms)
    expect(html).not.toContain('<script src')
    expect((html.match(/<script/g) ?? []).length).toBe(1)
  })
  it('index has no script', () => {
    expect(indexPage([withForms], [])).not.toContain('<script')
  })
  it('form list has no script', () => {
    expect(reportListPage(withForms)).not.toContain('<script')
  })
})

/** An addon whose bundle carries the bake-time preview images. */
const withPreviews: AddonPage = {
  ...addon,
  assets: new Map<string, Uint8Array>([
    [OG_KEY, new Uint8Array([1])],
    [TOUCH_KEY, new Uint8Array([2])],
  ]),
}

describe('addon page metadata', () => {
  it('puts the addon and the searchable phrase in the title', () => {
    expect(addonPage(addon)).toContain(
      '<title>SurvivalRP - World of Warcraft Addon by Dosaki</title>',
    )
  })

  it('uses the manifest tagline as the description', () => {
    expect(addonPage(addon)).toContain(
      'content="Optional survival mechanics for role-play. A free World of Warcraft addon by Dosaki."',
    )
  })

  it('is indexable, unlike every report route', () => {
    const html = addonPage(addon)
    expect(html).not.toContain('name="robots"')
    // Proves headTags actually ran and chose to omit robots, rather than
    // the page having failed to render at all.
    expect(html).toContain('<title>SurvivalRP - World of Warcraft Addon by Dosaki</title>')
  })

  it('canonicalises to the addon path', () => {
    expect(addonPage(addon)).toContain(
      `<link rel="canonical" href="${SITE_ORIGIN}/survivalrp">`,
    )
  })

  it("uses the addon's own logo as the favicon", () => {
    expect(addonPage(addon)).toContain(
      '<link rel="icon" type="image/svg+xml" href="/assets/survivalrp/1.2.2/icon.svg">',
    )
  })

  // The "falls back to the site favicon when the addon has none" and "falls
  // back to the site card when the bundle predates preview generation"
  // cases live in templates-site-asset-absent.test.ts, which mocks siteLogo
  // and siteImages absent explicitly rather than relying on this checkout
  // not (yet) having static/logo.svg or a baked site-images.json.

  it("uses the addon's generated card as the preview when the bundle has one", () => {
    const html = addonPage(withPreviews)
    expect(html).toContain(
      `<meta property="og:image" content="${SITE_ORIGIN}/assets/survivalrp/1.2.2/og.png">`,
    )
    expect(html).toContain('content="SurvivalRP logo"')
    expect(html).toContain(
      '<link rel="apple-touch-icon" href="/assets/survivalrp/1.2.2/touch-icon.png">',
    )
  })

  it('describes itself to search engines as a free game application', () => {
    const html = addonPage(addon)
    expect(html).toContain('<script type="application/ld+json">')
    expect(html).toContain('"@type":"SoftwareApplication"')
    expect(html).toContain('"name":"SurvivalRP"')
    expect(html).toContain('"softwareVersion":"1.2.2"')
    expect(html).toContain('"price":"0"')
  })
})

describe('index page metadata', () => {
  it('names the addons in the title instead of the bare domain', () => {
    expect(indexPage([addon], [])).toContain(
      "<title>Dosaki's World of Warcraft Addons</title>",
    )
  })

  it('canonicalises to the root', () => {
    expect(indexPage([addon], [])).toContain(
      `<link rel="canonical" href="${SITE_ORIGIN}/">`,
    )
  })

  it('is indexable', () => {
    const html = indexPage([addon], [])
    expect(html).not.toContain('name="robots"')
    // Proves headTags actually ran and chose to omit robots, rather than
    // the page having failed to render at all.
    expect(html).toContain(`<link rel="canonical" href="${SITE_ORIGIN}/">`)
  })

  it('carries the site name as the og:site_name on every page', () => {
    expect(indexPage([addon], [])).toContain(
      `<meta property="og:site_name" content="${SITE_NAME}">`,
    )
  })
})

describe('report route metadata', () => {
  const form: FormDefinition = {
    key: 'bug_report',
    name: 'Bug report',
    description: 'Something is not working.',
    labels: [],
    fields: [],
  }

  it('keeps every report route out of the index', () => {
    for (const html of [
      reportListPage(addon),
      reportFormPage(addon, form),
      reportsPage(addon, []),
      reportDetailPage(addon, {
        number: 7,
        title: 'Food not detected',
        createdAt: '2026-01-02T00:00:00Z',
        up: 0,
        down: 0,
        html: '<p>x</p>',
        summary: 'Bread does not restore hunger.',
        reporter: null,
        comments: [],
      }),
    ]) {
      expect(html).toContain('<meta name="robots" content="noindex, follow">')
    }
  })

  it('titles a report with its own subject', () => {
    const html = reportDetailPage(addon, {
      number: 7,
      title: 'Food not detected',
      createdAt: '2026-01-02T00:00:00Z',
      up: 0,
      down: 0,
      html: '<p>x</p>',
      summary: 'Bread does not restore hunger.',
      reporter: null,
      comments: [],
    })
    expect(html).toContain('<title>Food not detected - SurvivalRP</title>')
    expect(html).toContain('content="Bread does not restore hunger."')
  })

  it('titles a form page with the form name', () => {
    expect(reportFormPage(addon, form)).toContain('<title>Bug report - SurvivalRP</title>')
  })

  it('falls back to the /report description when the form has none', () => {
    const html = reportFormPage(addon, { ...form, description: '' })
    expect(html).toContain(
      'content="Report a bug or suggest a feature for SurvivalRP. No account needed."',
    )
    // Proves the page actually rendered with the form's own content, rather
    // than the fallback description appearing in isolation.
    expect(html).toContain('<title>Bug report - SurvivalRP</title>')
  })
})
