import { priorityRank } from './labels.js'
import { sortByVotes } from './votes.js'
import type { Votable } from './votes.js'

/**
 * How long a closed report stays on the site. A player who reported something
 * should be able to come back and see it was dealt with; after a fortnight the
 * list is better off short.
 */
export const CLOSED_GRACE_MS = 15 * 24 * 60 * 60 * 1000

/** All visibility turns on: the detail page has no tally to hand when it asks. */
export interface Ageing {
  state: string
  /** null while the report is open; an ISO timestamp once it is closed. */
  closedAt: string | null
}

export type Closeable = Ageing & Votable & { labels: string[] }

/**
 * A closed report with no readable close time cannot be aged out, so it is
 * hidden rather than shown forever - the failure this window exists to avoid.
 */
export function isVisible(report: Ageing, now: number): boolean {
  if (report.state !== 'closed') return true
  if (report.closedAt === null) return false
  const closed = Date.parse(report.closedAt)
  return !Number.isNaN(closed) && now - closed <= CLOSED_GRACE_MS
}

/**
 * Priority bands first, net votes within each. Sorting by votes and THEN
 * stably by rank is what layers the two: Array#sort is stable, so the vote
 * order survives inside every band without restating its tie-breaking here.
 */
function banded<T extends Closeable>(group: T[]): T[] {
  return sortByVotes(group).sort((a, b) => priorityRank(a.labels) - priorityRank(b.labels))
}

/**
 * Open reports first, closed ones below: what is still actionable leads, and a
 * closed report keeping a high slot on its old votes - or its old priority -
 * would read as a live one.
 */
export function visibleReports<T extends Closeable>(reports: T[], now: number): T[] {
  const shown = reports.filter((r) => isVisible(r, now))
  return [
    ...banded(shown.filter((r) => r.state !== 'closed')),
    ...banded(shown.filter((r) => r.state === 'closed')),
  ]
}
