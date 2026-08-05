import { randomReporterName } from '../src/names.js'

const NAME_KEY = 'reporter-name'

/** Pure, so it is testable without a DOM. */
export function resolveSubmitName(
  typed: string,
  stored: string | null,
  generate: () => string,
): { name: string; store: boolean } {
  const trimmed = typed.trim()
  if (trimmed !== '') return { name: trimmed, store: true }
  if (stored !== null && stored !== '') return { name: stored, store: false }
  return { name: generate(), store: true }
}

/** localStorage throws in some private modes; the form must still submit. */
function storedName(): string | null {
  try {
    return localStorage.getItem(NAME_KEY)
  } catch {
    return null
  }
}

function saveName(name: string): void {
  try {
    localStorage.setItem(NAME_KEY, name)
  } catch {
    // Pre-fill is a convenience; losing it just means a fresh pseudonym next time.
  }
}

/** Pre-fill every name field on the page with the remembered name. */
export function prefillName(): void {
  const stored = storedName()
  if (stored === null || stored === '') return
  document.querySelectorAll<HTMLInputElement>('input[name="reporter-name"]').forEach((el) => {
    if (el.value === '') el.value = stored
  })
}

/**
 * At submit: make sure the field carries a name, minting the stable pseudonym
 * on the first blank submit. Mutates the input so FormData sees the result.
 */
export function ensureName(form: HTMLFormElement): void {
  const input = form.elements.namedItem('reporter-name')
  if (!(input instanceof HTMLInputElement)) return
  const { name, store } = resolveSubmitName(input.value, storedName(), randomReporterName)
  input.value = name
  if (store) saveName(name)
}
