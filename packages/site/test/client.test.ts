import { describe, expect, it } from 'vitest'
import { collect } from '../client/collect.js'

describe('collect', () => {
  it('joins repeated names, as a checkbox group produces', () => {
    expect(collect([
      { name: 'c', value: 'One', type: 'checkbox', checked: true },
      { name: 'c', value: 'Two', type: 'checkbox', checked: true },
      { name: 'c', value: 'Three', type: 'checkbox', checked: false },
    ])).toEqual({ c: 'One\nTwo' })
  })

  it('omits an unchecked checkbox entirely', () => {
    expect(collect([{ name: 'a', value: 'x', type: 'checkbox', checked: false }])).toEqual({})
  })

  it('keeps text values verbatim', () => {
    expect(collect([{ name: 'what', value: '  It broke\nbadly ', type: 'textarea' }]))
      .toEqual({ what: '  It broke\nbadly ' })
  })

  it('drops the hidden slug and form fields, which are not answers', () => {
    expect(collect([
      { name: 'slug', value: 'a', type: 'hidden' },
      { name: 'form', value: 'f', type: 'hidden' },
      { name: 'what', value: 'x', type: 'textarea' },
    ])).toEqual({ what: 'x' })
  })
})
