/**
 * 批量渲染系统类型定义
 */

import { BlendMode } from '../../../core/webgl/types';
import { RenderStats } from '../../../core/renderers/types';
import { Vector2 } from '../../../math';

// 批量渲染顶点结构
export interface BatchVertex {
  position: Vector2;
  color: [number, number, number, number];
  texCoord?: Vector2;
  textureId?: number;
}

// 批量渲染配置
export interface BatchConfig {
  maxVertices: number;
  maxIndices: number;
  maxTextures: number;
  vertexSize: number;
}

// 渲染批次状态
export enum BatchState {
  READY = 'ready',
  BUILDING = 'building',
  FULL = 'full',
  SUBMITTED = 'submitted'
}

// 批次数据接口
export interface BatchData {
  vertices: Float32Array;
  indices: Uint16Array;
  vertexCount: number;
  indexCount: number;
  textures: WebGLTexture[];
  blendMode: BlendMode;
}

// 几何图形添加参数
export interface QuadParams {
  positions: [Vector2, Vector2, Vector2, Vector2];
  colors: [[number, number, number, number], [number, number, number, number], [number, number, number, number], [number, number, number, number]];
  texCoords?: [Vector2, Vector2, Vector2, Vector2];
  texture?: WebGLTexture;
  blendMode?: BlendMode;
}

export interface TriangleParams {
  positions: [Vector2, Vector2, Vector2];
  colors: [[number, number, number, number], [number, number, number, number], [number, number, number, number]];
  texCoords?: [Vector2, Vector2, Vector2];
  texture?: WebGLTexture;
  blendMode?: BlendMode;
}

export interface LineParams {
  start: Vector2;
  end: Vector2;
  color: [number, number, number, number];
  width?: number;
}
