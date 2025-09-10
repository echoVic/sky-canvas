# MVVM 架构开发指南

## 概述

Sky Canvas SDK 采用现代化的 MVVM (Model-View-ViewModel) 架构，提供了清晰的数据流和组件间的解耦。本文档将详细介绍如何使用这个 MVVM 架构进行开发。

## 架构概览

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│      View       │    │   ViewModel     │    │      Model      │
│                 │    │                 │    │                 │
│ • CanvasView    │◄──►│ • ShapeViewModel│◄──►│ • ShapeModel    │
│ • ToolbarView   │    │ • ToolViewModel │    │ • SceneModel    │
│ • Custom Views  │    │ • SceneViewModel│    │ • ToolModel     │
│                 │    │ • ViewportVM    │    │                 │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         ▲                        ▲                        ▲
         │                        │                        │
         │                        │                        ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│ View Binding    │    │   MVVM Manager  │    │   Repository    │
│   System        │    │                 │    │                 │
│ • ViewBinder    │    │ • Lifecycle     │    │ • ShapeRepo     │
│ • ViewManager   │    │ • Coordination  │    │ • SceneRepo     │
│ • Reactive      │    │ • State Mgmt    │    │ • Persistence   │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## 快速开始

### 1. 基础设置

```typescript
import { 
  createMVVMManager, 
  createViewManager, 
  createCanvasSDK 
} from '@sky-canvas/canvas-sdk';

// 创建 MVVM 管理器
const mvvmManager = createMVVMManager({
  debug: true,
  autoSaveInterval: 30000
});

// 初始化
await mvvmManager.initialize();

// 创建视图管理器
const viewManager = createViewManager(mvvmManager);
```

### 2. 创建和使用 ViewModel

```typescript
// 获取预定义的 ViewModel
const shapeViewModel = mvvmManager.getShapeViewModel();
const toolViewModel = mvvmManager.getToolViewModel();

// 添加图形
await shapeViewModel.addShape({
  id: 'rect1',
  type: 'rectangle',
  data: { x: 10, y: 20, width: 100, height: 50 }
});

// 监听状态变化
shapeViewModel.on('shape:added', (shape) => {
  console.log('Shape added:', shape);
});
```

### 3. 创建和绑定视图

```typescript
// 创建 Canvas 视图
const canvas = document.getElementById('canvas') as HTMLCanvasElement;
const canvasViewId = viewManager.createView({
  type: 'canvas',
  name: 'MainCanvas',
  container: canvas,
  viewModel: mvvmManager.getCanvasViewModel(),
  autoMount: true
});

// 创建工具栏视图
const toolbar = document.getElementById('toolbar') as HTMLElement;
const toolbarViewId = viewManager.createView({
  type: 'toolbar',
  name: 'MainToolbar',
  container: toolbar,
  viewModel: mvvmManager.getToolViewModel(),
  autoMount: true
});
```

## 核心概念

### Model 层

Model 层负责数据的定义和基本操作。

#### 创建自定义 Model

```typescript
import { BaseModel } from '@sky-canvas/canvas-sdk';

interface CustomShapeData {
  id: string;
  type: string;
  position: { x: number; y: number };
  size: { width: number; height: number };
  style: {
    fill?: string;
    stroke?: string;
    strokeWidth?: number;
  };
}

class CustomShapeModel extends BaseModel<CustomShapeData> {
  constructor(data: CustomShapeData) {
    super(data);
  }

  // 自定义方法
  move(deltaX: number, deltaY: number): void {
    const currentPos = this.getData().position;
    this.updateData({
      position: {
        x: currentPos.x + deltaX,
        y: currentPos.y + deltaY
      }
    });
  }

  resize(width: number, height: number): void {
    this.updateData({
      size: { width, height }
    });
  }

  getBounds(): { x: number; y: number; width: number; height: number } {
    const { position, size } = this.getData();
    return {
      x: position.x,
      y: position.y,
      width: size.width,
      height: size.height
    };
  }
}
```

#### 创建 Repository

