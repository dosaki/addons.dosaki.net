import { describe, expect, it } from 'vitest'
import { applyVote, makeListCache, parseVoteRequest, parseVotes, sortByVotes } from '../src/votes.js'

describe('parseVotes', () => {
  it('reads the tally line wherever it sits in the body', () => {
    expect(parseVotes('Some report\n\n**Votes:** 3👍 / 1👎')).toEqual({ up: 3, down: 1 })
  })

  it('treats a body without the line as zero votes', () => {
    expect(parseVotes('Just a report body')).toEqual({ up: 0, down: 0 })
  })

  it('treats a null body as zero votes, as GitHub delivers for empty issues', () => {
    expect(parseVotes(null)).toEqual({ up: 0, down: 0 })
  })

  it('ignores lookalike prose that is not alone on its line', () => {
    expect(parseVotes('Please add **Votes:** 3👍 / 1👎 counters to my addon')).toEqual({
      up: 0,
      down: 0,
    })
  })
})

describe('applyVote', () => {
  it('appends the tally line to a body that has none', () => {
    expect(applyVote('A report', 'up')).toBe('A report\n\n**Votes:** 1👍 / 0👎')
  })

  it('starts from an empty body without leading blank lines', () => {
    expect(applyVote(null, 'down')).toBe('**Votes:** 0👍 / 1👎')
  })

  it('edits an existing tally line in place', () => {
    expect(applyVote('Report\n\n**Votes:** 3👍 / 1👎', 'down')).toBe(
      'Report\n\n**Votes:** 3👍 / 2👎',
    )
  })

  it('leaves the rest of the body byte-for-byte untouched', () => {
    const body = '### What happened\n\nIt  broke\t badly\n\n**Votes:** 0👍 / 0👎\n\n_Filed via addons.dosaki.net_'
    expect(applyVote(body, 'up')).toBe(
      '### What happened\n\nIt  broke\t badly\n\n**Votes:** 1👍 / 0👎\n\n_Filed via addons.dosaki.net_',
    )
  })
})

describe('parseVoteRequest', () => {
  const good = JSON.stringify({ slug: 'survivalrp', issue: 7, direction: 'up' })

  it('reads a JSON vote', () => {
    expect(parseVoteRequest('application/json', good, false)).toEqual({
      slug: 'survivalrp',
      issue: 7,
      direction: 'up',
    })
  })

  it('decodes a base64 body, which the Function URL may deliver', () => {
    expect(parseVoteRequest('application/json', Buffer.from(good).toString('base64'), true).issue)
      .toBe(7)
  })

  it('rejects a non-JSON content type - voting is JS-only by design', () => {
    expect(() => parseVoteRequest('application/x-www-form-urlencoded', 'slug=a', false)).toThrow()
  })

  it('rejects a direction that is neither up nor down', () => {
    const bad = JSON.stringify({ slug: 'a', issue: 7, direction: 'sideways' })
    expect(() => parseVoteRequest('application/json', bad, false)).toThrow()
  })

  it('rejects an issue number that is not a positive integer', () => {
    for (const issue of [0, -1, 1.5, '7', undefined]) {
      const bad = JSON.stringify({ slug: 'a', issue, direction: 'up' })
      expect(() => parseVoteRequest('application/json', bad, false)).toThrow()
    }
  })
})

describe('makeListCache', () => {
  it('returns what was stored while it is fresh', () => {
    const cache = makeListCache<string>(60_000)
    cache.set('dosaki/x', 'issues', 1_000)
    expect(cache.get('dosaki/x', 30_000)).toBe('issues')
  })

  it('expires an entry past its ttl', () => {
    const cache = makeListCache<string>(60_000)
    cache.set('dosaki/x', 'issues', 1_000)
    expect(cache.get('dosaki/x', 61_001)).toBeNull()
  })

  it('forgets an invalidated repo so a fresh vote shows at once', () => {
    const cache = makeListCache<string>(60_000)
    cache.set('dosaki/x', 'issues', 1_000)
    cache.invalidate('dosaki/x')
    expect(cache.get('dosaki/x', 1_001)).toBeNull()
  })

  it('keeps repos apart', () => {
    const cache = makeListCache<string>(60_000)
    cache.set('dosaki/x', 'xs', 1_000)
    expect(cache.get('dosaki/y', 1_001)).toBeNull()
  })
})

describe('sortByVotes', () => {
  it('orders by net votes, ties broken by newest first', () => {
    const list = [
      { number: 1, up: 1, down: 0, createdAt: '2026-01-01T00:00:00Z' },
      { number: 2, up: 5, down: 1, createdAt: '2026-02-01T00:00:00Z' },
      { number: 3, up: 2, down: 1, createdAt: '2026-03-01T00:00:00Z' },
      { number: 4, up: 0, down: 0, createdAt: '2026-04-01T00:00:00Z' },
    ]
    expect(sortByVotes(list).map((i) => i.number)).toEqual([2, 3, 1, 4])
  })

  it('does not mutate its input', () => {
    const list = [
      { number: 1, up: 0, down: 0, createdAt: '2026-01-01T00:00:00Z' },
      { number: 2, up: 1, down: 0, createdAt: '2026-01-02T00:00:00Z' },
    ]
    sortByVotes(list)
    expect(list.map((i) => i.number)).toEqual([1, 2])
  })
})
