import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'node:path'

export default defineConfig({
  plugins: [react()],
  server: { proxy: { '/api': 'http://127.0.0.1:8000' } },
  build: {
    rollupOptions: {
      input: {
        app: resolve(import.meta.dirname, 'index.html'),
        staticCollector: resolve(import.meta.dirname, 'collector.html'),
        dynamicCollector: resolve(import.meta.dirname, 'dynamic-collector.html'),
      },
    },
  },
})
