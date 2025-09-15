/**
 * 渲染器相关类型定义
 */

// 渲染后端类型
export enum RendererType {
  CANVAS_2D = 'canvas2d',
  WEBGL = 'webgl',
  WEBGL2 = 'webgl2',
  WEBGPU = 'webgpu'
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

