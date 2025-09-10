# MVVM架构集成指南

## 概述

我们已经成功将MVVM（Model-View-ViewModel）架构模式集成到现有的Canvas SDK中，而不是创建一个独立的SDK。这种设计保持了现有的依赖注入（DI）架构，同时提供了现代化的MVVM模式支持。

## 架构原理

### 为什么采用这种设计

1. **与现有架构兼容**：MVVM模式通过DI服务提供，不破坏现有的CanvasSDK架构
2. **渐进式采用**：用户可以选择性地启用MVVM模式，或者同时使用传统API和MVVM API
3. **服务导向**：MVVM组件作为DI服务注册，可以被其他服务依赖和扩展
4. **类型安全**：完整的TypeScript支持，提供类型安全的API

### 架构层次

```
CanvasSDK (原有DI架构)
    ├── 传统服务 (EventBus, Logger, etc.)
    ├── MVVM服务层
    │   ├── IShapeRepositoryService (数据层)
    │   └── ICanvasViewModelService (业务逻辑层)
    └── MVVM扩展 (CanvasSDKMVVMExtension)
        └── 统一的MVVM API
```

## 使用方式

### 1. 自动启用MVVM模式（推荐）

```typescript
import { createMVVMCanvasSDK } from '@sky-canvas/canvas-sdk';

const canvas = document.getElementById('canvas') as HTMLCanvasElement;

// 自动创建启用MVVM模式的SDK
const sdk = await createMVVMCanvasSDK(canvas, {
  renderEngine: 'canvas2d',
  enableInteraction: true
}, {
  enableMVVM: true, // 默认就是true
  initialViewport: {
    width: canvas.width,
    height: canvas.height
  }
});

// 使用MVVM API
const rectangle = sdk.mvvm!.createRectangle(100, 100, 150, 80);
rectangle.style.fillColor = '#ff6b6b';
await sdk.mvvm!.addShape(rectangle);
```

### 2. 手动启用MVVM模式

```typescript
import { createCanvasSDK, addMVVMExtension } from '@sky-canvas/canvas-sdk';

const canvas = document.getElementById('canvas') as HTMLCanvasElement;

// 创建传统SDK
const sdk = await createCanvasSDK(canvas);

// 手动添加MVVM扩展
const mvvmExtension = addMVVMExtension(sdk);
await mvvmExtension.enable();

// 将扩展附加到SDK
sdk.mvvm = mvvmExtension;

// 现在可以使用MVVM API
await sdk.mvvm.addShape(rectangle);
```

### 3. 混合使用传统API和MVVM API

```typescript
const sdk = await createMVVMCanvasSDK(canvas);

// 使用MVVM API
const shape = sdk.mvvm!.createCircle(200, 200, 50);
await sdk.mvvm!.addShape(shape);

// 同时使用传统API
sdk.on('shape:added', (data) => {
  console.log('传统事件:', data);
});

// 两种API可以共存
```

## MVVM组件说明

### Model层 (数据层)

#### ShapeEntity (实体)
```typescript
interface IShapeEntity {
  id: string;
  type: string;
  transform: ITransform;
  style: IStyle;
  visible: boolean;
  zIndex: number;
  locked: boolean;
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}
```

#### IShapeRepository (仓储)
```typescript
interface IShapeRepository {
  add(shape: ShapeEntity): Promise<ShapeEntity>;
  getById(id: string): Promise<ShapeEntity | null>;
  update(id: string, updates: Partial<ShapeEntity>): Promise<ShapeEntity | null>;
  remove(id: string): Promise<boolean>;
  // ... 更多方法
}
```

### ViewModel层 (业务逻辑层)

#### CanvasViewModel
```typescript
class CanvasViewModel {
  getState(): Readonly<ICanvasState>;
  addShape(shape: ShapeEntity): Promise<void>;
  selectShape(id: string): void;
  setViewport(viewport: Partial<IViewportState>): void;
  // ... 更多方法
}
```

#### ICanvasViewModelService (DI服务)
```typescript
interface ICanvasViewModelService {
  initialize(initialViewport?: Partial<IViewportState>): Promise<void>;
  getState(): Readonly<ICanvasState> | null;
  addShape(shape: ShapeEntity): Promise<void>;
  selectShape(id: string): void;
  // ... 更多方法
}
```

### View层 (视图层)

#### ICanvasView (视图抽象)
```typescript
interface ICanvasView {
  initialize(canvas: HTMLCanvasElement, config?: ICanvasViewConfig): Promise<void>;
  render(shapes: ShapeEntity[], viewport: IViewportState): Promise<void>;
  // ... 更多方法
}
```

## API参考

