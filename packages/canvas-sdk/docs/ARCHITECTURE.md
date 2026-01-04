# Sky Canvas SDK 架构文档

## 概述

Sky Canvas SDK 采用现代化的分层架构设计，遵循 **MVVM + Manager + DI** 模式，实现了高度解耦和可维护的代码结构。整个架构基于依赖注入（DI）容器，支持插件系统和AI扩展。

## 架构原则

### 核心设计理念

```
DI Container（依赖管理）→ Service（单一职责）→ Manager（业务协调）→ ViewModel（状态管理）→ View（UI展示）
```

### 分层策略

- **简单场景**：ViewModel 直接使用单个 Service
- **复杂场景**：ViewModel 通过 Manager 协调多个 Services
- **扩展场景**：通过插件系统和AI扩展增强功能

> **原则**: Service 是独立的、功能单一的。如果 ViewModel 需要多个 Services，那就需要一个 Manager，否则直接在 ViewModel 中使用 Service。所有组件通过 DI 容器管理生命周期。

## 架构分层

### 0. DI 容器层（依赖管理）

基于 VSCode DI 架构的依赖注入系统：

```typescript
// 📁 src/di/
├── ServiceCollection.ts     # 服务集合管理
├── InstantiationService.ts  # 实例化服务
├── ServiceIdentifier.ts     # 服务标识符和装饰器
├── descriptors.ts           # 服务描述符
├── extensions.ts            # 扩展支持
├── graph.ts                 # 依赖图管理
└── instantiation.ts         # 实例化逻辑
```

```typescript
// 📁 src/container/
└── Container.ts             # DI 容器配置和管理
```

### 1. Service 层（单一职责）

每个 Service 专注于单一功能，通过依赖注入管理：

```typescript
// 📁 src/services/
├── rendering/         # 渲染服务
├── configuration/     # 配置服务
├── logging/           # 日志服务
├── history/           # 历史服务和命令系统
│   ├── historyService.ts  # 历史记录管理（支持变更监听）
│   └── commands.ts        # 命令实现集合
├── interaction/       # 交互服务
├── selection/         # 选择服务
├── clipboard/         # 剪贴板服务
├── zoom/              # 缩放服务
├── theme/             # 主题服务
├── shortcut/          # 快捷键服务
├── shape/             # 形状管理服务
├── export/            # 导出服务
└── import/            # 导入服务
```

**特点**：
- 每个服务只负责一个特定功能
- 使用 `@injectable` 装饰器支持 DI
- 接口与实现分离
- 无状态或最小状态

### 2. Manager 层（业务协调）

Manager 协调多个 Services，处理复杂的业务逻辑：

```typescript
// 📁 src/managers/
├── CanvasManager.ts        # 协调形状、选择、剪贴板、历史
├── ToolManager.ts          # 协调工具ViewModels、快捷键、交互
├── SceneManager.ts         # 协调图层、渲染、视口
├── ImportExportManager.ts  # 协调导入导出服务
└── TransactionManager.ts   # 协调历史服务的事务和批量操作
```

**实际实现的 Manager**：
- **CanvasManager**: 协调 ShapeService、SelectionService、HistoryService、ClipboardService
- **ToolManager**: 实现 IToolManager 接口，管理工具激活、事件处理、快捷键绑定

**特点**：
- 纯业务逻辑，无直接 DI 依赖
- 通过构造函数注入所需 Services
- 协调多个 Services 的复杂交互
- 发布业务事件

### 3. ViewModel 层（状态管理）

使用 Valtio 实现响应式状态管理，分为简单和复杂两类：

#### 简单 ViewModels（直接使用 Services）

```typescript
// 📁 src/viewmodels/
├── ThemeViewModel.ts    # 使用 ThemeService
├── ZoomViewModel.ts     # 使用 ZoomService
└── tools/
    ├── SelectToolViewModel.ts    # 使用 SelectionService
    └── RectangleToolViewModel.ts # 使用 CanvasManager
```

#### 复杂 ViewModels（使用 Managers）

