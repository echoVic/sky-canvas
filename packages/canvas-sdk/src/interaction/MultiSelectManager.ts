import { IShape } from '../scene/IShape';
import { IRect } from '@sky-canvas/render-engine';

/**
 * 多选管理器
 */
export class MultiSelectManager {
  private selectedShapes: Set<IShape> = new Set();
  private selectionBounds: IRect | null = null;
  
  /**
   * 选择多个形状
   */
  selectMultiple(shapes: IShape[]): void {
    this.selectedShapes.clear();
    shapes.forEach(shape => this.selectedShapes.add(shape));
    this.updateSelectionBounds();
  }
  
  /**
   * 添加到选择
   */
  addToSelection(shape: IShape | IShape[]): void {
    const shapes = Array.isArray(shape) ? shape : [shape];
    shapes.forEach(s => this.selectedShapes.add(s));
    this.updateSelectionBounds();
  }
  
  /**
   * 从选择中移除
   */
  removeFromSelection(shape: IShape | IShape[]): void {
    const shapes = Array.isArray(shape) ? shape : [shape];
    shapes.forEach(s => this.selectedShapes.delete(s));
    this.updateSelectionBounds();
  }
  
  /**
   * 清空选择
   */
  clearSelection(): void {
    this.selectedShapes.clear();
    this.selectionBounds = null;
  }
  
  /**
   * 获取选择的形状
   */
  getSelectedShapes(): IShape[] {
    return Array.from(this.selectedShapes);
  }
  
  /**
   * 获取选择边界
   */
  getSelectionBounds(): IRect | null {
    return this.selectionBounds;
  }
  
  /**
   * 更新选择边界
   */
  private updateSelectionBounds(): void {
    if (this.selectedShapes.size === 0) {
      this.selectionBounds = null;
      return;
    }
    
    const shapes = this.getSelectedShapes();
    if (shapes.length === 0) {
      this.selectionBounds = null;
      return;
    }
    
    let minX = Infinity, minY = Infinity;
    let maxX = -Infinity, maxY = -Infinity;
    
    shapes.forEach(shape => {
      const bounds = shape.getBounds();
      minX = Math.min(minX, bounds.x);
      minY = Math.min(minY, bounds.y);
      maxX = Math.max(maxX, bounds.x + bounds.width);
      maxY = Math.max(maxY, bounds.y + bounds.height);
    });
    
    this.selectionBounds = {
      x: minX,
      y: minY,
      width: maxX - minX,
      height: maxY - minY
    };
  }
}