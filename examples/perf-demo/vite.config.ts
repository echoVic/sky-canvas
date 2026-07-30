import { resolve } from 'node:path'
import { defineConfig } from 'vite'

// perf-demo 独立配置:直接以源码方式引用 render-engine,免 build。
export default defineConfig({
  root: __dirname,
  resolve: {
    alias: {
      '@sky-canvas/render-engine/adapters/webgpu': resolve(
        __dirname,
        '../../packages/render-engine/src/adapters/webgpu/index.ts'
      ),
      '@sky-canvas/render-engine': resolve(__dirname, '../../packages/render-engine/src/index.ts'),
    },
  },
  server: { open: false, port: 5178 },
})