```typescript
├── CanvasViewModel.ts   # 使用 CanvasManager
├── ToolViewModel.ts     # 使用 ToolManager
└── SceneViewModel.ts    # 使用 SceneManager
```

**特点**：
- 使用 Valtio proxy 实现响应式状态
- 实现 `IViewModel` 接口
- 支持 `getSnapshot()` 方法
- 状态变化自动触发 UI 更新

### 4. Model 层（数据模型）

纯数据模型，不包含业务逻辑：

```typescript
// 📁 src/models/
├── entities/
│   └── Shape.ts         # 形状实体定义和工厂
└── types/
    └── ToolTypes.ts     # 工具相关类型定义
```

**特点**：
- 使用工厂模式创建实体
- 严格的 TypeScript 类型定义
- 不包含渲染或业务逻辑

### 5. View 层（UI展示）

渲染层组件，负责将 Model 转换为可渲染对象：

```typescript
// 📁 src/views/
├── ShapeView.ts            # 形状渲染视图（实际实现）
├── SelectionView.ts        # 选择框渲染
└── ViewportView.ts         # 视口渲染
```

**实际实现**：
- **ShapeView**: 实现不同形状类型的渲染逻辑，包括矩形、圆形、路径、文本等
- 支持视口变换、样式应用、命中测试等功能

### 6. 插件系统层（扩展支持）

基于插件架构的扩展系统：

```typescript
// 📁 src/plugins/
├── PluginManager.ts        # 插件管理器
├── ExtensionManager.ts     # 扩展管理器
├── PermissionManager.ts    # 权限管理器
├── examples/
│   ├── CircleToolPlugin.ts # 圆形工具插件示例
│   └── TextToolPlugin.ts   # 文本工具插件示例
└── index.ts               # 插件系统导出
```

**插件系统特性**：
- 支持工具插件扩展
- 权限管理和安全控制
- 插件生命周期管理
- 提供插件开发示例

### 7. AI 扩展层（智能功能）

支持 AI 功能的扩展架构：

```typescript
// 📁 src/ai/
├── AIService.ts           # AI 服务接口
├── providers/             # AI 提供商实现
└── extensions/            # AI 功能扩展
```

## 架构示例

### 简单场景：主题切换

```typescript
// ThemeViewModel 直接使用 ThemeService
@injectable
export class ThemeViewModel implements IViewModel {
  constructor(
    @inject('IThemeService') private themeService: IThemeService
  ) {}
  
  switchTheme(theme: ThemeType): void {
    this.themeService.setTheme(theme);
  }
}
```

### 复杂场景：画布操作

```typescript
// CanvasViewModel 通过 CanvasManager 协调多个 Services
@injectable  
export class CanvasViewModel implements IViewModel {
  constructor(
    @inject('ICanvasManager') private canvasManager: ICanvasManager
  ) {}
  
  addShape(shape: ShapeEntity): void {
    // CanvasManager 内部协调：
    // - ShapeService：存储形状
    // - SelectionService：管理选择状态  
    // - HistoryService：记录历史
    // - 自动触发 state 更新（通过 valtio proxy）
    this.canvasManager.addShape(shape);
  }
}
```

## 依赖注入 (DI) 系统

### 服务注册

```typescript
// 📁 src/container/Container.ts
const services = new ServiceCollection();

// 注册单一职责 Services
services.registerSingleton(IThemeService, ThemeService);
services.registerSingleton(IShapeService, ShapeService);
services.registerSingleton(IHistoryService, HistoryService);

// 注册协调型 Managers
services.registerSingleton(ICanvasManager, CanvasManager);
services.registerSingleton(IToolManager, ToolManager);
```

### 服务使用

```typescript
// 使用 @inject 装饰器注入依赖
constructor(
  @inject('IThemeService') private themeService: IThemeService,
  @inject('ICanvasManager') private canvasManager: ICanvasManager
) {}
```

## 状态管理系统

### 响应式状态（Valtio）

使用 Valtio 实现响应式状态管理，替代传统的事件总线：

