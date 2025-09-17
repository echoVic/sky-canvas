import { IPoint } from '../graphics/IGraphicsContext';
import { Transform } from '../math';
import { BaseRenderer } from './BaseRenderer';
import { CanvasRenderContext, Drawable, RendererCapabilities, RenderState } from './types';

export class CanvasRenderer extends BaseRenderer<CanvasRenderingContext2D> {
  private currentContext: CanvasRenderContext | null = null;

  render(context: CanvasRenderContext): void {
    this.currentContext = context;
    const { context: canvas2DContext, viewport, devicePixelRatio } = context;

    if (!canvas2DContext) {
      console.error('CanvasRenderer requires CanvasRenderingContext2D');
      return;
    }

    // 清空画布
    this.clear();

    // 设置视口变换
    canvas2DContext.save();
    canvas2DContext.scale(devicePixelRatio, devicePixelRatio);
    canvas2DContext.translate(-viewport.x, -viewport.y);

    // 应用全局渲染状态
    this.applyRenderState(canvas2DContext, this.renderState);

    // 绘制所有可见的对象
    for (const drawable of this.drawables) {
      if (drawable.visible && this.isDrawableInViewport(drawable, viewport)) {
        canvas2DContext.save();

        // 应用对象变换
        this.applyTransform(canvas2DContext, drawable.transform);

        drawable.draw(context);
        canvas2DContext.restore();
      }
    }

    canvas2DContext.restore();
  }

  clear(): void {
    if (!this.currentContext) return;

    const { context: ctx, canvas } = this.currentContext;

    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.restore();
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

  getContext(): CanvasRenderContext | null {
    return this.currentContext;
  }

  // CanvasRenderer 特有的性能计时
  override update(deltaTime: number): void {
    super.update(deltaTime);
    // 可以在这里添加 Canvas2D 特定的更新逻辑
  }

  // 绘制基础图形
  drawLine(start: IPoint, end: IPoint, style?: Partial<RenderState>): void {
    if (!this.currentContext) return;
    
    const { context: graphicsContext } = this.currentContext;
    const ctx = graphicsContext instanceof CanvasRenderingContext2D ?
      graphicsContext : this.currentContext.canvas.getContext('2d');

    if (ctx) {
      ctx.save();

      if (style) this.applyRenderState(ctx, { ...this.renderState, ...style });

      ctx.beginPath();
      ctx.moveTo(start.x, start.y);
      ctx.lineTo(end.x, end.y);
      ctx.stroke();

      ctx.restore();
    }
  }

  drawRect(x: number, y: number, width: number, height: number, filled = false, style?: Partial<RenderState>): void {
    if (!this.currentContext) return;
    
    const { context: graphicsContext } = this.currentContext;
    const ctx = graphicsContext instanceof CanvasRenderingContext2D ?
      graphicsContext : this.currentContext.canvas.getContext('2d');

    if (ctx) {
      ctx.save();

      if (style) this.applyRenderState(ctx, { ...this.renderState, ...style });

      if (filled) {
        ctx.fillRect(x, y, width, height);
      } else {
        ctx.strokeRect(x, y, width, height);
      }

      ctx.restore();
    }
  }

  drawCircle(center: IPoint, radius: number, filled = false, style?: Partial<RenderState>): void {
    if (!this.currentContext) return;

    const { context: graphicsContext } = this.currentContext;
    const ctx = graphicsContext instanceof CanvasRenderingContext2D ?
      graphicsContext : this.currentContext.canvas.getContext('2d');

    if (ctx) {
      ctx.save();

      if (style) this.applyRenderState(ctx, { ...this.renderState, ...style });

      ctx.beginPath();
      ctx.arc(center.x, center.y, radius, 0, Math.PI * 2);

      if (filled) {
        ctx.fill();
      } else {
        ctx.stroke();
      }

      ctx.restore();
    }
  }

  drawText(text: string, position: IPoint, style?: Partial<RenderState> & { font?: string; textAlign?: CanvasTextAlign; textBaseline?: CanvasTextBaseline }): void {
    if (!this.currentContext) return;

    const { context: graphicsContext } = this.currentContext;
    const ctx = graphicsContext instanceof CanvasRenderingContext2D ?
      graphicsContext : this.currentContext.canvas.getContext('2d');

    if (ctx) {
      ctx.save();
      
      if (style) {
        this.applyRenderState(ctx, { ...this.renderState, ...style });
        if (style.font) ctx.font = style.font;
        if (style.textAlign) ctx.textAlign = style.textAlign;
        if (style.textBaseline) ctx.textBaseline = style.textBaseline;
      }
      
      ctx.fillText(text, position.x, position.y);
      
      ctx.restore();
    }
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

  private isDrawableInViewport(drawable: Drawable, viewport: { x: number; y: number; width: number; height: number }): boolean {
    const bounds = drawable.getBounds();
    return this.boundsIntersect(bounds, viewport);
  }

  dispose(): void {
    this.stopRenderLoop();
    this.currentContext = null;
    super.dispose();
  }
}
