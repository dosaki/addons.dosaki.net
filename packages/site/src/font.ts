import { readFileSync } from 'node:fs'
import { join } from 'node:path'

/**
 * Read at module load, like the client bundle - and equally NOT allowed to
 * be fatal. A missing font degrades to the CSS serif fallback stack, not a
 * dead site. Two locations: next to the built module (Lambda, where
 * deploy.yml copies it into the package root) and ../static (repo layout,
 * which is what tests and local runs see).
 */
function read(): string | null {
  for (const path of [
    join(import.meta.dirname, 'marcellus-latin.woff2'),
    join(import.meta.dirname, '..', 'static', 'marcellus-latin.woff2'),
  ]) {
    try {
      return readFileSync(path).toString('base64')
    } catch {
      // try the next location
    }
  }
  console.error('marcellus-latin.woff2 missing; headings fall back to serif')
  return null
}

export const marcellusFont = read()
