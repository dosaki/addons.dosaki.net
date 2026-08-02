export interface Entry {
  name: string
  value: string
  type: string
  checked?: boolean
}

/** Pure, so it is testable without a DOM. */
export function collect(entries: Entry[]): Record<string, string> {
  const out: Record<string, string> = {}
  for (const e of entries) {
    if (e.name === 'slug' || e.name === 'form' || e.name === '') continue
    if (e.type === 'checkbox' && e.checked !== true) continue
    out[e.name] = out[e.name] === undefined ? e.value : `${out[e.name]!}\n${e.value}`
  }
  return out
}
