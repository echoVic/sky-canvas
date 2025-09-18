/**
 * 纹理相关类型定义
 */

import type { GPUResource } from '../types';

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


// 纹理接口
export interface Texture extends GPUResource {
  width: number;
  height: number;
  format: TextureFormat;
  mipLevels: number;
  update(data: ArrayBuffer | ImageData, level?: number): void;
}