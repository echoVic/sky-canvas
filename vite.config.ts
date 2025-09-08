import react from '@vitejs/plugin-react'
import { resolve } from 'path'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
      '@sky-canvas/canvas-sdk': resolve(__dirname, 'packages/canvas-sdk/src'),
    },
  },
  server: {
    open: true
  },
  build: {
    rollupOptions: {
      external: ['reflect-metadata']
    }
  }
})