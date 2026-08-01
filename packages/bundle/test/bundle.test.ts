import { execFileSync } from 'child_process'
import { createHash } from 'crypto'
import { mkdtempSync, rmSync, writeFileSync } from 'fs'
import { join } from 'path'
import { unzipSync, strFromU8 } from 'fflate'
import { describe, expect, it, vi } from 'vitest'
import { buildBundle } from '../src/bundle.js'
import type { FormDefinition, Manifest } from '../src/types.js'

const form: FormDefinition = {
  key: 'bug_report',
  name: 'Bug report',
  description: 'Something is not working',
  labels: ['bug'],
  fields: [{ type: 'input', id: 'what', label: 'What happened?', required: true }],
}

const input = {
  slug: 'survivalrp',
  name: 'SurvivalRP',
  tagline: 'Optional survival mechanics for role-play.',
  version: '1.2.2',
  interfaceVersion: '120007',
  readme: '# SurvivalRP\n\n![DM tab](tab-dm.webp)\n',
  forms: [form],
  images: { 'tab-dm.webp': new Uint8Array([1, 2, 3]) },
}

describe('buildBundle', () => {
  it('writes every entry the site needs', () => {
    const files = unzipSync(buildBundle(input))
    expect(Object.keys(files).sort()).toEqual([
      'forms.json',
      'images/tab-dm.webp',
      'manifest.json',
      'readme.md',
    ])
  })

  it('stamps the schema version, which is the site compatibility seam', () => {
    const files = unzipSync(buildBundle(input))
    const manifest = JSON.parse(strFromU8(files['manifest.json']!)) as Manifest
    expect(manifest.schemaVersion).toBe(1)
    expect(manifest.slug).toBe('survivalrp')
    expect(manifest.version).toBe('1.2.2')
    expect(manifest.interface).toBe('120007')
    expect(manifest.images).toEqual(['tab-dm.webp'])
  })

  it('omits interface when the addon does not supply one', () => {
    const { interfaceVersion, ...rest } = input
    const files = unzipSync(buildBundle(rest))
    const manifest = JSON.parse(strFromU8(files['manifest.json']!)) as Manifest
    expect('interface' in manifest).toBe(false)
  })

  it('round-trips the readme and forms unchanged', () => {
    const files = unzipSync(buildBundle(input))
    expect(strFromU8(files['readme.md']!)).toBe(input.readme)
    expect(JSON.parse(strFromU8(files['forms.json']!))).toEqual([form])
  })

  it('round-trips image bytes exactly', () => {
    const files = unzipSync(buildBundle(input))
    expect([...files['images/tab-dm.webp']!]).toEqual([1, 2, 3])
  })

  it('produces identical bytes when image entry order varies (order-independence)', () => {
    const shuffled = {
      ...input,
      images: { 'z-last.webp': new Uint8Array([9]), 'a-first.webp': new Uint8Array([1]) },
    }
    const ordered = {
      ...input,
      images: { 'a-first.webp': new Uint8Array([1]), 'z-last.webp': new Uint8Array([9]) },
    }
    expect(Buffer.from(buildBundle(shuffled))).toEqual(Buffer.from(buildBundle(ordered)))
  })

  it('produces identical bytes across separate builds, not just back-to-back ones (time-independence)', () => {
    vi.useFakeTimers()
    try {
      vi.setSystemTime(new Date('2020-06-01T10:00:00Z'))
      const first = Buffer.from(buildBundle(input))
      vi.setSystemTime(new Date('2021-11-14T23:45:00Z'))
      const second = Buffer.from(buildBundle(input))
      expect(second).toEqual(first)
    } finally {
      vi.useRealTimers()
    }
  })

  it('produces identical bytes regardless of the build machine timezone', () => {
    const tmpDir = mkdtempSync(join(process.cwd(), '.test-'))
    try {
      const scriptPath = join(tmpDir, 'hash.mts')
      writeFileSync(
        scriptPath,
        `import { createHash } from 'crypto'
import { buildBundle } from '${process.cwd()}/packages/bundle/src/bundle.ts'

const input = {
  slug: 'test',
  name: 'Test',
  tagline: 'Test addon',
  version: '1.0.0',
  readme: 'Test',
  forms: [],
  images: {}
}

const bundle = buildBundle(input)
const hash = createHash('sha256').update(bundle).digest('hex')
console.log(hash)
`,
      )

      const hashUnder = (tz: string): string =>
        execFileSync('sh', ['-c', `npx tsx ${scriptPath}`], {
          cwd: process.cwd(),
          env: { ...process.env, TZ: tz },
          encoding: 'utf8',
        }).trim()

      expect(hashUnder('America/New_York')).toBe(hashUnder('UTC'))
    } finally {
      rmSync(tmpDir, { recursive: true })
    }
  }, 60_000)
})
