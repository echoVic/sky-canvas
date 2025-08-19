import { RenderContext, Point, Rect } from '../../types';

export interface Renderer {
  render(context: RenderContext): void;
  update(deltaTime: number): void;
  dispose(): void;
}

export interface Drawable {
  id: string;
  bounds: Rect;
  visible: boolean;
  zIndex: number;
  draw(context: RenderContext): void;
  hitTest(point: Point): boolean;
}

export abstract class BaseRenderer implements Renderer {
  protected drawables: Drawable[] = [];

  abstract render(context: RenderContext): void;
  
  update(deltaTime: number): void {
    // 基础更新逻辑
  }

  addDrawable(drawable: Drawable): void {
    this.drawables.push(drawable);
    this.sortDrawables();
  }

  removeDrawable(id: string): void {
    this.drawables = this.drawables.filter(d => d.id !== id);
  }

  protected sortDrawables(): void {
    this.drawables.sort((a, b) => a.zIndex - b.zIndex);
  }

  dispose(): void {
    this.drawables = [];
  }
}
