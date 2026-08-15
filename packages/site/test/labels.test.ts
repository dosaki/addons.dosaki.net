import { describe, expect, it } from 'vitest'
import { parseLabel, priorityRank, UNPRIORITISED } from '../src/labels.js'

describe('parseLabel', () => {
  it('splits a scoped label into its scope and its value', () => {
    expect(parseLabel('Type:Bug')).toEqual({ scope: 'Type', value: 'Bug' })
  })

  it('leaves an unscoped label whole, with no scope', () => {
    expect(parseLabel('enhancement')).toEqual({ scope: null, value: 'enhancement' })
  })

  it('splits on the first colon only, so a value may contain one', () => {
    expect(parseLabel('Type:Data:Food')).toEqual({ scope: 'Type', value: 'Data:Food' })
  })

  it('tolerates the spacing a human types', () => {
    expect(parseLabel('Priority: High')).toEqual({ scope: 'Priority', value: 'High' })
  })

  it('treats a label with an empty value as unscoped, since there is nothing to show', () => {
    expect(parseLabel('Type:')).toEqual({ scope: null, value: 'Type:' })
  })

  it('treats a leading colon as unscoped rather than inventing a blank scope', () => {
    expect(parseLabel(':Bug')).toEqual({ scope: null, value: ':Bug' })
  })
})

describe('priorityRank', () => {
  it('ranks high above medium above low', () => {
    expect(priorityRank(['Priority:High'])).toBeLessThan(priorityRank(['Priority:Medium']))
    expect(priorityRank(['Priority:Medium'])).toBeLessThan(priorityRank(['Priority:Low']))
  })

  it('ranks anything with a priority above a report with none', () => {
    expect(priorityRank(['Priority:Low'])).toBeLessThan(priorityRank(['Type:Bug']))
  })

  it('gives a report with no labels at all the unprioritised rank', () => {
    expect(priorityRank([])).toBe(UNPRIORITISED)
  })

  it('ignores the case GitHub happens to have stored', () => {
    expect(priorityRank(['priority:high'])).toBe(priorityRank(['Priority:High']))
  })

  it('finds the priority wherever it sits among the other labels', () => {
    expect(priorityRank(['Type:Bug', 'Priority:High'])).toBe(priorityRank(['Priority:High']))
  })

  it('takes the most urgent when a report somehow carries two', () => {
    expect(priorityRank(['Priority:Low', 'Priority:High'])).toBe(priorityRank(['Priority:High']))
  })

  it('ignores a priority value it does not know', () => {
    expect(priorityRank(['Priority:Yesterday'])).toBe(UNPRIORITISED)
  })
})
