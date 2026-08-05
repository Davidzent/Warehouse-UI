import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ command, mode }) => {
  const env = loadEnv(mode, process.cwd(), 'VITE_')
  const apiBaseUrl = env.VITE_API_BASE_URL ?? ''
  const apiTarget = env.VITE_API_TARGET

  // Empty means same-origin /api: correct in dev via the proxy below, broken in
  // production where the hosting origin serves no API.
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
      // Same-origin /api in dev, so the API needs no CORS config.
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
