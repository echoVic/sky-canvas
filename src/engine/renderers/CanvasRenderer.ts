import { BaseRenderer } from '../core';
import { RenderContext } from '../../types';

export class CanvasRenderer extends BaseRenderer {
  private animationId: number | null = null;
  private lastTime = 0;

  render(context: RenderContext): void {
    const { ctx, viewport, devicePixelRatio } = context;
    
    // 清空画布
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, context.canvas.width, context.canvas.height);
    ctx.restore();

    // 设置视口变换
    ctx.save();
    ctx.scale(devicePixelRatio, devicePixelRatio);
    ctx.translate(-viewport.x, -viewport.y);

    // 绘制所有可见的对象
    for (const drawable of this.drawables) {
      if (drawable.visible) {
        ctx.save();
        drawable.draw(context);
        ctx.restore();
      }
    }

    ctx.restore();
  }

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

  dispose(): void {
    this.stopRenderLoop();
    super.dispose();
  }
}
