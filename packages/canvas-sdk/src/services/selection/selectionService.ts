/**
 * 选择服务
 */

import { createDecorator } from '../../di';
import { Shape } from '@sky-canvas/render-engine';

/**
 * 选择模式
 */
export enum SelectionMode {
  SINGLE = 'single',
  MULTIPLE = 'multiple'
}

/**
 * 选择服务接口
 */
export interface ISelectionService {
  readonly _serviceBrand: undefined;
  select(shapes: Shape | Shape[], mode?: SelectionMode): void;
  deselect(shapes: Shape | Shape[]): void;
  clearSelection(): void;
  getSelectedShapes(): Shape[];
  isSelected(shape: Shape): boolean;
  getSelectionCount(): number;
  setSelectionMode(mode: SelectionMode): void;
}

/**
 * 选择服务标识符
 */
export const ISelectionService = createDecorator<ISelectionService>('SelectionService');

/**
 * 选择服务实现
 */
export class SelectionService implements ISelectionService {
  readonly _serviceBrand: undefined;
  private selectedShapes = new Set<Shape>();
  private mode: SelectionMode = SelectionMode.SINGLE;

  select(shapes: Shape | Shape[], mode?: SelectionMode): void {
    const shapesToSelect = Array.isArray(shapes) ? shapes : [shapes];
    const currentMode = mode || this.mode;

    if (currentMode === SelectionMode.SINGLE) {
      this.selectedShapes.clear();
      if (shapesToSelect.length > 0) {
        this.selectedShapes.add(shapesToSelect[0]);
      }
    } else {
      for (const shape of shapesToSelect) {
        this.selectedShapes.add(shape);
      }
    }
  }

  deselect(shapes: Shape | Shape[]): void {
    const shapesToDeselect = Array.isArray(shapes) ? shapes : [shapes];
    
    for (const shape of shapesToDeselect) {
      this.selectedShapes.delete(shape);
    }
  }

  clearSelection(): void {
    this.selectedShapes.clear();
  }

  getSelectedShapes(): Shape[] {
    return Array.from(this.selectedShapes);
  }

  isSelected(shape: Shape): boolean {
    return this.selectedShapes.has(shape);
  }

  getSelectionCount(): number {
    return this.selectedShapes.size;
  }

  setSelectionMode(mode: SelectionMode): void {
    this.mode = mode;
  }
}