# @sky-canvas/canvas-sdk

<p align="center">
  <strong>框架无关的画布绘制和交互 SDK</strong>
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/@sky-canvas/canvas-sdk"><img src="https://img.shields.io/npm/v/@sky-canvas/canvas-sdk.svg" alt="npm version" /></a>
  <a href="https://github.com/sky-canvas/sky-canvas/blob/main/LICENSE"><img src="https://img.shields.io/npm/l/@sky-canvas/canvas-sdk.svg" alt="License" /></a>
  <img src="https://img.shields.io/badge/TypeScript-100%25-blue" alt="TypeScript" />
</p>

## ✨ 特性

- 🎨 **完整的绘图功能** - 支持形状管理、图层系统、选择系统
- 🎯 **MVVM 架构** - 基于 ViewModel + Manager + Service 的分层架构
- 💉 **依赖注入** - 基于 VSCode DI 架构的依赖注入系统
- 🔧 **工具系统** - 完整的绘图工具（选择、矩形、圆形、线条、文本等）
- 📋 **历史记录** - 完整的撤销/重做功能
- 🎯 **事件系统** - 灵活的事件发射器，支持自定义事件
- 🔌 **插件系统** - 灵活的插件架构，支持扩展点和生命周期管理
- 🤖 **AI 扩展** - 内置 AI 协议支持，便于集成智能功能
- 🚀 **框架无关** - 不依赖任何前端框架，可在任何环境使用
- 💪 **TypeScript** - 100% TypeScript 编写，完整的类型定义
- 🧪 **测试覆盖** - 完善的单元测试覆盖

## 📦 安装

```bash
# npm
npm install @sky-canvas/canvas-sdk @sky-canvas/render-engine

# pnpm
pnpm add @sky-canvas/canvas-sdk @sky-canvas/render-engine

# yarn
yarn add @sky-canvas/canvas-sdk @sky-canvas/render-engine
```

## 🚀 快速开始

### 基础用法

```typescript
import { CanvasSDK } from '@sky-canvas/canvas-sdk';

// 创建 SDK 实例
const sdk = new CanvasSDK();

// 初始化
const canvas = document.getElementById('canvas') as HTMLCanvasElement;
await sdk.initialize(canvas);

// 添加形状
sdk.addShape({
  id: 'rect1',
  type: 'rectangle',
  position: { x: 10, y: 20 },
  size: { width: 100, height: 80 },
  visible: true,
  zIndex: 0
});

// 监听事件
sdk.on('shapeSelected', (event) => {
  console.log('选中形状:', event.shape);
});
```

### 使用依赖注入

```typescript
import { 
  ServiceCollection, 
  InstantiationService,
  IHistoryService,
  ISelectionService 
} from '@sky-canvas/canvas-sdk';

// 创建服务集合
const services = new ServiceCollection();

// 注册服务
services.set(IHistoryService, new HistoryService());
services.set(ISelectionService, new SelectionService());

// 创建实例化服务
const instantiation = new InstantiationService(services);

// 获取服务实例
const historyService = instantiation.invokeFunction(accessor => {
  return accessor.get(IHistoryService);
});
```

### 使用工具系统

```typescript
import { 
  ToolManager,
  SelectToolViewModel,
  RectangleToolViewModel,
  CircleToolViewModel 
} from '@sky-canvas/canvas-sdk';

// 创建工具管理器
const toolManager = new ToolManager();

// 注册工具
toolManager.registerTool('select', new SelectToolViewModel());
toolManager.registerTool('rectangle', new RectangleToolViewModel());
toolManager.registerTool('circle', new CircleToolViewModel());

// 切换工具
toolManager.setActiveTool('rectangle');

// 监听工具切换
toolManager.on('toolChanged', (event) => {
  console.log('当前工具:', event.tool);
});
```

### 使用历史记录

```typescript
import { HistoryService, AddShapeCommand } from '@sky-canvas/canvas-sdk';

const historyService = new HistoryService();

// 执行命令
historyService.execute(new AddShapeCommand(shape));

// 撤销
historyService.undo();

// 重做
historyService.redo();

// 检查状态
console.log('可撤销:', historyService.canUndo());
console.log('可重做:', historyService.canRedo());
```

### 使用插件系统

```typescript
import { 
  PluginManager, 
  PluginContext,
  IPlugin 
} from '@sky-canvas/canvas-sdk';

// 定义插件
const myPlugin: IPlugin = {
  id: 'my-plugin',
  name: 'My Plugin',
  version: '1.0.0',
  
  activate(context: PluginContext) {
    // 注册工具
    context.registerTool('custom-tool', new CustomToolViewModel());
    
    // 注册菜单项
    context.registerMenuItem({
      id: 'my-menu-item',
      label: 'My Action',
      action: () => console.log('Action triggered')
    });
  },
  
  deactivate() {
    // 清理资源
  }
};

// 注册并激活插件
const pluginManager = new PluginManager();
await pluginManager.register(myPlugin);
await pluginManager.activate('my-plugin');
```

