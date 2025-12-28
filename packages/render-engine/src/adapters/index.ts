/**
 * 渲染适配器导出
 */

// 导入核心接口

// WebGL适配器
export { WebGLContextFactory } from './WebGLContext';
export type { IWebGLContext } from './WebGLContext';

// Canvas 2D适配器 (占位符)
export { Canvas2DContextFactory } from './Canvas2DContext';
export type { ICanvas2DContext } from './Canvas2DContext';

// WebGPU适配器 (实验性 - 占位符实现)
// 警告: WebGPU 支持尚未完整实现，仅作为接口占位符
export { WebGPUContextFactory } from './WebGPUContext';
export { WEBGPU_EXPERIMENTAL_WARNING } from './WebGPUContext';

// 导入工厂类
import { Canvas2DContextFactory } from './Canvas2DContext';
import { WebGLContextFactory } from './WebGLContext';
import { WebGPUContextFactory } from './WebGPUContext'; // Temporarily disabled

// 统一适配器接口
export interface IGraphicsAdapter {
  name: string;
  initialize(): Promise<void>;
  dispose(): void;
}

// 适配器工厂
export class AdapterFactory {
  static createWebGLAdapter(): WebGLContextFactory {
    return new WebGLContextFactory();
  }

  static createCanvas2DAdapter(): Canvas2DContextFactory {
    return new Canvas2DContextFactory();
  }

  static createWebGPUAdapter(): WebGPUContextFactory {
    return new WebGPUContextFactory();
  }
}