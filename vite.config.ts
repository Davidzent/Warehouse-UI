import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig(({ command, mode }) => {
  const env = loadEnv(mode, process.cwd(), 'VITE_')
  const apiBaseUrl = env.VITE_API_BASE_URL ?? ''
  const apiTarget = env.VITE_API_TARGET

  // An empty base URL makes the client issue same-origin /api requests. That is
  // right in dev, where the proxy below forwards them to a local API, and wrong
  // in production, where the hosting origin serves no /api. Stop the deploy
  // rather than ship a demo whose every request 404s.
  if (command === 'build' && !apiBaseUrl) {
    const message =
      'VITE_API_BASE_URL is empty — the built app would send API calls to the ' +
      'hosting origin, which serves no API. Set the WAREHOUSE_API_URL repository variable.'
    if (process.env.CI) throw new Error(message)
    console.warn(`\n[warehouse] ${message}\n`)
  }

  return {
    plugins: [react()],

    base: '/warehouse/',

    server: {
      port: Number(process.env.PORT) || 5176,
      // Keep /api same-origin in dev so the browser never issues a cross-origin
      // request and the API needs no CORS config to be developed against.
      proxy: apiTarget
        ? { '/api': { target: apiTarget, changeOrigin: true } }
        : undefined,
    },

    build: {
      outDir: '../../dist/warehouse',
      emptyOutDir: false,
    },
  }
})