## 🏗️ 架构概览

```
src/
├── di/                     # 依赖注入系统
│   ├── InstantiationService.ts
│   ├── ServiceCollection.ts
│   ├── descriptors.ts
│   └── instantiation.ts
│
├── services/               # 服务层
│   ├── clipboard/          # 剪贴板服务
│   ├── configuration/      # 配置服务
│   ├── export/             # 导出服务
│   ├── history/            # 历史记录服务
│   ├── import/             # 导入服务
│   ├── interaction/        # 交互服务
│   ├── logging/            # 日志服务
│   ├── rendering/          # 渲染服务
│   ├── selection/          # 选择服务
│   ├── shape/              # 形状服务
│   ├── shortcut/           # 快捷键服务
│   ├── theme/              # 主题服务
│   ├── zIndex/             # 层级服务
│   └── zoom/               # 缩放服务
│
├── managers/               # 管理器层
│   ├── CanvasManager.ts    # 画布管理器
│   ├── SceneManager.ts     # 场景管理器
│   ├── ToolManager.ts      # 工具管理器
│   └── TransactionManager.ts # 事务管理器
│
├── viewmodels/             # ViewModel 层
│   ├── canvas/             # 画布 ViewModel
│   ├── tools/              # 工具 ViewModel
│   │   ├── selection/      # 选择工具
│   │   ├── ArrowToolViewModel.ts
│   │   ├── CircleToolViewModel.ts
│   │   ├── DrawToolViewModel.ts
│   │   ├── EllipseToolViewModel.ts
│   │   ├── EraserToolViewModel.ts
│   │   ├── HandToolViewModel.ts
│   │   ├── ImageToolViewModel.ts
│   │   ├── LineToolViewModel.ts
│   │   ├── PolygonToolViewModel.ts
│   │   ├── RectangleToolViewModel.ts
│   │   ├── SelectToolViewModel.ts
│   │   ├── StarToolViewModel.ts
│   │   └── TextToolViewModel.ts
│   └── interfaces/         # ViewModel 接口
│
├── models/                 # 数据模型
│   ├── entities/           # 实体定义
│   │   ├── Layer.ts
│   │   ├── Scene.ts
│   │   └── Shape.ts
│   └── types/              # 类型定义
│
├── plugins/                # 插件系统
│   ├── core/               # 插件核心
│   │   ├── ExtensionManager.ts
│   │   ├── PermissionManager.ts
│   │   ├── PluginContext.ts
│   │   └── PluginManager.ts
│   ├── marketplace/        # 插件市场
│   ├── performance/        # 性能监控
│   └── sdk/                # 插件 SDK
│
├── views/                  # 视图层
│   ├── GuideView.ts
│   ├── LayerView.ts
│   ├── SceneView.ts
│   ├── SelectionView.ts
│   └── ShapeView.ts
│
├── ai/                     # AI 扩展
│   ├── protocol.ts         # AI 协议定义
│   └── types.ts            # AI 类型定义
│
└── utils/                  # 工具函数
```

### 分层架构

```
┌─────────────────────────────────────────────────────────────┐
│                        View Layer                            │
│  (React/Vue/Vanilla JS 等任意 UI 框架)                       │
└─────────────────────────┬───────────────────────────────────┘
                          │
┌─────────────────────────┴───────────────────────────────────┐
│                     ViewModel Layer                          │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐          │
│  │ SelectTool  │  │ RectTool    │  │ TextTool    │  ...     │
│  │  ViewModel  │  │  ViewModel  │  │  ViewModel  │          │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘          │
└─────────┼────────────────┼────────────────┼─────────────────┘
          │                │                │
┌─────────┴────────────────┴────────────────┴─────────────────┐
│                      Manager Layer                           │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐          │
│  │   Canvas    │  │    Tool     │  │   Scene     │          │
│  │   Manager   │  │   Manager   │  │   Manager   │          │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘          │
└─────────┼────────────────┼────────────────┼─────────────────┘
          │                │                │
┌─────────┴────────────────┴────────────────┴─────────────────┐
│                      Service Layer                           │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐            │
│  │ History │ │Selection│ │Clipboard│ │Rendering│  ...       │
│  │ Service │ │ Service │ │ Service │ │ Service │            │
│  └─────────┘ └─────────┘ └─────────┘ └─────────┘            │
└─────────────────────────┬───────────────────────────────────┘
                          │
┌─────────────────────────┴───────────────────────────────────┐
│                    DI Container                              │
│              (InstantiationService)                          │
└─────────────────────────────────────────────────────────────┘
```

