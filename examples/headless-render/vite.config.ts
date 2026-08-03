import { resolve } from 'node:path'
import { defineConfig } from 'vite'

// headless-render harness:直接以源码引用 render-engine,免 build。
export default defineConfig({
  root: __dirname,
  resolve: {
    alias: {
      '@sky-canvas/renderer/adapters/webgpu': resolve(
        __dirname,
        '../../packages/render-engine/src/adapters/webgpu/index.ts'
      ),
      '@sky-canvas/renderer/culling': resolve(
        __dirname,
        '../../packages/render-engine/src/culling/index.ts'
      ),
      '@sky-canvas/renderer/scene': resolve(
        __dirname,
        '../../packages/render-engine/src/scene/index.ts'
      ),
      '@sky-canvas/renderer': resolve(__dirname, '../../packages/render-engine/src/index.ts'),
    },
  },
  server: { open: false, port: 5180 },
})
