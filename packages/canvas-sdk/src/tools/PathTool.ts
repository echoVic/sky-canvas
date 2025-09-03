import { IPoint } from '@sky-canvas/render-engine';
import { IInteractionTool, InteractionMode, IMouseEvent } from '../interaction/types';
import { AdvancedPathShape } from '../scene/AdvancedPathShape';

/**
 * 路径工具类
 */
export class PathTool implements IInteractionTool {
  name = 'path';
  mode = InteractionMode.DRAW;
  cursor = 'crosshair';
  enabled = true;
  
  private isDrawing = false;
  private currentPath: AdvancedPathShape | null = null;
  private shapeId: string | null = null;
  private isEditing = false;
  
  // 回调函数
  private onSetCursor: ((cursor: string) => void) | null = null;
  private onAddShape: ((shape: AdvancedPathShape) => void) | null = null;
  
  /**
   * 设置回调函数
   */
  setCallbacks(callbacks: {
    onSetCursor?: (cursor: string) => void;
    onAddShape?: (shape: AdvancedPathShape) => void;
  }): void {
    if (callbacks.onSetCursor) this.onSetCursor = callbacks.onSetCursor;
    if (callbacks.onAddShape) this.onAddShape = callbacks.onAddShape;
  }
  
  onActivate(): void {
    if (this.onSetCursor) {
      this.onSetCursor(this.cursor);
    }
  }
  
  onDeactivate(): void {
    this.isDrawing = false;
    this.currentPath = null;
    this.shapeId = null;
    this.isEditing = false;
  }
  
  onMouseDown(event: IMouseEvent): boolean {
    if (event.button !== 0) return false; // 只处理左键
    
    if (this.isEditing && this.currentPath) {
      // 编辑模式下添加控制点
      this.currentPath.addPoint(event.worldPosition);
      return true;
    }
    
    if (!this.isDrawing) {
      // 开始绘制新路径
      this.isDrawing = true;
      this.shapeId = `path_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      this.currentPath = new AdvancedPathShape(this.shapeId);
      this.currentPath.startEditing();
      
      // 添加第一个点
      this.currentPath.addPoint(event.worldPosition);
      
      return true;
    }
    
    return false;
  }
  
  onMouseMove(event: IMouseEvent): boolean {
    if (!this.isDrawing || !this.currentPath) return false;
    
    // 实时预览（可以添加更多交互）
    return true;
  }
  
  onMouseUp(event: IMouseEvent): boolean {
    if (!this.isDrawing) return false;
    
    // 路径工具在鼠标按下时添加点，鼠标抬起时不执行特殊操作
    return true;
  }
  
  onGesture(event: any): boolean {
    return false;
  }
  
  onKeyDown(key: string): boolean {
    if (!this.currentPath) return false;
    
    switch (key) {
      case 'Enter':
        // 完成路径绘制
        return this.finishPath();
      case 'Escape':
        // 取消路径绘制
        return this.cancelPath();
      case 'Backspace':
        // 删除最后一个点
        return this.removeLastPoint();
      default:
        return false;
    }
  }
  
  onKeyUp(key: string): boolean {
    return false;
  }
  
  /**
   * 完成路径绘制
   */
  private finishPath(): boolean {
    if (!this.isDrawing || !this.currentPath) return false;
    
    this.isDrawing = false;
    
    if (this.currentPath.getControlPoints().length > 1) {
      // 结束编辑模式
      this.currentPath.endEditing();
      
      // 触发形状创建事件
      this.emitShapeCreated(this.currentPath);
    } else {
      // 点数不足，取消创建
      this.currentPath = null;
      this.shapeId = null;
    }
    
    return true;
  }
  
  /**
   * 取消路径绘制
   */
  private cancelPath(): boolean {
    this.isDrawing = false;
    this.currentPath = null;
    this.shapeId = null;
    return true;
  }
  
  /**
   * 删除最后一个点
   */
  private removeLastPoint(): boolean {
    if (!this.currentPath) return false;
    
    const points = this.currentPath.getControlPoints();
    if (points.length > 0) {
      const lastPoint = points[points.length - 1];
      this.currentPath.removePoint(lastPoint.id);
      return true;
    }
    
    return false;
  }
  
  isCurrentlyDrawing(): boolean {
    return this.isDrawing;
  }
  
  getCurrentShape(): AdvancedPathShape | null {
    return this.currentPath;
  }
  
  /**
   * 设置编辑模式
   */
  setEditingMode(editing: boolean): void {
    this.isEditing = editing;
    this.cursor = editing ? 'default' : 'crosshair';
    
    if (this.onSetCursor) {
      this.onSetCursor(this.cursor);
    }
  }
  
  /**
   * 获取编辑模式
   */
  isEditingMode(): boolean {
    return this.isEditing;
  }
  
  /**
   * 触发形状创建事件
   */
  private emitShapeCreated(shape: AdvancedPathShape): void {
    if (this.onAddShape) {
      this.onAddShape(shape);
    } else {
      console.log('Path created:', shape);
    }
  }
}