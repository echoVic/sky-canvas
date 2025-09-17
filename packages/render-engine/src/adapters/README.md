# Adapters 模块

适配器模块提供了不同图形渲染后端的统一抽象接口，支持 WebGL 和 WebGPU 渲染上下文。

## 主要组件

### WebGLContext
WebGL 渲染上下文适配器，提供 WebGL 渲染能力。

**主要功能：**
- WebGL 上下文初始化和配置
- 着色器程序管理
- 缓冲区管理
- 渲染状态控制
- 扩展功能检测

**接口：**
- `IWebGLContext` - WebGL 上下文接口
- `WebGLAdvancedConfig` - 高级配置选项

### WebGPUContext
WebGPU 渲染上下文适配器，提供现代 GPU 渲染能力。

**主要功能：**
- WebGPU 设备初始化
- 渲染管线配置
- 计算着色器支持
- 现代 GPU 特性支持

**接口：**
- `WebGPUContextConfig` - WebGPU 配置
- `WebGPUDeviceInfo` - 设备信息

### GeometryGenerator
几何图形生成工具，用于创建和管理几何数据。

**主要功能：**
- 基础几何体生成
- 顶点数据管理
- 索引缓冲区生成
- 几何变换

## 使用示例

```typescript
import { WebGLContext, GeometryGenerator } from './adapters';

// 创建 WebGL 上下文
const webglContext = new WebGLContext(canvas, {
  antialias: true,
  powerPreference: 'high-performance'
});

// 生成几何数据
const geometry = GeometryGenerator.createRectangle(100, 100);
```

## 架构特点

- **统一接口**：不同渲染后端使用统一的接口规范
- **可扩展性**：易于添加新的渲染后端支持
- **性能优化**：针对不同平台的性能优化
- **兼容性**：支持不同浏览器和设备的渲染能力

## 相关模块

- `graphics` - 图形渲染接口
- `webgl` - WebGL 专用工具
- `shaders` - 着色器管理
- `engine` - 渲染引擎核心