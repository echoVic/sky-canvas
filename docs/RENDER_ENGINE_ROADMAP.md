# Sky Canvas 渲染引擎发展规划与架构重构

## 📋 项目概述

Sky Canvas 是一个高性能的 2D 图形渲染引擎，基于 TypeScript 开发，支持 Canvas2D、WebGL 和 WebGPU 多种渲染后端。本文档包含了完整的架构优化计划、具体的执行任务列表以及长期发展路线图。

> **重要说明**: 当前重构不考虑向下兼容性，将直接在现有代码库中进行架构调整和优化。

## 🏗️ 当前架构分析

### 现有优势

- **模块化架构**：清晰的接口定义和实现分离
- **多后端支持**：支持 Canvas2D、WebGL 和 WebGPU
- **性能优化机制**：
  - 脏区域管理（DirtyRegionManager）
  - 图层缓存（LayerCache）
  - 批处理渲染（AdvancedBatcher、BatchRenderer）
- **视口管理**：支持平移和缩放的无限画布
- **灵活的渲染层级**：通过 zIndex 管理渲染顺序
- **性能监控**：包含 FPS 和渲染时间统计

### 架构组件

- **核心接口**：IRenderEngine、IGraphicsContext、IRenderable
- **渲染引擎实现**：RenderEngine 负责管理渲染循环和场景
- **适配器模式**：为不同的渲染后端提供统一接口
- **命令模式**：使用 RenderQueue 和 IRenderCommand

## 🔍 主流 2D 渲染引擎对比分析

### 1. PixiJS

**核心优势：**
- WebGL 优先设计，自动降级到 Canvas2D
- 高效的批处理系统，减少绘制调用
- 灵活的插件系统
- 内置资源加载器
- 先进的文本渲染系统
- 强大的滤镜和动画系统

**可借鉴技术：**
- 智能批处理：按纹理自动合并精灵
- WebGL 着色器库：丰富的视觉效果
- 资源管理系统：优化加载和内存使用

### 2. Konva.js

**核心优势：**
- 场景图结构，简化复杂 UI 管理
- 丰富的交互事件系统
- 序列化能力（JSON 导入导出）
- 基于补间的流畅动画
- 智能缓存系统

**可借鉴技术：**
- 事件委托和冒泡机制
- 智能缓存策略
- 多格式导出功能

### 3. Paper.js

**核心优势：**
- 强大的矢量图形系统
- 精确的几何计算和矢量操作
- SVG 导入导出兼容性
- 复杂路径操作（布尔运算等）
- 光滑的曲线编辑

**可借鉴技术：**
- 矢量数学库
- 路径编辑和交互
- SVG 兼容性

### 4. Fabric.js

**核心优势：**
- 对象模型设计
- 内置交互式编辑功能
- 强大的 SVG 解析能力
- JSON 序列化支持
- 丰富的图像滤镜

**可借鉴技术：**
- 统一对象模型
- 自由绘图 API
- 历史状态管理

## 🚀 完整执行计划

基于当前架构分析，我们制定了完整的重构和优化计划，包含**架构重构**、**MVVM改造**和**功能增强**三大部分，共计**40个具体任务**。

### 阶段零：架构重构（优先执行）

#### 🏗️ 消除代码重复和架构优化

**A1. 统一数学库 [P0]**
- 目标：移除 Canvas SDK 中重复的数学库实现
- 行动：
  1. 分析 Canvas SDK 中数学库的使用情况
  2. 修改所有数学运算调用为使用 Render Engine 的数学库
  3. 删除 Canvas SDK 的 `math/` 目录
- 验收标准：Canvas SDK 不再包含数学运算实现，所有运算统一使用 Render Engine
- 预估工期：1周

**A2. 合并事件系统 [P0]**
- 目标：建立统一的事件处理架构
- 行动：
  1. 设计统一的事件接口和类型定义
  2. 将底层事件处理逻辑迁移到 Render Engine
  3. Canvas SDK 通过适配器模式使用底层事件系统
  4. 重构现有事件监听和分发机制
- 验收标准：只保留一套事件系统，性能提升20%+
- 预估工期：2-3周

**A3. 几何运算下沉 [P1]**
- 目标：将碰撞检测的底层几何计算移到 Render Engine
- 行动：
  1. 识别 CollisionDetector 中的纯几何运算部分
  2. 在 Render Engine 数学库中实现几何运算 API
  3. 重构 Canvas SDK 的碰撞检测调用新 API
  4. 保留业务逻辑和交互处理在 Canvas SDK
- 验收标准：碰撞检测性能提升，几何运算代码复用
- 预估工期：3-4周

**A4. 性能监控统一 [P1]**
- 目标：统一性能监控，避免重复数据采集
- 行动：
  1. Render Engine 负责底层渲染性能监控
  2. Canvas SDK 监控应用级性能指标（插件性能等）
  3. 提供统一的性能报告接口
  4. 移除重复的监控代码
- 验收标准：性能监控开销降低50%，数据更准确完整
- 预估工期：2周

**A5. 接口优化 [P1]**
- 目标：优化两个包之间的接口调用效率
- 行动：
  1. 分析包间调用频率和开销
  2. 减少不必要的接口调用次数
  3. 优化数据传递方式（避免深拷贝等）
  4. 实现更高效的通信机制
- 验收标准：包间调用开销降低30%
- 预估工期：3-4周

### Canvas SDK MVVM 架构改造

#### 🎯 MVVM 设计理念

为了提高 Canvas SDK 的可维护性和可测试性，我们将采用 MVVM（Model-View-ViewModel）架构模式重构 Canvas SDK。该架构将清晰分离数据层、业务逻辑层和视图层，提供响应式的数据绑定机制。

#### 🛠️ 技术选型：Valtio + Immer

**选择理由**：
- **Valtio (8KB)**：基于 Proxy 的极简响应式库，零学习成本
- **Immer (20KB)**：简化不可变更新，与 Valtio 完美配合
- **轻量级**：总体积仅 28KB，相比 MobX (60KB) 更轻量
- **框架无关**：不依赖特定前端框架
- **TypeScript 友好**：完整的类型支持

#### 📋 MVVM 三层架构设计

