# Sky Canvas 指令系统架构设计

## 架构图表

本文档包含以下架构图表，帮助理解指令系统的设计：

### Mermaid 架构图
- [完整的 Mermaid 架构图集合](./command-system-architecture-mermaid.md) - 包含7个不同视角的架构图：
  - 整体架构图：展示三层架构的组件关系
  - 指令执行流程图：展示指令从创建到执行的完整时序
  - 指令类型结构图：展示指令的类型定义和继承关系
  - 指令处理器架构图：展示CommandExecutor和各种Handler的关系
  - 数据流向图：展示数据在系统中的流转过程
  - 组件依赖关系图：展示各组件之间的依赖关系
  - 指令生命周期图：展示指令的状态变迁过程


## 1. 背景与问题

### 当前架构问题
- 前端直接依赖 `@sky-canvas/render-engine` 的 Shape 类
- 前端需要了解 Shape 的构造函数参数和内部实现细节
- 违背了三层架构（前端 → SDK → 渲染引擎）的设计原则
- SDK 没有完全封装底层渲染细节

### 理想架构
```
前端 UI 层
    ↓ (只发送指令)
Canvas SDK 层 (指令执行器)
    ↓ (创建和管理 Shape 实例)
Render Engine 层
```

## 2. 开源项目调研

### 2.1 Excalidraw
- **架构特点**: Scene + Store + History + ActionManager 分层设计
- **指令系统**: 使用 `updateScene` API 和 `CaptureUpdateAction` 控制操作
- **历史管理**: 内置 multiplayer undo/redo 支持

### 2.2 tldraw
- **架构特点**: Shape 是 JSON 对象，ShapeUtil 类定义行为
- **指令系统**: 模块化 Action 系统，每个 Action 处理特定画布修改
- **扩展性**: AgentActionUtil 类定义可执行的操作

### 2.3 Fabric.js
- **架构特点**: 事件驱动（object:modified, object:added, object:removed）
- **历史实现**:
  - 状态快照方式：序列化整个画布为 JSON
  - 命令模式：更高效，避免重绘整个画布

### 2.4 Figma
- **架构特点**: 双线程架构（主线程 + iframe）
- **指令系统**: 通过 manifest 定义命令，消息传递通信
- **安全性**: Realms 沙箱隔离

## 3. 指令系统设计

### 3.1 核心概念

指令系统是前端与 SDK 之间的唯一通信方式，所有画布操作都通过发送指令来完成。

### 3.2 指令结构定义

```typescript
// 基础指令接口
interface CanvasCommand {
  type: CommandType;
  payload: any;
  metadata?: CommandMetadata;
}

// 指令元数据
interface CommandMetadata {
  timestamp: number;
  source: 'user' | 'system' | 'remote' | 'history';
  transactionId?: string;
  userId?: string;
}

// 指令类型枚举
enum CommandType {
  // 形状操作
  ADD_SHAPE = 'ADD_SHAPE',
  UPDATE_SHAPE = 'UPDATE_SHAPE',
  DELETE_SHAPE = 'DELETE_SHAPE',

  // 选择操作
  SELECT_SHAPE = 'SELECT_SHAPE',
  DESELECT_SHAPE = 'DESELECT_SHAPE',
  CLEAR_SELECTION = 'CLEAR_SELECTION',

  // 变换操作
  MOVE_SHAPE = 'MOVE_SHAPE',
  RESIZE_SHAPE = 'RESIZE_SHAPE',
  ROTATE_SHAPE = 'ROTATE_SHAPE',

  // Z轴操作
  BRING_TO_FRONT = 'BRING_TO_FRONT',
  SEND_TO_BACK = 'SEND_TO_BACK',
  BRING_FORWARD = 'BRING_FORWARD',
  SEND_BACKWARD = 'SEND_BACKWARD',

  // 批量操作
  BATCH_COMMAND = 'BATCH_COMMAND',

  // 画布操作
  CLEAR_CANVAS = 'CLEAR_CANVAS',
  IMPORT_DATA = 'IMPORT_DATA',
  EXPORT_DATA = 'EXPORT_DATA'
}
```

### 3.3 具体指令示例

