import { IPoint } from '@sky-canvas/render-engine';
import { IInteractionTool, InteractionMode, IMouseEvent } from '../interaction/types';
import { TransformController } from '../interaction/TransformController';
import { CanvasSDK } from '../core/CanvasSDK';
import { IShape } from '../scene/IShape';

export class SelectTool implements IInteractionTool {
  name = 'select';
  mode = InteractionMode.SELECT;
  cursor = 'default';
  enabled = true;
  
  private isSelecting = false;
  private isTransforming = false;
  private startPoint: IPoint | null = null;
  private selectionRect: { x: number; y: number; width: number; height: number } | null = null;
  private transformController: TransformController;
  private canvasSDK: CanvasSDK | null = null;
  
  constructor(canvasSDK?: CanvasSDK) {
    this.transformController = new TransformController();
    if (canvasSDK) {
      this.canvasSDK = canvasSDK;
    }
  }
  
  /**
   * 设置CanvasSDK实例
   */
  setCanvasSDK(canvasSDK: CanvasSDK): void {
    this.canvasSDK = canvasSDK;
  }
  
  onActivate(): void {
    // 工具激活时的逻辑
    // 设置光标 - 通过交互管理器设置
    if (this.canvasSDK) {
      const interactionManager = this.canvasSDK.getInteractionManager();
      if (interactionManager) {
        interactionManager.setCursor(this.cursor);
      }
    }
  }
  
  onDeactivate(): void {
    // 工具停用时的逻辑
    this.isSelecting = false;
    this.isTransforming = false;
    this.startPoint = null;
    this.selectionRect = null;
  }
  
  onMouseDown(event: IMouseEvent): boolean {
    if (event.button !== 0) return false; // 只处理左键
    
    const point = event.worldPosition;
    
    // 检查是否点击了控制点
    const handle = this.transformController.getHandleAtPoint(point);
    if (handle) {
      // 开始变形操作
      this.isTransforming = true;
      this.transformController.startTransform(handle);
      return true;
    }
    
    // 检查是否点击了已选择的形状
    if (this.canvasSDK) {
      const selectedShapes = this.canvasSDK.getSelectedShapes();
      const clickedShape = this.canvasSDK.hitTest(point);
      
      if (clickedShape && selectedShapes.includes(clickedShape)) {
        // 点击了已选择的形状，准备移动
        this.startPoint = point;
        return true;
      }
      
      // 点击了未选择的形状或空白区域
      if (clickedShape) {
        // 选择新的形状
        if (!event.ctrlKey && !event.shiftKey) {
          this.canvasSDK.clearSelection();
        }
        this.canvasSDK.selectShape(clickedShape.id);
        this.transformController.setTargetShapes([clickedShape]);
        this.startPoint = point;
      } else {
        // 开始框选
        this.isSelecting = true;
        this.startPoint = point;
        if (!event.shiftKey) {
          this.canvasSDK?.clearSelection();
        }
      }
    }
    
    return true;
  }
  
  onMouseMove(event: IMouseEvent): boolean {
    const point = event.worldPosition;
    
    if (this.isTransforming && this.startPoint) {
      // 变形操作
      const delta = {
        x: point.x - this.startPoint.x,
        y: point.y - this.startPoint.y
      };
      this.transformController.performTransform(delta);
      this.startPoint = point;
      return true;
    }
    
    if (this.isSelecting && this.startPoint) {
      // 框选操作
      this.selectionRect = {
        x: Math.min(this.startPoint.x, point.x),
        y: Math.min(this.startPoint.y, point.y),
        width: Math.abs(point.x - this.startPoint.x),
        height: Math.abs(point.y - this.startPoint.y)
      };
      return true;
    }
    
    return false;
  }
  
  onMouseUp(event: IMouseEvent): boolean {
    if (this.isTransforming) {
      // 结束变形操作
      this.transformController.endTransform();
      this.isTransforming = false;
      this.startPoint = null;
      return true;
    }
    
    if (this.isSelecting && this.selectionRect && this.canvasSDK) {
      // 结束框选操作
      const selectedShapes = this.canvasSDK.hitTestBounds(this.selectionRect);
      if (selectedShapes.length > 0) {
        if (event.shiftKey) {
          // 添加到选择 - 使用现有的选择方法
          selectedShapes.forEach(shape => {
            if (!this.canvasSDK!.isSelected(shape.id)) {
              this.canvasSDK!.selectShape(shape.id);
            }
          });
        } else {
          // 新的选择 - 先清空选择，然后选择所有
          this.canvasSDK!.clearSelection();
          selectedShapes.forEach(shape => {
            this.canvasSDK!.selectShape(shape.id);
          });
        }
        this.transformController.setTargetShapes(selectedShapes);
      }
      this.isSelecting = false;
      this.startPoint = null;
      this.selectionRect = null;
      return true;
    }
    
    return false;
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
  
  /**
   * 获取选择矩形（用于渲染）
   */
  getSelectionRect(): { x: number; y: number; width: number; height: number } | null {
    return this.selectionRect;
  }
  
  /**
   * 渲染选择框
   */
  renderSelectionBox(context: CanvasRenderingContext2D): void {
    if (this.selectionRect) {
      context.save();
      context.strokeStyle = '#007acc';
      context.lineWidth = 1;
      context.setLineDash([5, 5]);
      context.strokeRect(
        this.selectionRect.x,
        this.selectionRect.y,
        this.selectionRect.width,
        this.selectionRect.height
      );
      context.setLineDash([]);
      context.restore();
    }
    
    // 渲染变形控制器
    this.transformController.render(context);
  }
}