# Sky Canvas Command + Action 架构设计

## 核心理念：单向数据流

```
用户交互 → Action → Command → Model → View
```

## 1. Action（用户意图）

Action 是纯数据对象，描述用户想要做什么。**Action 本身必须是同步的**，但它所触发的执行流程可以是异步的。

```typescript
interface Action {
  type: string;
  payload?: any;
  metadata?: ActionMetadata;
}

interface ActionMetadata {
  timestamp: number;
  source: 'user' | 'system' | 'remote';
  async?: boolean; // 标识这个 Action 是否会触发异步操作
}

// Action 示例 - 同步数据对象
const addRectangleAction: Action = {
  type: 'ADD_RECTANGLE',
  payload: {
    x: 100,
    y: 100,
    width: 200,
    height: 150,
    style: {
      fill: '#3b82f6'
    }
  },
  metadata: {
    timestamp: Date.now(),
    source: 'user',
    async: false // 简单的形状添加，同步执行
  }
};

// 复杂异步操作的 Action 示例
const importFileAction: Action = {
  type: 'IMPORT_FILE',
  payload: {
    fileUrl: 'https://example.com/drawing.json',
    format: 'json'
  },
  metadata: {
    timestamp: Date.now(),
    source: 'user',
    async: true // 文件导入需要网络请求，异步执行
  }
};
```

### Action 设计原则

1. **纯数据对象**: Action 只包含数据，不包含方法或函数
2. **同步创建**: Action 的创建和构造必须是同步的
3. **描述意图**: Action 描述"做什么"，而不是"怎么做"
4. **可序列化**: Action 可以被序列化为 JSON，便于存储和传输

## 2. Command（执行单元）

Command 包含具体的执行逻辑和撤销逻辑。**Command 的执行可以是异步的**，支持网络请求、文件操作等异步场景。

```typescript
interface Command {
  execute(): void | Promise<void>;  // 可以是异步的
  undo(): void | Promise<void>;     // 撤销也可以是异步的
  redo?(): void | Promise<void>;    // 重做同样支持异步

  // 可选：用于异步操作的中断
  abort?(): void;

  // 可选：获取执行进度（用于长时间异步操作）
  getProgress?(): { current: number; total: number };
}

// Command 基类
abstract class BaseCommand implements Command {
  protected model: CanvasModel;

  constructor(model: CanvasModel) {
    this.model = model;
  }

  abstract execute(): void | Promise<void>;
  abstract undo(): void | Promise<void>;

  redo(): void | Promise<void> {
    return this.execute();
  }
}

// 具体 Command 示例
class AddShapeCommand extends BaseCommand {
  private shape: Shape;
  private shapeId: string;

  constructor(model: CanvasModel, shapeData: any) {
    super(model);
    // 创建 Shape 实例（前端不感知）
    this.shape = this.createShape(shapeData);
    this.shapeId = this.shape.id;
  }

  execute(): void {
    this.model.addShape(this.shape);
    this.model.notify({ type: 'shape-added', id: this.shapeId });
  }

  undo(): void {
    this.model.removeShape(this.shapeId);
    this.model.notify({ type: 'shape-removed', id: this.shapeId });
  }

  private createShape(data: any): Shape {
    switch (data.type) {
      case 'rectangle':
        return new Rectangle(data);
      case 'circle':
        return new Circle(data);
      default:
        throw new Error(`Unknown shape type: ${data.type}`);
    }
  }
}

// 异步 Command 示例
class ImportFileCommand extends BaseCommand {
  private fileUrl: string;
  private format: string;
  private importedShapes: Shape[] = [];
  private abortController?: AbortController;

  constructor(model: CanvasModel, payload: { fileUrl: string; format: string }) {
    super(model);
    this.fileUrl = payload.fileUrl;
    this.format = payload.format;
  }

  async execute(): Promise<void> {
    this.abortController = new AbortController();

    try {
      // 异步操作：获取文件
      this.model.notify({ type: 'import-started', fileUrl: this.fileUrl });

      const response = await fetch(this.fileUrl, {
        signal: this.abortController.signal
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch file: ${response.statusText}`);
      }

      const fileData = await response.json();

      // 解析和创建形状
      this.importedShapes = fileData.shapes.map((shapeData: any) =>
        this.createShapeFromData(shapeData)
      );

      // 批量添加到 Model
      this.importedShapes.forEach(shape => {
        this.model.addShape(shape);
      });

      this.model.notify({
        type: 'import-completed',
        count: this.importedShapes.length
      });

    } catch (error) {
      if (error.name === 'AbortError') {
        this.model.notify({ type: 'import-cancelled' });
      } else {
        this.model.notify({ type: 'import-failed', error: error.message });
        throw error;
      }
    }
  }

  async undo(): Promise<void> {
    // 异步撤销：移除所有导入的形状
    for (const shape of this.importedShapes) {
      this.model.removeShape(shape.id);
    }

    this.model.notify({
      type: 'import-undone',
      count: this.importedShapes.length
    });
  }

  abort(): void {
    if (this.abortController) {
      this.abortController.abort();
    }
  }

  private createShapeFromData(data: any): Shape {
    // 根据导入的数据创建形状
    switch (data.type) {
      case 'rectangle':
        return new Rectangle(data.properties);
      case 'circle':
        return new Circle(data.properties);
      default:
        throw new Error(`Unsupported shape type: ${data.type}`);
    }
  }
}
```

### 同步 vs 异步的设计要点

1. **Action 永远同步**: Action 对象的创建和传递必须是同步的
2. **Command 可以异步**: Command 的 `execute()` 和 `undo()` 方法支持异步操作
3. **流程控制异步**: ActionProcessor 使用 `await` 处理异步 Command
4. **错误处理**: 异步 Command 需要妥善处理网络错误、中断等情况
5. **进度反馈**: 长时间异步操作应该提供进度反馈和取消机制

## 3. ActionProcessor（Action → Command 映射）

使用**注册模式**来管理 Action 到 Command 的映射，符合开闭原则，支持模块化和动态扩展：

```typescript
// Command 创建函数类型
type CommandCreator = (model: CanvasModel, payload: any) => Command;

