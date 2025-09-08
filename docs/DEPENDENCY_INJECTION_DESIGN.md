# Canvas SDK 依赖注入系统设计

## 🎯 设计目标

基于 VSCode 的依赖注入架构，为 Sky Canvas SDK 引入强大的 DI 系统，实现：

- **解耦组件**：减少硬编码依赖，提高代码可测试性
- **插件化架构**：支持第三方扩展和自定义服务
- **配置驱动**：通过配置文件控制服务注册和生命周期
- **类型安全**：提供完整的 TypeScript 类型支持
- **延迟加载**：支持服务的按需创建和初始化

## 🏗️ 架构设计

### VSCode DI 核心概念

VSCode 的 DI 系统基于以下核心概念：

1. **ServiceIdentifier**：服务标识符，唯一标识一个服务
2. **ServiceDescriptor**：服务描述符，定义服务的创建方式和生命周期
3. **InstantiationService**：实例化服务，负责创建和管理服务实例
4. **ServiceCollection**：服务集合，存储服务描述符
5. **Decorator**：装饰器，用于标记构造函数参数的依赖关系

### Canvas SDK DI 架构

```
┌─────────────────────────────────────────────────────────────┐
│                     Canvas SDK DI System                    │
├─────────────────────────────────────────────────────────────┤
│  ServiceIdentifier  │  ServiceDescriptor  │  ServiceScope   │
├─────────────────────┼────────────────────┼─────────────────┤
│        Core         │     Interaction    │    Rendering    │
│     Services        │     Services       │    Services     │
├─────────────────────┼────────────────────┼─────────────────┤
│   InstantiationService (服务创建和生命周期管理)            │
├─────────────────────────────────────────────────────────────┤
│                   ServiceCollection                         │
│               (服务注册表和配置管理)                        │
└─────────────────────────────────────────────────────────────┘
```

## 🔧 核心实现

### 1. 服务标识符系统

```typescript
// 服务标识符基类
export abstract class ServiceIdentifier<T = any> {
  constructor(public readonly id: string) {}
  
  toString(): string {
    return this.id;
  }
}

// 创建服务标识符的工厂函数
export function createServiceIdentifier<T>(id: string): ServiceIdentifier<T> {
  return new class extends ServiceIdentifier<T> {
    constructor() {
      super(id);
    }
  };
}

// 预定义的核心服务标识符
export const ICanvasRenderingService = createServiceIdentifier<ICanvasRenderingService>('canvasRenderingService');
export const IInteractionService = createServiceIdentifier<IInteractionService>('interactionService');
export const IHistoryService = createServiceIdentifier<IHistoryService>('historyService');
export const IAnimationService = createServiceIdentifier<IAnimationService>('animationService');
export const IEventBusService = createServiceIdentifier<IEventBusService>('eventBusService');
export const IShapeService = createServiceIdentifier<IShapeService>('shapeService');
export const ILayerService = createServiceIdentifier<ILayerService>('layerService');
export const ISelectionService = createServiceIdentifier<ISelectionService>('selectionService');
export const IViewportService = createServiceIdentifier<IViewportService>('viewportService');
export const IToolService = createServiceIdentifier<IToolService>('toolService');
export const IImportExportService = createServiceIdentifier<IImportExportService>('importExportService');
```

### 2. 服务生命周期管理

```typescript
// 服务生命周期枚举
export enum ServiceScope {
  Singleton = 'singleton',    // 单例，全局唯一
  Transient = 'transient',    // 瞬态，每次创建新实例
  Scoped = 'scoped',          // 作用域，在特定范围内单例
}

// 服务描述符
export interface ServiceDescriptor {
  identifier: ServiceIdentifier;
  scope: ServiceScope;
  factory?: (accessor: ServicesAccessor) => any;
  implementationClass?: new (...args: any[]) => any;
  dependencies?: ServiceIdentifier[];
  lazy?: boolean;
}

// 服务访问器
export interface ServicesAccessor {
  get<T>(identifier: ServiceIdentifier<T>): T;
  has(identifier: ServiceIdentifier): boolean;
}
```

