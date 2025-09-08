/**
 * 图形适配器统一导出
 * 提供不同渲染后端的适配器实现
 */

import { IGraphicsContextFactory } from '../IGraphicsContext';
import { Canvas2DGraphicsContextFactory } from './Canvas2DAdapter';
import { WebGLGraphicsContextFactory } from './WebGLAdapter';
import { WebGPUGraphicsContextFactory } from './WebGPUAdapter';

export { Canvas2DGraphicsContext, Canvas2DGraphicsContextFactory } from './Canvas2DAdapter';
export { WebGLGraphicsContext, WebGLGraphicsContextFactory } from './WebGLAdapter';
export { WebGPUGraphicsContext, WebGPUGraphicsContextFactory } from './WebGPUAdapter';

// 适配器类型枚举
export enum GraphicsAdapterType {
  CANVAS_2D = 'canvas2d',
  WEBGL = 'webgl',
  WEBGPU = 'webgpu' // 预留
}

// 适配器工厂映射
const ADAPTER_FACTORIES = {
  [GraphicsAdapterType.CANVAS_2D]: () => new Canvas2DGraphicsContextFactory(),
  [GraphicsAdapterType.WEBGL]: () => new WebGLGraphicsContextFactory(),
  [GraphicsAdapterType.WEBGPU]: () => new WebGPUGraphicsContextFactory(),
} as const;

/**
 * 创建图形适配器工厂
 */
export function createGraphicsAdapterFactory(type: GraphicsAdapterType): IGraphicsContextFactory {
  const factory = ADAPTER_FACTORIES[type];
  if (!factory) {
    throw new Error(`Unsupported graphics adapter type: ${type}`);
  }
  return factory();
}

/**
 * 获取支持的适配器类型
 */
export async function getSupportedAdapterTypes(): Promise<GraphicsAdapterType[]> {
  const supported: GraphicsAdapterType[] = [];
  
  // 检查Canvas 2D支持
  try {
    const canvas2dFactory = new Canvas2DGraphicsContextFactory();
    if (canvas2dFactory.isSupported()) {
      supported.push(GraphicsAdapterType.CANVAS_2D);
    }
  } catch {
    // Canvas 2D不支持
  }
  
  // 检查WebGL支持
  try {
    const webglFactory = new WebGLGraphicsContextFactory();
    if (webglFactory.isSupported()) {
      supported.push(GraphicsAdapterType.WEBGL);
    }
  } catch {
    // WebGL不支持
  }
  
  return supported;
}

/**
 * 自动选择最佳适配器类型
 */
export async function selectBestAdapterType(): Promise<GraphicsAdapterType> {
  const supported = await getSupportedAdapterTypes();
  
  if (supported.length === 0) {
    throw new Error('No supported graphics adapters found');
  }
  
  // 优先级：WebGL > Canvas 2D
  if (supported.includes(GraphicsAdapterType.WEBGL)) {
    return GraphicsAdapterType.WEBGL;
  }
  
  if (supported.includes(GraphicsAdapterType.CANVAS_2D)) {
    return GraphicsAdapterType.CANVAS_2D;
  }
  
  return supported[0];
}