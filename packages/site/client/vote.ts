import { sha256Hex } from './sign.js'

/** Pure, so it is testable without a DOM. */
export function voteKey(slug: string, issue: string): string {
  return `vote:${slug}:${issue}`
}

/** Pure, so it is testable without a DOM. */
export function votePayload(slug: string, issue: string, direction: string): string {
  return JSON.stringify({ slug, issue: Number(issue), direction })
}

/** localStorage throws in some private modes; a vote must still be castable. */
function remembered(key: string): string | null {
  try {
    return localStorage.getItem(key)
  } catch {
    return null
  }
}

function remember(key: string, direction: string): void {
  try {
    localStorage.setItem(key, direction)
  } catch {
    // Honor-system dedup only; losing the memory just re-enables the buttons
    // next visit.
  }
}

function wireGroup(group: HTMLElement): void {
  const slug = group.dataset['slug'] ?? ''
  const issue = group.dataset['issue'] ?? ''
  const key = voteKey(slug, issue)
  const buttons = Array.from(group.querySelectorAll<HTMLButtonElement>('button.vote'))
  const lock = (locked: boolean) => buttons.forEach((b) => (b.disabled = locked))

  if (remembered(key) !== null) {
    lock(true)
    return
  }

  buttons.forEach((button) => {
    button.addEventListener('click', () => {
      const direction = button.dataset['dir'] ?? ''
      lock(true)
      const payload = votePayload(slug, issue, direction)
      void sha256Hex(payload)
        .then((hash) =>
          fetch('/api/vote', {
            method: 'POST',
            headers: { 'content-type': 'application/json', 'x-amz-content-sha256': hash },
            body: payload,
          }),
        )
        .then(async (res) => {
          if (!res.ok) throw new Error(String(res.status))
          // The server's tally is the truth - render it, not a local guess.
          const tally = (await res.json()) as { up: number; down: number }
          for (const [dir, count] of [['up', tally.up], ['down', tally.down]] as const) {
            const el = group.querySelector(`[data-dir="${dir}"] .count`)
            if (el !== null) el.textContent = String(count)
          }
          remember(key, direction)
        })
        // The vote did not land, so the buttons must not pretend it did.
        .catch(() => lock(false))
    })
  })
}

export function wireVotes(): void {
  document.querySelectorAll<HTMLElement>('.votes').forEach(wireGroup)
}
