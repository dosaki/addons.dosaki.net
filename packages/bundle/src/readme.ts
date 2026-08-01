const RASTER = /\.(png|jpe?g|gif|webp)$/i
const VECTOR = /\.svg$/i

const MARKDOWN_IMAGE = /!\[([^\]]*)\]\(([^)\s]+)((?:\s+"[^"]*")?)\)/g
// `\b` is a word boundary, not an attribute boundary: it matches just as
// happily inside `data-src="..."` as it does before a real `src="..."`, and
// since the regex is non-anchored it takes whichever comes first in the
// tag. `(?:^|\s)` requires the character right before `src=` to be
// whitespace (or the very start of the match), which `data-` never is.
const HTML_IMAGE = /(<img\b[^>]*?(?:^|\s)src=")([^"]+)(")/gi
const MARKDOWN_LINK = /(?<!!)\[([^\]]+)\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g

// Residual-scan patterns. These run AFTER the rewrites above, on the
// rewritten output, and exist only to catch a local image reference that
// slipped past one of those rewrites - a single-quoted `src='...'`, a
// reference-style image (`![a][ref]` / `[ref]: docs/x.png`), a path
// wrapped in `<angle brackets>` because it has a space, or one with a
// trailing `?raw=1` query string. Rather than teach the rewrites above
// every syntax markdown/HTML allows for an image reference, this scan is
// deliberately permissive about *finding* a candidate and relies on
// `isBundleKeyShaped` to tell an already-rewritten reference (safe) from
// one that is not (a silent 404 waiting to happen).
const RESIDUAL_MARKDOWN_IMAGE = /!\[[^\]]*\]\(([^)]*)\)/g
const RESIDUAL_IMG_SRC = /<img\b[^>]*?(?:^|\s)src\s*=\s*(["'])([^"']*)\1/gi
const RESIDUAL_REFERENCE_DEF = /^[ \t]*\[[^\]]+\]:\s*(\S+)/gm

export interface ReadmeResult {
  markdown: string
  /** repo-relative source path -> bundle key */
  images: Map<string, string>
  /** repo-relative link targets that were flattened to plain text */
  flattenedLinks: string[]
}

function isLocal(target: string): boolean {
  return !/^[a-z][a-z0-9+.-]*:/i.test(target) && !target.startsWith('#') && !target.startsWith('//')
}

function isImage(target: string): boolean {
  return RASTER.test(target) || VECTOR.test(target)
}

function normalise(target: string): string {
  return target.replace(/^\.\//, '')
}

function stripQuery(target: string): string {
  return target.replace(/[?#].*$/, '')
}

function unwrapAngleBrackets(target: string): string {
  return target.startsWith('<') && target.endsWith('>') ? target.slice(1, -1) : target
}

/**
 * True for a target already in the shape `keyFor` produces: a bare
 * filename (no directory, no embedded space), no query string, and - for
 * anything with a raster extension - already `.webp` (an SVG key stays an
 * SVG, since those pass through untouched). Anything image-like that fails
 * this is evidence a rewrite above missed it.
 */
function isBundleKeyShaped(target: string): boolean {
  if (/[\\/\s]/.test(target)) return false
  if (stripQuery(target) !== target) return false
  return !(RASTER.test(target) && !/\.webp$/i.test(target))
}

/** A local image reference that looks like it survived the rewrites above unrewritten. */
function findResidualImages(markdown: string): string[] {
  const found = new Set<string>()

  const check = (raw: string): void => {
    const target = unwrapAngleBrackets(raw.trim())
    if (target === '') return
    if (!isLocal(target)) return
    if (!isImage(stripQuery(target))) return
    if (isBundleKeyShaped(target)) return
    found.add(target)
  }

  for (const match of markdown.matchAll(RESIDUAL_MARKDOWN_IMAGE)) check(match[1] ?? '')
  for (const match of markdown.matchAll(RESIDUAL_IMG_SRC)) check(match[2] ?? '')
  for (const match of markdown.matchAll(RESIDUAL_REFERENCE_DEF)) check(match[1] ?? '')

  return [...found]
}

export function rewriteReadme(source: string): ReadmeResult {
  const images = new Map<string, string>()
  const byKey = new Map<string, string>()
  const flattenedLinks: string[] = []

  const keyFor = (target: string): string => {
    const path = normalise(target)
    const existing = images.get(path)
    if (existing !== undefined) return existing

    const base = path.split('/').pop() ?? path
    const key = VECTOR.test(base) ? base : base.replace(RASTER, '.webp')

    const clash = byKey.get(key)
    if (clash !== undefined && clash !== path) {
      throw new Error(`"${clash}" and "${path}" both map to "${key}"`)
    }
    byKey.set(key, path)
    images.set(path, key)
    return key
  }

  let markdown = source.replace(
    MARKDOWN_IMAGE,
    (match, alt: string, target: string, title: string) =>
      isLocal(target) && isImage(target) ? `![${alt}](${keyFor(target)}${title})` : match,
  )

  markdown = markdown.replace(
    HTML_IMAGE,
    (match, head: string, target: string, tail: string) =>
      isLocal(target) && isImage(target) ? `${head}${keyFor(target)}${tail}` : match,
  )

  markdown = markdown.replace(MARKDOWN_LINK, (match, text: string, target: string) => {
    if (!isLocal(target)) return match
    flattenedLinks.push(normalise(target))
    return text
  })

  const residual = findResidualImages(markdown)
  if (residual.length > 0) {
    throw new Error(
      `README still references local image(s) that were not bundled, and would 404 on the site: ` +
        `${residual.join(', ')}. Use a plain markdown image (![alt](path)) or an <img src="..."> ` +
        `with a double-quoted src.`,
    )
  }

  return { markdown, images, flattenedLinks }
}
