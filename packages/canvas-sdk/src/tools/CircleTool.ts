/**
 * 圆形工具实现
 */
import { IPoint } from '@sky-canvas/render-engine';
import { IInteractionTool, InteractionMode, IMouseEvent } from './types';
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
  private isShiftPressed = false; // 新增：Shift键状态
  
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
    this.isShiftPressed = false;
  }

  onMouseDown(event: IMouseEvent): boolean {
    if (event.button !== 0) return false; // 只处理左键

    this.isDrawing = true;
    this.startPoint = event.worldPosition;
    this.isShiftPressed = event.shiftKey; // 记录Shift键状态
    
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

    const endPoint = event.worldPosition;
    this.isShiftPressed = event.shiftKey; // 更新Shift键状态

    // 根据Shift键状态决定是否约束为正圆
    let radius: number;
    if (this.isShiftPressed) {
      // 约束为正圆：取x、y方向距离的最大值
      const dx = Math.abs(endPoint.x - this.startPoint.x);
      const dy = Math.abs(endPoint.y - this.startPoint.y);
      radius = Math.max(dx, dy);
    } else {
      // 自由绘制：计算到起始点的距离
      const dx = endPoint.x - this.startPoint.x;
      const dy = endPoint.y - this.startPoint.y;
      radius = Math.sqrt(dx * dx + dy * dy);
    }

    // 更新圆形
    this.currentShape.radius = radius;
    
    // 更新边界框（圆心位置由startPoint确定）
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
    // 记录Shift键按下
    if (key === 'Shift') {
      this.isShiftPressed = true;
      return true;
    }
    return false;
  }

  onKeyUp(key: string): boolean {
    // 记录Shift键释放
    if (key === 'Shift') {
      this.isShiftPressed = false;
      return true;
    }
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