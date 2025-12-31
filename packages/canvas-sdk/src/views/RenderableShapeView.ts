/**
 * 可渲染的形状视图
 * MVVM 中的 View 层 - 实现 IRenderable，知道如何渲染 Model 数据
 */

import { IGraphicsContext, IPoint, IRect, IRenderable } from '@sky-canvas/render-engine';
import {
  ICircleEntity,
  IPathEntity,
  IRectangleEntity,
  ITextEntity,
  ShapeEntity
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
      this.applyTransform(context);
      this.applyStyle(context);
      this.renderByType(context);
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
        console.warn(`Unknown shape type: ${(this.entity as any).type}`);
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
      context.beginPath();
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
    context.arc(x + width - radius, y + radius, radius, -Math.PI / 2, 0);
    context.lineTo(x + width, y + height - radius);
    context.arc(x + width - radius, y + height - radius, radius, 0, Math.PI / 2);
    context.lineTo(x + radius, y + height);
    context.arc(x + radius, y + height - radius, radius, Math.PI / 2, Math.PI);
    context.lineTo(x, y + radius);
    context.arc(x + radius, y + radius, radius, Math.PI, -Math.PI / 2);
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

    context.beginPath();
    this.parseSVGPath(context, pathData);

    if (closed) {
      context.closePath();
    }

    this.fillAndStroke(context);
  }

  /**
   * 解析简化的 SVG 路径数据
   * 支持: M(移动), L(直线), Q(二次曲线), C(三次曲线), Z(闭合)
   */
  private parseSVGPath(context: IGraphicsContext, pathData: string): void {
    const commands = pathData.match(/[MLHVCSQTAZ][^MLHVCSQTAZ]*/gi);
    if (!commands) return;

    let currentX = 0;
    let currentY = 0;

    for (const cmd of commands) {
      const type = cmd[0].toUpperCase();
      const isRelative = cmd[0] === cmd[0].toLowerCase();
      const args = cmd.slice(1).trim().split(/[\s,]+/).map(Number);

      switch (type) {
        case 'M': {
          const x = isRelative ? currentX + args[0] : args[0];
          const y = isRelative ? currentY + args[1] : args[1];
          context.moveTo(x, y);
          currentX = x;
          currentY = y;
          break;
        }
        case 'L': {
          const x = isRelative ? currentX + args[0] : args[0];
          const y = isRelative ? currentY + args[1] : args[1];
          context.lineTo(x, y);
          currentX = x;
          currentY = y;
          break;
        }
        case 'H': {
          const x = isRelative ? currentX + args[0] : args[0];
          context.lineTo(x, currentY);
          currentX = x;
          break;
        }
        case 'V': {
          const y = isRelative ? currentY + args[0] : args[0];
          context.lineTo(currentX, y);
          currentY = y;
          break;
        }
        case 'Q': {
          const cpx = isRelative ? currentX + args[0] : args[0];
          const cpy = isRelative ? currentY + args[1] : args[1];
          const x = isRelative ? currentX + args[2] : args[2];
          const y = isRelative ? currentY + args[3] : args[3];
          context.quadraticCurveTo(cpx, cpy, x, y);
          currentX = x;
          currentY = y;
          break;
        }
        case 'C': {
          const cp1x = isRelative ? currentX + args[0] : args[0];
          const cp1y = isRelative ? currentY + args[1] : args[1];
          const cp2x = isRelative ? currentX + args[2] : args[2];
          const cp2y = isRelative ? currentY + args[3] : args[3];
          const x = isRelative ? currentX + args[4] : args[4];
          const y = isRelative ? currentY + args[5] : args[5];
          context.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, x, y);
          currentX = x;
          currentY = y;
          break;
        }
        case 'Z': {
          context.closePath();
          break;
        }
      }
    }
  }

  /**
   * 填充和描边
   * 注意：fill() 会清空路径，所以需要先描边再填充，或者重新构建路径
   */
  private fillAndStroke(context: IGraphicsContext): void {
    const hasFill = !!this.entity.style.fillColor;
    const hasStroke = !!this.entity.style.strokeColor;
    
    if (hasFill && hasStroke) {
      context.fill();
      this.rebuildPath(context);
      context.stroke();
    } else if (hasFill) {
      context.fill();
    } else if (hasStroke) {
      context.stroke();
    }
  }

  /**
   * 重新构建当前形状的路径（用于 fill 后需要 stroke 的情况）
   */
  private rebuildPath(context: IGraphicsContext): void {
    switch (this.entity.type) {
      case 'rectangle': {
        const rect = this.entity as IRectangleEntity;
        const { size, borderRadius } = rect;
        if (borderRadius && borderRadius > 0) {
          this.renderRoundedRect(context, 0, 0, size.width, size.height, borderRadius);
        } else {
          context.beginPath();
          context.rect(0, 0, size.width, size.height);
        }
        break;
      }
      case 'circle': {
        const circle = this.entity as ICircleEntity;
        context.beginPath();
        context.arc(0, 0, circle.radius, 0, Math.PI * 2);
        break;
      }
      case 'path': {
        const path = this.entity as IPathEntity;
        context.beginPath();
        this.parseSVGPath(context, path.pathData);
        if (path.closed) {
          context.closePath();
        }
        break;
      }
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