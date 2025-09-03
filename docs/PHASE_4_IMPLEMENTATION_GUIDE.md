# 第四阶段实施指南：高级功能

## 1. 路径编辑器

### 1.1 创建路径点和路径数据结构

**文件**: `packages/canvas-sdk/src/scene/PathTypes.ts`

```typescript
import { IPoint } from '@sky-canvas/render-engine';

/**
 * 路径点类型
 */
export type PathPointType = 'corner' | 'smooth' | 'symmetric';

/**
 * 路径点接口
 */
export interface IPathPoint {
  id: string;
  point: IPoint;
  type: PathPointType;
  handleIn?: IPoint;  // 入手柄
  handleOut?: IPoint; // 出手柄
  selected: boolean;
}

/**
 * 路径段接口
 */
export interface IPathSegment {
  id: string;
  points: IPathPoint[];
  closed: boolean;
}

/**
 * 路径数据接口
 */
export interface IPathData {
  segments: IPathSegment[];
  fillRule: 'nonzero' | 'evenodd';
}
```

### 1.2 创建高级路径形状

**文件**: `packages/canvas-sdk/src/scene/AdvancedPathShape.ts`

```typescript
import { PathShape } from './PathShape';
import { IPoint } from '@sky-canvas/render-engine';
import { IPathPoint, IPathSegment, IPathData, PathPointType } from './PathTypes';

/**
 * 高级路径形状
 */
export class AdvancedPathShape extends PathShape {
  private controlPoints: IPathPoint[] = [];
  private pathData: IPathData;
  private isEditing: boolean = false;
  
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
      const distance = this.pointToLineDistance(points[i], first, last);
      if (distance > maxDistance) {
        maxDistance = distance;
        maxIndex = i;
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
   * 计算点到线的距离
   */
  private pointToLineDistance(point: IPoint, lineStart: IPoint, lineEnd: IPoint): number {
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
  render(context: CanvasRenderingContext2D): void {
    // 渲染路径本身
    super.render(context);
    
    // 如果在编辑模式，渲染控制点
    if (this.isEditing) {
      this.renderControlPoints(context);
    }
  }
  
  /**
   * 渲染控制点
   */
  private renderControlPoints(context: CanvasRenderingContext2D): void {
    context.save();
    
    this.controlPoints.forEach(point => {
      // 渲染手柄线
      if (point.handleIn || point.handleOut) {
        context.strokeStyle = 'rgba(0, 122, 204, 0.5)';
        context.lineWidth = 1;
        context.beginPath();
        
        if (point.handleIn) {
          context.moveTo(point.point.x, point.point.y);
          context.lineTo(point.handleIn.x, point.handleIn.y);
        }
        
        if (point.handleOut) {
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
      pathData += `M ${firstPoint.x} ${firstPoint.y} `;
      
      // 绘制后续点
      for (let i = 1; i < segment.points.length; i++) {
        const point = segment.points[i].point;
        if (segment.points[i].handleIn) {
          // 贝塞尔曲线
          const handleIn = segment.points[i].handleIn!;
          const handleOut = segment.points[i-1].handleOut || segment.points[i-1].point;
          pathData += `C ${handleOut.x} ${handleOut.y} ${handleIn.x} ${handleIn.y} ${point.x} ${point.y} `;
        } else {
          // 直线
          pathData += `L ${point.x} ${point.y} `;
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
}
```

## 2. 文本编辑增强

### 2.1 创建文本运行和格式化

**文件**: `packages/canvas-sdk/src/scene/TextTypes.ts`

```typescript
import { IPoint, Rect } from '@sky-canvas/render-engine';

/**
 * 文本范围接口
 */
export interface TextRange {
  start: number;
  end: number;
}

/**
 * 文本格式接口
 */
export interface TextFormat {
  fontFamily?: string;
  fontSize?: number;
  fontWeight?: 'normal' | 'bold' | number;
  fontStyle?: 'normal' | 'italic';
  textDecoration?: 'none' | 'underline' | 'line-through';
  color?: string;
  backgroundColor?: string;
}

/**
 * 文本运行接口
 */
export interface TextRun {
  text: string;
  format: TextFormat;
  range: TextRange;
}

/**
 * 字体加载状态
 */
export type FontLoadStatus = 'loading' | 'loaded' | 'failed';

/**
 * 字体信息接口
 */
export interface FontInfo {
  family: string;
  weight: string;
  style: string;
  url?: string;
}
```

### 2.2 创建富文本形状

**文件**: `packages/canvas-sdk/src/scene/RichTextShape.ts`

