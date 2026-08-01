import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { parseForm } from '../src/forms.js'

const fixture = (name: string) =>
  readFileSync(join(import.meta.dirname, 'fixtures', name), 'utf8')

describe('parseForm', () => {
  it('reads the header of a real template', () => {
    const form = parseForm('bug_report', fixture('bug_report.yml'))
    expect(form.key).toBe('bug_report')
    expect(form.name).toBe('Bug report')
    expect(form.description).toBe('Something is not working')
    expect(form.labels).toEqual(['bug'])
  })

  it('keeps markdown blocks, which carry no answer', () => {
    const form = parseForm('bug_report', fixture('bug_report.yml'))
    const intro = form.fields[0]
    expect(intro?.type).toBe('markdown')
    expect(intro?.id).toBeUndefined()
    expect(intro?.required).toBe(false)
    expect(intro?.value).toContain('/survivalrp bugreport')
  })

  it('carries required flags and render hints', () => {
    const form = parseForm('bug_report', fixture('bug_report.yml'))
    const what = form.fields.find((f) => f.id === 'what')
    expect(what?.type).toBe('textarea')
    expect(what?.required).toBe(true)
    // The website renders this alongside the field, so a dropped
    // description is a contract break, not decoration.
    expect(what?.description).toBe('What did you expect, and what happened instead?')

    const report = form.fields.find((f) => f.id === 'report')
    expect(report?.required).toBe(false)
    expect(report?.render).toBe('text')
  })

  it('strips a stray id from a markdown block, since markdown carries no answer', () => {
    const form = parseForm('x', [
      'name: X',
      'body:',
      '  - type: markdown',
      '    id: stray',
      '    attributes:',
      '      value: hello',
    ].join('\n'))
    expect(form.fields[0]?.type).toBe('markdown')
    expect(form.fields[0]?.id).toBeUndefined()
  })

  it('reads inputs and placeholders', () => {
    const form = parseForm('undetected_food', fixture('undetected_food.yml'))
    const locale = form.fields.find((f) => f.id === 'locale')
    expect(locale?.type).toBe('input')
    expect(locale?.required).toBe(true)
    expect(locale?.placeholder).toBe('enUS, deDE, frFR, ...')
  })

  it('reads dropdowns', () => {
    const form = parseForm('x', [
      'name: X',
      'body:',
      '  - type: dropdown',
      '    id: severity',
      '    attributes:',
      '      label: How bad?',
      '      multiple: false',
      '      options:',
      '        - Annoying',
      '        - Unplayable',
      '    validations:',
      '      required: true',
    ].join('\n'))
    const field = form.fields[0]
    expect(field?.type).toBe('dropdown')
    expect(field?.options).toEqual(['Annoying', 'Unplayable'])
    expect(field?.multiple).toBe(false)
    expect(field?.required).toBe(true)
  })

  it('reads a multi-select dropdown, which the website renders as checkboxes', () => {
    const form = parseForm('x', [
      'name: X',
      'body:',
      '  - type: dropdown',
      '    id: platforms',
      '    attributes:',
      '      label: Where?',
      '      multiple: true',
      '      options:',
      '        - Windows',
      '        - macOS',
    ].join('\n'))
    expect(form.fields[0]?.multiple).toBe(true)
  })

  it('reads checkboxes, whose options carry their own required flag', () => {
    const form = parseForm('x', [
      'name: X',
      'body:',
      '  - type: checkboxes',
      '    id: checks',
      '    attributes:',
      '      label: Confirm',
      '      options:',
      '        - label: I searched existing issues',
      '          required: true',
      '        - label: I am on the latest version',
    ].join('\n'))
    expect(form.fields[0]?.checkboxes).toEqual([
      { label: 'I searched existing issues', required: true },
      { label: 'I am on the latest version', required: false },
    ])
  })

  it('reads an optional title prefix', () => {
    const form = parseForm('x', 'name: X\ntitle: "[Bug]: "\nbody: []')
    expect(form.titlePrefix).toBe('[Bug]: ')
  })

  it('refuses an unknown field type rather than dropping it', () => {
    expect(() => parseForm('x', 'name: X\nbody:\n  - type: slider'))
      .toThrow(/unknown field type "slider"/)
  })

  it('refuses a template with no name', () => {
    expect(() => parseForm('x', 'body: []')).toThrow(/missing "name"/)
  })
})

describe('the shipped templates', () => {
  it('parses the feature suggestion form', () => {
    const form = parseForm('feature_request', fixture('feature_request.yml'))
    expect(form.name).toBe('Feature suggestion')
    expect(form.labels).toEqual(['enhancement'])
    expect(form.fields.find((f) => f.id === 'idea')?.required).toBe(true)
    expect(form.fields.find((f) => f.id === 'kind')?.required).toBe(false)
  })

  it('parses the translation form, including its dropdown', () => {
    const form = parseForm('translation', fixture('translation.yml'))
    expect(form.labels).toEqual(['translation'])
    const scope = form.fields.find((f) => f.id === 'scope')
    expect(scope?.type).toBe('dropdown')
    expect(scope?.options).toHaveLength(3)
    expect(scope?.required).toBe(true)
  })
})
