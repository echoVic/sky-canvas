/**
 * 选择视图
 * 负责渲染选择框、控制点、变换手柄等
 */

import { ShapeEntity } from '../models/entities/Shape';
import { ISelectionState, IViewportState } from '../viewmodels/interfaces/IViewModel';

/**
 * 获取形状边界的工具函数
 */
function getShapeBounds(shape: ShapeEntity): { x: number; y: number; width: number; height: number } {
  const { position } = shape.transform;
  
  switch (shape.type) {
    case 'rectangle':
      return {
        x: position.x,
        y: position.y,
        width: shape.size.width,
        height: shape.size.height
      };
    case 'circle':
      const diameter = shape.radius * 2;
      return {
        x: position.x - shape.radius,
        y: position.y - shape.radius,
        width: diameter,
        height: diameter
      };
    case 'text':
      // 文本边界的简化计算，实际应该基于字体大小和内容
      const textWidth = shape.content.length * shape.fontSize * 0.6;
      const textHeight = shape.fontSize;
      return {
        x: position.x,
        y: position.y,
        width: textWidth,
        height: textHeight
      };
    case 'path':
      // 路径边界的简化计算，实际应该解析 SVG path data
      return {
        x: position.x,
        y: position.y,
        width: 100, // 默认值
        height: 100  // 默认值
      };
    default:
      return {
        x: position.x,
        y: position.y,
        width: 100,
        height: 100
      };
  }
}

export interface ISelectionViewConfig {
  selectionColor?: string;
  selectionLineWidth?: number;
  handleColor?: string;
  handleSize?: number;
  handleBorderColor?: string;
  rotateHandleColor?: string;
  dashPattern?: number[];
}

export interface IControlHandle {
  type: 'resize' | 'rotate' | 'move';
  position: 'nw' | 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w' | 'center' | 'rotate';
  x: number;
  y: number;
  cursor: string;
}

export class SelectionView {
  private config: ISelectionViewConfig = {};

  constructor(config: ISelectionViewConfig = {}) {
    this.config = {
      selectionColor: '#007AFF',
      selectionLineWidth: 2,
      handleColor: '#FFFFFF',
      handleSize: 8,
      handleBorderColor: '#007AFF',
      rotateHandleColor: '#00C853',
      dashPattern: [5, 5],
      ...config
    };
  }

  /**
   * 渲染选择状态
   */
  render(ctx: CanvasRenderingContext2D, selection: ISelectionState, shapes: ShapeEntity[], viewport: IViewportState): void {
    if (!selection.selectionBounds || selection.selectedShapeIds.length === 0) {
      return;
    }

    ctx.save();
    
    // 应用视口变换
    ctx.translate(viewport.x, viewport.y);
    ctx.scale(viewport.zoom, viewport.zoom);

    const selectedShapes = shapes.filter(shape => selection.selectedShapeIds.includes(shape.id));

    if (selectedShapes.length === 1) {
      // 单选：显示详细的控制手柄
      this.renderSingleSelection(ctx, selectedShapes[0], viewport);
    } else if (selectedShapes.length > 1) {
      // 多选：显示组合选择框
      this.renderMultipleSelection(ctx, selection.selectionBounds, viewport);
    }

    ctx.restore();
  }

  /**
   * 渲染单个形状选择
   */
  private renderSingleSelection(ctx: CanvasRenderingContext2D, shape: ShapeEntity, viewport: IViewportState): void {
    const bounds = getShapeBounds(shape);
    
    // 绘制选择框
    this.drawSelectionBounds(ctx, bounds);
    
    // 绘制控制手柄
    const handles = this.getControlHandles(bounds);
    this.drawControlHandles(ctx, handles, viewport);
    
    // 绘制旋转手柄
    this.drawRotationHandle(ctx, bounds, viewport);
  }

  /**
   * 渲染多选择框
   */
  private renderMultipleSelection(ctx: CanvasRenderingContext2D, bounds: { x: number; y: number; width: number; height: number }, viewport: IViewportState): void {
    // 绘制选择框
    this.drawSelectionBounds(ctx, bounds);
    
    // 绘制角落控制手柄（只显示缩放手柄）
    const handles = this.getControlHandles(bounds).filter(handle => 
      ['nw', 'ne', 'se', 'sw'].includes(handle.position)
    );
    this.drawControlHandles(ctx, handles, viewport);
  }

  /**
   * 绘制选择边界
   */
  private drawSelectionBounds(ctx: CanvasRenderingContext2D, bounds: { x: number; y: number; width: number; height: number }): void {
    ctx.strokeStyle = this.config.selectionColor!;
    ctx.lineWidth = this.config.selectionLineWidth!;
    ctx.setLineDash(this.config.dashPattern!);
    
    ctx.strokeRect(bounds.x, bounds.y, bounds.width, bounds.height);
    
    // 重置虚线样式
    ctx.setLineDash([]);
  }

  /**
   * 获取控制手柄位置
   */
  private getControlHandles(bounds: { x: number; y: number; width: number; height: number }): IControlHandle[] {
    const { x, y, width, height } = bounds;
    const halfWidth = width / 2;
    const halfHeight = height / 2;

    return [
      // 角落手柄（缩放）
      { type: 'resize', position: 'nw', x: x, y: y, cursor: 'nw-resize' },
      { type: 'resize', position: 'ne', x: x + width, y: y, cursor: 'ne-resize' },
      { type: 'resize', position: 'se', x: x + width, y: y + height, cursor: 'se-resize' },
      { type: 'resize', position: 'sw', x: x, y: y + height, cursor: 'sw-resize' },
      
      // 边缘手柄（缩放）
      { type: 'resize', position: 'n', x: x + halfWidth, y: y, cursor: 'n-resize' },
      { type: 'resize', position: 'e', x: x + width, y: y + halfHeight, cursor: 'e-resize' },
      { type: 'resize', position: 's', x: x + halfWidth, y: y + height, cursor: 's-resize' },
      { type: 'resize', position: 'w', x: x, y: y + halfHeight, cursor: 'w-resize' },
      
      // 中心手柄（移动）
      { type: 'move', position: 'center', x: x + halfWidth, y: y + halfHeight, cursor: 'move' }
    ];
  }

