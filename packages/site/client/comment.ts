import { ensureName } from './name.js'
import { sha256Hex } from './sign.js'

/** Pure, so it is testable without a DOM. */
export function commentPayload(
  slug: string,
  issue: string,
  name: string,
  body: string,
  website: string,
): string {
  return JSON.stringify({ slug, issue: Number(issue), name, body, website })
}

export function wireCommentForm(): void {
  const root = document.getElementById('comment-root')
  const form = root?.querySelector('form')
  const problems = document.getElementById('comment-problems')
  if (root === null || form === null || form === undefined) return

  const show = (messages: string[]): void => {
    if (problems === null) return
    problems.innerHTML = ''
    const strong = document.createElement('strong')
    strong.textContent = 'Please check the following:'
    const list = document.createElement('ul')
    for (const message of messages) {
      const item = document.createElement('li')
      item.textContent = message
      list.append(item)
    }
    problems.append(strong, list)
    problems.hidden = false
  }

  form.addEventListener('submit', (event) => {
    event.preventDefault()
    ensureName(form)
    const data = new FormData(form)
    const payload = commentPayload(
      String(data.get('slug') ?? ''),
      String(data.get('issue') ?? ''),
      String(data.get('reporter-name') ?? ''),
      String(data.get('body') ?? ''),
      String(data.get('website') ?? ''),
    )
    const button = form.querySelector('button')
    if (button !== null) button.disabled = true
    void sha256Hex(payload)
      .then((hash) =>
        fetch('/api/comment', {
          method: 'POST',
          headers: { 'content-type': 'application/json', 'x-amz-content-sha256': hash },
          body: payload,
        }),
      )
      .then(async (res) => {
        if (res.status === 201) {
          // The detail page is served no-store, so a reload shows the reply.
          location.reload()
          return
        }
        const parsed = (await res.json()) as { errors?: string[] }
        show(parsed.errors ?? ['Something went wrong. Please try again.'])
        if (button !== null) button.disabled = false
      })
      .catch(() => {
        show(['Could not reach the site. Your reply has not been sent - please try again.'])
        if (button !== null) button.disabled = false
      })
  })
}