```typescript
import { TextShape } from './TextShape';
import { TextRange, TextFormat, TextRun, FontInfo, FontLoadStatus } from './TextTypes';
import { IPoint, Rect } from '@sky-canvas/render-engine';

/**
 * 富文本形状
 */
export class RichTextShape extends TextShape {
  private textRuns: TextRun[] = [];
  private isEditing: boolean = false;
  private caretPosition: number = 0;
  private selectionRange: TextRange | null = null;
  private fontCache: Map<string, FontLoadStatus> = new Map();
  private lineHeight: number = 1.2;
  
  constructor(id: string, text: string = '', position: IPoint = { x: 0, y: 0 }) {
    super(id, text, position);
    
    // 初始化默认文本运行
    if (text) {
      this.textRuns.push({
        text,
        format: this.getDefaultFormat(),
        range: { start: 0, end: text.length }
      });
    }
  }
  
  /**
   * 获取默认文本格式
   */
  private getDefaultFormat(): TextFormat {
    return {
      fontFamily: 'Arial, sans-serif',
      fontSize: 16,
      fontWeight: 'normal',
      fontStyle: 'normal',
      textDecoration: 'none',
      color: '#000000'
    };
  }
  
  /**
   * 应用格式到文本范围
   */
  applyFormat(range: TextRange, format: TextFormat): void {
    if (range.start < 0 || range.end > this.getText().length || range.start > range.end) {
      throw new Error('Invalid text range');
    }
    
    // 标准化范围
    const normalizedRange = {
      start: Math.max(0, range.start),
      end: Math.min(this.getText().length, range.end)
    };
    
    // 分割现有的文本运行
    this.splitTextRuns(normalizedRange);
    
    // 应用新格式
    const newFormat: TextFormat = { ...format };
    const formatRun: TextRun = {
      text: this.getText().substring(normalizedRange.start, normalizedRange.end),
      format: newFormat,
      range: { ...normalizedRange }
    };
    
    // 插入或替换文本运行
    this.insertTextRun(formatRun);
    
    // 合并相邻的相同格式运行
    this.mergeTextRuns();
    
    this.requestRender();
  }
  
  /**
   * 分割文本运行
   */
  private splitTextRuns(range: TextRange): void {
    const newRuns: TextRun[] = [];
    
    for (const run of this.textRuns) {
      if (run.range.end <= range.start || run.range.start >= range.end) {
        // 不重叠，保留原样
        newRuns.push(run);
      } else if (run.range.start < range.start && run.range.end > range.end) {
        // 完全包含范围，需要分成三段
        newRuns.push({
          text: run.text.substring(0, range.start - run.range.start),
          format: { ...run.format },
          range: { start: run.range.start, end: range.start }
        });
        
        newRuns.push({
          text: run.text.substring(range.start - run.range.start, range.end - run.range.start),
          format: { ...run.format },
          range: { ...range }
        });
        
        newRuns.push({
          text: run.text.substring(range.end - run.range.start),
          format: { ...run.format },
          range: { start: range.end, end: run.range.end }
        });
      } else if (run.range.start < range.start) {
        // 部分重叠（左端）
        newRuns.push({
          text: run.text.substring(0, range.start - run.range.start),
          format: { ...run.format },
          range: { start: run.range.start, end: range.start }
        });
        
        newRuns.push({
          text: run.text.substring(range.start - run.range.start),
          format: { ...run.format },
          range: { start: range.start, end: run.range.end }
        });
      } else if (run.range.end > range.end) {
        // 部分重叠（右端）
        newRuns.push({
          text: run.text.substring(0, range.end - run.range.start),
          format: { ...run.format },
          range: { start: run.range.start, end: range.end }
        });
        
        newRuns.push({
          text: run.text.substring(range.end - run.range.start),
          format: { ...run.format },
          range: { start: range.end, end: run.range.end }
        });
      } else {
        // 完全在范围内，保留原样（将在后续步骤中被替换）
        newRuns.push(run);
      }
    }
    
    this.textRuns = newRuns;
  }
  
  /**
   * 插入文本运行
   */
  private insertTextRun(newRun: TextRun): void {
    const insertIndex = this.textRuns.findIndex(run => run.range.start >= newRun.range.start);
    
    if (insertIndex === -1) {
      this.textRuns.push(newRun);
    } else {
      this.textRuns.splice(insertIndex, 0, newRun);
    }
  }
  
  /**
   * 合并相同格式的相邻文本运行
   */
  private mergeTextRuns(): void {
    if (this.textRuns.length <= 1) return;
    
    const mergedRuns: TextRun[] = [];
    let currentRun = { ...this.textRuns[0] };
    
    for (let i = 1; i < this.textRuns.length; i++) {
      const nextRun = this.textRuns[i];
      
      // 检查格式是否相同且范围是否连续
      if (
        this.formatsEqual(currentRun.format, nextRun.format) &&
        currentRun.range.end === nextRun.range.start
      ) {
        // 合并运行
        currentRun.text += nextRun.text;
        currentRun.range.end = nextRun.range.end;
      } else {
        // 不能合并，保存当前运行并开始新的
        mergedRuns.push(currentRun);
        currentRun = { ...nextRun };
      }
    }
    
    // 添加最后一个运行
    mergedRuns.push(currentRun);
    
    this.textRuns = mergedRuns;
  }
  
  /**
   * 检查两个格式是否相等
   */
  private formatsEqual(format1: TextFormat, format2: TextFormat): boolean {
    return (
      format1.fontFamily === format2.fontFamily &&
      format1.fontSize === format2.fontSize &&
      format1.fontWeight === format2.fontWeight &&
      format1.fontStyle === format2.fontStyle &&
      format1.textDecoration === format2.textDecoration &&
      format1.color === format2.color &&
      format1.backgroundColor === format2.backgroundColor
    );
  }
  
  /**
   * 插入文本
   */
  insertText(position: number, text: string): void {
    const fullText = this.getText();
    const newText = fullText.substring(0, position) + text + fullText.substring(position);
    
    // 更新所有文本运行的范围
    this.textRuns.forEach(run => {
      if (run.range.start >= position) {
        run.range.start += text.length;
        run.range.end += text.length;
      } else if (run.range.end > position) {
        run.range.end += text.length;
      }
    });
    
    // 在光标位置插入新的文本运行
    const newRun: TextRun = {
      text,
      format: this.getCurrentFormatAtPosition(position),
      range: { start: position, end: position + text.length }
    };
    
    this.insertTextRun(newRun);
    this.mergeTextRuns();
    
    this.updateText(newText);
    this.updateCaretPosition(position + text.length);
  }
  
  /**
   * 删除文本
   */
  deleteText(range: TextRange): void {
    if (range.start < 0 || range.end > this.getText().length || range.start >= range.end) {
      return;
    }
    
    const fullText = this.getText();
    const newText = fullText.substring(0, range.start) + fullText.substring(range.end);
    
    // 移除被删除范围内的文本运行
    this.textRuns = this.textRuns.filter(run => 
      run.range.end <= range.start || run.range.start >= range.end
    );
    
    // 更新剩余文本运行的范围
    this.textRuns.forEach(run => {
      if (run.range.start >= range.end) {
        run.range.start -= (range.end - range.start);
        run.range.end -= (range.end - range.start);
      } else if (run.range.end > range.start) {
        run.range.end = Math.max(range.start, run.range.end - (range.end - range.start));
      }
    });
    
    this.updateText(newText);
    this.updateCaretPosition(range.start);
  }
  
  /**
   * 获取指定位置的当前格式
   */
  private getCurrentFormatAtPosition(position: number): TextFormat {
    for (const run of this.textRuns) {
      if (position >= run.range.start && position <= run.range.end) {
        return { ...run.format };
      }
    }
    
    return this.getDefaultFormat();
  }
  
  /**
   * 开始编辑
   */
  startEditing(): void {
    this.isEditing = true;
    this.requestRender();
  }
  
  /**
   * 结束编辑
   */
  endEditing(): void {
    this.isEditing = false;
    this.selectionRange = null;
    this.requestRender();
  }
  
  /**
   * 更新光标位置
   */
  updateCaretPosition(position: number): void {
    this.caretPosition = Math.max(0, Math.min(this.getText().length, position));
    this.requestRender();
  }
  
  /**
   * 设置选择范围
   */
  setSelectionRange(range: TextRange | null): void {
    if (range === null) {
      this.selectionRange = null;
    } else {
      this.selectionRange = {
        start: Math.max(0, Math.min(this.getText().length, range.start)),
        end: Math.max(0, Math.min(this.getText().length, range.end))
      };
    }
    this.requestRender();
  }
  
  /**
   * 获取选择范围
   */
  getSelectionRange(): TextRange | null {
    return this.selectionRange ? { ...this.selectionRange } : null;
  }
  
  /**
   * 获取光标位置
   */
  getCaretPosition(): number {
    return this.caretPosition;
  }
  
  /**
   * 检查是否在编辑模式
   */
  isEditingText(): boolean {
    return this.isEditing;
  }
  
  /**
   * 获取文本运行
   */
  getTextRuns(): TextRun[] {
    return [...this.textRuns];
  }
  
  /**
   * 设置文本运行
   */
  setTextRuns(runs: TextRun[]): void {
    this.textRuns = runs.map(run => ({ ...run }));
    this.requestRender();
  }
  
  /**
   * 渲染文本
   */
  render(context: CanvasRenderingContext2D): void {
    // 应用基本样式
    const defaultFormat = this.getDefaultFormat();
    context.font = this.getFontString(defaultFormat);
    context.fillStyle = defaultFormat.color || '#000000';
    
    // 渲染文本运行
    this.textRuns.forEach(run => {
      context.save();
      
      // 应用运行格式
      context.font = this.getFontString(run.format);
      context.fillStyle = run.format.color || defaultFormat.color || '#000000';
      
      // 渲染背景色
      if (run.format.backgroundColor) {
        const textWidth = context.measureText(run.text).width;
        const fontSize = run.format.fontSize || defaultFormat.fontSize || 16;
        const lineHeight = fontSize * this.lineHeight;
        
        context.fillStyle = run.format.backgroundColor;
        context.fillRect(
          this.position.x, 
          this.position.y + (run.range.start * lineHeight / this.getText().length),
          textWidth,
          lineHeight
        );
        
        context.fillStyle = run.format.color || defaultFormat.color || '#000000';
      }
      
      // 渲染文本
      context.fillText(run.text, this.position.x, this.position.y);
      
      // 渲染装饰线
      if (run.format.textDecoration === 'underline') {
        const textWidth = context.measureText(run.text).width;
        const fontSize = run.format.fontSize || defaultFormat.fontSize || 16;
        context.beginPath();
        context.moveTo(this.position.x, this.position.y + 2);
        context.lineTo(this.position.x + textWidth, this.position.y + 2);
        context.stroke();
      } else if (run.format.textDecoration === 'line-through') {
        const textWidth = context.measureText(run.text).width;
        const fontSize = run.format.fontSize || defaultFormat.fontSize || 16;
        context.beginPath();
        context.moveTo(this.position.x, this.position.y - fontSize / 3);
        context.lineTo(this.position.x + textWidth, this.position.y - fontSize / 3);
        context.stroke();
      }
      
      context.restore();
    });
    
    // 渲染编辑相关元素
    if (this.isEditing) {
      this.renderEditingElements(context);
    }
  }
  
  /**
   * 渲染编辑元素（光标、选择区域等）
   */
  private renderEditingElements(context: CanvasRenderingContext2D): void {
    context.save();
    
    const defaultFormat = this.getDefaultFormat();
    const fontSize = defaultFormat.fontSize || 16;
    
    // 渲染选择区域
    if (this.selectionRange && this.selectionRange.start !== this.selectionRange.end) {
      context.fillStyle = 'rgba(59, 130, 246, 0.3)';
      
      const startOffset = this.getTextOffsetAtPosition(this.selectionRange.start);
      const endOffset = this.getTextOffsetAtPosition(this.selectionRange.end);
      
      context.fillRect(
        this.position.x + startOffset,
        this.position.y - fontSize,
        endOffset - startOffset,
        fontSize * this.lineHeight
      );
    }
    
    // 渲染光标
    if (!this.selectionRange || this.selectionRange.start === this.selectionRange.end) {
      context.strokeStyle = '#007acc';
      context.lineWidth = 2;
      
      const caretOffset = this.getTextOffsetAtPosition(this.caretPosition);
      context.beginPath();
      context.moveTo(this.position.x + caretOffset, this.position.y - fontSize);
      context.lineTo(this.position.x + caretOffset, this.position.y + fontSize * (this.lineHeight - 1));
      context.stroke();
    }
    
    context.restore();
  }
  
  /**
   * 获取文本位置的像素偏移
   */
  private getTextOffsetAtPosition(position: number): number {
    if (position <= 0) return 0;
    if (position >= this.getText().length) {
      return this.measureTextWidth(this.getText());
    }
    
    const text = this.getText().substring(0, position);
    return this.measureTextWidth(text);
  }
  
  /**
   * 测量文本宽度
   */
  private measureTextWidth(text: string): number {
    const context = document.createElement('canvas').getContext('2d');
    if (!context) return 0;
    
    const format = this.getDefaultFormat();
    context.font = this.getFontString(format);
    return context.measureText(text).width;
  }
  
  /**
   * 获取字体字符串
   */
  private getFontString(format: TextFormat): string {
    const fontStyle = format.fontStyle === 'italic' ? 'italic' : 'normal';
    const fontWeight = format.fontWeight || 'normal';
    const fontSize = format.fontSize || 16;
    const fontFamily = format.fontFamily || 'Arial, sans-serif';
    
    return `${fontStyle} ${fontWeight} ${fontSize}px ${fontFamily}`;
  }
  
  /**
   * 加载字体
   */
  async loadFont(fontInfo: FontInfo): Promise<void> {
    const fontKey = `${fontInfo.family}-${fontInfo.weight}-${fontInfo.style}`;
    
    // 检查缓存
    if (this.fontCache.get(fontKey) === 'loaded') {
      return;
    }
    
    // 设置加载状态
    this.fontCache.set(fontKey, 'loading');
    
    try {
      if (fontInfo.url) {
        // 创建CSS字体规则
        const style = document.createElement('style');
        style.textContent = `
          @font-face {
            font-family: '${fontInfo.family}';
            font-weight: ${fontInfo.weight};
            font-style: ${fontInfo.style};
            src: url('${fontInfo.url}');
          }
        `;
        document.head.appendChild(style);
      }
      
      // 等待字体加载
      await document.fonts.load(`${fontInfo.weight} ${fontInfo.style} 16px ${fontInfo.family}`);
      
      // 更新缓存
      this.fontCache.set(fontKey, 'loaded');
    } catch (error) {
      this.fontCache.set(fontKey, 'failed');
      throw new Error(`Failed to load font: ${fontInfo.family}`);
    }
  }
  
  /**
   * 检查字体是否已加载
   */
  isFontLoaded(fontInfo: FontInfo): boolean {
    const fontKey = `${fontInfo.family}-${fontInfo.weight}-${fontInfo.style}`;
    return this.fontCache.get(fontKey) === 'loaded';
  }
  
  /**
   * 获取文本边界
   */
  getBounds(): Rect {
    const bounds = super.getBounds();
    
    // 计算所有文本运行的实际边界
    if (this.textRuns.length > 0) {
      const context = document.createElement('canvas').getContext('2d');
      if (context) {
        let maxWidth = 0;
        let totalHeight = 0;
        
        for (const run of this.textRuns) {
          context.font = this.getFontString(run.format);
          const metrics = context.measureText(run.text);
          maxWidth = Math.max(maxWidth, metrics.width);
          
          const fontSize = run.format.fontSize || this.getDefaultFormat().fontSize || 16;
          totalHeight += fontSize * this.lineHeight;
        }
        
        bounds.width = maxWidth;
        bounds.height = totalHeight;
      }
    }
    
    return bounds;
  }
  
  /**
   * 请求重新渲染
   */
  private requestRender(): void {
    // 在实际实现中，这里会触发渲染更新
    console.log('Rich text shape updated, requesting render');
  }
}
```

