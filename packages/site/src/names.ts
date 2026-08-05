import { adjectives, animals, colors, names, uniqueNamesGenerator } from 'unique-names-generator'

/**
 * Color + adjective + (animal | human name), e.g. "Crimson Brave Otter" or
 * "Azure Gentle Sofia". Word order is fixed; the third dictionary is chosen
 * per call so both kinds of pseudonym show up in the wild.
 */
export function randomReporterName(): string {
  return uniqueNamesGenerator({
    dictionaries: [colors, adjectives, Math.random() < 0.5 ? animals : names],
    separator: ' ',
    style: 'capital',
  })
}

/** The name a submission is credited as: the typed one, or a fresh pseudonym. */
export function creditName(raw: string): string {
  const trimmed = raw.trim()
  return trimmed === '' ? randomReporterName() : trimmed
}