```typescript
import { BaseRepository } from '@sky-canvas/canvas-sdk';

class CustomShapeRepository extends BaseRepository<CustomShapeModel> {
  private shapes = new Map<string, CustomShapeModel>();

  async findById(id: string): Promise<CustomShapeModel | null> {
    return this.shapes.get(id) || null;
  }

  async findAll(): Promise<CustomShapeModel[]> {
    return Array.from(this.shapes.values());
  }

  async create(data: CustomShapeData): Promise<CustomShapeModel> {
    const model = new CustomShapeModel(data);
    this.shapes.set(data.id, model);
    return model;
  }

  async update(id: string, updates: Partial<CustomShapeData>): Promise<CustomShapeModel | null> {
    const model = this.shapes.get(id);
    if (!model) return null;

    model.updateData(updates);
    return model;
  }

  async delete(id: string): Promise<boolean> {
    return this.shapes.delete(id);
  }

  // 自定义查询方法
  async findByType(type: string): Promise<CustomShapeModel[]> {
    return Array.from(this.shapes.values())
      .filter(shape => shape.getData().type === type);
  }

  async findInBounds(bounds: { x: number; y: number; width: number; height: number }): Promise<CustomShapeModel[]> {
    return Array.from(this.shapes.values())
      .filter(shape => {
        const shapeBounds = shape.getBounds();
        return shapeBounds.x >= bounds.x && 
               shapeBounds.y >= bounds.y &&
               shapeBounds.x + shapeBounds.width <= bounds.x + bounds.width &&
               shapeBounds.y + shapeBounds.height <= bounds.y + bounds.height;
      });
  }
}
```

### ViewModel 层

ViewModel 层是 MVVM 架构的核心，负责业务逻辑和状态管理。

#### 创建自定义 ViewModel

```typescript
import { BaseRepositoryViewModel, reactive, command, computed } from '@sky-canvas/canvas-sdk';

class CustomShapeViewModel extends BaseRepositoryViewModel<CustomShapeModel, CustomShapeRepository> {
  constructor(repository: CustomShapeRepository) {
    super(repository, {
      debug: true,
      autoSave: true
    });
  }

  // 响应式属性
  @reactive({ defaultValue: null })
  selectedShapeId: string | null = null;

  @reactive({ defaultValue: { x: 0, y: 0, scale: 1 } })
  viewport: { x: number; y: number; scale: number } = { x: 0, y: 0, scale: 1 };

  // 计算属性
  @computed
  get selectedShape(): CustomShapeModel | null {
    if (!this.selectedShapeId) return null;
    return this.getItem(this.selectedShapeId);
  }

  @computed
  get visibleShapes(): CustomShapeModel[] {
    return this.getAllItems().filter(shape => this.isShapeVisible(shape));
  }

  // 命令方法
  @command({ async: true })
  async createShape(type: string, position: { x: number; y: number }): Promise<CustomShapeModel> {
    const id = `${type}_${Date.now()}`;
    const shapeData: CustomShapeData = {
      id,
      type,
      position,
      size: { width: 100, height: 100 },
      style: {
        fill: 'transparent',
        stroke: '#000000',
        strokeWidth: 2
      }
    };

    const shape = await this.repository.create(shapeData);
    this.addItem(shape);
    this.emit('shape:created', shape);
    
    return shape;
  }

  @command({ async: true })
  async selectShape(shapeId: string): Promise<void> {
    const shape = await this.getItem(shapeId);
    if (shape) {
      this.selectedShapeId = shapeId;
      this.emit('shape:selected', shape);
    }
  }

  @command({ async: true })
  async moveSelectedShape(deltaX: number, deltaY: number): Promise<void> {
    const shape = this.selectedShape;
    if (shape) {
      shape.move(deltaX, deltaY);
      await this.updateItem(shape.getId(), shape.getData());
      this.emit('shape:moved', shape);
    }
  }

  @command()
  setViewport(viewport: { x: number; y: number; scale: number }): void {
    this.viewport = viewport;
    this.emit('viewport:changed', viewport);
  }

  // 私有方法
  private isShapeVisible(shape: CustomShapeModel): boolean {
    const bounds = shape.getBounds();
    const viewBounds = this.getViewBounds();
    
    return !(bounds.x + bounds.width < viewBounds.x ||
             bounds.y + bounds.height < viewBounds.y ||
             bounds.x > viewBounds.x + viewBounds.width ||
             bounds.y > viewBounds.y + viewBounds.height);
  }

  private getViewBounds(): { x: number; y: number; width: number; height: number } {
    // 基于视口计算可见区域
    return {
      x: -this.viewport.x / this.viewport.scale,
      y: -this.viewport.y / this.viewport.scale,
      width: 800 / this.viewport.scale,
      height: 600 / this.viewport.scale
    };
  }
}
```

