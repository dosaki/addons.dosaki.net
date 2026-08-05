import { describe, expect, it } from 'vitest'
import { collect } from '../client/collect.js'
import { voteKey, votePayload } from '../client/vote.js'
import { resolveSubmitName } from '../client/name.js'
import { commentPayload } from '../client/comment.js'

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

describe('voteKey', () => {
  it('scopes the remembered vote to one issue of one addon', () => {
    expect(voteKey('survivalrp', '7')).toBe('vote:survivalrp:7')
  })
})

describe('votePayload', () => {
  it('builds the JSON the api expects, with the issue as a number', () => {
    expect(JSON.parse(votePayload('survivalrp', '7', 'up'))).toEqual({
      slug: 'survivalrp',
      issue: 7,
      direction: 'up',
    })
  })
})

describe('resolveSubmitName', () => {
  const generate = () => 'Crimson Brave Otter'

  it('keeps a typed name and persists it', () => {
    expect(resolveSubmitName('  Nes  ', null, generate))
      .toEqual({ name: 'Nes', store: true })
  })

  it('reuses the stored pseudonym for a blank field without re-storing', () => {
    expect(resolveSubmitName('', 'Azure Gentle Sofia', generate))
      .toEqual({ name: 'Azure Gentle Sofia', store: false })
  })

  it('mints and persists a pseudonym on the first blank submit', () => {
    expect(resolveSubmitName('   ', null, generate))
      .toEqual({ name: 'Crimson Brave Otter', store: true })
  })

  it('treats an empty stored value as absent', () => {
    expect(resolveSubmitName('', '', generate))
      .toEqual({ name: 'Crimson Brave Otter', store: true })
  })
})

describe('commentPayload', () => {
  it('builds the JSON the api expects, with the issue as a number', () => {
    expect(JSON.parse(commentPayload('survivalrp', '7', 'Nes', 'Same here', ''))).toEqual({
      slug: 'survivalrp',
      issue: 7,
      name: 'Nes',
      body: 'Same here',
      website: '',
    })
  })
})
