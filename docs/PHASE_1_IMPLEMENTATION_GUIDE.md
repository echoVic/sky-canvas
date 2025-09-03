# 第一阶段实施指南：基础交互增强

## 1. 多选系统重构

### 1.1 创建多选管理器

**文件**: `packages/canvas-sdk/src/interaction/MultiSelectManager.ts`

```typescript
import { IShape } from '../scene/IShape';
import { Rect } from '@sky-canvas/render-engine';

/**
 * 多选管理器
 */
export class MultiSelectManager {
  private selectedShapes: Set<IShape> = new Set();
  private selectionBounds: Rect | null = null;
  
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
  getSelectionBounds(): Rect | null {
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
```

### 1.2 集成到CanvasSDK

**文件**: `packages/canvas-sdk/src/core/CanvasSDK.ts`

在CanvasSDK类中添加：

```typescript
// 添加属性
private multiSelectManager: MultiSelectManager = new MultiSelectManager();

// 添加方法
/**
 * 多选形状
 * @param shapes 形状数组
 */
multiSelect(shapes: IShape[]): void {
  this.multiSelectManager.selectMultiple(shapes);
  // 触发选择事件
  shapes.forEach(shape => {
    this.emit('shapeSelected', { shape, selected: true });
  });
}

/**
 * 添加到选择
 * @param shapes 形状或形状数组
 */
addToSelection(shapes: IShape | IShape[]): void {
  this.multiSelectManager.addToSelection(shapes);
  const shapeArray = Array.isArray(shapes) ? shapes : [shapes];
  shapeArray.forEach(shape => {
    this.emit('shapeSelected', { shape, selected: true });
  });
}

/**
 * 从选择中移除
 * @param shapes 形状或形状数组
 */
removeFromSelection(shapes: IShape | IShape[]): void {
  this.multiSelectManager.removeFromSelection(shapes);
  const shapeArray = Array.isArray(shapes) ? shapes : [shapes];
  shapeArray.forEach(shape => {
    this.emit('shapeDeselected', { shape, selected: false });
  });
}

/**
 * 获取多选管理器
 */
getMultiSelectManager(): MultiSelectManager {
  return this.multiSelectManager;
}
```

## 2. 变形控制器实现

### 2.1 创建变形控制点

**文件**: `packages/canvas-sdk/src/interaction/TransformHandle.ts`

```typescript
import { IPoint, Rect } from '@sky-canvas/render-engine';

export type HandleType = 
  | 'top-left' | 'top-center' | 'top-right'
  | 'middle-left' | 'middle-right'
  | 'bottom-left' | 'bottom-center' | 'bottom-right'
  | 'rotate';

export interface ITransformHandle {
  type: HandleType;
  position: IPoint;
  size: number;
  bounds: Rect;
}

export class TransformHandle implements ITransformHandle {
  type: HandleType;
  position: IPoint;
  size: number;
  bounds: Rect;
  
  constructor(type: HandleType, position: IPoint, size: number = 8) {
    this.type = type;
    this.position = position;
    this.size = size;
    this.bounds = {
      x: position.x - size / 2,
      y: position.y - size / 2,
      width: size,
      height: size
    };
  }
  
  /**
   * 检查点是否在控制点内
   */
  contains(point: IPoint): boolean {
    return (
      point.x >= this.bounds.x &&
      point.x <= this.bounds.x + this.bounds.width &&
      point.y >= this.bounds.y &&
      point.y <= this.bounds.y + this.bounds.height
    );
  }
  
  /**
   * 渲染控制点
   */
  render(context: CanvasRenderingContext2D): void {
    context.save();
    
    // 绘制控制点背景
    context.fillStyle = '#ffffff';
    context.strokeStyle = '#007acc';
    context.lineWidth = 1;
    
    context.fillRect(this.bounds.x, this.bounds.y, this.bounds.width, this.bounds.height);
    context.strokeRect(this.bounds.x, this.bounds.y, this.bounds.width, this.bounds.height);
    
    // 旋转控制点特殊样式
    if (this.type === 'rotate') {
      context.beginPath();
      context.arc(this.position.x, this.position.y, this.size / 2, 0, Math.PI * 2);
      context.fill();
      context.stroke();
    }
    
    context.restore();
  }
}
```

### 2.2 创建变形控制器

**文件**: `packages/canvas-sdk/src/interaction/TransformController.ts`

