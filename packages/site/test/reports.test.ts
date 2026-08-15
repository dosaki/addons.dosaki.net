import { describe, expect, it } from 'vitest'
import { CLOSED_GRACE_MS, isVisible, visibleReports } from '../src/reports.js'
import type { Closeable } from '../src/reports.js'

const NOW = Date.parse('2026-03-20T12:00:00Z')

function at(offsetMs: number): string {
  return new Date(NOW - offsetMs).toISOString()
}

function report(over: Partial<Closeable> = {}): Closeable {
  return {
    state: 'open',
    closedAt: null as string | null,
    up: 0,
    down: 0,
    createdAt: at(0),
    labels: [] as string[],
    ...over,
  }
}

describe('CLOSED_GRACE_MS', () => {
  it('is fifteen days', () => {
    expect(CLOSED_GRACE_MS).toBe(15 * 24 * 60 * 60 * 1000)
  })
})

describe('isVisible', () => {
  it('shows an open report', () => {
    expect(isVisible(report(), NOW)).toBe(true)
  })

  it('shows a report closed yesterday', () => {
    expect(isVisible(report({ state: 'closed', closedAt: at(24 * 60 * 60 * 1000) }), NOW)).toBe(true)
  })

  it('still shows a report closed exactly fifteen days ago', () => {
    expect(isVisible(report({ state: 'closed', closedAt: at(CLOSED_GRACE_MS) }), NOW)).toBe(true)
  })

  it('hides a report one millisecond past the window', () => {
    expect(isVisible(report({ state: 'closed', closedAt: at(CLOSED_GRACE_MS + 1) }), NOW)).toBe(false)
  })

  it('hides a closed report GitHub gave no close time for, rather than showing it forever', () => {
    expect(isVisible(report({ state: 'closed', closedAt: null }), NOW)).toBe(false)
  })

  it('hides a closed report whose close time is unreadable', () => {
    expect(isVisible(report({ state: 'closed', closedAt: 'not a date' }), NOW)).toBe(false)
  })

  it('shows an open report even if it somehow carries a close time', () => {
    expect(isVisible(report({ state: 'open', closedAt: at(CLOSED_GRACE_MS * 2) }), NOW)).toBe(true)
  })
})

describe('visibleReports', () => {
  it('drops the ones past the window', () => {
    const kept = report({ state: 'closed', closedAt: at(0), up: 1 })
    const gone = report({ state: 'closed', closedAt: at(CLOSED_GRACE_MS + 1), up: 9 })
    expect(visibleReports([gone, kept], NOW)).toEqual([kept])
  })

  it('puts every open report above every closed one, however popular the closed one is', () => {
    const closed = report({ state: 'closed', closedAt: at(0), up: 99, createdAt: at(0) })
    const open = report({ up: 0, createdAt: at(0) })
    expect(visibleReports([closed, open], NOW)).toEqual([open, closed])
  })

  it('keeps net-vote order within the open group', () => {
    const quiet = report({ up: 1, down: 0, createdAt: at(0) })
    const loud = report({ up: 5, down: 0, createdAt: at(0) })
    expect(visibleReports([quiet, loud], NOW)).toEqual([loud, quiet])
  })

  it('keeps net-vote order within the closed group', () => {
    const quiet = report({ state: 'closed', closedAt: at(0), up: 1, createdAt: at(0) })
    const loud = report({ state: 'closed', closedAt: at(0), up: 5, createdAt: at(0) })
    expect(visibleReports([quiet, loud], NOW)).toEqual([loud, quiet])
  })

  it('leaves the caller\'s array alone', () => {
    const input = [report({ up: 1 }), report({ up: 5 })]
    const copy = [...input]
    visibleReports(input, NOW)
    expect(input).toEqual(copy)
  })
})

describe('visibleReports priority banding', () => {
  it('puts a high-priority report above a more-voted unprioritised one', () => {
    const urgent = report({ up: 0, labels: ['Priority:High'] })
    const popular = report({ up: 50 })
    expect(visibleReports([popular, urgent], NOW)).toEqual([urgent, popular])
  })

  it('orders the priority bands high, medium, low, none', () => {
    const high = report({ labels: ['Priority:High'] })
    const medium = report({ labels: ['Priority:Medium'] })
    const low = report({ labels: ['Priority:Low'] })
    const none = report({ labels: ['Type:Bug'] })
    expect(visibleReports([none, low, medium, high], NOW)).toEqual([high, medium, low, none])
  })

  it('keeps net-vote order inside a band', () => {
    const quiet = report({ up: 1, labels: ['Priority:High'] })
    const loud = report({ up: 5, labels: ['Priority:High'] })
    expect(visibleReports([quiet, loud], NOW)).toEqual([loud, quiet])
  })

  it('never lifts a closed report above an open one, however urgent', () => {
    const urgent = report({ state: 'closed', closedAt: at(0), labels: ['Priority:High'] })
    const open = report({ labels: [] })
    expect(visibleReports([urgent, open], NOW)).toEqual([open, urgent])
  })

  it('bands the closed group by priority too', () => {
    const high = report({ state: 'closed', closedAt: at(0), labels: ['Priority:High'] })
    const none = report({ state: 'closed', closedAt: at(0), up: 30 })
    expect(visibleReports([none, high], NOW)).toEqual([high, none])
  })
})