#### 添加形状指令
```typescript
interface AddShapeCommand extends CanvasCommand {
  type: CommandType.ADD_SHAPE;
  payload: {
    shapeType: 'rectangle' | 'circle' | 'text' | 'path' | 'diamond';
    properties: {
      x: number;
      y: number;
      width?: number;
      height?: number;
      radius?: number;
      text?: string;
      style?: {
        fill?: string;
        stroke?: string;
        strokeWidth?: number;
        opacity?: number;
      };
    };
    id?: string;  // 可选，SDK 可以自动生成
  };
}
```

#### 更新形状指令
```typescript
interface UpdateShapeCommand extends CanvasCommand {
  type: CommandType.UPDATE_SHAPE;
  payload: {
    id: string;
    updates: Partial<ShapeProperties>;
  };
}
```

#### 批量指令
```typescript
interface BatchCommand extends CanvasCommand {
  type: CommandType.BATCH_COMMAND;
  payload: {
    commands: CanvasCommand[];
    atomic?: boolean;  // 是否原子操作
  };
}
```

## 4. 实现架构

### 4.1 指令执行流程

```
前端组件
    ↓ 创建指令对象
SDK.executeCommand(command)
    ↓
CommandExecutor (指令执行器)
    ↓ 验证指令
CommandHandler (指令处理器)
    ↓ 执行具体操作
Shape 实例创建/修改
    ↓
渲染更新 + 历史记录
```

### 4.2 SDK 层改造

#### CommandExecutor 类
```typescript
class CommandExecutor {
  private handlers: Map<CommandType, CommandHandler>;
  private historyService: IHistoryService;
  private canvasManager: CanvasManager;

  async execute(command: CanvasCommand): Promise<void> {
    // 1. 验证指令
    this.validateCommand(command);

    // 2. 获取对应处理器
    const handler = this.handlers.get(command.type);
    if (!handler) {
      throw new Error(`Unknown command type: ${command.type}`);
    }

    // 3. 创建历史记录
    const historyCommand = this.createHistoryCommand(command, handler);

    // 4. 执行指令
    await handler.execute(command.payload, this.canvasManager);

    // 5. 记录到历史
    this.historyService.execute(historyCommand);

    // 6. 发布事件
    this.eventBus.emit('command:executed', command);
  }
}
```

#### 指令处理器接口
```typescript
interface CommandHandler<T = any> {
  validate(payload: T): void;
  execute(payload: T, manager: CanvasManager): Promise<void>;
  createUndoCommand(payload: T): CanvasCommand;
}
```

#### AddShapeHandler 示例
```typescript
class AddShapeHandler implements CommandHandler<AddShapePayload> {
  validate(payload: AddShapePayload): void {
    // 验证必需参数
    if (!payload.shapeType) {
      throw new Error('shapeType is required');
    }
    if (typeof payload.properties.x !== 'number' ||
        typeof payload.properties.y !== 'number') {
      throw new Error('x and y coordinates are required');
    }
  }

  async execute(payload: AddShapePayload, manager: CanvasManager): Promise<void> {
    // 根据类型创建对应的 Shape 实例
    let shape: Shape;

    switch (payload.shapeType) {
      case 'rectangle':
        shape = new Rectangle({
          x: payload.properties.x,
          y: payload.properties.y,
          width: payload.properties.width || 100,
          height: payload.properties.height || 60,
          style: payload.properties.style
        });
        break;

      case 'circle':
        shape = new Circle({
          x: payload.properties.x,
          y: payload.properties.y,
          radius: payload.properties.radius || 50,
          style: payload.properties.style
        });
        break;

      // ... 其他形状类型
    }

    // 添加到画布
    manager.addShape(shape);
  }

  createUndoCommand(payload: AddShapePayload): CanvasCommand {
    return {
      type: CommandType.DELETE_SHAPE,
      payload: { id: payload.id }
    };
  }
}
```

### 4.3 前端层改造

