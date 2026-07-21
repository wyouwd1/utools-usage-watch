import { describe, it, expect } from 'vitest'
import { parseCurl } from '@/services/curl-parser'
import { isCurlParseError } from '@/types/quota'

describe('parseCurl', () => {
  // ===== Success cases =====

  it('parses OpenCode Go cURL with Cookie auth and workspaceId', () => {
    const result = parseCurl(
      `curl 'https://api.opencode.ai/v1/workspace/ws_abc123/usage' -H 'Cookie: session=abc123; token=xyz'`,
    )

    expect(isCurlParseError(result)).toBe(false)
    if (isCurlParseError(result)) return

    expect(result.url).toBe('https://api.opencode.ai/v1/workspace/ws_abc123/usage')
    expect(result.baseUrl).toBe('https://api.opencode.ai')
    expect(result.cookies).toEqual({ session: 'abc123', token: 'xyz' })
    expect(result.workspaceId).toBe('ws_abc123')
    expect(result.headers).toHaveProperty('Cookie')
    expect(result.headers.Cookie).toBe('session=abc123; token=xyz')
  })

  it('parses Bailian cURL with Cookie + sec_token in headers', () => {
    const result = parseCurl(
      `curl 'https://bailian.aliyun.com/api/usage' -H 'Cookie: aliyun_session=xyz123' -H 'sec_token: sk-abc123'`,
    )

    expect(isCurlParseError(result)).toBe(false)
    if (isCurlParseError(result)) return

    expect(result.url).toBe('https://bailian.aliyun.com/api/usage')
    expect(result.baseUrl).toBe('https://bailian.aliyun.com')
    expect(result.cookies).toEqual({ aliyun_session: 'xyz123' })
    expect(result.secToken).toBe('sk-abc123')
    expect(result.headers).toHaveProperty('sec_token')
    expect(result.headers.sec_token).toBe('sk-abc123')
  })

  it('parses cURL with cookie in lowercase -H "cookie: xxx" format', () => {
    const result = parseCurl(
      `curl 'https://api.example.com/usage' -H 'cookie: my_session=abcdef'`,
    )

    expect(isCurlParseError(result)).toBe(false)
    if (isCurlParseError(result)) return

    expect(result.url).toBe('https://api.example.com/usage')
    expect(result.baseUrl).toBe('https://api.example.com')
    expect(result.cookies).toEqual({ my_session: 'abcdef' })
    expect(result.workspaceId).toBeUndefined()
  })

  it('parses cURL with URL containing workspace path', () => {
    const result = parseCurl(
      `curl 'https://api.example.com/workspace/ws_456/data' -H 'Cookie: session=s1'`,
    )

    expect(isCurlParseError(result)).toBe(false)
    if (isCurlParseError(result)) return

    expect(result.workspaceId).toBe('ws_456')
    expect(result.url).toBe('https://api.example.com/workspace/ws_456/data')
  })

  // ===== Error cases =====

  it('returns NO_URL for empty string', () => {
    const result = parseCurl('')

    expect(isCurlParseError(result)).toBe(true)
    if (!isCurlParseError(result)) return

    expect(result.code).toBe('NO_URL')
    expect(result.userMessage.zh).toBeTruthy()
    expect(result.userMessage.en).toBeTruthy()
  })

  it('returns NO_URL for whitespace-only string', () => {
    const result = parseCurl('   \n  ')

    expect(isCurlParseError(result)).toBe(true)
    if (!isCurlParseError(result)) return

    expect(result.code).toBe('NO_URL')
  })

  it('returns INVALID_FORMAT when input does not start with "curl"', () => {
    const result = parseCurl('wget https://api.example.com -H "Cookie: a=1"')

    expect(isCurlParseError(result)).toBe(true)
    if (!isCurlParseError(result)) return

    expect(result.code).toBe('INVALID_FORMAT')
  })

  it('returns INVALID_FORMAT when no URL is present after curl', () => {
    const result = parseCurl('curl -H "Cookie: a=1"')

    expect(isCurlParseError(result)).toBe(true)
    if (!isCurlParseError(result)) return

    expect(result.code).toBe('INVALID_FORMAT')
  })

  it('returns NO_CREDENTIAL when curl has URL but no auth headers', () => {
    const result = parseCurl("curl 'https://api.example.com/public' -H 'Accept: application/json'")

    expect(isCurlParseError(result)).toBe(true)
    if (!isCurlParseError(result)) return

    expect(result.code).toBe('NO_CREDENTIAL')
  })

  it('returns NO_CREDENTIAL when Cookie header exists but is empty', () => {
    const result = parseCurl("curl 'https://api.example.com/data' -H 'Cookie: '")

    expect(isCurlParseError(result)).toBe(true)
    if (!isCurlParseError(result)) return

    expect(result.code).toBe('NO_CREDENTIAL')
  })

  // ===== Edge cases =====

  it('strips trailing slash from URL', () => {
    const result = parseCurl(
      "curl 'https://api.example.com/workspace/ws_123/' -H 'Cookie: session=s1'",
    )

    expect(isCurlParseError(result)).toBe(false)
    if (isCurlParseError(result)) return

    expect(result.url).toBe('https://api.example.com/workspace/ws_123')
    expect(result.baseUrl).toBe('https://api.example.com')
    expect(result.workspaceId).toBe('ws_123')
  })

  it('parses multiple -H headers correctly', () => {
    const result = parseCurl(
      [
        "curl 'https://api.example.com/data'",
        "-H 'Cookie: session=abc'",
        "-H 'X-Custom: custom-value'",
        "-H 'Authorization: Bearer token123'",
      ].join(' '),
    )

    expect(isCurlParseError(result)).toBe(false)
    if (isCurlParseError(result)) return

    expect(result.headers).toEqual({
      Cookie: 'session=abc',
      'X-Custom': 'custom-value',
      Authorization: 'Bearer token123',
    })
    expect(result.cookies).toEqual({ session: 'abc' })
  })

  it('handles cookies with special characters', () => {
    const result = parseCurl(
      `curl 'https://api.example.com/' -H 'Cookie: session=a=b=c; token=xyz'`,
    )

    expect(isCurlParseError(result)).toBe(false)
    if (isCurlParseError(result)) return

    // The cookie value should stop at the first '=' after key
    expect(result.cookies).toEqual({ session: 'a=b=c', token: 'xyz' })
  })

  it('ignores query parameters for base URL extraction', () => {
    const result = parseCurl(
      `curl 'https://api.example.com/path?foo=bar&baz=qux' -H 'Cookie: session=s1'`,
    )

    expect(isCurlParseError(result)).toBe(false)
    if (isCurlParseError(result)) return

    expect(result.baseUrl).toBe('https://api.example.com')
    expect(result.url).toBe('https://api.example.com/path?foo=bar&baz=qux')
  })

  it('parses sec_token from URL query parameters', () => {
    const result = parseCurl(
      `curl 'https://bailian.aliyun.com/api?sec_token=sk-secret&foo=1' -H 'Cookie: session=s1'`,
    )

    expect(isCurlParseError(result)).toBe(false)
    if (isCurlParseError(result)) return

    expect(result.secToken).toBe('sk-secret')
  })

  it('parses sec_token from headers with alternate names', () => {
    const result = parseCurl(
      [
        "curl 'https://bailian.aliyun.com/api'",
        "-H 'Cookie: session=s1'",
        "-H 'X-sec-token: sk-xyz'",
      ].join(' '),
    )

    expect(isCurlParseError(result)).toBe(false)
    if (isCurlParseError(result)) return

    expect(result.secToken).toBe('sk-xyz')
  })

  it('handles URL without scheme (non-http) gracefully', () => {
    const result = parseCurl("curl 'ftp://files.example.com/data' -H 'Cookie: session=s1'")

    expect(isCurlParseError(result)).toBe(false)
    if (isCurlParseError(result)) return

    expect(result.baseUrl).toBe('ftp://files.example.com')
  })

  it('allows Authorization header as valid credential instead of Cookie', () => {
    const result = parseCurl("curl 'https://api.example.com/secure' -H 'Authorization: Bearer sk-xxx'")

    expect(isCurlParseError(result)).toBe(false)
    if (isCurlParseError(result)) return

    expect(result.cookies).toEqual({})
    expect(result.headers).toHaveProperty('Authorization')
    expect(result.headers.Authorization).toBe('Bearer sk-xxx')
  })

  it('uses double-quoted headers', () => {
    const result = parseCurl(
      'curl "https://api.example.com/data" -H "Cookie: session=abc" -H "sec_token: t1"',
    )

    expect(isCurlParseError(result)).toBe(false)
    if (isCurlParseError(result)) return

    expect(result.cookies).toEqual({ session: 'abc' })
    expect(result.secToken).toBe('t1')
  })
})
