/**
 * WebGPU 渲染器实现
 * 提供基于 WebGPU 的高性能渲染能力
 */

import { WebGPUContext } from '../context/WebGPUContext';
import { IPoint } from '../interface/IGraphicsContext';
import { BaseRenderer } from './BaseRenderer';
import { RenderContext, RendererCapabilities, RenderState } from './types';

/**
 * WebGPU 渲染上下文
 */
export interface WebGPURenderContext extends RenderContext {
  context: WebGPUContext;
  canvas: HTMLCanvasElement;
  adapter?: GPUAdapter;
  device?: GPUDevice;
}

/**
 * WebGPU 渲染器实现
 */
export class WebGPURenderer extends BaseRenderer<WebGPUContext> {
  private webgpuContext: WebGPUContext | null = null;

  async initialize(canvas: HTMLCanvasElement, config?: any): Promise<boolean> {
    try {
      this.canvas = canvas;

      // 创建 WebGPUContext 实例
      this.webgpuContext = await WebGPUContext.create(canvas);
      this.context = this.webgpuContext;

      return true;
    } catch (error) {
      console.error('Failed to initialize WebGPU renderer:', error);
      return false;
    }
  }

  async render(): Promise<void> {
    if (!this.webgpuContext || !this.canvas) {
      console.error('WebGPURenderer not initialized');
      return;
    }

    // 开始渲染通道
    this.webgpuContext.clear();

    // 应用全局渲染状态
    this.applyRenderState(this.renderState);

    // 渲染所有可见对象
    for (const renderable of this.children) {
      if (renderable.visible && this.isChildInViewport(renderable, this.viewport)) {
        // 保存当前状态
        this.webgpuContext.save();

        // 应用对象变换（如果有）
        if (renderable.transform) {
          this.applyTransform(renderable.transform);
        }

        // 调用对象的渲染方法
        renderable.render(this.webgpuContext);

        // 恢复状态
        this.webgpuContext.restore();
      }
    }

    // 提交渲染命令
    this.webgpuContext.present();
  }

  clear(): void {
    if (this.webgpuContext) {
      this.webgpuContext.clear();
    }
  }

  getCapabilities(): RendererCapabilities {
    return {
      supportsTransforms: true,
      supportsFilters: true,
      supportsBlending: true,
      maxTextureSize: 8192,
      supportedFormats: ['png', 'jpg', 'jpeg', 'gif', 'webp', 'dds', 'ktx2']
    };
  }


  // WebGPURenderer 特有的性能更新
  override update(deltaTime: number): void {
    super.update(deltaTime);
    // 可以在这里添加 WebGPU 特定的更新逻辑
  }

  // 绘制基础图形
  drawLine(start: IPoint, end: IPoint, style?: Partial<RenderState>): void {
    if (!this.webgpuContext) return;

    this.webgpuContext.save();

    if (style) {
      this.applyRenderStateToContext(style);
    }

    this.webgpuContext.drawLine(start.x, start.y, end.x, end.y);

    this.webgpuContext.restore();
  }

  drawRect(x: number, y: number, width: number, height: number, filled = false, style?: Partial<RenderState>): void {
    if (!this.webgpuContext) return;

    this.webgpuContext.save();

    if (style) {
      this.applyRenderStateToContext(style);
    }

    const rect = { x, y, width, height };
    this.webgpuContext.drawRect(rect, filled, !filled);

    this.webgpuContext.restore();
  }

  drawCircle(center: IPoint, radius: number, filled = false, style?: Partial<RenderState>): void {
    if (!this.webgpuContext) return;

    this.webgpuContext.save();

    if (style) {
      this.applyRenderStateToContext(style);
    }

    this.webgpuContext.drawCircle(center, radius, filled, !filled);

    this.webgpuContext.restore();
  }

  drawText(
    text: string,
    position: IPoint,
    style?: Partial<RenderState> & {
      font?: string;
      textAlign?: string;
      textBaseline?: string
    }
  ): void {
    if (!this.webgpuContext) return;

    this.webgpuContext.save();

    if (style) {
      this.applyRenderStateToContext(style);
      if (style.font) {
        this.webgpuContext.setFont(style.font);
      }
    }

    this.webgpuContext.fillText(text, position.x, position.y);

    this.webgpuContext.restore();
  }

  // 批处理渲染方法
  batchRender(renderables: Array<{
    renderable: any;
    transform?: any;
    style?: Partial<RenderState>
  }>): void {
    if (!this.webgpuContext) return;

    // WebGPU 批处理渲染 - 在一个渲染通道中渲染多个对象
    this.webgpuContext.clear();

    for (const item of renderables) {
      this.webgpuContext.save();

      if (item.transform) {
        this.applyTransform(item.transform);
      }

      if (item.style) {
        this.applyRenderStateToContext(item.style);
      }

      item.renderable.render(this.webgpuContext);

      this.webgpuContext.restore();
    }

    this.webgpuContext.present();
  }

