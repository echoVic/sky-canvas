/**
 * 圆形工具实现
 */
import { IPoint } from '@sky-canvas/render-engine';
import { IInteractionTool, InteractionMode, IMouseEvent } from '../interaction/types';
import { CircleShape } from '../scene/CircleShape';

/**
 * 圆形工具类
 */
export class CircleTool implements IInteractionTool {
  name = 'circle';
  mode = InteractionMode.DRAW;
  cursor = 'crosshair';
  enabled = true;

  private isDrawing = false;
  private startPoint: IPoint | null = null;
  private currentShape: CircleShape | null = null;
  private shapeId: string | null = null;
  
  // 回调函数
  private onSetCursor: ((cursor: string) => void) | null = null;
  private onAddShape: ((shape: CircleShape) => void) | null = null;

  /**
   * 设置回调函数
   */
  setCallbacks(callbacks: {
    onSetCursor?: (cursor: string) => void;
    onAddShape?: (shape: CircleShape) => void;
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
    this.shapeId = `circle_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    this.currentShape = new CircleShape(
      this.shapeId,
      this.startPoint,
      0 // 初始半径为0
    );

    return true;
  }

  onMouseMove(event: IMouseEvent): boolean {
    if (!this.isDrawing || !this.startPoint || !this.currentShape) return false;

    // 计算圆形半径
    const endPoint = event.worldPosition;
    const dx = endPoint.x - this.startPoint.x;
    const dy = endPoint.y - this.startPoint.y;
    const radius = Math.sqrt(dx * dx + dy * dy);

    // 更新形状
    this.currentShape.radius = radius;
    this.currentShape.position = {
      x: this.startPoint.x - radius,
      y: this.startPoint.y - radius
    };
    this.currentShape.size = {
      width: radius * 2,
      height: radius * 2
    };

    return true;
  }

  onMouseUp(event: IMouseEvent): boolean {
    if (!this.isDrawing || !this.currentShape) return false;

    this.isDrawing = false;
    
    // 如果圆形太小，则不创建
    if (this.currentShape.radius < 5) {
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

  getCurrentShape(): CircleShape | null {
    return this.currentShape;
  }

  /**
   * 触发形状创建事件
   */
  private emitShapeCreated(shape: CircleShape): void {
    // 通过回调函数添加形状
    if (this.onAddShape) {
      this.onAddShape(shape);
    } else {
      console.log('Circle created:', shape);
    }
  }
}