### 形状操作
```typescript
// 创建形状
const rect = sdk.mvvm!.createRectangle(x, y, width, height);
const circle = sdk.mvvm!.createCircle(x, y, radius);
const text = sdk.mvvm!.createText(x, y, content);
const path = sdk.mvvm!.createPath(pathData, x, y);

// 添加形状
await sdk.mvvm!.addShape(shape);
await sdk.mvvm!.addShapes([shape1, shape2]);

// 更新形状
await sdk.mvvm!.updateShape(id, { visible: false });

// 删除形状
await sdk.mvvm!.removeShape(id);
await sdk.mvvm!.removeShapes([id1, id2]);
await sdk.mvvm!.clearShapes();
```

### 选择操作
```typescript
// 选择
sdk.mvvm!.selectShape(id);
sdk.mvvm!.selectShapes([id1, id2]);
sdk.mvvm!.selectAll();

// 取消选择
sdk.mvvm!.deselectShape(id);
sdk.mvvm!.clearSelection();

// 获取选中形状
const selected = sdk.mvvm!.getSelectedShapes();
```

### 视口操作
```typescript
// 设置视口
sdk.mvvm!.setViewport({ x: 0, y: 0, zoom: 1.5 });

// 缩放
sdk.mvvm!.zoomIn();
sdk.mvvm!.zoomOut();
sdk.mvvm!.resetZoom();

// 平移
sdk.mvvm!.panViewport(deltaX, deltaY);
```

### 工具操作
```typescript
// 设置当前工具
sdk.mvvm!.setCurrentTool('select');
sdk.mvvm!.setCurrentTool('rectangle');

// 获取当前工具
const tool = sdk.mvvm!.getCurrentTool();
```

### 事件订阅
```typescript
// 监听状态变化
const unsubscribe1 = sdk.mvvm!.onStateChanged((state, changes) => {
  console.log('状态变化:', changes);
});

// 监听选择变化
const unsubscribe2 = sdk.mvvm!.onSelectionChanged((selectedIds) => {
  console.log('选择变化:', selectedIds);
});

// 监听视口变化
const unsubscribe3 = sdk.mvvm!.onViewportChanged((viewport) => {
  console.log('视口变化:', viewport);
});

// 取消订阅
unsubscribe1();
unsubscribe2();
unsubscribe3();
```

### 统计信息
```typescript
// 获取仓储统计
const stats = await sdk.mvvm!.getStats();
console.log('总形状数:', stats.total);
console.log('按类型分组:', stats.byType);
console.log('可见形状数:', stats.visible);

// 获取当前状态
const state = sdk.mvvm!.getState();
console.log('当前选择:', state?.selectedShapes);
console.log('当前视口:', state?.viewport);
```

## 完整示例

```typescript
import { 
  createMVVMCanvasSDK, 
  IntegratedMVVMExample,
  runIntegratedMVVMExample 
} from '@sky-canvas/canvas-sdk';

// 方式1: 使用预制示例
await runIntegratedMVVMExample();

// 方式2: 手动创建
const canvas = document.getElementById('canvas') as HTMLCanvasElement;
const sdk = await createMVVMCanvasSDK(canvas);

// 创建并添加形状
const shapes = [
  sdk.mvvm!.createRectangle(100, 100, 150, 80),
  sdk.mvvm!.createCircle(300, 140, 40),
  sdk.mvvm!.createText(150, 250, 'Hello MVVM!')
];

// 设置样式
shapes[0].style.fillColor = '#ff6b6b';
shapes[1].style.fillColor = '#4ecdc4';
shapes[2].style.fillColor = '#45b7d1';

// 添加到画布
await sdk.mvvm!.addShapes(shapes);

// 选择第一个形状
sdk.mvvm!.selectShape(shapes[0].id);

// 监听事件
sdk.mvvm!.onSelectionChanged((selectedIds) => {
  console.log('当前选择:', selectedIds);
});

console.log('MVVM Canvas SDK 初始化完成！');
```

## 优势

1. **渐进式迁移**：现有项目可以逐步采用MVVM模式，无需重写
2. **类型安全**：完整的TypeScript支持
3. **测试友好**：MVVM组件独立，便于单元测试
4. **可扩展性**：基于DI架构，易于扩展新功能
5. **状态管理**：集中的状态管理，便于调试和监控
6. **事件驱动**：响应式的数据变化通知

## 与传统API的区别

| 特性 | 传统API | MVVM API |
|------|---------|----------|
| 状态管理 | 分散在各个服务 | 集中在ViewModel |
| 数据持久化 | 服务层处理 | Repository模式 |
| 事件系统 | 全局事件总线 | 类型化的事件订阅 |
| 测试性 | 需要完整SDK | 可独立测试组件 |
| 类型安全 | 部分类型化 | 完全类型化 |
| 学习曲线 | 需了解DI架构 | 标准MVVM模式 |

这种设计完美地将现代的MVVM架构模式与现有的DI系统结合，提供了最佳的开发体验。