### View 层

View 层负责用户界面的展示和交互。

#### 创建自定义视图组件

```typescript
import { IViewComponent, IViewBindingContext } from '@sky-canvas/canvas-sdk';

class CustomCanvasView implements IViewComponent {
  readonly name: string = 'CustomCanvasView';
  
  private canvas: HTMLCanvasElement;
  private context: CanvasRenderingContext2D;
  private viewModel: CustomShapeViewModel;
  private bindings: any[] = [];

  constructor(
    canvas: HTMLCanvasElement,
    viewModel: CustomShapeViewModel
  ) {
    this.canvas = canvas;
    this.context = canvas.getContext('2d')!;
    this.viewModel = viewModel;
    
    this.initialize();
  }

  private initialize(): void {
    // 设置事件监听
    this.canvas.addEventListener('mousedown', this.handleMouseDown.bind(this));
    this.canvas.addEventListener('mousemove', this.handleMouseMove.bind(this));
    this.canvas.addEventListener('mouseup', this.handleMouseUp.bind(this));

    // 订阅 ViewModel 变化
    this.viewModel.subscribe(() => {
      this.render();
    });

    // 监听具体事件
    this.viewModel.on('shape:created', (shape) => {
      console.log('New shape created:', shape);
    });

    this.viewModel.on('viewport:changed', (viewport) => {
      this.render();
    });
  }

  private handleMouseDown(event: MouseEvent): void {
    const point = this.getCanvasPoint(event);
    
    // 检查是否点击了图形
    const clickedShape = this.findShapeAtPoint(point);
    if (clickedShape) {
      this.viewModel.selectShape(clickedShape.getId());
    } else {
      // 创建新图形
      this.viewModel.createShape('rectangle', point);
    }
  }

  private handleMouseMove(event: MouseEvent): void {
    if (this.viewModel.selectedShape && this.isDragging) {
      const point = this.getCanvasPoint(event);
      const deltaX = point.x - this.lastPoint.x;
      const deltaY = point.y - this.lastPoint.y;
      
      this.viewModel.moveSelectedShape(deltaX, deltaY);
      this.lastPoint = point;
    }
  }

  private handleMouseUp(event: MouseEvent): void {
    this.isDragging = false;
  }

  private getCanvasPoint(event: MouseEvent): { x: number; y: number } {
    const rect = this.canvas.getBoundingClientRect();
    const viewport = this.viewModel.viewport;
    
    return {
      x: (event.clientX - rect.left - viewport.x) / viewport.scale,
      y: (event.clientY - rect.top - viewport.y) / viewport.scale
    };
  }

  private findShapeAtPoint(point: { x: number; y: number }): CustomShapeModel | null {
    const shapes = this.viewModel.visibleShapes;
    
    for (let i = shapes.length - 1; i >= 0; i--) {
      const shape = shapes[i];
      const bounds = shape.getBounds();
      
      if (point.x >= bounds.x && point.x <= bounds.x + bounds.width &&
          point.y >= bounds.y && point.y <= bounds.y + bounds.height) {
        return shape;
      }
    }
    
    return null;
  }

  render(): Element | string {
    // 清空画布
    this.context.clearRect(0, 0, this.canvas.width, this.canvas.height);

    // 应用视口变换
    const viewport = this.viewModel.viewport;
    this.context.save();
    this.context.translate(viewport.x, viewport.y);
    this.context.scale(viewport.scale, viewport.scale);

    // 渲染所有可见图形
    for (const shape of this.viewModel.visibleShapes) {
      this.renderShape(shape);
    }

    // 渲染选中框
    if (this.viewModel.selectedShape) {
      this.renderSelectionBox(this.viewModel.selectedShape);
    }

    this.context.restore();
    return this.canvas;
  }

  private renderShape(shape: CustomShapeModel): void {
    const data = shape.getData();
    const { position, size, style } = data;

    this.context.save();
    
    // 设置样式
    this.context.fillStyle = style.fill || 'transparent';
    this.context.strokeStyle = style.stroke || '#000000';
    this.context.lineWidth = style.strokeWidth || 1;

    // 绘制图形
    if (data.type === 'rectangle') {
      this.context.fillRect(position.x, position.y, size.width, size.height);
      this.context.strokeRect(position.x, position.y, size.width, size.height);
    }
    // 可以添加其他图形类型的绘制逻辑

    this.context.restore();
  }

  private renderSelectionBox(shape: CustomShapeModel): void {
    const bounds = shape.getBounds();
    
    this.context.save();
    this.context.strokeStyle = '#0066cc';
    this.context.lineWidth = 2;
    this.context.setLineDash([4, 4]);
    
    this.context.strokeRect(bounds.x - 2, bounds.y - 2, bounds.width + 4, bounds.height + 4);
    
    this.context.restore();
  }

  mount(element: Element): void {
    element.appendChild(this.canvas);
  }

  unmount(): void {
    if (this.canvas.parentElement) {
      this.canvas.parentElement.removeChild(this.canvas);
    }
  }

  update(props?: Record<string, any>): void {
    this.render();
  }

  dispose(): void {
    // 清理事件监听器和订阅
    this.bindings.forEach(binding => binding.dispose());
  }

  // 私有属性
  private isDragging: boolean = false;
  private lastPoint: { x: number; y: number } = { x: 0, y: 0 };
}
```

