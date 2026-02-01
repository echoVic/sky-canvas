# @sky-canvas/render-engine

<p align="center">
  <strong>高性能框架无关图形渲染引擎</strong>
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/@sky-canvas/render-engine"><img src="https://img.shields.io/npm/v/@sky-canvas/render-engine.svg" alt="npm version" /></a>
  <a href="https://github.com/sky-canvas/sky-canvas/blob/main/LICENSE"><img src="https://img.shields.io/npm/l/@sky-canvas/render-engine.svg" alt="License" /></a>
  <img src="https://img.shields.io/badge/TypeScript-100%25-blue" alt="TypeScript" />
</p>

## ✨ 特性

- 🚀 **框架无关** - 不依赖任何前端框架，可在任何 JavaScript 环境中使用
- 🎨 **多适配器支持** - 支持 Canvas2D、WebGL、WebGPU 等多种渲染后端
- ⚡ **高性能** - 批量渲染、视锥剔除、内存优化、GPU 加速
- 🔧 **类型安全** - 100% TypeScript 编写，完整的类型定义
- 🧪 **测试覆盖** - 完善的单元测试覆盖
- 🎭 **丰富特效** - 内置滤镜、混合、光照、遮罩等视觉效果
- ⚙️ **模块化架构** - 清晰的模块分层，易于扩展和维护
- 🎬 **动画系统** - 完整的属性动画、路径动画、时间轴支持
- ✨ **粒子系统** - GPU 加速的粒子系统，支持多种影响器
- 📝 **文本渲染** - 高质量文本渲染，支持富文本和字体加载

## 📦 安装

```bash
# npm
npm install @sky-canvas/render-engine

# pnpm
pnpm add @sky-canvas/render-engine

# yarn
yarn add @sky-canvas/render-engine
```

## 🚀 快速开始

### 基础用法

```typescript
import { 
  RenderEngine, 
  Canvas2DContextFactory,
  Rectangle 
} from '@sky-canvas/render-engine';

// 获取 canvas 元素
const canvas = document.getElementById('canvas') as HTMLCanvasElement;

// 创建渲染引擎
const engine = new RenderEngine({
  targetFPS: 60,
  enableVSync: true,
  enableCulling: true
});

// 初始化
const factory = new Canvas2DContextFactory();
await engine.initialize(factory, canvas);

// 创建图层
const layer = engine.createLayer('main', 0);

// 创建可渲染对象
const rect = new Rectangle({
  x: 100,
  y: 100,
  width: 200,
  height: 150,
  fillColor: { r: 66, g: 133, b: 244, a: 1 },
  strokeColor: { r: 0, g: 0, b: 0, a: 1 },
  strokeWidth: 2
});

// 添加到图层
layer.addRenderable(rect);

// 启动渲染循环
engine.start();
```

### 使用动画系统

```typescript
import { 
  AnimationManager, 
  PropertyAnimation,
  EasingFunctions,
  EasingType 
} from '@sky-canvas/render-engine';

const animationManager = new AnimationManager();

const animation = new PropertyAnimation({
  target: rect,
  property: 'x',
  from: 100,
  to: 500,
  duration: 1000,
  easing: EasingFunctions.get(EasingType.EASE_IN_OUT_CUBIC)
});

animationManager.registerAnimation(animation);
animation.start();
animationManager.start();
```

### 使用粒子系统

```typescript
import { ParticleSystem } from '@sky-canvas/render-engine';

const particles = new ParticleSystem({
  maxParticles: 1000,
  emission: {
    rate: 50,
    burst: [{ time: 0, count: 100 }]
  },
  particle: {
    lifetime: { min: 1, max: 3 },
    speed: { min: 50, max: 150 },
    size: { min: 5, max: 15 },
    color: { r: 255, g: 100, b: 50, a: 1 }
  }
});

particles.setEmitterPosition(400, 300);
particles.start();
```

### 使用滤镜效果

