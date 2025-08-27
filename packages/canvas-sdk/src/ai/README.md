# Sky Canvas AI扩展通信协议

## 概述

Sky Canvas AI扩展通信协议是一个标准化的框架，用于在Sky Canvas画板SDK与AI服务之间进行交互。该协议支持自然语言命令、智能图形生成、布局优化、内容分析等多种AI功能。

## 特性

- **框架无关**：与具体的AI服务提供商解耦
- **可扩展性**：支持添加新的AI能力和功能
- **异步处理**：支持长时间运行的AI操作
- **错误处理**：完善的错误处理和重试机制
- **权限管理**：细粒度的安全和权限控制
- **事件驱动**：基于事件的实时状态更新

## 架构概览

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Canvas SDK    │───▶│ Protocol Manager│───▶│  AI Extensions  │
│                 │    │                 │    │                 │
│ - Shape Manager │    │ - Message Routing│    │ - Text AI       │
│ - Event System  │    │ - Request Queue │    │ - Shape AI      │
│ - History Mgr   │    │ - Error Handling│    │ - Layout AI     │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## 核心组件

### 1. AIProtocolManager

协议管理器是整个AI扩展系统的核心，负责：
- 扩展注册和生命周期管理
- 消息路由和处理
- 错误处理和重试逻辑
- 事件分发

### 2. IAIExtension

AI扩展接口定义了所有AI扩展必须实现的标准方法：
- `connect()` - 连接到AI服务
- `disconnect()` - 断开连接
- `processRequest()` - 处理AI请求
- `supportsCapability()` - 检查能力支持

### 3. 消息系统

基于标准化的消息格式进行通信：
- **Request** - 请求消息
- **Response** - 响应消息  
- **Event** - 事件消息

## AI能力类型

协议定义了以下AI能力：

| 能力 | 描述 | 用途 |
|------|------|------|
| `TEXT_GENERATION` | 文本生成 | 生成描述、标签、注释等 |
| `SHAPE_CREATION` | 图形创建 | 基于自然语言创建图形 |
| `SHAPE_MODIFICATION` | 图形修改 | 智能修改现有图形 |
| `LAYOUT_OPTIMIZATION` | 布局优化 | 自动优化元素布局 |
| `STYLE_SUGGESTION` | 样式建议 | 提供设计风格建议 |
| `CONTENT_ANALYSIS` | 内容分析 | 分析画布内容质量 |
| `AUTO_COMPLETION` | 自动补全 | 命令和输入补全 |
| `SMART_SELECTION` | 智能选择 | 基于条件智能选择元素 |

## 快速开始

### 1. 初始化协议管理器

```typescript
import { CanvasSDK } from '@sky-canvas/canvas-sdk';
import { AIProtocolManager } from '@sky-canvas/canvas-sdk/ai';

// 创建Canvas SDK实例
const canvasSDK = new CanvasSDK();
await canvasSDK.initialize(canvasElement);

// 创建AI协议管理器
const aiManager = new AIProtocolManager(canvasSDK);
```

### 2. 注册AI扩展

```typescript
import { SmartTextAIExtension } from '@sky-canvas/canvas-sdk/ai/example';

// 创建AI扩展
const textExtension = new SmartTextAIExtension('your-api-key');

// 注册扩展
await aiManager.registerExtension(textExtension);
```

### 3. 发送AI请求

```typescript
import { AICapability } from '@sky-canvas/canvas-sdk/ai/types';

// 创建文本生成请求
const request = aiManager.createRequest(
  AICapability.TEXT_GENERATION,
  {
    prompt: 'Generate a title for this dashboard',
    options: { maxLength: 50 }
  }
);

// 发送请求
const response = await aiManager.sendRequest(request);

if (response.status === 'success') {
  console.log('Generated text:', response.payload.text);
}
```

## 消息格式

### 请求消息

```typescript
interface IAIRequest {
  id: string;                    // 请求唯一标识
  version: string;               // 协议版本
  timestamp: number;             // 时间戳
  priority: MessagePriority;     // 消息优先级
  type: 'request';              // 消息类型
  capability: AICapability;     // 请求的AI能力
  payload: IAIRequestPayload;   // 请求负载
  options?: IAIRequestOptions;  // 请求选项
}
```