### 3. 装饰器系统

```typescript
// 依赖注入装饰器
export function injectable<T extends new (...args: any[]) => any>(target: T): T {
  // 标记类为可注入
  Reflect.defineMetadata(INJECTABLE_METADATA_KEY, true, target);
  return target;
}

// 注入装饰器
export function inject<T>(identifier: ServiceIdentifier<T>) {
  return function (target: any, propertyKey: string | symbol | undefined, parameterIndex: number) {
    const existingTokens = Reflect.getMetadata(INJECT_METADATA_KEY, target) || [];
    existingTokens[parameterIndex] = identifier;
    Reflect.defineMetadata(INJECT_METADATA_KEY, existingTokens, target);
  };
}

// 可选注入装饰器
export function optional<T>(identifier: ServiceIdentifier<T>) {
  return function (target: any, propertyKey: string | symbol | undefined, parameterIndex: number) {
    const existingTokens = Reflect.getMetadata(OPTIONAL_INJECT_METADATA_KEY, target) || [];
    existingTokens[parameterIndex] = identifier;
    Reflect.defineMetadata(OPTIONAL_INJECT_METADATA_KEY, existingTokens, target);
  };
}
```

### 4. 服务集合

```typescript
export class ServiceCollection {
  private services = new Map<ServiceIdentifier, ServiceDescriptor>();
  
  // 注册单例服务
  addSingleton<T>(identifier: ServiceIdentifier<T>, implementationClass: new (...args: any[]) => T): this;
  addSingleton<T>(identifier: ServiceIdentifier<T>, factory: (accessor: ServicesAccessor) => T): this;
  addSingleton<T>(identifier: ServiceIdentifier<T>, implementation: any): this {
    return this.add({
      identifier,
      scope: ServiceScope.Singleton,
      ...(typeof implementation === 'function' && implementation.prototype 
        ? { implementationClass: implementation }
        : { factory: implementation })
    });
  }
  
  // 注册瞬态服务
  addTransient<T>(identifier: ServiceIdentifier<T>, implementationClass: new (...args: any[]) => T): this;
  addTransient<T>(identifier: ServiceIdentifier<T>, factory: (accessor: ServicesAccessor) => T): this;
  addTransient<T>(identifier: ServiceIdentifier<T>, implementation: any): this {
    return this.add({
      identifier,
      scope: ServiceScope.Transient,
      ...(typeof implementation === 'function' && implementation.prototype 
        ? { implementationClass: implementation }
        : { factory: implementation })
    });
  }
  
  // 注册作用域服务
  addScoped<T>(identifier: ServiceIdentifier<T>, implementationClass: new (...args: any[]) => T): this;
  addScoped<T>(identifier: ServiceIdentifier<T>, factory: (accessor: ServicesAccessor) => T): this;
  addScoped<T>(identifier: ServiceIdentifier<T>, implementation: any): this {
    return this.add({
      identifier,
      scope: ServiceScope.Scoped,
      ...(typeof implementation === 'function' && implementation.prototype 
        ? { implementationClass: implementation }
        : { factory: implementation })
    });
  }
  
  // 注册实例
  addInstance<T>(identifier: ServiceIdentifier<T>, instance: T): this {
    return this.add({
      identifier,
      scope: ServiceScope.Singleton,
      factory: () => instance
    });
  }
  
  private add(descriptor: ServiceDescriptor): this {
    this.services.set(descriptor.identifier, descriptor);
    return this;
  }
  
  get(identifier: ServiceIdentifier): ServiceDescriptor | undefined {
    return this.services.get(identifier);
  }
  
  has(identifier: ServiceIdentifier): boolean {
    return this.services.has(identifier);
  }
  
  getAll(): ServiceDescriptor[] {
    return Array.from(this.services.values());
  }
}
```

