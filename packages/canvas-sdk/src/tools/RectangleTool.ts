/**
 * 矩形工具实现
 */
import { IPoint } from '@sky-canvas/render-engine';
import { IInteractionTool, InteractionMode, IMouseEvent } from './types';
import { RectangleShape } from '../scene/RectangleShape';

/**
 * 矩形工具类
 */
export class RectangleTool implements IInteractionTool {
  name = 'rectangle';
  mode = InteractionMode.DRAW;
  cursor = 'crosshair';
  enabled = true;

  private isDrawing = false;
  private startPoint: IPoint | null = null;
  private currentShape: RectangleShape | null = null;
  private shapeId: string | null = null;
  
  // 回调函数
  private onSetCursor: ((cursor: string) => void) | null = null;
  private onAddShape: ((shape: RectangleShape) => void) | null = null;

  /**
   * 设置回调函数
   */
  setCallbacks(callbacks: {
    onSetCursor?: (cursor: string) => void;
    onAddShape?: (shape: RectangleShape) => void;
  }): void {
    if (callbacks.onSetCursor) this.onSetCursor = callbacks.onSetCursor;
    if (callbacks.onAddShape) this.onAddShape = callbacks.onAddShape;
  }

  onActivate(): void {
    // 工具激活时的逻辑
    if (this.onSetCursor) {
      this.onSetCursor(this.cursor);
    }
  }

  onDeactivate(): void {
    // 工具停用时的逻辑
    this.isDrawing = false;
    this.startPoint = null;
    this.currentShape = null;
    this.shapeId = null;
  }

  onMouseDown(event: IMouseEvent): boolean {
    if (event.button !== 0) return false; // 只处理左键

    this.isDrawing = true;
    this.startPoint = event.worldPosition;
    
    // 创建新形状
    this.shapeId = `rectangle_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    this.currentShape = new RectangleShape(
      this.shapeId,
      this.startPoint,
      { width: 0, height: 0 }
    );

    return true;
  }

  onMouseMove(event: IMouseEvent): boolean {
    if (!this.isDrawing || !this.startPoint || !this.currentShape) return false;

    // 计算矩形尺寸
    const endPoint = event.worldPosition;
    const width = Math.abs(endPoint.x - this.startPoint.x);
    const height = Math.abs(endPoint.y - this.startPoint.y);
    const position = {
      x: Math.min(this.startPoint.x, endPoint.x),
      y: Math.min(this.startPoint.y, endPoint.y)
    };

    // 更新形状
    this.currentShape.position = position;
    this.currentShape.size = { width, height };

    return true;
  }

  onMouseUp(event: IMouseEvent): boolean {
    if (!this.isDrawing || !this.currentShape) return false;

    this.isDrawing = false;
    
    // 如果矩形太小，则不创建
    if (this.currentShape.size.width < 5 && this.currentShape.size.height < 5) {
      this.currentShape = null;
      this.shapeId = null;
      return false;
    }

    // 完成创建
    const shape = this.currentShape;
    this.currentShape = null;
    this.shapeId = null;
    
    // 触发形状创建事件
    this.emitShapeCreated(shape);

    return true;
  }

  onGesture(event: any): boolean {
    // 不处理手势事件
    return false;
  }

  onKeyDown(key: string): boolean {
    // 不处理键盘事件
    return false;
  }

  onKeyUp(key: string): boolean {
    // 不处理键盘事件
    return false;
  }

  isCurrentlyDrawing(): boolean {
    return this.isDrawing;
  }

  getCurrentShape(): RectangleShape | null {
    return this.currentShape;
  }

  /**
   * 触发形状创建事件
   */
  private emitShapeCreated(shape: RectangleShape): void {
    // 通过回调函数添加形状
    if (this.onAddShape) {
      this.onAddShape(shape);
    } else {
      console.log('Rectangle created:', shape);
    }
  }
}