import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { strToU8, zipSync } from 'fflate'
import { describe, expect, it } from 'vitest'
import { buildSite, loadBundle } from '../src/build.js'

const readme = readFileSync(
  join(import.meta.dirname, 'fixtures', 'survivalrp-readme.md'),
  'utf8',
)

function bundle(over: Record<string, unknown> = {}): Uint8Array {
  const manifest = {
    schemaVersion: 1,
    slug: 'survivalrp',
    name: 'SurvivalRP',
    tagline: 'Optional survival mechanics for role-play.',
    version: '1.2.2',
    icon: 'icon.svg',
    images: ['icon.svg', 'tab-dm.webp'],
    ...over,
  }
  return zipSync({
    'manifest.json': strToU8(JSON.stringify(manifest)),
    'readme.md': strToU8(readme),
    'forms.json': strToU8('[]'),
    'images/icon.svg': strToU8('<svg/>'),
    'images/tab-dm.webp': new Uint8Array([1, 2, 3]),
  })
}

describe('loadBundle', () => {
  it('reads the manifest into a page', () => {
    const page = loadBundle('survivalrp', bundle())
    expect(page.name).toBe('SurvivalRP')
    expect(page.version).toBe('1.2.2')
    expect(page.icon).toBe('icon.svg')
  })

  it('renders the readme and collects headings', () => {
    const page = loadBundle('survivalrp', bundle())
    expect(page.html).toContain('<h2')
    expect(page.headings.length).toBeGreaterThanOrEqual(6)
  })

  it('exposes every image as an asset keyed by bundle key', () => {
    const page = loadBundle('survivalrp', bundle())
    expect([...page.assets.get('tab-dm.webp')!]).toEqual([1, 2, 3])
    expect(page.assets.has('icon.svg')).toBe(true)
  })

  it('refuses a schemaVersion it does not understand', () => {
    expect(() => loadBundle('survivalrp', bundle({ schemaVersion: 99 })))
      .toThrow(/schemaVersion 99/)
  })

  it('refuses a bundle with no manifest', () => {
    const empty = zipSync({ 'readme.md': strToU8('# x') })
    expect(() => loadBundle('survivalrp', empty)).toThrow(/manifest/)
  })

  it('trusts the caller-supplied slug over the manifest', () => {
    const page = loadBundle('renamed', bundle())
    expect(page.slug).toBe('renamed')
  })

  it('refuses a slug that would produce a malformed URL', () => {
    expect(() => loadBundle('has space', bundle())).toThrow(/not URL-safe/)
    expect(() => loadBundle('../etc', bundle())).toThrow(/not URL-safe/)
  })

  it('refuses a version that would produce a malformed URL', () => {
    expect(() => loadBundle('survivalrp', bundle({ version: '1.0 beta' }))).toThrow(/not URL-safe/)
  })
})

describe('buildSite', () => {
  it('includes an addon that loads', () => {
    const site = buildSite([{ slug: 'survivalrp', zip: bundle() }])
    expect(site.addons.map((a) => a.slug)).toEqual(['survivalrp'])
    expect(site.unavailable).toEqual([])
  })

  it('skips a broken addon instead of failing the whole site', () => {
    const site = buildSite([
      { slug: 'survivalrp', zip: bundle() },
      { slug: 'broken', zip: zipSync({ 'nope.txt': strToU8('x') }) },
    ])
    expect(site.addons.map((a) => a.slug)).toEqual(['survivalrp'])
    expect(site.unavailable).toEqual(['broken'])
  })

  it('marks an addon whose bundle could not be fetched at all', () => {
    const site = buildSite([{ slug: 'offline', zip: null }])
    expect(site.addons).toEqual([])
    expect(site.unavailable).toEqual(['offline'])
  })

  it('marks an addon with a bad slug unavailable rather than failing the site', () => {
    const site = buildSite([{ slug: 'bad slug', zip: bundle() }])
    expect(site.addons).toEqual([])
    expect(site.unavailable).toEqual(['bad slug'])
  })
})
