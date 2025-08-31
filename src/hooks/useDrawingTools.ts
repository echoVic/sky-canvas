import { useCallback } from 'react';
import { IShape, ISize, ShapeType } from '@sky-canvas/canvas-sdk';
import { IPoint, IRect } from '@sky-canvas/render-engine';

/**
 * 工具类型定义（与UI store保持一致）
 */
export type ToolType = 
  | 'select' 
  | 'hand' 
  | 'rectangle' 
  | 'diamond' 
  | 'circle' 
  | 'arrow' 
  | 'line' 
  | 'draw' 
  | 'text' 
  | 'image' 
  | 'sticky' 
  | 'link' 
  | 'frame';

/**
 * 基础形状实现
 */
abstract class BaseShape implements IShape {
  public visible: boolean = true;
  public zIndex: number = 0;
  public selected: boolean = false;
  public locked: boolean = false;

  get bounds(): IRect {
    return {
      x: this.position.x,
      y: this.position.y,
      width: this.size.width,
      height: this.size.height
    };
  }

  constructor(
    public readonly id: string,
    public readonly type: ShapeType,
    public position: IPoint,
    public size: ISize
  ) {}

  abstract render(context: any): void;
  abstract getBounds(): any;
  abstract hitTest(point: IPoint): boolean;
  abstract clone(): IShape;
  
  update(update: any): void {
    if (update.position) {
      this.position = { ...this.position, ...update.position };
    }
    if (update.size) {
      this.size = { ...this.size, ...update.size };
    }
    if (update.visible !== undefined) {
      this.visible = update.visible;
    }
    if (update.zIndex !== undefined) {
      this.zIndex = update.zIndex;
    }
    if (update.selected !== undefined) {
      this.selected = update.selected;
    }
    if (update.locked !== undefined) {
      this.locked = update.locked;
    }
  }
  
  serialize(): any {
    return {
      id: this.id,
      type: this.type,
      position: this.position,
      size: this.size,
      visible: this.visible,
      zIndex: this.zIndex,
      selected: this.selected,
      locked: this.locked
    };
  }
  
  deserialize(data: any): void {
    this.position = data.position;
    this.size = data.size;
    this.visible = data.visible;
    this.zIndex = data.zIndex;
    this.selected = data.selected;
    this.locked = data.locked;
  }
  
  dispose(): void {
    // 基础清理逻辑
  }
}

/**
 * 矩形形状
 */
class RectangleShape extends BaseShape {
  constructor(id: string, position: IPoint, size: ISize) {
    super(id, 'rectangle', position, size);
  }

  render(context: any): void {
    if (!context) return;
    
    context.save();
    context.strokeStyle = '#333';
    context.lineWidth = 2;
    context.strokeRect(this.position.x, this.position.y, this.size.width, this.size.height);
    context.restore();
  }

  getBounds(): any {
    return {
      x: this.position.x,
      y: this.position.y,
      width: this.size.width,
      height: this.size.height
    };
  }

  hitTest(point: IPoint): boolean {
    const bounds = this.getBounds();
    return point.x >= bounds.x && 
           point.x <= bounds.x + bounds.width && 
           point.y >= bounds.y && 
           point.y <= bounds.y + bounds.height;
  }

  clone(): IShape {
    const cloned = new RectangleShape(
      this.id + '_clone',
      { ...this.position },
      { ...this.size }
    );
    cloned.visible = this.visible;
    cloned.zIndex = this.zIndex;
    return cloned;
  }
}

/**
 * 圆形形状
 */
class CircleShape extends BaseShape {
  constructor(id: string, position: IPoint, size: ISize) {
    super(id, 'circle', position, size);
  }

  render(context: any): void {
    if (!context) return;
    
    context.save();
    context.strokeStyle = '#333';
    context.lineWidth = 2;
    
    const centerX = this.position.x + this.size.width / 2;
    const centerY = this.position.y + this.size.height / 2;
    const radius = Math.min(this.size.width, this.size.height) / 2;
    
    context.beginPath();
    context.arc(centerX, centerY, radius, 0, 2 * Math.PI);
    context.stroke();
    context.restore();
  }

  getBounds(): any {
    return {
      x: this.position.x,
      y: this.position.y,
      width: this.size.width,
      height: this.size.height
    };
  }

