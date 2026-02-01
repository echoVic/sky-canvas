/**
 * WebGPU 模块导出
 */

export {
  WEBGPU_EXPERIMENTAL_WARNING,
  WebGPUContextFactory,
  WebGPUContextManager,
} from './WebGPUContextFactory'
// 核心上下文
export { WebGPUContext } from './WebGPUContextImpl'
import './WebGPUContextRender' // 导入渲染方法扩展

export type { BufferConfig, ManagedBuffer, VertexLayout } from './WebGPUBufferManager'
// 缓冲区管理
export { BufferType, VERTEX_LAYOUTS, WebGPUBufferManager } from './WebGPUBufferManager'
export type { CircleVertices, Color, LineVertices, RectVertices } from './WebGPUGeometry'
// 几何图形
export { WebGPUGeometry } from './WebGPUGeometry'
export type { PipelineConfig } from './WebGPUPipelineManager'
// 管线管理
export { WebGPUPipelineManager } from './WebGPUPipelineManager'
export type { WebGPURendererConfig } from './WebGPURenderer'
// 渲染器
export { WebGPURenderer } from './WebGPURenderer'
// 着色器
export {
  BASIC_2D_VERTEX_SHADER,
  BASIC_FRAGMENT_SHADER,
  CIRCLE_FRAGMENT_SHADER,
  CIRCLE_VERTEX_SHADER,
  LINE_FRAGMENT_SHADER,
  LINE_VERTEX_SHADER,
  SHADER_SOURCES,
  ShaderType,
  TEXTURED_FRAGMENT_SHADER,
  TEXTURED_VERTEX_SHADER,
} from './WebGPUShaders'
export type {
  WebGPUContextConfig,
  WebGPUDeviceInfo,
  WebGPURenderState,
} from './WebGPUTypes'
// 类型定义
export {
  DEFAULT_WEBGPU_CONFIG,
  getGPU,
  isWebGPUSupported,
  LOW_POWER_CONFIG,
} from './WebGPUTypes'
