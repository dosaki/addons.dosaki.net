import { build } from 'esbuild'
import { describe, expect, it } from 'vitest'

describe('the Lambda bundle', () => {
  it('never pulls in sharp, which cannot be bundled', async () => {
    // deploy.yml esbuilds index.ts into a single ESM file. sharp is a native
    // binary: if anything in this graph ever imports og.ts, the deploy
    // produces an artefact that dies at cold start and every route 502s.
    // This is the only place that invariant is enforced.
    const result = await build({
      entryPoints: ['packages/site/src/index.ts'],
      bundle: true,
      platform: 'node',
      target: 'node22',
      format: 'esm',
      write: false,
      metafile: true,
      logLevel: 'silent',
    })

    const offenders = Object.keys(result.metafile.inputs).filter((p) =>
      p.includes('node_modules/sharp'),
    )
    expect(offenders).toEqual([])
  }, 30_000)
})