### 5. 实例化服务

```typescript
export class InstantiationService implements ServicesAccessor {
  private readonly services = new Map<ServiceIdentifier, any>();
  private readonly creating = new Set<ServiceIdentifier>();
  
  constructor(private readonly serviceCollection: ServiceCollection) {}
  
  get<T>(identifier: ServiceIdentifier<T>): T {
    // 检查循环依赖
    if (this.creating.has(identifier)) {
      throw new Error(`Circular dependency detected for service: ${identifier.id}`);
    }
    
    const descriptor = this.serviceCollection.get(identifier);
    if (!descriptor) {
      throw new Error(`Service not registered: ${identifier.id}`);
    }
    
    // 单例模式检查
    if (descriptor.scope === ServiceScope.Singleton && this.services.has(identifier)) {
      return this.services.get(identifier);
    }
    
    this.creating.add(identifier);
    
    try {
      const instance = this.createInstance(descriptor);
      
      // 缓存单例和作用域服务
      if (descriptor.scope === ServiceScope.Singleton || descriptor.scope === ServiceScope.Scoped) {
        this.services.set(identifier, instance);
      }
      
      return instance;
    } finally {
      this.creating.delete(identifier);
    }
  }
  
  has(identifier: ServiceIdentifier): boolean {
    return this.serviceCollection.has(identifier);
  }
  
  private createInstance<T>(descriptor: ServiceDescriptor): T {
    if (descriptor.factory) {
      return descriptor.factory(this);
    }
    
    if (descriptor.implementationClass) {
      return this.createClassInstance(descriptor.implementationClass);
    }
    
    throw new Error(`No factory or implementation class provided for service: ${descriptor.identifier.id}`);
  }
  
  private createClassInstance<T>(implementationClass: new (...args: any[]) => T): T {
    // 获取构造函数参数的依赖
    const dependencies = this.resolveDependencies(implementationClass);
    return new implementationClass(...dependencies);
  }
  
  private resolveDependencies(target: any): any[] {
    // 获取参数类型
    const paramTypes = Reflect.getMetadata('design:paramtypes', target) || [];
    
    // 获取注入的服务标识符
    const injectTokens = Reflect.getMetadata(INJECT_METADATA_KEY, target) || [];
    const optionalTokens = Reflect.getMetadata(OPTIONAL_INJECT_METADATA_KEY, target) || [];
    
    return paramTypes.map((_, index) => {
      const token = injectTokens[index] || optionalTokens[index];
      
      if (token) {
        if (optionalTokens[index]) {
          // 可选依赖
          return this.has(token) ? this.get(token) : null;
        } else {
          // 必需依赖
          return this.get(token);
        }
      }
      
      // 如果没有明确的注入标识符，尝试从参数类型推断
      if (paramTypes[index] && paramTypes[index].serviceIdentifier) {
        return this.get(paramTypes[index].serviceIdentifier);
      }
      
      throw new Error(`Cannot resolve dependency at index ${index} for ${target.name}`);
    });
  }
  
  // 销毁所有服务实例
  dispose(): void {
    for (const [identifier, instance] of this.services) {
      if (instance && typeof instance.dispose === 'function') {
        try {
          instance.dispose();
        } catch (error) {
          console.warn(`Error disposing service ${identifier.id}:`, error);
        }
      }
    }
    this.services.clear();
  }
}
```

## 🔄 服务接口定义

### 核心服务接口

