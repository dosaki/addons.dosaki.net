import { createRoot } from 'react-dom/client'
import { StrictMode, useState } from 'react'
import { collect, type Entry } from './collect.js'
import { sha256Hex } from './sign.js'
import { wireVotes } from './vote.js'
import { wireCommentForm } from './comment.js'
import { ensureName, prefillName } from './name.js'

function entriesOf(form: HTMLFormElement): Entry[] {
  return Array.from(form.elements)
    .filter((el): el is HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement =>
      'name' in el && (el as HTMLInputElement).name !== '')
    .map((el) => ({
      name: el.name,
      value: el.value,
      type: el.type,
      checked: 'checked' in el ? el.checked : undefined,
    }))
}

function Status({ form }: { form: HTMLFormElement }) {
  const [problems, setProblems] = useState<string[]>([])
  const [number, setNumber] = useState<number | null>(null)
  const [sending, setSending] = useState(false)

  form.onsubmit = (event) => {
    event.preventDefault()
    ensureName(form)
    setProblems([])
    setSending(true)
    const data = new FormData(form)
    const payload = JSON.stringify({
      slug: String(data.get('slug') ?? ''),
      form: String(data.get('form') ?? ''),
      fields: collect(entriesOf(form)),
    })
    void sha256Hex(payload)
      .then((hash) =>
        fetch('/api/issue', {
          method: 'POST',
          headers: { 'content-type': 'application/json', 'x-amz-content-sha256': hash },
          body: payload,
        }),
      )
      .then(async (res) => {
        const payload = (await res.json()) as { number?: number; errors?: string[] }
        if (res.status === 201 && payload.number !== undefined) {
          setNumber(payload.number)
          form.hidden = true
        } else {
          // The typed content is untouched: the form is still in the DOM.
          setProblems(payload.errors ?? ['Something went wrong. Please try again.'])
        }
      })
      .catch(() => setProblems(['Could not reach the site. Your report has not been sent - please try again.']))
      .finally(() => setSending(false))
  }

  if (number !== null) {
    return (
      <div className="sent">
        <strong>Thank you - your report has been filed. Your report number is {number}.</strong>
        <p>There is nothing else you need to do.</p>
      </div>
    )
  }
  if (problems.length > 0) {
    return (
      <div className="problems">
        <strong>Please check the following:</strong>
        <ul>{problems.map((p) => <li key={p}>{p}</li>)}</ul>
      </div>
    )
  }
  return sending ? <p className="hint">Sending…</p> : null
}

// Pre-fill runs on any page with a name field - the report form and the
// report detail page's reply form alike; a page without one is a no-op.
prefillName()

const root = document.getElementById('form-root')
const form = root?.querySelector('form')
if (root !== null && form !== null && form !== undefined) {
  const mount = document.createElement('div')
  root.prepend(mount)
  createRoot(mount).render(<StrictMode><Status form={form} /></StrictMode>)
}

// One bundle serves three islands (form, votes, reply form); each wiring is
// a no-op where its markup is absent.
wireVotes()
wireCommentForm()