### 视图绑定系统

视图绑定系统提供了声明式的数据绑定功能。

#### 使用 ViewBinder

```typescript
import { ViewBinder, BindingType } from '@sky-canvas/canvas-sdk';

const viewBinder = new ViewBinder();
const viewModel = mvvmManager.getShapeViewModel();
const inputElement = document.getElementById('shapeInput') as HTMLInputElement;

// 创建双向绑定
const binding = viewBinder.createBinding({
  type: BindingType.TWO_WAY,
  source: 'selectedShapeName', // ViewModel 属性
  target: 'value',             // DOM 属性
  options: {
    immediate: true,           // 立即同步
    debounce: 300             // 防抖300ms
  }
}, {
  viewModel,
  view: inputElement,
  bindings: []
});

// 激活绑定
binding.activate();

// 创建命令绑定
const buttonElement = document.getElementById('deleteButton') as HTMLButtonElement;
const commandBinding = viewBinder.createBinding({
  type: BindingType.COMMAND,
  source: 'deleteSelectedShape', // ViewModel 方法
  target: 'click'                // DOM 事件
}, {
  viewModel,
  view: buttonElement,
  bindings: []
});

commandBinding.activate();
```

#### 值转换器

```typescript
import { IValueConverter } from '@sky-canvas/canvas-sdk';

class ColorConverter implements IValueConverter {
  convert(value: any): any {
    // ViewModel 中的颜色值转换为 CSS 颜色
    if (typeof value === 'object' && value.r !== undefined) {
      return `rgb(${value.r}, ${value.g}, ${value.b})`;
    }
    return value;
  }

  convertBack(value: any): any {
    // CSS 颜色转换为 ViewModel 格式
    if (typeof value === 'string' && value.startsWith('rgb')) {
      const match = value.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
      if (match) {
        return {
          r: parseInt(match[1]),
          g: parseInt(match[2]),
          b: parseInt(match[3])
        };
      }
    }
    return value;
  }
}

// 注册转换器
viewBinder.registerConverter('color', new ColorConverter());

// 在绑定中使用
const colorBinding = viewBinder.createBinding({
  type: BindingType.TWO_WAY,
  source: 'shapeColor',
  target: 'style.backgroundColor',
  converter: viewBinder.getConverter('color')
}, bindingContext);
```

## React/Vue 集成

### React Hook 集成

```typescript
import { createUseViewModelHook } from '@sky-canvas/canvas-sdk';

// 创建自定义 Hook
const useShapeViewModel = createUseViewModelHook(shapeViewModel);

// 在 React 组件中使用
function ShapePanel() {
  const { state, actions, loading, error } = useShapeViewModel();

  const handleCreateShape = () => {
    actions.createShape('rectangle', { x: 100, y: 100 });
  };

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <div>
      <button onClick={handleCreateShape}>Create Shape</button>
      <div>Shapes: {state.shapes?.length || 0}</div>
      <div>Selected: {state.selectedShapeId || 'None'}</div>
    </div>
  );
}
```

