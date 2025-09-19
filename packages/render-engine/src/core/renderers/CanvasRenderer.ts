import { Transform } from '../../math';
import { Canvas2DContext } from '../context/Canvas2DContext';
import { IPoint } from '../interface/IGraphicsContext';
import { BaseRenderer } from './BaseRenderer';
import { CanvasRenderContext, RendererCapabilities, RenderState } from './types';

export class CanvasRenderer extends BaseRenderer<CanvasRenderingContext2D> {

  initialize(canvas: HTMLCanvasElement, config?: any): boolean {
    this.canvas = canvas;

    // 创建 Canvas2D context
    this.context = canvas.getContext('2d', {
      alpha: config?.alpha ?? true,
      willReadFrequently: config?.willReadFrequently ?? false,
      desynchronized: config?.desynchronized ?? false
    }) as CanvasRenderingContext2D;

    if (!this.context) {
      console.error('Failed to get 2D rendering context');
      return false;
    }

    return true;
  }

  render(): void {
    if (!this.context || !this.canvas) {
      console.error('CanvasRenderer not initialized');
      return;
    }

    const devicePixelRatio = window.devicePixelRatio || 1;

    // 清空画布
    this.clear();

    // 设置视口变换
    this.context.save();
    this.context.scale(devicePixelRatio, devicePixelRatio);
    this.context.translate(-this.viewport.x, -this.viewport.y);

    // 应用全局渲染状态
    this.applyRenderState(this.context, this.renderState);

    // 绘制所有可见的对象
    for (const renderable of this.children) {
      if (renderable.visible && this.isChildInViewport(renderable, this.viewport)) {
        this.context.save();

        // 应用对象变换（如果有）
        if (renderable.transform) {
          this.applyTransform(this.context, renderable.transform);
        }

        // 调用对象的渲染方法（使用适配器）
        const canvasContext = new Canvas2DContext(this.context);
        renderable.render(canvasContext);
        this.context.restore();
      }
    }

    this.context.restore();
  }

  clear(): void {
    if (!this.context || !this.canvas) return;

    this.context.save();
    this.context.setTransform(1, 0, 0, 1, 0, 0);
    this.context.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this.context.restore();
  }

  getCapabilities(): RendererCapabilities {
    return {
      supportsTransforms: true,
      supportsFilters: true,
      supportsBlending: true,
      maxTextureSize: 4096,
      supportedFormats: ['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg']
    };
  }


  // CanvasRenderer 特有的性能计时
  override update(deltaTime: number): void {
    super.update(deltaTime);
    // 可以在这里添加 Canvas2D 特定的更新逻辑
  }

  // 绘制基础图形
  drawLine(start: IPoint, end: IPoint, style?: Partial<RenderState>): void {
    if (!this.context) return;

    this.context.save();

    if (style) this.applyRenderState(this.context, { ...this.renderState, ...style });

    this.context.beginPath();
    this.context.moveTo(start.x, start.y);
    this.context.lineTo(end.x, end.y);
    this.context.stroke();

    this.context.restore();
  }

  drawRect(x: number, y: number, width: number, height: number, filled = false, style?: Partial<RenderState>): void {
    if (!this.context) return;

    this.context.save();

    if (style) this.applyRenderState(this.context, { ...this.renderState, ...style });

    if (filled) {
      this.context.fillRect(x, y, width, height);
    } else {
      this.context.strokeRect(x, y, width, height);
    }

    this.context.restore();
  }

  drawCircle(center: IPoint, radius: number, filled = false, style?: Partial<RenderState>): void {
    if (!this.context) return;

    this.context.save();

    if (style) this.applyRenderState(this.context, { ...this.renderState, ...style });

    this.context.beginPath();
    this.context.arc(center.x, center.y, radius, 0, Math.PI * 2);

    if (filled) {
      this.context.fill();
    } else {
      this.context.stroke();
    }

    this.context.restore();
  }

  drawText(text: string, position: IPoint, style?: Partial<RenderState> & { font?: string; textAlign?: CanvasTextAlign; textBaseline?: CanvasTextBaseline }): void {
    if (!this.context) return;

    this.context.save();

    if (style) {
      this.applyRenderState(this.context, { ...this.renderState, ...style });
      if (style.font) this.context.font = style.font;
      if (style.textAlign) this.context.textAlign = style.textAlign;
      if (style.textBaseline) this.context.textBaseline = style.textBaseline;
    }

    this.context.fillText(text, position.x, position.y);

    this.context.restore();
  }

  // 工具方法
  private applyRenderState(ctx: CanvasRenderingContext2D, state: RenderState): void {
    ctx.fillStyle = state.fillStyle;
    ctx.strokeStyle = state.strokeStyle;
    ctx.lineWidth = state.lineWidth;
    ctx.lineCap = state.lineCap;
    ctx.lineJoin = state.lineJoin;
    ctx.globalAlpha = state.globalAlpha;
    ctx.globalCompositeOperation = state.globalCompositeOperation;
    ctx.shadowColor = state.shadowColor;
    ctx.shadowBlur = state.shadowBlur;
    ctx.shadowOffsetX = state.shadowOffsetX;
    ctx.shadowOffsetY = state.shadowOffsetY;
  }

  private applyTransform(ctx: CanvasRenderingContext2D, transform: Transform): void {
    if (transform) {
      const matrix = transform.matrix;
      const e = matrix.elements;
      // Canvas2D变换矩阵格式: [a, b, c, d, e, f]
      // 对应Matrix3x3的: [m00, m10, m01, m11, m02, m12]
      ctx.transform(e[0], e[1], e[3], e[4], e[6], e[7]);
    }
  }


  dispose(): void {
    super.dispose();
  }
}
