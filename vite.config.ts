import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { resolve } from 'path'
import type { Plugin } from 'vite'

/**
 * CORS proxy plugin for H5 dev – forwards any fetch through the dev server
 * so browser CORS policy doesn't block API calls.
 *
 * Usage in H5 dev: fetch(`/api/proxy?url=${encodeURIComponent(targetUrl)}`, init)
 */
function corsProxyPlugin(): Plugin {
  return {
    name: 'cors-proxy',
    configureServer(server) {
      server.middlewares.use('/api/proxy', async (req, res) => {
        try {
          const urlParam = typeof req.url === 'string'
            ? new URL(req.url, 'http://localhost').searchParams.get('url')
            : null
          if (!urlParam) {
            res.statusCode = 400
            res.end('Missing url parameter')
            return
          }

          const targetUrl = decodeURIComponent(urlParam)
          const method = req.method || 'GET'

          // Collect request body if any
          const chunks: Buffer[] = []
          for await (const chunk of req) {
            chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk))
          }
          const body = chunks.length > 0 ? Buffer.concat(chunks) : undefined

          const response = await fetch(targetUrl, {
            method,
            headers: {
              // Forward relevant headers
              ...(req.headers['content-type']
                ? { 'content-type': req.headers['content-type'] as string }
                : {}),
              ...(req.headers['accept']
                ? { accept: req.headers['accept'] as string }
                : {}),
              // Browser strips Cookie from fetch(); H5 dev mode passes it as x-forwarded-cookie
              ...(req.headers['x-forwarded-cookie']
                ? { cookie: req.headers['x-forwarded-cookie'] as string }
                : req.headers['cookie']
                  ? { cookie: req.headers['cookie'] as string }
                  : {}),
              ...(req.headers['user-agent']
                ? { 'user-agent': req.headers['user-agent'] as string }
                : { 'user-agent': 'utools-usage-watch/1.0' }),
            },
            body,
            signal: AbortSignal.timeout(10000),
          })

          // Copy response headers (except ones that conflict with proxying)
          const skipHeaders = new Set([
            'access-control-allow-origin',
            'access-control-allow-methods',
            'content-security-policy',
            'content-encoding',   // body is already decompressed by Node fetch
            'content-length',     // length changes after decompression
            'transfer-encoding',
          ])
          const corsHeaders: Record<string, string> = {
            'access-control-allow-origin': '*',
            'access-control-allow-methods': 'GET, POST, OPTIONS',
            'access-control-allow-headers': '*',
          }
          for (const [key, value] of response.headers.entries()) {
            if (!skipHeaders.has(key.toLowerCase())) {
              corsHeaders[key] = value
            }
          }

          res.writeHead(response.status, corsHeaders)
          const text = await response.text()
          res.end(text)
        } catch (err) {
          res.statusCode = 502
          res.end(`Proxy error: ${(err as Error).message}`)
        }
      })
    },
  }
}

export default defineConfig({
  plugins: [vue(), corsProxyPlugin()],
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
  base: '',
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['vue', 'vue-router', 'pinia', 'vue-i18n'],
          chart: ['chart.js', 'vue-chartjs'],
        },
      },
    },
  },
})
