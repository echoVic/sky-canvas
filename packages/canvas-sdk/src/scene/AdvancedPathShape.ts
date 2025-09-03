import { PathShape } from './PathShape';
import { IPoint, IRect, IGraphicsContext } from '@sky-canvas/render-engine';
import { IPathPoint, IPathSegment, IPathData, PathPointType } from './PathTypes';
import { IShape, IShapeUpdate, IShapeData, ShapeType } from './IShape';

/**
 * 高级路径形状
 */
export class AdvancedPathShape extends PathShape implements IShape {
  readonly type: ShapeType = 'path';
  public selected: boolean = false;
  public locked: boolean = false;
  private controlPoints: IPathPoint[] = [];
  private pathData: IPathData;
  private isEditing: boolean = false;
  
  // 实现IRenderable接口的bounds属性
  get bounds(): IRect {
    return this.getBounds();
  }
  
  constructor(id: string, points: IPoint[] = []) {
    super(id, points);
    
    this.pathData = {
      segments: [],
      fillRule: 'nonzero'
    };
    
    // 初始化控制点
    this.initializeControlPoints(points);
  }
  
  /**
   * 初始化控制点
   */
  private initializeControlPoints(points: IPoint[]): void {
    this.controlPoints = points.map((point, index) => ({
      id: `point_${index}`,
      point: { ...point },
      type: 'corner',
      selected: false
    }));
    
    // 创建默认线段
    if (this.controlPoints.length > 0) {
      const segment: IPathSegment = {
        id: `segment_0`,
        points: [...this.controlPoints],
        closed: false
      };
      this.pathData.segments.push(segment);
    }
  }
  
  /**
   * 添加控制点
   */
  addPoint(point: IPoint, type: PathPointType = 'corner'): IPathPoint {
    const newPoint: IPathPoint = {
      id: `point_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      point: { ...point },
      type,
      selected: true
    };
    
    this.controlPoints.push(newPoint);
    
    // 如果没有线段，创建新线段
    if (this.pathData.segments.length === 0) {
      const segment: IPathSegment = {
        id: `segment_${Date.now()}`,
        points: [newPoint],
        closed: false
      };
      this.pathData.segments.push(segment);
    } else {
      // 添加到当前选中的线段或最后一个线段
      const targetSegment = this.getCurrentSegment() || this.pathData.segments[this.pathData.segments.length - 1];
      targetSegment.points.push(newPoint);
    }
    
    this.updatePath();
    return newPoint;
  }
  
  /**
   * 插入控制点
   */
  insertPoint(index: number, point: IPoint, type: PathPointType = 'corner'): IPathPoint {
    const newPoint: IPathPoint = {
      id: `point_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      point: { ...point },
      type,
      selected: true
    };
    
    const targetSegment = this.getCurrentSegment();
    if (targetSegment) {
      targetSegment.points.splice(index, 0, newPoint);
      this.updatePath();
    }
    
    return newPoint;
  }
  
  /**
   * 移除控制点
   */
  removePoint(pointId: string): boolean {
    const pointIndex = this.controlPoints.findIndex(p => p.id === pointId);
    if (pointIndex === -1) return false;
    
    // 从控制点数组中移除
    this.controlPoints.splice(pointIndex, 1);
    
    // 从所有线段中移除
    this.pathData.segments.forEach(segment => {
      const segmentPointIndex = segment.points.findIndex(p => p.id === pointId);
      if (segmentPointIndex !== -1) {
        segment.points.splice(segmentPointIndex, 1);
      }
    });
    
    this.updatePath();
    return true;
  }
  
  /**
   * 获取当前线段
   */
  private getCurrentSegment(): IPathSegment | null {
    // 简化实现：返回第一个包含选中点的线段
    for (const segment of this.pathData.segments) {
      if (segment.points.some(p => p.selected)) {
        return segment;
      }
    }
    return this.pathData.segments.length > 0 ? this.pathData.segments[0] : null;
  }
  
  /**
   * 设置控制点位置
   */
  setPointPosition(pointId: string, position: IPoint): void {
    const point = this.controlPoints.find(p => p.id === pointId);
    if (point) {
      point.point = { ...position };
      this.updatePath();
    }
  }
  
