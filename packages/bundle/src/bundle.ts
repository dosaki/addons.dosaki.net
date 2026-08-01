import { strToU8, zipSync } from 'fflate'
import type { FormDefinition, Manifest } from './types.js'

export interface BundleInput {
  slug: string
  name: string
  tagline: string
  version: string
  interfaceVersion?: string
  icon?: string
  readme: string
  forms: FormDefinition[]
  images: Record<string, Uint8Array>
}

export function buildBundle(input: BundleInput): Uint8Array {
  const manifest: Manifest = {
    schemaVersion: 1,
    slug: input.slug,
    name: input.name,
    tagline: input.tagline,
    version: input.version,
    images: Object.keys(input.images).sort(),
  }
  if (input.interfaceVersion !== undefined) manifest.interface = input.interfaceVersion
  if (input.icon !== undefined) manifest.icon = input.icon

  const files: Record<string, Uint8Array> = {
    'manifest.json': strToU8(`${JSON.stringify(manifest, null, 2)}\n`),
    'readme.md': strToU8(input.readme),
    'forms.json': strToU8(`${JSON.stringify(input.forms, null, 2)}\n`),
  }
  for (const key of Object.keys(input.images).sort()) {
    files[`images/${key}`] = input.images[key]!
  }

  return zipSync(files, { level: 9, mtime: new Date(1980, 0, 1) })
}
