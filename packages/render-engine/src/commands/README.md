# Commands 模块

渲染命令模块，提供基于命令模式的渲染系统，实现渲染操作的队列化和优化。

## 主要组件

### RenderQueue
渲染命令队列，管理和执行渲染命令序列。

**主要功能：**
- 命令排队和调度
- 渲染状态优化
- 命令合并和批处理
- 延迟执行支持

### CommandRenderer
命令渲染器，执行具体的渲染命令。

**支持的命令类型：**
- 绘制命令
- 状态变更命令
- 缓冲区操作命令
- 着色器切换命令

### IRenderCommand
渲染命令接口，定义命令的基本结构和行为。

## 使用示例

```typescript
import { RenderQueue, CommandRenderer } from './commands';

// 创建渲染队列
const queue = new RenderQueue();

// 添加渲染命令
queue.addCommand({
  type: 'draw',
  geometry: triangleGeometry,
  material: basicMaterial
});

// 执行命令队列
const renderer = new CommandRenderer(context);
await queue.execute(renderer);
```

## 架构特点

- **命令模式**：将渲染操作封装为命令对象
- **队列优化**：自动优化命令执行顺序
- **状态管理**：减少不必要的状态切换
- **批处理支持**：自动合并相似命令

## 相关模块

- `batch` - 批处理渲染
- `graphics` - 图形渲染接口
- `engine` - 渲染引擎核心