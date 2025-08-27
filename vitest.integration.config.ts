/// <reference types="vitest" />
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/tests/setup.ts'],
    include: [
      'src/tests/integration/**/*.{test,spec}.{js,ts,jsx,tsx}'
    ],
    exclude: [
      'node_modules',
      'dist',
      'packages',
      'examples'
    ],
    // 集成测试通常需要更多时间
    testTimeout: 10000,
    coverage: {
      reporter: ['text', 'json', 'html'],
      include: [
        'src/**/*.{ts,tsx}'
      ],
      exclude: [
        'node_modules/',
        'packages/',
        'dist/',
        'examples/',
        'src/tests/',
        '**/*.d.ts',
        '**/index.ts',
        'src/main.tsx'
      ]
    }
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
})