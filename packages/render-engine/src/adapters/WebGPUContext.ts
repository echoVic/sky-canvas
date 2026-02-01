/**
 * WebGPU 上下文适配器
 * 此文件为向后兼容性保留，所有实现已迁移到 webgpu/ 子模块
 */

export type {
  BufferConfig,
  CircleVertices,
  Color,
  LineVertices,
  ManagedBuffer,
  PipelineConfig,
  RectVertices,
  VertexLayout,
  WebGPUContextConfig,
  WebGPUDeviceInfo,
  WebGPURendererConfig,
  WebGPURenderState,
} from './webgpu'
// 重新导出所有模块
export {
  BufferType,
  DEFAULT_WEBGPU_CONFIG,
  getGPU,
  isWebGPUSupported,
  LOW_POWER_CONFIG,
  SHADER_SOURCES,
  ShaderType,
  VERTEX_LAYOUTS,
  WEBGPU_EXPERIMENTAL_WARNING,
  WebGPUBufferManager,
  WebGPUContext,
  WebGPUContextFactory,
  WebGPUContextManager,
  WebGPUGeometry,
  WebGPUPipelineManager,
  WebGPURenderer,
} from './webgpu'
