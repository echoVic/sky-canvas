# Graphics 模块

图形渲染接口模块，提供底层图形渲染的统一抽象接口。

## 主要组件

### IGraphicsContext
图形上下文接口，定义渲染操作的统一规范。

**核心接口：**
- 渲染状态管理
- 绘制命令执行
- 资源绑定操作
- 渲染管线控制

### RenderCommand
渲染命令封装，将渲染操作抽象为命令对象。

**命令类型：**
- 绘制命令
- 状态设置命令
- 资源绑定命令
- 视窗控制命令

## 使用示例

```typescript
import { IGraphicsContext, RenderCommand } from './graphics';

// 获取图形上下文
const context: IGraphicsContext = getGraphicsContext();

// 创建渲染命令
const drawCommand: RenderCommand = {
  type: 'draw',
  primitive: 'triangles',
  vertexCount: 3,
  instanceCount: 1
};

// 执行渲染命令
context.executeCommand(drawCommand);
```

## 渲染抽象

### 状态管理
- **混合状态**：透明度混合控制
- **深度测试**：Z-buffer 管理
- **裁剪测试**：视窗裁剪设置
- **模板测试**：模板缓冲控制

### 资源操作
- **缓冲区管理**：顶点/索引缓冲
- **纹理操作**：纹理绑定和采样
- **着色器程序**：着色器切换和参数设置
- **渲染目标**：帧缓冲区管理

## 跨平台支持

### 渲染后端适配
- **WebGL 适配**：基于 WebGL 1.0/2.0
- **WebGPU 适配**：现代 GPU API 支持
- **Canvas2D 适配**：2D 渲染回退支持

### 功能检测
- **扩展支持检测**：自动检测可用扩展
- **性能等级评估**：根据硬件调整功能
- **兼容性处理**：优雅降级策略

## 相关模块

- `adapters` - 具体适配器实现
- `webgl` - WebGL 专用功能
- `engine` - 渲染引擎集成
- `commands` - 命令系统