```typescript
import { IShape } from '../scene/IShape';
import { IPoint, Rect } from '@sky-canvas/render-engine';
import { TransformHandle, HandleType } from './TransformHandle';

export class TransformController {
  private targetShapes: IShape[] = [];
  private handles: TransformHandle[] = [];
  private handleSize: number = 8;
  private isTransforming: boolean = false;
  private activeHandle: TransformHandle | null = null;
  private initialBounds: Rect | null = null;
  
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
  private getHandlePosition(bounds: Rect, type: HandleType): IPoint {
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
  private getSelectionBounds(): Rect | null {
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
  private resizeTopLeft(bounds: Rect, delta: IPoint): void {
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
  
  private resizeTop(bounds: Rect, delta: IPoint): void {
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
  
  private resizeTopRight(bounds: Rect, delta: IPoint): void {
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
  
  private resizeLeft(bounds: Rect, delta: IPoint): void {
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
  
  private resizeRight(bounds: Rect, delta: IPoint): void {
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
  
  private resizeBottomLeft(bounds: Rect, delta: IPoint): void {
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
  
  private resizeBottom(bounds: Rect, delta: IPoint): void {
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
  
  private resizeBottomRight(bounds: Rect, delta: IPoint): void {
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
    // 简化的旋转实现
    const center = {
      x: this.initialBounds!.x + this.initialBounds!.width / 2,
      y: this.initialBounds!.y + this.initialBounds!.height / 2
    };
    
    // 计算旋转角度
    const angle = Math.atan2(delta.y, delta.x);
    
    this.targetShapes.forEach(shape => {
      if (shape.rotate) {
        shape.rotate(angle);
      }
    });
  }
  
  /**
   * 更新形状边界
   */
  private updateShapeBounds(shape: IShape, newBounds: Rect): void {
    if (shape.setPosition && shape.setSize) {
      shape.setPosition({ x: newBounds.x, y: newBounds.y });
      shape.setSize({ width: newBounds.width, height: newBounds.height });
    }
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
```

## 3. 增强选择工具

### 3.1 创建选择工具

**文件**: `packages/canvas-sdk/src/tools/SelectTool.ts`

```typescript
import { IPoint } from '@sky-canvas/render-engine';
import { IInteractionTool, InteractionMode, IMouseEvent } from '../interaction/types';
import { TransformController } from '../interaction/TransformController';
import { CanvasSDK } from '../core/CanvasSDK';

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
    if (this.canvasSDK) {
      this.canvasSDK.setCursor(this.cursor);
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
          // 添加到选择
          this.canvasSDK.addToSelection(selectedShapes);
        } else {
          // 新的选择
          this.canvasSDK.multiSelect(selectedShapes);
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
```

## 4. 增强圆形工具

### 4.1 修改CircleTool以支持约束绘制

**文件**: `packages/canvas-sdk/src/tools/CircleTool.ts`

```typescript
/**
 * 圆形工具实现 - 增强版
 */
import { IPoint } from '@sky-canvas/render-engine';
import { IInteractionTool, InteractionMode, IMouseEvent } from '../interaction/types';
import { CircleShape } from '../scene/CircleShape';

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
    
    // 更新圆形的位置（圆心位置）
    this.currentShape.center = {
      x: this.startPoint.x,
      y: this.startPoint.y
    };
    
    // 更新边界框
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
```

## 5. 集成到交互管理器

### 5.1 更新交互管理器

**文件**: `packages/canvas-sdk/src/interaction/InteractionManager.ts`

在InteractionManager类中添加：

```typescript
// 导入新增的工具
import { SelectTool } from '../tools/SelectTool';

// 在initialize方法中注册新工具
initialize(canvas: HTMLCanvasElement, scene: Scene, viewport: Viewport): void {
  this._canvas = canvas;
  this._scene = scene;
  this._viewport = viewport;

  // 创建选择工具实例
  const selectTool = new SelectTool();
  this.registerTool(selectTool);
  this.registerTool(new PanTool(this));
  this.registerTool(new ZoomTool(this));
  
  // 注册其他工具...
  
  // 设置默认工具
  this.setActiveTool('select');

  this.setupEventListeners();
  this.updateCollisionNodes();
}

// 在setupEventListeners方法中增加键盘事件处理
private setupEventListeners(): void {
  if (!this._canvas) return;

  // ... 现有事件监听器 ...

  // 键盘事件 - 在window上监听以捕获全局按键
  this._eventListeners.keydown = this.handleKeyDown.bind(this);
  this._eventListeners.keyup = this.handleKeyUp.bind(this);
  window.addEventListener('keydown', this._eventListeners.keydown);
  window.addEventListener('keyup', this._eventListeners.keyup);
}

// 在handleKeyDown中添加Shift键处理
private handleKeyDown(nativeEvent: KeyboardEvent): void {
  if (!this._enabled) return;

  this._inputState.setKeyDown(nativeEvent.key);
  
  // 传递给活动工具
  if (this._activeTool) {
    // 特殊处理Shift键
    if (nativeEvent.key === 'Shift') {
      // 可以在这里添加全局Shift键处理逻辑
    }
    this._activeTool.onKeyDown(nativeEvent.key);
  }
}

// 在handleKeyUp中添加Shift键处理
private handleKeyUp(nativeEvent: KeyboardEvent): void {
  if (!this._enabled) return;

  this._inputState.setKeyUp(nativeEvent.key);
  
  // 传递给活动工具
  if (this._activeTool) {
    this._activeTool.onKeyUp(nativeEvent.key);
  }
}

// 在renderDebug方法中添加选择框渲染
renderDebug(context: RenderContext): void {
  if (!this._enabled) return;

  const { ctx } = context;
  
  // 只在Canvas 2D上下文中渲染调试信息
  if (!(ctx instanceof CanvasRenderingContext2D)) {
    return;
  }
  
  // 渲染选择框（来自选择工具）
  const selectTool = this._tools.get('select') as SelectTool;
  if (selectTool && selectTool.renderSelectionBox) {
    selectTool.renderSelectionBox(ctx);
  }

  // 渲染选中节点的边界框
  const selectedNodes = this.getSelectedNodes();
  for (const node of selectedNodes) {
    const bounds = node.getBounds();
    ctx.save();
    ctx.strokeStyle = '#ff6b6b';
    ctx.lineWidth = 2;
    ctx.strokeRect(bounds.x, bounds.y, bounds.width, bounds.height);
    ctx.restore();
  }
}
```

