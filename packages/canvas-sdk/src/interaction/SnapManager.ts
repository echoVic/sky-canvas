import { IPoint, IRect } from '@sky-canvas/render-engine';
import { IShape } from '../scene/IShape';

/**
 * 捕捉结果接口
 */
export interface SnapResult {
  position: IPoint;
  type: 'grid' | 'object' | 'guide' | 'none';
  target?: IPoint | IShape; // 捕捉目标
  distance?: number; // 捕捉距离
}

/**
 * 智能捕捉管理器
 */
export class SnapManager {
  private snapDistance: number = 10; // 捕捉距离（像素）
  private gridSize: number = 20; // 网格大小
  private enabledSnapTypes: Set<'grid' | 'objects' | 'guides'> = new Set(['grid', 'objects']);
  private guideLines: { x: number[]; y: number[] } = { x: [], y: [] }; // 参考线
  
  /**
   * 设置捕捉距离
   */
  setSnapDistance(distance: number): void {
    this.snapDistance = Math.max(1, distance);
  }
  
  /**
   * 获取捕捉距离
   */
  getSnapDistance(): number {
    return this.snapDistance;
  }
  
  /**
   * 设置网格大小
   */
  setGridSize(size: number): void {
    this.gridSize = Math.max(1, size);
  }
  
  /**
   * 获取网格大小
   */
  getGridSize(): number {
    return this.gridSize;
  }
  
  /**
   * 启用网格捕捉
   */
  enableGridSnap(enabled: boolean): void {
    if (enabled) {
      this.enabledSnapTypes.add('grid');
    } else {
      this.enabledSnapTypes.delete('grid');
    }
  }
  
  /**
   * 启用对象捕捉
   */
  enableObjectSnap(enabled: boolean): void {
    if (enabled) {
      this.enabledSnapTypes.add('objects');
    } else {
      this.enabledSnapTypes.delete('objects');
    }
  }
  
  /**
   * 启用参考线捕捉
   */
  enableGuideSnap(enabled: boolean): void {
    if (enabled) {
      this.enabledSnapTypes.add('guides');
    } else {
      this.enabledSnapTypes.delete('guides');
    }
  }
  
  /**
   * 设置参考线
   */
  setGuideLines(xLines: number[], yLines: number[]): void {
    this.guideLines = { x: xLines, y: yLines };
  }
  
  /**
   * 获取捕捉位置
   */
  getSnapPosition(position: IPoint, shapes: IShape[]): SnapResult {
    let bestSnap: SnapResult = {
      position: { ...position },
      type: 'none'
    };
    
    let minDistance = this.snapDistance;
    
    // 网格捕捉
    if (this.enabledSnapTypes.has('grid')) {
      const gridSnap = this.getGridSnap(position);
      if (gridSnap.distance !== undefined && gridSnap.distance < minDistance) {
        minDistance = gridSnap.distance;
        bestSnap = gridSnap;
      }
    }
    
    // 对象捕捉
    if (this.enabledSnapTypes.has('objects')) {
      const objectSnap = this.getObjectSnap(position, shapes);
      if (objectSnap.distance !== undefined && objectSnap.distance < minDistance) {
        minDistance = objectSnap.distance;
        bestSnap = objectSnap;
      }
    }
    
    // 参考线捕捉
    if (this.enabledSnapTypes.has('guides')) {
      const guideSnap = this.getGuideSnap(position);
      if (guideSnap.distance !== undefined && guideSnap.distance < minDistance) {
        minDistance = guideSnap.distance;
        bestSnap = guideSnap;
      }
    }
    
    return bestSnap;
  }
  
  /**
   * 网格捕捉
   */
  private getGridSnap(position: IPoint): SnapResult {
    const gridSize = this.gridSize;
    const halfGrid = gridSize / 2;
    
    // 计算最近的网格点
    const gridX = Math.round(position.x / gridSize) * gridSize;
    const gridY = Math.round(position.y / gridSize) * gridSize;
    
    // 计算距离
    const dx = position.x - gridX;
    const dy = position.y - gridY;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    if (distance <= this.snapDistance) {
      return {
        position: { x: gridX, y: gridY },
        type: 'grid',
        distance: distance
      };
    }
    
    return {
      position: { ...position },
      type: 'none',
      distance: Infinity
    };
  }
  
