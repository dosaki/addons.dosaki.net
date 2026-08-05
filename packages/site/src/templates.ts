import { fieldsHtml } from './forms-html.js'
import { esc } from './html.js'
import { THEME_CSS } from './theme.js'
import type { AddonPage, FormDefinition, Heading } from './types.js'

export { THEME_CSS, esc }

/** Version-scoped, so the URL can never change meaning and is cached forever. */
export function assetUrl(slug: string, version: string, key: string): string {
  return `/assets/${slug}/${version}/${key}`
}

function shell(title: string, body: string): string {
  return `<!doctype html>
<html lang="en"><head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<style>${THEME_CSS}</style>
</head><body>
${body}
<footer class="site"><div class="wrap">addons.dosaki.net &middot; &copy; ${new Date().getUTCFullYear()} Dosaki</div></footer>
</body></html>`
}

function tocList(headings: Heading[]): string {
  if (headings.length === 0) return ''
  const items = headings
    .map((h) => `<li><a href="#${esc(h.id)}">${esc(h.text)}</a></li>`)
    .join('')
  return `<nav class="toc"><h2>Contents</h2><ul>${items}</ul></nav>`
}

function siteHeader(addon: AddonPage): string {
  const icon =
    addon.icon === undefined
      ? ''
      : `<img class="icon" src="${esc(assetUrl(addon.slug, addon.version, addon.icon))}" alt="">`
  return `<header class="site"><div class="wrap"><div class="row">
<a class="logo" href="/${esc(addon.slug)}">${icon}<h1>${esc(addon.name)}</h1></a>
<div><p>${esc(addon.tagline)}</p></div>
<a class="dl ghost" href="/${esc(addon.slug)}/reports">View Reports</a>
<a class="dl ghost" href="/${esc(addon.slug)}/report">Report an Issue</a>
<a class="dl" href="/${esc(addon.slug)}/download">Download<small>version ${esc(addon.version)}</small></a>
</div></div></header>`
}

export function addonPage(addon: AddonPage): string {
  return shell(
    `${addon.name} - addons.dosaki.net`,
    `${siteHeader(addon)}
<div class="wrap"><div class="cols">
${tocList(addon.headings)}
<main>${addon.html}</main>
</div></div>`,
  )
}

export function reportListPage(addon: AddonPage): string {
  const body =
    addon.forms.length === 0
      ? `<p>${esc(addon.name)} is not accepting reports through this site.</p>`
      : `<div class="cards">${addon.forms
          .map(
            (f) => `<a class="card" href="/${esc(addon.slug)}/report/${esc(f.key)}">
<div><h2>${esc(f.name)}</h2><p>${esc(f.description)}</p></div></a>`,
          )
          .join('')}</div>
<p class="hint">No account needed - reports go straight to the developer.</p>
<p class="hint"><a href="/${esc(addon.slug)}/reports">See what's already been reported</a> - it may save you the typing.</p>`

  return shell(
    `Report - ${addon.name}`,
    `${siteHeader(addon)}<div class="wrap"><h1 class="page">Report a problem</h1>${body}</div>`,
  )
}

export interface ReportItem {
  number: number
  title: string
  createdAt: string
  up: number
  down: number
}

function reportRow(slug: string, report: ReportItem): string {
  return `<li class="card report">
<div><h2><a href="/${esc(slug)}/reports/${report.number}">${esc(report.title)}</a></h2><p class="hint">Opened ${esc(report.createdAt.slice(0, 10))}</p></div>
<div class="votes" data-slug="${esc(slug)}" data-issue="${report.number}">
<button class="vote" data-dir="up" aria-label="This matters to me">👍 <span class="count">${report.up}</span></button>
<button class="vote" data-dir="down" aria-label="Not a priority">👎 <span class="count">${report.down}</span></button>
</div></li>`
}

/** null means the list could not be fetched; the page itself still renders. */
export function reportsPage(addon: AddonPage, reports: ReportItem[] | null): string {
  const body =
    reports === null
      ? '<p>Reports are temporarily unavailable right now. Please try again shortly.</p>'
      : reports.length === 0
        ? '<p>Nothing has been reported yet.</p>'
        : `<noscript><div class="problems">Voting needs JavaScript enabled - the site signs your vote before forwarding it.</div></noscript>
<ul class="reports">${reports.map((r) => reportRow(addon.slug, r)).join('\n')}</ul>
<p class="hint">Vote to tell the developer what matters most.</p>
<script src="/static/form.js" defer></script>`

  return shell(
    `Reports - ${addon.name}`,
    `${siteHeader(addon)}<div class="wrap"><h1 class="page">Existing reports</h1>${body}</div>`,
  )
}

/**
 * Site-injected on every form, so no addon template needs it. Skipped only
 * when a template already asks for the reserved id itself.
 */
function nameField(form: FormDefinition): string {
  if (form.fields.some((f) => f.id === 'reporter-name')) return ''
  return `<div class="field"><label for="reporter-name">Name <span class="opt">optional</span></label>
<p class="hint">so I know who to credit for the idea or the report</p>
<input type="text" id="reporter-name" name="reporter-name" maxlength="80"></div>`
}

