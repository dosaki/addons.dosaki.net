import { describe, expect, it } from 'vitest'
import { NAME_MAX } from '../src/issue.js'
import { creditName, randomReporterName } from '../src/names.js'

describe('randomReporterName', () => {
  it('produces a capitalized multi-word name that fits the name limit', () => {
    for (let i = 0; i < 50; i += 1) {
      const name = randomReporterName()
      const words = name.split(' ')
      expect(words.length).toBeGreaterThanOrEqual(3)
      expect(name.length).toBeLessThanOrEqual(NAME_MAX)
      expect(name).toMatch(/^[A-Z]/)
      for (const word of words) expect(word).not.toBe('')
    }
  })

  it('varies from call to call', () => {
    const seen = new Set(Array.from({ length: 20 }, () => randomReporterName()))
    expect(seen.size).toBeGreaterThan(1)
  })
})

describe('creditName', () => {
  it('keeps a typed name, trimmed', () => {
    expect(creditName('  Nesingwary  ')).toBe('Nesingwary')
  })

  it('generates a pseudonym for a blank name', () => {
    const name = creditName('   ')
    expect(name).not.toBe('')
    expect(name.split(' ').length).toBeGreaterThanOrEqual(3)
  })
})
