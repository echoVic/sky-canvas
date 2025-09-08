import { IPoint } from '@sky-canvas/render-engine';
import { CanvasSDK } from '../CanvasSDK';
import { SnapManager } from '../interaction/SnapManager';
import { TransformController } from '../interaction/TransformController';
import { IInteractionTool, IMouseEvent, InteractionMode } from '../interaction/types';
import { IShape } from '../scene/IShape';

export class SelectTool implements IInteractionTool {
  name = 'select';
  mode = InteractionMode.SELECT;
  cursor = 'default';
  enabled = true;
  
  private isSelecting = false;
  private isTransforming = false;
  private startPoint: IPoint | null = null;
  private currentPoint: IPoint | null = null; // 当前鼠标位置，用于捕捉
  private selectionRect: { x: number; y: number; width: number; height: number } | null = null;
  private transformController: TransformController;
  private snapManager: SnapManager;
  private canvasSDK: CanvasSDK | null = null;
  
  constructor(canvasSDK?: CanvasSDK) {
    this.transformController = new TransformController();
    this.snapManager = new SnapManager();
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
    // 新CanvasSDK中光标设置通过其他方式处理
    console.log('Select tool activated');
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
      // 使用新API进行点击测试
      let clickedShape: IShape | null = null;
      const shapes = this.canvasSDK.getShapes();
      for (const shape of shapes) {
        if (shape.hitTest && shape.hitTest(point)) {
          clickedShape = shape;
          break;
        }
      }
      
      if (clickedShape && selectedShapes.includes(clickedShape)) {
        // 点击了已选择的形状，准备移动
        this.startPoint = point;
        return true;
      }
      
      // 点击了未选择的形状或空白区域 - 使用新API
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
    this.currentPoint = point; // 保存当前点用于捕捉
    
    // 应用智能捕捉
    let snappedPoint = point;
    if (this.snapManager.isSnapEnabled() && this.canvasSDK) {
      const allShapes = this.canvasSDK.getShapes();
      const snapResult = this.snapManager.getSnapPosition(point, allShapes);
      if (snapResult.type !== 'none') {
        snappedPoint = snapResult.position;
      }
    }
    
    if (this.isTransforming && this.startPoint) {
      // 变形操作
      const delta = {
        x: snappedPoint.x - this.startPoint.x,
        y: snappedPoint.y - this.startPoint.y
      };
      this.transformController.performTransform(delta);
      this.startPoint = snappedPoint;
      return true;
    }
    
    if (this.isSelecting && this.startPoint) {
      // 框选操作
      this.selectionRect = {
        x: Math.min(this.startPoint.x, snappedPoint.x),
        y: Math.min(this.startPoint.y, snappedPoint.y),
        width: Math.abs(snappedPoint.x - this.startPoint.x),
        height: Math.abs(snappedPoint.y - this.startPoint.y)
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
      // 结束框选操作 - 使用新API
      const shapes = this.canvasSDK.getShapes();
      const selectedShapes: any[] = [];
      
      shapes.forEach((shape: any) => {
        const bounds = shape.getBounds ? shape.getBounds() : null;
        if (bounds && this.boundsIntersect(this.selectionRect!, bounds)) {
          selectedShapes.push(shape);
        }
      });
      
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
    // 处理快捷键
    switch (key) {
      case 'G':
      case 'g':
        // 切换网格捕捉
        this.snapManager.enableGridSnap(!this.snapManager.getEnabledSnapTypes().includes('grid'));
        return true;
      case '[':
        // 减小网格大小
        this.snapManager.setGridSize(Math.max(5, this.snapManager.getGridSize() - 5));
        return true;
      case ']':
        // 增大网格大小
        this.snapManager.setGridSize(this.snapManager.getGridSize() + 5);
        return true;
      default:
        return false;
    }
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

  // 测试用的getter和setter方法
  get isTransformingState(): boolean {
    return this.isTransforming;
  }

  set isTransformingState(value: boolean) {
    this.isTransforming = value;
  }

  get startPointState(): IPoint | null {
    return this.startPoint;
  }

  set startPointState(value: IPoint | null) {
    this.startPoint = value;
  }

  get isSelectingState(): boolean {
    return this.isSelecting;
  }

  set isSelectingState(value: boolean) {
    this.isSelecting = value;
  }

  get selectionRectState(): { x: number; y: number; width: number; height: number } | null {
    return this.selectionRect;
  }

  set selectionRectState(value: { x: number; y: number; width: number; height: number } | null) {
    this.selectionRect = value;
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
      context.restore();
    }
  }

  private boundsIntersect(bounds1: { x: number; y: number; width: number; height: number }, bounds2: { x: number; y: number; width: number; height: number }): boolean {
    return !(
      bounds1.x + bounds1.width < bounds2.x ||
      bounds2.x + bounds2.width < bounds1.x ||
      bounds1.y + bounds1.height < bounds2.y ||
      bounds2.y + bounds2.height < bounds1.y
    );
  }
}