  /**
   * 设置控制点类型
   */
  setPointType(pointId: string, type: PathPointType): void {
    const point = this.controlPoints.find(p => p.id === pointId);
    if (point) {
      point.type = type;
      this.updateHandles(point);
      this.updatePath();
    }
  }
  
  /**
   * 更新手柄
   */
  private updateHandles(point: IPathPoint): void {
    switch (point.type) {
      case 'corner':
        // 角点：可以独立控制手柄
        if (!point.handleIn) point.handleIn = { ...point.point };
        if (!point.handleOut) point.handleOut = { ...point.point };
        break;
      case 'smooth':
        // 平滑点：手柄在一条直线上
        this.makeHandlesSmooth(point);
        break;
      case 'symmetric':
        // 对称点：手柄长度相等方向相反
        this.makeHandlesSymmetric(point);
        break;
    }
  }
  
  /**
   * 使手柄平滑
   */
  private makeHandlesSmooth(point: IPathPoint): void {
    if (point.handleIn && point.handleOut) {
      // 计算手柄的平滑位置
      const inVector = {
        x: point.handleIn.x - point.point.x,
        y: point.handleIn.y - point.point.y
      };
      
      // 平滑手柄（在一条直线上）
      const length = Math.sqrt(inVector.x * inVector.x + inVector.y * inVector.y);
      if (length > 0) {
        const normalized = {
          x: inVector.x / length,
          y: inVector.y / length
        };
        
        const outLength = Math.sqrt(
          Math.pow(point.handleOut.x - point.point.x, 2) +
          Math.pow(point.handleOut.y - point.point.y, 2)
        );
        
        point.handleOut = {
          x: point.point.x - normalized.x * outLength,
          y: point.point.y - normalized.y * outLength
        };
      }
    }
  }
  
  /**
   * 使手柄对称
   */
  private makeHandlesSymmetric(point: IPathPoint): void {
    if (point.handleIn) {
      const inVector = {
        x: point.handleIn.x - point.point.x,
        y: point.handleIn.y - point.point.y
      };
      
      point.handleOut = {
        x: point.point.x - inVector.x,
        y: point.point.y - inVector.y
      };
    } else if (point.handleOut) {
      const outVector = {
        x: point.handleOut.x - point.point.x,
        y: point.handleOut.y - point.point.y
      };
      
      point.handleIn = {
        x: point.point.x - outVector.x,
        y: point.point.y - outVector.y
      };
    }
  }
  
  /**
   * 路径简化
   */
  simplify(tolerance: number = 1): void {
    // 使用Ramer-Douglas-Peucker算法简化路径
    this.pathData.segments.forEach(segment => {
      const simplifiedPoints = this.douglasPeucker(
        segment.points.map(p => p.point),
        tolerance
      );
      
      // 更新线段点
      segment.points = simplifiedPoints.map((point, index) => {
        const existingPoint = segment.points.find(p => 
          Math.abs(p.point.x - point.x) < 0.1 && 
          Math.abs(p.point.y - point.y) < 0.1
        );
        
        if (existingPoint) {
          return existingPoint;
        } else {
          return {
            id: `point_${Date.now()}_${index}`,
            point: { ...point },
            type: 'corner',
            selected: false
          };
        }
      });
    });
    
    this.updatePath();
  }
  
  /**
   * Douglas-Peucker算法实现
   */
  private douglasPeucker(points: IPoint[], epsilon: number): IPoint[] {
    if (points.length <= 2) return points;
    
    let maxDistance = 0;
    let maxIndex = 0;
    
    const first = points[0];
    const last = points[points.length - 1];
    
    // 找到距离首尾连线最远的点
    for (let i = 1; i < points.length - 1; i++) {
      const point = points[i];
      if (point && first && last) {
        const distance = this.calculatePointToLineDistance(point, first, last);
        if (distance > maxDistance) {
          maxDistance = distance;
          maxIndex = i;
        }
      }
    }
    
    // 如果最大距离大于阈值，则递归处理
    if (maxDistance > epsilon) {
      const leftPoints = points.slice(0, maxIndex + 1);
      const rightPoints = points.slice(maxIndex);
      
      const leftSimplified = this.douglasPeucker(leftPoints, epsilon);
      const rightSimplified = this.douglasPeucker(rightPoints, epsilon);
      
      // 合并结果（去掉重复点）
      return [...leftSimplified.slice(0, -1), ...rightSimplified];
    } else {
      // 否则只保留首尾点
      return [first, last];
    }
  }
  