### 响应消息

```typescript
interface IAIResponse {
  id: string;                     // 响应唯一标识
  version: string;                // 协议版本
  timestamp: number;              // 时间戳
  priority: MessagePriority;      // 消息优先级
  type: 'response';              // 消息类型
  requestId: string;             // 对应请求ID
  status: OperationStatus;       // 操作状态
  payload: IAIResponsePayload;   // 响应负载
  error?: IAIError;              // 错误信息
}
```

## 具体使用示例

### 1. 文本生成

```typescript
// 创建文本生成请求
const textRequest = aiManager.createRequest(
  AICapability.TEXT_GENERATION,
  {
    prompt: 'Create a professional description for this design',
    context: aiManager.getCanvasContext(),
    options: {
      maxLength: 200,
      style: 'professional'
    }
  }
);

const textResponse = await aiManager.sendRequest(textRequest);
console.log(textResponse.payload.text);
```

### 2. 图形创建

```typescript
// 创建图形生成请求
const shapeRequest = aiManager.createRequest(
  AICapability.SHAPE_CREATION,
  {
    description: 'Create a blue circle for a logo',
    position: { x: 100, y: 100 }
  }
);

const shapeResponse = await aiManager.sendRequest(shapeRequest);

// 将生成的图形添加到画布
for (const shapeData of shapeResponse.payload.shapes) {
  // 创建实际的形状对象并添加到画布
  const shape = createShapeFromData(shapeData);
  canvasSDK.addShape(shape);
}
```

### 3. 智能选择

```typescript
// 创建智能选择请求
const selectionRequest = aiManager.createRequest(
  AICapability.SMART_SELECTION,
  {
    criteria: 'select all red shapes',
    mode: 'replace',
    context: aiManager.getCanvasContext()
  }
);

const selectionResponse = await aiManager.sendRequest(selectionRequest);

// 应用选择结果
canvasSDK.clearSelection();
for (const shapeId of selectionResponse.payload.selectedShapeIds) {
  canvasSDK.selectShape(shapeId);
}
```

### 4. 布局优化

```typescript
// 创建布局优化请求
const layoutRequest = aiManager.createRequest(
  AICapability.LAYOUT_OPTIMIZATION,
  {
    shapeIds: canvasSDK.getSelectedShapes().map(s => s.id),
    objective: 'alignment',
    constraints: {
      maintainRelativePositions: true,
      minSpacing: 10
    }
  }
);

const layoutResponse = await aiManager.sendRequest(layoutRequest);

// 应用布局优化建议
for (const optimization of layoutResponse.payload.optimizations) {
  if (optimization.action === 'move') {
    for (const shapeId of optimization.shapeIds) {
      canvasSDK.updateShape(shapeId, optimization.parameters);
    }
  }
}
```

## 自定义AI扩展

### 1. 扩展基类

```typescript
import { BaseAIExtension, IAIRequest, IAIResponse } from '@sky-canvas/canvas-sdk/ai';

class MyCustomAIExtension extends BaseAIExtension {
  constructor() {
    super({
      name: 'MyCustomAI',
      version: '1.0.0',
      capabilities: [AICapability.CUSTOM_CAPABILITY]
    });
  }

  async connect(): Promise<void> {
    // 连接到你的AI服务
  }

  async disconnect(): Promise<void> {
    // 断开连接
  }

  async processRequest(request: IAIRequest): Promise<IAIResponse> {
    // 处理AI请求
    switch (request.capability) {
      case AICapability.CUSTOM_CAPABILITY:
        return this.handleCustomRequest(request);
      default:
        throw new Error('Unsupported capability');
    }
  }
}
```

### 2. 注册自定义扩展

```typescript
const customExtension = new MyCustomAIExtension();
await aiManager.registerExtension(customExtension);
```

## 事件处理

协议管理器提供了丰富的事件系统：

```typescript
// 监听AI处理事件
aiManager.on('processing_started', (data) => {
  console.log(`AI开始处理: ${data.capability}`);
});

aiManager.on('processing_completed', (data) => {
  console.log(`AI处理完成: ${data.duration}ms`);
});

aiManager.on('processing_failed', (data) => {
  console.error('AI处理失败:', data.error);
});

// 监听扩展状态
aiManager.on('ready', (data) => {
  console.log(`扩展就绪: ${data.extension}`);
});

aiManager.on('disconnected', (data) => {
  console.log(`扩展断开: ${data.extension}`);
});
```

