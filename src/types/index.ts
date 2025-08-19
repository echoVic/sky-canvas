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
  SHAPE = 'shape'
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

// 渲染相关类型
export interface RenderContext {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  viewport: Rect;
  devicePixelRatio: number;
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
