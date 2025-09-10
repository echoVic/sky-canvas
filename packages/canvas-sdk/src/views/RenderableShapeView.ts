/**
 * 可渲染的形状视图
 * MVVM 中的 View 层 - 实现 IRenderable，知道如何渲染 Model 数据
 */

import { IRenderable, IGraphicsContext, IRect, IPoint } from '@sky-canvas/render-engine';
import { 
  ShapeEntity, 
  IRectangleEntity, 
  ICircleEntity, 
  ITextEntity, 
  IPathEntity 
} from '../models/entities/Shape';

/**
 * 形状视图包装器 - 将数据模型包装为可渲染对象
 * 这是 MVVM 中 View 层的正确实现
 */
export class RenderableShapeView implements IRenderable {
  constructor(
    private entity: ShapeEntity,
    private isSelected: boolean = false,
    private isHovered: boolean = false
  ) {}

  get id(): string {
    return this.entity.id;
  }

  get visible(): boolean {
    return this.entity.visible;
  }

  get zIndex(): number {
    return this.entity.zIndex;
  }

  get bounds(): IRect {
    return this.calculateBounds();
  }

  /**
   * 渲染方法 - View 层的核心职责
   */
  render(context: IGraphicsContext): void {
    if (!this.visible) return;

    context.save();

    try {
      // 应用变换
      this.applyTransform(context);
      
      // 应用样式
      this.applyStyle(context);
      
      // 根据类型渲染
      this.renderByType(context);
      
      // 渲染状态装饰（选中、悬停等）
      this.renderStateDecorations(context);
      
    } finally {
      context.restore();
    }
  }

  /**
   * 应用形状变换
   */
  private applyTransform(context: IGraphicsContext): void {
    const { position, rotation, scale } = this.entity.transform;
    
    context.translate(position.x, position.y);
    
    if (rotation !== 0) {
      context.rotate(rotation);
    }
    
    if (scale.x !== 1 || scale.y !== 1) {
      context.scale(scale.x, scale.y);
    }
  }

  /**
   * 应用形状样式
   */
  private applyStyle(context: IGraphicsContext): void {
    const { style } = this.entity;
    
    if (style.fillColor) {
      context.setFillStyle(style.fillColor);
    }
    
    if (style.strokeColor) {
      context.setStrokeStyle(style.strokeColor);
      context.setLineWidth(style.strokeWidth || 1);
    }
    
    if (style.opacity !== undefined && style.opacity < 1) {
      context.setOpacity(style.opacity);
    }
  }

  /**
   * 根据形状类型渲染
   */
  private renderByType(context: IGraphicsContext): void {
    switch (this.entity.type) {
      case 'rectangle':
        this.renderRectangle(context, this.entity as IRectangleEntity);
        break;
      case 'circle':
        this.renderCircle(context, this.entity as ICircleEntity);
        break;
      case 'text':
        this.renderText(context, this.entity as ITextEntity);
        break;
      case 'path':
        this.renderPath(context, this.entity as IPathEntity);
        break;
      default:
        console.warn(`Unknown shape type: ${this.entity.type}`);
    }
  }

  /**
   * 渲染矩形
   */
  private renderRectangle(context: IGraphicsContext, rect: IRectangleEntity): void {
    const { size, borderRadius } = rect;
    
    if (borderRadius && borderRadius > 0) {
      this.renderRoundedRect(context, 0, 0, size.width, size.height, borderRadius);
    } else {
      context.rect(0, 0, size.width, size.height);
    }
    
    this.fillAndStroke(context);
  }

  /**
   * 渲染圆角矩形
   */
  private renderRoundedRect(context: IGraphicsContext, x: number, y: number, width: number, height: number, radius: number): void {
    context.beginPath();
    context.moveTo(x + radius, y);
    context.lineTo(x + width - radius, y);
    context.arcTo(x + width, y, x + width, y + radius, radius);
    context.lineTo(x + width, y + height - radius);
    context.arcTo(x + width, y + height, x + width - radius, y + height, radius);
    context.lineTo(x + radius, y + height);
    context.arcTo(x, y + height, x, y + height - radius, radius);
    context.lineTo(x, y + radius);
    context.arcTo(x, y, x + radius, y, radius);
    context.closePath();
  }

  /**
   * 渲染圆形
   */
  private renderCircle(context: IGraphicsContext, circle: ICircleEntity): void {
    const { radius } = circle;
    
    context.beginPath();
    context.arc(0, 0, radius, 0, Math.PI * 2);
    
    this.fillAndStroke(context);
  }

