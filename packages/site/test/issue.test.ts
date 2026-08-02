import { describe, expect, it } from 'vitest'
import { issueBody, issueTitle, validateSubmission, MAX_FIELD_CHARS } from '../src/issue.js'
import type { FormDefinition } from '../src/types.js'

const form: FormDefinition = {
  key: 'bug_report',
  name: 'Bug report',
  description: 'Something is not working',
  labels: ['bug'],
  fields: [
    { type: 'markdown', required: false, value: 'Intro prose, never submitted.' },
    { type: 'textarea', id: 'what', label: 'What happened?', required: true },
    { type: 'textarea', id: 'report', label: 'Output of /survivalrp bugreport', render: 'text', required: false },
    { type: 'input', id: 'kind', label: 'Which race?', required: false },
  ],
}

const dropdown: FormDefinition = {
  key: 'translation',
  name: 'Translation offer',
  description: '',
  labels: ['translation'],
  fields: [
    { type: 'input', id: 'locale', label: 'Which locale?', required: true },
    { type: 'dropdown', id: 'scope', label: 'How much?', options: ['Review', 'From scratch'], multiple: false, required: true },
  ],
}

describe('issueTitle', () => {
  it('names the form and the first required answer', () => {
    expect(issueTitle(form, { what: 'The HUD vanishes when I mount up' }))
      .toBe('Bug report: The HUD vanishes when I mount up')
  })

  it('rescues a title that would otherwise be a bare locale code', () => {
    expect(issueTitle(dropdown, { locale: 'deDE', scope: 'Review' }))
      .toBe('Translation offer: deDE')
  })

  it('truncates a long answer on a word boundary and marks it', () => {
    const long = 'The heads up display disappears completely whenever I mount up in a capital city and stays gone'
    const title = issueTitle(form, { what: long })
    expect(title.length).toBeLessThanOrEqual(70)
    expect(title.endsWith('…')).toBe(true)
    expect(title).not.toMatch(/\s…$/)
  })

  it('collapses newlines, which a textarea answer will contain', () => {
    expect(issueTitle(form, { what: 'line one\nline two' }))
      .toBe('Bug report: line one line two')
  })

  it('falls back to the form name alone when the answer is empty', () => {
    expect(issueTitle(form, { what: '   ' })).toBe('Bug report')
  })

  it('prefers a template titlePrefix when one exists', () => {
    const prefixed = { ...form, titlePrefix: '[Bug]: ' }
    expect(issueTitle(prefixed, { what: 'It broke' })).toBe('[Bug]: It broke')
  })
})

describe('issueBody', () => {
  it('uses the section shape GitHub issue forms produce', () => {
    const body = issueBody(form, { what: 'It broke' })
    expect(body).toContain('### What happened?\n\nIt broke')
  })

  it('fences a render:text field', () => {
    const body = issueBody(form, { what: 'x', report: 'version=1.2.2\nhunger=40' })
    expect(body).toContain('### Output of /survivalrp bugreport\n\n```text\nversion=1.2.2\nhunger=40\n```')
  })

  it('writes _No response_ for an omitted optional field, as GitHub does', () => {
    expect(issueBody(form, { what: 'x' })).toContain('### Which race?\n\n_No response_')
  })

  it('never emits a markdown block as a section', () => {
    expect(issueBody(form, { what: 'x' })).not.toContain('Intro prose')
  })

  it('carries the provenance footer', () => {
    expect(issueBody(form, { what: 'x' })).toContain('_Filed via addons.dosaki.net_')
  })

  it('does not leak an unknown field the client invented', () => {
    expect(issueBody(form, { what: 'x', smuggled: 'nope' })).not.toContain('nope')
  })
})

const checks: FormDefinition = {
  key: 'c', name: 'Checks', description: '', labels: [],
  fields: [{
    type: 'checkboxes', id: 'agree', label: 'Confirm', required: false,
    checkboxes: [{ label: 'I searched existing issues', required: true },
                 { label: 'I am on the latest version', required: false }],
  }],
}

describe('checkboxes', () => {
  it('rejects a required checkbox option left unticked', () => {
    expect(validateSubmission(checks, { agree: '' }))
      .toEqual(['"I searched existing issues" must be ticked'])
  })

  it('accepts once the required option is ticked', () => {
    expect(validateSubmission(checks, { agree: 'I searched existing issues' })).toEqual([])
  })

  it('renders every checkbox option with its state, as GitHub does', () => {
    const body = issueBody(checks, { agree: 'I searched existing issues' })
    expect(body).toContain('- [X] I searched existing issues')
    expect(body).toContain('- [ ] I am on the latest version')
  })
})

describe('multi-select dropdown', () => {
  it('comma-joins a multi-select dropdown, as GitHub does', () => {
    const multi: FormDefinition = {
      key: 'm', name: 'M', description: '', labels: [],
      fields: [{ type: 'dropdown', id: 'd', label: 'D', options: ['A', 'B', 'C'], multiple: true, required: false }],
    }
    expect(issueBody(multi, { d: 'A\nC' })).toContain('### D\n\nA, C')
  })
})

describe('title bound', () => {
  it('never exceeds the title bound, whatever the form is called', () => {
    const long = { ...checks, name: 'A'.repeat(90) }
    expect(issueTitle(long, {}).length).toBeLessThanOrEqual(70)
    expect(issueTitle(long, { agree: 'x' }).length).toBeLessThanOrEqual(70)
  })
})

describe('validateSubmission', () => {
  it('accepts a complete submission', () => {
    expect(validateSubmission(form, { what: 'It broke' })).toEqual([])
  })

  it('names a missing required field by its label', () => {
    expect(validateSubmission(form, {})).toEqual(['What happened? is required'])
  })

  it('treats whitespace as missing', () => {
    expect(validateSubmission(form, { what: '  \n ' })).toHaveLength(1)
  })

  it('rejects a dropdown answer that is not one of its options', () => {
    const problems = validateSubmission(dropdown, { locale: 'deDE', scope: 'Something else' })
    expect(problems).toEqual(['How much? is not one of the offered options'])
  })

  it('rejects a field beyond the per-field limit', () => {
    const problems = validateSubmission(form, { what: 'x'.repeat(MAX_FIELD_CHARS + 1) })
    expect(problems[0]).toMatch(/too long/)
  })
})
