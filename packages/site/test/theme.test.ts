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
})
