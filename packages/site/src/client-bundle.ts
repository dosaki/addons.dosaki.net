import { readFileSync } from 'node:fs'
import { join } from 'node:path'

/**
 * Read at module load, like site-data.json - but NOT allowed to be fatal.
 * A missing client bundle must degrade to the no-JS form, not a dead site.
 */
function read(): string {
  try {
    return readFileSync(join(import.meta.dirname, 'form.js'), 'utf8')
  } catch {
    console.error('client bundle missing; the form will work without JS')
    return '/* not built */'
  }
}

export const clientBundle = read()
