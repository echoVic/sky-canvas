/**
 * 路径形状实现
 */
import { IPoint, IRect, IGraphicsContext } from '@sky-canvas/render-engine';
import { IShape, ISize, ShapeType, IShapeUpdate, IShapeData } from './IShape';

/**
 * 路径形状类
 */
export class PathShape implements IShape {
  readonly id: string;
  readonly type: ShapeType = 'path';
  
  public position: IPoint;
  public size: ISize;
  public visible: boolean = true;
  public zIndex: number = 0;
  
  // 路径特有属性
  public points: IPoint[];
  public strokeColor: string;
  public strokeWidth: number;
  public filled: boolean;
  public fillColor: string | undefined;
  
  constructor(
    id: string,
    points: IPoint[],
    strokeColor: string = '#000000',
    strokeWidth: number = 2,
    filled: boolean = false,
    fillColor: string | undefined = undefined
  ) {
    this.id = id;
    this.points = [...points];
    this.strokeColor = strokeColor;
    this.strokeWidth = strokeWidth;
    this.filled = filled;
    this.fillColor = fillColor;
    
    // 计算位置和尺寸
    const bounds = this.calculateBounds();
    this.position = { x: bounds.x, y: bounds.y };
    this.size = { width: bounds.width, height: bounds.height };
  }
  
  private calculateBounds(): IRect {
    if (this.points.length === 0) {
      return { x: 0, y: 0, width: 0, height: 0 };
    }
    
    const firstPoint = this.points[0];
    if (!firstPoint) {
      return { x: 0, y: 0, width: 0, height: 0 };
    }
    
    let minX = firstPoint.x;
    let maxX = firstPoint.x;
    let minY = firstPoint.y;
    let maxY = firstPoint.y;
    
    for (const point of this.points) {
      if (point) {
        minX = Math.min(minX, point.x);
        maxX = Math.max(maxX, point.x);
        minY = Math.min(minY, point.y);
        maxY = Math.max(maxY, point.y);
      }
    }
    
    const padding = this.strokeWidth / 2;
    return {
      x: minX - padding,
      y: minY - padding,
      width: (maxX - minX) + padding * 2,
      height: (maxY - minY) + padding * 2
    };
  }
  
  render(context: IGraphicsContext): void {
    if (!this.visible || this.points.length < 2) return;
    
    // 检查是否是Canvas 2D上下文
    if (context && typeof context.beginPath === 'function') {
      context.save();
      
      // 设置样式
      context.strokeStyle = this.strokeColor;
      context.lineWidth = this.strokeWidth;
      context.lineCap = 'round';
      context.lineJoin = 'round';
      
      if (this.filled && this.fillColor) {
        context.fillStyle = this.fillColor;
      }
      
      // 绘制路径
      context.beginPath();
      const firstPoint = this.points[0];
      if (firstPoint) {
        context.moveTo(firstPoint.x, firstPoint.y);
        
        for (let i = 1; i < this.points.length; i++) {
          const point = this.points[i];
          if (point) {
            context.lineTo(point.x, point.y);
          }
        }
      }
      
      // 填充和描边
      if (this.filled && this.fillColor) {
        context.fill();
      }
      context.stroke();
      
      context.restore();
    }
  }
  
  getBounds(): IRect {
    return this.calculateBounds();
  }
  
  hitTest(point: IPoint): boolean {
    const bounds = this.getBounds();
    
    // 简单的边界框测试
    if (point.x < bounds.x || point.x > bounds.x + bounds.width ||
        point.y < bounds.y || point.y > bounds.y + bounds.height) {
      return false;
    }
    
    // 更精确的路径测试（简化版）
    const threshold = this.strokeWidth + 2;
    
    for (let i = 0; i < this.points.length - 1; i++) {
      const p1 = this.points[i];
      const p2 = this.points[i + 1];
      
      if (p1 && p2) {
        const distance = this.pointToLineDistance(point, p1, p2);
        if (distance <= threshold) {
          return true;
        }
      }
    }
    
    return false;
  }
  
  private pointToLineDistance(point: IPoint, lineStart: IPoint, lineEnd: IPoint): number {
    const A = point.x - lineStart.x;
    const B = point.y - lineStart.y;
    const C = lineEnd.x - lineStart.x;
    const D = lineEnd.y - lineStart.y;

    const dot = A * C + B * D;
    const lenSq = C * C + D * D;
    
    if (lenSq === 0) {
      // 线段长度为0，返回点到点的距离
      return Math.sqrt(A * A + B * B);
    }
    
    const param = dot / lenSq;
    
    let xx: number, yy: number;
    
    if (param < 0) {
      xx = lineStart.x;
      yy = lineStart.y;
    } else if (param > 1) {
      xx = lineEnd.x;
      yy = lineEnd.y;
    } else {
      xx = lineStart.x + param * C;
      yy = lineStart.y + param * D;
    }
    
    const dx = point.x - xx;
    const dy = point.y - yy;
    return Math.sqrt(dx * dx + dy * dy);
  }
  
  clone(): IShape {
    return new PathShape(
      `${this.id}_clone_${Date.now()}`,
      this.points,
      this.strokeColor,
      this.strokeWidth,
      this.filled,
      this.fillColor
    );
  }
  
  dispose(): void {
    // 清理资源
    this.points.length = 0;
  }
  
  // 路径特有方法
  addPoint(point: IPoint): void {
    this.points.push(point);
    const bounds = this.calculateBounds();
    this.position = { x: bounds.x, y: bounds.y };
    this.size = { width: bounds.width, height: bounds.height };
  }
  
  updatePoints(points: IPoint[]): void {
    this.points = [...points];
    const bounds = this.calculateBounds();
    this.position = { x: bounds.x, y: bounds.y };
    this.size = { width: bounds.width, height: bounds.height };
  }
}