/**
 * 选择工具类型定义
 */

import { IPoint } from '@sky-canvas/render-engine';
import { ShapeEntity } from '../../../models/entities/Shape';
import { IViewModel } from '../../interfaces/IViewModel';

/**
 * 控制手柄类型
 */
export type HandleType = 'resize' | 'rotate' | 'move' | null;
export type HandlePosition = 'nw' | 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w' | 'center' | 'rotate' | null;

/**
 * 选择工具状态
 */
export interface ISelectToolState {
  isSelecting: boolean;
  isDragging: boolean;
  isResizing: boolean;
  isRotating: boolean;
  startPoint: IPoint | null;
  lastPoint: IPoint | null;
  cursor: string;
  enabled: boolean;
  activeHandle: HandlePosition;
}

/**
 * 选择工具 ViewModel 接口
 */
export interface ISelectToolViewModel extends IViewModel {
  state: ISelectToolState;

  // 工具控制
  activate(): void;
  deactivate(): void;

  // 鼠标事件
  handleMouseDown(x: number, y: number, event?: MouseEvent): void;
  handleMouseMove(x: number, y: number, event?: MouseEvent): void;
  handleMouseUp(x: number, y: number, event?: MouseEvent): void;

  // 键盘事件
  handleKeyDown(event: KeyboardEvent): void;

  // 状态查询
  getSelectedShapes(): ShapeEntity[];
  getSelectionCount(): number;

  // 缩放和旋转
  startResize(handle: HandlePosition, x: number, y: number): void;
  startRotate(x: number, y: number): void;
}

/**
 * 初始形状状态（用于变换计算）
 */
export interface IInitialShapeState {
  transform: ShapeEntity['transform'];
  size?: { width: number; height: number };
  radius?: number;
}

/**
 * 边界框
 */
export interface IBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}
