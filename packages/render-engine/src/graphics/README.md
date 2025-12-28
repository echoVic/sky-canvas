# 框架无关渲染引擎

这是一个基于抽象接口设计的框架无关渲染引擎，支持多种渲染后端（Canvas2D、WebGL等），提供统一的API接口。

## 🎯 设计目标

- **框架无关性**: 不依赖特定的渲染框架或库
- **多后端支持**: 支持Canvas2D、WebGL等多种渲染后端
- **统一API**: 提供一致的渲染接口，简化开发
- **高性能**: 支持批处理、视锥剔除等优化技术
- **可扩展性**: 易于添加新的渲染后端和功能

## 📁 架构概览

```
src/engine/graphics/
├── IGraphicsContext.ts          # 核心图形上下文接口
├── RenderCommand.ts             # 渲染命令系统
├── FrameworkAgnosticRenderEngine.ts  # 框架无关渲染引擎
├── adapters/                    # 渲染适配器
│   ├── Canvas2DAdapter.ts       # Canvas2D适配器
│   ├── WebGLAdapter.ts          # WebGL适配器
│   └── index.ts                 # 适配器统一导出
└── index.ts                     # 模块统一导出
```

## 🏗️ 核心组件

### 1. 图形上下文接口 (IGraphicsContext)

定义了框架无关的图形渲染接口，包括：

- **基础类型**: `IPoint`, `ISize`, `IRect`, `IColor`
- **样式接口**: `IGraphicsStyle`, `ITextStyle`
- **核心接口**: `IGraphicsContext` - 提供统一的渲染API

```typescript
interface IGraphicsContext {
  // 状态管理
  save(): void;
  restore(): void;
  
  // 变换操作
  translate(x: number, y: number): void;
  rotate(angle: number): void;
  scale(x: number, y: number): void;
  
  // 样式设置
  setStyle(style: Partial<IGraphicsStyle>): void;
  setTextStyle(style: Partial<ITextStyle>): void;
  
  // 基础绘制
  fillRect(x: number, y: number, width: number, height: number): void;
  strokeRect(x: number, y: number, width: number, height: number): void;
  clearRect(x: number, y: number, width: number, height: number): void;
  
  // 路径绘制
  beginPath(): void;
  moveTo(x: number, y: number): void;
  lineTo(x: number, y: number): void;
  arc(x: number, y: number, radius: number, startAngle: number, endAngle: number): void;
  fill(): void;
  stroke(): void;
  
  // 文本渲染
  fillText(text: string, x: number, y: number): void;
  strokeText(text: string, x: number, y: number): void;
  measureText(text: string): { width: number; height: number };
  
  // 图像处理
  drawImage(image: IImageData, x: number, y: number): void;
  drawImage(image: IImageData, x: number, y: number, width: number, height: number): void;
  
  // 裁剪和变换
  clip(): void;
  screenToWorld(point: IPoint): IPoint;
  worldToScreen(point: IPoint): IPoint;
  
  // 资源管理
  dispose(): void;
}
```

### 2. 渲染命令系统 (RenderCommand)

基于命令模式的渲染系统，支持：

- **命令缓存**: 将渲染操作封装为命令对象
- **批处理**: 优化渲染性能
- **回放**: 支持渲染命令的重复执行

```typescript
interface IRenderCommand {
  execute(context: IGraphicsContext): void;
}

// 示例命令
class FillRectCommand implements IRenderCommand {
  constructor(
    private x: number,
    private y: number, 
    private width: number,
    private height: number
  ) {}
  
  execute(context: IGraphicsContext): void {
    context.fillRect(this.x, this.y, this.width, this.height);
  }
}
```

### 3. 框架无关渲染引擎 (FrameworkAgnosticRenderEngine)

核心渲染引擎，提供：

- **多层渲染**: 支持分层渲染管理
- **视口控制**: 支持缩放、平移等视口操作
- **性能优化**: 视锥剔除、批处理等优化
- **交互支持**: 点击测试、碰撞检测等

```typescript
class FrameworkAgnosticRenderEngine {
  // 初始化
  async initialize<TCanvas>(factory: IGraphicsContextFactory<TCanvas>, canvas: TCanvas): Promise<void>
  
  // 渲染控制
  start(): void
  stop(): void
  render(): void
  
  // 层管理
  createLayer(id: string, zIndex?: number): IRenderLayer
  getLayer(id: string): IRenderLayer | undefined
  removeLayer(id: string): void
  
  // 视口控制
  setViewport(viewport: Partial<IViewport>): void
  getViewport(): IViewport
  
  // 交互支持
  hitTest(point: IPoint): IRenderable | null
  screenToWorld(point: IPoint): IPoint
  worldToScreen(point: IPoint): IPoint
  
  // 性能监控
  getStats(): IRenderStats
}
```

### 4. 渲染适配器 (Adapters)

