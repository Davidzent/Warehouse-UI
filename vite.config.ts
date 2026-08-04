import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],

  base: '/warehouse/',

  server: {
    port: Number(process.env.PORT) || 5176,
  },

  build: {
    outDir: '../../dist/warehouse',
    emptyOutDir: false,
  },
})