  /**
   * 绘制控制手柄
   */
  private drawControlHandles(ctx: CanvasRenderingContext2D, handles: IControlHandle[], viewport: IViewportState): void {
    const handleSize = this.config.handleSize! / viewport.zoom; // 根据缩放调整手柄大小
    const halfSize = handleSize / 2;

    ctx.fillStyle = this.config.handleColor!;
    ctx.strokeStyle = this.config.handleBorderColor!;
    ctx.lineWidth = 1 / viewport.zoom;

    for (const handle of handles) {
      const { x, y } = handle;
      
      // 绘制正方形手柄
      ctx.fillRect(x - halfSize, y - halfSize, handleSize, handleSize);
      ctx.strokeRect(x - halfSize, y - halfSize, handleSize, handleSize);
    }
  }

  /**
   * 绘制旋转手柄
   */
  private drawRotationHandle(ctx: CanvasRenderingContext2D, bounds: { x: number; y: number; width: number; height: number }, viewport: IViewportState): void {
    const { x, y, width } = bounds;
    const centerX = x + width / 2;
    const rotateY = y - 20 / viewport.zoom; // 在选择框上方
    const handleRadius = 4 / viewport.zoom;

    // 绘制连接线
    ctx.strokeStyle = this.config.handleBorderColor!;
    ctx.lineWidth = 1 / viewport.zoom;
    ctx.beginPath();
    ctx.moveTo(centerX, y);
    ctx.lineTo(centerX, rotateY);
    ctx.stroke();

    // 绘制旋转手柄
    ctx.fillStyle = this.config.rotateHandleColor!;
    ctx.strokeStyle = this.config.handleBorderColor!;
    ctx.beginPath();
    ctx.arc(centerX, rotateY, handleRadius, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }

  /**
   * 命中测试控制手柄
   */
  hitTestHandle(point: { x: number; y: number }, selection: ISelectionState, shapes: ShapeEntity[], viewport: IViewportState): IControlHandle | null {
    if (!selection.selectionBounds || selection.selectedShapeIds.length === 0) {
      return null;
    }

    const selectedShapes = shapes.filter(shape => selection.selectedShapeIds.includes(shape.id));
    if (selectedShapes.length !== 1) {
      // 多选情况下的简化处理
      return null;
    }

    const bounds = getShapeBounds(selectedShapes[0]);
    const handles = this.getControlHandles(bounds);
    const handleSize = this.config.handleSize! / viewport.zoom;
    const halfSize = handleSize / 2;

    // 转换点击点到世界坐标
    const worldPoint = {
      x: (point.x - viewport.x) / viewport.zoom,
      y: (point.y - viewport.y) / viewport.zoom
    };

    // 检查旋转手柄
    const rotateHandleX = bounds.x + bounds.width / 2;
    const rotateHandleY = bounds.y - 20 / viewport.zoom;
    const rotateRadius = 4 / viewport.zoom;
    
    const distToRotate = Math.sqrt(
      Math.pow(worldPoint.x - rotateHandleX, 2) + 
      Math.pow(worldPoint.y - rotateHandleY, 2)
    );
    
    if (distToRotate <= rotateRadius) {
      return { 
        type: 'rotate', 
        position: 'rotate', 
        x: rotateHandleX, 
        y: rotateHandleY, 
        cursor: 'crosshair' 
      };
    }

    // 检查其他控制手柄
    for (const handle of handles) {
      if (worldPoint.x >= handle.x - halfSize && 
          worldPoint.x <= handle.x + halfSize &&
          worldPoint.y >= handle.y - halfSize && 
          worldPoint.y <= handle.y + halfSize) {
        return handle;
      }
    }

    return null;
  }

  /**
   * 渲染选择拖拽框（框选时的临时选择框）
   */
  renderSelectionDrag(ctx: CanvasRenderingContext2D, startPoint: { x: number; y: number }, endPoint: { x: number; y: number }, viewport: IViewportState): void {
    const x = Math.min(startPoint.x, endPoint.x);
    const y = Math.min(startPoint.y, endPoint.y);
    const width = Math.abs(endPoint.x - startPoint.x);
    const height = Math.abs(endPoint.y - startPoint.y);

    ctx.save();
    
    // 应用视口变换
    ctx.translate(viewport.x, viewport.y);
    ctx.scale(viewport.zoom, viewport.zoom);

    // 绘制选择框
    ctx.strokeStyle = this.config.selectionColor!;
    ctx.lineWidth = this.config.selectionLineWidth! / viewport.zoom;
    ctx.setLineDash([3, 3]);
    ctx.strokeRect(x, y, width, height);

    // 绘制半透明填充
    ctx.fillStyle = this.config.selectionColor! + '20'; // 添加透明度
    ctx.fillRect(x, y, width, height);

    ctx.restore();
  }

  /**
   * 更新配置
   */
  updateConfig(config: Partial<ISelectionViewConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * 获取配置
   */
  getConfig(): ISelectionViewConfig {
    return { ...this.config };
  }

  /**
   * 销毁视图
   */
  dispose(): void {
    // 清理资源
  }
}