  hitTest(point: IPoint): boolean {
    const centerX = this.position.x + this.size.width / 2;
    const centerY = this.position.y + this.size.height / 2;
    const radius = Math.min(this.size.width, this.size.height) / 2;
    
    const dx = point.x - centerX;
    const dy = point.y - centerY;
    
    return Math.sqrt(dx * dx + dy * dy) <= radius;
  }

  clone(): IShape {
    const cloned = new CircleShape(
      this.id + '_clone',
      { ...this.position },
      { ...this.size }
    );
    cloned.visible = this.visible;
    cloned.zIndex = this.zIndex;
    return cloned;
  }
}

/**
 * 线条形状
 */
class LineShape extends BaseShape {
  constructor(id: string, private startPoint: IPoint, private endPoint: IPoint) {
    const minX = Math.min(startPoint.x, endPoint.x);
    const minY = Math.min(startPoint.y, endPoint.y);
    const width = Math.abs(endPoint.x - startPoint.x);
    const height = Math.abs(endPoint.y - startPoint.y);
    
    super(id, 'line', { x: minX, y: minY }, { width, height });
  }

  render(context: any): void {
    if (!context) return;
    
    context.save();
    context.strokeStyle = '#333';
    context.lineWidth = 2;
    context.beginPath();
    context.moveTo(this.startPoint.x, this.startPoint.y);
    context.lineTo(this.endPoint.x, this.endPoint.y);
    context.stroke();
    context.restore();
  }

  getBounds(): any {
    return {
      x: this.position.x,
      y: this.position.y,
      width: this.size.width,
      height: this.size.height
    };
  }

  hitTest(point: IPoint): boolean {
    // 简化的线条碰撞检测
    const threshold = 5;
    const bounds = this.getBounds();
    
    return point.x >= bounds.x - threshold && 
           point.x <= bounds.x + bounds.width + threshold && 
           point.y >= bounds.y - threshold && 
           point.y <= bounds.y + bounds.height + threshold;
  }

  clone(): IShape {
    const cloned = new LineShape(
      this.id + '_clone',
      { ...this.startPoint },
      { ...this.endPoint }
    );
    cloned.visible = this.visible;
    cloned.zIndex = this.zIndex;
    return cloned;
  }
}

/**
 * 形状工厂函数
 */
export function createShape(type: ToolType, id: string, startPoint: IPoint, endPoint?: IPoint): IShape | null {
  const width = endPoint ? Math.abs(endPoint.x - startPoint.x) : 100;
  const height = endPoint ? Math.abs(endPoint.y - startPoint.y) : 100;
  const position = endPoint ? {
    x: Math.min(startPoint.x, endPoint.x),
    y: Math.min(startPoint.y, endPoint.y)
  } : startPoint;

  switch (type) {
    case 'rectangle':
    case 'diamond':
    case 'frame':
      return new RectangleShape(id, position, { width, height });
      
    case 'circle':
      return new CircleShape(id, position, { width, height });
      
    case 'line':
    case 'arrow':
      if (!endPoint) return null;
      return new LineShape(id, startPoint, endPoint);
      
    default:
      return null;
  }
}

/**
 * useDrawingTools Hook
 * 
 * 管理绘图工具和形状创建
 */
export function useDrawingTools() {
  
  /**
   * 创建形状
   */
  const createShapeForTool = useCallback((
    tool: ToolType, 
    startPoint: IPoint, 
    endPoint?: IPoint
  ): IShape | null => {
    const id = `${tool}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    return createShape(tool, id, startPoint, endPoint);
  }, []);

  /**
   * 检查工具是否为绘图工具
   */
  const isDrawingTool = useCallback((tool: ToolType): boolean => {
    return ['rectangle', 'diamond', 'circle', 'arrow', 'line', 'draw', 'text', 'image', 'sticky', 'frame'].includes(tool);
  }, []);

  /**
   * 检查工具是否需要拖拽来创建形状
   */
  const needsDrag = useCallback((tool: ToolType): boolean => {
    return ['rectangle', 'diamond', 'circle', 'arrow', 'line', 'frame'].includes(tool);
  }, []);

  /**
   * 获取工具的光标样式
   */
  const getCursorForTool = useCallback((tool: ToolType): string => {
    switch (tool) {
      case 'select':
        return 'default';
      case 'hand':
        return 'grab';
      case 'text':
        return 'text';
      default:
        return 'crosshair';
    }
  }, []);

  return {
    createShapeForTool,
    isDrawingTool,
    needsDrag,
    getCursorForTool,
  };
}