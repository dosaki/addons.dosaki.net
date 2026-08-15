import { describe, expect, it } from 'vitest'
import { THEME_CSS } from '../src/theme.js'

describe('THEME_CSS', () => {
  it('does not force a height onto images that declare one', () => {
    // height: auto would override the HTML attribute, which sits lowest in the cascade
    expect(THEME_CSS).toContain('main img:not([height])')
    expect(THEME_CSS).not.toMatch(/main img \{[^}]*height:\s*auto/)
  })

  it('does not force a width onto images that declare one alongside a height', () => {
    // the same override, one property over: width: auto on `main img[height]`
    // alone would clobber an explicit width attribute the README also set
    expect(THEME_CSS).toContain('main img[height]:not([width])')
    expect(THEME_CSS).not.toMatch(/main img\[height\] \{[^}]*width:\s*auto/)
  })

  it('centres an image the README centres', () => {
    expect(THEME_CSS).toContain('margin-inline: auto')
  })

  it('self-hosts Marcellus for display type', () => {
    expect(THEME_CSS).toContain('@font-face')
    expect(THEME_CSS).toContain("font-family: 'Marcellus'")
    expect(THEME_CSS).toContain('/static/marcellus.woff2')
    expect(THEME_CSS).toContain('font-display: swap')
  })

  it('styles the reports list and vote buttons, including their locked state', () => {
    expect(THEME_CSS).toContain('ul.reports')
    expect(THEME_CSS).toContain('button.vote')
    expect(THEME_CSS).toContain('.vote:disabled')
  })

  it('styles the report detail replies, with the developer badge in bronze', () => {
    expect(THEME_CSS).toContain('ul.replies')
    expect(THEME_CSS).toContain('.reply')
    expect(THEME_CSS).toContain('.dev')
  })

  it('styles the closed badge and dims the closed report card', () => {
    expect(THEME_CSS).toContain('.badge')
    expect(THEME_CSS).toContain('.card.report.done')
  })

  it('styles label chips and the static tally a closed report shows', () => {
    expect(THEME_CSS).toContain('.labels')
    expect(THEME_CSS).toContain('.label')
    expect(THEME_CSS).toContain('.votes.done')
  })

  it('gives a scoped chip a dim scope half and a bright value half', () => {
    expect(THEME_CSS).toContain('.label .scope')
    expect(THEME_CSS).toContain('.label .value')
  })

  it('marks the priority scope out in bronze, so urgency reads at a glance', () => {
    expect(THEME_CSS).toContain('.label.scope-priority')
  })

  it('files the success box under arcane blue, not the old green', () => {
    expect(THEME_CSS).not.toContain('#2d6a4f')
    expect(THEME_CSS).not.toContain('#12211a')
  })
})
