import { describe, expect, it } from 'vitest'
import { parseAddonsYml } from '../../../scripts/bake.js'

describe('parseAddonsYml', () => {
  it('reads slug and repo pairs', () => {
    expect(parseAddonsYml('addons:\n  - slug: survivalrp\n    repo: dosaki/survivalrp\n'))
      .toEqual([{ slug: 'survivalrp', repo: 'dosaki/survivalrp' }])
  })

  it('refuses an entry missing its repo', () => {
    expect(() => parseAddonsYml('addons:\n  - slug: x\n')).toThrow(/repo/)
  })

  it('refuses a file with no addons list', () => {
    expect(() => parseAddonsYml('nope: true\n')).toThrow(/addons/)
  })
})
