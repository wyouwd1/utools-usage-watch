import type { CurlRequest } from '@/types/quota'

/**
 * Execute a parsed cURL request and return the response text.
 * In H5 dev mode, the global fetch is already monkey-patched for CORS.
 */
export async function executeCurl(request: CurlRequest): Promise<string> {
  const res = await fetch(request.url, {
    method: request.method,
    headers: request.headers,
    body: request.body,
    signal: AbortSignal.timeout(10000),
    redirect: 'follow',
  })
  if (!res.ok) {
    throw new Error(`HTTP ${res.status} ${res.statusText}`)
  }
  return res.text()
}
