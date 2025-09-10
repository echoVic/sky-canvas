/**
 * 路径工厂
 * 根据配置创建不同类型的路径实例
 */

import {
  IPath,
  PathConfig,
  PathType,
  Point2D,
  LinearPathConfig,
  QuadraticBezierPathConfig,
  CubicBezierPathConfig,
  SplinePathConfig,
  CirclePathConfig,
  EllipsePathConfig,
  CustomPathConfig
} from '../types/PathTypes';

import { LinearPath } from './LinearPath';
import { QuadraticBezierPath, CubicBezierPath } from './BezierPath';
import { CirclePath, EllipsePath } from './CirclePath';
import { SplinePath } from './SplinePath';
import { CustomPath } from './CustomPath';

export class PathFactory {
  /**
   * 根据配置创建路径
   */
  static createPath(config: PathConfig): IPath {
    switch (config.type) {
      case PathType.LINEAR:
        return new LinearPath(config as LinearPathConfig);
        
      case PathType.BEZIER_QUADRATIC:
        return new QuadraticBezierPath(config as QuadraticBezierPathConfig);
        
      case PathType.BEZIER_CUBIC:
        return new CubicBezierPath(config as CubicBezierPathConfig);
        
      case PathType.SPLINE:
        return new SplinePath(config as SplinePathConfig);
        
      case PathType.CIRCLE:
        return new CirclePath(config as CirclePathConfig);
        
      case PathType.ELLIPSE:
        return new EllipsePath(config as EllipsePathConfig);
        
      case PathType.CUSTOM:
        return new CustomPath(config as CustomPathConfig);
        
      default:
        throw new Error(`Unsupported path type: ${(config as any).type}`);
    }
  }

  /**
   * 创建直线路径
   */
  static createLine(start: Point2D, end: Point2D): LinearPath {
    return new LinearPath({
      type: PathType.LINEAR,
      start,
      end
    });
  }

  /**
   * 创建二次贝塞尔路径
   */
  static createQuadraticBezier(
    start: Point2D,
    control: Point2D,
    end: Point2D
  ): QuadraticBezierPath {
    return new QuadraticBezierPath({
      type: PathType.BEZIER_QUADRATIC,
      start,
      control,
      end
    });
  }

  /**
   * 创建三次贝塞尔路径
   */
  static createCubicBezier(
    start: Point2D,
    control1: Point2D,
    control2: Point2D,
    end: Point2D
  ): CubicBezierPath {
    return new CubicBezierPath({
      type: PathType.BEZIER_CUBIC,
      start,
      control1,
      control2,
      end
    });
  }

  /**
   * 创建样条曲线路径
   */
  static createSpline(
    points: Point2D[],
    tension: number = 0.5,
    closed: boolean = false
  ): SplinePath {
    return new SplinePath({
      type: PathType.SPLINE,
      points,
      tension,
      closed
    });
  }

  /**
   * 创建圆形路径
   */
  static createCircle(
    center: Point2D,
    radius: number,
    startAngle: number = 0,
    endAngle: number = 2 * Math.PI,
    clockwise: boolean = true
  ): CirclePath {
    return new CirclePath({
      type: PathType.CIRCLE,
      center,
      radius,
      startAngle,
      endAngle,
      clockwise
    });
  }

  /**
   * 创建椭圆路径
   */
  static createEllipse(
    center: Point2D,
    radiusX: number,
    radiusY: number,
    rotation: number = 0,
    startAngle: number = 0,
    endAngle: number = 2 * Math.PI,
    clockwise: boolean = true
  ): EllipsePath {
    return new EllipsePath({
      type: PathType.ELLIPSE,
      center,
      radiusX,
      radiusY,
      rotation,
      startAngle,
      endAngle,
      clockwise
    });
  }

  /**
   * 创建矩形路径
   */
  static createRectangle(
    x: number,
    y: number,
    width: number,
    height: number,
    clockwise: boolean = true
  ): IPath {
    const points = [
      { x, y },
      { x: x + width, y },
      { x: x + width, y: y + height },
      { x, y: y + height }
    ];

    if (!clockwise) {
      points.reverse();
    }

    return this.createPolygon(points, true);
  }

  /**
   * 创建多边形路径
   */
  static createPolygon(points: Point2D[], closed: boolean = true): IPath {
    if (points.length < 2) {
      throw new Error('Polygon must have at least 2 points');
    }

    const paths: IPath[] = [];
    
    for (let i = 0; i < points.length - 1; i++) {
      paths.push(this.createLine(points[i], points[i + 1]));
    }

    if (closed && points.length > 2) {
      paths.push(this.createLine(points[points.length - 1], points[0]));
    }

    return this.combinePaths(paths);
  }

