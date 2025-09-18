# @sky-canvas/render-engine

高性能的框架无关图形渲染引擎

## 特性

- 🚀 **框架无关** - 不依赖任何前端框架，可在任何 JavaScript 环境中使用
- 🎨 **多适配器支持** - 支持 Canvas2D、WebGL、WebGPU 等多种渲染后端
- ⚡ **高性能** - 批量渲染、视锥剔除、内存优化等性能特性
- 🔧 **类型安全** - 完整的 TypeScript 支持
- 🧪 **测试覆盖** - 完善的单元测试覆盖
- 🎭 **丰富特效** - 内置滤镜、混合、灯光、蒙版等视觉效果
- ⚙️ **模块化架构** - 清晰的模块分层，易于扩展和维护

## 架构概览

```
src/
├── core/           # 核心渲染系统
│   ├── context/    # 渲染上下文
│   ├── engine/     # 渲染引擎
│   ├── interface/  # 核心接口定义
│   └── webgl/      # WebGL实现
├── features/       # 功能模块
│   ├── animation/  # 动画系统
│   ├── editor/     # 场景编辑器
│   ├── effects/    # 视觉效果
│   ├── interaction/# 交互系统
│   ├── particles/  # 粒子系统
│   ├── physics/    # 物理引擎
│   ├── plugins/    # 插件系统
│   ├── paths/      # 路径处理
│   └── text/       # 文本渲染
├── rendering/      # 渲染管线
│   ├── batch/      # 批处理系统
│   ├── commands/   # 渲染命令
│   ├── culling/    # 视锥剔除
│   └── primitives/ # 图形原语
├── math/          # 数学库
├── resources/     # 资源管理
│   └── textures/  # 纹理管理
├── performance/   # 性能监控
└── utils/         # 工具函数
```

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

### 核心模块

#### Vector2

2D向量数学库

```typescript
import { MathUtils } from '@sky-canvas/render-engine';

const v1 = new MathUtils.Vector2(1, 2);
const v2 = new MathUtils.Vector2(3, 4);
const sum = v1.add(v2);
const length = v1.length();
const normalized = v1.normalize();
```

#### 批处理渲染

```typescript
import { BatchManager, BasicStrategy } from '@sky-canvas/render-engine';

const batchManager = new BatchManager();
batchManager.setStrategy(new BasicStrategy());

// 添加渲染对象到批次
batchManager.addToBatch(renderObject);
batchManager.render(context);
```

#### 视觉效果

```typescript
import { FilterManager, GaussianBlurFilter, DropShadowFilter } from '@sky-canvas/render-engine';

const filterManager = new FilterManager();

// 添加滤镜
filterManager.addFilter(new GaussianBlurFilter({ radius: 5 }));
filterManager.addFilter(new DropShadowFilter({
  offsetX: 2,
  offsetY: 2,
  blur: 4,
  color: 'rgba(0,0,0,0.5)'
}));

// 应用滤镜
filterManager.applyFilters(imageData, context);
```

#### 动画系统

```typescript
import { AnimationManager, PropertyAnimation } from '@sky-canvas/render-engine';

const animationManager = new AnimationManager();

// 创建属性动画
const animation = new PropertyAnimation({
  target: sprite,
  property: 'x',
  from: 0,
  to: 100,
  duration: 1000,
  easing: 'easeInOut'
});

animationManager.addAnimation(animation);
animationManager.start();
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