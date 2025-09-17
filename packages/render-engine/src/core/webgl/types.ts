/**
 * WebGL 相关类型定义
 */
import type { GPUResource } from '../../resources/types';

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

// 扩展的着色器源码（包含元数据）
export interface ExtendedShaderSource extends ShaderSource {
  name: string;
  version: string;
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

// 缓冲区接口
export interface Buffer extends GPUResource {
  type: BufferType;
  data: ArrayBuffer;
  update(data: ArrayBuffer, offset?: number): void;
  bind(): void;
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