##### Model 层（数据/业务逻辑）
```
packages/canvas-sdk/src/models/
├── entities/          # 纯数据实体
│   ├── Shape.model.ts      # 形状数据模型
│   ├── Layer.model.ts      # 图层数据模型
│   ├── Tool.model.ts       # 工具数据模型
│   ├── Viewport.model.ts   # 视口数据模型
│   └── Project.model.ts    # 项目数据模型
├── repositories/      # 数据仓库（数据持久化）
│   ├── ShapeRepository.ts     # 形状数据管理
│   ├── LayerRepository.ts     # 图层数据管理
│   ├── ProjectRepository.ts   # 项目数据管理
│   └── HistoryRepository.ts   # 历史记录管理
└── domain/           # 领域服务（纯业务逻辑）
    ├── ShapeOperations.ts     # 形状操作逻辑
    ├── GeometryCalculations.ts # 几何计算逻辑
    ├── TransformLogic.ts      # 变换计算逻辑
    └── ValidationRules.ts     # 业务验证规则
```

##### ViewModel 层（展示逻辑/状态管理）
```
packages/canvas-sdk/src/viewmodels/
├── base/
│   ├── BaseViewModel.ts         # ViewModel 基类
│   ├── ReactiveStore.ts         # Valtio 响应式存储
│   └── ViewModelDecorators.ts   # 装饰器和工具
├── canvas/
│   ├── CanvasViewModel.ts       # 画布主 ViewModel
│   ├── ViewportViewModel.ts     # 视口控制 ViewModel
│   └── LayerViewModel.ts        # 图层管理 ViewModel
├── shapes/
│   ├── ShapeListViewModel.ts    # 形状列表 ViewModel
│   ├── ShapeEditViewModel.ts    # 形状编辑 ViewModel
│   └── SelectionViewModel.ts    # 选择管理 ViewModel
├── tools/
│   ├── ToolboxViewModel.ts      # 工具箱 ViewModel
│   ├── DrawingViewModel.ts      # 绘制状态 ViewModel
│   └── InteractionViewModel.ts  # 交互状态 ViewModel
└── app/
    ├── AppStateViewModel.ts     # 应用状态 ViewModel
    └── SettingsViewModel.ts     # 设置管理 ViewModel
```

##### View 层（视图接口/绑定）
```
packages/canvas-sdk/src/views/
├── interfaces/
│   ├── ICanvasView.ts          # 画布视图接口
│   ├── IShapeView.ts           # 形状视图接口
│   ├── IToolView.ts            # 工具视图接口
│   └── ILayerView.ts           # 图层视图接口
├── bindings/
│   ├── ViewModelBinding.ts     # ViewModel-View 绑定
│   ├── DataBinding.ts          # 数据双向绑定
│   └── EventBinding.ts         # 事件绑定机制
└── adapters/
    ├── ReactViewAdapter.ts     # React 框架适配器
    ├── VueViewAdapter.ts       # Vue 框架适配器
    └── VanillaViewAdapter.ts   # 原生 JS 适配器
```

#### 🚀 核心实现示例

##### 1. 响应式基础类
```typescript
// ReactiveStore.ts - Valtio + Immer 响应式存储
import { proxy, subscribe, snapshot } from 'valtio';
import { produce } from 'immer';

export class ReactiveStore<TState extends object> {
  private _state: TState;
  private _disposables: Array<() => void> = [];

  constructor(initialState: TState) {
    this._state = proxy(initialState);
  }

  get state(): TState {
    return this._state;
  }

  // 简单更新（Valtio 直接修改）
  update(updates: Partial<TState>): void {
    Object.assign(this._state, updates);
  }

  // 复杂更新（Immer 不可变更新）
  produce(updater: (draft: TState) => void): void {
    const newState = produce(this._state, updater);
    Object.assign(this._state, newState);
  }

  // 订阅状态变化
  subscribe(callback: (state: TState) => void): () => void {
    const unsubscribe = subscribe(this._state, () => {
      callback(snapshot(this._state));
    });
    this._disposables.push(unsubscribe);
    return unsubscribe;
  }

  dispose(): void {
    this._disposables.forEach(dispose => dispose());
    this._disposables = [];
  }
}
```

##### 2. ViewModel 基类
```typescript
// BaseViewModel.ts - ViewModel 基类
import { ReactiveStore } from './ReactiveStore';
import { IDisposable } from '../events/EventBus';

export abstract class BaseViewModel<TState extends object> implements IDisposable {
  protected store: ReactiveStore<TState>;
  private _disposables: IDisposable[] = [];

  constructor() {
    this.store = new ReactiveStore(this.getInitialState());
    this.initialize();
  }

  protected abstract getInitialState(): TState;
  protected abstract initialize(): void;

  get state(): TState {
    return this.store.state;
  }

  protected setState(updates: Partial<TState>): void {
    this.store.update(updates);
  }

  protected produceState(updater: (draft: TState) => void): void {
    this.store.produce(updater);
  }

  subscribe(callback: (state: TState) => void): IDisposable {
    const unsubscribe = this.store.subscribe(callback);
    const disposable = { dispose: unsubscribe };
    this._disposables.push(disposable);
    return disposable;
  }

  dispose(): void {
    this._disposables.forEach(d => d.dispose());
    this.store.dispose();
  }
}
```