  /**
   * 创建星形路径
   */
  static createStar(
    center: Point2D,
    outerRadius: number,
    innerRadius: number,
    points: number = 5,
    rotation: number = 0
  ): IPath {
    if (points < 3) {
      throw new Error('Star must have at least 3 points');
    }

    const starPoints: Point2D[] = [];
    const angleStep = (2 * Math.PI) / (points * 2);

    for (let i = 0; i < points * 2; i++) {
      const angle = rotation + i * angleStep - Math.PI / 2;
      const radius = i % 2 === 0 ? outerRadius : innerRadius;
      
      starPoints.push({
        x: center.x + radius * Math.cos(angle),
        y: center.y + radius * Math.sin(angle)
      });
    }

    return this.createPolygon(starPoints, true);
  }

  /**
   * 创建螺旋路径
   */
  static createSpiral(
    center: Point2D,
    startRadius: number,
    endRadius: number,
    turns: number,
    clockwise: boolean = true
  ): CustomPath {
    return new CustomPath({
      type: PathType.CUSTOM,
      getPoint: (t: number) => {
        const angle = (clockwise ? 1 : -1) * turns * 2 * Math.PI * t;
        const radius = startRadius + (endRadius - startRadius) * t;
        
        return {
          x: center.x + radius * Math.cos(angle),
          y: center.y + radius * Math.sin(angle)
        };
      },
      getTangent: (t: number) => {
        const angle = (clockwise ? 1 : -1) * turns * 2 * Math.PI * t;
        const radius = startRadius + (endRadius - startRadius) * t;
        const radiusDerivative = endRadius - startRadius;
        const angleDerivative = (clockwise ? 1 : -1) * turns * 2 * Math.PI;
        
        const dx = radiusDerivative * Math.cos(angle) - radius * angleDerivative * Math.sin(angle);
        const dy = radiusDerivative * Math.sin(angle) + radius * angleDerivative * Math.cos(angle);
        
        const length = Math.sqrt(dx * dx + dy * dy);
        return length > 0 ? { x: dx / length, y: dy / length } : { x: 1, y: 0 };
      }
    });
  }

  /**
   * 创建心形路径
   */
  static createHeart(center: Point2D, size: number = 100): CustomPath {
    return new CustomPath({
      type: PathType.CUSTOM,
      getPoint: (t: number) => {
        const angle = t * 2 * Math.PI;
        const x = 16 * Math.pow(Math.sin(angle), 3);
        const y = 13 * Math.cos(angle) - 5 * Math.cos(2 * angle) - 2 * Math.cos(3 * angle) - Math.cos(4 * angle);
        
        return {
          x: center.x + (size / 16) * x,
          y: center.y - (size / 16) * y
        };
      }
    });
  }

  /**
   * 创建8字形路径
   */
  static createFigureEight(center: Point2D, radius: number): CustomPath {
    return new CustomPath({
      type: PathType.CUSTOM,
      getPoint: (t: number) => {
        const angle = t * 2 * Math.PI;
        
        return {
          x: center.x + radius * Math.sin(angle),
          y: center.y + radius * Math.sin(angle) * Math.cos(angle)
        };
      }
    });
  }

  /**
   * 创建波浪路径
   */
  static createWave(
    start: Point2D,
    end: Point2D,
    amplitude: number,
    frequency: number
  ): CustomPath {
    return new CustomPath({
      type: PathType.CUSTOM,
      getPoint: (t: number) => {
        const baseX = start.x + (end.x - start.x) * t;
        const baseY = start.y + (end.y - start.y) * t;
        
        const waveY = amplitude * Math.sin(frequency * 2 * Math.PI * t);
        
        return {
          x: baseX,
          y: baseY + waveY
        };
      }
    });
  }

  /**
   * 组合多个路径
   */
  static combinePaths(paths: IPath[]): IPath {
    if (paths.length === 0) {
      throw new Error('Cannot combine empty path array');
    }
    
    if (paths.length === 1) {
      return paths[0];
    }

    // 创建复合路径
    return new CompositePath(paths);
  }

  /**
   * 从SVG路径字符串创建路径（简化版本）
   */
  static fromSVGPath(pathString: string): IPath {
    // 这是一个简化的SVG路径解析实现
    // 在实际应用中，需要完整的SVG路径解析器
    
    const commands = this.parseSVGPath(pathString);
    const paths: IPath[] = [];
    let currentPoint = { x: 0, y: 0 };
    let startPoint = { x: 0, y: 0 };

    for (const cmd of commands) {
      switch (cmd.type) {
        case 'M': // moveTo
          currentPoint = { x: cmd.x, y: cmd.y };
          startPoint = { ...currentPoint };
          break;
          
        case 'L': // lineTo
          paths.push(this.createLine(currentPoint, { x: cmd.x, y: cmd.y }));
          currentPoint = { x: cmd.x, y: cmd.y };
          break;
          
        case 'Q': // quadraticCurveTo
          paths.push(this.createQuadraticBezier(
            currentPoint,
            { x: cmd.x1, y: cmd.y1 },
            { x: cmd.x, y: cmd.y }
          ));
          currentPoint = { x: cmd.x, y: cmd.y };
          break;
          
        case 'C': // bezierCurveTo
          paths.push(this.createCubicBezier(
            currentPoint,
            { x: cmd.x1, y: cmd.y1 },
            { x: cmd.x2, y: cmd.y2 },
            { x: cmd.x, y: cmd.y }
          ));
          currentPoint = { x: cmd.x, y: cmd.y };
          break;
          
        case 'Z': // closePath
          if (currentPoint.x !== startPoint.x || currentPoint.y !== startPoint.y) {
            paths.push(this.createLine(currentPoint, startPoint));
          }
          currentPoint = { ...startPoint };
          break;
      }
    }

    return this.combinePaths(paths);
  }

