# @sky-canvas/canvas-sdk

框架无关的画布绘制和交互SDK

## 特性

- 🎨 **完整的绘图功能** - 支持形状管理、图层系统、选择系统
- 📝 **历史记录管理** - 完整的撤销/重做功能
- 🎯 **事件系统** - 灵活的事件发射器，支持自定义事件
- 🔌 **可扩展架构** - 支持插件和AI扩展
- 🚀 **框架无关** - 不依赖任何前端框架，可在任何环境使用
- 💡 **TypeScript支持** - 完整的类型定义和类型安全
- 🧪 **测试覆盖** - 完善的单元测试覆盖

## 安装

```bash
npm install @sky-canvas/canvas-sdk @sky-canvas/render-engine
```

## 快速开始

```typescript
import { CanvasSDK } from '@sky-canvas/canvas-sdk';

// 创建SDK实例
const sdk = new CanvasSDK();

// 初始化
const canvas = document.getElementById('canvas') as HTMLCanvasElement;
await sdk.initialize(canvas);

// 添加形状
const rect = {
  id: 'rect1',
  type: 'rectangle' as const,
  position: { x: 10, y: 20 },
  size: { width: 100, height: 80 },
  visible: true,
  zIndex: 0,
  render: (context) => { /* 渲染逻辑 */ },
  getBounds: () => ({ x: 10, y: 20, width: 100, height: 80 }),
  hitTest: (point) => { /* 点击测试逻辑 */ },
  clone: () => { /* 克隆逻辑 */ },
  dispose: () => { /* 清理逻辑 */ }
};

sdk.addShape(rect);
```

## API 文档

### CanvasSDK

画布SDK主类，提供完整的画布功能

#### 初始化

```typescript
await sdk.initialize(canvas: HTMLCanvasElement)
```

#### 形状管理

```typescript
// 添加形状
sdk.addShape(shape: IShape): void

// 移除形状
sdk.removeShape(id: string): void

// 获取形状
sdk.getShape(id: string): IShape | undefined

// 获取所有形状
sdk.getShapes(): IShape[]

// 更新形状
sdk.updateShape(id: string, updates: IShapeUpdate): void

// 清空所有形状
sdk.clearShapes(): void
```

#### 图层管理

```typescript
// 创建图层
sdk.createLayer(id: string, zIndex?: number): IRenderLayer

// 获取图层
sdk.getLayer(id: string): IRenderLayer | undefined

// 移除图层
sdk.removeLayer(id: string): void

// 获取所有图层
sdk.getLayers(): IRenderLayer[]
```

#### 选择系统

```typescript
// 选择形状
sdk.selectShape(id: string): void

// 取消选择
sdk.deselectShape(id: string): void

// 清空选择
sdk.clearSelection(): void

// 检查是否选中
sdk.isSelected(id: string): boolean

// 获取选中的形状
sdk.getSelectedShapes(): IShape[]
```

#### 点击测试

```typescript
// 点击测试
sdk.hitTest(point: IPoint): IShape | null
```

#### 历史记录

```typescript
// 撤销
sdk.undo(): void

// 重做
sdk.redo(): void

// 检查状态
sdk.canUndo(): boolean
sdk.canRedo(): boolean
```

#### 事件系统

```typescript
// 监听事件
sdk.on('shapeAdded', (event) => {
  console.log('形状已添加:', event.shape);
});

sdk.on('shapeSelected', (event) => {
  console.log('形状已选中:', event.shape);
});

// 取消监听
sdk.off('shapeAdded', handler);
```

### 接口定义

#### IShape

```typescript
interface IShape {
  readonly id: string;
  readonly type: ShapeType;
  position: IPoint;
  size: ISize;
  visible: boolean;
  zIndex: number;
  
  render(context: any): void;
  getBounds(): IRect;
  hitTest(point: IPoint): boolean;
  clone(): IShape;
  dispose(): void;
}
```

#### 事件类型

```typescript
interface ICanvasSDKEvents {
  'shapeAdded': IShapeEvent;
  'shapeRemoved': IShapeEvent;
  'shapeUpdated': IShapeEvent;
  'shapeSelected': IShapeSelectionEvent;
  'shapeDeselected': IShapeSelectionEvent;
  'selectionCleared': {};
}
```

## 架构设计

SDK 采用模块化设计：

```
src/
├── core/           # 核心功能
│   ├── CanvasSDK.ts
│   └── HistoryManager.ts
├── scene/          # 场景管理
│   └── IShape.ts
├── events/         # 事件系统
│   └── EventEmitter.ts
├── interaction/    # 交互系统
├── ai/             # AI扩展
├── plugins/        # 插件系统
├── tools/          # 工具系统
└── utils/          # 工具函数
```

## 开发

```bash
# 安装依赖
pnpm install

# 运行测试
pnpm test

# 构建
pnpm build

# 开发模式
pnpm dev
```

## 路线图

- [x] 基础SDK架构
- [x] 形状管理系统
- [x] 图层管理系统
- [x] 选择系统
- [x] 历史记录系统
- [x] 事件系统
- [ ] 交互系统完善
- [ ] 绘图工具系统
- [ ] AI扩展协议
- [ ] 插件市场
- [ ] 性能优化

## 许可证

MIT License