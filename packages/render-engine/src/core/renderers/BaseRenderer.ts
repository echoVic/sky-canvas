/**
 * 简化的渲染器基类
 */
import type { IRenderable, IViewport } from '../types';
import { IRect } from '../interface/IGraphicsContext';
import { Transform } from '../../math';
import type {
  RenderContext,
  Renderer,
  RendererCapabilities,
  RenderState
} from './types';

/**
 * 简化的渲染器基类
 */
export abstract class BaseRenderer<TContext = any> implements Renderer<TContext> {
  protected renderables: IRenderable[] = [];
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
    this.renderables.forEach(renderable => {
      if (renderable.visible) {
        // 可以在这里添加动画更新逻辑
      }
    });
  }

  addRenderable(renderable: IRenderable): void {
    this.renderables.push(renderable);
    this.sortRenderables();
  }

  removeRenderable(id: string): void {
    this.renderables = this.renderables.filter(r => r.id !== id);
  }

  getRenderable(id: string): IRenderable | undefined {
    return this.renderables.find(r => r.id === id);
  }

  setViewport(viewport: Partial<IViewport>): void {
    this.viewport = { ...this.viewport, ...viewport };
  }

  getViewport(): IViewport {
    return { ...this.viewport };
  }

  // 添加清空所有可渲染对象的方法
  clearRenderables(): void {
    this.renderables = [];
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

  protected sortRenderables(): void {
    this.renderables.sort((a, b) => a.zIndex - b.zIndex);
  }

  protected boundsIntersect(a: IRect, b: IRect): boolean {
    return !(a.x + a.width < b.x ||
             b.x + b.width < a.x ||
             a.y + a.height < b.y ||
             b.y + b.height < a.y);
  }

  protected isRenderableInViewport(renderable: IRenderable, viewport: IViewport): boolean {
    const bounds = renderable.getBounds();
    const viewportRect = {
      x: viewport.x,
      y: viewport.y,
      width: viewport.width,
      height: viewport.height
    };
    return this.boundsIntersect(bounds, viewportRect);
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
    this.renderables = [];
    this.stateStack = [];
  }
}