##### 3. 具体 ViewModel 实现
```typescript
// ShapeListViewModel.ts - 形状列表 ViewModel
import { BaseViewModel } from '../base/BaseViewModel';
import { ShapeModel } from '../../models/entities/Shape.model';
import { ShapeRepository } from '../../models/repositories/ShapeRepository';
import { inject } from '../../di/ServiceIdentifier';

interface IShapeListState {
  shapes: ShapeModel[];
  selectedIds: Set<string>;
  filterType: string | null;
  sortBy: 'creation' | 'name' | 'type';
  searchQuery: string;
}

export class ShapeListViewModel extends BaseViewModel<IShapeListState> {
  @inject(ShapeRepository)
  private shapeRepository!: ShapeRepository;

  protected getInitialState(): IShapeListState {
    return {
      shapes: [],
      selectedIds: new Set(),
      filterType: null,
      sortBy: 'creation',
      searchQuery: ''
    };
  }

  protected initialize(): void {
    // 订阅 Repository 变化
    this._disposables.push(
      this.shapeRepository.changes$.subscribe(change => {
        this.handleRepositoryChange(change);
      })
    );

    // 初始加载数据
    this.loadShapes();
  }

  // Action: 添加形状
  addShape(type: string, position: IPoint): void {
    const shape = new ShapeModel({
      type,
      position,
      size: { width: 100, height: 100 }
    });
    
    this.shapeRepository.add(shape);
  }

  // Action: 选择形状
  selectShape(id: string, multiSelect: boolean = false): void {
    this.produceState(draft => {
      if (!multiSelect) {
        draft.selectedIds.clear();
      }
      
      if (draft.selectedIds.has(id)) {
        draft.selectedIds.delete(id);
      } else {
        draft.selectedIds.add(id);
      }
    });
  }

  // Action: 批量选择
  selectShapes(ids: string[]): void {
    this.produceState(draft => {
      draft.selectedIds = new Set(ids);
    });
  }

  // Action: 设置过滤器
  setFilter(filterType: string | null): void {
    this.setState({ filterType });
  }

  // Action: 设置搜索查询
  setSearchQuery(query: string): void {
    this.setState({ searchQuery: query });
  }

  // Computed: 可见形状
  get visibleShapes(): ShapeModel[] {
    const { shapes, filterType, searchQuery } = this.state;
    
    return shapes.filter(shape => {
      // 类型过滤
      if (filterType && shape.type !== filterType) {
        return false;
      }
      
      // 搜索过滤
      if (searchQuery && !shape.name.toLowerCase().includes(searchQuery.toLowerCase())) {
        return false;
      }
      
      return true;
    });
  }

  // Computed: 选中的形状
  get selectedShapes(): ShapeModel[] {
    const { shapes, selectedIds } = this.state;
    return shapes.filter(shape => selectedIds.has(shape.id));
  }

  private handleRepositoryChange(change: RepositoryChange): void {
    switch (change.type) {
      case 'add':
        this.produceState(draft => {
          draft.shapes.push(change.shape);
        });
        break;
      case 'update':
        this.produceState(draft => {
          const index = draft.shapes.findIndex(s => s.id === change.shape.id);
          if (index >= 0) {
            draft.shapes[index] = change.shape;
          }
        });
        break;
      case 'remove':
        this.produceState(draft => {
          const index = draft.shapes.findIndex(s => s.id === change.shape.id);
          if (index >= 0) {
            draft.shapes.splice(index, 1);
            draft.selectedIds.delete(change.shape.id);
          }
        });
        break;
    }
  }

  private loadShapes(): void {
    const shapes = this.shapeRepository.getAll();
    this.setState({ shapes });
  }
}
```

##### 4. View 绑定机制
```typescript
// ViewModelBinding.ts - ViewModel 与 View 的绑定
export class ViewModelBinding<TViewModel extends BaseViewModel<any>, TView> {
  private disposables: IDisposable[] = [];

  constructor(
    private viewModel: TViewModel,
    private view: TView,
    private bindings: IBindingDefinition[]
  ) {
    this.setupBindings();
  }

  private setupBindings(): void {
    // 订阅 ViewModel 状态变化
    this.disposables.push(
      this.viewModel.subscribe(state => {
        this.updateView(state);
      })
    );

    // 设置命令绑定
    this.bindings.forEach(binding => {
      this.setupBinding(binding);
    });
  }

  private updateView(state: any): void {
    this.bindings.forEach(binding => {
      if (binding.type === 'property') {
        const value = this.getNestedProperty(state, binding.source);
        this.setViewProperty(binding.target, value);
      }
    });
  }

  private setupBinding(binding: IBindingDefinition): void {
    if (binding.type === 'command') {
      this.setupCommandBinding(binding);
    } else if (binding.type === 'event') {
      this.setupEventBinding(binding);
    }
  }

  dispose(): void {
    this.disposables.forEach(d => d.dispose());
    this.disposables = [];
  }
}
```

#### 📋 改造任务列表

**A6. 安装和配置 Valtio + Immer [P0]**
- 目标：安装依赖包并配置基础设施
- 行动：
  1. 安装 valtio 和 immer 依赖
  2. 配置 TypeScript 类型声明
  3. 创建基础响应式存储类
  4. 建立 ViewModel 基础架构
- 验收标准：基础响应式系统正常工作，类型检查通过
- 预估工期：1周

**A7. 创建 Model 层基础结构 [P0]**
- 目标：建立数据模型和仓库系统
- 行动：
  1. 定义数据实体模型（Shape, Layer, Tool 等）
  2. 实现数据仓库类（ShapeRepository 等）
  3. 建立领域服务（几何计算、变换逻辑等）
  4. 添加数据验证和约束
- 验收标准：Model 层独立可测试，业务逻辑清晰分离
- 预估工期：2-3周

**A8. 实现 ViewModel 基类和装饰器 [P0]**
- 目标：创建 ViewModel 层基础设施
- 行动：
  1. 实现 BaseViewModel 抽象基类
  2. 创建响应式状态管理机制
  3. 实现计算属性和命令模式
  4. 添加依赖注入支持
- 验收标准：ViewModel 基类功能完整，支持响应式更新
- 预估工期：2周

**A9. 迁移现有 Service 到 ViewModel [P1]**
- 目标：将现有服务层逻辑迁移到 MVVM 架构
- 行动：
  1. 分析现有 Service 职责，拆分为 Model 和 ViewModel
  2. 创建具体的 ViewModel 实现（Canvas, Shape, Tool 等）
  3. 重构现有业务逻辑适配新架构
  4. 保持对外 API 接口兼容
- 验收标准：所有业务功能正常，性能无明显退化
- 预估工期：4-5周

**A10. 实现 View 绑定系统 [P1]**
- 目标：创建 View 层接口和绑定机制
- 行动：
  1. 定义 View 接口规范
  2. 实现数据绑定和命令绑定
  3. 创建框架适配器（React, Vue）
  4. 建立双向数据绑定机制
- 验收标准：View 与 ViewModel 自动同步，事件正确传递
- 预估工期：3-4周

**A11. 添加单元测试和文档 [P1]**
- 目标：完善测试覆盖和开发文档
- 行动：
  1. 为 Model 层添加单元测试
  2. 为 ViewModel 层添加单元测试
  3. 添加集成测试用例
  4. 编写 MVVM 架构使用文档
- 验收标准：测试覆盖率 > 85%，文档完整清晰
- 预估工期：2-3周