// Command 注册表
class CommandRegistry {
  private creators = new Map<string, CommandCreator>();

  // 注册 Command 创建函数
  register(actionType: string, creator: CommandCreator): void {
    this.creators.set(actionType, creator);
  }

  // 批量注册
  registerBatch(entries: Record<string, CommandCreator>): void {
    Object.entries(entries).forEach(([type, creator]) => {
      this.register(type, creator);
    });
  }

  // 创建 Command
  create(actionType: string, model: CanvasModel, payload: any): Command {
    const creator = this.creators.get(actionType);
    if (!creator) {
      throw new Error(`No command registered for action: ${actionType}`);
    }
    return creator(model, payload);
  }
}

// 改进的 ActionProcessor
class ActionProcessor {
  private model: CanvasModel;
  private history: HistoryManager;
  private registry: CommandRegistry;

  constructor(model: CanvasModel, history: HistoryManager) {
    this.model = model;
    this.history = history;
    this.registry = new CommandRegistry();
    this.registerCommands();
  }

  private registerCommands(): void {
    // 分组注册，提高可读性
    this.registerShapeCommands();
    this.registerSelectionCommands();
    this.registerTransformCommands();
    this.registerBatchCommands();
    this.registerAsyncCommands();
  }

  private registerShapeCommands(): void {
    this.registry.registerBatch({
      'ADD_RECTANGLE': (model, payload) =>
        new AddShapeCommand(model, { ...payload, type: 'rectangle' }),

      'ADD_CIRCLE': (model, payload) =>
        new AddShapeCommand(model, { ...payload, type: 'circle' }),

      'DELETE_SHAPE': (model, payload) =>
        new DeleteShapeCommand(model, payload.id),
    });
  }

  private registerSelectionCommands(): void {
    this.registry.registerBatch({
      'SELECT_SHAPES': (model, payload) =>
        new SelectShapesCommand(model, payload.ids),

      'CLEAR_SELECTION': (model) =>
        new ClearSelectionCommand(model),
    });
  }

  private registerBatchCommands(): void {
    this.registry.register('BATCH', (model, payload) =>
      new BatchCommand(model, this.registry, payload.actions)
    );
  }

  private registerAsyncCommands(): void {
    this.registry.registerBatch({
      'IMPORT_FILE': (model, payload) =>
        new ImportFileCommand(model, payload),

      'EXPORT_FILE': (model, payload) =>
        new ExportFileCommand(model, payload),

      'AUTO_SAVE': (model, payload) =>
        new AutoSaveCommand(model, payload),
    });
  }

  async processAction(action: Action): Promise<void> {
    const command = this.registry.create(action.type, this.model, action.payload);
    await command.execute();
    this.history.push(command);
  }
}
```

### 3.1 支持插件扩展

```typescript
// 插件接口
interface CommandPlugin {
  name: string;
  register(registry: CommandRegistry): void;
}

// 示例插件
class AdvancedShapesPlugin implements CommandPlugin {
  name = 'advanced-shapes';

  register(registry: CommandRegistry): void {
    registry.registerBatch({
      'ADD_POLYGON': (model, payload) => new AddPolygonCommand(model, payload),
      'ADD_STAR': (model, payload) => new AddStarCommand(model, payload),
    });
  }
}

// 使用插件
class ActionProcessor {
  usePlugin(plugin: CommandPlugin): void {
    plugin.register(this.registry);
    console.log(`Plugin "${plugin.name}" loaded`);
  }
}
```

### 3.2 注册模式的优势

1. **符合开闭原则** - 添加新命令无需修改核心代码
2. **模块化** - 命令可以分组管理
3. **可扩展** - 支持插件和动态注册
4. **可维护** - 避免巨大的 switch 语句
5. **可测试** - 每个命令创建函数可以独立测试

## 4. Model（状态管理）


Model 是单一数据源，只能通过 Command 修改。

```typescript
class CanvasModel {
  private shapes: Map<string, Shape> = new Map();
  private selection: Set<string> = new Set();
  private listeners: ((change: any) => void)[] = [];

