/**
 * 选择服务
 */

import { createServiceIdentifier, injectable } from '../../di/ServiceIdentifier';
import { IShapeEntity } from '../../models/entities/Shape';

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
  select(shapes: IShapeEntity | IShapeEntity[], mode?: SelectionMode): void;
  deselect(shapes: IShapeEntity | IShapeEntity[]): void;
  clearSelection(): void;
  getSelectedShapes(): IShapeEntity[];
  isSelected(shape: IShapeEntity): boolean;
  getSelectionCount(): number;
  setSelectionMode(mode: SelectionMode): void;
}

/**
 * 选择服务标识符
 */
export const ISelectionService = createServiceIdentifier<ISelectionService>('SelectionService');

/**
 * 选择服务实现
 */
@injectable
export class SelectionService implements ISelectionService {
  private selectedShapes = new Set<IShapeEntity>();
  private mode: SelectionMode = SelectionMode.SINGLE;

  select(shapes: IShapeEntity | IShapeEntity[], mode?: SelectionMode): void {
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

  deselect(shapes: IShapeEntity | IShapeEntity[]): void {
    const shapesToDeselect = Array.isArray(shapes) ? shapes : [shapes];
    
    for (const shape of shapesToDeselect) {
      this.selectedShapes.delete(shape);
    }
  }

  clearSelection(): void {
    this.selectedShapes.clear();
  }

  getSelectedShapes(): IShapeEntity[] {
    return Array.from(this.selectedShapes);
  }

  isSelected(shape: IShapeEntity): boolean {
    return this.selectedShapes.has(shape);
  }

  getSelectionCount(): number {
    return this.selectedShapes.size;
  }

  setSelectionMode(mode: SelectionMode): void {
    this.mode = mode;
  }
}