### Vue Composition API 集成

```vue
<template>
  <div>
    <button @click="createShape">Create Shape</button>
    <div>Shapes: {{ readonly.shapes?.length || 0 }}</div>
    <div>Selected: {{ readonly.selectedShapeId || 'None' }}</div>
  </div>
</template>

<script setup>
import { createVueComposable } from '@sky-canvas/canvas-sdk';

const useShapeViewModel = createVueComposable(shapeViewModel);
const { reactive, readonly, methods } = useShapeViewModel();

const createShape = () => {
  methods.createShape('rectangle', { x: 100, y: 100 });
};
</script>
```

## 高级功能

### 装饰器使用

```typescript
import { reactive, computed, command, validate } from '@sky-canvas/canvas-sdk';

class AdvancedViewModel extends BaseViewModel {
  @reactive({ 
    defaultValue: '',
    persist: true,      // 自动持久化
    debounce: 300      // 防抖
  })
  searchText: string = '';

  @reactive({ 
    defaultValue: [],
    validate: (items) => Array.isArray(items) // 验证
  })
  items: any[] = [];

  @computed({ cache: true }) // 缓存计算结果
  get filteredItems(): any[] {
    if (!this.searchText) return this.items;
    return this.items.filter(item => 
      item.name.toLowerCase().includes(this.searchText.toLowerCase())
    );
  }

  @command({ 
    async: true,
    debounce: 500,     // 防抖
    throttle: 1000     // 节流
  })
  async searchItems(query: string): Promise<void> {
    this.setLoading(true);
    try {
      const results = await this.apiService.search(query);
      this.items = results;
    } catch (error) {
      this.setError(error);
    } finally {
      this.setLoading(false);
    }
  }

  @validate({
    required: true,
    minLength: 3,
    custom: (value) => value.includes('@') ? null : 'Must contain @'
  })
  email: string = '';
}
```

### 性能优化

```typescript
// 使用性能监控
const metrics = viewModel.getPerformanceMetrics();
console.log('Operation counts:', metrics.operationCounts);
console.log('Average response time:', metrics.averageResponseTime);

// 批量操作
viewModel.startBatch();
for (const shape of shapes) {
  viewModel.addShape(shape);
}
viewModel.endBatch(); // 只触发一次更新

// 选择性订阅
const unsubscribe = viewModel.subscribe(
  (snapshot) => {
    console.log('Shapes changed:', snapshot.shapes);
  },
  ['shapes'] // 只监听 shapes 属性变化
);
```

### 插件系统

```typescript
// 创建自定义插件
class ShapeValidationPlugin {
  install(viewModel: CustomShapeViewModel): void {
    // 拦截形状创建
    const originalCreateShape = viewModel.createShape;
    viewModel.createShape = async function(type: string, position: any) {
      // 验证逻辑
      if (position.x < 0 || position.y < 0) {
        throw new Error('Position must be positive');
      }
      return originalCreateShape.call(this, type, position);
    };
  }
}

// 注册插件
viewModel.use(new ShapeValidationPlugin());
```

## 最佳实践

### 1. 命名规范

```typescript
// ViewModel 命名
class ShapeViewModel extends BaseRepositoryViewModel { }    // 好
class ShapeVM extends BaseRepositoryViewModel { }          // 避免

// Model 命名
class ShapeModel extends BaseModel { }                     // 好
class Shape extends BaseModel { }                         // 避免

// Repository 命名  
class ShapeRepository extends BaseRepository { }           // 好
class ShapeRepo extends BaseRepository { }                // 避免

// 方法命名
async createShape() { }                                    // 好 - 动词开头
async shapeCreate() { }                                    // 避免

get selectedShape() { }                                    // 好 - 计算属性
getSelectedShape() { }                                     // 避免 - 应该用计算属性
```

### 2. 状态管理

