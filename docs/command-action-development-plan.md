# Sky Canvas Command + Action 架构实现计划

## 一、现状分析

### 当前问题
1. **架构违背**：前端直接导入 `@sky-canvas/render-engine` 的 Shape 类，违反三层架构
2. **封装泄露**：`useCanvasSDK` Hook 暴露内部实现细节
3. **缺少指令系统**：没有统一的 Action/Command 模式
4. **通知机制不完善**：事件系统松散，缺乏统一管理

### 现有基础
- 已有 Command 基础设施（`services/history/commands.ts`）
- 已有 DI 容器系统
- 已有事件总线服务

## 二、实现步骤

### 第1阶段：核心基础设施（2天）

#### 1.1 创建 Action 系统
- `packages/canvas-sdk/src/actions/types.ts` - Action 类型定义
- `packages/canvas-sdk/src/actions/creators.ts` - Action 创建器
- 包含同步/异步 Action 支持

```typescript
// Action 类型定义
interface Action {
  type: string;
  payload?: any;
  metadata?: ActionMetadata;
}

interface ActionMetadata {
  timestamp: number;
  source: 'user' | 'system' | 'remote';
  async?: boolean;
}
```

#### 1.2 扩展 Command 系统
- `packages/canvas-sdk/src/commands/base.ts` - 基础 Command 类
- `packages/canvas-sdk/src/commands/shapes/` - 形状相关命令
- `packages/canvas-sdk/src/commands/selection/` - 选择相关命令
- 支持异步执行和中断机制

```typescript
interface Command {
  execute(): void | Promise<void>;
  undo(): void | Promise<void>;
  redo?(): void | Promise<void>;
  abort?(): void;
  getProgress?(): { current: number; total: number };
}
```

#### 1.3 实现 CommandRegistry
- `packages/canvas-sdk/src/commands/registry.ts` - 注册表实现
- 支持插件式命令注册
- 批量注册机制

```typescript
class CommandRegistry {
  private creators = new Map<string, CommandCreator>();

  register(actionType: string, creator: CommandCreator): void;
  registerBatch(entries: Record<string, CommandCreator>): void;
  create(actionType: string, model: CanvasModel, payload: any): Command;
}
```

#### 1.4 创建 ActionProcessor
- `packages/canvas-sdk/src/processors/ActionProcessor.ts`
- Action 到 Command 的映射
- 批量操作优化

### 第2阶段：Model 层重构（2天）

#### 2.1 创建 CanvasModel
- `packages/canvas-sdk/src/models/CanvasModel.ts`
- 统一状态管理
- 通知机制实现

```typescript
class CanvasModel {
  private shapes: Map<string, Shape> = new Map();
  private selection: Set<string> = new Set();
  private listeners: ((change: any) => void)[] = [];

  // 查询方法（只读）
  getShape(id: string): Shape | undefined;
  getShapes(): Shape[];
  getSelection(): string[];

  // 修改方法（只能被 Command 调用）
  addShape(shape: Shape): void;
  removeShape(id: string): void;
  updateShape(id: string, updates: Partial<Shape>): void;

  // 通知机制
  subscribe(listener: (change: any) => void): () => void;
  notify(change: any): void;
}
```

#### 2.2 重构状态管理
- 将形状数据迁移到 Model
- 实现批量操作模式
- 添加事务支持

#### 2.3 通知机制优化
- 实现三种通知模式（Command/Model/Processor）
- 批量通知合并
- 脏区域标记优化

### 第3阶段：SDK 封装优化（2天）

#### 3.1 重构 CanvasSDK 类
- 添加 `dispatch(action)` 方法
- 实现 `subscribe()` 订阅接口
- 隐藏内部 Model 实现

```typescript
class CanvasSDK {
  // 核心 API：分发 Action
  async dispatch(action: Action): Promise<void> {
    await this.processor.processAction(action);
  }

  // 订阅接口 - 完全封装 Model
  subscribe(listener: (event: SDKChangeEvent) => void): () => void {
    this.listeners.push(listener);
    return () => { /* cleanup */ };
  }
}
```

#### 3.2 改进 SDK 事件系统
- 定义 `SDKChangeEvent` 类型
- Model 事件到 SDK 事件映射
- 错误隔离机制