#### Canvas2D适配器
- 基于HTML5 Canvas 2D API
- 完整实现所有图形上下文接口
- 高兼容性，支持所有现代浏览器

#### WebGL适配器
- 基于WebGL API
- 高性能硬件加速渲染
- 支持复杂的图形效果

## 🚀 快速开始

### 1. 基础使用

```typescript
import { createRenderEngine, GraphicsAdapterType } from './engine/graphics';

// 创建渲染引擎
const engine = await createRenderEngine({
  canvas: document.getElementById('canvas'),
  adapterType: GraphicsAdapterType.CANVAS_2D,
  autoRender: true,
  targetFPS: 60
});

// 创建渲染层
const layer = engine.createLayer('main', 0);

// 创建渲染对象
class Rectangle implements IRenderable {
  render(context: IGraphicsContext): void {
    context.setStyle({ fillColor: '#ff0000' });
    context.fillRect(this.x, this.y, this.width, this.height);
  }
  
  // 实现其他必需方法...
}

// 添加对象到层
const rect = new Rectangle('rect1', 50, 50, 100, 80);
layer.addRenderable(rect);
```

### 2. 多适配器支持

```typescript
// 自动选择最佳适配器
const engine = await createRenderEngine({
  canvas,
  // 不指定adapterType，自动选择
});

// 或者指定特定适配器
const webglEngine = await createRenderEngine({
  canvas,
  adapterType: GraphicsAdapterType.WEBGL
});
```

### 3. 渲染命令使用

```typescript
import { RenderCommandBuilder } from './engine/graphics';

// 使用命令构建器
const commands = new RenderCommandBuilder()
  .save()
  .setStyle({ fillColor: '#00ff00' })
  .fillRect(100, 100, 50, 50)
  .restore()
  .build();

// 添加命令到引擎
engine.addCommands(commands);
```

## 🎨 示例

查看 `examples/framework-agnostic-rendering.html` 获取完整的使用示例，包括：

- Canvas2D和WebGL渲染对比
- 交互式图形操作
- 性能监控
- 动画效果

## 🔧 配置选项

### RenderEngineOptions

```typescript
interface RenderEngineOptions<TCanvas = unknown> {
  canvas: TCanvas;                    // 画布对象
  adapterType?: GraphicsAdapterType;  // 适配器类型
  autoRender?: boolean;               // 自动渲染
  targetFPS?: number;                 // 目标帧率
}
```

### IRenderEngineConfig

```typescript
interface IRenderEngineConfig {
  targetFPS?: number;        // 目标帧率 (默认: 60)
  enableVSync?: boolean;     // 启用垂直同步 (默认: true)
  enableBatching?: boolean;  // 启用批处理 (默认: true)
  enableCulling?: boolean;   // 启用视锥剔除 (默认: true)
  maxBatchSize?: number;     // 最大批处理大小 (默认: 1000)
  cullMargin?: number;       // 剔除边距 (默认: 50)
}
```

## 🎯 性能优化

### 1. 视锥剔除
引擎自动剔除视口外的对象，减少不必要的渲染。

### 2. 批处理
将多个渲染命令合并为批次，减少API调用次数。

### 3. 对象池
重用渲染对象，减少内存分配和垃圾回收。

### 4. 分层渲染
按层级组织渲染对象，优化渲染顺序。

## 🔌 扩展性

### 添加新的渲染适配器

1. 实现 `IGraphicsContext` 接口
2. 实现 `IGraphicsContextFactory` 接口
3. 在适配器注册表中注册新适配器

```typescript
// 示例：添加SVG适配器
class SVGGraphicsContext implements IGraphicsContext {
  // 实现所有接口方法
}

class SVGGraphicsContextFactory implements IGraphicsContextFactory<SVGElement> {
  async createContext(canvas: SVGElement): Promise<IGraphicsContext> {
    return new SVGGraphicsContext(canvas);
  }
  
  async isSupported(): Promise<boolean> {
    return typeof SVGElement !== 'undefined';
  }
}

// 注册适配器
ADAPTER_FACTORIES.set(GraphicsAdapterType.SVG, SVGGraphicsContextFactory);
```

## 📊 性能监控

引擎提供详细的性能统计信息：

```typescript
interface IRenderStats {
  frameCount: number;      // 帧数
  fps: number;            // 帧率
  renderTime: number;     // 渲染时间(ms)
  objectsRendered: number; // 渲染对象数
  commandsExecuted: number; // 执行命令数
}

// 获取统计信息
const stats = engine.getStats();
console.log(`FPS: ${stats.fps}, 渲染时间: ${stats.renderTime}ms`);
```

## 🤝 贡献

欢迎贡献代码！请确保：

1. 遵循现有的代码风格
2. 添加适当的测试
3. 更新相关文档
4. 确保所有测试通过

## 📄 许可证

MIT License