```typescript
// 渲染服务接口
export interface ICanvasRenderingService {
  initialize(canvas: HTMLCanvasElement, config: any): Promise<void>;
  render(): void;
  start(): void;
  stop(): void;
  dispose(): void;
  getRenderEngine(): any;
}

// 交互服务接口
export interface IInteractionService {
  initialize(canvas: HTMLCanvasElement): void;
  setActiveTool(toolName: string): boolean;
  getActiveTool(): any;
  registerTool(tool: any): void;
  unregisterTool(name: string): void;
  setEnabled(enabled: boolean): void;
  dispose(): void;
}

// 历史服务接口
export interface IHistoryService {
  execute(command: any): void;
  undo(): void;
  redo(): void;
  canUndo(): boolean;
  canRedo(): boolean;
  clear(): void;
}

// 形状管理服务接口
export interface IShapeService {
  addShape(shape: any): void;
  removeShape(id: string): void;
  getShape(id: string): any | undefined;
  getShapes(): any[];
  updateShape(id: string, updates: any): void;
  clearShapes(): void;
}

// 选择服务接口
export interface ISelectionService {
  selectShape(id: string): void;
  deselectShape(id: string): void;
  clearSelection(): void;
  getSelectedShapes(): any[];
  isSelected(id: string): boolean;
  multiSelect(shapes: any[]): void;
}

// 视口服务接口
export interface IViewportService {
  getViewport(): any;
  setViewport(viewport: any): void;
  panViewport(delta: any): void;
  zoomViewport(factor: number, center?: any): void;
  fitToContent(): void;
  resetViewport(): void;
  screenToWorld(point: any): any;
  worldToScreen(point: any): any;
}

// 事件总线服务接口
export interface IEventBusService {
  emit<T>(event: string, data: T): void;
  on<T>(event: string, handler: (data: T) => void): void;
  off(event: string, handler?: Function): void;
  once<T>(event: string, handler: (data: T) => void): void;
}
```

## 📦 服务实现示例

### 渲染服务实现

```typescript
@injectable
export class CanvasRenderingService implements ICanvasRenderingService {
  private renderEngine: RenderEngine | null = null;
  
  constructor(
    @inject(IEventBusService) private eventBus: IEventBusService
  ) {}
  
  async initialize(canvas: HTMLCanvasElement, config: any): Promise<void> {
    this.renderEngine = new RenderEngine(config);
    // 实现初始化逻辑
    await this.renderEngine.initialize(/* factory */, canvas);
    
    this.eventBus.emit('renderingService:initialized', { canvas, config });
  }
  
  render(): void {
    if (this.renderEngine) {
      this.renderEngine.render();
    }
  }
  
  start(): void {
    if (this.renderEngine) {
      this.renderEngine.start();
      this.eventBus.emit('renderingService:started', {});
    }
  }
  
  stop(): void {
    if (this.renderEngine) {
      this.renderEngine.stop();
      this.eventBus.emit('renderingService:stopped', {});
    }
  }
  
  getRenderEngine(): any {
    return this.renderEngine;
  }
  
  dispose(): void {
    if (this.renderEngine) {
      this.renderEngine.dispose();
      this.renderEngine = null;
    }
  }
}
```

### 形状管理服务实现

```typescript
@injectable
export class ShapeService implements IShapeService {
  private shapes = new Map<string, any>();
  
  constructor(
    @inject(IEventBusService) private eventBus: IEventBusService,
    @inject(IHistoryService) private historyService: IHistoryService
  ) {}
  
  addShape(shape: any): void {
    this.shapes.set(shape.id, shape);
    
    // 记录历史
    this.historyService.execute({
      execute: () => this.shapes.set(shape.id, shape),
      undo: () => this.shapes.delete(shape.id)
    });
    
    this.eventBus.emit('shape:added', { shape });
  }
  
  removeShape(id: string): void {
    const shape = this.shapes.get(id);
    if (shape) {
      this.shapes.delete(id);
      
      // 记录历史
      this.historyService.execute({
        execute: () => this.shapes.delete(id),
        undo: () => this.shapes.set(id, shape)
      });
      
      shape.dispose();
      this.eventBus.emit('shape:removed', { shape });
    }
  }
  
  getShape(id: string): any | undefined {
    return this.shapes.get(id);
  }
  
  getShapes(): any[] {
    return Array.from(this.shapes.values())
      .sort((a, b) => a.zIndex - b.zIndex);
  }
  
  updateShape(id: string, updates: any): void {
    const shape = this.shapes.get(id);
    if (shape) {
      const oldData = { ...shape };
      Object.assign(shape, updates);
      
      // 记录历史
      this.historyService.execute({
        execute: () => Object.assign(shape, updates),
        undo: () => Object.assign(shape, oldData)
      });
      
      this.eventBus.emit('shape:updated', { shape, updates });
    }
  }
  
  clearShapes(): void {
    const shapesToRemove = Array.from(this.shapes.values());
    
    for (const shape of shapesToRemove) {
      shape.dispose();
    }
    
    this.shapes.clear();
    this.eventBus.emit('shapes:cleared', { count: shapesToRemove.length });
  }
}
```

