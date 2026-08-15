import MarkdownIt from 'markdown-it'
// From the package's own typings, not @types/markdown-it: the two disagree
// about Token.attrs, and md.core.ruler hands the rule the package's StateCore.
import type { StateCore, Token } from 'markdown-it'
import anchor from 'markdown-it-anchor'
import sanitizeHtml from 'sanitize-html'
import type { Heading, Rendered } from './types.js'

function base(): InstanceType<typeof MarkdownIt> {
  return new MarkdownIt({
    html: true,
    linkify: true,
    typographer: false,
  }).use(anchor, { slugify: slug, tabIndex: false })
}

/**
 * A report reference: `#12`, the way GitHub itself writes one. The lookbehind
 * keeps `id7#12` and `##12` out, and requiring a leading 1-9 keeps `#0` out -
 * GitHub has no issue zero, and a bare `#` followed by a hex colour or an
 * anchor is far likelier than a reference.
 */
const REFERENCE = /(?<![\w#])#([1-9]\d*)(?!\w)/g

function textToken(state: StateCore, content: string): Token {
  const token = new state.Token('text', '', 0)
  token.content = content
  return token
}

/**
 * Splits `#12` out of the inline text tokens of one block. Working on tokens
 * rather than the rendered HTML is what makes this safe for free: a mention
 * inside a code span or a fenced block is never a `text` token, so it is never
 * reached. Link nesting is tracked so link TEXT is left alone too.
 */
function expand(state: StateCore, children: Token[], slug: string): Token[] {
  const out: Token[] = []
  let depth = 0

  for (const token of children) {
    if (token.type === 'link_open') depth += 1
    else if (token.type === 'link_close') depth -= 1

    if (token.type !== 'text' || depth > 0) {
      out.push(token)
      continue
    }

    const parts: Token[] = []
    let last = 0
    REFERENCE.lastIndex = 0
    for (let m = REFERENCE.exec(token.content); m !== null; m = REFERENCE.exec(token.content)) {
      if (m.index > last) parts.push(textToken(state, token.content.slice(last, m.index)))
      const open = new state.Token('link_open', 'a', 1)
      open.attrs = [['href', `/${slug}/reports/${m[1]}`]]
      parts.push(open, textToken(state, `#${m[1]}`), new state.Token('link_close', 'a', -1))
      last = m.index + m[0].length
    }

    if (parts.length === 0) {
      out.push(token)
      continue
    }
    if (last < token.content.length) parts.push(textToken(state, token.content.slice(last)))
    out.push(...parts)
  }

  return out
}

/** The addon slug arrives per-render through markdown-it's `env` argument. */
function issueReferences(md: InstanceType<typeof MarkdownIt>): void {
  md.core.ruler.push('issue_references', (state) => {
    const slug = (state.env as { slug?: string } | undefined)?.slug
    if (slug === undefined || slug === '') return
    for (const block of state.tokens) {
      if (block.type === 'inline' && block.children !== null) {
        block.children = expand(state, block.children, slug)
      }
    }
  })
}

/** READMEs get no reference expansion: they carry no report to point `#12` at. */
const md: InstanceType<typeof MarkdownIt> = base()
const mdIssue: InstanceType<typeof MarkdownIt> = base()
issueReferences(mdIssue)

/** Lowercase, non-alphanumerics to hyphens, collapsed and trimmed. */
export function slug(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, '-')
    .replace(/^-+|-+$/g, '')
}

/**
 * Raw HTML is ALLOW-LISTED, not passed through. The README legitimately uses
 * <img> and <p align="center">, so HTML cannot simply be disabled - but a
 * future addon's README is untrusted input in a way our own is not.
 */
const ALLOWED: sanitizeHtml.IOptions = {
  allowedTags: [
    'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'p', 'div', 'span', 'br', 'hr',
    'strong', 'em', 'del', 'code', 'pre', 'blockquote',
    'ul', 'ol', 'li', 'a', 'img',
    'table', 'thead', 'tbody', 'tr', 'th', 'td', 'details', 'summary',
  ],
  allowedAttributes: {
    a: ['href', 'title'],
    img: ['src', 'alt', 'title', 'width', 'height', 'loading'],
    '*': ['id', 'align'],
  },
  allowedSchemes: ['http', 'https', 'mailto'],
  // Relative asset URLs must survive; sanitize-html drops them without this.
  allowProtocolRelative: false,
  nonTextTags: ['style', 'script', 'textarea', 'option', 'noscript'],
  transformTags: {
    img: (tagName, attribs) => ({
      tagName,
      // Only default it: an author who set loading explicitly keeps their value.
      attribs: { loading: 'lazy', ...attribs },
    }),
  },
}

const HEADING = /<h2\b[^>]*\bid="([^"]+)"[^>]*>(.*?)<\/h2>/gis

/**
 * Decode the standard five entities so a heading's text is genuine plain
 * text - `&amp;` LAST, so `&amp;lt;` decodes to `&lt;` rather than `<`.
 */
function decodeEntities(text: string): string {
  return text
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, '&')
}

/**
 * An issue body is untrusted input in exactly the way a future addon's README
 * is, so it goes through the same pipeline and allow-list - minus the heading
 * collection, which only the README page's contents nav wants, and plus `#12`
 * expansion, which needs the addon the report belongs to.
 */
export function renderIssueMarkdown(markdown: string, slug: string): string {
  return sanitizeHtml(mdIssue.render(markdown, { slug }), ALLOWED)
}

export function renderReadme(markdown: string): Rendered {
  const raw = md.render(markdown)
  const clean = sanitizeHtml(raw, ALLOWED)

  const headings: Heading[] = []
  for (const m of clean.matchAll(HEADING)) {
    const text = decodeEntities(m[2]!.replace(/<[^>]*>/g, '')).trim()
    if (text.length > 0) headings.push({ id: m[1]!, text })
  }

  return { html: clean, headings }
}