#### 🎯 预期收益

**架构改善**：
- **关注点分离**：Model 专注数据，ViewModel 管理状态，View 处理展示
- **可测试性提升**：各层独立测试，Mock 成本低
- **可维护性增强**：逻辑清晰，职责明确
- **扩展性提高**：新功能易于添加和集成

**开发体验**：
- **响应式更新**：数据变化自动同步到视图
- **类型安全**：完整的 TypeScript 支持
- **调试友好**：状态变化可追踪，问题定位容易
- **框架无关**：可适配多种前端框架

**性能优化**：
- **精确更新**：只更新变化的部分
- **状态批处理**：减少不必要的重新渲染
- **内存优化**：及时清理订阅和监听器
- **包体积小**：Valtio + Immer 仅 28KB

#### ⏱️ 实施时间线

**第 1-2 周**：完成 A6（基础设施搭建）
**第 3-5 周**：完成 A7（Model 层构建）
**第 6-7 周**：完成 A8（ViewModel 基类）
**第 8-12 周**：完成 A9（Service 迁移）
**第 13-16 周**：完成 A10（View 绑定系统）
**第 17-19 周**：完成 A11（测试和文档）

总计：**19 周（约 5 个月）**

#### 🔄 与现有架构集成

**依赖注入系统**：
- 保持现有的 DI 容器不变
- ViewModel 通过 DI 获取 Repository 和 Domain Service
- 注册 ViewModel 到 DI 容器供外部使用

**事件系统集成**：
- ViewModel 可以使用现有的 EventBus
- Repository 变化通过事件通知 ViewModel
- View 事件通过 ViewModel 处理

**向后兼容**：
- 现有的 Service API 保持不变
- 内部实现逐步迁移到 MVVM
- 提供兼容层确保平滑过渡

### 第一阶段：核心优化（架构重构后1-3个月）

#### 1.1 批处理系统增强

**目标**：提升渲染性能，减少绘制调用次数

**实现方案**：
```typescript
// 智能批处理系统
class EnhancedBatcher {
  private batches: Map<string, RenderBatch> = new Map();
  private textureAtlas: TextureAtlas = new TextureAtlas();
  
  // 自动分组渲染对象
  addToBatch(renderable: IRenderable): void {
    const key = this.generateBatchKey(renderable);
    this.getBatch(key).add(renderable);
  }
  
  // 基于材质属性生成批次键
  private generateBatchKey(renderable: IRenderable): string {
    return `${renderable.textureId}-${renderable.blendMode}-${renderable.shaderId}`;
  }
  
  // 实例化渲染
  renderInstancedBatch(batchKey: string): void {
    const batch = this.batches.get(batchKey);
    if (batch && batch.count > INSTANCING_THRESHOLD) {
      this.renderInstanced(batch);
    } else {
      this.renderNormal(batch);
    }
  }
}
```

**预期效果**：
- 绘制调用减少 60-80%
- 帧率提升 30-50%
- 内存使用优化 20%

#### 1.2 WebGL 优化

**目标**：优化 WebGL 使用效率，减少状态切换

**实现方案**：
```typescript
// 着色器管理系统
class ShaderManager {
  private programs: Map<string, WebGLProgram> = new Map();
  private currentProgram: WebGLProgram | null = null;
  
  // 动态着色器生成
  generateShader(config: ShaderConfig): WebGLProgram {
    const key = this.getShaderKey(config);
    if (!this.programs.has(key)) {
      const program = this.compileShader(config);
      this.programs.set(key, program);
    }
    return this.programs.get(key)!;
  }
  
  // 最小化状态切换
  useProgram(program: WebGLProgram): boolean {
    if (this.currentProgram !== program) {
      this.gl.useProgram(program);
      this.currentProgram = program;
      return true;
    }
    return false;
  }
}
```

#### 1.3 资源管理系统

**目标**：实现高效的资源加载和缓存机制

**关键特性**：
- 纹理图集（Texture Atlas）支持
- 异步资源加载器
- 内存监控和自动清理
- LRU 缓存策略

### 第二阶段：功能扩展（3-6个月）

#### 2.1 高级文本渲染

**目标**：支持富文本、多语言和高级排版

**实现特性**：
- 字体加载和管理
- 富文本样式（粗体、斜体、颜色等）
- 多语言支持和文本方向
- 文本测量和自动换行
- 文本选择和编辑

#### 2.2 滤镜和效果系统

**目标**：提供丰富的视觉效果

**内置滤镜**：
- 模糊（高斯模糊、动态模糊）
- 颜色调整（亮度、对比度、饱和度）
- 阴影和发光效果
- 扭曲效果（波浪、旋涡）
- 自定义着色器滤镜

```typescript
// 滤镜系统
class FilterSystem {
  private filterChain: Filter[] = [];
  
  // 添加滤镜到渲染管线
  addFilter(filter: Filter): void {
    this.filterChain.push(filter);
    this.rebuildPipeline();
  }
  
  // 应用滤镜链
  applyFilters(input: Texture, output: Texture): void {
    let current = input;
    for (const filter of this.filterChain) {
      const temp = this.getTemporaryTexture();
      filter.apply(current, temp);
      current = temp;
    }
    this.copyTexture(current, output);
  }
}
```

#### 2.3 动画系统

**目标**：提供流畅的动画支持

**动画类型**：
- 属性补间动画
- 关键帧动画
- 路径动画
- 骨骼动画（2D）
- 物理动画

```typescript
// 动画系统
class AnimationSystem {
  private animators: Map<string, Animator> = new Map();
  private timeline: Timeline = new Timeline();
  
  // 创建属性动画
  animateProperty(
    target: any, 
    property: string, 
    from: number, 
    to: number, 
    duration: number,
    easing?: EasingFunction
  ): Animation {
    const animation = new PropertyAnimation(target, property, from, to, duration, easing);
    this.timeline.add(animation);
    return animation;
  }
  
  // 更新动画状态
  update(deltaTime: number): void {
    this.timeline.update(deltaTime);
  }
}
```

### 第三阶段：高级特性（6-12个月）

#### 3.1 物理引擎集成

**目标**：支持 2D 物理模拟

**集成方案**：
- 集成现有物理引擎（如 Matter.js、Box2D）
- 物理体与渲染对象自动同步
- 碰撞检测和响应
- 约束和关节系统