  // 查询方法（只读）
  getShape(id: string): Shape | undefined {
    return this.shapes.get(id);
  }

  getShapes(): Shape[] {
    return Array.from(this.shapes.values());
  }

  getSelection(): string[] {
    return Array.from(this.selection);
  }

  // 修改方法（只能被 Command 调用）
  addShape(shape: Shape): void {
    this.shapes.set(shape.id, shape);
  }

  removeShape(id: string): void {
    this.shapes.delete(id);
    this.selection.delete(id);
  }

  updateShape(id: string, updates: Partial<Shape>): void {
    const shape = this.shapes.get(id);
    if (shape) {
      Object.assign(shape, updates);
    }
  }

  setSelection(ids: string[]): void {
    this.selection.clear();
    ids.forEach(id => this.selection.add(id));
  }

  // 通知机制
  subscribe(listener: (change: any) => void): () => void {
    this.listeners.push(listener);
    return () => {
      const index = this.listeners.indexOf(listener);
      if (index > -1) {
        this.listeners.splice(index, 1);
      }
    };
  }

  notify(change: any): void {
    this.listeners.forEach(listener => listener(change));
  }
}
```

## 5. HistoryManager（历史管理）

```typescript
class HistoryManager {
  private undoStack: Command[] = [];
  private redoStack: Command[] = [];
  private maxSize = 100;

  push(command: Command): void {
    this.undoStack.push(command);
    this.redoStack = []; // 清空重做栈

    if (this.undoStack.length > this.maxSize) {
      this.undoStack.shift();
    }
  }

  async undo(): Promise<void> {
    const command = this.undoStack.pop();
    if (!command) return;

    await command.undo();
    this.redoStack.push(command);
  }

  async redo(): Promise<void> {
    const command = this.redoStack.pop();
    if (!command) return;

    await command.redo();
    this.undoStack.push(command);
  }

  canUndo(): boolean {
    return this.undoStack.length > 0;
  }

  canRedo(): boolean {
    return this.redoStack.length > 0;
  }
}
```

## 6. CanvasSDK（对外接口）

```typescript
// SDK 状态变更事件类型
interface SDKChangeEvent {
  type: 'shapes-changed' | 'selection-changed' | 'history-changed' | 'render-completed';
  data?: any;
}

class CanvasSDK {
  private model: CanvasModel;
  private processor: ActionProcessor;
  private history: HistoryManager;
  private renderEngine: RenderEngine;
  private listeners: ((event: SDKChangeEvent) => void)[] = [];

  constructor(container: HTMLElement) {
    this.model = new CanvasModel();
    this.history = new HistoryManager();
    this.processor = new ActionProcessor(this.model, this.history);
    this.renderEngine = new RenderEngine(container);

    // 监听 Model 变化，更新渲染并转发给外部
    this.model.subscribe((change) => {
      this.handleModelChange(change);
    });
  }

  // 核心 API：分发 Action
  async dispatch(action: Action): Promise<void> {
    await this.processor.processAction(action);
  }

  // 历史操作
  async undo(): Promise<void> {
    await this.history.undo();
    this.notifyListeners({ type: 'history-changed' });
  }

  async redo(): Promise<void> {
    await this.history.redo();
    this.notifyListeners({ type: 'history-changed' });
  }

  // 状态查询
  getShapes(): Shape[] {
    return this.model.getShapes();
  }

  getSelection(): string[] {
    return this.model.getSelection();
  }

  canUndo(): boolean {
    return this.history.canUndo();
  }

  canRedo(): boolean {
    return this.history.canRedo();
  }

  // 订阅接口 - 完全封装 Model
  subscribe(listener: (event: SDKChangeEvent) => void): () => void {
    this.listeners.push(listener);
    return () => {
      const index = this.listeners.indexOf(listener);
      if (index > -1) {
        this.listeners.splice(index, 1);
      }
    };
  }

  // 销毁方法
  dispose(): void {
    this.listeners = [];
    this.renderEngine.dispose();
    // 其他清理逻辑...
  }

  private handleModelChange(change: any): void {
    // 触发重新渲染
    this.renderEngine.render(this.model.getShapes());

    // 将内部 Model 变更转换为 SDK 级别的事件
    let sdkEvent: SDKChangeEvent;

    switch (change.type) {
      case 'shape-added':
      case 'shape-removed':
      case 'shape-updated':
      case 'batch-executed':
        sdkEvent = { type: 'shapes-changed', data: change };
        break;

      case 'selection-changed':
        sdkEvent = { type: 'selection-changed', data: change };
        break;

      default:
        sdkEvent = { type: 'render-completed', data: change };
    }

    // 通知外部监听者
    this.notifyListeners(sdkEvent);
  }

