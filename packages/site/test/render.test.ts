import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { renderIssueMarkdown, renderReadme } from '../src/render.js'

const real = readFileSync(
  join(import.meta.dirname, 'fixtures', 'survivalrp-readme.md'),
  'utf8',
)

describe('renderReadme', () => {
  it('renders headings with stable ids', () => {
    const { html } = renderReadme('## What it does\n')
    expect(html).toContain('id="what-it-does"')
  })

  it('collects h2 headings in document order', () => {
    const { headings } = renderReadme(
      '# Title\n\n## First\n\n### Nested\n\n## Second\n',
    )
    expect(headings).toEqual([
      { id: 'first', text: 'First' },
      { id: 'second', text: 'Second' },
    ])
  })

  it('keeps the raw HTML the README legitimately uses', () => {
    const { html } = renderReadme('<p align="center"><img src="icon.svg" alt="x"></p>')
    expect(html).toContain('<p align="center">')
    expect(html).toContain('src="icon.svg"')
  })

  it('strips a script tag', () => {
    const { html } = renderReadme('ok <script>alert(1)</script> done')
    expect(html).not.toContain('<script')
    expect(html).not.toContain('alert(1)')
  })

  it('strips an event-handler attribute', () => {
    const { html } = renderReadme('<img src="x.webp" onerror="alert(1)">')
    expect(html).toContain('src="x.webp"')
    expect(html).not.toContain('onerror')
  })

  it('strips a javascript: href', () => {
    const { html } = renderReadme('<a href="javascript:alert(1)">x</a>')
    expect(html).not.toContain('javascript:')
  })

  it('renders GFM tables, which the real README uses', () => {
    const { html } = renderReadme('| a | b |\n| --- | --- |\n| 1 | 2 |\n')
    expect(html).toContain('<table>')
    expect(html).toContain('<td>1</td>')
  })

  it('marks images lazy-loading', () => {
    const { html } = renderReadme('![shot](tab-dm.webp)')
    expect(html).toContain('loading="lazy"')
  })

  it('leaves an explicit loading value alone rather than duplicating it', () => {
    const { html } = renderReadme('<img src="hero.webp" loading="eager">')
    expect(html).toContain('loading="eager"')
    expect(html).not.toContain('loading="lazy"')
    expect(html.match(/loading=/g)).toHaveLength(1)
  })

  it('gives headings decoded plain text, so consumers escape exactly once', () => {
    expect(renderReadme('## Tools &amp; toys\n').headings[0]!.text).toBe('Tools & toys')
  })

  it('handles the real SurvivalRP README', () => {
    const { html, headings } = renderReadme(real)
    expect(headings.length).toBeGreaterThanOrEqual(6)
    expect(html).toContain('<table>')
    expect(html).not.toContain('<script')
    // Every heading id it advertises must actually exist in the HTML.
    for (const h of headings) expect(html).toContain(`id="${h.id}"`)
  })
})

describe('renderIssueMarkdown', () => {
  it('renders the section shape issueBody produces', () => {
    const html = renderIssueMarkdown('### What happened\n\nIt **broke**')
    expect(html).toContain('<h3')
    expect(html).toContain('<strong>broke</strong>')
  })

  it('sanitizes a hostile body exactly like a README', () => {
    const html = renderIssueMarkdown('<script>alert(1)</script><img src=x onerror=alert(1)>')
    expect(html).not.toContain('<script')
    expect(html).not.toContain('onerror')
  })

  it('keeps fenced code blocks, which bug reports lean on', () => {
    expect(renderIssueMarkdown('```\nerror line\n```')).toContain('<pre>')
  })
})