#### 3.2 粒子系统

**目标**：高性能粒子效果

**系统特性**：
- GPU 加速粒子渲染
- 可配置的发射器
- 多种粒子行为（重力、风力、碰撞）
- 粒子生命周期管理
- 纹理动画支持

```typescript
// 粒子系统
class ParticleSystem {
  private emitters: ParticleEmitter[] = [];
  private particleBuffer: Float32Array;
  private maxParticles: number;
  
  // 创建粒子发射器
  createEmitter(config: EmitterConfig): ParticleEmitter {
    const emitter = new ParticleEmitter(config);
    this.emitters.push(emitter);
    return emitter;
  }
  
  // GPU 批量渲染粒子
  render(context: WebGLContext): void {
    // 更新粒子数据到缓冲区
    this.updateParticleBuffer();
    
    // 使用实例化渲染
    context.drawInstancedArrays(
      this.particleGeometry,
      this.particleBuffer,
      this.activeParticleCount
    );
  }
}
```

#### 3.3 高级路径操作

**目标**：支持复杂的矢量图形操作

**操作类型**：
- 布尔运算（并集、交集、差集）
- 路径简化和平滑
- 偏移和描边
- 路径动画和变形

### 第四阶段：生态系统建设（12-18个月）

#### 4.1 插件系统

**目标**：支持第三方扩展

**架构设计**：
```typescript
// 插件系统
interface IPlugin {
  name: string;
  version: string;
  initialize(engine: IRenderEngine): void;
  dispose(): void;
}

class PluginManager {
  private plugins: Map<string, IPlugin> = new Map();
  
  // 注册插件
  register(plugin: IPlugin): void {
    plugin.initialize(this.engine);
    this.plugins.set(plugin.name, plugin);
  }
  
  // 获取插件
  getPlugin<T extends IPlugin>(name: string): T | undefined {
    return this.plugins.get(name) as T;
  }
}
```

#### 4.2 开发工具链

**调试工具**：
- 性能分析器
- 场景树查看器
- 渲染统计面板
- 内存使用监控

**设计工具**：
- 可视化场景编辑器
- 动画编辑器
- 资源管理器

#### 4.3 组件库

**UI 组件**：
- 按钮、输入框、滑块
- 面板、对话框、菜单
- 图表和数据可视化组件

**图形组件**：
- 基础形状库
- 图标库
- 模板和预设

## 🚀 技术实现细节

### 批处理优化实现

```typescript
// 高级批处理器
class AdvancedBatcher {
  private static readonly MAX_BATCH_SIZE = 10000;
  private static readonly INSTANCING_THRESHOLD = 50;
  
  private vertexBuffer: Float32Array;
  private indexBuffer: Uint16Array;
  private textureUnits: WebGLTexture[] = [];
  
  // 智能分组算法
  groupRenderables(renderables: IRenderable[]): RenderGroup[] {
    const groups = new Map<string, IRenderable[]>();
    
    // 按材质和状态分组
    renderables.forEach(renderable => {
      const key = this.getMaterialKey(renderable);
      const group = groups.get(key) || [];
      group.push(renderable);
      groups.set(key, group);
    });
    
    // 进一步按空间位置优化
    return Array.from(groups.entries()).map(([key, items]) => {
      return {
        key,
        renderables: this.spatialSort(items),
        canInstance: items.length >= AdvancedBatcher.INSTANCING_THRESHOLD
      };
    });
  }
  
  // 空间排序优化
  private spatialSort(renderables: IRenderable[]): IRenderable[] {
    // Z-order 曲线排序，提高缓存命中率
    return renderables.sort((a, b) => {
      const za = this.getZOrder(a.bounds);
      const zb = this.getZOrder(b.bounds);
      return za - zb;
    });
  }
}
```

### 事件系统实现

```typescript
// 高级事件系统
class EventSystem {
  private eventPool: ObjectPool<CustomEvent> = new ObjectPool(() => new CustomEvent());
  private gestureRecognizer: GestureRecognizer = new GestureRecognizer();
  
  // 事件处理优化
  processEvent(type: string, nativeEvent: Event): void {
    // 从对象池获取事件对象
    const event = this.eventPool.acquire();
    this.populateEvent(event, type, nativeEvent);
    
    // 高效的碰撞检测
    const hits = this.spatialIndex.query(event.worldPosition);
    
    // 事件分发优化
    this.dispatchEvent(event, hits);
    
    // 回收事件对象
    this.eventPool.release(event);
  }
  
  // 手势识别
  recognizeGestures(events: TouchEvent[]): Gesture[] {
    return this.gestureRecognizer.recognize(events);
  }
}
```

## 📊 性能优化目标

### 渲染性能

- **目标帧率**：60 FPS（复杂场景下保持 30+ FPS）
- **绘制调用优化**：相同场景下减少 70% 的绘制调用
- **内存使用**：相比未优化版本减少 40% 内存占用
- **启动时间**：引擎初始化时间控制在 100ms 内

### 功能覆盖度

- **形状支持**：基础形状 + 自定义路径 + SVG 导入
- **文本渲染**：多语言 + 富文本 + 高级排版
- **动画系统**：补间 + 关键帧 + 物理动画
- **交互支持**：鼠标 + 触摸 + 手势识别

## 🔧 开发和维护

### 代码质量标准

- **TypeScript 严格模式**：确保类型安全
- **单元测试覆盖率**：> 80%
- **性能基准测试**：自动化性能回归测试
- **API 文档完整性**：100% 公共 API 文档覆盖

### 持续集成

- **自动化测试**：每次提交触发完整测试套件
- **性能监控**：关键指标自动监控和报警
- **兼容性测试**：多浏览器和设备自动化测试
- **代码质量检查**：ESLint、Prettier、SonarQube

## 📈 里程碑计划

### Q1 2024：核心优化
- [ ] 完成批处理系统重构
- [ ] WebGL 优化和着色器管理
- [ ] 资源管理系统实现
- [ ] 性能测试套件建立

### Q2 2024：功能扩展
- [ ] 高级文本渲染系统
- [ ] 滤镜和效果管线
- [ ] 基础动画系统
- [ ] 改进的事件处理