  /**
   * 计算点到线的距离（高级路径专用）
   */
  private calculatePointToLineDistance(point: IPoint, lineStart: IPoint, lineEnd: IPoint): number {
    const A = point.x - lineStart.x;
    const B = point.y - lineStart.y;
    const C = lineEnd.x - lineStart.x;
    const D = lineEnd.y - lineStart.y;
    
    const dot = A * C + B * D;
    const lenSq = C * C + D * D;
    
    let param = -1;
    if (lenSq !== 0) {
      param = dot / lenSq;
    }
    
    let xx, yy;
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
  
  /**
   * 路径平滑
   */
  smooth(smoothness: number = 0.5): void {
    this.pathData.segments.forEach(segment => {
      if (segment.points.length < 3) return;
      
      // 使用Catmull-Rom样条平滑路径
      const smoothedPoints = this.catmullRomSpline(
        segment.points.map(p => p.point),
        smoothness
      );
      
      // 更新线段点为平滑后的点
      segment.points = smoothedPoints.map((point, index) => ({
        id: `point_${Date.now()}_${index}`,
        point: { ...point },
        type: 'smooth',
        selected: false
      }));
    });
    
    this.updatePath();
  }
  
  /**
   * Catmull-Rom样条插值
   */
  private catmullRomSpline(points: IPoint[], tension: number = 0.5): IPoint[] {
    if (points.length < 2) return points;
    
    const smoothed: IPoint[] = [];
    const steps = 10; // 每段插值点数
    
    for (let i = 0; i < points.length - 1; i++) {
      const p0 = i > 0 ? points[i - 1] : points[0];
      const p1 = points[i];
      const p2 = points[i + 1];
      const p3 = i < points.length - 2 ? points[i + 2] : points[i + 1];
      
      // 确保所有点都存在
      if (!p0 || !p1 || !p2 || !p3) continue;
      
      for (let t = 0; t <= 1; t += 1 / steps) {
        const t2 = t * t;
        const t3 = t2 * t;
        
        const x = tension * (
          (-t3 + 2 * t2 - t) * p0.x +
          (3 * t3 - 5 * t2 + 2) * p1.x +
          (-3 * t3 + 4 * t2 + t) * p2.x +
          (t3 - t2) * p3.x
        );
        
        const y = tension * (
          (-t3 + 2 * t2 - t) * p0.y +
          (3 * t3 - 5 * t2 + 2) * p1.y +
          (-3 * t3 + 4 * t2 + t) * p2.y +
          (t3 - t2) * p3.y
        );
        
        smoothed.push({ x, y });
      }
    }
    
    return smoothed;
  }
  
  /**
   * 路径布尔运算 - 并集
   */
  union(other: AdvancedPathShape): AdvancedPathShape {
    // 简化实现：返回新的路径形状
    const newId = `union_${Date.now()}`;
    const newShape = new AdvancedPathShape(newId);
    
    // 实际的布尔运算需要使用专门的库如ClipperLib或实现复杂的算法
    // 这里只是示意实现
    console.warn('Path boolean operations require external library implementation');
    
    return newShape;
  }
  
  /**
   * 路径布尔运算 - 交集
   */
  intersect(other: AdvancedPathShape): AdvancedPathShape {
    const newId = `intersect_${Date.now()}`;
    const newShape = new AdvancedPathShape(newId);
    
    console.warn('Path boolean operations require external library implementation');
    
    return newShape;
  }
  
  /**
   * 路径布尔运算 - 差集
   */
  subtract(other: AdvancedPathShape): AdvancedPathShape {
    const newId = `subtract_${Date.now()}`;
    const newShape = new AdvancedPathShape(newId);
    
    console.warn('Path boolean operations require external library implementation');
    
    return newShape;
  }
  
  /**
   * 更新路径
   */
  private updatePath(): void {
    // 根据控制点更新路径数据
    const points: IPoint[] = [];
    this.pathData.segments.forEach(segment => {
      segment.points.forEach(point => {
        points.push(point.point);
      });
    });
    
    // 调用父类方法更新路径
    super.setPoints(points);
    
    // 触发更新事件
    this.emitUpdate();
  }
  
  /**
   * 开始编辑模式
   */
  startEditing(): void {
    this.isEditing = true;
  }
  
  /**
   * 结束编辑模式
   */
  endEditing(): void {
    this.isEditing = false;
  }
  
  /**
   * 检查是否在编辑模式
   */
  isEditingPath(): boolean {
    return this.isEditing;
  }
  
  /**
   * 获取控制点
   */
  getControlPoints(): IPathPoint[] {
    return [...this.controlPoints];
  }
  
  /**
   * 获取路径数据
   */
  getPathData(): IPathData {
    return { ...this.pathData };
  }
  
  /**
   * 设置路径数据
   */
  setPathData(data: IPathData): void {
    this.pathData = { ...data };
    this.updatePath();
  }
  
  /**
   * 渲染路径（包括控制点）
   */
  render(context: any): void {
    // 渲染路径本身
    super.render(context);
    
    // 如果在编辑模式，渲染控制点
    if (this.isEditing) {
      // 类型检查确保是CanvasRenderingContext2D
      if (context && typeof context.beginPath === 'function') {
        this.renderControlPoints(context);
      }
    }
  }
  
  /**
   * 渲染控制点
   */
  private renderControlPoints(context: CanvasRenderingContext2D): void {
    context.save();
    
    this.controlPoints.forEach(point => {
      // 确保点存在
      if (!point.point) return;
      
      // 渲染手柄线
      if (point.handleIn || point.handleOut) {
        context.strokeStyle = 'rgba(0, 122, 204, 0.5)';
        context.lineWidth = 1;
        context.beginPath();
        
        if (point.handleIn && point.point) {
          context.moveTo(point.point.x, point.point.y);
          context.lineTo(point.handleIn.x, point.handleIn.y);
        }
        
        if (point.handleOut && point.point) {
          context.moveTo(point.point.x, point.point.y);
          context.lineTo(point.handleOut.x, point.handleOut.y);
        }
        
        context.stroke();
      }
      
      // 渲染手柄点
      if (point.handleIn) {
        this.renderHandlePoint(context, point.handleIn, '#ff6b6b');
      }
      
      if (point.handleOut) {
        this.renderHandlePoint(context, point.handleOut, '#4ecdc4');
      }
      
      // 渲染控制点
      const pointColor = point.selected ? '#4ecdc4' : '#007acc';
      this.renderControlPoint(context, point.point, pointColor, point.type);
    });
    
    context.restore();
  }
  
  /**
   * 渲染手柄点
   */
  private renderHandlePoint(context: CanvasRenderingContext2D, point: IPoint, color: string): void {
    context.fillStyle = color;
    context.strokeStyle = '#ffffff';
    context.lineWidth = 1;
    
    context.beginPath();
    context.arc(point.x, point.y, 4, 0, Math.PI * 2);
    context.fill();
    context.stroke();
  }
  
  /**
   * 渲染控制点
   */
  private renderControlPoint(context: CanvasRenderingContext2D, point: IPoint, color: string, type: PathPointType): void {
    context.fillStyle = color;
    context.strokeStyle = '#ffffff';
    context.lineWidth = 1;
    
    context.beginPath();
    
    switch (type) {
      case 'corner':
        // 方形点
        context.rect(point.x - 4, point.y - 4, 8, 8);
        break;
      case 'smooth':
        // 菱形点
        context.moveTo(point.x, point.y - 5);
        context.lineTo(point.x + 5, point.y);
        context.lineTo(point.x, point.y + 5);
        context.lineTo(point.x - 5, point.y);
        context.closePath();
        break;
      case 'symmetric':
        // 圆形点
        context.arc(point.x, point.y, 4, 0, Math.PI * 2);
        break;
    }
    
    context.fill();
    context.stroke();
  }
  
  /**
   * 导出到SVG路径数据
   */
  toSVGPathData(): string {
    if (this.pathData.segments.length === 0) return '';
    
    let pathData = '';
    
    this.pathData.segments.forEach(segment => {
      if (segment.points.length === 0) return;
      
      // 移动到第一个点
      const firstPoint = segment.points[0].point;
      if (firstPoint) {
        pathData += `M ${firstPoint.x} ${firstPoint.y} `;
      }
      
      // 绘制后续点
      for (let i = 1; i < segment.points.length; i++) {
        const point = segment.points[i].point;
        if (point) {
          if (segment.points[i].handleIn) {
            // 贝塞尔曲线
            const handleIn = segment.points[i].handleIn!;
            const prevPoint = segment.points[i-1];
            const handleOut = prevPoint && prevPoint.handleOut || (prevPoint && prevPoint.point);
            if (handleOut && handleIn) {
              pathData += `C ${handleOut.x} ${handleOut.y} ${handleIn.x} ${handleIn.y} ${point.x} ${point.y} `;
            } else {
              // 直线
              pathData += `L ${point.x} ${point.y} `;
            }
          } else {
            // 直线
            pathData += `L ${point.x} ${point.y} `;
          }
        }
      }
      
      // 闭合路径
      if (segment.closed) {
        pathData += 'Z ';
      }
    });
    
    return pathData.trim();
  }
  
  /**
   * 从SVG路径数据导入
   */
  static fromSVGPathData(id: string, pathData: string): AdvancedPathShape {
    // 简化实现：解析基本的M、L、C命令
    const shape = new AdvancedPathShape(id);
    
    // 实际的SVG路径解析需要复杂的实现
    console.warn('SVG path parsing requires complex implementation');
    
    return shape;
  }
  
  /**
   * 触发更新事件
   */
  private emitUpdate(): void {
    // 在实际实现中，这里会触发事件通知监听者路径已更新
  }
  
  /**
   * 获取边界框
   */
  getBounds(): IRect {
    // 计算所有控制点的边界
    if (this.controlPoints.length === 0) {
      return super.getBounds();
    }
    
    let minX = Infinity, minY = Infinity;
    let maxX = -Infinity, maxY = -Infinity;
    
    this.controlPoints.forEach(point => {
      if (point.point) {
        minX = Math.min(minX, point.point.x);
        minY = Math.min(minY, point.point.y);
        maxX = Math.max(maxX, point.point.x);
        maxY = Math.max(maxY, point.point.y);
      }
      
      // 包括手柄点
      if (point.handleIn) {
        minX = Math.min(minX, point.handleIn.x);
        minY = Math.min(minY, point.handleIn.y);
        maxX = Math.max(maxX, point.handleIn.x);
        maxY = Math.max(maxY, point.handleIn.y);
      }
      
      if (point.handleOut) {
        minX = Math.min(minX, point.handleOut.x);
        minY = Math.min(minY, point.handleOut.y);
        maxX = Math.max(maxX, point.handleOut.x);
        maxY = Math.max(maxY, point.handleOut.y);
      }
    });
    
    return {
      x: minX,
      y: minY,
      width: maxX - minX,
      height: maxY - minY
    };
  }
  
  /**
   * 克隆形状
   */
  clone(): IShape {
    const cloned = new AdvancedPathShape(this.id, this.points);
    cloned.selected = this.selected;
    cloned.locked = this.locked;
    cloned.pathData = { ...this.pathData };
    cloned.controlPoints = this.controlPoints.map(point => ({ ...point }));
    cloned.isEditing = this.isEditing;
    return cloned;
  }
  
  /**
   * 更新形状属性
   */
  update(update: IShapeUpdate): void {
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
  
  /**
   * 序列化形状数据
   */
  serialize(): IShapeData {
    return {
      id: this.id,
      type: this.type,
      position: { ...this.position },
      size: { ...this.size },
      visible: this.visible,
      zIndex: this.zIndex,
      selected: this.selected,
      locked: this.locked
    };
  }
  
  /**
   * 从序列化数据恢复
   */
  deserialize(data: IShapeData): void {
    this.position = { ...data.position };
    this.size = { ...data.size };
    this.visible = data.visible;
    this.zIndex = data.zIndex;
    this.selected = data.selected;
    this.locked = data.locked;
  }
  
  /**
   * 销毁形状
   */
  dispose(): void {
    // 清理资源
    this.controlPoints.length = 0;
    this.pathData.segments.length = 0;
  }
}