## 3. 导入导出系统

### 3.1 创建导入导出管理器

**文件**: `packages/canvas-sdk/src/io/ImportExportManager.ts`

```typescript
import { IShape } from '../scene/IShape';
import { Scene } from '../scene/Scene';
import { Rect } from '@sky-canvas/render-engine';

/**
 * 导出选项接口
 */
export interface ExportOptions {
  width?: number;
  height?: number;
  backgroundColor?: string;
  quality?: number; // 0-1，用于PNG/JPEG
  scale?: number;  // 缩放因子
}

/**
 * 导入导出管理器
 */
export class ImportExportManager {
  /**
   * 导出到SVG
   */
  exportToSVG(shapes: IShape[], options?: { width?: number; height?: number }): string {
    const width = options?.width || 800;
    const height = options?.height || 600;
    
    let svg = `<?xml version="1.0" encoding="UTF-8"?>\n`;
    svg += `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">\n`;
    
    // 添加背景
    svg += `  <rect width="100%" height="100%" fill="white"/>\n`;
    
    // 导出每个形状
    shapes.forEach(shape => {
      if (shape.visible) {
        const shapeSVG = this.shapeToSVG(shape);
        if (shapeSVG) {
          svg += `  ${shapeSVG}\n`;
        }
      }
    });
    
    svg += `</svg>`;
    return svg;
  }
  
  /**
   * 形状转SVG
   */
  private shapeToSVG(shape: IShape): string | null {
    const bounds = shape.getBounds();
    
    // 根据形状类型生成SVG
    if (shape.constructor.name.includes('Rectangle')) {
      return `<rect x="${bounds.x}" y="${bounds.y}" width="${bounds.width}" height="${bounds.height}" fill="black"/>`;
    } else if (shape.constructor.name.includes('Circle')) {
      const cx = bounds.x + bounds.width / 2;
      const cy = bounds.y + bounds.height / 2;
      const r = Math.min(bounds.width, bounds.height) / 2;
      return `<circle cx="${cx}" cy="${cy}" r="${r}" fill="black"/>`;
    } else if (shape.constructor.name.includes('Path')) {
      // 路径形状需要特殊处理
      return `<path d="M ${bounds.x} ${bounds.y} L ${bounds.x + bounds.width} ${bounds.y + bounds.height}" fill="none" stroke="black"/>`;
    }
    
    // 默认矩形
    return `<rect x="${bounds.x}" y="${bounds.y}" width="${bounds.width}" height="${bounds.height}" fill="black"/>`;
  }
  
  /**
   * 导出到PNG
   */
  exportToPNG(canvas: HTMLCanvasElement, options?: ExportOptions): Promise<Blob> {
    return new Promise((resolve, reject) => {
      try {
        const exportCanvas = this.createExportCanvas(canvas, options);
        exportCanvas.toBlob((blob) => {
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error('Failed to create blob from canvas'));
          }
        }, 'image/png', options?.quality || 0.92);
      } catch (error) {
        reject(error);
      }
    });
  }
  
  /**
   * 导出到JPEG
   */
  exportToJPEG(canvas: HTMLCanvasElement, options?: ExportOptions): Promise<Blob> {
    return new Promise((resolve, reject) => {
      try {
        const exportCanvas = this.createExportCanvas(canvas, options);
        exportCanvas.toBlob((blob) => {
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error('Failed to create blob from canvas'));
          }
        }, 'image/jpeg', options?.quality || 0.92);
      } catch (error) {
        reject(error);
      }
    });
  }
  
  /**
   * 创建导出画布
   */
  private createExportCanvas(canvas: HTMLCanvasElement, options?: ExportOptions): HTMLCanvasElement {
    const scale = options?.scale || 1;
    const width = (options?.width || canvas.width) * scale;
    const height = (options?.height || canvas.height) * scale;
    
    const exportCanvas = document.createElement('canvas');
    exportCanvas.width = width;
    exportCanvas.height = height;
    
    const ctx = exportCanvas.getContext('2d');
    if (!ctx) {
      throw new Error('Failed to get 2D context');
    }
    
    // 设置背景色
    if (options?.backgroundColor) {
      ctx.fillStyle = options.backgroundColor;
      ctx.fillRect(0, 0, width, height);
    }
    
    // 绘制原画布内容
    ctx.scale(scale, scale);
    ctx.drawImage(canvas, 0, 0);
    
    return exportCanvas;
  }
  
  /**
   * 导出到JSON
   */
  exportToJSON(scene: Scene): string {
    const sceneData = {
      version: '1.0',
      shapes: scene.getShapes().map(shape => this.shapeToJSON(shape)),
      metadata: {
        exportTime: new Date().toISOString(),
        shapeCount: scene.getShapes().length
      }
    };
    
    return JSON.stringify(sceneData, null, 2);
  }
  
  /**
   * 形状转JSON
   */
  private shapeToJSON(shape: IShape): any {
    return {
      id: shape.id,
      type: shape.constructor.name,
      position: shape.getPosition(),
      size: shape.getSize(),
      visible: shape.visible,
      zIndex: shape.zIndex,
      // 添加其他形状特定的属性
      properties: this.getShapeProperties(shape)
    };
  }
  
  /**
   * 获取形状属性
   */
  private getShapeProperties(shape: IShape): any {
    const properties: any = {};
    
    // 尝试获取常见的形状属性
    if (typeof (shape as any).getRadius === 'function') {
      properties.radius = (shape as any).getRadius();
    }
    
    if (typeof (shape as any).getText === 'function') {
      properties.text = (shape as any).getText();
    }
    
    if (typeof (shape as any).getPoints === 'function') {
      properties.points = (shape as any).getPoints();
    }
    
    if (typeof (shape as any).getColor === 'function') {
      properties.color = (shape as any).getColor();
    }
    
    return properties;
  }
  
  /**
   * 从JSON导入
   */
  importFromJSON(jsonData: string): Scene {
    const sceneData = JSON.parse(jsonData);
    const scene = new Scene();
    
    if (sceneData.shapes) {
      sceneData.shapes.forEach((shapeData: any) => {
        const shape = this.jsonToShape(shapeData);
        if (shape) {
          scene.addShape(shape);
        }
      });
    }
    
    return scene;
  }
  
  /**
   * JSON转形状
   */
  private jsonToShape(shapeData: any): IShape | null {
    // 简化实现：需要根据实际的形状类来创建
    console.warn('JSON to shape conversion requires implementation of specific shape factories');
    return null;
  }
  
  /**
   * 从SVG导入
   */
  importFromSVG(svgData: string): IShape[] {
    // 解析SVG数据并转换为形状
    const parser = new DOMParser();
    const doc = parser.parseFromString(svgData, 'image/svg+xml');
    const shapes: IShape[] = [];
    
    // 处理SVG元素
    const svgElements = doc.querySelectorAll('rect, circle, path, line, polyline, polygon');
    
    svgElements.forEach(element => {
      const shape = this.svgElementToShape(element);
      if (shape) {
        shapes.push(shape);
      }
    });
    
    return shapes;
  }
  
  /**
   * SVG元素转形状
   */
  private svgElementToShape(element: Element): IShape | null {
    const tagName = element.tagName.toLowerCase();
    
    switch (tagName) {
      case 'rect':
        return this.svgRectToShape(element);
      case 'circle':
        return this.svgCircleToShape(element);
      case 'path':
        return this.svgPathToShape(element);
      case 'line':
        return this.svgLineToShape(element);
      default:
        console.warn(`Unsupported SVG element: ${tagName}`);
        return null;
    }
  }
  
  /**
   * SVG矩形转形状
   */
  private svgRectToShape(element: Element): IShape | null {
    // 简化实现：需要创建具体的矩形形状
    console.warn('SVG rect to shape conversion requires implementation');
    return null;
  }
  
  /**
   * SVG圆形转形状
   */
  private svgCircleToShape(element: Element): IShape | null {
    // 简化实现：需要创建具体的圆形形状
    console.warn('SVG circle to shape conversion requires implementation');
    return null;
  }
  
  /**
   * SVG路径转形状
   */
  private svgPathToShape(element: Element): IShape | null {
    // 简化实现：需要创建具体的路径形状
    console.warn('SVG path to shape conversion requires implementation');
    return null;
  }
  
  /**
   * SVG线条转形状
   */
  private svgLineToShape(element: Element): IShape | null {
    // 简化实现：需要创建具体的线条形状
    console.warn('SVG line to shape conversion requires implementation');
    return null;
  }
  
  /**
   * 从图像文件导入
   */
  async importFromImage(imageFile: File): Promise<any> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
          resolve({
            image: img,
            width: img.width,
            height: img.height
          });
        };
        img.onerror = reject;
        img.src = event.target?.result as string;
      };
      
      reader.onerror = reject;
      reader.readAsDataURL(imageFile);
    });
  }
  
  /**
   * 批量导出
   */
  async batchExport(shapes: IShape[], format: 'svg' | 'png' | 'json', options?: ExportOptions): Promise<Blob | string> {
    switch (format) {
      case 'svg':
        return new Blob([this.exportToSVG(shapes, options)], { type: 'image/svg+xml' });
      case 'png':
        // 需要canvas参数
        throw new Error('PNG export requires canvas parameter');
      case 'json':
        return this.exportToJSON(new Scene()); // 简化实现
      default:
        throw new Error(`Unsupported export format: ${format}`);
    }
  }
}
```

## 4. 集成到CanvasSDK

### 4.1 更新CanvasSDK以支持新功能

**文件**: `packages/canvas-sdk/src/core/CanvasSDK.ts`

```typescript
// 添加导入
import { AdvancedPathShape } from '../scene/AdvancedPathShape';
import { RichTextShape } from '../scene/RichTextShape';
import { ImportExportManager } from '../io/ImportExportManager';

