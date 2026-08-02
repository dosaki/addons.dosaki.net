import { esc } from './html.js'
import type { FormDefinition, FormField } from './types.js'

/**
 * Position-based, so two fields can never produce the same prefix. Deriving
 * checkbox option ids from a field's own id let a group `x` collide with a
 * separate field `x-0`.
 */
function domId(field: FormField, index: number): string {
  return `f${index}-${field.id ?? ''}`
}

function labelFor(field: FormField, index: number): string {
  const optional = field.required ? '' : ' <span class="opt">optional</span>'
  return `<label for="${esc(domId(field, index))}">${esc(field.label ?? field.id ?? '')}${optional}</label>`
}

function description(field: FormField): string {
  return field.description === undefined || field.description === ''
    ? ''
    : `<p class="hint">${esc(field.description)}</p>`
}

function attrs(field: FormField, index: number): string {
  const parts = [`id="${esc(domId(field, index))}"`, `name="${esc(field.id ?? '')}"`]
  if (field.required) parts.push('required')
  if (field.placeholder !== undefined && field.placeholder !== '') {
    parts.push(`placeholder="${esc(field.placeholder)}"`)
  }
  return parts.join(' ')
}

function one(field: FormField, index: number): string {
  if (field.type === 'markdown') {
    return `<div class="intro">${esc(field.value ?? '')}</div>`
  }

  if (field.type === 'input') {
    return `<div class="field">${labelFor(field, index)}${description(field)}
<input type="text" ${attrs(field, index)}></div>`
  }

  if (field.type === 'textarea') {
    const mono = field.render !== undefined && field.render !== '' ? ' class="mono"' : ''
    return `<div class="field">${labelFor(field, index)}${description(field)}
<textarea rows="6"${mono} ${attrs(field, index)}></textarea></div>`
  }

  if (field.type === 'dropdown') {
    const multiple = field.multiple === true ? ' multiple' : ''
    const blank = field.required || field.multiple === true ? '' : '<option value=""></option>'
    const options = (field.options ?? [])
      .map((o) => `<option value="${esc(o)}">${esc(o)}</option>`)
      .join('')
    return `<div class="field">${labelFor(field, index)}${description(field)}
<select ${attrs(field, index)}${multiple}>${blank}${options}</select></div>`
  }

  // checkboxes
  const boxes = (field.checkboxes ?? [])
    .map((option, i) => {
      const id = `f${index}-o${i}`
      const required = option.required ? ' required' : ''
      return `<label class="check" for="${esc(id)}"><input type="checkbox" id="${esc(id)}" name="${esc(field.id ?? '')}" value="${esc(option.label)}"${required}> ${esc(option.label)}${option.required ? ' <span class="opt">required</span>' : ''}</label>`
    })
    .join('')
  return `<fieldset class="field"><legend>${esc(field.label ?? '')}</legend>${description(field)}${boxes}</fieldset>`
}

export function fieldsHtml(form: FormDefinition): string {
  return form.fields.map((field, index) => one(field, index)).join('\n')
}