```typescript
import { 
  FilterManager, 
  GaussianBlurFilter,
  BrightnessFilter,
  DropShadowFilter 
} from '@sky-canvas/render-engine';

const filterManager = new FilterManager();

// 注册滤镜
filterManager.registerFilter('blur', new GaussianBlurFilter({ radius: 5 }));
filterManager.registerFilter('brightness', new BrightnessFilter({ amount: 1.2 }));
filterManager.registerFilter('shadow', new DropShadowFilter({
  offsetX: 2,
  offsetY: 2,
  blur: 4,
  color: 'rgba(0,0,0,0.5)'
}));

// 应用滤镜链
const result = await filterManager.applyFilterChain(
  imageData,
  ['blur', 'brightness', 'shadow']
);
```

### 使用批处理渲染

```typescript
import { BatchManager, BasicStrategy } from '@sky-canvas/render-engine';

const batchManager = new BatchManager();
batchManager.setStrategy(new BasicStrategy());

// 添加渲染对象到批次
batchManager.addToBatch(renderObject1);
batchManager.addToBatch(renderObject2);
batchManager.addToBatch(renderObject3);

// 批量渲染
batchManager.render(context);
```

### 使用数学库

```typescript
import { Vector2, Matrix2D, Transform } from '@sky-canvas/render-engine';

// 向量运算
const v1 = new Vector2(1, 2);
const v2 = new Vector2(3, 4);
const sum = v1.add(v2);
const length = v1.length();
const normalized = v1.normalize();

// 矩阵变换
const matrix = Matrix2D.identity()
  .translate(100, 100)
  .rotate(Math.PI / 4)
  .scale(2, 2);

// 变换组件
const transform = new Transform();
transform.setPosition(100, 200);
transform.setRotation(45);
transform.setScale(1.5, 1.5);
```

## 🏗️ 架构概览

```
src/
├── core/               # 核心渲染系统
│   ├── systems/        # 系统管理（批处理、性能监控、资源池等）
│   ├── RenderEngine.ts # 渲染引擎主类
│   ├── RenderLayer.ts  # 渲染层管理
│   └── DirtyRegionManager.ts # 脏区域管理
│
├── adapters/           # 渲染适配器
│   ├── Canvas2DContext.ts
│   ├── WebGLContext.ts
│   └── webgpu/         # WebGPU 适配器
│
├── animation/          # 动画系统
│   ├── animations/     # 动画实现（属性动画、路径动画）
│   ├── easing/         # 缓动函数
│   ├── particles/      # 粒子系统
│   │   └── affectors/  # 粒子影响器
│   ├── paths/          # 路径系统
│   └── timeline/       # 时间轴
│
├── batch/              # 批处理系统
│   ├── core/           # 批处理核心
│   └── strategies/     # 批处理策略
│
├── effects/            # 视觉效果
│   ├── blends/         # 混合模式
│   ├── filters/        # 滤镜系统
│   ├── lighting/       # 光照系统
│   ├── masks/          # 遮罩系统
│   └── postprocess/    # 后处理
│
├── math/               # 数学库
│   ├── Vector2.ts      # 2D 向量
│   ├── Matrix2D.ts     # 2D 矩阵
│   ├── Matrix3.ts      # 3x3 矩阵
│   ├── Transform.ts    # 变换组件
│   └── Rectangle.ts    # 矩形几何
│
├── events/             # 事件系统
├── graphics/           # 图形适配器
├── interface/          # 接口桥接
├── memory/             # 内存管理
├── particles/          # GPU 粒子系统
├── performance/        # 性能监控
├── plugins/            # 插件系统
├── renderers/          # 渲染器实现
├── resources/          # 资源管理
├── text/               # 文本渲染
├── webgl/              # WebGL 工具
└── utils/              # 工具函数
```

## 📚 API 文档

### RenderEngine

渲染引擎核心类，管理整个渲染生命周期。

