/// <reference types="vitest" />

import { resolve } from 'node:path'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/tests/setup.ts'],
    include: [
      'src/**/__tests__/**/*.{test,spec}.{js,ts,jsx,tsx}',
      'src/**/*.{test,spec}.{js,ts,jsx,tsx}',
      'packages/**/__tests__/**/*.{test,spec}.{js,ts,jsx,tsx}',
      'packages/**/*.{test,spec}.{js,ts,jsx,tsx}',
    ],
    exclude: ['node_modules', 'dist', 'src/tests/e2e', 'src/tests/integration', 'examples'],
    coverage: {
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'packages/',
        'dist/',
        'examples/',
        'src/tests/',
        '**/*.d.ts',
        '**/index.ts',
        'src/main.tsx',
        'vite.config.ts',
        'tailwind.config.js',
        'postcss.config.js',
      ],
      thresholds: {
        global: {
          branches: 85,
          functions: 85,
          lines: 85,
          statements: 85,
        },
      },
    },
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
      '@sky-canvas/render-engine': resolve(__dirname, 'packages/render-engine/src'),
      '@sky-canvas/canvas-sdk': resolve(__dirname, 'packages/canvas-sdk/src'),
    },
  },
})
