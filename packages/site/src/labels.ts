/**
 * Labels are scoped by convention - "Type:Bug", "Priority:High" - so the site
 * can show the scope as its own segment and rank by priority. An unscoped
 * label is still perfectly valid; it simply renders whole.
 */
export interface Label {
  scope: string | null
  value: string
}

/**
 * Splits on the FIRST colon only: "Type:Data:Food" is the Data:Food value of
 * the Type scope, not a nested scope. A label with nothing either side of the
 * colon is not scoped - there would be no segment to show.
 */
export function parseLabel(name: string): Label {
  const at = name.indexOf(':')
  if (at === -1) return { scope: null, value: name }

  const scope = name.slice(0, at).trim()
  const value = name.slice(at + 1).trim()
  if (scope === '' || value === '') return { scope: null, value: name }
  return { scope, value }
}

/** Most urgent first; the rank IS the sort key, so lower means higher up. */
const PRIORITIES = ['high', 'medium', 'low']

/** Sorts below every known priority, so unlabelled reports fall to the back. */
export const UNPRIORITISED = PRIORITIES.length

/**
 * The most urgent priority a report carries, as a sort key. A value outside
 * the known set is ignored rather than guessed at - the developer may label
 * for their own reasons, and a stray label should not reorder the page.
 */
export function priorityRank(labels: string[]): number {
  let rank = UNPRIORITISED
  for (const name of labels) {
    const label = parseLabel(name)
    if (label.scope?.toLowerCase() !== 'priority') continue
    const found = PRIORITIES.indexOf(label.value.toLowerCase())
    if (found !== -1 && found < rank) rank = found
  }
  return rank
}
