/**
 * 简化的渲染器基类
 */
import type { IViewport } from '../engine/types';
import { IRect } from '../graphics/IGraphicsContext';
import { Transform } from '../math';
import type {
  Drawable,
  RenderContext,
  Renderer,
  RendererCapabilities,
  RenderState
} from './types';

/**
 * 简化的渲染器基类
 */
export abstract class BaseRenderer<TContext = any> implements Renderer<TContext> {
  protected drawables: Drawable[] = [];
  protected viewport: IViewport = { x: 0, y: 0, width: 800, height: 600, zoom: 1 };
  protected renderState: RenderState;
  protected stateStack: RenderState[] = [];
  private _isRunning = false;
  protected animationId: number | null = null;

  constructor() {
    this.renderState = this.createDefaultRenderState();
  }

  abstract render(context: RenderContext<TContext>): void;
  abstract clear(): void;
  abstract getCapabilities(): RendererCapabilities;

  // 可选的初始化方法
  initialize?(canvas: HTMLCanvasElement, config?: any): boolean | Promise<boolean>;

  update(deltaTime: number): void {
    // 基础更新逻辑
    this.drawables.forEach(drawable => {
      if (drawable.visible) {
        // 可以在这里添加动画更新逻辑
      }
    });
  }

  addDrawable(drawable: Drawable): void {
    this.drawables.push(drawable);
    this.sortDrawables();
  }

  removeDrawable(id: string): void {
    this.drawables = this.drawables.filter(d => d.id !== id);
  }

  getDrawable(id: string): Drawable | undefined {
    return this.drawables.find(d => d.id === id);
  }

  setViewport(viewport: Partial<IViewport>): void {
    this.viewport = { ...this.viewport, ...viewport };
  }

  getViewport(): IViewport {
    return { ...this.viewport };
  }

  // 添加清空所有可绘制对象的方法
  clearDrawables(): void {
    this.drawables = [];
  }

  // 添加渲染循环管理
  startRenderLoop(context: RenderContext<TContext>): void {
    if (this._isRunning) return;
    this._isRunning = true;

    const loop = () => {
      if (!this._isRunning) return;
      this.render(context);
      this.animationId = requestAnimationFrame(loop);
    };

    loop();
  }

  stopRenderLoop(): void {
    this._isRunning = false;
    if (this.animationId !== null) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
  }

  isRunning(): boolean {
    return this._isRunning;
  }

  // 可选的统计方法
  getStats?(): any;

  // 渲染状态管理
  pushState(): void {
    this.stateStack.push({ ...this.renderState });
  }

  popState(): void {
    if (this.stateStack.length > 0) {
      this.renderState = this.stateStack.pop()!;
    }
  }

  getRenderState(): RenderState {
    return { ...this.renderState };
  }

  setRenderState(state: Partial<RenderState>): void {
    this.renderState = { ...this.renderState, ...state };
  }

  protected sortDrawables(): void {
    this.drawables.sort((a, b) => a.zIndex - b.zIndex);
  }

  protected boundsIntersect(a: IRect, b: IRect): boolean {
    return !(a.x + a.width < b.x ||
             b.x + b.width < a.x ||
             a.y + a.height < b.y ||
             b.y + b.height < a.y);
  }

  protected createDefaultRenderState(): RenderState {
    return {
      transform: new Transform(),
      fillStyle: '#000000',
      strokeStyle: '#000000',
      lineWidth: 1,
      lineCap: 'butt',
      lineJoin: 'miter',
      globalAlpha: 1,
      globalCompositeOperation: 'source-over',
      shadowColor: 'rgba(0, 0, 0, 0)',
      shadowBlur: 0,
      shadowOffsetX: 0,
      shadowOffsetY: 0
    };
  }

  dispose(): void {
    this.drawables = [];
    this.stateStack = [];
  }
}