export interface ReportComment {
  author: string
  isDeveloper: boolean
  createdAt: string
  /** Already rendered AND sanitized by renderIssueMarkdown - inserted as-is. */
  html: string
}

export interface ReportDetail {
  number: number
  title: string
  createdAt: string
  up: number
  down: number
  /** Already rendered AND sanitized by renderIssueMarkdown - inserted as-is. */
  html: string
  reporter: string | null
  comments: ReportComment[]
}

function commentBlock(comment: ReportComment): string {
  const who = comment.isDeveloper
    ? '<strong class="dev">Developer</strong>'
    : `<strong>${esc(comment.author)}</strong>`
  return `<li class="reply">
<p class="hint">${who} &middot; ${esc(comment.createdAt.slice(0, 10))}</p>
<div>${comment.html}</div></li>`
}

export function reportDetailPage(addon: AddonPage, report: ReportDetail): string {
  const credit = report.reporter === null ? '' : ` &middot; Reported by ${esc(report.reporter)}`
  const replies =
    report.comments.length === 0
      ? '<p class="hint">No replies yet.</p>'
      : `<ul class="replies">${report.comments.map(commentBlock).join('\n')}</ul>`

  return shell(
    `${report.title} - ${addon.name}`,
    `${siteHeader(addon)}
<div class="wrap">
<p class="crumb"><a href="/${esc(addon.slug)}/reports">&larr; All reports</a></p>
<h1 class="page">${esc(report.title)}</h1>
<p class="hint">Opened ${esc(report.createdAt.slice(0, 10))}${credit}</p>
<noscript><div class="problems">Voting needs JavaScript enabled - the site signs your vote before forwarding it.</div></noscript>
<div class="votes" data-slug="${esc(addon.slug)}" data-issue="${report.number}">
<button class="vote" data-dir="up" aria-label="This matters to me">👍 <span class="count">${report.up}</span></button>
<button class="vote" data-dir="down" aria-label="Not a priority">👎 <span class="count">${report.down}</span></button>
</div>
<main class="report-body">${report.html}</main>
<h2 class="page replies-title">Replies</h2>
${replies}
<script src="/static/form.js" defer></script>
</div>`,
  )
}

export function reportFormPage(addon: AddonPage, form: FormDefinition): string {
  return shell(
    `${form.name} - ${addon.name}`,
    `${siteHeader(addon)}
<div class="wrap">
<p class="crumb"><a href="/${esc(addon.slug)}/report">&larr; All reports</a></p>
<h1 class="page">${esc(form.name)}</h1>
<div id="form-root">
<noscript><div class="problems">Sending a report needs JavaScript enabled - the site signs your submission before forwarding it.</div></noscript>
<form action="/api/issue" method="post">
<input type="hidden" name="slug" value="${esc(addon.slug)}">
<input type="hidden" name="form" value="${esc(form.key)}">
${fieldsHtml(form)}
${nameField(form)}
<button type="submit" class="dl">Send report</button>
</form>
</div>
<script src="/static/form.js" defer></script>
</div>`,
  )
}

function card(addon: AddonPage): string {
  // Omitted, not a placeholder, when the addon has none - same choice
  // siteHeader already makes for its icon, and it costs nothing here: the
  // card is a flex row, so dropping the <img> just leaves the text to fill
  // it rather than leaving a gap or a broken image.
  const icon =
    addon.icon === undefined
      ? ''
      : `<img class="icon" src="${esc(assetUrl(addon.slug, addon.version, addon.icon))}" alt="" loading="eager">`
  return `<a class="card" href="/${esc(addon.slug)}">
${icon}<div><h2>${esc(addon.name)}</h2><p>${esc(addon.tagline)}</p></div></a>`
}

export function indexPage(addons: AddonPage[], unavailable: string[]): string {
  const cards = addons.map(card).join('')
  const broken = unavailable
    .map((slug) => `<div class="card off"><div><h2>${esc(slug)}</h2><p>Temporarily unavailable.</p></div></div>`)
    .join('')
  return shell(
    'addons.dosaki.net',
    `<header class="site"><div class="wrap"><div class="row">
<div><h1>Addons</h1><p>World of Warcraft addons by Dosaki.</p></div>
</div></div></header>
<div class="wrap"><div class="cards">${cards}${broken}</div></div>`,
  )
}

export function methodNotAllowedPage(): string {
  return shell(
    'Method not allowed - addons.dosaki.net',
    `<header class="site"><div class="wrap"><div class="row">
<div><h1>Method not allowed</h1><p>This site only answers GET requests.</p></div>
</div></div></header>`,
  )
}

export function notFoundPage(addons: AddonPage[]): string {
  const links = addons
    .map((a) => `<li><a href="/${esc(a.slug)}">${esc(a.name)}</a></li>`)
    .join('')
  return shell(
    'Not found - addons.dosaki.net',
    `<header class="site"><div class="wrap"><div class="row">
<div><h1>Not found</h1><p>No addon lives at that address.</p></div>
</div></div></header>
<div class="wrap"><ul>${links}</ul></div>`,
  )
}
