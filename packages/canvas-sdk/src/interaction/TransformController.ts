import { IShape } from '../scene/IShape';
import { IPoint, IRect } from '@sky-canvas/render-engine';
import { TransformHandle, HandleType } from './TransformHandle';

export class TransformController {
  private targetShapes: IShape[] = [];
  private handles: TransformHandle[] = [];
  private handleSize: number = 8;
  private isTransforming: boolean = false;
  private activeHandle: TransformHandle | null = null;
  private initialBounds: IRect | null = null;
  
  /**
   * 设置目标形状
   */
  setTargetShapes(shapes: IShape[]): void {
    this.targetShapes = shapes;
    this.updateHandles();
  }
  
  /**
   * 更新控制点位置
   */
  updateHandles(): void {
    if (this.targetShapes.length === 0) {
      this.handles = [];
      return;
    }
    
    const bounds = this.getSelectionBounds();
    if (!bounds) {
      this.handles = [];
      return;
    }
    
    this.handles = [];
    
    // 8个控制点
    const handleTypes: HandleType[] = [
      'top-left', 'top-center', 'top-right',
      'middle-left', 'middle-right',
      'bottom-left', 'bottom-center', 'bottom-right'
    ];
    
    handleTypes.forEach(type => {
      const position = this.getHandlePosition(bounds, type);
      this.handles.push(new TransformHandle(type, position, this.handleSize));
    });
    
    // 旋转控制点
    const rotatePosition = {
      x: bounds.x + bounds.width / 2,
      y: bounds.y - 20
    };
    this.handles.push(new TransformHandle('rotate', rotatePosition, this.handleSize));
  }
  
  /**
   * 获取控制点位置
   */
  private getHandlePosition(bounds: IRect, type: HandleType): IPoint {
    switch (type) {
      case 'top-left':
        return { x: bounds.x, y: bounds.y };
      case 'top-center':
        return { x: bounds.x + bounds.width / 2, y: bounds.y };
      case 'top-right':
        return { x: bounds.x + bounds.width, y: bounds.y };
      case 'middle-left':
        return { x: bounds.x, y: bounds.y + bounds.height / 2 };
      case 'middle-right':
        return { x: bounds.x + bounds.width, y: bounds.y + bounds.height / 2 };
      case 'bottom-left':
        return { x: bounds.x, y: bounds.y + bounds.height };
      case 'bottom-center':
        return { x: bounds.x + bounds.width / 2, y: bounds.y + bounds.height };
      case 'bottom-right':
        return { x: bounds.x + bounds.width, y: bounds.y + bounds.height };
      default:
        return { x: bounds.x, y: bounds.y };
    }
  }
  
  /**
   * 获取选择边界
   */
  private getSelectionBounds(): IRect | null {
    if (this.targetShapes.length === 0) return null;
    
    let minX = Infinity, minY = Infinity;
    let maxX = -Infinity, maxY = -Infinity;
    
    this.targetShapes.forEach(shape => {
      const bounds = shape.getBounds();
      minX = Math.min(minX, bounds.x);
      minY = Math.min(minY, bounds.y);
      maxX = Math.max(maxX, bounds.x + bounds.width);
      maxY = Math.max(maxY, bounds.y + bounds.height);
    });
    
    return {
      x: minX,
      y: minY,
      width: maxX - minX,
      height: maxY - minY
    };
  }
  
  /**
   * 开始变形操作
   */
  startTransform(handle: TransformHandle): void {
    this.isTransforming = true;
    this.activeHandle = handle;
    this.initialBounds = this.getSelectionBounds();
  }
  
  /**
   * 执行变形操作
   */
  performTransform(delta: IPoint): void {
    if (!this.isTransforming || !this.activeHandle || !this.initialBounds) return;
    
    const bounds = this.initialBounds;
    const type = this.activeHandle.type;
    
    // 根据控制点类型执行不同变形
    switch (type) {
      case 'top-left':
        this.resizeTopLeft(bounds, delta);
        break;
      case 'top-center':
        this.resizeTop(bounds, delta);
        break;
      case 'top-right':
        this.resizeTopRight(bounds, delta);
        break;
      case 'middle-left':
        this.resizeLeft(bounds, delta);
        break;
      case 'middle-right':
        this.resizeRight(bounds, delta);
        break;
      case 'bottom-left':
        this.resizeBottomLeft(bounds, delta);
        break;
      case 'bottom-center':
        this.resizeBottom(bounds, delta);
        break;
      case 'bottom-right':
        this.resizeBottomRight(bounds, delta);
        break;
      case 'rotate':
        this.rotateShapes(delta);
        break;
    }
    
    // 更新控制点位置
    this.updateHandles();
  }
  
  /**
   * 结束变形操作
   */
  endTransform(): void {
    this.isTransforming = false;
    this.activeHandle = null;
    this.initialBounds = null;
  }
  
  /**
   * 各种变形操作实现
   */
  private resizeTopLeft(bounds: IRect, delta: IPoint): void {
    const newWidth = Math.max(1, bounds.width - delta.x);
    const newHeight = Math.max(1, bounds.height - delta.y);
    const scaleX = newWidth / bounds.width;
    const scaleY = newHeight / bounds.height;
    
    this.targetShapes.forEach(shape => {
      const shapeBounds = shape.getBounds();
      const newBounds = {
        x: bounds.x + delta.x + (shapeBounds.x - bounds.x) * scaleX,
        y: bounds.y + delta.y + (shapeBounds.y - bounds.y) * scaleY,
        width: shapeBounds.width * scaleX,
        height: shapeBounds.height * scaleY
      };
      this.updateShapeBounds(shape, newBounds);
    });
  }
  