```typescript
// 好的做法
class GoodViewModel extends BaseViewModel {
  @reactive({ defaultValue: [] })
  private _shapes: Shape[] = [];

  @computed
  get shapes(): ReadonlyArray<Shape> {
    return this._shapes;
  }

  @command()
  addShape(shape: Shape): void {
    this._shapes = [...this._shapes, shape];
  }
}

// 避免的做法
class BadViewModel extends BaseViewModel {
  @reactive()
  shapes: Shape[] = [];

  addShape(shape: Shape): void {
    this.shapes.push(shape); // 直接修改数组
  }
}
```

### 3. 错误处理

```typescript
class RobustViewModel extends BaseViewModel {
  @command({ async: true })
  async loadData(): Promise<void> {
    this.setLoading(true);
    this.clearError();

    try {
      const data = await this.dataService.load();
      this.updateState('data', data);
    } catch (error) {
      this.setError(error);
      // 记录错误日志
      console.error('Failed to load data:', error);
      // 可选：重试逻辑
      this.scheduleRetry();
    } finally {
      this.setLoading(false);
    }
  }

  private scheduleRetry(): void {
    setTimeout(() => {
      if (this.hasError && !this.isLoading) {
        this.loadData();
      }
    }, 3000);
  }
}
```

### 4. 内存管理

```typescript
class MemoryEfficientViewModel extends BaseViewModel {
  private subscriptions: (() => void)[] = [];

  initialize(): Promise<void> {
    // 保存清理函数
    this.subscriptions.push(
      this.repository.subscribe(this.handleDataChange.bind(this))
    );

    return super.initialize();
  }

  dispose(): void {
    // 清理订阅
    this.subscriptions.forEach(cleanup => cleanup());
    this.subscriptions.length = 0;

    super.dispose();
  }
}
```

## 故障排除

### 常见问题

#### 1. 状态不更新

**问题**: ViewModel 状态改变但 View 没有更新

**解决方案**:
```typescript
// 检查是否正确使用 @reactive 装饰器
@reactive() 
myProperty: string = '';

// 检查是否正确订阅
const unsubscribe = viewModel.subscribe(() => {
  this.render();
});

// 确保在正确的时机调用 updateState
this.updateState('myProperty', newValue);
```

#### 2. 内存泄漏

**问题**: 长时间运行后内存占用持续增加

**解决方案**:
```typescript
// 确保正确清理资源
class CleanViewModel extends BaseViewModel {
  dispose(): void {
    // 清理定时器
    if (this.timer) {
      clearInterval(this.timer);
    }

    // 清理事件监听
    this.removeAllListeners();

    super.dispose();
  }
}
```

#### 3. 异步操作竞争

**问题**: 多个异步操作导致状态不一致

**解决方案**:
```typescript
class SafeViewModel extends BaseViewModel {
  private loadingPromise: Promise<any> | null = null;

  @command({ async: true })
  async loadData(): Promise<void> {
    // 防止重复请求
    if (this.loadingPromise) {
      return this.loadingPromise;
    }

    this.loadingPromise = this.doLoad();
    try {
      await this.loadingPromise;
    } finally {
      this.loadingPromise = null;
    }
  }

  private async doLoad(): Promise<void> {
    // 实际加载逻辑
  }
}
```

### 调试技巧

#### 1. 启用调试模式

```typescript
const mvvmManager = createMVVMManager({
  debug: true // 启用详细日志
});
```

#### 2. 性能监控

```typescript
// 监控 ViewModel 性能
const metrics = viewModel.getPerformanceMetrics();
console.log('Performance metrics:', metrics);

// 监控内存使用
const status = mvvmManager.getSystemStatus();
console.log('System status:', status);
```

#### 3. 状态检查

```typescript
// 检查当前状态
console.log('Current state:', viewModel.getState());

// 检查响应式状态
console.log('Reactive state:', viewModel.reactiveState);

// 检查是否有错误
if (viewModel.hasError) {
  console.error('ViewModel error:', viewModel.error);
}
```

## 总结

MVVM 架构提供了清晰的关注点分离和强大的数据绑定功能。通过遵循本指南的最佳实践，你可以构建出可维护、可测试和高性能的应用程序。

关键要点：
- 使用装饰器简化响应式编程
- 合理分层，保持各层职责清晰  
- 重视错误处理和内存管理
- 利用 TypeScript 的类型安全特性
- 编写充分的单元测试和集成测试

更多示例和 API 文档，请参考项目的其他文档文件。