  private notifyListeners(event: SDKChangeEvent): void {
    this.listeners.forEach(listener => {
      try {
        listener(event);
      } catch (error) {
        console.error('SDK listener error:', error);
      }
    });
  }
}
```

## 7. 前端使用

```typescript
// React Hook - 优化版本，完全封装了内部 Model
function useCanvasSDK() {
  const sdkRef = useRef<CanvasSDK>();
  const [shapes, setShapes] = useState<Shape[]>([]);
  const [selection, setSelection] = useState<string[]>([]);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);

  useEffect(() => {
    const container = document.getElementById('canvas-container');
    if (!container) return;

    const sdk = new CanvasSDK(container);
    sdkRef.current = sdk;

    // 使用 SDK 提供的订阅接口，不直接访问 Model
    const unsubscribe = sdk.subscribe((event: SDKChangeEvent) => {
      // 根据事件类型更新对应的状态
      switch (event.type) {
        case 'shapes-changed':
        case 'render-completed':
          setShapes(sdk.getShapes());
          break;

        case 'selection-changed':
          setSelection(sdk.getSelection());
          break;

        case 'history-changed':
          setCanUndo(sdk.canUndo());
          setCanRedo(sdk.canRedo());
          break;
      }
    });

    // 初始状态设置
    setShapes(sdk.getShapes());
    setSelection(sdk.getSelection());
    setCanUndo(sdk.canUndo());
    setCanRedo(sdk.canRedo());

    return () => {
      unsubscribe();
      sdk.dispose();
    };
  }, []);

  const dispatch = useCallback((action: Action) => {
    return sdkRef.current?.dispatch(action);
  }, []);

  const undo = useCallback(() => {
    return sdkRef.current?.undo();
  }, []);

  const redo = useCallback(() => {
    return sdkRef.current?.redo();
  }, []);

  return {
    // 状态
    shapes,
    selection,
    canUndo,
    canRedo,

    // 方法
    dispatch,
    undo,
    redo
  };
}

// 组件使用
function Toolbar() {
  const { dispatch, undo, redo, canUndo, canRedo } = useCanvasSDK();

  const handleAddRectangle = () => {
    dispatch({
      type: 'ADD_RECTANGLE',
      payload: {
        x: 100,
        y: 100,
        width: 200,
        height: 150,
        style: {
          fill: '#3b82f6',
          stroke: '#1e40af',
          strokeWidth: 2
        }
      }
    });
  };

  const handleDelete = () => {
    dispatch({ type: 'DELETE_SELECTED' });
  };

  // 异步操作示例
  const handleImportFile = async () => {
    try {
      // Action 本身是同步的，但触发的 Command 是异步的
      await dispatch({
        type: 'IMPORT_FILE',
        payload: {
          fileUrl: '/api/files/drawing.json',
          format: 'json'
        },
        metadata: {
          timestamp: Date.now(),
          source: 'user',
          async: true
        }
      });

      console.log('File imported successfully');
    } catch (error) {
      console.error('Import failed:', error);
    }
  };

  const handleExportFile = async () => {
    try {
      await dispatch({
        type: 'EXPORT_FILE',
        payload: {
          format: 'json',
          includeMetadata: true
        },
        metadata: {
          timestamp: Date.now(),
          source: 'user',
          async: true
        }
      });
    } catch (error) {
      console.error('Export failed:', error);
    }
  };

  return (
    <div>
      <button onClick={handleAddRectangle}>Add Rectangle</button>
      <button onClick={handleDelete}>Delete</button>
      <button onClick={undo} disabled={!canUndo}>Undo</button>
      <button onClick={redo} disabled={!canRedo}>Redo</button>

      {/* 异步操作按钮 */}
      <button onClick={handleImportFile}>Import File</button>
      <button onClick={handleExportFile}>Export File</button>
    </div>
  );
}
```

## 8. 批量操作

```typescript
// 批量 Command - 优化版本
class BatchCommand extends BaseCommand {
  private commands: Command[] = [];
  private completed: Command[] = [];
  private registry: CommandRegistry;

  constructor(model: CanvasModel, registry: CommandRegistry, actions: Action[]) {
    super(model);
    this.registry = registry;
    // 直接使用 CommandRegistry 创建命令，避免依赖不完整的 ActionProcessor
    this.commands = actions.map(action =>
      registry.create(action.type, model, action.payload)
    );
  }

  async execute(): Promise<void> {
    this.completed = []; // 重置已完成列表

    try {
      for (const cmd of this.commands) {
        await cmd.execute();
        this.completed.push(cmd);
      }
      // 批量操作只触发一次通知
      this.model.notify({
        type: 'batch-executed',
        count: this.commands.length,
        commandTypes: this.commands.map(cmd => cmd.constructor.name)
      });
    } catch (error) {
      // 出错时回滚已执行的命令
      await this.rollback();
      throw error;
    }
  }

  async undo(): Promise<void> {
    // 反向撤销所有已完成的命令
    for (let i = this.completed.length - 1; i >= 0; i--) {
      await this.completed[i].undo();
    }
    this.model.notify({
      type: 'batch-undone',
      count: this.completed.length
    });
  }

