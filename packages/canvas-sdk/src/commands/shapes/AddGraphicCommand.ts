/**
 * 添加图形命令
 */

import { IRenderable } from '@sky-canvas/render-engine';
import { GraphicData } from '../../actions/types';
import { ICanvasModel } from '../../models/CanvasModel';
import { ChangeDescription, SyncCommand } from '../base';

/**
 * 添加图形命令
 * 负责创建和添加新图形到画布
 */
export class AddGraphicCommand extends SyncCommand {
  private graphic: IRenderable;
  private graphicId: string;

  constructor(model: ICanvasModel, graphicData: GraphicData) {
    super(model, `Add ${graphicData.type}`);

    // 创建 IRenderable 实例（前端不感知具体实现）
    this.graphic = this.createGraphic(graphicData);
    this.graphicId = this.graphic.id;
  }

  execute(): void {
    this.model.addGraphic(this.graphic as any);  // 临时类型转换
    this.markAsExecuted();
  }

  undo(): void {
    this.model.removeGraphic(this.graphicId);
    this.markAsNotExecuted();
  }

  /**
   * 获取变更描述
   */
  getChangeDescription(): ChangeDescription {
    return {
      type: 'graphic-added',
      graphicId: this.graphicId,
      data: {
        graphicType: this.graphic.constructor.name,
        x: (this.graphic as any).x,
        y: (this.graphic as any).y
      },
      timestamp: Date.now()
    };
  }

  /**
   * 创建图形实例
   * 根据图形数据创建对应的 IRenderable 对象
   */
  private createGraphic(data: GraphicData): IRenderable {
    // 生成唯一ID
    const id = data.id || this.generateId();

    // 根据类型创建不同的图形
    switch (data.type) {
      case 'rectangle': {
        // 动态导入避免前端感知
        const { Rectangle } = require('@sky-canvas/render-engine');
        return new Rectangle({
          x: data.x,
          y: data.y,
          width: data.width || 100,
          height: data.height || 60,
          style: {
            fill: data.style?.fill || '#3b82f6',
            stroke: data.style?.stroke || '#1e40af',
            strokeWidth: data.style?.strokeWidth || 2,
            opacity: data.style?.opacity || 1
          },
          visible: data.visible !== false,
          zIndex: data.zIndex || 0
        });
      }

      case 'circle': {
        const { Circle } = require('@sky-canvas/render-engine');
        return new Circle({
          x: data.x,
          y: data.y,
          radius: data.radius || 30,
          style: {
            fill: data.style?.fill || '#10b981',
            stroke: data.style?.stroke || '#059669',
            strokeWidth: data.style?.strokeWidth || 2,
            opacity: data.style?.opacity || 1
          },
          visible: data.visible !== false,
          zIndex: data.zIndex || 0
        });
      }

      case 'text': {
        const { Text } = require('@sky-canvas/render-engine');
        return new Text({
          x: data.x,
          y: data.y,
          text: data.text || 'Text',
          fontSize: data.fontSize || 16,
          fontFamily: data.fontFamily || 'Arial',
          style: {
            fill: data.style?.fill || '#374151',
            opacity: data.style?.opacity || 1
          },
          visible: data.visible !== false,
          zIndex: data.zIndex || 0
        });
      }

      case 'line': {
        const { Line } = require('@sky-canvas/render-engine');
        return new Line({
          x: data.x,
          y: data.y,
          x2: data.x2 || data.x + 100,
          y2: data.y2 || data.y,
          style: {
            stroke: data.style?.stroke || '#374151',
            strokeWidth: data.style?.strokeWidth || 2,
            opacity: data.style?.opacity || 1
          },
          visible: data.visible !== false,
          zIndex: data.zIndex || 0
        });
      }

      default:
        throw new Error(`Unknown graphic type: ${data.type}`);
    }
  }

  /**
   * 生成唯一ID
   */
  private generateId(): string {
    return `graphic_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * 获取创建的图形
   */
  getGraphic(): IRenderable {
    return this.graphic;
  }

  /**
   * 获取图形ID
   */
  getGraphicId(): string {
    return this.graphicId;
  }
}