// 在类中添加属性
export class CanvasSDK extends EventEmitter<ICanvasSDKEvents> {
  private importExportManager: ImportExportManager = new ImportExportManager();
  
  // 路径API
  /**
   * 创建高级路径形状
   */
  createAdvancedPath(id: string, points: IPoint[] = []): AdvancedPathShape {
    const path = new AdvancedPathShape(id, points);
    this.addShape(path);
    return path;
  }
  
  /**
   * 获取高级路径形状
   */
  getAdvancedPath(id: string): AdvancedPathShape | undefined {
    const shape = this.getShape(id);
    return shape instanceof AdvancedPathShape ? shape : undefined;
  }
  
  // 文本API
  /**
   * 创建富文本形状
   */
  createRichText(id: string, text: string = '', position: IPoint = { x: 0, y: 0 }): RichTextShape {
    const richText = new RichTextShape(id, text, position);
    this.addShape(richText);
    return richText;
  }
  
  /**
   * 获取富文本形状
   */
  getRichText(id: string): RichTextShape | undefined {
    const shape = this.getShape(id);
    return shape instanceof RichTextShape ? shape : undefined;
  }
  
  // 导入导出API
  /**
   * 导出到SVG
   */
  exportToSVG(options?: { width?: number; height?: number }): string {
    const shapes = this.getShapes();
    return this.importExportManager.exportToSVG(shapes, options);
  }
  