## 🚀 新的 CanvasSDK 架构

### 基于 DI 的 CanvasSDK

```typescript
@injectable
export class CanvasSDK {
  private isInitialized = false;
  
  constructor(
    @inject(ICanvasRenderingService) private renderingService: ICanvasRenderingService,
    @inject(IInteractionService) private interactionService: IInteractionService,
    @inject(IShapeService) private shapeService: IShapeService,
    @inject(ISelectionService) private selectionService: ISelectionService,
    @inject(IViewportService) private viewportService: IViewportService,
    @inject(IHistoryService) private historyService: IHistoryService,
    @inject(IAnimationService) private animationService: IAnimationService,
    @inject(IEventBusService) private eventBus: IEventBusService,
    @optional(IImportExportService) private importExportService?: IImportExportService
  ) {
    this.setupEventHandlers();
  }
  
  async initialize(canvas: HTMLCanvasElement, config: any = {}): Promise<void> {
    if (this.isInitialized) {
      throw new Error('Canvas SDK already initialized');
    }
    
    // 初始化各个服务
    await this.renderingService.initialize(canvas, config);
    
    if (config.enableInteraction !== false) {
      this.interactionService.initialize(canvas);
    }
    
    this.isInitialized = true;
    this.eventBus.emit('sdk:initialized', { canvas, config });
  }
  
  private setupEventHandlers(): void {
    // 监听各种服务事件并转发
    this.eventBus.on('shape:added', (data) => {
      // 处理形状添加事件
    });
    
    this.eventBus.on('shape:selected', (data) => {
      // 处理形状选择事件
    });
    
    // ... 其他事件处理
  }
  
  // 公开的 API 方法
  addShape(shape: any): void {
    this.shapeService.addShape(shape);
  }
  
  selectShape(id: string): void {
    this.selectionService.selectShape(id);
  }
  
  setViewport(viewport: any): void {
    this.viewportService.setViewport(viewport);
  }
  
  undo(): void {
    this.historyService.undo();
  }
  
  redo(): void {
    this.historyService.redo();
  }
  
  dispose(): void {
    // 所有服务的清理工作由 DI 容器处理
    this.eventBus.emit('sdk:disposing', {});
    this.isInitialized = false;
  }
}
```

### 服务配置和启动

```typescript
// 创建服务配置
export function createDefaultServiceCollection(): ServiceCollection {
  const services = new ServiceCollection();
  
  // 注册核心服务
  services.addSingleton(IEventBusService, EventBusService);
  services.addSingleton(IHistoryService, HistoryService);
  services.addSingleton(ICanvasRenderingService, CanvasRenderingService);
  services.addSingleton(IShapeService, ShapeService);
  services.addSingleton(ISelectionService, SelectionService);
  services.addSingleton(IViewportService, ViewportService);
  services.addSingleton(IInteractionService, InteractionService);
  services.addSingleton(IAnimationService, AnimationService);
  
  // 可选服务
  services.addTransient(IImportExportService, ImportExportService);
  
  // 注册 SDK 本身
  services.addSingleton(CanvasSDK, CanvasSDK);
  
  return services;
}

// SDK 工厂函数
export async function createCanvasSDK(
  canvas: HTMLCanvasElement,
  config: any = {},
  customServices?: (services: ServiceCollection) => void
): Promise<CanvasSDK> {
  // 创建服务集合
  const services = createDefaultServiceCollection();
  
  // 应用自定义服务配置
  if (customServices) {
    customServices(services);
  }
  
  // 创建实例化服务
  const instantiationService = new InstantiationService(services);
  
  // 获取 SDK 实例
  const sdk = instantiationService.get(CanvasSDK);
  
  // 初始化 SDK
  await sdk.initialize(canvas, config);
  
  return sdk;
}
```

