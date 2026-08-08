import { readFileSync } from 'node:fs'
import { join } from 'node:path'

/**
 * The site's own logo, used wherever no addon is in scope: the index, the
 * 404, the error pages. Read at module load like the font, and equally NOT
 * allowed to be fatal - without it those pages simply have no favicon and
 * no preview card. Two locations: next to the built module (Lambda, where
 * deploy.yml copies it into the package root) and ../static (the repo
 * layout, which is what tests and local runs see).
 */
function read(): string | null {
  for (const path of [
    join(import.meta.dirname, 'logo.svg'),
    join(import.meta.dirname, '..', 'static', 'logo.svg'),
  ]) {
    try {
      return readFileSync(path, 'utf8')
    } catch {
      // try the next location
    }
  }
  console.error('logo.svg missing; pages with no addon get no favicon or card')
  return null
}

export const siteLogo = read()