### Q3 2024：高级特性
- [ ] 物理引擎集成
- [ ] 粒子系统实现
- [ ] 高级路径操作
- [ ] 性能分析工具

### Q4 2024：生态建设
- [ ] 插件系统架构
- [ ] 开发者工具链
- [ ] 组件库和示例
- [ ] 完整文档和教程

## 🎯 成功指标

### 技术指标
- **渲染性能**：复杂场景 60fps，简单场景 120fps+
- **内存效率**：相比竞品减少 30% 内存使用
- **加载速度**：引擎核心 < 50KB gzipped
- **兼容性**：支持 95% 现代浏览器

### 生态指标
- **开发者采用**：GitHub Stars > 1000
- **社区活跃度**：月均 Issue 响应时间 < 24h
- **文档质量**：开发者满意度 > 4.5/5
- **插件生态**：第三方插件 > 20 个

## 🤝 贡献指南

### 如何参与

1. **代码贡献**：Fork 仓库，创建功能分支，提交 PR
2. **bug 报告**：使用 Issue 模板详细描述问题
3. **功能建议**：通过 RFC 流程提出新特性
4. **文档改进**：改进 API 文档和教程

### 开发环境设置

```bash
# 克隆仓库
git clone https://github.com/echoVic/sky-canvas.git
cd sky-canvas

# 安装依赖
pnpm install

# 启动开发服务器
pnpm dev

# 运行测试
pnpm test

# 构建项目
pnpm build
```

## 📚 学习资源

### 官方文档
- [API 参考](./API.md)
- [快速开始](./QUICK_START.md)
- [架构设计](./ARCHITECTURE.md)
- [性能优化指南](./PERFORMANCE.md)

### 示例项目
- [基础绘图应用](../examples/basic-drawing)
- [游戏引擎集成](../examples/game-integration)
- [数据可视化](../examples/data-visualization)
- [在线设计工具](../examples/design-tool)

---

## 📄 版本历史

- **v1.0.0** - 基础渲染引擎
- **v1.1.0** - 批处理优化
- **v1.2.0** - WebGL 增强
- **v2.0.0** - 架构重构（计划中）

---

## 📋 可执行任务列表

基于上述路线图，我们将所有主要功能拆解为**29个具体的可执行任务**，按照开发优先级排序：

### 🔧 第一阶段：核心优化任务 (1-3个月)

#### 批处理系统增强
1. **重构批处理系统 - 实现智能分组算法**
   - 目标：按纹理、混合模式、着色器自动分组渲染对象
   - 验收标准：绘制调用减少60-80%，同类对象能自动合并为单次绘制
   - 预估工期：2-3周

2. **重构批处理系统 - 添加纹理图集支持**
   - 目标：实现TextureAtlas类，提高纹理利用率
   - 验收标准：多个小纹理能合并为单个图集，减少纹理切换
   - 预估工期：2周

3. **重构批处理系统 - 实现实例化渲染**
   - 目标：为相同对象类型实现GPU实例化渲染
   - 验收标准：50个以上相同对象使用实例化渲染，性能提升30%+
   - 预估工期：3周

#### WebGL优化
4. **优化WebGL - 实现着色器管理系统**
   - 目标：动态着色器生成和编译缓存
   - 验收标准：着色器能根据配置动态生成，编译结果有效缓存
   - 预估工期：2周

5. **优化WebGL - 最小化状态切换**
   - 目标：实现状态缓存，避免重复的WebGL状态改变
   - 验收标准：相同状态不会重复设置，状态切换次数减少50%
   - 预估工期：1-2周

#### 资源管理
6. **实现资源管理系统 - 异步加载器**
   - 目标：支持纹理、字体等资源的异步加载
   - 验收标准：支持Promise/async-await，有加载进度回调
   - 预估工期：2周

7. **实现资源管理系统 - LRU缓存策略**
   - 目标：内存监控和智能资源清理
   - 验收标准：内存使用有上限，最久未用资源自动清理
   - 预估工期：1-2周

#### 性能基准
8. **建立性能测试套件和基准测试**
   - 目标：FPS统计、内存使用监控、渲染调用统计
   - 验收标准：有完整的性能测试用例，能检测性能回归
   - 预估工期：2周

### 🎨 第二阶段：功能扩展任务 (3-6个月)

#### 高级文本渲染
9. **实现高级文本渲染 - 字体加载管理**
   - 目标：支持Web字体加载和字体回退
   - 验收标准：支持woff/woff2/ttf字体，有字体加载状态管理
   - 预估工期：2-3周

10. **实现高级文本渲染 - 富文本样式支持**
    - 目标：粗体、斜体、颜色、下划线等
    - 验收标准：支持HTML样式标签，文本能混合多种样式
    - 预估工期：3-4周

11. **实现高级文本渲染 - 多语言和文本方向支持**
    - 目标：RTL/LTR、多语言字符集
    - 验收标准：支持阿拉伯语、希伯来语等RTL文字
    - 预估工期：4-5周

#### 滤镜系统
12. **实现滤镜系统 - 基础滤镜(模糊、颜色调整)**
    - 目标：高斯模糊、亮度/对比度/饱和度
    - 验收标准：提供5种以上基础滤镜，性能达标
    - 预估工期：3-4周

13. **实现滤镜系统 - 阴影和发光效果**
    - 目标：投影、内阴影、外发光效果
    - 验收标准：支持可配置的阴影和发光，视觉效果优秀
    - 预估工期：2-3周

14. **实现滤镜系统 - 自定义着色器滤镜**
    - 目标：支持用户编写GLSL着色器
    - 验收标准：提供着色器API，用户能编写自定义效果
    - 预估工期：3-4周

#### 动画系统
15. **实现动画系统 - 属性补间动画**
    - 目标：Tween动画，支持各种缓动函数
    - 验收标准：支持10种以上缓动函数，动画流畅
    - 预估工期：2-3周

16. **实现动画系统 - 关键帧和路径动画**
    - 目标：复杂动画序列和路径跟随
    - 验收标准：支持关键帧编辑器，对象能沿路径移动
    - 预估工期：4-5周

17. **实现动画系统 - 时间轴管理**
    - 目标：Timeline类，支持动画编组和控制
    - 验收标准：动画能分组管理，支持暂停/继续/倒放
    - 预估工期：3-4周

### ⚡ 第三阶段：高级特性任务 (6-12个月)