## 🎨 使用示例

### 基本使用

```typescript
// 基本使用
const canvas = document.getElementById('canvas') as HTMLCanvasElement;
const sdk = await createCanvasSDK(canvas, {
  renderEngine: 'webgl',
  enableInteraction: true
});

// 使用 SDK API
sdk.addShape(new RectangleShape('rect1', { x: 100, y: 100 }, { width: 200, height: 100 }));
sdk.selectShape('rect1');
sdk.setViewport({ zoom: 1.5 });
```

### 自定义服务

```typescript
// 自定义服务
@injectable
class CustomShapeService implements IShapeService {
  // 实现自定义的形状管理逻辑
}

// 注册自定义服务
const sdk = await createCanvasSDK(canvas, {}, (services) => {
  services.addSingleton(IShapeService, CustomShapeService);
});
```

### 插件开发

```typescript
// 插件接口
export interface ICanvasSDKPlugin {
  name: string;
  version: string;
  install(services: ServiceCollection): void;
  activate(sdk: CanvasSDK): void;
  deactivate(): void;
}

// 示例插件
export class GridPlugin implements ICanvasSDKPlugin {
  name = 'grid';
  version = '1.0.0';
  
  install(services: ServiceCollection): void {
    services.addSingleton(IGridService, GridService);
  }
  
  activate(sdk: CanvasSDK): void {
    // 激活网格功能
  }
  
  deactivate(): void {
    // 清理资源
  }
}

// 使用插件
const sdk = await createCanvasSDK(canvas, {}, (services) => {
  const gridPlugin = new GridPlugin();
  gridPlugin.install(services);
});
```

## 📊 优势分析

### 相比当前架构的优势

1. **更好的可测试性**
   - 依赖可以轻松 mock
   - 单元测试更容易编写
   - 服务间的耦合度降低

2. **更强的扩展性**
   - 插件可以注册自己的服务
   - 服务可以被替换或增强
   - 支持运行时服务发现

3. **更清晰的架构**
   - 职责分离更明确
   - 依赖关系显式声明
   - 生命周期管理统一

4. **更好的性能**
   - 支持延迟加载
   - 单例服务避免重复创建
   - 可以优化服务初始化顺序

### 迁移路径

1. **渐进式迁移**
   - 保持现有 API 兼容
   - 逐步将功能迁移到服务
   - 保留向后兼容的工厂函数

2. **服务化改造**
   - 将 CanvasSDK 的功能拆分到各个服务
   - 使用事件总线解耦服务间通信
   - 保持公共 API 稳定

3. **测试覆盖**
   - 为每个服务编写单元测试
   - 创建集成测试确保功能正常
   - 性能测试验证优化效果

## 🔮 未来扩展

1. **配置驱动的服务注册**
   - JSON/YAML 配置文件
   - 环境特定的服务配置
   - 热重载配置支持

2. **服务健康检查**
   - 服务状态监控
   - 异常服务重启
   - 依赖关系验证

3. **分布式服务支持**
   - Web Worker 中的服务
   - 远程服务调用
   - 服务网格集成

---

这个 DI 系统设计参考了 VSCode 的核心架构，为 Canvas SDK 提供了强大的依赖注入能力，支持插件化开发和服务的灵活配置。
