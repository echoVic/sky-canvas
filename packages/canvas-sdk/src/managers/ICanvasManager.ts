/**
 * Canvas 管理器接口定义
 */

import { IRenderable } from '@sky-canvas/render-engine';
import { createDecorator } from '../di';
import { IShapeEntity, ShapeEntity } from '../models/entities/Shape';

/**
 * Canvas 管理器接口
 */
export interface ICanvasManager {
  readonly _serviceBrand: undefined;

  // 形状管理
  addShape(entity: ShapeEntity): void;
  removeShape(id: string): void;
  updateShape(id: string, updates: Partial<ShapeEntity>): void;
  getRenderables(): IRenderable[];
  hitTest(x: number, y: number): string | null;

  // 选择管理
  selectShape(id: string): void;
  deselectShape(id: string): void;
  clearSelection(): void;
  getSelectedShapes(): ShapeEntity[];
  isShapeSelected(id: string): boolean;

  // 剪贴板操作
  copySelectedShapes(): void;
  cutSelectedShapes(): void;
  paste(): ShapeEntity[];

  // 历史操作
  undo(): void;
  redo(): void;

  // Z轴管理
  bringToFront(shapeIds: string[]): void;
  sendToBack(shapeIds: string[]): void;
  bringForward(shapeIds: string[]): void;
  sendBackward(shapeIds: string[]): void;
  setZIndex(shapeIds: string[], zIndex: number): void;
  getShapesByZOrder(): IShapeEntity[];

  // 状态查询
  getStats(): CanvasStats;
  clear(): void;
  dispose(): void;
}

/**
 * Canvas 统计信息
 */
export interface CanvasStats {
  shapes: {
    totalShapes: number;
    selectedShapes: number;
    visibleShapes: number;
    shapesByType: Record<string, number>;
  };
  history: {
    canUndo: boolean;
    canRedo: boolean;
  };
}

/**
 * Canvas 管理器服务标识符
 */
export const ICanvasManager = createDecorator<ICanvasManager>('CanvasManager');
