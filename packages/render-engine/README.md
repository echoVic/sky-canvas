# @sky-canvas/render-engine

高性能的框架无关图形渲染引擎

## 特性

- 🚀 **框架无关** - 不依赖任何前端框架，可在任何 JavaScript 环境中使用
- 🎨 **多适配器支持** - 支持 Canvas2D、WebGL、WebGPU 等多种渲染后端
- ⚡ **高性能** - 批量渲染、视锥剔除、内存优化等性能特性
- 🔧 **类型安全** - 完整的 TypeScript 支持
- 🧪 **测试覆盖** - 完善的单元测试覆盖

## 安装

```bash
npm install @sky-canvas/render-engine
```

## 快速开始

```typescript
import { RenderEngine, IGraphicsContextFactory } from '@sky-canvas/render-engine';

// 创建渲染引擎
const engine = new RenderEngine({
  targetFPS: 60,
  enableVSync: true,
  enableCulling: true
});

// 初始化
const canvas = document.getElementById('canvas') as HTMLCanvasElement;
const factory: IGraphicsContextFactory = new Canvas2DContextFactory();
await engine.initialize(factory, canvas);

// 开始渲染循环
engine.start();
```

## API 文档

### RenderEngine

渲染引擎核心类

#### 构造函数

```typescript
constructor(config?: IRenderEngineConfig)
```

#### 主要方法

- `initialize(factory, canvas)` - 初始化渲染引擎
- `start()` - 启动渲染循环
- `stop()` - 停止渲染循环
- `render()` - 手动渲染一帧
- `createLayer(id, zIndex)` - 创建渲染层
- `setViewport(viewport)` - 设置视口
- `dispose()` - 销毁引擎

### 数学库

#### Vector2

2D向量数学库

```typescript
import { Vector2 } from '@sky-canvas/render-engine';

const v1 = new Vector2(1, 2);
const v2 = new Vector2(3, 4);
const sum = v1.add(v2);
const length = v1.length();
const normalized = v1.normalize();
```

## 配置选项

```typescript
interface IRenderEngineConfig {
  targetFPS?: number;        // 目标FPS，默认60
  enableVSync?: boolean;     // 是否启用垂直同步，默认true
  enableCulling?: boolean;   // 是否启用视锥剔除，默认true
  cullMargin?: number;       // 剔除边距，默认50
}
```

## 开发

```bash
# 安装依赖
npm install

# 运行测试
npm test

# 构建
npm run build

# 开发模式
npm run dev
```

## 许可证

MIT License