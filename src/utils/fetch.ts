/**
 * Fetch wrapper that handles CORS in H5 dev mode.
 *
 * In uTools (production), uses regular fetch directly.
 * In H5 dev (browser), monkey-patches global fetch to route through
 * the Vite dev server proxy, avoiding CORS errors.
 */

const isH5Dev = typeof window !== 'undefined'
  && !(window as any).utools?.db
  && typeof location !== 'undefined'
  && (location.hostname === 'localhost' || location.hostname === '127.0.0.1')

const proxyBase = '/api/proxy?url='

if (isH5Dev) {
  const originalFetch = window.fetch.bind(window)
  window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    let urlStr: string
    if (typeof input === 'string') {
      urlStr = input
    } else if (input instanceof URL) {
      urlStr = input.href
    } else if (input instanceof Request) {
      urlStr = input.url
    } else {
      urlStr = String(input)
    }

    // Only proxy http/https URLs (skip relative URLs, data: URIs, etc.)
    if (urlStr.startsWith('http://') || urlStr.startsWith('https://')) {
      // Browser strips Cookie header from fetch() — pass it through a custom header
      // so the Vite CORS proxy can reconstruct it when forwarding to the target.
      let modifiedInit = init
      if (init?.headers) {
        const headers = new Headers(init.headers)
        if (headers.has('Cookie')) {
          headers.set('x-forwarded-cookie', headers.get('Cookie')!)
          headers.delete('Cookie')
          modifiedInit = { ...init, headers }
        }
      }
      return originalFetch(proxyBase + encodeURIComponent(urlStr), modifiedInit)
    }
    return originalFetch(input, init)
  }
}

export { isH5Dev }
