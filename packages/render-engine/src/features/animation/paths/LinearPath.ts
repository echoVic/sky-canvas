/**
 * 线性路径
 * 实现直线路径
 */

import { BasePath } from './BasePath';
import { PathType, Point2D, IPath, LinearPathConfig } from '../types/PathTypes';

export class LinearPath extends BasePath {
  readonly type = PathType.LINEAR;
  
  private start: Point2D;
  private end: Point2D;

  constructor(config: LinearPathConfig) {
    super();
    this.start = { ...config.start };
    this.end = { ...config.end };
  }

  getPoint(t: number): Point2D {
    const clamped = this.clampT(t);
    return this.lerpPoint(this.start, this.end, clamped);
  }

  getTangent(t: number): Point2D {
    const dx = this.end.x - this.start.x;
    const dy = this.end.y - this.start.y;
    
    // 如果是零长度线段，返回默认方向
    if (dx === 0 && dy === 0) {
      return { x: 1, y: 0 };
    }
    
    return this.normalizeVector({ x: dx, y: dy });
  }

  getCurvature(t: number): number {
    // 直线的曲率始终为0
    return 0;
  }

  split(t: number): [IPath, IPath] {
    const clamped = this.clampT(t);
    const splitPoint = this.getPoint(clamped);
    
    const firstPath = new LinearPath({
      type: PathType.LINEAR,
      start: this.start,
      end: splitPoint
    });
    
    const secondPath = new LinearPath({
      type: PathType.LINEAR,
      start: splitPoint,
      end: this.end
    });
    
    return [firstPath, secondPath];
  }

  concat(other: IPath): IPath {
    // 如果另一个路径也是线性路径且连续，则合并为单一线性路径
    if (other.type === PathType.LINEAR && other instanceof LinearPath) {
      const otherStart = other.getStart();
      const thisEnd = this.getEnd();
      
      // 检查路径是否连续（终点与起点相同）
      const dx = Math.abs(thisEnd.x - otherStart.x);
      const dy = Math.abs(thisEnd.y - otherStart.y);
      const epsilon = 1e-10;
      
      if (dx < epsilon && dy < epsilon) {
        // 路径连续，创建新的线性路径
        return new LinearPath({
          type: PathType.LINEAR,
          start: this.start,
          end: other.getEnd()
        });
      }
    }
    
    // 否则创建复合路径
    return new CompositePath([this, other]);
  }

  transform(matrix: number[]): IPath {
    if (matrix.length !== 6) {
      throw new Error('Transform matrix must be a 2x3 matrix (6 elements)');
    }
    
    const [a, b, c, d, e, f] = matrix;
    
    const transformPoint = (p: Point2D): Point2D => ({
      x: a * p.x + c * p.y + e,
      y: b * p.x + d * p.y + f
    });
    
    return new LinearPath({
      type: PathType.LINEAR,
      start: transformPoint(this.start),
      end: transformPoint(this.end)
    });
  }

  protected calculateLength(): number {
    const dx = this.end.x - this.start.x;
    const dy = this.end.y - this.start.y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  /**
   * 获取起始点
   */
  getStart(): Point2D {
    return { ...this.start };
  }

  /**
   * 获取结束点
   */
  getEnd(): Point2D {
    return { ...this.end };
  }

  /**
   * 获取路径配置
   */
  getConfig() {
    return {
      type: PathType.LINEAR,
      start: { ...this.start },
      end: { ...this.end }
    };
  }

  /**
   * 设置起始点
   */
  setStart(point: Point2D): void {
    this.start = { ...point };
    this.invalidateCache();
  }

  /**
   * 设置结束点
   */
  setEnd(point: Point2D): void {
    this.end = { ...point };
    this.invalidateCache();
  }

  /**
   * 获取路径方向（角度，弧度）
   */
  getDirection(): number {
    const dx = this.end.x - this.start.x;
    const dy = this.end.y - this.start.y;
    return Math.atan2(dy, dx);
  }

  /**
   * 获取路径方向（角度，度）
   */
  getDirectionDegrees(): number {
    return this.radToDeg(this.getDirection());
  }
}

/**
 * 复合路径类（用于连接不同类型的路径）
 */
class CompositePath extends BasePath {
  readonly type = PathType.CUSTOM;
  
  private paths: IPath[];
  private pathLengths: number[];
  private totalLength: number;

  constructor(paths: IPath[]) {
    super();
    this.paths = [...paths];
    this.pathLengths = paths.map(path => path.getLength());
    this.totalLength = this.pathLengths.reduce((sum, length) => sum + length, 0);
  }

  getPoint(t: number): Point2D {
    const clamped = this.clampT(t);
    
    if (clamped === 0) {
      return this.paths[0].getPoint(0);
    }
    
    if (clamped === 1) {
      const lastPath = this.paths[this.paths.length - 1];
      return lastPath.getPoint(1);
    }

    const targetDistance = clamped * this.totalLength;
    let accumulatedDistance = 0;
    
    for (let i = 0; i < this.paths.length; i++) {
      const pathLength = this.pathLengths[i];
      
      if (accumulatedDistance + pathLength >= targetDistance) {
        const pathProgress = (targetDistance - accumulatedDistance) / pathLength;
        return this.paths[i].getPoint(pathProgress);
      }
      
      accumulatedDistance += pathLength;
    }
    
    // 不应该到达这里，但以防万一
    const lastPath = this.paths[this.paths.length - 1];
    return lastPath.getPoint(1);
  }

  split(t: number): [IPath, IPath] {
    const clamped = this.clampT(t);
    const targetDistance = clamped * this.totalLength;
    let accumulatedDistance = 0;
    
    for (let i = 0; i < this.paths.length; i++) {
      const pathLength = this.pathLengths[i];
      
      if (accumulatedDistance + pathLength >= targetDistance) {
        const pathProgress = (targetDistance - accumulatedDistance) / pathLength;
        const [firstPart, secondPart] = this.paths[i].split(pathProgress);
        
        const firstPaths = [...this.paths.slice(0, i), firstPart];
        const secondPaths = [secondPart, ...this.paths.slice(i + 1)];
        
        return [
          new CompositePath(firstPaths.filter(p => p.getLength() > 0)),
          new CompositePath(secondPaths.filter(p => p.getLength() > 0))
        ];
      }
      
      accumulatedDistance += pathLength;
    }
    
    // 分割点在末尾
    return [this, new LinearPath({
      type: PathType.LINEAR,
      start: this.getPoint(1),
      end: this.getPoint(1)
    })];
  }

  concat(other: IPath): IPath {
    if (other instanceof CompositePath) {
      return new CompositePath([...this.paths, ...other.paths]);
    }
    
    return new CompositePath([...this.paths, other]);
  }

  transform(matrix: number[]): IPath {
    const transformedPaths = this.paths.map(path => path.transform(matrix));
    return new CompositePath(transformedPaths);
  }

  protected calculateLength(): number {
    return this.totalLength;
  }
}