  private async rollback(): Promise<void> {
    // 回滚已执行的命令
    for (let i = this.completed.length - 1; i >= 0; i--) {
      try {
        await this.completed[i].undo();
      } catch (rollbackError) {
        console.error('Rollback failed:', rollbackError);
        // 继续回滚其他命令
      }
    }
    this.model.notify({
      type: 'batch-rollback',
      count: this.completed.length
    });
  }
}

// 使用批量操作
dispatch({
  type: 'BATCH',
  payload: {
    actions: [
      { type: 'ADD_RECTANGLE', payload: { x: 100, y: 100, width: 50, height: 30 } },
      { type: 'ADD_CIRCLE', payload: { x: 200, y: 100, radius: 25 } },
      { type: 'SELECT_SHAPES', payload: { ids: ['rect-1', 'circle-1'] } }
    ]
  }
});
```

## 9. 完整执行流程

```
1. 用户点击按钮
   ↓
2. 前端调用 dispatch({ type: 'ADD_RECTANGLE', payload: {...} })
   ↓
3. SDK.dispatch(action)
   ↓
4. ActionProcessor.processAction(action)
   ↓
5. createCommand(action) - 直接 switch/case 创建 Command
   ↓
6. new AddShapeCommand(model, payload) - Command 内部创建 Shape 实例
   ↓
7. await command.execute() - **异步等待执行完成**
   ↓
8. model.addShape(shape) - 更新 Model 状态
   ↓
9. model.notify(change) - 通知变更
   ↓
10. SDK 的 handleModelChange 被触发
    ↓
11. renderEngine.render() - 重新渲染
    ↓
12. HistoryManager.push(command) - 记录历史（确保完全执行后才记录）
    ↓
13. React 组件通过订阅收到更新，UI 刷新

### 异步操作流程（如文件导入）

```
1. 用户点击导入按钮
   ↓
2. 前端调用 dispatch({ type: 'IMPORT_FILE', payload: {...} }) - **Action 同步创建**
   ↓
3. SDK.dispatch(action) - 返回 Promise
   ↓
4. ActionProcessor.processAction(action)
   ↓
5. new ImportFileCommand(model, payload) - **Command 同步创建**
   ↓
6. await command.execute() - **异步执行**
   ↓
7. fetch(fileUrl) - 网络请求
   ↓
8. 解析文件数据 - 可能耗时
   ↓
9. model.addShape() - 批量添加形状
   ↓
10. model.notify({ type: 'import-completed' }) - 通知完成
    ↓
11. HistoryManager.push(command) - 只有成功后才记录
    ↓
12. React 组件收到更新，显示导入完成状态
```

## 10. 封装优化：SDK 订阅接口

### 10.1 问题分析

在最初的设计中，React Hook 直接访问 `sdk.model.subscribe()`：

```typescript
// ❌ 有问题的设计 - 封装泄露
const unsubscribe = sdk.model.subscribe(() => {
  setShapes(sdk.getShapes());
  // ...
});
```

**问题**：
- UI 层直接知道了 `model` 的存在
- 违背了封装原则，内部实现暴露给外部
- 如果以后重构 `CanvasSDK` 内部结构，会影响所有使用方

### 10.2 优化方案

**SDK 提供统一的订阅接口**：

```typescript
// ✅ 优化后的设计 - 完全封装
interface SDKChangeEvent {
  type: 'shapes-changed' | 'selection-changed' | 'history-changed' | 'render-completed';
  data?: any;
}

class CanvasSDK {
  // 提供 SDK 级别的订阅接口，而不是暴露内部 Model
  subscribe(listener: (event: SDKChangeEvent) => void): () => void {
    this.listeners.push(listener);
    return () => { /* cleanup */ };
  }

  private handleModelChange(change: any): void {
    // 将内部 Model 事件转换为 SDK 事件
    const sdkEvent = this.translateModelEvent(change);
    this.notifyListeners(sdkEvent);
  }
}
```

### 10.3 优化效果

1. **完全封装**: UI 层不知道内部有 `model` 这个概念
2. **稳定接口**: 即使内部重构，SDK 的订阅接口保持不变
3. **语义清晰**: SDK 事件更贴近业务语义，而不是底层实现
4. **错误隔离**: SDK 内部的监听器错误不会影响 UI

### 10.4 事件映射策略

```typescript
// 内部 Model 事件 → 外部 SDK 事件
private translateModelEvent(modelChange: any): SDKChangeEvent {
  switch (modelChange.type) {
    case 'shape-added':
    case 'shape-removed':
    case 'shape-updated':
      return { type: 'shapes-changed', data: modelChange };

    case 'selection-changed':
      return { type: 'selection-changed', data: modelChange };

    default:
      return { type: 'render-completed', data: modelChange };
  }
}
```

这种设计让 SDK 成为真正的"黑盒子"，外部只需要知道如何使用，不需要了解内部如何实现。

## 11. 架构优势

1. **单向数据流**: 数据流动方向明确，易于理解和调试
2. **完全解耦**: 前端只发 Action，不知道内部实现细节
3. **可撤销**: Command 模式天然支持 undo/redo
4. **可追踪**: 每个 Action 和 Command 都可以被记录和追踪
5. **可测试**: 各层职责清晰，可以独立测试
6. **可扩展**: 添加新功能只需要新的 Action 类型和对应的 Command
7. **批量操作**: 通过 BatchCommand 支持事务性操作
8. **完全封装**: SDK 提供稳定的外部接口，内部实现可以自由重构

