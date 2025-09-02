/**
 * 线条工具实现
 */
import { IPoint } from '@sky-canvas/render-engine';
import { IInteractionTool, InteractionMode, IMouseEvent } from '../interaction/types';
import { LineShape } from '../scene/LineShape';

/**
 * 线条工具类
 */
export class LineTool implements IInteractionTool {
  name = 'line';
  mode = InteractionMode.DRAW;
  cursor = 'crosshair';
  enabled = true;

  private isDrawing = false;
  private startPoint: IPoint | null = null;
  private currentShape: LineShape | null = null;
  private shapeId: string | null = null;
  
  // 回调函数
  private onSetCursor: ((cursor: string) => void) | null = null;
  private onAddShape: ((shape: LineShape) => void) | null = null;

  /**
   * 设置回调函数
   */
  setCallbacks(callbacks: {
    onSetCursor?: (cursor: string) => void;
    onAddShape?: (shape: LineShape) => void;
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
    this.shapeId = `line_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    this.currentShape = new LineShape(
      this.shapeId,
      this.startPoint,
      this.startPoint // 初始时终点和起点相同
    );

    return true;
  }

  onMouseMove(event: IMouseEvent): boolean {
    if (!this.isDrawing || !this.startPoint || !this.currentShape) return false;

    // 更新线条终点
    const endPoint = event.worldPosition;
    this.currentShape.endPoint = endPoint;

    // 更新位置和尺寸
    const minX = Math.min(this.startPoint.x, endPoint.x);
    const minY = Math.min(this.startPoint.y, endPoint.y);
    const maxX = Math.max(this.startPoint.x, endPoint.x);
    const maxY = Math.max(this.startPoint.y, endPoint.y);
    
    this.currentShape.position = { x: minX, y: minY };
    this.currentShape.size = { 
      width: maxX - minX, 
      height: maxY - minY 
    };

    return true;
  }

  onMouseUp(event: IMouseEvent): boolean {
    if (!this.isDrawing || !this.currentShape) return false;

    this.isDrawing = false;
    
    // 如果线条太短，则不创建
    if (!this.currentShape || !this.startPoint) {
      return false;
    }
    
    const endPoint = this.currentShape.endPoint;
    const dx = endPoint.x - this.startPoint.x;
    const dy = endPoint.y - this.startPoint.y;
    const length = Math.sqrt(dx * dx + dy * dy);
    
    if (length < 5) {
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

  getCurrentShape(): LineShape | null {
    return this.currentShape;
  }

  /**
   * 触发形状创建事件
   */
  private emitShapeCreated(shape: LineShape): void {
    // 通过回调函数添加形状
    if (this.onAddShape) {
      this.onAddShape(shape);
    } else {
      console.log('Line created:', shape);
    }
  }
}