```typescript
interface IRenderEngineConfig {
  targetFPS?: number;        // 目标帧率，默认 60
  enableVSync?: boolean;     // 是否启用垂直同步，默认 true
  enableCulling?: boolean;   // 是否启用视锥剔除，默认 true
  cullMargin?: number;       // 剔除边距，默认 50
}

class RenderEngine {
  constructor(config?: IRenderEngineConfig);
  
  // 生命周期
  initialize(factory: IGraphicsContextFactory, canvas: HTMLCanvasElement): Promise<void>;
  start(): void;
  stop(): void;
  render(): void;
  dispose(): void;
  
  // 图层管理
  createLayer(id: string, zIndex: number): IRenderLayer;
  getLayer(id: string): IRenderLayer | undefined;
  removeLayer(id: string): void;
  
  // 视口控制
  setViewport(viewport: IViewport): void;
  getViewport(): IViewport;
}
```

### AnimationManager

动画管理器，统一管理所有动画的生命周期。

```typescript
class AnimationManager {
  registerAnimation(animation: IAnimation): void;
  unregisterAnimation(id: string): void;
  start(): void;
  stop(): void;
  pause(): void;
  resume(): void;
  update(deltaTime: number): void;
}
```

### ParticleSystem

粒子系统，支持多种粒子效果。

```typescript
interface ParticleSystemConfig {
  maxParticles: number;
  emission: {
    rate: number;
    burst?: Array<{ time: number; count: number }>;
  };
  particle: {
    lifetime: { min: number; max: number };
    speed: { min: number; max: number };
    size: { min: number; max: number };
    color: IColor;
  };
}

class ParticleSystem {
  constructor(config: ParticleSystemConfig);
  setEmitterPosition(x: number, y: number): void;
  start(): void;
  stop(): void;
  update(deltaTime: number): void;
  render(context: IGraphicsContext): void;
}
```

### FilterManager

滤镜管理器，支持滤镜链处理。

```typescript
class FilterManager {
  registerFilter(name: string, filter: IFilter): void;
  unregisterFilter(name: string): void;
  applyFilter(name: string, imageData: ImageData): Promise<ImageData>;
  applyFilterChain(imageData: ImageData, filterNames: string[]): Promise<ImageData>;
}
```

## 🎮 示例

查看 [examples](./examples/) 目录获取更多示例：

| 示例 | 描述 |
|------|------|
| [basic-usage.ts](./examples/basic-usage.ts) | 基础渲染用法 |
| [animation-example.ts](./examples/animation-example.ts) | 动画系统示例 |
| [particle-system-example.ts](./examples/particle-system-example.ts) | 粒子系统示例 |
| [batch-rendering-example.ts](./examples/batch-rendering-example.ts) | 批量渲染示例 |
| [filter-effects-example.ts](./examples/filter-effects-example.ts) | 滤镜效果示例 |
| [interactive-example.ts](./examples/interactive-example.ts) | 交互示例 |

## 📖 更多文档

- [性能优化指南](./src/performance/README.md)
- [性能测试文档](./src/performance/PERFORMANCE_TESTING.md)
- [资源管理](./src/resources/README.md)
- [图形适配器](./src/graphics/README.md)
- [接口桥接](./src/interface/README.md)
- [富文本渲染](./src/text/RICH_TEXT.md)
- [字体加载](./src/text/FONT_LOADING.md)

## 🛠️ 开发

```bash
# 安装依赖
pnpm install

# 运行测试
pnpm test

# 监听模式测试
pnpm test:watch

# 生成测试覆盖率
pnpm test:coverage

# 构建
pnpm build

# 开发模式
pnpm dev

# 生成 API 文档
pnpm docs
```

## 🤝 贡献

请查看 [CONTRIBUTING.md](./CONTRIBUTING.md) 了解如何参与贡献。

## 📄 许可证

[MIT](./LICENSE) © Sky Canvas Team