## 12. 通知机制设计

### 12.1 职责分离原则

在 Command + Action 架构中，关于"谁负责通知 View 更新"是一个重要的设计决策。需要在以下职责之间找到平衡：

- **Command**：执行具体的业务逻辑
- **Model**：管理应用状态
- **ActionProcessor**：协调 Action 和 Command
- **通知机制**：告知 View 需要更新

### 12.2 三种通知模式

#### A. Command 内部通知（细粒度控制）

```typescript
class AddShapeCommand extends BaseCommand {
  execute(): void {
    this.model.addShape(this.shape);
    // Command 负责通知，可以提供精确的变更信息
    this.model.notify({
      type: 'shape-added',
      id: this.shapeId,
      shape: this.shape
    });
  }

  undo(): void {
    this.model.removeShape(this.shapeId);
    this.model.notify({
      type: 'shape-removed',
      id: this.shapeId
    });
  }
}
```

**优点：**
- Command 了解操作细节，可以发送精确的通知
- 支持复杂的通知逻辑
- 便于批量操作时的选择性通知

**缺点：**
- Command 职责过重
- 每个 Command 都需要记得调用 notify
- 通知逻辑分散，难以统一管理

#### B. Model 自动通知（观察者模式）

```typescript
class CanvasModel {
  addShape(shape: Shape): void {
    this.shapes.set(shape.id, shape);
    // Model 在数据变更时自动通知
    this.notify({ type: 'shape-added', id: shape.id });
  }

  removeShape(id: string): void {
    if (this.shapes.delete(id)) {
      this.notify({ type: 'shape-removed', id });
    }
  }
}

// Command 变得简单
class AddShapeCommand extends BaseCommand {
  execute(): void {
    this.model.addShape(this.shape); // Model 会自动通知
  }
}
```

**优点：**
- Command 最简单，只关注业务逻辑
- 保证所有变更都会被通知
- 符合观察者模式

**缺点：**
- 批量操作时会产生多次通知
- Model 需要知道如何描述每种变更
- 某些情况下可能不想要通知

#### C. ActionProcessor 统一通知（集中管理）

```typescript
interface Command {
  execute(): void | Promise<void>;
  undo(): void | Promise<void>;

  // 可选：Command 可以描述自己的变更
  getChangeDescription?(): ChangeDescription;
}

class ActionProcessor {
  async processAction(action: Action): Promise<void> {
    const command = this.createCommand(action);

    // 执行 Command
    await command.execute();

    // 统一处理通知
    const change = command.getChangeDescription?.() ||
                   { type: 'generic-change', action: action.type };
    this.model.notify(change);

    this.history.push(command);
  }
}
```

**优点：**
- 集中管理通知逻辑
- 便于添加横切关注点（日志、性能监控等）
- 支持批量操作优化

**缺点：**
- 可能无法获得操作的细节信息
- 需要额外的变更检测机制

### 12.3 职责分离原则详解

在设计通知机制时，需要明确各个组件的核心职责：

**Command 的核心职责**：
- 封装特定业务操作的执行逻辑（比如添加形状、删除形状）
- 提供操作的可逆性（undo 方法）
- 保证操作的原子性（execute 要么完全成功，要么完全失败）
- **不应该**：关心 UI 更新、管理应用状态的全局一致性

**Model 的核心职责**：
- 作为应用状态的唯一数据源
- 维护数据的内部一致性（比如删除形状时同时清理选择状态）
- 提供状态变更的通知机制
- **不应该**：知道具体的业务逻辑细节

**ActionProcessor 的核心职责**：
- 协调整个执行流程（Action → Command → Model → Notification）
- 管理跨命令的关注点（历史记录、批量操作、性能监控）
- 决定通知策略和时机
- **不应该**：包含具体的业务逻辑

### 12.4 批量操作优化策略

对于图形编辑器，批量操作优化至关重要。以下是几种策略：

#### A. 通知合并策略

```typescript
class CanvasModel {
  private notificationQueue: ChangeDescription[] = [];
  private flushTimer: NodeJS.Timeout | null = null;

  // 延迟通知，合并多个变更
  notify(change: ChangeDescription): void {
    this.notificationQueue.push(change);

    if (this.flushTimer) {
      clearTimeout(this.flushTimer);
    }

    // 16ms 后合并发送（一个动画帧的时间）
    this.flushTimer = setTimeout(() => {
      this.flushNotifications();
    }, 16);
  }

  private flushNotifications(): void {
    if (this.notificationQueue.length === 0) return;

    // 合并同类型通知
    const mergedChange = this.mergeNotifications(this.notificationQueue);
    this.listeners.forEach(listener => listener(mergedChange));

    this.notificationQueue = [];
    this.flushTimer = null;
  }

  private mergeNotifications(changes: ChangeDescription[]): ChangeDescription {
    // 如果只有一个变更，直接返回
    if (changes.length === 1) return changes[0];

    // 按类型分组合并
    const grouped = new Map<string, ChangeDescription[]>();
    changes.forEach(change => {
      const key = change.type;
      if (!grouped.has(key)) grouped.set(key, []);
      grouped.get(key)!.push(change);
    });

    return {
      type: 'batch-changes',
      changes: Array.from(grouped.values()).map(group =>
        group.length === 1 ? group[0] : this.mergeGroup(group)
      ),
      totalCount: changes.length
    };
  }
}
```

