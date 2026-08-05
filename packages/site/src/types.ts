import type { FormDefinition } from '../../bundle/src/types.js'

export type { FormDefinition, FormField, FieldType, CheckboxOption } from '../../bundle/src/types.js'

export interface Heading {
  id: string
  text: string
}

export interface Rendered {
  html: string
  headings: Heading[]
}

export interface AddonPage {
  slug: string
  name: string
  tagline: string
  version: string
  /** Bundle key of the icon, if the addon has one. */
  icon?: string
  html: string
  headings: Heading[]
  /** Issue templates the addon publishes, rendered as forms at /:slug/report. */
  forms: FormDefinition[]
  /** Bundle key -> raw bytes, served from /assets/:slug/:version/:key */
  assets: Map<string, Uint8Array>
}

export interface SiteData {
  addons: AddonPage[]
  /** Slugs whose bundle could not be read; shown on the index as unavailable. */
  unavailable: string[]
}

/** A route the router cannot answer alone because it needs a GitHub call. */
export type Deferred =
  | { kind: 'download'; slug: string }
  | { kind: 'issue' }
  | { kind: 'issues'; slug: string }
  | { kind: 'vote' }
