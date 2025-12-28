import { ICanvas2DContext } from '../adapters/Canvas2DContext';
import { BaseRenderer, Drawable, RenderContext, RendererCapabilities, RenderState } from '../core';
import { IPoint, IRect } from '../graphics/IGraphicsContext';
import { Transform } from '../math';

export class CanvasRenderer extends BaseRenderer {
  private animationId: number | null = null;
  private lastTime = 0;
  private currentContext: RenderContext | null = null;
  private canvasAdapter: ICanvas2DContext;

  constructor(adapter: ICanvas2DContext) {
    super();
    this.canvasAdapter = adapter;
  }

  render(context: RenderContext): void {
    this.currentContext = context;
    const { viewport, devicePixelRatio } = context;

    // 清空画布
    this.clear();

    // 设置视口变换
    this.canvasAdapter.save();
    this.canvasAdapter.scale(devicePixelRatio, devicePixelRatio);
    this.canvasAdapter.translate(-viewport.x, -viewport.y);

    // 应用全局渲染状态
    this.applyRenderStateToAdapter(this.renderState);

    // 绘制所有可见的对象
    for (const drawable of this.drawables) {
      if (drawable.visible && this.isDrawableInViewport(drawable, viewport)) {
        this.canvasAdapter.save();

        // 应用对象变换
        this.applyTransformToAdapter(drawable.transform);

        drawable.draw(context);
        this.canvasAdapter.restore();
      }
    }

    this.canvasAdapter.restore();
  }

  clear(): void {
    this.canvasAdapter.clear();
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

  getContext(): RenderContext | null {
    return this.currentContext;
  }

  // 渲染循环管理
  startRenderLoop(context: RenderContext): void {
    const renderFrame = (currentTime: number) => {
      const deltaTime = currentTime - this.lastTime;
      this.lastTime = currentTime;

      this.update(deltaTime);
      this.render(context);

      this.animationId = requestAnimationFrame(renderFrame);
    };

    this.animationId = requestAnimationFrame(renderFrame);
  }

  stopRenderLoop(): void {
    if (this.animationId !== null) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
  }

  // 绘制基础图形
  drawLine(start: IPoint, end: IPoint, style?: Partial<RenderState>): void {
    this.canvasAdapter.save();

    if (style) this.applyRenderStateToAdapter({ ...this.renderState, ...style });

    this.canvasAdapter.beginPath();
    this.canvasAdapter.moveTo(start.x, start.y);
    this.canvasAdapter.lineTo(end.x, end.y);
    this.canvasAdapter.stroke();

    this.canvasAdapter.restore();
  }

  drawRect(x: number, y: number, width: number, height: number, filled = false, style?: Partial<RenderState>): void {
    this.canvasAdapter.save();

    if (style) this.applyRenderStateToAdapter({ ...this.renderState, ...style });

    if (filled) {
      this.canvasAdapter.fillRect(x, y, width, height);
    } else {
      this.canvasAdapter.strokeRect(x, y, width, height);
    }

    this.canvasAdapter.restore();
  }

  drawCircle(center: IPoint, radius: number, filled = false, style?: Partial<RenderState>): void {
    this.canvasAdapter.save();

    if (style) this.applyRenderStateToAdapter({ ...this.renderState, ...style });

    this.canvasAdapter.beginPath();
    this.canvasAdapter.arc(center.x, center.y, radius, 0, Math.PI * 2);

    if (filled) {
      this.canvasAdapter.fill();
    } else {
      this.canvasAdapter.stroke();
    }

    this.canvasAdapter.restore();
  }

  drawText(text: string, position: IPoint, style?: Partial<RenderState> & { font?: string; textAlign?: CanvasTextAlign; textBaseline?: CanvasTextBaseline }): void {
    this.canvasAdapter.save();

    if (style) {
      this.applyRenderStateToAdapter({ ...this.renderState, ...style });
      if (style.font) this.canvasAdapter.setFont(style.font);
      if (style.textAlign) this.canvasAdapter.setTextAlign(style.textAlign);
      if (style.textBaseline) {
        // 转换CanvasTextBaseline到IGraphicsContext支持的类型
        const supportedBaselines = ['top', 'middle', 'bottom', 'alphabetic', 'hanging'];
        const baseline = supportedBaselines.includes(style.textBaseline) ?
          style.textBaseline as 'top' | 'middle' | 'bottom' | 'alphabetic' | 'hanging' :
          'alphabetic';
        this.canvasAdapter.setTextBaseline(baseline);
      }
    }

    this.canvasAdapter.fillText(text, position.x, position.y);

    this.canvasAdapter.restore();
  }

  // 工具方法
  private applyRenderStateToAdapter(state: RenderState): void {
    // 转换Canvas原生类型到适配器统一类型
    const fillStyle = typeof state.fillStyle === 'string' ? state.fillStyle : '#000000';
    const strokeStyle = typeof state.strokeStyle === 'string' ? state.strokeStyle : '#000000';

    this.canvasAdapter.setFillStyle(fillStyle);
    this.canvasAdapter.setStrokeStyle(strokeStyle);
    this.canvasAdapter.setLineWidth(state.lineWidth);
    this.canvasAdapter.setGlobalAlpha(state.globalAlpha);
    // 其他状态可以根据需要添加
  }

  private applyTransformToAdapter(transform: Transform): void {
    if (transform) {
      const matrix = transform.matrix;
      const e = matrix.elements;
      // Canvas2D变换矩阵格式: [a, b, c, d, e, f]
      // 对应Matrix3x3的: [m00, m10, m01, m11, m02, m12]
      this.canvasAdapter.transform(e[0], e[1], e[3], e[4], e[6], e[7]);
    }
  }

  private isDrawableInViewport(drawable: Drawable, viewport: IRect): boolean {
    const bounds = drawable.getBounds();
    return this.boundsIntersect(bounds, viewport);
  }

  dispose(): void {
    this.stopRenderLoop();
    this.currentContext = null;
    super.dispose();
  }
}
