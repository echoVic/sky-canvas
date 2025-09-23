/**
 * 简化的渲染器基类
 */
import { Transform } from '../../math';
import { IRect } from '../interface/IGraphicsContext';
import type { IRenderable, IViewport } from '../types';
import type {
  Renderer,
  RendererCapabilities,
  RenderState
} from './types';

/**
 * 简化的渲染器基类
 */
export abstract class BaseRenderer<TContext = any> implements Renderer<TContext> {
  protected children: IRenderable[] = [];
  protected viewport: IViewport = { x: 0, y: 0, width: 800, height: 600, zoom: 1 };
  protected renderState: RenderState;
  protected stateStack: RenderState[] = [];
  private _isRunning = false;
  protected animationId: number | null = null;

  // 每个渲染器管理自己的 context 和 canvas
  protected canvas: HTMLCanvasElement | null = null;
  protected context: TContext | null = null;

  constructor() {
    this.renderState = this.createDefaultRenderState();
  }

  // 现在 render 方法不需要外部传入 context
  abstract render(): void;
  abstract clear(): void;
  abstract getCapabilities(): RendererCapabilities;

  // 必须实现的初始化方法，负责创建 context
  abstract initialize(canvas: HTMLCanvasElement, config?: any): boolean | Promise<boolean>;

  update(deltaTime: number): void {
    // 基础更新逻辑
    this.children.forEach(child => {
      if (child.visible) {
        // 可以在这里添加动画更新逻辑
      }
    });
  }

  addRenderable(renderable: IRenderable): void {
    this.children.push(renderable);
    this.sortChildren();
  }

  removeRenderable(id: string): void {
    this.children = this.children.filter(r => r.id !== id);
  }

  getRenderable(id: string): IRenderable | undefined {
    return this.children.find(r => r.id === id);
  }

  setViewport(viewport: Partial<IViewport>): void {
    this.viewport = { ...this.viewport, ...viewport };
  }

  getViewport(): IViewport {
    return { ...this.viewport };
  }

  // 添加清空所有子对象的方法
  clearRenderables(): void {
    this.children = [];
  }

  // 添加渲染循环管理
  startRenderLoop(): void {
    if (this._isRunning) return;
    this._isRunning = true;

    const loop = () => {
      if (!this._isRunning) return;
      this.render();
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

  protected sortChildren(): void {
    this.children.sort((a: IRenderable, b: IRenderable) => a.zIndex - b.zIndex);
  }

  protected boundsIntersect(a: IRect, b: IRect): boolean {
    return !(a.x + a.width < b.x ||
             b.x + b.width < a.x ||
             a.y + a.height < b.y ||
             b.y + b.height < a.y);
  }

  protected isChildInViewport(child: IRenderable, viewport: IViewport): boolean {
    const bounds = child.getBounds();
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

  // 获取 canvas 和 context 的方法
  getCanvas(): HTMLCanvasElement | null {
    return this.canvas;
  }

  getContext(): TContext | null {
    return this.context;
  }

  dispose(): void {
    this.stopRenderLoop();
    this.children = [];
    this.stateStack = [];
    this.canvas = null;
    this.context = null;
  }
}