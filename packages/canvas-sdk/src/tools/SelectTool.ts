/**
 * 选择工具 - 简化版本
 */

import { IPoint } from '@sky-canvas/render-engine';
import { CanvasManager } from '../managers/CanvasManager';
import { IShapeEntity } from '../models/entities/Shape';
import { IInteractionTool, IMouseEvent, InteractionMode } from './types';

export class SelectTool implements IInteractionTool {
  readonly name = 'select';
  readonly mode = InteractionMode.SELECT;
  cursor = 'default';
  enabled = true;
  
  private isSelecting = false;
  private startPoint: IPoint | null = null;
  private canvasManager: CanvasManager;

  constructor(canvasManager: CanvasManager) {
    this.canvasManager = canvasManager;
  }
  
  activate(): void {
    this.enabled = true;
    console.log('Select tool activated');
  }

  deactivate(): void {
    this.enabled = false;
    this.isSelecting = false;
    this.startPoint = null;
    console.log('Select tool deactivated');
  }
  
  onMouseDown(event: IMouseEvent): void {
    if (!this.enabled) return;
    
    this.isSelecting = true;
    this.startPoint = { ...event.point };
    
    // 实现点选逻辑
    const hitShapeId = this.canvasManager.hitTest(event.point.x, event.point.y);
    if (hitShapeId) {
      // 点击到形状，选择它
      if (!event.shiftKey) {
        this.canvasManager.clearSelection();
      }
      this.canvasManager.selectShape(hitShapeId);
    } else {
      // 点击空白区域，清除选择
      if (!event.shiftKey) {
        this.canvasManager.clearSelection();
      }
    }
    
    console.log('Select tool mouse down at', event.point, 'hit:', hitShapeId);
  }

  onMouseMove(event: IMouseEvent): void {
    if (!this.enabled || !this.isSelecting) return;
    
    // TODO: 实现拖选逻辑
    console.log('Select tool mouse move to', event.point);
  }

  onMouseUp(event: IMouseEvent): void {
    if (!this.enabled) return;
    
    if (this.isSelecting) {
      this.isSelecting = false;
      // TODO: 完成选择操作
      console.log('Select tool mouse up at', event.point);
    }
    
    this.startPoint = null;
  }

  onKeyDown(event: KeyboardEvent): void {
    if (!this.enabled) return;
    
    switch (event.key) {
      case 'Escape':
        this.canvasManager.clearSelection();
        break;
      case 'Delete':
      case 'Backspace':
        // 删除选中的元素
        const selectedShapes = this.canvasManager.getSelectedShapes();
        selectedShapes.forEach(shape => {
          this.canvasManager.removeShape(shape.id);
        });
        break;
    }
  }

  onKeyUp(event: KeyboardEvent): void {
    // TODO: 处理按键释放事件
  }

  /**
   * 获取选中的形状
   */
  getSelectedShapes(): IShapeEntity[] {
    return this.canvasManager.getSelectedShapes();
  }
  
  /**
   * 获取选中的形状数量
   */
  getSelectionCount(): number {
    return this.canvasManager.getSelectedShapes().length;
  }
}