#### 物理引擎集成
18. **集成物理引擎 - 集成Matter.js**
    - 目标：2D物理模拟基础架构
    - 验收标准：物理世界与渲染世界能同步，有基础物理效果
    - 预估工期：4-5周

19. **集成物理引擎 - 物理体与渲染同步**
    - 目标：物理状态自动同步到视觉对象
    - 验收标准：物理变化实时反映到渲染，性能无明显下降
    - 预估工期：3-4周

#### 粒子系统
20. **实现粒子系统 - GPU加速渲染**
    - 目标：使用WebGL实例化渲染大量粒子
    - 验收标准：支持10000+粒子同时渲染，保持60fps
    - 预估工期：5-6周

21. **实现粒子系统 - 粒子发射器和生命周期**
    - 目标：可配置发射器、粒子行为系统
    - 验收标准：支持多种发射器模式，粒子有完整生命周期
    - 预估工期：4-5周

#### 高级路径操作
22. **实现高级路径操作 - 布尔运算**
    - 目标：并集、交集、差集、异或运算
    - 验收标准：路径间能进行准确的布尔运算
    - 预估工期：6-8周

23. **实现高级路径操作 - 路径简化和编辑**
    - 目标：路径平滑、简化、控制点编辑
    - 验收标准：路径能智能简化，支持贝塞尔曲线编辑
    - 预估工期：4-5周

### 🔌 第四阶段：生态系统任务 (12-18个月)

#### 插件系统
24. **设计插件系统架构**
    - 目标：定义IPlugin接口和插件生命周期
    - 验收标准：有完整的插件开发指南和示例
    - 预估工期：3-4周

25. **实现插件管理器**
    - 目标：插件注册、加载、卸载机制
    - 验收标准：插件能动态加载，不影响主程序稳定性
    - 预估工期：2-3周

#### 开发工具
26. **开发性能分析和调试工具**
    - 目标：渲染统计、内存监控、场景树查看器
    - 验收标准：提供Chrome DevTools扩展或独立调试面板
    - 预估工期：6-8周

27. **开发场景编辑器工具**
    - 目标：可视化场景编辑和预览
    - 验收标准：能拖拽创建对象，所见即所得编辑
    - 预估工期：8-10周

#### 组件库
28. **构建组件库 - UI组件**
    - 目标：按钮、输入框、面板等交互组件
    - 验收标准：提供20种以上常用UI组件
    - 预估工期：6-8周

29. **构建组件库 - 图形组件库**
    - 目标：基础形状、图标、模板库
    - 验收标准：提供100种以上图形元素和模板
    - 预估工期：4-6周

### 📊 任务优先级说明

**P0 (最高优先级)**: 任务 1-8 (核心优化)
- 直接影响渲染性能和稳定性
- 为后续功能提供基础支持

**P1 (高优先级)**: 任务 9-17 (功能扩展)  
- 提供核心业务功能
- 用户体验直接相关

**P2 (中优先级)**: 任务 18-23 (高级特性)
- 高级功能，差异化竞争优势
- 技术难度较高

**P3 (低优先级)**: 任务 24-29 (生态建设)
- 生态系统完善
- 开发者体验优化

### 🎯 完整时间规划

**架构重构阶段 (0-2个月)**：
- **第1-2周**: 完成 A1 统一数学库
- **第3-5周**: 完成 A2 合并事件系统
- **第6-9周**: 完成 A3 几何运算下沉
- **第10-11周**: 完成 A4 性能监控统一
- **第12-15周**: 完成 A5 接口优化

**核心优化阶段 (2-5个月)**：
- **第3-5个月**: 完成任务1-8，建立稳定的渲染基础

**功能扩展阶段 (5-8个月)**：
- **第6-8个月**: 完成任务9-17，具备完整产品功能

**高级特性阶段 (8-14个月)**：
- **第9-14个月**: 完成任务18-23，提供高级特性

**生态建设阶段 (14-20个月)**：
- **第15-20个月**: 完成任务24-29，建设完整生态

> **总计40个任务**：5个架构重构任务 + 6个MVVM改造任务 + 29个功能开发任务

### ⚠️ 重构风险控制

**不考虑向下兼容的原因**：
1. 项目处于早期阶段，外部依赖较少
2. 架构重构的收益远大于兼容性维护成本
3. 统一架构后的长期维护成本更低

**风险缓解措施**：
1. **完整测试覆盖**：每个重构步骤都有对应的测试用例
2. **渐进式重构**：按模块逐步重构，降低单次变更风险
3. **性能基准测试**：确保重构后性能不倒退
4. **功能验证**：重构后的功能与重构前保持一致

---

## 📋 架构重构详细分析

### 当前架构问题

通过深入分析现有代码库，发现了以下关键问题：

1. **职责边界模糊**：Canvas SDK 和 Render Engine 都包含类似功能
2. **代码重复严重**：数学库和事件系统存在重复实现
3. **性能开销过大**：重复的监控和计算导致不必要的开销
4. **维护成本高**：相似功能的多套实现增加了维护难度

### Canvas SDK 当前承载的功能
- **核心SDK** (`CanvasSDK`, `CanvasSDKFactory`)
- **依赖注入系统** (`di/`)
- **交互系统** (`interaction/`) - 碰撞检测、事件系统、多选管理
- **工具系统** (`tools/`) - 绘制工具
- **插件系统** (`plugins/`) - 插件架构、性能监控
- **场景管理** (`scene/`) - 形状定义、场景树
- **动画系统** (`animation/`) - 动画引擎、缓动函数
- **历史管理** (`core/HistoryManager`)
- **数学库** (`math/`) - ⚠️ 与render-engine重复
- **事件系统** (`events/`) - ⚠️ 与render-engine重复
- **AI扩展** (`ai/`)
- **导入导出** (`io/`)
- **服务层** (`services/`)

### Render Engine 当前功能范围
- **核心渲染** (`RenderEngine`, 渲染管道)
- **WebGL/WebGPU 支持** (`webgl/`, `adapters/`)
- **批处理系统** (`batching/`, `batch/`)
- **图形原语** (`primitives/`)
- **数学库** (`math/`) - Vector2, Matrix3, Transform等
- **空间分割** (`culling/`)
- **渲染命令系统** (`commands/`)
- **纹理管理** (`textures/`)
- **内存管理** (`memory/`)
- **性能监控** (`performance/`)
- **事件系统** (`events/`)
- **着色器管理** (`shaders/`)

