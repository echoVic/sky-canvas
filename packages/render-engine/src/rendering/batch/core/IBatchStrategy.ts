/**
 * 批处理策略接口
 * 定义不同批处理策略的通用接口
 */

import { Matrix3 } from '../../../math/Matrix3';
import { IRenderable, BatchStats } from './IBatchRenderer';

/**
 * 批次数据
 */
export interface BatchData {
  vertices: Float32Array;
  indices: Uint16Array;
  texture: WebGLTexture | null;
  shader: string;
  blendMode: number;
  zIndex: number;
  count: number;
}

/**
 * 批处理上下文
 */
export interface BatchContext {
  gl: WebGLRenderingContext;
  maxBatchSize: number;
  currentFrame: number;
}

/**
 * 批处理策略接口
 */
export interface IBatchStrategy {
  /**
   * 策略名称
   */
  readonly name: string;

  /**
   * 处理可渲染对象
   */
  process(renderable: IRenderable): void;

  /**
   * 执行批处理渲染
   */
  flush(projectionMatrix: Matrix3, context: BatchContext): void;

  /**
   * 清空批处理数据
   */
  clear(): void;

  /**
   * 获取当前批次
   */
  getBatches(): BatchData[];

  /**
   * 获取统计信息
   */
  getStats(): BatchStats;

  /**
   * 释放资源
   */
  dispose(): void;
}