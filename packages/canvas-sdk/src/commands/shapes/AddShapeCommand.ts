/**
 * 添加形状命令
 */

import { Shape } from '@sky-canvas/render-engine';
import { ShapeData } from '../../actions/types';
import { CanvasModel } from '../../models/CanvasModel';
import { ChangeDescription, SyncCommand } from '../base';

/**
 * 添加形状命令
 * 负责创建和添加新形状到画布
 */
export class AddShapeCommand extends SyncCommand {
  private shape: Shape;
  private shapeId: string;

  constructor(model: CanvasModel, shapeData: ShapeData) {
    super(model, `Add ${shapeData.type}`);

    // 创建 Shape 实例（前端不感知具体实现）
    this.shape = this.createShape(shapeData);
    this.shapeId = this.shape.id;
  }

  execute(): void {
    this.model.addShape(this.shape);
    this.markAsExecuted();
  }

  undo(): void {
    this.model.removeShape(this.shapeId);
    this.markAsNotExecuted();
  }

  /**
   * 获取变更描述
   */
  getChangeDescription(): ChangeDescription {
    return {
      type: 'shape-added',
      shapeId: this.shapeId,
      data: {
        shapeType: this.shape.constructor.name,
        x: this.shape.x,
        y: this.shape.y
      },
      timestamp: Date.now()
    };
  }

  /**
   * 创建形状实例
   * 根据形状数据创建对应的 Shape 对象
   */
  private createShape(data: ShapeData): Shape {
    // 生成唯一ID
    const id = data.id || this.generateId();

    // 根据类型创建不同的形状
    switch (data.type) {
      case 'rectangle': {
        // 动态导入避免前端感知
        const { Rectangle } = require('@sky-canvas/render-engine');
        return new Rectangle({
          id,
          x: data.x,
          y: data.y,
          width: data.width || 100,
          height: data.height || 60,
          fill: data.style?.fill || '#3b82f6',
          stroke: data.style?.stroke || '#1e40af',
          strokeWidth: data.style?.strokeWidth || 2,
          opacity: data.style?.opacity || 1,
          visible: data.visible !== false,
          zIndex: data.zIndex || 0
        });
      }

      case 'circle': {
        const { Circle } = require('@sky-canvas/render-engine');
        return new Circle({
          id,
          x: data.x,
          y: data.y,
          radius: data.radius || 30,
          fill: data.style?.fill || '#10b981',
          stroke: data.style?.stroke || '#059669',
          strokeWidth: data.style?.strokeWidth || 2,
          opacity: data.style?.opacity || 1,
          visible: data.visible !== false,
          zIndex: data.zIndex || 0
        });
      }

      case 'diamond': {
        const { Diamond } = require('@sky-canvas/render-engine');
        return new Diamond({
          id,
          x: data.x,
          y: data.y,
          width: data.width || 80,
          height: data.height || 80,
          fill: data.style?.fill || '#f59e0b',
          stroke: data.style?.stroke || '#d97706',
          strokeWidth: data.style?.strokeWidth || 2,
          opacity: data.style?.opacity || 1,
          visible: data.visible !== false,
          zIndex: data.zIndex || 0
        });
      }

      case 'text': {
        // Text 类暂不可用，使用 Rectangle 作为占位符
        const { Rectangle } = require('@sky-canvas/render-engine');
        const textRect = new Rectangle(data.x, data.y, (data.text || 'Text').length * 8, 20);
        textRect.id = id;
        (textRect as any).text = data.text || 'Text'; // 添加文本属性用于后续处理
        textRect.style.fill = data.style?.fill || '#374151';
        textRect.style.opacity = data.style?.opacity || 1;
        textRect.visible = data.visible !== false;
        textRect.zIndex = data.zIndex || 0;
        return textRect;
      }

      case 'path': {
        const { Path } = require('@sky-canvas/render-engine');
        return new Path({
          id,
          x: data.x,
          y: data.y,
          points: [], // 路径点数组
          fill: data.style?.fill || 'transparent',
          stroke: data.style?.stroke || '#374151',
          strokeWidth: data.style?.strokeWidth || 2,
          opacity: data.style?.opacity || 1,
          visible: data.visible !== false,
          zIndex: data.zIndex || 0
        });
      }

      default:
        throw new Error(`Unknown shape type: ${data.type}`);
    }
  }

  /**
   * 生成唯一ID
   */
  private generateId(): string {
    return `shape_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * 获取创建的形状
   */
  getShape(): Shape {
    return this.shape;
  }

  /**
   * 获取形状ID
   */
  getShapeId(): string {
    return this.shapeId;
  }
}