## 6. 测试验证

### 6.1 创建测试用例

**文件**: `packages/canvas-sdk/src/tools/__tests__/SelectTool.test.ts`

```typescript
import { SelectTool } from '../SelectTool';
import { CanvasSDK } from '../../core/CanvasSDK';
import { CircleShape } from '../../scene/CircleShape';

describe('SelectTool', () => {
  let selectTool: SelectTool;
  let canvasSDK: CanvasSDK;

  beforeEach(() => {
    canvasSDK = new CanvasSDK();
    selectTool = new SelectTool(canvasSDK);
  });

  test('should create select tool with correct properties', () => {
    expect(selectTool.name).toBe('select');
    expect(selectTool.mode).toBe('select');
    expect(selectTool.cursor).toBe('default');
    expect(selectTool.enabled).toBe(true);
  });

  test('should activate and deactivate correctly', () => {
    // Mock canvas SDK setCursor
    const mockSetCursor = jest.fn();
    (canvasSDK as any).setCursor = mockSetCursor;
    
    selectTool.setCanvasSDK(canvasSDK);
    selectTool.onActivate();
    expect(mockSetCursor).toHaveBeenCalledWith('default');
    
    selectTool.onDeactivate();
    // 验证状态重置
    expect((selectTool as any).isSelecting).toBe(false);
    expect((selectTool as any).isTransforming).toBe(false);
  });

  test('should handle mouse events', () => {
    const mockEvent = {
      button: 0,
      worldPosition: { x: 100, y: 100 },
      ctrlKey: false,
      shiftKey: false
    } as any;

    const result = selectTool.onMouseDown(mockEvent);
    expect(result).toBe(true);
  });
});
```

## 实施计划

### 第一周任务

1. **创建基础文件结构**
   - 创建`MultiSelectManager.ts`
   - 创建`TransformHandle.ts`
   - 创建`TransformController.ts`

2. **实现多选管理器**
   - 完成基础选择功能
   - 实现边界计算
   - 集成到CanvasSDK

3. **创建选择工具**
   - 实现基础选择逻辑
   - 集成到交互系统

### 第二周任务

1. **完善变形控制器**
   - 实现8个控制点
   - 实现各种变形操作
   - 添加旋转支持

2. **增强现有工具**
   - 修改CircleTool支持约束绘制
   - 更新RectangleTool（如果有）
   - 验证所有工具兼容性

3. **集成到交互管理器**
   - 更新事件处理
   - 添加键盘事件支持
   - 完善渲染调试功能

### 测试和验证

1. **单元测试**
   - 为新增类编写测试用例
   - 确保覆盖率 > 80%

2. **功能测试**
   - 多选功能验证
   - 变形操作验证
   - 约束绘制验证
   - 键盘快捷键验证

3. **性能测试**
   - 千个对象选择性能
   - 变形操作响应速度
   - 内存使用监控

## 验收标准

### 功能性
- [ ] 支持Ctrl+点击多选
- [ ] 支持拖拽框选
- [ ] 支持Shift键约束绘制
- [ ] 变形控制点正确显示
- [ ] 8种变形操作支持

### 性能性
- [ ] 千个对象选择 < 50ms
- [ ] 变形操作响应 < 16ms
- [ ] 内存泄漏检测通过

### 用户体验
- [ ] 视觉反馈清晰
- [ ] 操作流畅无卡顿
- [ ] 光标状态正确切换
- [ ] 键盘快捷键符合习惯

这个第一阶段实施指南详细说明了如何实现基础交互增强功能。在实施过程中，建议按模块逐步完成，并及时进行测试验证。