import { describe, expect, it } from 'vitest'
import { fieldsHtml } from '../src/forms-html.js'
import type { FormDefinition } from '../src/types.js'

function form(fields: FormDefinition['fields']): FormDefinition {
  return { key: 'k', name: 'N', description: '', labels: [], fields }
}

describe('fieldsHtml', () => {
  it('renders a markdown block as prose, not an input', () => {
    const html = fieldsHtml(form([{ type: 'markdown', required: false, value: 'Read this first.' }]))
    expect(html).toContain('Read this first.')
    expect(html).not.toContain('<input')
    expect(html).not.toContain('<textarea')
  })

  it('renders an input with its label bound by id', () => {
    const html = fieldsHtml(form([{ type: 'input', id: 'locale', label: 'Which locale?', required: true }]))
    expect(html).toContain('<input')
    expect(html).toContain('name="locale"')
    expect(html).toContain('for="f0-locale"')
    expect(html).toContain('id="f0-locale"')
  })

  it('marks a required field required, and an optional one optional', () => {
    const html = fieldsHtml(form([
      { type: 'input', id: 'a', label: 'A', required: true },
      { type: 'input', id: 'b', label: 'B', required: false },
    ]))
    expect(html).toMatch(/id="f0-a"[^>]*required/)
    expect(html).not.toMatch(/id="f1-b"[^>]*required/)
    expect(html).toContain('optional')
  })

  it('gives a render:text textarea a monospace class', () => {
    const html = fieldsHtml(form([{ type: 'textarea', id: 'r', label: 'R', render: 'text', required: false }]))
    expect(html).toContain('<textarea')
    expect(html).toContain('mono')
  })

  it('renders a dropdown with every option', () => {
    const html = fieldsHtml(form([{ type: 'dropdown', id: 's', label: 'S', options: ['One', 'Two'], multiple: false, required: true }]))
    expect(html).toContain('<select')
    expect(html).toContain('>One<')
    expect(html).toContain('>Two<')
  })

  it('renders checkboxes with per-option required honoured', () => {
    const html = fieldsHtml(form([{
      type: 'checkboxes', id: 'c', label: 'C', required: false,
      checkboxes: [{ label: 'Must tick', required: true }, { label: 'May tick', required: false }],
    }]))
    expect(html).toContain('type="checkbox"')
    expect(html).toContain('Must tick')
    expect(html).toMatch(/Must tick[\s\S]{0,200}?required|required[\s\S]{0,200}?Must tick/)
  })

  it('escapes a label rather than trusting it', () => {
    const html = fieldsHtml(form([{ type: 'input', id: 'x', label: '<img src=x onerror=alert(1)>', required: false }]))
    expect(html).toContain('&lt;img src=x onerror=alert(1)&gt;')
    expect(html).not.toContain('<img src=x')
  })

  it('renders a placeholder when the template supplies one', () => {
    const html = fieldsHtml(form([{ type: 'input', id: 'l', label: 'L', placeholder: 'enUS, deDE', required: false }]))
    expect(html).toContain('placeholder="enUS, deDE"')
  })

  it('cannot collide ids between a checkbox group and a similarly named field', () => {
    const html = fieldsHtml(form([
      { type: 'checkboxes', id: 'x', label: 'X', required: false,
        checkboxes: [{ label: 'One', required: false }, { label: 'Two', required: false }] },
      { type: 'input', id: 'x-0', label: 'Also X', required: false },
    ]))
    const ids = [...html.matchAll(/id="([^"]+)"/g)].map((m) => m[1]!)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('still names fields by their template id, which is what the POST carries', () => {
    const html = fieldsHtml(form([{ type: 'input', id: 'locale', label: 'L', required: false }]))
    expect(html).toContain('name="locale"')
  })

  it('omits the blank option in a multi-select, where an empty row is meaningless', () => {
    const html = fieldsHtml(form([{ type: 'dropdown', id: 's', label: 'S', options: ['One'], multiple: true, required: false }]))
    expect(html).not.toContain('<option value=""></option>')
  })
})