  /**
   * 渲染文本
   */
  private renderText(context: IGraphicsContext, text: ITextEntity): void {
    const { content, fontSize, fontFamily, fontWeight, textAlign } = text;
    
    // 设置字体
    const font = `${fontWeight || 'normal'} ${fontSize}px ${fontFamily}`;
    context.setFont(font);
    context.setTextAlign(textAlign || 'left');
    
    // 渲染文本
    if (this.entity.style.fillColor) {
      context.fillText(content, 0, 0);
    }
    
    if (this.entity.style.strokeColor) {
      context.strokeText(content, 0, 0);
    }
  }

  /**
   * 渲染路径
   */
  private renderPath(context: IGraphicsContext, path: IPathEntity): void {
    const { pathData, closed } = path;
    
    // TODO: 实现完整的 SVG path 解析
    // 这里简化处理
    context.beginPath();
    // 解析 pathData 并绘制路径
    
    if (closed) {
      context.closePath();
    }
    
    this.fillAndStroke(context);
  }

  /**
   * 填充和描边
   */
  private fillAndStroke(context: IGraphicsContext): void {
    if (this.entity.style.fillColor) {
      context.fill();
    }
    
    if (this.entity.style.strokeColor) {
      context.stroke();
    }
  }

  /**
   * 渲染状态装饰（选中框、悬停效果等）
   */
  private renderStateDecorations(context: IGraphicsContext): void {
    if (this.isSelected) {
      this.renderSelectionBox(context);
    }
    
    if (this.isHovered) {
      this.renderHoverEffect(context);
    }
  }

  /**
   * 渲染选中框
   */
  private renderSelectionBox(context: IGraphicsContext): void {
    const bounds = this.calculateLocalBounds();
    const padding = 2;
    
    context.save();
    context.setStrokeStyle('#3b82f6');
    context.setLineWidth(2);
    context.setLineDash([5, 5]);
    
    context.strokeRect(
      bounds.x - padding, 
      bounds.y - padding, 
      bounds.width + padding * 2, 
      bounds.height + padding * 2
    );
    
    context.restore();
  }

  /**
   * 渲染悬停效果
   */
  private renderHoverEffect(context: IGraphicsContext): void {
    // 简单的悬停高亮效果
    context.save();
    context.setGlobalAlpha(0.1);
    context.setFillStyle('#3b82f6');
    
    const bounds = this.calculateLocalBounds();
    context.fillRect(bounds.x, bounds.y, bounds.width, bounds.height);
    
    context.restore();
  }

  /**
   * 计算边界框
   */
  private calculateBounds(): IRect {
    const { position } = this.entity.transform;
    const localBounds = this.calculateLocalBounds();
    
    return {
      x: position.x + localBounds.x,
      y: position.y + localBounds.y,
      width: localBounds.width * this.entity.transform.scale.x,
      height: localBounds.height * this.entity.transform.scale.y
    };
  }

  /**
   * 计算本地边界框（变换前）
   */
  private calculateLocalBounds(): IRect {
    switch (this.entity.type) {
      case 'rectangle': {
        const rect = this.entity as IRectangleEntity;
        return { x: 0, y: 0, width: rect.size.width, height: rect.size.height };
      }
      case 'circle': {
        const circle = this.entity as ICircleEntity;
        const r = circle.radius;
        return { x: -r, y: -r, width: r * 2, height: r * 2 };
      }
      case 'text': {
        const text = this.entity as ITextEntity;
        const width = text.content.length * text.fontSize * 0.6;
        const height = text.fontSize;
        return { x: 0, y: -height, width, height };
      }
      default:
        return { x: 0, y: 0, width: 100, height: 100 };
    }
  }

  /**
   * 点击测试
   */
  hitTest(point: IPoint): boolean {
    const bounds = this.bounds;
    return point.x >= bounds.x && 
           point.x <= bounds.x + bounds.width &&
           point.y >= bounds.y && 
           point.y <= bounds.y + bounds.height;
  }

  /**
   * 获取边界框
   */
  getBounds(): IRect {
    return this.bounds;
  }

  /**
   * 更新实体数据
   */
  updateEntity(entity: ShapeEntity): void {
    this.entity = entity;
  }

  /**
   * 更新选中状态
   */
  setSelected(selected: boolean): void {
    this.isSelected = selected;
  }

  /**
   * 更新悬停状态
   */
  setHovered(hovered: boolean): void {
    this.isHovered = hovered;
  }

  /**
   * 获取实体数据
   */
  getEntity(): ShapeEntity {
    return this.entity;
  }

  /**
   * 销毁视图
   */
  dispose(): void {
    // 清理资源
  }
}