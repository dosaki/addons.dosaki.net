import { parse } from 'yaml'
import type { CheckboxOption, FieldType, FormDefinition, FormField } from './types.js'

const FIELD_TYPES: readonly FieldType[] = [
  'markdown',
  'input',
  'textarea',
  'dropdown',
  'checkboxes',
]

function isFieldType(value: unknown): value is FieldType {
  return typeof value === 'string' && (FIELD_TYPES as readonly string[]).includes(value)
}

function asString(value: unknown): string | undefined {
  return typeof value === 'string' ? value : undefined
}

export function parseForm(key: string, source: string): FormDefinition {
  const doc: unknown = parse(source)
  if (doc === null || typeof doc !== 'object') {
    throw new Error(`${key}: expected a YAML mapping`)
  }
  const raw = doc as Record<string, unknown>

  const name = asString(raw['name'])
  if (name === undefined) throw new Error(`${key}: missing "name"`)

  const body = raw['body']
  const fields = Array.isArray(body)
    ? body.map((entry, index) => parseField(key, index, entry))
    : []

  const labels = Array.isArray(raw['labels']) ? raw['labels'].map(String) : []

  return {
    key,
    name,
    description: asString(raw['description']) ?? '',
    labels,
    titlePrefix: asString(raw['title']),
    fields,
  }
}

function parseField(key: string, index: number, entry: unknown): FormField {
  if (entry === null || typeof entry !== 'object') {
    throw new Error(`${key}: body[${index}] is not a mapping`)
  }
  const raw = entry as Record<string, unknown>
  const type = raw['type']
  if (!isFieldType(type)) {
    throw new Error(`${key}: body[${index}] unknown field type "${String(type)}"`)
  }

  const attributes = (raw['attributes'] ?? {}) as Record<string, unknown>
  const validations = (raw['validations'] ?? {}) as Record<string, unknown>

  const field: FormField = {
    type,
    required: type === 'markdown' ? false : validations['required'] === true,
  }

  const id = asString(raw['id'])
  if (id !== undefined && type !== 'markdown') field.id = id

  const label = asString(attributes['label'])
  if (label !== undefined) field.label = label

  const description = asString(attributes['description'])
  if (description !== undefined) field.description = description

  const placeholder = asString(attributes['placeholder'])
  if (placeholder !== undefined) field.placeholder = placeholder

  const render = asString(attributes['render'])
  if (render !== undefined) field.render = render

  if (type === 'markdown') {
    field.value = asString(attributes['value']) ?? ''
    return field
  }

  if (type === 'dropdown') {
    const options = attributes['options']
    if (!Array.isArray(options)) {
      throw new Error(`${key}: body[${index}] dropdown has no options`)
    }
    field.options = options.map(String)
    field.multiple = attributes['multiple'] === true
    return field
  }

  if (type === 'checkboxes') {
    const options = attributes['options']
    if (!Array.isArray(options)) {
      throw new Error(`${key}: body[${index}] checkboxes has no options`)
    }
    field.checkboxes = options.map((option, i): CheckboxOption => {
      if (option === null || typeof option !== 'object') {
        throw new Error(`${key}: body[${index}] option[${i}] is not a mapping`)
      }
      const o = option as Record<string, unknown>
      const optionLabel = asString(o['label'])
      if (optionLabel === undefined) {
        throw new Error(`${key}: body[${index}] option[${i}] has no label`)
      }
      return { label: optionLabel, required: o['required'] === true }
    })
    return field
  }

  return field
}