```typescript
interface SDKChangeEvent {
  type: 'shapes-changed' | 'selection-changed' | 'history-changed' | 'render-completed';
  data?: any;
}
```

#### 3.3 历史管理集成
- 将 HistoryManager 与 ActionProcessor 集成
- 只记录成功执行的命令
- 支持异步命令的撤销/重做

### 第4阶段：前端层迁移（3天）

#### 4.1 移除直接 Shape 导入
- 删除所有 `from '@sky-canvas/render-engine'` 的导入
- 通过 Action 创建形状

```typescript
// 旧代码（需要移除）
import { Rectangle, Circle } from '@sky-canvas/render-engine';
const rect = new Rectangle({ ... });

// 新代码（使用 Action）
dispatch({
  type: 'ADD_RECTANGLE',
  payload: { x: 100, y: 100, width: 200, height: 150 }
});
```

#### 4.2 重构 useCanvasSDK Hook
- 使用新的订阅接口
- 移除对内部 Model 的访问
- 优化状态更新逻辑

```typescript
function useCanvasSDK() {
  // 使用 SDK 提供的订阅接口，不直接访问 Model
  const unsubscribe = sdk.subscribe((event: SDKChangeEvent) => {
    switch (event.type) {
      case 'shapes-changed':
        setShapes(sdk.getShapes());
        break;
      // ...
    }
  });
}
```

#### 4.3 更新组件
- `Canvas.tsx` - 移除直接 Shape 创建
- `Toolbar.tsx` - 使用 dispatch 发送 Action
- 所有交互通过 Action 系统

### 第5阶段：高级功能（2天）

#### 5.1 批量操作优化
- 实现 `BatchCommand`
- 事务性批量操作
- 回滚机制

```typescript
class BatchCommand extends BaseCommand {
  private commands: Command[] = [];
  private completed: Command[] = [];

  async execute(): Promise<void> {
    this.model.beginBatch();
    try {
      for (const cmd of this.commands) {
        await cmd.execute();
        this.completed.push(cmd);
      }
      this.model.endBatch();
    } catch (error) {
      await this.rollback();
      throw error;
    }
  }
}
```

#### 5.2 异步操作支持
- 文件导入/导出命令
- 网络同步命令
- 进度反馈机制

```typescript
class ImportFileCommand extends BaseCommand {
  async execute(): Promise<void> {
    const response = await fetch(this.fileUrl);
    const data = await response.json();
    // 处理导入...
  }
}
```

#### 5.3 插件系统集成
- 插件可注册自定义 Action/Command
- 扩展点机制
- 权限控制

### 第6阶段：测试与文档（2天）

#### 6.1 单元测试
- Command 测试
- ActionProcessor 测试
- Model 测试

#### 6.2 集成测试
- 端到端流程测试
- 批量操作测试
- 异步操作测试

#### 6.3 文档更新
- API 文档
- 迁移指南
- 示例代码

## 三、文件结构规划

```
packages/canvas-sdk/src/
├── actions/
│   ├── types.ts           # Action 类型定义
│   ├── creators.ts        # Action 创建器
│   └── index.ts
├── commands/
│   ├── base.ts           # 基础 Command 类
│   ├── registry.ts       # 命令注册表
│   ├── shapes/           # 形状相关命令
│   │   ├── AddShapeCommand.ts
│   │   ├── RemoveShapeCommand.ts
│   │   └── UpdateShapeCommand.ts
│   ├── selection/        # 选择相关命令
│   │   ├── SelectShapesCommand.ts
│   │   └── ClearSelectionCommand.ts
│   ├── batch/           # 批量操作命令
│   │   └── BatchCommand.ts
│   └── async/           # 异步命令
│       ├── ImportFileCommand.ts
│       └── ExportFileCommand.ts
├── processors/
│   ├── ActionProcessor.ts
│   └── index.ts
├── models/
│   ├── CanvasModel.ts
│   └── index.ts
└── CanvasSDK.ts         # 主 SDK 类（改造）
```

## 四、关键技术决策

### 通知策略选择
- **MVP 阶段**：Model 自动通知
- **后期优化**：混合模式（根据场景选择）

### 异步处理
- Action 永远同步创建
- Command 执行可以异步
- 使用 Promise 处理异步流程

### 批量操作
- 默认开启通知合并（16ms）
- 支持事务性批量操作
- 智能脏区域渲染

## 五、迁移策略

