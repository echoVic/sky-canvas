/**
 * 批处理相关类型定义
 */
import type { VertexLayout, UniformDescriptor } from '../webgl/types';

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