  private resizeTop(bounds: IRect, delta: IPoint): void {
    const newHeight = Math.max(1, bounds.height - delta.y);
    const scaleY = newHeight / bounds.height;
    
    this.targetShapes.forEach(shape => {
      const shapeBounds = shape.getBounds();
      const newBounds = {
        x: shapeBounds.x,
        y: bounds.y + delta.y + (shapeBounds.y - bounds.y) * scaleY,
        width: shapeBounds.width,
        height: shapeBounds.height * scaleY
      };
      this.updateShapeBounds(shape, newBounds);
    });
  }
  
  private resizeTopRight(bounds: IRect, delta: IPoint): void {
    const newWidth = Math.max(1, bounds.width + delta.x);
    const newHeight = Math.max(1, bounds.height - delta.y);
    const scaleX = newWidth / bounds.width;
    const scaleY = newHeight / bounds.height;
    
    this.targetShapes.forEach(shape => {
      const shapeBounds = shape.getBounds();
      const newBounds = {
        x: shapeBounds.x + (shapeBounds.x - bounds.x) * (scaleX - 1),
        y: bounds.y + delta.y + (shapeBounds.y - bounds.y) * scaleY,
        width: shapeBounds.width * scaleX,
        height: shapeBounds.height * scaleY
      };
      this.updateShapeBounds(shape, newBounds);
    });
  }
  
  private resizeLeft(bounds: IRect, delta: IPoint): void {
    const newWidth = Math.max(1, bounds.width - delta.x);
    const scaleX = newWidth / bounds.width;
    
    this.targetShapes.forEach(shape => {
      const shapeBounds = shape.getBounds();
      const newBounds = {
        x: bounds.x + delta.x + (shapeBounds.x - bounds.x) * scaleX,
        y: shapeBounds.y,
        width: shapeBounds.width * scaleX,
        height: shapeBounds.height
      };
      this.updateShapeBounds(shape, newBounds);
    });
  }
  
  private resizeRight(bounds: IRect, delta: IPoint): void {
    const newWidth = Math.max(1, bounds.width + delta.x);
    const scaleX = newWidth / bounds.width;
    
    this.targetShapes.forEach(shape => {
      const shapeBounds = shape.getBounds();
      const newBounds = {
        x: shapeBounds.x,
        y: shapeBounds.y,
        width: shapeBounds.width * scaleX,
        height: shapeBounds.height
      };
      this.updateShapeBounds(shape, newBounds);
    });
  }
  
  private resizeBottomLeft(bounds: IRect, delta: IPoint): void {
    const newWidth = Math.max(1, bounds.width - delta.x);
    const newHeight = Math.max(1, bounds.height + delta.y);
    const scaleX = newWidth / bounds.width;
    const scaleY = newHeight / bounds.height;
    
    this.targetShapes.forEach(shape => {
      const shapeBounds = shape.getBounds();
      const newBounds = {
        x: bounds.x + delta.x + (shapeBounds.x - bounds.x) * scaleX,
        y: shapeBounds.y,
        width: shapeBounds.width * scaleX,
        height: shapeBounds.height * scaleY
      };
      this.updateShapeBounds(shape, newBounds);
    });
  }
  
  private resizeBottom(bounds: IRect, delta: IPoint): void {
    const newHeight = Math.max(1, bounds.height + delta.y);
    const scaleY = newHeight / bounds.height;
    
    this.targetShapes.forEach(shape => {
      const shapeBounds = shape.getBounds();
      const newBounds = {
        x: shapeBounds.x,
        y: shapeBounds.y,
        width: shapeBounds.width,
        height: shapeBounds.height * scaleY
      };
      this.updateShapeBounds(shape, newBounds);
    });
  }
  
  private resizeBottomRight(bounds: IRect, delta: IPoint): void {
    const newWidth = Math.max(1, bounds.width + delta.x);
    const newHeight = Math.max(1, bounds.height + delta.y);
    const scaleX = newWidth / bounds.width;
    const scaleY = newHeight / bounds.height;
    
    this.targetShapes.forEach(shape => {
      const shapeBounds = shape.getBounds();
      const newBounds = {
        x: shapeBounds.x,
        y: shapeBounds.y,
        width: shapeBounds.width * scaleX,
        height: shapeBounds.height * scaleY
      };
      this.updateShapeBounds(shape, newBounds);
    });
  }
  
  private rotateShapes(delta: IPoint): void {
    // 简化的旋转实现 - 目前只记录旋转角度，实际旋转需要形状支持
    // 旋转功能将在后续阶段实现
    console.log('Rotate operation:', delta);
  }
  
  /**
   * 更新形状边界
   */
  private updateShapeBounds(shape: IShape, newBounds: IRect): void {
    // 直接更新位置和尺寸属性
    shape.position = { x: newBounds.x, y: newBounds.y };
    shape.size = { width: newBounds.width, height: newBounds.height };
  }
  
  /**
   * 检查点是否在控制点上
   */
  getHandleAtPoint(point: IPoint): TransformHandle | null {
    for (const handle of this.handles) {
      if (handle.contains(point)) {
        return handle;
      }
    }
    return null;
  }
  
  /**
   * 渲染控制点
   */
  render(context: CanvasRenderingContext2D): void {
    if (this.handles.length === 0) return;
    
    // 渲染选择边界框
    const bounds = this.getSelectionBounds();
    if (bounds) {
      context.save();
      context.strokeStyle = '#007acc';
      context.lineWidth = 1;
      context.setLineDash([5, 5]);
      context.strokeRect(bounds.x, bounds.y, bounds.width, bounds.height);
      context.setLineDash([]);
      context.restore();
    }
    
    // 渲染控制点
    this.handles.forEach(handle => {
      handle.render(context);
    });
  }
}