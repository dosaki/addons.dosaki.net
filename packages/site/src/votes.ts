/**
 * Votes live as one visible line inside the GitHub issue body itself - the
 * agreed storage, so the site needs no database. The line must be alone on
 * its line so prose that merely mentions the format is never mistaken for it.
 */
const TALLY = /^\*\*Votes:\*\* (\d+)👍 \/ (\d+)👎$/m

export type Direction = 'up' | 'down'

export interface Tally {
  up: number
  down: number
}

export function parseVotes(body: string | null): Tally {
  const match = TALLY.exec(body ?? '')
  if (match === null) return { up: 0, down: 0 }
  return { up: Number(match[1]), down: Number(match[2]) }
}

function line(tally: Tally): string {
  return `**Votes:** ${tally.up}👍 / ${tally.down}👎`
}

export function applyVote(body: string | null, direction: Direction): string {
  const bumped = parseVotes(body)
  if (direction === 'up') bumped.up += 1
  else bumped.down += 1

  const current = body ?? ''
  if (TALLY.test(current)) return current.replace(TALLY, line(bumped))
  return current === '' ? line(bumped) : `${current}\n\n${line(bumped)}`
}

/** For display: the tally is machinery, shown as the vote widget instead. */
export function stripVotesLine(body: string): string {
  if (!TALLY.test(body)) return body
  return body.replace(TALLY, '').replace(/\n{3,}/g, '\n\n').replace(/\n+$/, '')
}

export interface VoteRequest {
  slug: string
  issue: number
  direction: Direction
}

/**
 * JSON only, unlike the report submission: a plain form POST cannot carry the
 * x-amz-content-sha256 hash CloudFront's OAC signature requires, so no
 * form-encoded vote can ever reach this Lambda anyway.
 */
export function parseVoteRequest(
  contentType: string | undefined,
  body: string,
  isBase64: boolean,
): VoteRequest {
  if (!(contentType ?? '').toLowerCase().includes('application/json')) {
    throw new Error(`unsupported content-type: ${contentType ?? '(none)'}`)
  }
  const raw = isBase64 ? Buffer.from(body, 'base64').toString('utf8') : body
  const parsed = JSON.parse(raw) as Partial<VoteRequest>

  if (typeof parsed.slug !== 'string' || parsed.slug === '') throw new Error('slug is required')
  if (typeof parsed.issue !== 'number' || !Number.isInteger(parsed.issue) || parsed.issue < 1) {
    throw new Error('issue must be a positive integer')
  }
  if (parsed.direction !== 'up' && parsed.direction !== 'down') {
    throw new Error('direction must be up or down')
  }
  return { slug: parsed.slug, issue: parsed.issue, direction: parsed.direction }
}

export interface ListCache<T> {
  get(repo: string, now: number): T | null
  set(repo: string, value: T, now: number): void
  invalidate(repo: string): void
}

/** Per-repo TTL cache; a vote invalidates its repo so the new count shows at once. */
export function makeListCache<T>(ttlMs: number): ListCache<T> {
  const entries = new Map<string, { value: T; at: number }>()
  return {
    get(repo, now) {
      const entry = entries.get(repo)
      if (entry === undefined || now - entry.at > ttlMs) return null
      return entry.value
    },
    set(repo, value, now) {
      entries.set(repo, { value, at: now })
    },
    invalidate(repo) {
      entries.delete(repo)
    },
  }
}

export interface Votable {
  up: number
  down: number
  createdAt: string
}

/** Net votes first; among equals the newest report leads. */
export function sortByVotes<T extends Votable>(issues: T[]): T[] {
  return [...issues].sort(
    (a, b) => b.up - b.down - (a.up - a.down) || b.createdAt.localeCompare(a.createdAt),
  )
}
