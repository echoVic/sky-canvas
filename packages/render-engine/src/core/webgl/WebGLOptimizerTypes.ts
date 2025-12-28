/**
 * WebGL 优化器类型定义
 */

import { IShaderProgram } from './ShaderManager';
import { IVertexArray } from './BufferManager';

// WebGL状态跟踪
export interface WebGLState {
  currentProgram: WebGLProgram | null;
  currentArrayBuffer: WebGLBuffer | null;
  currentElementArrayBuffer: WebGLBuffer | null;
  currentVAO: WebGLVertexArrayObjectOES | null;
  currentTexture: WebGLTexture | null;
  currentTextureUnit: number;
  blendEnabled: boolean;
  depthTestEnabled: boolean;
  cullFaceEnabled: boolean;
  viewport: { x: number; y: number; width: number; height: number };
}

// 渲染批次优化数据
export interface OptimizedRenderBatch {
  id: string;
  shader: IShaderProgram;
  vertexArray: IVertexArray;
  textureBindings: Map<number, WebGLTexture>;
  uniforms: Map<string, unknown>;
  drawCalls: Array<{
    mode: number;
    count: number;
    offset: number;
    instances?: number;
  }>;
  sortKey: string;
}

// WebGL优化配置
export interface WebGLOptimizerConfig {
  enableStateTracking: boolean;
  enableBatchOptimization: boolean;
  enableShaderWarmup: boolean;
  enableBufferPooling: boolean;
  maxTextureBindsPerFrame: number;
  maxDrawCallsPerBatch: number;
  bufferPoolSizes: {
    vertex: number;
    index: number;
  };
}

// 优化统计
export interface OptimizationStats {
  frameCount: number;
  stateChanges: {
    shaderSwitches: number;
    textureBinds: number;
    bufferBinds: number;
    vaoBinds: number;
  };
  drawCalls: {
    total: number;
    batched: number;
    instanced: number;
  };
  memory: {
    buffers: number;
    textures: number;
    shaders: number;
  };
}

// WebGL优化器事件
export interface WebGLOptimizerEvents {
  stateChanged: { type: string; from: unknown; to: unknown };
  batchOptimized: { before: number; after: number };
  shaderCompiled: { name: string; compileTime: number };
  bufferAllocated: { id: string; size: number; type: string };
  performanceWarning: { metric: string; value: number; threshold: number };
}

// 默认配置
export const DEFAULT_OPTIMIZER_CONFIG: WebGLOptimizerConfig = {
  enableStateTracking: true,
  enableBatchOptimization: true,
  enableShaderWarmup: true,
  enableBufferPooling: true,
  maxTextureBindsPerFrame: 16,
  maxDrawCallsPerBatch: 100,
  bufferPoolSizes: {
    vertex: 50,
    index: 50
  }
};

// 创建初始统计
export function createInitialOptimizationStats(): OptimizationStats {
  return {
    frameCount: 0,
    stateChanges: {
      shaderSwitches: 0,
      textureBinds: 0,
      bufferBinds: 0,
      vaoBinds: 0
    },
    drawCalls: {
      total: 0,
      batched: 0,
      instanced: 0
    },
    memory: {
      buffers: 0,
      textures: 0,
      shaders: 0
    }
  };
}

// 创建初始WebGL状态
export function createInitialWebGLState(): WebGLState {
  return {
    currentProgram: null,
    currentArrayBuffer: null,
    currentElementArrayBuffer: null,
    currentVAO: null,
    currentTexture: null,
    currentTextureUnit: 0,
    blendEnabled: false,
    depthTestEnabled: true,
    cullFaceEnabled: true,
    viewport: { x: 0, y: 0, width: 0, height: 0 }
  };
}
