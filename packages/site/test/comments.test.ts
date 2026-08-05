import { describe, expect, it } from 'vitest'
import {
  commentBody,
  displayName,
  parseCommentRequest,
  validateComment,
} from '../src/comments.js'
import { MAX_FIELD_CHARS, reporterName, stripFooter } from '../src/issue.js'

describe('parseCommentRequest', () => {
  it('reads a JSON body from the island', () => {
    const body = JSON.stringify({
      slug: 'a', issue: 7, name: 'Nesingwary', body: 'Same here', website: '',
    })
    expect(parseCommentRequest('application/json', body, false)).toEqual({
      slug: 'a', issue: 7, name: 'Nesingwary', body: 'Same here', website: '',
    })
  })

  it('reads a form-encoded body from a no-JS post', () => {
    const body = 'slug=a&issue=7&reporter-name=Nes&body=Same+here&website='
    expect(parseCommentRequest('application/x-www-form-urlencoded', body, false)).toEqual({
      slug: 'a', issue: 7, name: 'Nes', body: 'Same here', website: '',
    })
  })

  it('decodes a base64 body, which the Function URL may deliver', () => {
    const raw = 'slug=a&issue=7&body=x'
    const req = parseCommentRequest(
      'application/x-www-form-urlencoded', Buffer.from(raw).toString('base64'), true,
    )
    expect(req.slug).toBe('a')
    expect(req.name).toBe('')
  })

  it('rejects a missing slug', () => {
    expect(() => parseCommentRequest('application/json', JSON.stringify({ issue: 7 }), false))
      .toThrow('slug is required')
  })

  it.each(['0', '-1', '1.5', 'abc', ''])('rejects issue %j', (issue) => {
    const body = `slug=a&issue=${issue}&body=x`
    expect(() => parseCommentRequest('application/x-www-form-urlencoded', body, false)).toThrow()
  })

  it('rejects a non-integer JSON issue', () => {
    const body = JSON.stringify({ slug: 'a', issue: 1.5, body: 'x' })
    expect(() => parseCommentRequest('application/json', body, false)).toThrow()
  })

  it('throws on a body that is neither encoding', () => {
    expect(() => parseCommentRequest('text/plain', 'nonsense', false)).toThrow()
  })
})

describe('validateComment', () => {
  it('requires a non-blank reply', () => {
    expect(validateComment('   ', '')).toEqual(['Reply is required'])
  })

  it('bounds the reply length', () => {
    expect(validateComment('x'.repeat(MAX_FIELD_CHARS + 1), ''))
      .toEqual([`Reply is too long (limit ${MAX_FIELD_CHARS} characters)`])
  })

  it('bounds the name length', () => {
    expect(validateComment('fine', 'n'.repeat(81)))
      .toEqual(['Name is too long (limit 80 characters)'])
  })

  it('accepts a normal reply', () => {
    expect(validateComment('Same here', 'Nes')).toEqual([])
  })
})

describe('commentBody', () => {
  it('appends the credit footer and round-trips through the strippers', () => {
    const body = commentBody('  Same here\n\nOn 1.2.2  ', 'Crimson Brave Otter')
    expect(body).toBe('Same here\n\nOn 1.2.2\n\n_Filed via addons.dosaki.net by Crimson Brave Otter_\n')
    expect(reporterName(body)).toBe('Crimson Brave Otter')
    expect(stripFooter(body)).toBe('Same here\n\nOn 1.2.2')
  })

  it('trims the credited name before it enters the footer', () => {
    const body = commentBody('Same here', '  Nes  ')
    expect(reporterName(body)).toBe('Nes')
  })
})

describe('displayName', () => {
  it('prefers the footer credit over the posting account', () => {
    const body = commentBody('Same here', 'Crimson Brave Otter')
    expect(displayName(body, 'addons-dosaki-net[bot]')).toBe('Crimson Brave Otter')
  })

  it('falls back to the author when there is no footer', () => {
    expect(displayName('Fixed in next release.', 'dosaki')).toBe('dosaki')
  })
})