#### B. 事务性批量操作

```typescript
class BatchCommand extends BaseCommand {
  private commands: Command[] = [];
  private completed: Command[] = [];
  private registry: CommandRegistry;

  constructor(model: CanvasModel, registry: CommandRegistry, actions: Action[]) {
    super(model);
    this.registry = registry;
    this.commands = actions.map(action =>
      registry.create(action.type, model, action.payload)
    );
  }

  async execute(): Promise<void> {
    // 开启批量模式，暂停通知
    this.model.beginBatch();

    try {
      for (const command of this.commands) {
        await command.execute();
        this.completed.push(command);
      }

      // 所有命令成功后，一次性发送通知
      this.model.endBatch();

    } catch (error) {
      // 出错时回滚已执行的命令
      await this.rollback();
      throw error;
    }
  }

  async undo(): Promise<void> {
    // 反向撤销所有已完成的命令
    for (let i = this.completed.length - 1; i >= 0; i--) {
      await this.completed[i].undo();
    }

    this.model.notify({
      type: 'batch-undone',
      count: this.completed.length
    });
  }

  private async rollback(): Promise<void> {
    // 回滚已执行的命令
    for (let i = this.completed.length - 1; i >= 0; i--) {
      try {
        await this.completed[i].undo();
      } catch (rollbackError) {
        console.error('Rollback failed:', rollbackError);
      }
    }
    this.model.endBatch(); // 确保退出批量模式
  }
}
```

#### C. 智能渲染优化

```typescript
class OptimizedCanvasModel extends CanvasModel {
  private dirtyRegions: Set<string> = new Set();
  private renderScheduled = false;

  notify(change: ChangeDescription): void {
    // 记录脏区域而不是立即渲染
    this.markDirtyRegion(change);

    if (!this.renderScheduled) {
      this.renderScheduled = true;
      requestAnimationFrame(() => {
        this.flushRender();
      });
    }
  }

  private markDirtyRegion(change: ChangeDescription): void {
    switch (change.type) {
      case 'shape-added':
      case 'shape-updated':
        this.dirtyRegions.add(change.shapeId);
        break;
      case 'shapes-moved':
        change.shapeIds.forEach(id => this.dirtyRegions.add(id));
        break;
      case 'viewport-changed':
        this.dirtyRegions.add('viewport');
        break;
    }
  }

  private flushRender(): void {
    // 只重新渲染脏区域
    const affectedShapes = Array.from(this.dirtyRegions)
      .filter(id => id !== 'viewport')
      .map(id => this.shapes.get(id))
      .filter(Boolean);

    this.renderEngine.renderPartial(affectedShapes);

    this.dirtyRegions.clear();
    this.renderScheduled = false;

    // 发送渲染完成通知
    this.listeners.forEach(listener => listener({
      type: 'render-completed',
      shapeCount: affectedShapes.length
    }));
  }
}
```

### 12.5 推荐方案：混合模式

结合三种模式的优点，根据不同场景选择合适的通知策略：

```typescript
// 支持灵活通知的 Command 接口
interface Command {
  execute(): void | Promise<void>;
  undo(): void | Promise<void>;

  // 可选：Command 是否自己处理通知
  handlesOwnNotification?(): boolean;

  // 可选：描述变更，供 ActionProcessor 使用
  getChangeDescription?(): ChangeDescription;
}

// 支持批量操作的 Model
class CanvasModel {
  private batchMode = false;
  private batchChanges: ChangeDescription[] = [];

  beginBatch(): void {
    this.batchMode = true;
    this.batchChanges = [];
  }

  endBatch(): void {
    this.batchMode = false;
    if (this.batchChanges.length > 0) {
      this.notify({
        type: 'batch-change',
        changes: this.batchChanges,
        count: this.batchChanges.length
      });
    }
  }

  notify(change: ChangeDescription): void {
    if (this.batchMode) {
      this.batchChanges.push(change);
    } else {
      this.listeners.forEach(listener => listener(change));
    }
  }
}

// 灵活的 ActionProcessor
class ActionProcessor {
  async processAction(action: Action): Promise<void> {
    const command = this.createCommand(action);

    // 处理批量操作
    const isBatch = action.type === 'BATCH';
    if (isBatch) {
      this.model.beginBatch();
    }

    await command.execute();

    // 根据 Command 决定通知策略
    if (!command.handlesOwnNotification?.()) {
      const change = command.getChangeDescription?.() ||
                     this.detectChange(action);
      this.model.notify(change);
    }

    if (isBatch) {
      this.model.endBatch();
    }

    this.history.push(command);
  }

  private detectChange(action: Action): ChangeDescription {
    // 根据 Action 类型生成通用的变更描述
    return {
      type: 'action-executed',
      actionType: action.type,
      timestamp: Date.now()
    };
  }
}
```

