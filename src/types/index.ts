// 基础几何类型
export interface Point {
  x: number;
  y: number;
}

export interface Size {
  width: number;
  height: number;
}

export interface Rect extends Point, Size {}

// 画布相关类型
export interface CanvasState {
  zoom: number;
  pan: Point;
  size: Size;
  isDragging: boolean;
}

// 工具类型
export enum ToolType {
  SELECT = 'select',
  PAN = 'pan',
  ZOOM = 'zoom',
  BRUSH = 'brush',
  ERASER = 'eraser',
  TEXT = 'text',
  RECTANGLE = 'rectangle',
  CIRCLE = 'circle',
  LINE = 'line',
  TRIANGLE = 'triangle'
}

export interface Tool {
  type: ToolType;
  name: string;
  icon: string;
  shortcut?: string;
}

// 图层类型
export interface Layer {
  id: string;
  name: string;
  visible: boolean;
  opacity: number;
  locked: boolean;
  zIndex: number;
}

// 渲染上下文类型
export interface RenderContext {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D | GPUCanvasContext | WebGLRenderingContext; // 支持多种渲染上下文
  viewport: Rect;
  devicePixelRatio: number;
  present?: () => void; // WebGPU渲染通道提交方法
}

// 历史记录类型
export interface HistoryState {
  canUndo: boolean;
  canRedo: boolean;
  currentIndex: number;
  maxSize: number;
}

// 事件类型
export interface CanvasEvent {
  type: string;
  point: Point;
  originalEvent: MouseEvent | TouchEvent;
  preventDefault: () => void;
  stopPropagation: () => void;
}
