
// 渲染后端类型
export enum RendererType {
  CANVAS_2D = 'canvas2d',
  WEBGL = 'webgl',
  WEBGL2 = 'webgl2',
  WEBGPU = 'webgpu'
}

// 着色器类型
export enum ShaderType {
  VERTEX = 'vertex',
  FRAGMENT = 'fragment',
  COMPUTE = 'compute'
}

// 缓冲区类型
export enum BufferType {
  VERTEX = 'vertex',
  INDEX = 'index',
  UNIFORM = 'uniform',
  STORAGE = 'storage'
}

// 纹理格式
export enum TextureFormat {
  RGBA8 = 'rgba8unorm',
  RGB8 = 'rgb8unorm',
  RG8 = 'rg8unorm',
  R8 = 'r8unorm',
  RGBA16F = 'rgba16float',
  RGBA32F = 'rgba32float',
  DEPTH24_STENCIL8 = 'depth24plus-stencil8'
}

// 混合模式
export enum BlendMode {
  NORMAL = 'normal',
  ADD = 'add',
  MULTIPLY = 'multiply',
  SCREEN = 'screen',
  OVERLAY = 'overlay'
}

// 顶点属性描述
export interface VertexAttribute {
  name: string;
  location: number;
  format: string;
  offset: number;
  size: number;
}

// 顶点布局描述
export interface VertexLayout {
  stride: number;
  attributes: VertexAttribute[];
}

// 着色器源码
export interface ShaderSource {
  vertex: string;
  fragment: string;
  compute?: string;
}

// 统一变量描述
export interface UniformDescriptor {
  name: string;
  type: string;
  size: number;
  binding?: number;
}

// 渲染管线状态
export interface PipelineState {
  shader: string;
  vertexLayout: VertexLayout;
  uniforms: UniformDescriptor[];
  blendMode: BlendMode;
  depthTest: boolean;
  cullFace: boolean;
}

// 渲染批次
export interface RenderBatch {
  id: string;
  pipeline: string;
  vertexBuffer: ArrayBuffer;
  indexBuffer?: ArrayBuffer;
  uniforms: Record<string, number | number[] | Float32Array>;
  instanceCount: number;
  primitiveCount: number;
}

// 渲染统计信息
export interface RenderStats {
  drawCalls: number;
  triangles: number;
  vertices: number;
  batches: number;
  textureBinds: number;
  shaderSwitches: number;
  frameTime: number;
}

// GPU资源接口
export interface GPUResource {
  id: string;
  type: string;
  size: number;
  usage: number;
  dispose(): void;
}

// 缓冲区接口
export interface Buffer extends GPUResource {
  type: BufferType;
  data: ArrayBuffer;
  update(data: ArrayBuffer, offset?: number): void;
}

// 纹理接口
export interface Texture extends GPUResource {
  width: number;
  height: number;
  format: TextureFormat;
  mipLevels: number;
  update(data: ArrayBuffer | ImageData, level?: number): void;
}

// 着色器接口
export interface Shader extends GPUResource {
  type: ShaderType;
  source: string;
  compiled: boolean;
  compile(): Promise<boolean>;
}

// 渲染管线接口
export interface RenderPipeline extends GPUResource {
  state: PipelineState;
  bind(): void;
  setUniforms(uniforms: Record<string, number | number[] | Float32Array>): void;
}
