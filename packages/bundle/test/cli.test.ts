import { mkdtempSync, mkdirSync, writeFileSync, copyFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { unzipSync, strFromU8 } from 'fflate'
import { describe, expect, it } from 'vitest'
import { generate } from '../src/cli.js'
import type { FormDefinition, Manifest } from '../src/types.js'

function fakeAddon(): string {
  const root = mkdtempSync(join(tmpdir(), 'addon-'))
  mkdirSync(join(root, 'docs', 'images'), { recursive: true })
  mkdirSync(join(root, '.github', 'ISSUE_TEMPLATE'), { recursive: true })

  writeFileSync(
    join(root, 'README.md'),
    '# Thing\n\nSee [LICENSE](LICENSE).\n\n![shot](./docs/images/shot.png)\n',
  )
  copyFileSync(
    join(import.meta.dirname, 'fixtures', 'transmog-tab-survival-rp.png'),
    join(root, 'docs', 'images', 'shot.png'),
  )
  // Copied in reverse-alphabetical order so the CLI's `.sort()` on the
  // template filenames is actually load-bearing for the assertions below:
  // if it were removed, readdir's own (unspecified, often creation-order)
  // listing would be more likely to come back as ['translation',
  // 'bug_report'] than the alphabetical order the tests expect.
  copyFileSync(
    join(import.meta.dirname, 'fixtures', 'translation.yml'),
    join(root, '.github', 'ISSUE_TEMPLATE', 'translation.yml'),
  )
  copyFileSync(
    join(import.meta.dirname, 'fixtures', 'bug_report.yml'),
    join(root, '.github', 'ISSUE_TEMPLATE', 'bug_report.yml'),
  )
  writeFileSync(join(root, '.github', 'ISSUE_TEMPLATE', 'config.yml'), 'blank_issues_enabled: true\n')
  return root
}

describe('generate', () => {
  it('bundles only the images the README actually references', async () => {
    const root = fakeAddon()
    writeFileSync(join(root, 'docs', 'images', 'orphan.png'), 'not an image')

    const files = unzipSync(
      await generate({
        root,
        slug: 'thing',
        name: 'Thing',
        tagline: 'A thing.',
        version: '1.0.0',
        readmePath: 'README.md',
        templatesDir: '.github/ISSUE_TEMPLATE',
      }),
    )

    expect(Object.keys(files)).toContain('images/shot.webp')
    expect(Object.keys(files)).not.toContain('images/orphan.png')
  }, 30_000)

  it('skips config.yml, which is settings rather than a form', async () => {
    const root = fakeAddon()
    const files = unzipSync(
      await generate({
        root,
        slug: 'thing',
        name: 'Thing',
        tagline: 'A thing.',
        version: '1.0.0',
        readmePath: 'README.md',
        templatesDir: '.github/ISSUE_TEMPLATE',
      }),
    )
    const forms = JSON.parse(strFromU8(files['forms.json']!)) as FormDefinition[]
    // Alphabetical, proving the CLI's `.sort()` ran - see the comment in
    // fakeAddon() about why the fixture files are created out of order.
    expect(forms.map((f) => f.key)).toEqual(['bug_report', 'translation'])
  }, 30_000)

  it('applies the README rewriting on the way in', async () => {
    const root = fakeAddon()
    const files = unzipSync(
      await generate({
        root,
        slug: 'thing',
        name: 'Thing',
        tagline: 'A thing.',
        version: '1.0.0',
        readmePath: 'README.md',
        templatesDir: '.github/ISSUE_TEMPLATE',
      }),
    )
    const readme = strFromU8(files['readme.md']!)
    expect(readme).toContain('![shot](shot.webp)')
    expect(readme).toContain('See LICENSE.')

    const manifest = JSON.parse(strFromU8(files['manifest.json']!)) as Manifest
    expect(manifest.images).toEqual(['shot.webp'])
  }, 30_000)

  it('bundles the addon icon even when the README never shows it', async () => {
    const root = fakeAddon()
    writeFileSync(join(root, 'README.md'), '# Thing\n\nNo icon here.\n')
    writeFileSync(join(root, 'docs', 'icon.svg'), '<svg xmlns="http://www.w3.org/2000/svg"/>')

    const files = unzipSync(
      await generate({
        root,
        slug: 'thing',
        name: 'Thing',
        tagline: 'A thing.',
        version: '1.0.0',
        readmePath: 'README.md',
        templatesDir: '.github/ISSUE_TEMPLATE',
      }),
    )

    expect(Object.keys(files)).toContain('images/icon.svg')
    const manifest = JSON.parse(strFromU8(files['manifest.json']!)) as Manifest
    expect(manifest.icon).toBe('icon.svg')
    expect(manifest.images).toContain('icon.svg')
  }, 30_000)

  it('omits icon from the manifest when the addon has none', async () => {
    const root = fakeAddon()
    writeFileSync(join(root, 'README.md'), '# Thing\n\nNo icon here.\n')

    const files = unzipSync(
      await generate({
        root,
        slug: 'thing',
        name: 'Thing',
        tagline: 'A thing.',
        version: '1.0.0',
        readmePath: 'README.md',
        templatesDir: '.github/ISSUE_TEMPLATE',
      }),
    )
    const manifest = JSON.parse(strFromU8(files['manifest.json']!)) as Manifest
    expect('icon' in manifest).toBe(false)
  }, 30_000)

  it('does not bundle the icon twice when the README does show it', async () => {
    const root = fakeAddon()
    writeFileSync(join(root, 'README.md'), '# Thing\n\n<img src="./docs/icon.svg">\n')
    writeFileSync(join(root, 'docs', 'icon.svg'), '<svg xmlns="http://www.w3.org/2000/svg"/>')

    const files = unzipSync(
      await generate({
        root,
        slug: 'thing',
        name: 'Thing',
        tagline: 'A thing.',
        version: '1.0.0',
        readmePath: 'README.md',
        templatesDir: '.github/ISSUE_TEMPLATE',
      }),
    )
    const manifest = JSON.parse(strFromU8(files['manifest.json']!)) as Manifest
    expect(manifest.images.filter((i) => i === 'icon.svg')).toHaveLength(1)
  }, 30_000)
})