### 🎯 架构重构优化方案

#### 立即需要迁移的功能（P0优先级）

1. **统一数学库**
   - **问题**：Canvas SDK 和 Render Engine 都有数学库，功能重复
   - **方案**：移除 Canvas SDK 中的数学库，统一使用 Render Engine 的数学库
   - **影响**：减少代码重复，提高数学运算一致性
   - **预估工期**：1周

2. **合并事件系统**
   - **问题**：两个包都有独立的事件系统
   - **方案**：将底层事件处理移到 Render Engine，Canvas SDK 专注业务事件
   - **影响**：事件处理更高效，减少系统复杂度
   - **预估工期**：2-3周

#### 渐进式迁移功能（P1优先级）

3. **几何运算下沉**
   - **将内容**：碰撞检测的底层几何运算部分
   - **迁移到**：Render Engine 的数学库
   - **保留在Canvas SDK**：碰撞检测的业务逻辑和交互处理
   - **预估工期**：3-4周

4. **性能监控统一**
   - **将内容**：渲染性能相关的监控
   - **迁移到**：Render Engine
   - **保留在Canvas SDK**：业务性能监控（如插件性能）
   - **预估工期**：2周

#### 保持现状的功能

以下功能应该继续保留在 Canvas SDK，因为它们属于应用层逻辑：
- **交互系统**：用户交互逻辑
- **工具系统**：绘制工具业务逻辑
- **插件系统**：应用扩展机制
- **场景管理**：业务场景组织
- **动画系统**：应用级动画控制
- **历史管理**：用户操作历史
- **AI扩展**：智能功能
- **导入导出**：文件处理
- **依赖注入**：应用架构支持

### 📋 具体迁移任务列表

#### 阶段一：消除重复（1-2个月）

**任务 A1: 统一数学库**
- 目标：移除 Canvas SDK 中的数学库依赖
- 行动：
  1. 分析 Canvas SDK 中数学库的使用
  2. 将所有数学运算改为使用 Render Engine 的数学库
  3. 移除 Canvas SDK 中的 `math/` 目录
- 验收标准：Canvas SDK 不再包含任何数学运算实现
- 预估工期：1周

**任务 A2: 合并事件系统**
- 目标：建立统一的事件处理架构
- 行动：
  1. 设计统一的事件接口
  2. 将底层事件处理迁移到 Render Engine
  3. Canvas SDK 通过适配器使用底层事件系统
- 验收标准：只有一套事件系统，性能提升20%+
- 预估工期：2-3周

**任务 A3: 几何运算下沉**
- 目标：将碰撞检测的底层计算移到 Render Engine
- 行动：
  1. 识别碰撞检测中的纯几何运算
  2. 在 Render Engine 中实现几何运算 API
  3. Canvas SDK 调用 Render Engine 的几何运算
- 验收标准：碰撞检测性能提升，代码复用度提高
- 预估工期：3-4周

#### 阶段二：优化集成（2-3个月）

**任务 B1: 性能监控重构**
- 目标：统一性能监控，避免重复采集
- 行动：
  1. Render Engine 负责底层渲染性能监控
  2. Canvas SDK 监控应用级性能指标
  3. 提供统一的性能报告接口
- 验收标准：性能监控开销降低50%，数据更准确
- 预估工期：2周

**任务 B2: 接口优化**
- 目标：优化两个包之间的接口调用
- 行动：
  1. 减少不必要的接口调用
  2. 优化数据传递方式
  3. 实现更高效的通信机制
- 验收标准：包间调用开销降低30%
- 预估工期：3-4周

### 🎯 预期收益

#### 性能提升
- **内存使用减少**：消除重复代码，预计减少20-30%内存占用
- **运行效率提升**：统一数学库和事件系统，性能提升15-25%
- **包体积减少**：移除重复功能，Canvas SDK 体积减少15-20%

#### 架构改善
- **职责更清晰**：Render Engine 专注渲染，Canvas SDK 专注业务
- **维护性提高**：减少代码重复，降低维护成本
- **扩展性增强**：清晰的分层为后续功能扩展提供基础

#### 开发体验
- **API一致性**：统一的数学库和事件系统提供一致的开发体验
- **调试便利性**：单一的底层实现更容易调试和优化
- **文档简化**：减少重复概念，降低学习成本

### 📊 风险评估

#### 高风险项
1. **事件系统重构**：涉及面广，可能影响现有功能
   - **缓解措施**：分阶段重构，保持向后兼容
2. **API 变更**：可能需要修改现有调用代码
   - **缓解措施**：提供兼容层，渐进式迁移

#### 中风险项
1. **性能回归**：重构过程中可能引入性能问题
   - **缓解措施**：每次变更都进行性能测试
2. **功能缺失**：迁移过程中可能遗漏某些功能
   - **缓解措施**：详细的功能清单和测试覆盖

### 🔄 执行策略

**重构策略（不考虑向下兼容）**：
1. **直接重构**：在现有代码库中直接进行架构调整
2. **模块化重构**：按模块逐步重构，确保每个模块独立可测试
3. **全量测试**：每次重构后运行完整的测试套件
4. **性能基准**：建立详细的性能基准，确保重构带来性能提升
5. **文档实时更新**：重构完成后立即更新相关文档
6. **代码审查**：每个重构阶段都进行彻底的代码审查

**质量保证**：
- 每个任务都有明确的验收标准
- 重构前后的功能行为保持一致
- 性能指标必须达到预期目标
- 代码质量符合项目标准

### 📊 预期收益总结

**架构重构收益**：
- 内存使用减少：20-30%
- 运行效率提升：15-25%
- 包体积减少：15-20%（Canvas SDK）
- 代码重复率降低：60%+
- 维护成本降低：40%+

**长期发展收益**：
- 渲染性能：复杂场景60fps，简单场景120fps+
- 内存效率：相比竞品减少30%内存使用
- 加载速度：引擎核心 < 50KB gzipped
- 开发体验：统一的API，更好的调试支持

---

*本文档将根据开发进度持续更新。最后更新时间：2025年9月*
*重构策略：不考虑向下兼容，直接在当前代码库中进行架构优化*
