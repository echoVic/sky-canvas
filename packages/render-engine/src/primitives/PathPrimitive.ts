/**
 * 路径图形原语实现
 */
import { IGraphicsContext, IPoint, IRect } from '../core/interface/IGraphicsContext';
import { GraphicPrimitive } from './GraphicPrimitive';
import { IPathPrimitive } from './IGraphicPrimitive';

/**
 * 路径图形原语
 */
export class PathPrimitive extends GraphicPrimitive implements IPathPrimitive {
  readonly type = 'path' as const;
  
  private _pathData: string;

  constructor(
    pathData: string = '',
    id?: string
  ) {
    super('path', id);
    this._pathData = pathData;
  }

  get pathData(): string {
    return this._pathData;
  }

  set pathData(value: string) {
    this._pathData = value;
  }

  render(context: IGraphicsContext): void {
    if (!this.visible || !this._pathData) return;

    this.applyTransform(context);
    this.applyStyle(context);

    // 对于路径，我们需要解析SVG路径数据并转换为基本绘制操作
    // 这里简化处理，只支持基本的直线路径
    this.renderPathAsLines(context);

    this.restoreTransform(context);
  }

  private renderPathAsLines(context: IGraphicsContext): void {
    // 简化的路径解析，仅支持基本的 M, L 命令
    const commands = this._pathData.match(/[MLZ][^MLZ]*/g) || [];
    const points: IPoint[] = [];
    
    for (const command of commands) {
      const type = command[0];
      const coords = command.slice(1).trim().split(/[\s,]+/).map(Number);
      
      switch (type) {
        case 'M':
        case 'L':
          if (coords.length >= 2) {
            const x = coords[0];
            const y = coords[1];
            if (typeof x === 'number' && typeof y === 'number' && !isNaN(x) && !isNaN(y)) {
              points.push({ x, y });
            }
          }
          break;
      }
    }
    
    // 绘制连续的线段
    for (let i = 1; i < points.length; i++) {
      const prevPoint = points[i - 1];
      const currentPoint = points[i];
      if (prevPoint && currentPoint) {
        context.drawLine(prevPoint.x, prevPoint.y, currentPoint.x, currentPoint.y);
      }
    }
  }

  getBounds(): IRect {
    // 简化的边界框计算 - 实际实现需要解析路径数据
    // 这里返回一个基于位置的默认边界框
    const defaultSize = 100;
    return {
      x: this._position.x - defaultSize / 2,
      y: this._position.y - defaultSize / 2,
      width: defaultSize,
      height: defaultSize
    };
  }

  hitTest(point: IPoint): boolean {
    // 简化的碰撞检测 - 实际实现需要路径的精确检测
    const bounds = this.getBounds();
    return point.x >= bounds.x && 
           point.x <= bounds.x + bounds.width &&
           point.y >= bounds.y && 
           point.y <= bounds.y + bounds.height;
  }

  clone(): PathPrimitive {
    const cloned = new PathPrimitive(this._pathData);
    cloned.setPosition(this._position);
    cloned.setTransform(this._transform);
    cloned.setStyle(this._style);
    cloned.visible = this.visible;
    cloned.zIndex = this.zIndex;
    return cloned;
  }

  /**
   * 设置路径数据
   * @param pathData SVG路径数据
   */
  setPathData(pathData: string): void {
    this.pathData = pathData;
  }

  /**
   * 添加点到路径
   * @param point 点坐标
   * @param isMoveTo 是否是移动命令
   */
  addPoint(point: IPoint, isMoveTo: boolean = false): void {
    const command = isMoveTo ? 'M' : 'L';
    this._pathData += ` ${command}${point.x},${point.y}`;
  }

  /**
   * 闭合路径
   */
  closePath(): void {
    if (!this._pathData.endsWith('Z')) {
      this._pathData += ' Z';
    }
  }
}