1. **Manager 状态**：使用 `proxy` 创建响应式状态
   ```typescript
   // CanvasManager.ts
   readonly state: CanvasState = proxy({
     shapeCount: 0,
     selectedIds: [],
     canUndo: false,
     canRedo: false,
     hasClipboardData: false
   });
   ```

2. **ViewModel 订阅**：使用 `subscribe` 监听状态变化
   ```typescript
   // CanvasViewModel.ts
   import { subscribe } from 'valtio/vanilla';
   
   private subscribeToCanvasManager(): void {
     this.unsubscribe = subscribe(this.canvasManager.state, () => {
       this.updateState();
     });
   }
   ```

3. **Service 监听器**：使用回调模式通知变化
   ```typescript
   // HistoryService.ts
   onDidChange(listener: HistoryChangeListener): () => void {
     this.listeners.push(listener);
     return () => { /* unsubscribe */ };
   }
   
   // CanvasManager.ts
   this.historyService.onDidChange(() => {
     this.syncState();
   });
   ```

## 工具系统架构

工具系统采用 ViewModel 模式，结合插件系统实现扩展：

### 工具 ViewModels

```typescript
// 📁 src/viewmodels/tools/
├── SelectToolViewModel.ts      # 选择工具（简单：直接使用 SelectionService）
├── RectangleToolViewModel.ts   # 矩形工具（复杂：使用 CanvasManager）
├── CircleToolViewModel.ts      # 圆形工具（通过插件扩展）
└── TextToolViewModel.ts        # 文本工具（通过插件扩展）
```

**实际实现的工具**：
- **SelectToolViewModel**: 使用 Valtio 状态管理，直接依赖 SelectionService
- **RectangleToolViewModel**: 处理矩形绘制逻辑，使用 CanvasManager 协调多个服务

### 工具管理

```typescript
// ToolManager 实现 IToolManager 接口
export class ToolManager implements IToolManager {
  constructor(
    @inject('IShortcutService') private shortcutService: IShortcutService,
    @inject('IHistoryService') private historyService: IHistoryService,
    @inject('ILogService') private logService: ILogService
  ) {}
  
  activateTool(toolName: string): void {
    // 协调工具切换、快捷键、状态管理
    // 支持插件工具的动态加载
  }
  
  // 支持鼠标和键盘事件处理
  handleMouseDown(event: MouseEvent): void
  handleMouseMove(event: MouseEvent): void
  handleMouseUp(event: MouseEvent): void
  handleKeyDown(event: KeyboardEvent): void
  handleKeyUp(event: KeyboardEvent): void
}
```

## 导入导出系统

按照新架构重构了导入导出功能：

### 服务层

- **ImportService**：单一职责处理文件导入
- **ExportService**：单一职责处理文件导出

### 管理层

- **ImportExportManager**：协调复杂的批量操作、项目导入导出

```typescript
// 简单导出：直接使用 Service
exportService.exportToSVG(shapes);

// 复杂操作：使用 Manager
importExportManager.batchImportFiles(files, {
  onProgress: (current, total) => updateUI(current, total)
});
```

## 历史和事务系统

按照新架构重构了历史记录和事务管理功能：

### 服务层

- **HistoryService**：单一职责处理撤销重做、命令执行
- **Commands**：丰富的命令实现（属性更改、集合操作等）

```typescript
// 基础历史操作：直接使用 Service
historyService.execute(new PropertyChangeCommand(target, 'color', newColor));
historyService.undo();
historyService.redo();

// 命令类型
├── PropertyChangeCommand      # 属性更改
├── MultiPropertyChangeCommand # 多属性更改
├── CollectionAddCommand       # 集合添加
├── CollectionRemoveCommand    # 集合删除
├── CollectionMoveCommand      # 集合移动
├── FunctionCommand           # 通用函数命令
├── AsyncCommandWrapper       # 异步命令包装
└── CompositeCommand          # 复合命令
```

### 管理层

- **TransactionManager**：协调复杂的批量操作、嵌套事务