  /**
   * 导出到PNG
   */
  exportToPNG(canvas: HTMLCanvasElement, options?: ExportOptions): Promise<Blob> {
    return this.importExportManager.exportToPNG(canvas, options);
  }
  
  /**
   * 导出到JPEG
   */
  exportToJPEG(canvas: HTMLCanvasElement, options?: ExportOptions): Promise<Blob> {
    return this.importExportManager.exportToJPEG(canvas, options);
  }
  
  /**
   * 导出到JSON
   */
  exportToJSON(): string {
    // 简化实现：需要访问场景对象
    return this.importExportManager.exportToJSON({} as any);
  }
  
  /**
   * 从JSON导入
   */
  importFromJSON(jsonData: string): void {
    const scene = this.importExportManager.importFromJSON(jsonData);
    // 需要将场景中的形状添加到当前SDK
    console.warn('JSON import requires scene integration');
  }
  
  /**
   * 从SVG导入
   */
  importFromSVG(svgData: string): IShape[] {
    const shapes = this.importExportManager.importFromSVG(svgData);
    shapes.forEach(shape => this.addShape(shape));
    return shapes;
  }
  
  /**
   * 从图像文件导入
   */
  async importFromImage(imageFile: File): Promise<any> {
    return this.importExportManager.importFromImage(imageFile);
  }
}
```

## 5. 创建路径编辑工具

### 5.1 创建路径工具

**文件**: `packages/canvas-sdk/src/tools/PathTool.ts`

```typescript
import { IPoint } from '@sky-canvas/render-engine';
import { IInteractionTool, InteractionMode, IMouseEvent } from '../interaction/types';
import { AdvancedPathShape } from '../scene/AdvancedPathShape';