  // 异步初始化 WebGPU 渲染器
  static async create(canvas: HTMLCanvasElement): Promise<WebGPURenderer> {
    const renderer = new WebGPURenderer();

    try {
      const success = await renderer.initialize(canvas);
      if (!success) {
        throw new Error('Failed to initialize WebGPU renderer');
      }
      return renderer;
    } catch (error) {
      console.error('Failed to create WebGPURenderer:', error);
      throw error;
    }
  }

  // 检查 WebGPU 支持
  static isSupported(): boolean {
    return !!navigator.gpu;
  }

  // 获取 WebGPU 适配器信息
  static async getAdapterInfo(): Promise<{
    vendor: string;
    architecture: string;
    device: string;
    description: string;
  } | null> {
    if (!navigator.gpu) return null;

    try {
      const adapter = await navigator.gpu.requestAdapter();
      if (!adapter) return null;

      // WebGPU adapter info is not widely available yet
      try {
        const info = (adapter as any).requestAdapterInfo?.();
        if (info) {
          const adapterInfo = await info;
          return {
            vendor: adapterInfo.vendor || 'Unknown',
            architecture: adapterInfo.architecture || 'Unknown',
            device: adapterInfo.device || 'Unknown',
            description: adapterInfo.description || 'Unknown'
          };
        }
      } catch (e) {
        // Fallback to basic info
      }

      return {
        vendor: 'Unknown',
        architecture: 'Unknown',
        device: 'Unknown',
        description: 'WebGPU Adapter'
      };
    } catch (error) {
      console.warn('Failed to get WebGPU adapter info:', error);
      return null;
    }
  }

  // 性能分析方法
  async getPerformanceInfo(): Promise<{
    memoryUsage?: number;
    renderTime?: number;
    triangleCount?: number;
  }> {
    const info: any = {};

    if (this.webgpuContext) {
      // 这里可以添加性能统计逻辑
      info.renderTime = performance.now();
    }

    return info;
  }

  // 私有辅助方法
  private applyRenderState(state: RenderState): void {
    if (!this.webgpuContext) return;

    if (state.fillStyle) {
      this.webgpuContext.setFillStyle(this.convertStyleToString(state.fillStyle));
    }
    if (state.strokeStyle) {
      this.webgpuContext.setStrokeStyle(this.convertStyleToString(state.strokeStyle));
    }
    if (state.lineWidth) {
      this.webgpuContext.setLineWidth(state.lineWidth);
    }
    if (state.globalAlpha !== undefined) {
      this.webgpuContext.setGlobalAlpha(state.globalAlpha);
    }
  }

  private applyRenderStateToContext(style: Partial<RenderState>): void {
    if (!this.webgpuContext) return;

    if (style.fillStyle) {
      this.webgpuContext.setFillStyle(this.convertStyleToString(style.fillStyle));
    }
    if (style.strokeStyle) {
      this.webgpuContext.setStrokeStyle(this.convertStyleToString(style.strokeStyle));
    }
    if (style.lineWidth) {
      this.webgpuContext.setLineWidth(style.lineWidth);
    }
    if (style.globalAlpha !== undefined) {
      this.webgpuContext.setGlobalAlpha(style.globalAlpha);
    }
  }

  private convertStyleToString(style: string | CanvasGradient | CanvasPattern): string {
    if (typeof style === 'string') {
      return style;
    }
    // 对于 gradient 和 pattern，我们暂时返回默认颜色
    // 实际应用中需要更复杂的处理逻辑
    return '#000000';
  }

  private applyTransform(transform: any): void {
    if (!this.webgpuContext || !transform) return;

    // 应用变换矩阵
    if (transform.translate) {
      this.webgpuContext.translate(transform.translate.x, transform.translate.y);
    }
    if (transform.rotate) {
      this.webgpuContext.rotate(transform.rotate);
    }
    if (transform.scale) {
      this.webgpuContext.scale(transform.scale.x, transform.scale.y);
    }
  }

  // 清理资源
  dispose(): void {
    if (this.webgpuContext) {
      this.webgpuContext.dispose();
      this.webgpuContext = null;
    }
    super.dispose();
  }
}

/**
 * 创建 WebGPU 渲染器的便捷函数
 */
export async function createWebGPURenderer(canvas: HTMLCanvasElement): Promise<WebGPURenderer> {
  return WebGPURenderer.create(canvas);
}

/**
 * 检查 WebGPU 支持并提供回退方案
 */
export function checkWebGPUSupport(): {
  supported: boolean;
  reason?: string;
  fallback?: string;
} {
  if (!navigator.gpu) {
    return {
      supported: false,
      reason: 'WebGPU API not available',
      fallback: 'Use WebGL or Canvas2D renderer'
    };
  }

  return { supported: true };
}