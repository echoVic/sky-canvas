/**
 * WebGPU 上下文适配器
 * 此文件为向后兼容性保留，所有实现已迁移到 webgpu/ 子模块
 */

// 重新导出所有模块
export {
  WebGPUContext,
  WebGPUContextFactory,
  WebGPUContextManager,
  WEBGPU_EXPERIMENTAL_WARNING,
  WebGPURenderer,
  WebGPUBufferManager,
  WebGPUPipelineManager,
  WebGPUGeometry,
  BufferType,
  VERTEX_LAYOUTS,
  ShaderType,
  SHADER_SOURCES,
  isWebGPUSupported,
  getGPU,
  DEFAULT_WEBGPU_CONFIG,
  LOW_POWER_CONFIG
} from './webgpu';

export type {
  WebGPUContextConfig,
  WebGPUDeviceInfo,
  WebGPURenderState,
  WebGPURendererConfig,
  BufferConfig,
  ManagedBuffer,
  VertexLayout,
  PipelineConfig,
  Color,
  RectVertices,
  CircleVertices,
  LineVertices
} from './webgpu';
