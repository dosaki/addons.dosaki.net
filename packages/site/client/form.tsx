import { createRoot } from 'react-dom/client'
import { StrictMode, useState } from 'react'
import { collect, type Entry } from './collect.js'

/**
 * CloudFront's OAC signs origin requests with SigV4, whose signature covers a
 * hash of the body. CloudFront does not compute it - the viewer must supply
 * it, or the origin rejects the request with a 403 signature mismatch.
 * crypto.subtle needs a secure context; the site is HTTPS-only.
 */
async function sha256Hex(body: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(body))
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('')
}

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

const root = document.getElementById('form-root')
const form = root?.querySelector('form')
if (root !== null && form !== null && form !== undefined) {
  const mount = document.createElement('div')
  root.prepend(mount)
  createRoot(mount).render(<StrictMode><Status form={form} /></StrictMode>)
}
