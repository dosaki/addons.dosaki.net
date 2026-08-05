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

  it('files the success box under arcane blue, not the old green', () => {
    expect(THEME_CSS).not.toContain('#2d6a4f')
    expect(THEME_CSS).not.toContain('#12211a')
  })
})