## 📚 API 文档

### CanvasSDK

画布 SDK 主类，提供完整的画布功能。

```typescript
class CanvasSDK {
  // 初始化
  initialize(canvas: HTMLCanvasElement): Promise<void>;
  
  // 形状管理
  addShape(shape: IShape): void;
  removeShape(id: string): void;
  getShape(id: string): IShape | undefined;
  getShapes(): IShape[];
  updateShape(id: string, updates: Partial<IShape>): void;
  clearShapes(): void;
  
  // 图层管理
  createLayer(id: string, zIndex?: number): IRenderLayer;
  getLayer(id: string): IRenderLayer | undefined;
  removeLayer(id: string): void;
  getLayers(): IRenderLayer[];
  
  // 选择系统
  selectShape(id: string): void;
  deselectShape(id: string): void;
  clearSelection(): void;
  isSelected(id: string): boolean;
  getSelectedShapes(): IShape[];
  
  // 点击测试
  hitTest(point: IPoint): IShape | null;
  
  // 历史记录
  undo(): void;
  redo(): void;
  canUndo(): boolean;
  canRedo(): boolean;
  
  // 事件系统
  on<K extends keyof ICanvasSDKEvents>(event: K, handler: (e: ICanvasSDKEvents[K]) => void): void;
  off<K extends keyof ICanvasSDKEvents>(event: K, handler: (e: ICanvasSDKEvents[K]) => void): void;
  
  // 销毁
  dispose(): void;
}
```

### 事件类型

```typescript
interface ICanvasSDKEvents {
  'shapeAdded': { shape: IShape };
  'shapeRemoved': { shape: IShape };
  'shapeUpdated': { shape: IShape; changes: Partial<IShape> };
  'shapeSelected': { shape: IShape };
  'shapeDeselected': { shape: IShape };
  'selectionCleared': {};
  'toolChanged': { tool: string };
  'historyChanged': { canUndo: boolean; canRedo: boolean };
}
```

### IShape 接口

```typescript
interface IShape {
  readonly id: string;
  readonly type: ShapeType;
  position: IPoint;
  size: ISize;
  visible: boolean;
  zIndex: number;
  
  render(context: IGraphicsContext): void;
  getBounds(): IRect;
  hitTest(point: IPoint): boolean;
  clone(): IShape;
  dispose(): void;
}

type ShapeType = 
  | 'rectangle' 
  | 'circle' 
  | 'ellipse' 
  | 'line' 
  | 'arrow' 
  | 'polygon' 
  | 'star' 
  | 'text' 
  | 'image' 
  | 'path';
```

### 工具 ViewModel

```typescript
interface IToolViewModel {
  readonly id: string;
  readonly name: string;
  readonly icon: string;
  
  activate(): void;
  deactivate(): void;
  
  onPointerDown(event: IPointerEvent): void;
  onPointerMove(event: IPointerEvent): void;
  onPointerUp(event: IPointerEvent): void;
  onKeyDown(event: IKeyboardEvent): void;
  onKeyUp(event: IKeyboardEvent): void;
}
```

## 📖 更多文档

- [架构设计](./docs/ARCHITECTURE.md) - SDK 分层架构详解
- [MVVM 集成指南](./docs/MVVM_INTEGRATION.md) - MVVM 模式使用指南
- [MVVM 架构指南](./docs/MVVM-Architecture-Guide.md) - 架构最佳实践
- [类型导出](./docs/TYPE_EXPORTS.md) - 类型定义说明
- [AI 扩展](./src/ai/README.md) - AI 协议与集成

## 🎮 示例

查看 [examples](./examples/) 目录获取更多示例：

| 示例 | 描述 |
|------|------|
| [di-demo.ts](./examples/di-demo.ts) | 依赖注入示例 |

## 🛠️ 开发

```bash
# 安装依赖
pnpm install

# 运行测试
pnpm test

# 监听模式测试
pnpm test:watch

# 构建
pnpm build

# 开发模式
pnpm dev
```

## 📋 路线图

- [x] 基础 SDK 架构
- [x] 形状管理系统
- [x] 图层管理系统
- [x] 选择系统
- [x] 历史记录系统
- [x] 事件系统
- [x] 依赖注入系统
- [x] 工具系统（选择、矩形、圆形、线条、文本等）
- [x] 插件系统
- [x] AI 扩展协议
- [ ] 插件市场
- [ ] 更多导入/导出格式
- [ ] 协作编辑支持

## 🤝 贡献

请查看 [CONTRIBUTING.md](../../CONTRIBUTING.md) 了解如何参与贡献。

## 📄 许可证

[MIT](./LICENSE) © Sky Canvas Team