  /**
   * 解析SVG路径命令（简化版）
   */
  private static parseSVGPath(pathString: string): any[] {
    // 简化的SVG路径解析
    // 实际实现需要更复杂的解析逻辑
    return [];
  }
}

/**
 * 复合路径类（临时实现）
 */
class CompositePath implements IPath {
  readonly type = PathType.CUSTOM;
  private paths: IPath[];
  private _length?: number;

  constructor(paths: IPath[]) {
    this.paths = [...paths];
  }

  get length(): number {
    if (this._length === undefined) {
      this._length = this.paths.reduce((sum, path) => sum + path.length, 0);
    }
    return this._length;
  }

  getLength(): number {
    return this.length;
  }

  getPoint(t: number): Point2D {
    if (this.paths.length === 0) {
      return { x: 0, y: 0 };
    }

    const totalLength = this.getLength();
    const targetDistance = t * totalLength;
    
    let currentDistance = 0;
    for (const path of this.paths) {
      const pathLength = path.getLength();
      if (currentDistance + pathLength >= targetDistance) {
        const localT = (targetDistance - currentDistance) / pathLength;
        return path.getPoint(Math.max(0, Math.min(1, localT)));
      }
      currentDistance += pathLength;
    }
    
    return this.paths[this.paths.length - 1]?.getPoint(1) || { x: 0, y: 0 };
  }

  getTangent(t: number): Point2D {
    if (this.paths.length === 0) {
      return { x: 1, y: 0 };
    }

    const totalLength = this.getLength();
    const targetDistance = t * totalLength;
    
    let currentDistance = 0;
    for (const path of this.paths) {
      const pathLength = path.getLength();
      if (currentDistance + pathLength >= targetDistance) {
        const localT = (targetDistance - currentDistance) / pathLength;
        return path.getTangent(Math.max(0, Math.min(1, localT)));
      }
      currentDistance += pathLength;
    }
    
    return this.paths[this.paths.length - 1]?.getTangent(1) || { x: 1, y: 0 };
  }

  getNormal(t: number): Point2D {
    if (this.paths.length === 0) {
      return { x: 0, y: 1 };
    }

    const totalLength = this.getLength();
    const targetDistance = t * totalLength;
    
    let currentDistance = 0;
    for (const path of this.paths) {
      const pathLength = path.getLength();
      if (currentDistance + pathLength >= targetDistance) {
        const localT = (targetDistance - currentDistance) / pathLength;
        return path.getNormal(Math.max(0, Math.min(1, localT)));
      }
      currentDistance += pathLength;
    }
    
    return this.paths[this.paths.length - 1]?.getNormal(1) || { x: 0, y: 1 };
  }

  getBounds(): { min: Point2D; max: Point2D } {
    if (this.paths.length === 0) {
      return { min: { x: 0, y: 0 }, max: { x: 0, y: 0 } };
    }

    let minX = Infinity, minY = Infinity;
    let maxX = -Infinity, maxY = -Infinity;

    for (const path of this.paths) {
      const bounds = path.getBounds();
      minX = Math.min(minX, bounds.min.x);
      minY = Math.min(minY, bounds.min.y);
      maxX = Math.max(maxX, bounds.max.x);
      maxY = Math.max(maxY, bounds.max.y);
    }

    return {
      min: { x: minX, y: minY },
      max: { x: maxX, y: maxY }
    };
  }

  getClosestPoint(point: Point2D): { point: Point2D; t: number; distance: number } {
    if (this.paths.length === 0) {
      return { point: { x: 0, y: 0 }, t: 0, distance: 0 };
    }

    let closestResult = { point: { x: 0, y: 0 }, t: 0, distance: Infinity };
    let currentT = 0;
    const totalLength = this.getLength();

    for (const path of this.paths) {
      const pathLength = path.getLength();
      const pathResult = path.getClosestPoint(point);
      
      if (pathResult.distance < closestResult.distance) {
        // 转换局部t到全局t
        const globalT = (currentT + pathResult.t * pathLength) / totalLength;
        closestResult = {
          point: pathResult.point,
          t: globalT,
          distance: pathResult.distance
        };
      }
      
      currentT += pathLength;
    }

    return closestResult;
  }

  split(t: number): [IPath, IPath] {
    // 简化实现
    const splitPoint = this.getPoint(t);
    return [this, new CompositePath([])];
  }

  concat(other: IPath): IPath {
    return new CompositePath([...this.paths, other]);
  }

  transform(matrix: number[]): IPath {
    const transformedPaths = this.paths.map(path => path.transform(matrix));
    return new CompositePath(transformedPaths);
  }
}