```typescript
// 复杂事务操作：使用 Manager
transactionManager.batch('批量修改', () => {
  transactionManager.execute(command1);
  transactionManager.execute(command2);
  transactionManager.execute(command3);
});

// 嵌套事务支持
transactionManager.begin('外层事务');
  transactionManager.begin('内层事务');
    transactionManager.execute(innerCommand);
  transactionManager.commit();
  transactionManager.execute(outerCommand);
transactionManager.commit();
```

### 装饰器支持

```typescript
class ShapeEditor {
  constructor(private transactionManager: TransactionManager) {}
  
  @transactional('修改形状属性')
  updateShapeProperties(shape: Shape, props: Partial<ShapeProperties>): void {
    // 方法内的所有操作自动包装在事务中
    this.updateColor(shape, props.color);
    this.updateSize(shape, props.size);
    this.updatePosition(shape, props.position);
  }
}

## SDK 入口和初始化

### CanvasSDK 主入口

```typescript
// 📁 src/CanvasSDK.ts
export class CanvasSDK {
  private container: Container;
  private canvasManager: ICanvasManager;
  
  constructor() {
    // 初始化 DI 容器
    this.container = new Container();
    
    // 注册所有服务
    this.registerServices();
    
    // 获取核心管理器
    this.canvasManager = this.container.get<ICanvasManager>('ICanvasManager');
  }
  
  private registerServices(): void {
    // 注册基础服务
    registerInfrastructureServices(this.container);
    
    // 注册管理器
    this.container.register('ICanvasManager', CanvasManager);
    this.container.register('IToolManager', ToolManager);
  }
  
  // 提供公共 API
  public getCanvasManager(): ICanvasManager {
    return this.canvasManager;
  }
  
  public getService<T>(identifier: string): T {
    return this.container.get<T>(identifier);
  }
}
```

### 服务注册工厂

```typescript
// 📁 src/services/index.ts
export function registerInfrastructureServices(container: Container): void {
  // 注册所有基础服务
  container.register('ICanvasRenderingService', CanvasRenderingService);
  container.register('IConfigurationService', ConfigurationService);
  container.register('IHistoryService', HistoryService);
  container.register('ILogService', LogService);
  // ... 其他服务注册
}
```

## 优势总结

### 1. **清晰的职责分离**
- Service：单一功能
- Manager：业务协调  
- ViewModel：状态管理
- View：UI展示

### 2. **高度可维护性**
- 依赖注入实现松耦合
- 接口与实现分离
- 统一的架构模式

### 3. **强类型支持**
- TypeScript 严格模式
- 完整的类型定义
- 编译时错误检查

### 4. **响应式状态管理**
- Valtio 自动响应式更新
- 最小化状态管理复杂度
- 支持快照和回溯

### 5. **可扩展性**
- 完整的插件系统架构
- AI 功能扩展支持
- 清晰的扩展点和接口
- 向后兼容性保证

### 6. **现代化架构**
- 基于 VSCode DI 架构的依赖注入
- 支持异步操作和事务管理
- 完整的权限管理系统
- 插件生命周期管理

## 最佳实践

### DO ✅

1. **Service 设计**
   - 保持单一职责
   - 使用接口定义
   - 支持依赖注入

2. **Manager 设计**
   - 协调多个 Services
   - 处理复杂业务逻辑
   - 发布业务事件

3. **ViewModel 设计**
   - 使用 Valtio 响应式状态
   - 实现 IViewModel 接口
   - 简单场景直接使用 Service，复杂场景使用 Manager

### DON'T ❌

1. **避免直接依赖**
   - ViewModel 不直接调用其他 ViewModel
   - Service 不直接调用 Manager
   - 避免循环依赖

2. **避免混合职责**
   - Service 不处理复杂业务逻辑
   - Manager 不直接处理 UI 状态
   - View 不包含业务逻辑

3. **避免状态共享**
   - 通过事件而不是直接状态共享通信
   - 使用依赖注入而不是单例模式
   - 避免全局状态

---

这个架构设计确保了 Sky Canvas SDK 的高度模块化、可维护性和可扩展性，为构建复杂的画布应用提供了坚实的基础。