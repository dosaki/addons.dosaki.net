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
<p class="hint">No account needed - reports go straight to the developer.</p>`

  return shell(
    `Report - ${addon.name}`,
    `${siteHeader(addon)}<div class="wrap"><h1 class="page">Report a problem</h1>${body}</div>`,
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
