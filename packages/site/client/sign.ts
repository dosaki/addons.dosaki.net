/**
 * CloudFront's OAC signs origin requests with SigV4, whose signature covers a
 * hash of the body. CloudFront does not compute it - the viewer must supply
 * it, or the origin rejects the request with a 403 signature mismatch.
 * crypto.subtle needs a secure context; the site is HTTPS-only.
 */
export async function sha256Hex(body: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(body))
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('')
}
