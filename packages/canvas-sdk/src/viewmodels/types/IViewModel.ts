import { Shape } from '@sky-canvas/render-engine';

/**
 * 基础 ViewModel 接口
 * 所有 ViewModel 实现的通用接口
 */
export interface IViewModel {
  /**
   * 初始化 ViewModel
   */
  initialize(): Promise<void>;

  /**
   * 销毁 ViewModel，清理资源
   */
  dispose(): void;

  /**
   * 获取当前状态快照
   */
  getSnapshot(): any;
}

// === 视口相关接口 ===
export interface IViewportState {
  x: number;
  y: number;
  width: number;
  height: number;
  zoom: number;
}

export interface IViewportViewModel extends IViewModel {
  state: IViewportState;
  setViewport(viewport: Partial<IViewportState>): void;
  pan(deltaX: number, deltaY: number): void;
  zoom(factor: number, centerX?: number, centerY?: number): void;
  fitToContent(shapes: Shape[]): void;
  reset(): void;
  screenToWorld(x: number, y: number): { x: number; y: number };
  worldToScreen(x: number, y: number): { x: number; y: number };
}

// === 场景相关接口 ===
export interface ISceneState {
  shapes: Shape[];
  isModified: boolean;
  lastUpdated: Date;
  selection: {
    selectedShapeIds: string[];
  };
}

export interface ISceneViewModel extends IViewModel {
  state: ISceneState;
  addShape(shape: Shape): void;
  removeShape(id: string): void;
  updateShape(id: string, updates: Partial<Shape>): void;
  clearShapes(): void;
  getShape(id: string): Shape | undefined;
  getShapes(): Shape[];
}

// === 选择相关接口 ===
export interface ISelectionState {
  selectedShapeIds: string[];
  isMultiSelect: boolean;
  selectionBounds?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}