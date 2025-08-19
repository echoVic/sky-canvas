// 导出核心渲染引擎
export { RenderEngine } from './RenderEngine';

// 导出核心接口和基类
export * from './core';

// 导出渲染器
export * from './renderers';

// 导出数学库
export * from './math';

// 导出便利函数
import { RenderEngine } from './RenderEngine';
import { Circle, Line, Rectangle, Text } from './core/shapes';

/**
 * 创建Canvas2D渲染引擎实例
 */
export function createCanvasRenderEngine(): RenderEngine {
  return new RenderEngine('canvas2d');
}

/**
 * 快速创建基础图形的便利函数
 */
export const ShapeFactory = {
  createRectangle: (id: string, x: number, y: number, width: number, height: number, filled = false) => 
    new Rectangle(id, x, y, width, height, filled),
    
  createCircle: (id: string, centerX: number, centerY: number, radius: number, filled = false) => 
    new Circle(id, centerX, centerY, radius, filled),
    
  createLine: (id: string, startX: number, startY: number, endX: number, endY: number) => 
    new Line(id, { x: startX, y: startY }, { x: endX, y: endY }),
    
  createText: (id: string, text: string, x: number, y: number, font = '16px Arial') => 
    new Text(id, text, x, y, font)
};

/**
 * 渲染引擎版本信息
 */
export const VERSION = '1.0.0';

/**
 * 支持的渲染器类型
 */
export const SUPPORTED_RENDERERS = ['canvas2d'] as const;

export type SupportedRenderer = typeof SUPPORTED_RENDERERS[number];
