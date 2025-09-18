/**
 * 批处理渲染器接口
 * 定义批处理渲染器的基本功能
 */

import { Matrix3 } from '../../../math/Matrix3';

/**
 * 可渲染对象接口
 */
export interface IRenderable {
  getVertices(): Float32Array;
  getIndices(): Uint16Array;
  getTexture?(): WebGLTexture | null;
  getShader(): string;
  getBlendMode?(): number;
  getZIndex?(): number;
}

/**
 * 批处理统计信息
 */
export interface BatchStats {
  drawCalls: number;
  triangles: number;
  vertices: number;
  batches: number;
  textureBinds: number;
  shaderSwitches: number;
  frameTime: number;
}

/**
 * 批处理渲染器接口
 */
export interface IBatchRenderer {
  /**
   * 添加可渲染对象到批处理队列
   */
  addRenderable(renderable: IRenderable): void;

  /**
   * 执行批处理渲染
   */
  flush(projectionMatrix: Matrix3): void;

  /**
   * 清空批处理队列
   */
  clear(): void;

  /**
   * 获取渲染统计信息
   */
  getStats(): BatchStats;

  /**
   * 释放资源
   */
  dispose(): void;
}