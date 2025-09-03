import { IPoint, IRect } from '@sky-canvas/render-engine';

export type HandleType = 
  | 'top-left' | 'top-center' | 'top-right'
  | 'middle-left' | 'middle-right'
  | 'bottom-left' | 'bottom-center' | 'bottom-right'
  | 'rotate';

export interface ITransformHandle {
  type: HandleType;
  position: IPoint;
  size: number;
  bounds: IRect;
}

export class TransformHandle implements ITransformHandle {
  type: HandleType;
  position: IPoint;
  size: number;
  bounds: IRect;
  
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