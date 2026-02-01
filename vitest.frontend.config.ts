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
      'src/components/**/*.{test,spec}.{js,ts,jsx,tsx}',
      'src/hooks/**/*.{test,spec}.{js,ts,jsx,tsx}',
      'src/store/**/*.{test,spec}.{js,ts,jsx,tsx}',
      'src/contexts/**/*.{test,spec}.{js,ts,jsx,tsx}',
      'src/utils/**/*.{test,spec}.{js,ts,jsx,tsx}',
    ],
    exclude: ['node_modules', 'dist', 'packages', 'examples'],
    coverage: {
      reporter: ['text', 'json', 'html'],
      include: [
        'src/components/**/*.{ts,tsx}',
        'src/hooks/**/*.{ts,tsx}',
        'src/store/**/*.{ts,tsx}',
        'src/contexts/**/*.{ts,tsx}',
        'src/utils/**/*.{ts,tsx}',
      ],
      exclude: [
        'node_modules/',
        'packages/',
        'dist/',
        'examples/',
        'src/tests/',
        '**/*.d.ts',
        '**/index.ts',
        'src/main.tsx',
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