## 错误处理

协议提供了完善的错误处理机制：

```typescript
try {
  const response = await aiManager.sendRequest(request);
  // 处理成功响应
} catch (error) {
  if (error.type === AIErrorType.TIMEOUT_ERROR) {
    // 处理超时错误
    console.log('请求超时，请稍后重试');
  } else if (error.type === AIErrorType.NETWORK_ERROR) {
    // 处理网络错误
    console.log('网络连接异常');
  } else if (error.retryable) {
    // 可重试错误
    setTimeout(() => {
      aiManager.sendRequest(request);
    }, error.retryAfter || 1000);
  }
}
```

## 安全考虑

### 1. 权限控制

```typescript
const secureConfig: IAIExtensionConfig = {
  name: 'SecureAI',
  version: '1.0.0',
  capabilities: [AICapability.TEXT_GENERATION],
  security: {
    allowedOperations: [AICapability.TEXT_GENERATION],
    deniedOperations: [AICapability.SHAPE_MODIFICATION],
    accessLevel: 'read',
    sandboxMode: true,
    contentFiltering: true
  }
};
```

### 2. 认证配置

```typescript
const authConfig: IAIAuthentication = {
  type: 'api_key',
  config: {
    apiKey: process.env.AI_API_KEY,
    endpoint: 'https://secure-api.example.com'
  }
};
```

## 性能优化

### 1. 请求缓存

```typescript
const request = aiManager.createRequest(
  AICapability.TEXT_GENERATION,
  payload,
  {
    cache: 'memory',  // 启用内存缓存
    timeout: 10000    // 10秒超时
  }
);
```

### 2. 批量操作

```typescript
// 批量创建多个图形
const requests = descriptions.map(desc => 
  aiManager.createRequest(AICapability.SHAPE_CREATION, { description: desc })
);

const responses = await Promise.all(
  requests.map(req => aiManager.sendRequest(req))
);
```

## 最佳实践

### 1. 资源管理

```typescript
// 应用退出时清理资源
window.addEventListener('beforeunload', async () => {
  await aiManager.dispose();
});
```

### 2. 错误边界

```typescript
class AIErrorBoundary {
  async safeAICall(request: IAIRequest) {
    try {
      return await aiManager.sendRequest(request);
    } catch (error) {
      this.logError(error);
      this.showFallbackUI();
      return null;
    }
  }
}
```

### 3. 用户反馈

```typescript
// 显示处理进度
aiManager.on('processing_progress', (data) => {
  updateProgressBar(data.progress);
});
```

## 调试和测试

### 1. 调试模式

```typescript
const debugRequest = aiManager.createRequest(
  AICapability.TEXT_GENERATION,
  payload,
  { debug: true }
);
```

### 2. 模拟扩展

```typescript
class MockAIExtension extends BaseAIExtension {
  async processRequest(request: IAIRequest): Promise<IAIResponse> {
    // 返回模拟数据用于测试
    return this.createSuccessResponse(request, mockData);
  }
}
```

## API参考

### 主要接口

- `AIProtocolManager` - 协议管理器
- `BaseAIExtension` - 扩展基类
- `AIProtocolUtils` - 协议工具类

### 类型定义

- `IAIRequest` - AI请求接口
- `IAIResponse` - AI响应接口
- `IAIExtensionConfig` - 扩展配置接口
- `AICapability` - AI能力枚举
- `AIErrorType` - 错误类型枚举

## 更新日志

### v1.0.0
- 初始版本发布
- 基础协议框架
- 文本生成和图形创建能力
- 完整的错误处理和事件系统

## 贡献指南

1. Fork 项目仓库
2. 创建功能分支
3. 提交变更
4. 创建Pull Request

## 许可证

MIT License

## 联系方式

- 项目仓库: https://github.com/sky-canvas/canvas-sdk
- 问题反馈: https://github.com/sky-canvas/canvas-sdk/issues
- 邮箱: support@sky-canvas.dev