### 12.6 选择指南

根据不同的应用场景和需求，选择合适的通知策略：

#### 场景一：简单绘图应用
**推荐：Model 自动通知**
- 操作类型简单（添加、删除、修改形状）
- 不需要复杂的UI反馈
- 开发团队较小，追求简单

```typescript
// 简单且一致的通知
class SimpleCanvasModel {
  addShape(shape: Shape): void {
    this.shapes.set(shape.id, shape);
    this.notify({ type: 'shape-added', id: shape.id });
  }
}
```

#### 场景二：专业图形编辑器
**推荐：混合模式**
- 需要精确的UI反馈（进度条、状态更新）
- 有复杂的批量操作需求
- 需要支持插件和扩展

```typescript
// 复杂命令自己处理通知
class ComplexTransformCommand extends BaseCommand {
  handlesOwnNotification(): boolean {
    return true; // 自己处理通知
  }

  async execute(): Promise<void> {
    // 开始变换时通知
    this.model.notify({ type: 'transform-started', ids: this.shapeIds });

    for (const [i, shapeId] of this.shapeIds.entries()) {
      await this.transformShape(shapeId);

      // 每完成一个形状就更新进度
      this.model.notify({
        type: 'transform-progress',
        current: i + 1,
        total: this.shapeIds.length
      });
    }

    // 完成时通知
    this.model.notify({ type: 'transform-completed', ids: this.shapeIds });
  }
}
```

#### 场景三：实时协作编辑器
**推荐：ActionProcessor 统一通知**
- 需要网络同步
- 需要冲突解决
- 需要记录详细的操作日志

```typescript
class CollaborativeActionProcessor extends ActionProcessor {
  async processAction(action: Action): Promise<void> {
    // 添加协作相关的元数据
    const enrichedAction = {
      ...action,
      userId: this.currentUser.id,
      timestamp: Date.now(),
      sessionId: this.sessionId
    };

    const command = this.createCommand(enrichedAction);
    await command.execute();

    // 统一发送给本地和远程
    const change = {
      type: 'collaborative-change',
      action: enrichedAction,
      resultState: this.model.getSnapshot()
    };

    this.model.notify(change);
    this.networkSync.broadcast(change);

    this.history.push(command);
  }
}
```

#### 场景四：高性能大数据可视化
**推荐：批量优化 + 智能渲染**
- 需要处理大量数据
- 对性能要求极高
- 需要精细的渲染控制

```typescript
class PerformanceOptimizedModel extends CanvasModel {
  private updateScheduler = new UpdateScheduler();

  notify(change: ChangeDescription): void {
    // 将变更交给调度器处理
    this.updateScheduler.scheduleUpdate(change, () => {
      this.listeners.forEach(listener => listener(change));
    });
  }
}

class UpdateScheduler {
  private pendingUpdates: Map<string, ChangeDescription> = new Map();
  private updateTimer: number | null = null;

  scheduleUpdate(change: ChangeDescription, callback: () => void): void {
    // 合并同类型的更新
    const key = `${change.type}-${change.shapeId || 'global'}`;
    this.pendingUpdates.set(key, change);

    if (this.updateTimer === null) {
      this.updateTimer = requestAnimationFrame(() => {
        this.flushUpdates(callback);
      });
    }
  }

  private flushUpdates(callback: () => void): void {
    // 批量处理所有待更新项
    const changes = Array.from(this.pendingUpdates.values());
    if (changes.length > 0) {
      callback();
    }

    this.pendingUpdates.clear();
    this.updateTimer = null;
  }
}
```

#### 决策矩阵

| 指标 | Model通知 | Command通知 | Processor通知 | 混合模式 |
|------|-----------|-------------|---------------|----------|
| **实现复杂度** | 低 | 中 | 中 | 高 |
| **性能** | 中 | 高 | 高 | 最高 |
| **灵活性** | 低 | 高 | 中 | 最高 |
| **维护成本** | 低 | 高 | 中 | 高 |
| **扩展性** | 低 | 中 | 高 | 最高 |
| **团队门槛** | 低 | 中 | 中 | 高 |

#### 选择建议

1. **MVP 阶段**：选择 Model 自动通知，快速验证产品价值
2. **功能增长期**：逐步引入 Command 内部通知处理复杂场景
3. **成熟产品**：采用混合模式，根据具体场景选择最优策略
4. **企业级应用**：基于上述三种模式设计自己的通知框架

## 13. 与 Redux 的对比

### 相似点
- 单向数据流
- Action 驱动
- 状态不可变（通过 Command 修改）

### 不同点
- Command 包含执行和撤销逻辑
- 不需要 Reducer，Command 直接修改 Model
- 更适合需要撤销/重做的图形编辑器场景