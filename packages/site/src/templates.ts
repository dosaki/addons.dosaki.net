import { THEME_CSS } from './theme.js'
import type { AddonPage, Heading } from './types.js'

export { THEME_CSS }

/** Version-scoped, so the URL can never change meaning and is cached forever. */
export function assetUrl(slug: string, version: string, key: string): string {
  return `/assets/${slug}/${version}/${key}`
}

/** Everything interpolated into HTML goes through this. Bundles are data, not trusted markup. */
export function esc(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
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
<footer class="site"><div class="wrap">addons.dosaki.net</div></footer>
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
${icon}
<div><h1>${esc(addon.name)}</h1><p>${esc(addon.tagline)}</p></div>
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

function card(addon: AddonPage): string {
  return `<a class="card" href="/${esc(addon.slug)}">
<h2>${esc(addon.name)}</h2><p>${esc(addon.tagline)}</p></a>`
}

export function indexPage(addons: AddonPage[], unavailable: string[]): string {
  const cards = addons.map(card).join('')
  const broken = unavailable
    .map((slug) => `<div class="card off"><h2>${esc(slug)}</h2><p>Temporarily unavailable.</p></div>`)
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