/**
 * 路径工具类
 */
export class PathTool implements IInteractionTool {
  name = 'path';
  mode = InteractionMode.DRAW;
  cursor = 'crosshair';
  enabled = true;
  
  private isDrawing = false;
  private currentPath: AdvancedPathShape | null = null;
  private shapeId: string | null = null;
  private isEditing = false;
  
  // 回调函数
  private onSetCursor: ((cursor: string) => void) | null = null;
  private onAddShape: ((shape: AdvancedPathShape) => void) | null = null;
  
  /**
   * 设置回调函数
   */
  setCallbacks(callbacks: {
    onSetCursor?: (cursor: string) => void;
    onAddShape?: (shape: AdvancedPathShape) => void;
  }): void {
    if (callbacks.onSetCursor) this.onSetCursor = callbacks.onSetCursor;
    if (callbacks.onAddShape) this.onAddShape = callbacks.onAddShape;
  }
  
  onActivate(): void {
    if (this.onSetCursor) {
      this.onSetCursor(this.cursor);
    }
  }
  
  onDeactivate(): void {
    this.isDrawing = false;
    this.currentPath = null;
    this.shapeId = null;
    this.isEditing = false;
  }
  
  onMouseDown(event: IMouseEvent): boolean {
    if (event.button !== 0) return false; // 只处理左键
    
    if (this.isEditing && this.currentPath) {
      // 编辑模式下添加控制点
      this.currentPath.addPoint(event.worldPosition);
      return true;
    }
    
    if (!this.isDrawing) {
      // 开始绘制新路径
      this.isDrawing = true;
      this.shapeId = `path_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      this.currentPath = new AdvancedPathShape(this.shapeId);
      this.currentPath.startEditing();
      
      // 添加第一个点
      this.currentPath.addPoint(event.worldPosition);
      
      return true;
    }
    
    return false;
  }
  
  onMouseMove(event: IMouseEvent): boolean {
    if (!this.isDrawing || !this.currentPath) return false;
    
    // 实时预览（可以添加更多交互）
    return true;
  }
  
  onMouseUp(event: IMouseEvent): boolean {
    if (!this.isDrawing) return false;
    
    // 路径工具在鼠标按下时添加点，鼠标抬起时不执行特殊操作
    return true;
  }
  
  onGesture(event: any): boolean {
    return false;
  }
  
  onKeyDown(key: string): boolean {
    if (!this.currentPath) return false;
    
    switch (key) {
      case 'Enter':
        // 完成路径绘制
        return this.finishPath();
      case 'Escape':
        // 取消路径绘制
        return this.cancelPath();
      case 'Backspace':
        // 删除最后一个点
        return this.removeLastPoint();
      default:
        return false;
    }
  }
  
  onKeyUp(key: string): boolean {
    return false;
  }
  
  /**
   * 完成路径绘制
   */
  private finishPath(): boolean {
    if (!this.isDrawing || !this.currentPath) return false;
    
    this.isDrawing = false;
    
    if (this.currentPath.getControlPoints().length > 1) {
      // 结束编辑模式
      this.currentPath.endEditing();
      
      // 触发形状创建事件
      this.emitShapeCreated(this.currentPath);
    } else {
      // 点数不足，取消创建
      this.currentPath = null;
      this.shapeId = null;
    }
    
    return true;
  }
  
  /**
   * 取消路径绘制
   */
  private cancelPath(): boolean {
    this.isDrawing = false;
    this.currentPath = null;
    this.shapeId = null;
    return true;
  }
  
  /**
   * 删除最后一个点
   */
  private removeLastPoint(): boolean {
    if (!this.currentPath) return false;
    
    const points = this.currentPath.getControlPoints();
    if (points.length > 0) {
      const lastPoint = points[points.length - 1];
      this.currentPath.removePoint(lastPoint.id);
      return true;
    }
    
    return false;
  }
  
  isCurrentlyDrawing(): boolean {
    return this.isDrawing;
  }
  
  getCurrentShape(): AdvancedPathShape | null {
    return this.currentPath;
  }
  
  /**
   * 设置编辑模式
   */
  setEditingMode(editing: boolean): void {
    this.isEditing = editing;
    this.cursor = editing ? 'default' : 'crosshair';
    
    if (this.on

SetCursor) {
      this.onSetCursor(this.cursor);
    }
  }
  
  /**
   * 获取编辑模式
   */
  isEditingMode(): boolean {
    return this.isEditing;
  }
  
  /**
   * 触发形状创建事件
   */
  private emitShapeCreated(shape: AdvancedPathShape): void {
    if (this.onAddShape) {
      this.onAddShape(shape);
    } else {
      console.log('Path created:', shape);
    }
  }
}
```

## 6. 测试验证

### 6.1 路径编辑器测试

**文件**: `packages/canvas-sdk/src/scene/__tests__/AdvancedPathShape.test.ts`

```typescript
import { AdvancedPathShape } from '../AdvancedPathShape';
import { IPoint } from '@sky-canvas/render-engine';

describe('AdvancedPathShape', () => {
  let pathShape: AdvancedPathShape;

  beforeEach(() => {
    pathShape = new AdvancedPathShape('test-path', [{ x: 0, y: 0 }, { x: 100, y: 100 }]);
  });

  test('should create path with initial points', () => {
    expect(pathShape.getId()).toBe('test-path');
    expect(pathShape.getControlPoints()).toHaveLength(2);
  });

  test('should add control point', () => {
    const newPoint = pathShape.addPoint({ x: 50, y: 50 });
    expect(newPoint).toBeDefined();
    expect(pathShape.getControlPoints()).toHaveLength(3);
  });

  test('should remove control point', () => {
    const points = pathShape.getControlPoints();
    const result = pathShape.removePoint(points[0].id);
    expect(result).toBe(true);
    expect(pathShape.getControlPoints()).toHaveLength(1);
  });

  test('should simplify path', () => {
    // 添加一些点用于简化测试
    pathShape.addPoint({ x: 10, y: 10 });
    pathShape.addPoint({ x: 20, y: 20 });
    pathShape.addPoint({ x: 30, y: 10 });
    
    const originalCount = pathShape.getControlPoints().length;
    pathShape.simplify(5);
    expect(pathShape.getControlPoints().length).toBeLessThanOrEqual(originalCount);
  });

  test('should smooth path', () => {
    // 添加足够的点用于平滑测试
    for (let i = 0; i < 10; i++) {
      pathShape.addPoint({ x: i * 10, y: Math.sin(i) * 20 });
    }
    
    const originalPoints = pathShape.getControlPoints();
    pathShape.smooth(0.5);
    // 平滑后点数应该增加
    expect(pathShape.getControlPoints().length).toBeGreaterThanOrEqual(originalPoints.length);
  });
});
```

### 6.2 文本编辑测试

**文件**: `packages/canvas-sdk/src/scene/__tests__/RichTextShape.test.ts`

```typescript
import { RichTextShape } from '../RichTextShape';
import { TextRange, TextFormat } from '../TextTypes';

describe('RichTextShape', () => {
  let textShape: RichTextShape;

  beforeEach(() => {
    textShape = new RichTextShape('test-text', 'Hello World', { x: 0, y: 0 });
  });

  test('should create text with initial content', () => {
    expect(textShape.getId()).toBe('test-text');
    expect(textShape.getText()).toBe('Hello World');
  });

  test('should apply format to text range', () => {
    const range: TextRange = { start: 0, end: 5 };
    const format: TextFormat = { 
      fontWeight: 'bold', 
      color: '#ff0000' 
    };
    
    textShape.applyFormat(range, format);
    const runs = textShape.getTextRuns();
    
    expect(runs).toHaveLength(2); // "Hello" 和 " World"
    expect(runs[0].format.fontWeight).toBe('bold');
    expect(runs[0].format.color).toBe('#ff0000');
  });

  test('should insert text', () => {
    const originalText = textShape.getText();
    textShape.insertText(5, ' Beautiful');
    expect(textShape.getText()).toBe('Hello Beautiful World');
  });

  test('should delete text', () => {
    const range: TextRange = { start: 6, end: 11 };
    textShape.deleteText(range);
    expect(textShape.getText()).toBe('Hello ');
  });

  test('should manage editing state', () => {
    expect(textShape.isEditingText()).toBe(false);
    
    textShape.startEditing();
    expect(textShape.isEditingText()).toBe(true);
    
    textShape.endEditing();
    expect(textShape.isEditingText()).toBe(false);
  });

  test('should manage caret position', () => {
    textShape.updateCaretPosition(5);
    expect(textShape.getCaretPosition()).toBe(5);
    
    // 测试边界情况
    textShape.updateCaretPosition(-1);
    expect(textShape.getCaretPosition()).toBe(0);
    
    textShape.updateCaretPosition(100);
    expect(textShape.getCaretPosition()).toBe(textShape.getText().length);
  });
});
```

### 6.3 导入导出测试

**文件**: `packages/canvas-sdk/src/io/__tests__/ImportExportManager.test.ts`

```typescript
import { ImportExportManager } from '../ImportExportManager';

describe('ImportExportManager', () => {
  let importExportManager: ImportExportManager;
  let mockShapes: any[];
  let mockCanvas: HTMLCanvasElement;

  beforeEach(() => {
    importExportManager = new ImportExportManager();
    mockShapes = [
      {
        id: 'rect-1',
        visible: true,
        getBounds: () => ({ x: 0, y: 0, width: 100, height: 50 }),
        constructor: { name: 'RectangleShape' }
      },
      {
        id: 'circle-1',
        visible: true,
        getBounds: () => ({ x: 50, y: 50, width: 30, height: 30 }),
        constructor: { name: 'CircleShape' }
      }
    ];
    
    mockCanvas = document.createElement('canvas');
    mockCanvas.width = 200;
    mockCanvas.height = 100;
  });

  test('should export to SVG', () => {
    const svg = importExportManager.exportToSVG(mockShapes, { width: 200, height: 100 });
    expect(svg).toContain('<svg');
    expect(svg).toContain('<rect');
    expect(svg).toContain('<circle');
  });

  test('should export to PNG', async () => {
    const blob = await importExportManager.exportToPNG(mockCanvas, { quality: 0.9 });
    expect(blob).toBeInstanceOf(Blob);
    expect(blob.type).toBe('image/png');
  });

  test('should export to JPEG', async () => {
    const blob = await importExportManager.exportToJPEG(mockCanvas, { quality: 0.8 });
    expect(blob).toBeInstanceOf(Blob);
    expect(blob.type).toBe('image/jpeg');
  });

  test('should export to JSON', () => {
    const mockScene: any = {
      getShapes: () => mockShapes
    };
    
    const json = importExportManager.exportToJSON(mockScene);
    expect(json).toContain('"version"');
    expect(json).toContain('"shapes"');
  });

  test('should batch export', async () => {
    const blob = await importExportManager.batchExport(mockShapes, 'svg');
    expect(blob).toBeInstanceOf(Blob);
    expect(blob.type).toBe('image/svg+xml');
  });

  test('should handle import from image', async () => {
    // 创建模拟文件
    const imageData = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==';
    const byteString = atob(imageData.split(',')[1]);
    const mimeString = imageData.split(',')[0].split(':')[1].split(';')[0];
    const ab = new ArrayBuffer(byteString.length);
    const ia = new Uint8Array(ab);
    for (let i = 0; i < byteString.length; i++) {
      ia[i] = byteString.charCodeAt(i);
    }
    const file = new File([ab], 'test.png', { type: mimeString });
    
    const result = await importExportManager.importFromImage(file);
    expect(result).toHaveProperty('image');
    expect(result).toHaveProperty('width');
    expect(result).toHaveProperty('height');
  });
});
```

## 实施计划

### 第一周任务

1. **创建基础文件结构**
   - 创建`PathTypes.ts`
   - 创建`AdvancedPathShape.ts`
   - 创建`TextTypes.ts`
   - 创建`RichTextShape.ts`

2. **实现路径编辑器核心功能**
   - 实现控制点管理
   - 实现路径简化算法
   - 实现路径平滑算法
   - 添加SVG导入导出支持

3. **实现文本编辑增强**
   - 实现富文本格式化
   - 实现文本运行管理
   - 实现光标和选择管理
   - 添加字体加载支持

### 第二周任务

1. **创建导入导出系统**
   - 实现SVG导出功能
   - 实现PNG/JPEG导出功能
   - 实现JSON序列化功能
   - 实现基础导入功能

2. **创建路径编辑工具**
   - 实现PathTool类
   - 添加键盘快捷键支持
   - 实现编辑模式管理
   - 集成到工具系统

3. **完善功能**
   - 优化路径编辑性能
   - 完善文本格式化功能
   - 增强导入导出功能
   - 添加错误处理和边界检查

### 第三周任务

1. **功能完善和优化**
   - 实现路径布尔运算（集成外部库）
   - 完善SVG解析和生成
   - 优化文本渲染性能
   - 添加更多导出格式支持

2. **测试和调试**
   - 完善单元测试覆盖
   - 进行集成测试
   - 修复发现的问题
   - 优化性能

3. **文档编写**
   - 编写API文档
   - 创建使用示例
   - 更新用户指南

### 第四周任务

1. **性能优化**
   - 优化路径渲染性能
   - 优化文本编辑性能
   - 优化导入导出性能
   - 内存使用优化

2. **功能验证**
   - 复杂路径编辑测试
   - 富文本编辑测试
   - 导入导出兼容性测试
   - 大文件处理测试

3. **最终测试和发布准备**
   - 全面回归测试
   - 用户体验优化
   - 准备发布版本
   - 更新CHANGELOG

## 验收标准

### 路径编辑器
- [ ] 贝塞尔曲线控制点编辑
- [ ] 路径简化和平滑算法
- [ ] SVG路径导入导出
- [ ] 控制点类型管理（角点、平滑点、对称点）
- [ ] 路径布尔运算（需要外部库支持）
- [ ] 实时预览和编辑反馈

### 文本编辑增强
- [ ] 富文本格式支持（粗体、斜体、下划线、颜色等）
- [ ] 文本选择和光标管理
- [ ] 字体加载和管理
- [ ] 行高和段落格式
- [ ] 文本装饰（下划线、删除线）
- [ ] 背景色支持

### 导入导出系统
- [ ] SVG导入导出（兼容性 > 90%）
- [ ] PNG/JPEG高质量导出
- [ ] JSON场景序列化和反序列化
- [ ] 批量导入导出支持
- [ ] 导出选项（尺寸、质量、背景色等）
- [ ] 高DPI导出支持

这个第四阶段实施指南详细说明了如何实现高级功能。按照这个指南逐步实施，可以为Sky Canvas添加强大的路径编辑、富文本和导入导出功能。