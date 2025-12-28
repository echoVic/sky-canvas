/**
 * WebGL上下文类型定义
 */

import { IGraphicsContext } from '../graphics/IGraphicsContext';
import { AdvancedShaderManager } from '../webgl/AdvancedShaderManager';
import { WebGLOptimizer } from '../webgl/WebGLOptimizer';

/**
 * WebGL上下文高级功能配置
 */
export interface WebGLAdvancedConfig {
  /** 启用高级着色器管理 */
  enableAdvancedShaders?: boolean;
  /** 启用WebGL优化器 */
  enableOptimizer?: boolean;
  /** 高级着色器管理器配置 */
  advancedShaderConfig?: {
    enableHotReload?: boolean;
    precompileCommonVariants?: boolean;
    enableAsyncCompilation?: boolean;
  };
  /** WebGL优化器配置 */
  optimizerConfig?: {
    enableStateTracking?: boolean;
    enableBatchOptimization?: boolean;
    enableShaderWarmup?: boolean;
    enableBufferPooling?: boolean;
  };
}

/**
 * WebGL上下文接口
 */
export interface IWebGLContext extends IGraphicsContext {
  readonly gl: WebGLRenderingContext;

  // WebGL特有的基础方法
  clear(color?: string): void;
  setBlendMode(mode: string): void;
  drawElements(count: number, offset: number): void;
  drawArrays(mode: number, first: number, count: number): void;
  createBuffer(): WebGLBuffer | null;
  bindBuffer(target: number, buffer: WebGLBuffer | null): void;
  bufferData(target: number, data: BufferSource | null, usage: number): void;
  useProgram(program: WebGLProgram | null): void;
  bindTexture(target: number, texture: WebGLTexture | null): void;

  // 高级功能访问接口
  getAdvancedShaderManager?(): AdvancedShaderManager | undefined;
  getWebGLOptimizer?(): WebGLOptimizer | undefined;
}

/**
 * WebGL状态
 */
export interface WebGLState {
  fillStyle: string;
  strokeStyle: string;
  lineWidth: number;
  globalAlpha: number;
  font: string;
  textAlign: string;
  textBaseline: string;
}

/**
 * 裁剪区域
 */
export interface ClipRegion {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * 路径点
 */
export interface PathPoint {
  x: number;
  y: number;
}
