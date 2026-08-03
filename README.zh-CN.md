# Sky Canvas

<p align="center">
  <strong>WebGPU 实例化渲染引擎 + 面向 AI Agent 的画布编辑协议</strong>
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/@sky-canvas/renderer"><img src="https://img.shields.io/npm/v/@sky-canvas/renderer.svg" alt="npm version" /></a>
  <a href="https://github.com/echoVic/sky-canvas/actions/workflows/render-engine-ci.yml"><img src="https://github.com/echoVic/sky-canvas/actions/workflows/render-engine-ci.yml/badge.svg" alt="CI Status" /></a>
  <a href="https://github.com/echoVic/sky-canvas/blob/main/LICENSE"><img src="https://img.shields.io/npm/l/@sky-canvas/renderer.svg" alt="License" /></a>
  <img src="https://img.shields.io/badge/TypeScript-100%25-blue" alt="TypeScript" />
  <a href="https://skills.sh/echoVic/sky-canvas"><img src="https://skills.sh/b/echoVic/sky-canvas" alt="skills.sh" /></a>
</p>

<p align="center">
  中文 | <a href="./README.md">English</a>
</p>

---

## 核心能力

- **WebGPU 实例化渲染** — 50 万矩形对象稳定 60fps，支持圆、线段、SDF 文本
- **Snapshot-Ops 编辑协议** — AI Agent 通过"观察快照 → 引用 #id → 增量 Ops"闭环操作画布
- **多后端自动降级** — WebGPU → WebGL → Canvas2D，零配置 fallback
- **视口剔除 + 批处理** — QuadTree 空间索引，仅渲染可见区域

## 安装

```bash
pnpm add @sky-canvas/renderer    # 渲染引擎
pnpm add @sky-canvas/sdk         # 画布 SDK（含渲染引擎）
```

### Agent Skill

让 AI Agent 具备画布绘制能力（Claude Code / OpenCode / Codex）：

```bash
npx skills add echoVic/sky-canvas --skill sky-draw
```

## 快速开始

### WebGPU 渲染

```typescript
import { WebGPURenderer, buildGlyphAtlas } from '@sky-canvas/renderer/adapters/webgpu'

const canvas = document.querySelector('canvas')!
const renderer = new WebGPURenderer(canvas)
await renderer.initialize()

const atlas = await buildGlyphAtlas(renderer, 'monospace', 32)

renderer.render({
  rectangles: [
    { x: 50, y: 50, w: 200, h: 120, color: [0.26, 0.52, 0.96, 1] }
  ],
  circles: [
    { cx: 400, cy: 200, radius: 60, color: [0.96, 0.26, 0.21, 1] }
  ],
  texts: [
    { text: 'Hello Sky Canvas', x: 50, y: 300, atlas }
  ]
})
```

### Scene SDK（面向 Agent）

Agent 通过声明式 Ops 操控画布，无需了解渲染细节：

```typescript
import { SceneDocument, SceneRenderer, applyOps, snapshotText } from '@sky-canvas/renderer/scene'

const doc = new SceneDocument()

// 1. 用 ops 描述变更
applyOps(doc, [
  { op: 'add', id: 'title', type: 'text', x: 100, y: 50, text: 'Architecture', fontSize: 24 },
  { op: 'add', id: 'box1', type: 'rect', x: 80, y: 100, w: 200, h: 80, fill: '#4285f4' },
  { op: 'add', id: 'box2', type: 'rect', x: 400, y: 100, w: 200, h: 80, fill: '#34a853' },
  { op: 'connect', from: 'box1', to: 'box2' },
])

// 2. 读取快照验证
console.log(snapshotText(doc))
// @1 #title text (100,50) "Architecture"
// @2 #box1 rect (80,100,200,80) #4285f4
// @3 #box2 rect (400,100,200,80) #34a853
// @4 edge box1→box2

// 3. 渲染到 canvas
const sceneRenderer = new SceneRenderer(renderer)
sceneRenderer.render(doc.scene)
```

## 包结构

| 包 | 描述 | 版本 |
|---|------|------|
| [`@sky-canvas/renderer`](./packages/render-engine) | 渲染引擎（WebGPU/WebGL/Canvas2D） | ![npm](https://img.shields.io/npm/v/@sky-canvas/renderer) |
| [`@sky-canvas/sdk`](./packages/canvas-sdk) | 画布 SDK（交互、工具、历史记录） | ![npm](https://img.shields.io/npm/v/@sky-canvas/sdk) |

## 开发

```bash
git clone https://github.com/echoVic/sky-canvas.git && cd sky-canvas
pnpm install
pnpm dev:full          # 构建 packages + 启动 dev server
pnpm test              # 运行全部测试
pnpm build:packages    # 构建所有包
```

要求 Node >= 22，pnpm >= 10。

## 文档

- [架构概述](./docs/architecture/README.md)
- [渲染管线](./docs/architecture/render-pipeline.md)
- [Canvas SDK 架构](./packages/canvas-sdk/docs/ARCHITECTURE.md)
- [贡献指南](./CONTRIBUTING.md)

## License

[MIT](./LICENSE)