#### 使用指令创建形状
```typescript
// 之前：直接依赖 Shape 类
import { Rectangle } from '@sky-canvas/render-engine';
const rect = new Rectangle({ x: 100, y: 100, width: 100, height: 60 });
sdkActions.addShape(rect);

// 之后：使用指令
sdkActions.executeCommand({
  type: 'ADD_SHAPE',
  payload: {
    shapeType: 'rectangle',
    properties: {
      x: 100,
      y: 100,
      width: 100,
      height: 60,
      style: {
        fill: '#ff0000',
        stroke: '#000000',
        strokeWidth: 2
      }
    }
  }
});
```

#### useCanvasSDK Hook 改造
```typescript
export function useCanvasSDK() {
  // ... 现有代码

  const executeCommand = useMemoizedFn((command: CanvasCommand) => {
    if (!sdkRef.current) {
      throw new Error('SDK not initialized');
    }
    return sdkRef.current.executeCommand(command);
  });

  // 便捷方法（可选）
  const addRectangle = useMemoizedFn((properties: RectangleProperties) => {
    return executeCommand({
      type: 'ADD_SHAPE',
      payload: {
        shapeType: 'rectangle',
        properties
      }
    });
  });

  const addCircle = useMemoizedFn((properties: CircleProperties) => {
    return executeCommand({
      type: 'ADD_SHAPE',
      payload: {
        shapeType: 'circle',
        properties
      }
    });
  });

  // ... 其他便捷方法
}
```

## 5. 指令系统的优势

### 5.1 架构优势
- **完全解耦**: 前端不需要知道 Shape 类的实现细节
- **统一接口**: 所有操作通过统一的指令接口
- **易于扩展**: 新功能只需添加新的指令类型和处理器

### 5.2 功能优势
- **可序列化**: 指令是纯 JSON 数据，便于存储和传输
- **历史记录**: 每个指令自动记录，天然支持 undo/redo
- **协作支持**: 指令可以轻松在网络传输，支持多人协作
- **录制回放**: 可以录制指令序列并回放
- **测试友好**: 指令是纯数据，易于模拟和测试

### 5.3 扩展性
- **复制粘贴**: 序列化为指令序列
- **导入导出**: 文件格式可以是指令序列
- **插件系统**: 插件通过指令与画布交互
- **AI 集成**: AI 可以生成指令序列

## 6. 迁移计划

### 第一阶段：基础设施（不破坏现有 API）
1. 在 `packages/canvas-sdk/src/commands/` 创建指令系统
2. 实现 CommandExecutor 和基础 Handler
3. 在 CanvasSDK 类中添加 `executeCommand` 方法
4. 保留现有 API 用于内部使用

### 第二阶段：前端迁移
1. 更新 useCanvasSDK hook 添加指令执行方法
2. 逐步替换前端的直接 Shape 创建代码
3. 移除前端对 `@sky-canvas/render-engine` 的依赖

### 第三阶段：优化和完善
1. 添加指令批处理优化
2. 完善指令验证和错误处理
3. 添加指令拦截器支持（用于插件）
4. 标记旧 API 为 deprecated

## 7. 示例：完整的添加矩形流程

```typescript
// 1. 前端创建指令
const command: AddShapeCommand = {
  type: 'ADD_SHAPE',
  payload: {
    shapeType: 'rectangle',
    properties: {
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
  },
  metadata: {
    timestamp: Date.now(),
    source: 'user'
  }
};

// 2. 发送到 SDK
await sdk.executeCommand(command);

// 3. SDK 内部处理
// - CommandExecutor 验证指令
// - AddShapeHandler 创建 Rectangle 实例
// - CanvasManager 添加到画布
// - HistoryService 记录操作
// - EventBus 发布事件

// 4. 前端接收更新事件并刷新 UI
```

## 8. 注意事项

1. **性能考虑**: 批量操作应使用 BATCH_COMMAND 减少开销
2. **错误处理**: 指令执行失败应该有明确的错误信息
3. **向后兼容**: 迁移期间保持旧 API 可用
4. **类型安全**: 使用 TypeScript 严格类型定义
5. **文档更新**: 及时更新 API 文档和使用示例

## 9. 总结

指令系统架构将 Sky Canvas 改造为更加模块化、可扩展的系统。通过指令作为唯一通信方式，实现了前端与渲染引擎的完全解耦，为未来的功能扩展（协作、AI、插件等）打下了坚实基础。