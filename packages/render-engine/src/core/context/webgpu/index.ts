/**
 * WebGPU 模块导出
 */

// 核心上下文
export { WebGPUContext } from './WebGPUContextImpl';
export { WebGPUContextFactory, WebGPUContextManager, WEBGPU_EXPERIMENTAL_WARNING } from './WebGPUContextFactory';
import './WebGPUContextRender'; // 导入渲染方法扩展

// 类型定义
export {
  isWebGPUSupported,
  getGPU,
  DEFAULT_WEBGPU_CONFIG,
  LOW_POWER_CONFIG
} from './WebGPUTypes';
export type {
  WebGPUContextConfig,
  WebGPUDeviceInfo,
  WebGPURenderState
} from './WebGPUTypes';

// 渲染器
export { WebGPURenderer } from './WebGPURenderer';
export type { WebGPURendererConfig } from './WebGPURenderer';

// 缓冲区管理
export { WebGPUBufferManager, BufferType, VERTEX_LAYOUTS } from './WebGPUBufferManager';
export type { BufferConfig, ManagedBuffer, VertexLayout } from './WebGPUBufferManager';

// 管线管理
export { WebGPUPipelineManager } from './WebGPUPipelineManager';
export type { PipelineConfig } from './WebGPUPipelineManager';

// 几何图形
export { WebGPUGeometry } from './WebGPUGeometry';
export type { Color, RectVertices, CircleVertices, LineVertices } from './WebGPUGeometry';

// 着色器
export { ShaderType, SHADER_SOURCES } from './WebGPUShaders';
export {
  BASIC_2D_VERTEX_SHADER,
  BASIC_FRAGMENT_SHADER,
  TEXTURED_VERTEX_SHADER,
  TEXTURED_FRAGMENT_SHADER,
  CIRCLE_VERTEX_SHADER,
  CIRCLE_FRAGMENT_SHADER,
  LINE_VERTEX_SHADER,
  LINE_FRAGMENT_SHADER
} from './WebGPUShaders';
