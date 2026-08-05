import { footer, HONEYPOT_FIELD, MAX_FIELD_CHARS, NAME_FIELD, NAME_MAX, reporterName } from './issue.js'

export interface CommentRequest {
  slug: string
  issue: number
  name: string
  body: string
  /** Honeypot: non-empty means the hidden decoy field was filled. */
  website: string
}

/**
 * Two encodings on purpose, like the report submission: JSON from the
 * island, form-encoded from a plain browser POST. Both must produce an
 * identical request.
 */
export function parseCommentRequest(
  contentType: string | undefined,
  body: string,
  isBase64: boolean,
): CommentRequest {
  const raw = isBase64 ? Buffer.from(body, 'base64').toString('utf8') : body
  const type = (contentType ?? '').toLowerCase()

  if (type.includes('application/json')) {
    const parsed = JSON.parse(raw) as Partial<CommentRequest>
    const issue = typeof parsed.issue === 'number' ? String(parsed.issue) : ''
    return build(parsed.slug, issue, parsed.name, parsed.body, parsed.website)
  }

  if (type.includes('application/x-www-form-urlencoded')) {
    const params = new URLSearchParams(raw)
    return build(
      params.get('slug') ?? undefined,
      params.get('issue') ?? '',
      params.get(NAME_FIELD) ?? undefined,
      params.get('body') ?? undefined,
      params.get(HONEYPOT_FIELD) ?? undefined,
    )
  }

  throw new Error(`unsupported content-type: ${type || '(none)'}`)
}

/** Canonical numbers only, matching the detail route ("07" is not "7"). */
function build(
  slug: unknown,
  issue: string,
  name: unknown,
  body: unknown,
  website: unknown,
): CommentRequest {
  if (typeof slug !== 'string' || slug === '') throw new Error('slug is required')
  if (!/^[1-9]\d*$/.test(issue)) throw new Error('issue must be a positive integer')
  return {
    slug,
    issue: Number(issue),
    name: typeof name === 'string' ? name : '',
    body: typeof body === 'string' ? body : '',
    website: typeof website === 'string' ? website : '',
  }
}

export function validateComment(body: string, name: string): string[] {
  const problems: string[] = []
  const text = body.trim()
  if (text === '') problems.push('Reply is required')
  else if (text.length > MAX_FIELD_CHARS) {
    problems.push(`Reply is too long (limit ${MAX_FIELD_CHARS} characters)`)
  }
  if (name.trim().length > NAME_MAX) {
    problems.push(`Name is too long (limit ${NAME_MAX} characters)`)
  }
  return problems
}

/** The stored comment: the visitor's text plus the same credit footer issues carry. */
export function commentBody(text: string, name: string): string {
  return `${text.trim()}\n\n${footer(name)}\n`
}

/** The bot's login is machinery; a footer credit is the human to show. */
export function displayName(body: string, author: string): string {
  return reporterName(body) ?? author
}
