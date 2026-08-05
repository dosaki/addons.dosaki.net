import type { FormDefinition, FormField } from './types.js'

/** GitHub's own issue-body limit is 65536; leave room for the footer. */
export const MAX_BODY_BYTES = 61440
export const MAX_FIELD_CHARS = 8000
export const TITLE_MAX = 70

/**
 * The site-injected credit field, present on every form. It is the site's
 * own, not the template's: it is pulled out of the submission before template
 * validation and lands in the footer, never in a section or the title.
 */
export const NAME_FIELD = 'reporter-name'
export const NAME_MAX = 80

/**
 * The hidden decoy field on every site form. Humans never see it; autofill
 * bots fill it. Non-empty → the submission is silently dropped.
 */
export const HONEYPOT_FIELD = 'website'

const FOOTER = '_Filed via addons.dosaki.net_'
const FOOTER_LINE = /^_Filed via addons\.dosaki\.net(?: by (.+?))?_$/m

export function footer(name: string): string {
  return name === '' ? FOOTER : `_Filed via addons.dosaki.net by ${name}_`
}

/** The credited name a filed body carries, or null for anonymous or hand-filed. */
export function reporterName(body: string): string | null {
  return FOOTER_LINE.exec(body)?.[1] ?? null
}

/** For display: the footer is machinery; a name resurfaces as its own credit. */
export function stripFooter(body: string): string {
  if (!FOOTER_LINE.test(body)) return body
  return body.replace(FOOTER_LINE, '').replace(/\n{3,}/g, '\n\n').replace(/\n+$/, '')
}

/** markdown blocks are prose in the form, never an answer. */
function answerable(form: FormDefinition): FormField[] {
  return form.fields.filter((f) => f.type !== 'markdown' && f.id !== undefined)
}

function clean(value: string | undefined): string {
  return (value ?? '').trim()
}

/**
 * No shipped template carries a `title:`, and the obvious fallback - the first
 * required answer - gives "deDE" for a translation offer and a truncated
 * paragraph for a bug report. Naming the form first fixes both.
 */
export function issueTitle(form: FormDefinition, fields: Record<string, string>): string {
  return clamp(compose(form, fields))
}

/** The 70-char bound is a promise about the RESULT, so enforce it at one exit. */
function clamp(title: string): string {
  return title.length <= TITLE_MAX ? title : `${title.slice(0, TITLE_MAX - 1).trimEnd()}…`
}

function compose(form: FormDefinition, fields: Record<string, string>): string {
  const first = answerable(form).find((f) => f.required)
  const answer = clean(first?.id === undefined ? '' : fields[first.id]).replace(/\s+/g, ' ')

  if (form.titlePrefix !== undefined && form.titlePrefix !== '') {
    return `${form.titlePrefix}${answer}`.slice(0, TITLE_MAX)
  }
  if (answer === '') return form.name

  const prefix = `${form.name}: `
  const room = TITLE_MAX - prefix.length
  if (answer.length <= room) return prefix + answer

  const cut = answer.slice(0, room - 1)
  const boundary = cut.lastIndexOf(' ')
  return prefix + (boundary > room / 2 ? cut.slice(0, boundary) : cut).trimEnd() + '…'
}

/** The section shape GitHub's own issue forms produce, so both paths match. */
export function issueBody(
  form: FormDefinition,
  fields: Record<string, string>,
  name = '',
): string {
  const sections = answerable(form).map((field) => {
    const label = field.label ?? field.id ?? ''
    const value = clean(fields[field.id!])
    if (field.type === 'checkboxes') {
      const ticked = new Set(value === '' ? [] : value.split('\n'))
      const lines = (field.checkboxes ?? [])
        .map((o) => `- [${ticked.has(o.label) ? 'X' : ' '}] ${o.label}`)
        .join('\n')
      return `### ${label}\n\n${lines}`
    }
    if (value === '') return `### ${label}\n\n_No response_`
    if (field.type === 'dropdown' && field.multiple === true) {
      return `### ${label}\n\n${value.split('\n').join(', ')}`
    }
    if (field.render !== undefined && field.render !== '') {
      return `### ${label}\n\n\`\`\`${field.render}\n${value}\n\`\`\``
    }
    return `### ${label}\n\n${value}`
  })

  return `${sections.join('\n\n')}\n\n${footer(clean(name))}\n`
}

export function validateSubmission(
  form: FormDefinition,
  fields: Record<string, string>,
  name = '',
): string[] {
  const problems: string[] = []

  if (clean(name).length > NAME_MAX) {
    problems.push(`Name is too long (limit ${NAME_MAX} characters)`)
  }

  for (const field of answerable(form)) {
    const label = field.label ?? field.id ?? ''
    const value = clean(fields[field.id!])

    if (field.type === 'checkboxes') {
      const ticked = new Set(value === '' ? [] : value.split('\n'))
      for (const option of field.checkboxes ?? []) {
        if (option.required && !ticked.has(option.label)) {
          problems.push(`"${option.label}" must be ticked`)
        }
      }
      continue
    }
    if (field.required && value === '') {
      problems.push(`${label} is required`)
      continue
    }
    if (value.length > MAX_FIELD_CHARS) {
      problems.push(`${label} is too long (limit ${MAX_FIELD_CHARS} characters)`)
      continue
    }
    if (field.type === 'dropdown' && value !== '' && field.options !== undefined) {
      const chosen = field.multiple === true ? value.split('\n').map((v) => v.trim()) : [value]
      if (chosen.some((c) => !field.options!.includes(c))) {
        problems.push(`${label} is not one of the offered options`)
      }
    }
  }

  if (Buffer.byteLength(issueBody(form, fields, name), 'utf8') > MAX_BODY_BYTES) {
    problems.push('The whole report is too long')
  }

  return problems
}
