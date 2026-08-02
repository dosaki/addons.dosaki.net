import { esc } from './html.js'
import type { FormDefinition, FormField } from './types.js'

/** `f-` prefixed so a template id can never collide with an element we own. */
function domId(field: FormField): string {
  return `f-${field.id ?? ''}`
}

function labelFor(field: FormField): string {
  const optional = field.required ? '' : ' <span class="opt">optional</span>'
  return `<label for="${esc(domId(field))}">${esc(field.label ?? field.id ?? '')}${optional}</label>`
}

function description(field: FormField): string {
  return field.description === undefined || field.description === ''
    ? ''
    : `<p class="hint">${esc(field.description)}</p>`
}

function attrs(field: FormField): string {
  const parts = [`id="${esc(domId(field))}"`, `name="${esc(field.id ?? '')}"`]
  if (field.required) parts.push('required')
  if (field.placeholder !== undefined && field.placeholder !== '') {
    parts.push(`placeholder="${esc(field.placeholder)}"`)
  }
  return parts.join(' ')
}

function one(field: FormField): string {
  if (field.type === 'markdown') {
    return `<div class="intro">${esc(field.value ?? '')}</div>`
  }

  if (field.type === 'input') {
    return `<div class="field">${labelFor(field)}${description(field)}
<input type="text" ${attrs(field)}></div>`
  }

  if (field.type === 'textarea') {
    const mono = field.render !== undefined && field.render !== '' ? ' class="mono"' : ''
    return `<div class="field">${labelFor(field)}${description(field)}
<textarea rows="6"${mono} ${attrs(field)}></textarea></div>`
  }

  if (field.type === 'dropdown') {
    const multiple = field.multiple === true ? ' multiple' : ''
    const blank = field.required ? '' : '<option value=""></option>'
    const options = (field.options ?? [])
      .map((o) => `<option value="${esc(o)}">${esc(o)}</option>`)
      .join('')
    return `<div class="field">${labelFor(field)}${description(field)}
<select ${attrs(field)}${multiple}>${blank}${options}</select></div>`
  }

  // checkboxes
  const boxes = (field.checkboxes ?? [])
    .map((option, i) => {
      const id = `${domId(field)}-${i}`
      const required = option.required ? ' required' : ''
      return `<label class="check" for="${esc(id)}"><input type="checkbox" id="${esc(id)}" name="${esc(field.id ?? '')}" value="${esc(option.label)}"${required}> ${esc(option.label)}${option.required ? ' <span class="opt">required</span>' : ''}</label>`
    })
    .join('')
  return `<fieldset class="field"><legend>${esc(field.label ?? '')}</legend>${description(field)}${boxes}</fieldset>`
}

export function fieldsHtml(form: FormDefinition): string {
  return form.fields.map(one).join('\n')
}