### 渐进式迁移
1. 保留现有 API，新增 dispatch 方法
2. 逐步迁移组件到新架构
3. 最后移除旧 API

### 兼容性保证
- 保持现有功能不变
- 新旧 API 并存过渡期
- 提供迁移工具/脚本

### 迁移步骤示例

```typescript
// 第1步：添加新 API（保留旧 API）
class CanvasSDK {
  // 旧 API（保留）
  addShape(shape: Shape): void { /* ... */ }

  // 新 API（添加）
  async dispatch(action: Action): Promise<void> { /* ... */ }
}

// 第2步：组件逐步迁移
// 先迁移新功能，再迁移核心功能

// 第3步：废弃旧 API
// 添加 @deprecated 标记，给出迁移时间表

// 第4步：移除旧 API
// 在下个主版本中移除
```

## 六、风险与对策

### 风险
1. **架构变更影响现有功能**
   - 对策：充分测试，逐步迁移

2. **性能可能下降**
   - 对策：性能优化（批量、缓存、脏区域）

3. **学习成本增加**
   - 对策：提供详细文档和示例

4. **插件兼容性问题**
   - 对策：提供插件迁移指南

## 七、性能优化策略

### 通知合并
```typescript
class CanvasModel {
  private notificationQueue: ChangeDescription[] = [];
  private flushTimer: NodeJS.Timeout | null = null;

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
}
```

### 脏区域优化
```typescript
class OptimizedCanvasModel {
  private dirtyRegions: Set<string> = new Set();

  notify(change: ChangeDescription): void {
    this.markDirtyRegion(change);

    if (!this.renderScheduled) {
      this.renderScheduled = true;
      requestAnimationFrame(() => {
        this.flushRender();
      });
    }
  }
}
```

## 八、预期成果

### 架构改进
- ✅ 完全解耦三层架构
- ✅ 统一的 Action/Command 模式
- ✅ 完善的通知机制
- ✅ 支持异步操作

### 功能增强
- ✅ 支持批量操作
- ✅ 更好的撤销/重做
- ✅ 插件扩展能力
- ✅ 文件导入/导出

### 代码质量
- ✅ 更好的可测试性
- ✅ 更清晰的职责分离
- ✅ 更易于维护和扩展

## 九、时间计划

| 阶段 | 内容 | 时间 |
|------|------|------|
| 第1阶段 | 核心基础设施 | 2天 |
| 第2阶段 | Model 层重构 | 2天 |
| 第3阶段 | SDK 封装优化 | 2天 |
| 第4阶段 | 前端层迁移 | 3天 |
| 第5阶段 | 高级功能 | 2天 |
| 第6阶段 | 测试与文档 | 2天 |
| **总计** | | **13天** |

## 十、检查清单

### 第1阶段完成标准
- [ ] Action 类型系统定义完成
- [ ] Command 基础类实现
- [ ] CommandRegistry 实现并测试
- [ ] ActionProcessor 基本功能完成

### 第2阶段完成标准
- [ ] CanvasModel 实现完成
- [ ] 通知机制三种模式实现
- [ ] 批量操作支持
- [ ] 状态管理迁移完成

### 第3阶段完成标准
- [ ] SDK dispatch 方法实现
- [ ] SDK subscribe 方法实现
- [ ] 事件映射机制完成
- [ ] 历史管理集成

### 第4阶段完成标准
- [ ] 前端无直接 Shape 导入
- [ ] useCanvasSDK Hook 重构完成
- [ ] 所有组件使用 Action 系统
- [ ] 兼容性测试通过

### 第5阶段完成标准
- [ ] BatchCommand 实现
- [ ] 异步命令支持
- [ ] 文件导入/导出功能
- [ ] 插件系统集成

### 第6阶段完成标准
- [ ] 单元测试覆盖率 > 80%
- [ ] 集成测试通过
- [ ] API 文档完整
- [ ] 迁移指南完成

## 十一、后续优化

### 性能优化
- WebWorker 支持
- 虚拟化渲染
- 增量更新优化

### 功能扩展
- 协作编辑支持
- 实时同步
- 云端存储

### 架构演进
- 微前端支持
- 服务端渲染
- 跨平台支持

---

这个计划将彻底解决当前架构问题，实现完整的 Command + Action 模式，为 Sky Canvas 提供更强大、更灵活的架构基础。