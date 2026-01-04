# 类型导出说明

## 概述

Canvas SDK 使用 VSCode 风格的依赖注入（DI）系统，其中服务接口同时作为**类型**（TypeScript 接口）和**值**（DI 装饰器）导出。

## 双重导出模式

对于所有服务接口（如 `ICanvasManager`、`ISceneManager`、`IToolManager` 等），我们采用双重导出模式：

### 1. 作为类型使用

当你需要类型注解时，使用 `import type` 语法：

```typescript
import type { ISceneManager, ICanvasManager } from '@sky-canvas/canvas-sdk';

// 用于类型注解
function processScene(sceneManager: ISceneManager) {
  // ...
}

// 用于类型断言
const manager = getManager() as ICanvasManager;
```

### 2. 作为值使用（DI 装饰器）

当你需要在依赖注入中使用时，导入为值：

```typescript
import { ISceneManager, ICanvasManager } from '@sky-canvas/canvas-sdk';

// 用于构造函数注入
class MyService {
  constructor(
    @ISceneManager private sceneManager: ISceneManager,
    @ICanvasManager private canvasManager: ICanvasManager
  ) {}
}

// 用于从容器获取实例
const sceneManager = container.get(ISceneManager);
```

### 3. 同时使用类型和值

在大多数情况下，你会同时需要类型和值：

```typescript
import { ISceneManager } from '@sky-canvas/canvas-sdk';

// ISceneManager 既是类型也是装饰器
class MyComponent {
  constructor(
    @ISceneManager private sceneManager: ISceneManager
    //            ↑ 装饰器（值）           ↑ 类型注解
  ) {}
}
```

## 技术实现

这种双重导出是通过 TypeScript 的**声明合并**（Declaration Merging）实现的：

```typescript
// 1. 接口声明（类型）
export interface ISceneManager {
  createLayer(name: string): ILayerInfo;
  // ... 其他方法
}

// 2. 常量声明（值 - 装饰器）
export const ISceneManager = createDecorator<ISceneManager>('SceneManager');
```

TypeScript 允许接口和同名常量共存，因此：
- `ISceneManager` 作为**类型**指向接口定义
- `ISceneManager` 作为**值**指向装饰器函数

## 导出验证

我们提供了测试来确保所有接口都正确导出：

```typescript
// tests/type-exports.test.ts
import type { ISceneManager } from '@sky-canvas/canvas-sdk';  // ✅ 类型导入
import { ISceneManager } from '@sky-canvas/canvas-sdk';       // ✅ 值导入
```

## 常见问题

### Q: 为什么需要这种双重导出？

A: VSCode 风格的 DI 系统需要在运行时使用装饰器来标识依赖，同时在编译时需要类型信息来进行类型检查。双重导出满足了这两个需求。

### Q: 我应该使用 `import type` 还是 `import`？

A: 
- 如果只需要类型注解，使用 `import type`（更好的 tree-shaking）
- 如果需要 DI 装饰器，使用 `import`
- 如果两者都需要，使用 `import`（TypeScript 会自动处理）

### Q: 这会影响包的大小吗？

A: 不会。`import type` 只在编译时存在，不会包含在最终的 JavaScript 代码中。装饰器是轻量级的函数，对包大小影响很小。

## 相关接口

以下接口都采用双重导出模式：

- `ICanvasManager` - Canvas 管理器
- `ISceneManager` - 场景管理器
- `IToolManager` - 工具管理器
- `ILogService` - 日志服务
- `IHistoryService` - 历史服务
- `IShapeService` - 形状服务
- `ISelectionService` - 选择服务
- `IClipboardService` - 剪贴板服务
- `IZIndexService` - Z 轴服务
- `ICanvasRenderingService` - 渲染服务
- `IConfigurationService` - 配置服务

## 参考

- [TypeScript Declaration Merging](https://www.typescriptlang.org/docs/handbook/declaration-merging.html)
- [VSCode Dependency Injection](https://github.com/microsoft/vscode/wiki/Dependency-Injection)
