import { readFileSync, readdirSync, writeFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import { buildBundle } from './bundle.js'
import { parseForm } from './forms.js'
import { optimiseImage } from './images.js'
import { rewriteReadme } from './readme.js'
import type { FormDefinition } from './types.js'

export interface GenerateOptions {
  root: string
  slug: string
  name: string
  tagline: string
  version: string
  interfaceVersion?: string
  readmePath: string
  templatesDir: string
}

/** `config.yml` configures the chooser; it is not a form. */
const NOT_A_FORM = new Set(['config.yml', 'config.yaml'])

/** Addons keep their icon here by convention, whether or not the README shows it. */
const ICON_PATH = 'docs/icon.svg'
const ICON_KEY = 'icon.svg'

/**
 * Public site origin; image URLs in the paste-ready README point here. Also
 * hardcoded as SITE_ORIGIN in packages/site/src/meta.ts. The duplication is
 * deliberate: this package is a standalone tool that must not import from
 * packages/site.
 */
const SITE_BASE = 'https://addons.dosaki.net'

export interface GenerateResult {
  /** The site bundle (manifest, readme, forms, images). */
  zip: Uint8Array
  /** README with absolute /latest/ image URLs, for pasting onto addon pages. */
  externalReadme: string
}

export async function generate(options: GenerateOptions): Promise<GenerateResult> {
  const readmeSource = readFileSync(join(options.root, options.readmePath), 'utf8')
  const { markdown, images, flattenedLinks } = rewriteReadme(readmeSource)
  const { markdown: externalReadme } = rewriteReadme(readmeSource, {
    imageBase: `${SITE_BASE}/assets/${options.slug}/latest/`,
  })

  const forms: FormDefinition[] = readdirSync(join(options.root, options.templatesDir))
    .filter((file) => /\.ya?ml$/i.test(file) && !NOT_A_FORM.has(file.toLowerCase()))
    .sort()
    .map((file) => {
      const source = readFileSync(join(options.root, options.templatesDir, file), 'utf8')
      return parseForm(file.replace(/\.ya?ml$/i, ''), source)
    })

  const encoded: Record<string, Uint8Array> = {}
  for (const [path, key] of images) {
    encoded[key] = await optimiseImage(key, readFileSync(join(options.root, path)))
  }

  let icon: string | undefined
  const iconFile = join(options.root, ICON_PATH)
  if (existsSync(iconFile)) {
    icon = ICON_KEY
    // May already be present if the README references it; encoding is idempotent.
    encoded[ICON_KEY] ??= await optimiseImage(ICON_KEY, readFileSync(iconFile))
  }

  if (flattenedLinks.length > 0) {
    console.log(`Flattened ${flattenedLinks.length} repo-relative link(s): ${flattenedLinks.join(', ')}`)
  }
  console.log(`Bundled ${forms.length} form(s) and ${Object.keys(encoded).length} image(s).`)

  const zip = buildBundle({
    slug: options.slug,
    name: options.name,
    tagline: options.tagline,
    version: options.version,
    interfaceVersion: options.interfaceVersion,
    icon,
    readme: markdown,
    forms,
    images: encoded,
  })

  return { zip, externalReadme }
}

function required(key: string): string {
  const value = process.env[`INPUT_${key}`]
  if (value === undefined || value === '') throw new Error(`Missing input: ${key}`)
  return value
}

function optional(key: string, fallback: string): string {
  const value = process.env[`INPUT_${key}`]
  return value === undefined || value === '' ? fallback : value
}

async function main(): Promise<void> {
  const out = optional('OUT', 'site-bundle.zip')
  const readmeOut = optional('README_OUT', 'site-readme.md')
  const { zip, externalReadme } = await generate({
    root: process.env['GITHUB_WORKSPACE'] ?? process.cwd(),
    slug: required('SLUG'),
    name: required('NAME'),
    tagline: required('TAGLINE'),
    version: required('VERSION'),
    interfaceVersion: process.env['INPUT_INTERFACE'] || undefined,
    readmePath: optional('README', 'README.md'),
    templatesDir: optional('TEMPLATES_DIR', '.github/ISSUE_TEMPLATE'),
  })
  writeFileSync(out, zip)
  writeFileSync(readmeOut, externalReadme)
  console.log(`Wrote ${out} (${Math.round(zip.byteLength / 1024)} KB) and ${readmeOut}`)
}

if (process.argv[1]?.endsWith('cli.ts') || process.argv[1]?.endsWith('cli.js')) {
  main().catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : String(error))
    process.exit(1)
  })
}