  /**
   * 对象捕捉
   */
  private getObjectSnap(position: IPoint, shapes: IShape[]): SnapResult {
    let bestSnap: SnapResult = {
      position: { ...position },
      type: 'none',
      distance: Infinity
    };
    
    for (const shape of shapes) {
      if (!shape.visible) continue;
      
      const bounds = shape.getBounds();
      
      // 定义要捕捉的点：角点、中点、中心点
      const snapPoints: IPoint[] = [
        // 角点
        { x: bounds.x, y: bounds.y }, // 左上
        { x: bounds.x + bounds.width, y: bounds.y }, // 右上
        { x: bounds.x, y: bounds.y + bounds.height }, // 左下
        { x: bounds.x + bounds.width, y: bounds.y + bounds.height }, // 右下
        
        // 中点
        { x: bounds.x + bounds.width / 2, y: bounds.y }, // 上中
        { x: bounds.x + bounds.width / 2, y: bounds.y + bounds.height }, // 下中
        { x: bounds.x, y: bounds.y + bounds.height / 2 }, // 左中
        { x: bounds.x + bounds.width, y: bounds.y + bounds.height / 2 }, // 右中
        
        // 中心点
        { x: bounds.x + bounds.width / 2, y: bounds.y + bounds.height / 2 }
      ];
      
      for (const point of snapPoints) {
        const dx = position.x - point.x;
        const dy = position.y - point.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance <= this.snapDistance && distance < (bestSnap.distance || Infinity)) {
          bestSnap = {
            position: { ...point },
            type: 'object',
            target: point,
            distance: distance
          };
        }
      }
    }
    
    return bestSnap;
  }
  
  /**
   * 参考线捕捉
   */
  private getGuideSnap(position: IPoint): SnapResult {
    let bestSnap: SnapResult = {
      position: { ...position },
      type: 'none',
      distance: Infinity
    };
    
    // X轴参考线捕捉
    for (const x of this.guideLines.x) {
      const distance = Math.abs(position.x - x);
      if (distance <= this.snapDistance && distance < (bestSnap.distance || Infinity)) {
        bestSnap = {
          position: { x: x, y: position.y },
          type: 'guide',
          target: { x: x, y: 0 },
          distance: distance
        };
      }
    }
    
    // Y轴参考线捕捉
    for (const y of this.guideLines.y) {
      const distance = Math.abs(position.y - y);
      if (distance <= this.snapDistance && distance < (bestSnap.distance || Infinity)) {
        bestSnap = {
          position: { x: position.x, y: y },
          type: 'guide',
          target: { x: 0, y: y },
          distance: distance
        };
      }
    }
    
    return bestSnap;
  }
  
  /**
   * 渲染捕捉辅助线
   */
  renderSnapGuides(context: CanvasRenderingContext2D, currentPosition: IPoint): void {
    context.save();
    context.strokeStyle = 'rgba(0, 122, 204, 0.7)';
    context.lineWidth = 1;
    context.setLineDash([5, 5]);
    
    // 渲染网格线（如果启用了网格捕捉）
    if (this.enabledSnapTypes.has('grid')) {
      this.renderGridLines(context, currentPosition);
    }
    
    // 渲染参考线（如果启用了参考线捕捉）
    if (this.enabledSnapTypes.has('guides')) {
      this.renderGuideLines(context);
    }
    
    context.restore();
  }
  
  /**
   * 渲染网格线
   */
  private renderGridLines(context: CanvasRenderingContext2D, currentPosition: IPoint): void {
    const gridSize = this.gridSize;
    
    // 计算视口范围
    const canvas = context.canvas;
    const width = canvas.width;
    const height = canvas.height;
    
    // 绘制垂直网格线
    for (let x = 0; x <= width; x += gridSize) {
      context.beginPath();
      context.moveTo(x, 0);
      context.lineTo(x, height);
      context.stroke();
    }
    
    // 绘制水平网格线
    for (let y = 0; y <= height; y += gridSize) {
      context.beginPath();
      context.moveTo(0, y);
      context.lineTo(width, y);
      context.stroke();
    }
  }
  
  /**
   * 渲染参考线
   */
  private renderGuideLines(context: CanvasRenderingContext2D): void {
    // 绘制垂直参考线
    for (const x of this.guideLines.x) {
      context.beginPath();
      context.moveTo(x, 0);
      context.lineTo(x, context.canvas.height);
      context.stroke();
    }
    
    // 绘制水平参考线
    for (const y of this.guideLines.y) {
      context.beginPath();
      context.moveTo(0, y);
      context.lineTo(context.canvas.width, y);
      context.stroke();
    }
  }
  
  /**
   * 检查是否启用了任何捕捉类型
   */
  isSnapEnabled(): boolean {
    return this.enabledSnapTypes.size > 0;
  }
  
  /**
   * 获取启用的捕捉类型
   */
  getEnabledSnapTypes(): ('grid' | 'objects' | 'guides')[] {
    return Array.from(this.enabledSnapTypes);
  }
}