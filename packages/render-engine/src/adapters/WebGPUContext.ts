/**
 * WebGPU图形上下文实现 (占位符)
 * 由于WebGPU类型定义问题，暂时禁用
 * TODO: 等待WebGPU类型支持后再实现
 */
import { IGraphicsContext, IGraphicsContextFactory, IPoint } from '../core/IGraphicsContext';

// 简化的WebGPU接口（避免类型错误）
export interface IWebGPUContext extends IGraphicsContext {
  // WebGPU功能暂时禁用
}

/**
 * WebGPU上下文工厂（占位符）
 */
export class WebGPUContextFactory implements IGraphicsContextFactory<HTMLCanvasElement> {
  isSupported(): boolean {
    // WebGPU暂时不支持
    return false;
  }

  async createContext(canvas: HTMLCanvasElement): Promise<IWebGPUContext> {
    throw new Error('WebGPU implementation temporarily disabled due to type issues');
  }
}

/**
 * WebGPU上下文实现 (占位符)
 */
class WebGPUContext implements IWebGPUContext {
  public readonly width: number;
  public readonly height: number;

  constructor(canvas: HTMLCanvasElement) {
    this.width = canvas.width;
    this.height = canvas.height;
  }

  clear(color?: string): void {
    // 占位符实现
  }

  save(): void {
    // 占位符实现
  }

  restore(): void {
    // 占位符实现
  }

  translate(x: number, y: number): void {
    // 占位符实现
  }

  rotate(angle: number): void {
    // 占位符实现
  }

  scale(scaleX: number, scaleY: number): void {
    // 占位符实现
  }

  setOpacity(opacity: number): void {
    // 占位符实现
  }

  setStrokeStyle(style: string): void {
    // 占位符实现
  }

  setFillStyle(style: string): void {
    // 占位符实现
  }

  setLineWidth(width: number): void {
    // 占位符实现
  }

  setLineDash(segments: number[]): void {
    // 占位符实现
  }

  drawRect(rect: { x: number; y: number; width: number; height: number }, fill?: boolean, stroke?: boolean): void {
    // 占位符实现
  }

  drawCircle(center: IPoint, radius: number, fill?: boolean, stroke?: boolean): void {
    // 占位符实现
  }

  drawLine(from: IPoint, to: IPoint): void {
    // 占位符实现
  }

  drawImage(imageData: { source: any; dx?: number; dy?: number; dWidth?: number; dHeight?: number }): void {
    // 占位符实现
  }

  screenToWorld(point: IPoint): IPoint {
    return { ...point };
  }

  worldToScreen(point: IPoint): IPoint {
    return { ...point };
  }

  dispose(): void {
    // 占位符实现
  }
}
