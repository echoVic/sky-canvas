/**
 * 基础几何类型定义
 */
export interface Point {
  x: number;
  y: number;
}

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * 渲染上下文接口
 */
export interface RenderContext {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D | WebGLRenderingContext | WebGL2RenderingContext | any;
  viewport: Rect;
  devicePixelRatio: number;
  width?: number;
  height?: number;
}

// 所有类型都在当前文件中定义

// 可渲染对象接口
export interface IRenderable {
  render(context: any): void;
  getBounds(): Rect;
  isVisible(): boolean;
  getZIndex(): number;
}

// Canvas 元素接口
export interface ICanvasElement extends IRenderable {
  id: string;
  type: string;
  x: number;
  y: number;
  width: number;
  height: number;
  visible: boolean;
  opacity: number;
}