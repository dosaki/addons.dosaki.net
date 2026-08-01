export type FieldType =
  | 'markdown'
  | 'input'
  | 'textarea'
  | 'dropdown'
  | 'checkboxes'

export interface CheckboxOption {
  label: string
  required: boolean
}

export interface FormField {
  type: FieldType
  id?: string
  label?: string
  description?: string
  placeholder?: string
  /** Fenced-block language for textareas, e.g. "text". */
  render?: string
  /** Body text of a `markdown` block. Never submitted. */
  value?: string
  options?: string[]
  checkboxes?: CheckboxOption[]
  multiple?: boolean
  required: boolean
}

export interface FormDefinition {
  /** Template filename without its extension, e.g. "bug_report". */
  key: string
  name: string
  description: string
  labels: string[]
  titlePrefix?: string
  fields: FormField[]
}

export interface Manifest {
  schemaVersion: 1
  slug: string
  name: string
  tagline: string
  version: string
  interface?: string
  images: string[]
}
