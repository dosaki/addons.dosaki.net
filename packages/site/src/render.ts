import MarkdownIt from 'markdown-it'
import anchor from 'markdown-it-anchor'
import sanitizeHtml from 'sanitize-html'
import type { Heading, Rendered } from './types.js'

const md: InstanceType<typeof MarkdownIt> = new MarkdownIt({
  html: true,
  linkify: true,
  typographer: false,
}).use(anchor, { slugify: slug, tabIndex: false })

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
}

const HEADING = /<h2\b[^>]*\bid="([^"]+)"[^>]*>(.*?)<\/h2>/gis

export function renderReadme(markdown: string): Rendered {
  const raw = md.render(markdown)
  const clean = sanitizeHtml(raw, ALLOWED)
  const lazy = clean.replace(/<img /g, '<img loading="lazy" ')

  const headings: Heading[] = []
  for (const m of lazy.matchAll(HEADING)) {
    const text = m[2]!.replace(/<[^>]*>/g, '').trim()
    if (text.length > 0) headings.push({ id: m[1]!, text })
  }

  return { html: lazy, headings }
}
