import { esc } from './html.js'
import { BG } from './theme.js'
import type { AddonPage } from './types.js'

/**
 * Also hardcoded as SITE_BASE in packages/bundle/src/cli.ts. The duplication
 * is deliberate: the bundle generator is a standalone tool that must not
 * import from the site package.
 */
export const SITE_ORIGIN = 'https://addons.dosaki.net'

/** The brand a share card names, as opposed to the bare domain. */
export const SITE_NAME = "Dosaki's WoW Addons"

/**
 * Bundle keys scripts/bake.ts writes into every addon's images. They live
 * here rather than in og.ts because og.ts imports sharp - a native binary
 * that must never reach the Lambda's bundle - so the dependency runs
 * og.ts -> meta.ts and never the other way.
 */
export const OG_KEY = 'og.png'
export const TOUCH_KEY = 'touch-icon.png'

/** Open Graph's expected card size, declared so scrapers can pre-allocate. */
export const OG_WIDTH = 1200
export const OG_HEIGHT = 630

/** Apple's home-screen icon size. */
export const TOUCH_SIZE = 180

export interface PageMeta {
  /** The full <title>, used verbatim for og:title too. */
  title: string
  description: string
  /**
   * Root-relative path, e.g. "/survivalrp"; the canonical URL is
   * SITE_ORIGIN + path. Null on pages with no address of their own - 404s,
   * 405s, POST responses - which emit neither canonical nor og:url rather
   * than claiming a wrong one.
   */
  path: string | null
  /**
   * Absolute preview-image URL, or null when the page has no card. Absolute
   * because every unfurl scraper requires it.
   */
  image: string | null
  /** Alt text for `image`. Ignored when `image` is null. */
  imageAlt: string
  /** Root-relative SVG favicon path, or null when there is none to offer. */
  icon: string | null
  /** Root-relative PNG touch-icon path, or null. */
  touchIcon: string | null
  noindex: boolean
}

export function headTags(meta: PageMeta): string {
  const tags = [
    `<title>${esc(meta.title)}</title>`,
    `<meta name="description" content="${esc(meta.description)}">`,
    `<meta name="theme-color" content="${esc(BG)}">`,
  ]

  if (meta.path !== null) {
    tags.push(`<link rel="canonical" href="${esc(SITE_ORIGIN + meta.path)}">`)
  }
  if (meta.noindex) {
    // "follow" and not "nofollow": the page is not worth indexing, but the
    // links out of it still lead somewhere that is.
    tags.push('<meta name="robots" content="noindex, follow">')
  }
  if (meta.icon !== null) {
    tags.push(`<link rel="icon" type="image/svg+xml" href="${esc(meta.icon)}">`)
  }
  if (meta.touchIcon !== null) {
    // iOS ignores SVG here, which is the whole reason a PNG is generated.
    tags.push(`<link rel="apple-touch-icon" href="${esc(meta.touchIcon)}">`)
  }

  tags.push(
    '<meta property="og:type" content="website">',
    `<meta property="og:site_name" content="${esc(SITE_NAME)}">`,
    `<meta property="og:title" content="${esc(meta.title)}">`,
    `<meta property="og:description" content="${esc(meta.description)}">`,
  )
  if (meta.path !== null) {
    tags.push(`<meta property="og:url" content="${esc(SITE_ORIGIN + meta.path)}">`)
  }

  if (meta.image === null) {
    // No image means no large card; "summary" is the shape that still
    // renders acceptably on text alone.
    tags.push('<meta name="twitter:card" content="summary">')
  } else {
    tags.push(
      `<meta property="og:image" content="${esc(meta.image)}">`,
      `<meta property="og:image:width" content="${OG_WIDTH}">`,
      `<meta property="og:image:height" content="${OG_HEIGHT}">`,
      `<meta property="og:image:alt" content="${esc(meta.imageAlt)}">`,
      '<meta name="twitter:card" content="summary_large_image">',
    )
  }

  return tags.join('\n')
}

/**
 * A <script> element's contents are not HTML-parsed, so esc() would write
 * literal &quot; into the payload and corrupt the data rather than protect
 * it. The one real hazard is a "</script>" inside a string value, so every
 * "<" becomes its JSON escape - which is still valid JSON.
 */
export function jsonLd(data: unknown): string {
  const payload = JSON.stringify(data).replace(/</g, '\\u003c')
  return `<script type="application/ld+json">${payload}</script>`
}

/**
 * Turns a markdown body into one clean line for a meta description. Syntax
 * is stripped rather than rendered because the result lands in an attribute,
 * not in the document. 155 characters is roughly where Google truncates.
 */
export function summarize(markdown: string, max = 155): string {
  const flat = markdown
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/[#>*_`~]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

  if (flat.length <= max) return flat
  // Cut at the last space so the ellipsis never lands mid-word.
  const cut = flat.slice(0, max)
  const space = cut.lastIndexOf(' ')
  return `${(space > 0 ? cut.slice(0, space) : cut).trimEnd()}...`
}

/**
 * Report routes are disallowed rather than merely noindexed because they
 * render live from the GitHub API on every request with no cache: the cost
 * being avoided is API quota, and only a Disallow prevents the fetch. The
 * trade-off is that Google never sees the noindex meta on those pages, so a
 * report URL linked from elsewhere can still surface as a bare URL. The meta
 * tag stays as a second line of defence for crawlers that ignore this file.
 *
 * The wildcard report rule is a prefix match, so that one line covers all
 * four shapes - report, report with a form key, reports, and a numbered
 * report - while matching neither the root nor an addon page. (Described
 * rather than quoted: the pattern contains the sequence that would close
 * this comment.)
 */
export function robotsTxt(): string {
  return `User-agent: *
Disallow: /api/
Disallow: /*/report

Sitemap: ${SITE_ORIGIN}/sitemap.xml
`
}

/**
 * Built from the same addon list the index page renders, so the two cannot
 * drift. No lastmod: the site has no modification date it can honestly
 * publish. Unavailable addons are absent from `addons` already, and so are
 * absent here - they have no page to crawl.
 */
export function sitemapXml(addons: AddonPage[]): string {
  const urls = [`${SITE_ORIGIN}/`, ...addons.map((a) => `${SITE_ORIGIN}/${a.slug}`)]
  const entries = urls.map((url) => `  <url><loc>${esc(url)}</loc></url>`).join('\n')
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${entries}
</urlset>
`
}
