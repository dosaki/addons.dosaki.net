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
  /** Bundle key -> raw bytes, served from /assets/:slug/:version/:key */
  assets: Map<string, Uint8Array>
}

export interface SiteData {
  addons: AddonPage[]
  /** Slugs whose bundle could not be read; shown on the index as unavailable. */
  unavailable: string[]
}
