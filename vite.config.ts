import { resolve } from 'node:path'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
      '@sky-canvas/canvas-sdk': resolve(__dirname, 'packages/canvas-sdk/src'),
    },
  },
  esbuild: {
    // 启用装饰器支持
    tsconfigRaw: {
      compilerOptions: {
        experimentalDecorators: true,
        emitDecoratorMetadata: true,
      },
    },
  },
  optimizeDeps: {
    // 排除包含装饰器的包，让它们通过 TypeScript 编译
    exclude: ['@sky-canvas/canvas-sdk'],
    esbuildOptions: {
      tsconfigRaw: {
        compilerOptions: {
          experimentalDecorators: true,
          emitDecoratorMetadata: true,
        },
      },
    },
  },
  server: {
    open: true,
  },
  build: {
    rollupOptions: {
      external: ['reflect-metadata'],
    },
  },
})
