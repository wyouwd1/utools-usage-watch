import type { CurlParseResult, CurlParseError } from '@/types/quota'

const ERROR_MESSAGES: Record<CurlParseError['code'], { zh: string; en: string }> = {
  NO_URL: {
    zh: '无法解析 URL，请确认粘贴的是完整的 cURL 命令',
    en: 'Cannot parse URL, please paste a complete cURL command',
  },
  NO_CREDENTIAL: {
    zh: '未找到凭证信息（Cookie 或 Authorization），请确认 cURL 包含认证信息',
    en: 'No credential found (Cookie or Authorization). Make sure the cURL includes auth info',
  },
  INVALID_FORMAT: {
    zh: 'cURL 格式无法识别，请从浏览器 DevTools Network 标签复制',
    en: 'Invalid cURL format. Please copy from browser DevTools Network tab',
  },
}

function createError(code: CurlParseError['code'], message: string): CurlParseError {
  return { code, message, userMessage: ERROR_MESSAGES[code] }
}

/**
 * Parse all -H "Name: Value" headers from a cURL command string.
 */
function extractAllHeaders(curl: string): Record<string, string> {
  const headers: Record<string, string> = {}
  const headerRegex = /-H\s+['"]([^'"]+?)['"]/g
  let match: RegExpExecArray | null
  while ((match = headerRegex.exec(curl)) !== null) {
    const headerStr = match[1]
    const colonIdx = headerStr.indexOf(':')
    if (colonIdx > 0) {
      const name = headerStr.substring(0, colonIdx).trim()
      const value = headerStr.substring(colonIdx + 1).trim()
      headers[name] = value
    }
  }
  return headers
}

/**
 * Parse a cookie header value into key-value pairs.
 * Handles cookies with special characters like `=`, spaces, etc.
 */
function parseCookieString(cookieStr: string): Record<string, string> {
  const cookies: Record<string, string> = {}
  cookieStr.split(';').forEach((pair) => {
    const eqIdx = pair.indexOf('=')
    if (eqIdx > 0) {
      const key = pair.substring(0, eqIdx).trim()
      const value = pair.substring(eqIdx + 1).trim()
      if (key) cookies[key] = value
    }
  })
  return cookies
}

/**
 * Find an entry in headers by case-insensitive key.
 */
function findHeader(headers: Record<string, string>, key: string): string | undefined {
  const lowerKey = key.toLowerCase()
  for (const [name, value] of Object.entries(headers)) {
    if (name.toLowerCase() === lowerKey) return value
  }
  return undefined
}

/**
 * Parse a cURL command string and extract structured data.
 *
 * Supports:
 * - OpenCode Go format (Cookie auth + workspaceId)
 * - Bailian (百炼) format (Cookie + sec_token)
 *
 * Returns a CurlParseResult on success, or a CurlParseError on failure.
 */
export function parseCurl(curl: string): CurlParseResult | CurlParseError {
  const trimmed = curl.trim()
  if (!trimmed) {
    return createError('NO_URL', 'Empty cURL command')
  }

  // Basic format check: must start with "curl "
  if (!/^curl\s/i.test(trimmed)) {
    return createError('INVALID_FORMAT', 'cURL command must start with "curl "')
  }

  // Extract URL: curl <space> ['"]?<url>... stop at space, quote, or end
  const urlMatch = trimmed.match(/curl\s+['"]?([^'"\s]+)/)
  if (!urlMatch) {
    return createError('INVALID_FORMAT', 'Cannot extract URL from cURL command')
  }

  let url = urlMatch[1]
  // Strip trailing slash
  url = url.replace(/\/$/, '')

  // Extract base URL (protocol + host)
  const baseMatch = url.match(/([a-zA-Z][a-zA-Z0-9+.-]*:\/\/[^/]+)/)
  if (!baseMatch) {
    return createError('INVALID_FORMAT', 'Cannot extract base URL from the URL')
  }
  const baseUrl = baseMatch[1]

  // Extract workspaceId from URL path: /workspace/<id>
  const wsMatch = url.match(/\/workspace\/([^/\s?]+)/)
  const workspaceId = wsMatch ? wsMatch[1] : undefined

  // Extract all -H headers
  const headers = extractAllHeaders(trimmed)

  // Extract cookies from the Cookie header (case-insensitive)
  let cookieHeaderValue = findHeader(headers, 'Cookie')

  // If no Cookie header, try -b / --cookie flag
  if (!cookieHeaderValue) {
    const bMatch = trimmed.match(/(?:^|\s)-b\s+['"]([^'"]+)['"]/)
    if (!bMatch) {
      const cookieFlagMatch = trimmed.match(/(?:^|\s)--cookie\s+['"]([^'"]+)['"]/)
      if (cookieFlagMatch) cookieHeaderValue = cookieFlagMatch[1]
    } else {
      cookieHeaderValue = bMatch[1]
    }
  }

  const cookies = cookieHeaderValue ? parseCookieString(cookieHeaderValue) : {}

  // Check for credentials (Cookie or Authorization header)
  const hasCookie = Object.keys(cookies).length > 0
  const hasAuthorization = findHeader(headers, 'Authorization') !== undefined
  if (!hasCookie && !hasAuthorization) {
    return createError('NO_CREDENTIAL', 'No Cookie or Authorization header found')
  }

  // Extract sec_token from URL query params or from headers
  let secToken: string | undefined

  // Check URL query parameters first
  const secTokenParamMatch = url.match(/[?&]sec_token=([^&]+)/)
  if (secTokenParamMatch) {
    secToken = decodeURIComponent(secTokenParamMatch[1])
  }

  // If not found, check headers (case-insensitive)
  if (!secToken) {
    secToken =
      findHeader(headers, 'sec_token') ??
      findHeader(headers, 'sec-token') ??
      findHeader(headers, 'x-sec-token')
  }

  return {
    url,
    baseUrl,
    headers,
    cookies,
    workspaceId,
    secToken,
  }
}
