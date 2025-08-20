import { Point, Rect, RenderContext } from '../../types';
import { Transform } from '../math';

// 渲染状态接口
export interface RenderState {
  transform: Transform;
  fillStyle: string | CanvasGradient | CanvasPattern;
  strokeStyle: string | CanvasGradient | CanvasPattern;
  lineWidth: number;
  lineCap: CanvasLineCap;
  lineJoin: CanvasLineJoin;
  globalAlpha: number;
  globalCompositeOperation: GlobalCompositeOperation;
  shadowColor: string;
  shadowBlur: number;
  shadowOffsetX: number;
  shadowOffsetY: number;
}

// 渲染命令接口
export interface RenderCommand {
  type: string;
  execute(context: RenderContext, state: RenderState): void;
}

// 基础渲染器接口
export interface Renderer {
  render(context: RenderContext): void;
  update(deltaTime: number): void;
  dispose(): void;
  clear(): void;
  setViewport(viewport: Rect): void;
  getViewport(): Rect;
}

// 可绘制对象接口
export interface Drawable {
  id: string;
  bounds: Rect;
  visible: boolean;
  zIndex: number;
  transform: Transform;
  draw(context: RenderContext): void;
  hitTest(point: Point): boolean;
  getBounds(): Rect;
  setTransform(transform: Transform): void;
}

// 渲染器能力接口
export interface RendererCapabilities {
  supportsTransforms: boolean;
  supportsFilters: boolean;
  supportsBlending: boolean;
  maxTextureSize: number;
  supportedFormats: string[];
}

// 抽象渲染器基类
export abstract class BaseRenderer implements Renderer {
  protected drawables: Drawable[] = [];
  protected viewport: Rect = { x: 0, y: 0, width: 0, height: 0 };
  protected renderState: RenderState;
  protected stateStack: RenderState[] = [];

  constructor() {
    this.renderState = this.createDefaultRenderState();
  }

  abstract render(context: RenderContext): void;
  abstract clear(): void;
  abstract getCapabilities(): RendererCapabilities;
  
  // 可选的初始化方法，子类可以重写
  initialize?(canvas: HTMLCanvasElement): boolean | Promise<boolean>;
  
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  update(deltaTime: number): void {
    // 更新所有可绘制对象
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

  getDrawablesInBounds(bounds: Rect): Drawable[] {
    return this.drawables.filter(drawable => {
      if (!drawable.visible) return false;
      const drawableBounds = drawable.getBounds();
      return this.boundsIntersect(bounds, drawableBounds);
    });
  }

  setViewport(viewport: Rect): void {
    this.viewport = { ...viewport };
  }

  getViewport(): Rect {
    return { ...this.viewport };
  }

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

  protected boundsIntersect(a: Rect, b: Rect): boolean {
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

// 导出基础图形和命令
export * from './commands';
export * from './shapes';

