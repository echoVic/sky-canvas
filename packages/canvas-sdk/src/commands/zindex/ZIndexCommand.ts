/**
 * Z-index管理命令
 * 处理形状的层级操作
 */

import { BaseCommand } from '../base';
import { CanvasModel } from '../../models/CanvasModel';
import { Shape } from '@sky-canvas/render-engine';

/**
 * Z-index操作类型
 */
export type ZIndexOperation = 'bring-to-front' | 'send-to-back' | 'bring-forward' | 'send-backward' | 'set-z-index';

/**
 * Z-index命令接口
 */
export interface ZIndexCommandParams {
  operation: ZIndexOperation;
  shapeIds: string[];
  targetZIndex?: number; // 仅用于set-z-index操作
}

/**
 * Z-index命令
 */
export class ZIndexCommand extends BaseCommand {
  private params: ZIndexCommandParams;
  private previousZIndexes: Map<string, number> = new Map();

  constructor(model: CanvasModel, params: ZIndexCommandParams) {
    super(model, `Z-index ${params.operation} operation`);
    this.params = params;
  }

  async execute(): Promise<void> {
    const { operation, shapeIds, targetZIndex } = this.params;

    // 保存当前z-index用于撤销
    shapeIds.forEach(shapeId => {
      const shape = this.model.getShape(shapeId);
      if (shape) {
        this.previousZIndexes.set(shapeId, shape.zIndex);
      }
    });

    switch (operation) {
      case 'bring-to-front':
        await this.bringToFront(shapeIds);
        break;
      case 'send-to-back':
        await this.sendToBack(shapeIds);
        break;
      case 'bring-forward':
        await this.bringForward(shapeIds);
        break;
      case 'send-backward':
        await this.sendBackward(shapeIds);
        break;
      case 'set-z-index':
        if (targetZIndex !== undefined) {
          await this.setZIndex(shapeIds, targetZIndex);
        }
        break;
      default:
        throw new Error(`Unknown z-index operation: ${operation}`);
    }
  }

  async undo(): Promise<void> {
    // 恢复之前的z-index值
    for (const [shapeId, previousZIndex] of this.previousZIndexes.entries()) {
      this.model.updateShape(shapeId, { zIndex: previousZIndex });
    }
  }

  /**
   * 置顶 - 将形状移到最前面
   */
  private async bringToFront(shapeIds: string[]): Promise<void> {
    const allShapes = this.model.getShapes();
    const maxZIndex = Math.max(...allShapes.map((shape: Shape) => shape.zIndex || 0), 0);

    shapeIds.forEach((shapeId, index) => {
      this.model.updateShape(shapeId, { zIndex: maxZIndex + 1 + index });
    });
  }

  /**
   * 置底 - 将形状移到最后面
   */
  private async sendToBack(shapeIds: string[]): Promise<void> {
    const allShapes = this.model.getShapes();
    const minZIndex = Math.min(...allShapes.map((shape: Shape) => shape.zIndex || 0), 0);

    shapeIds.forEach((shapeId, index) => {
      this.model.updateShape(shapeId, { zIndex: minZIndex - shapeIds.length + index });
    });
  }

  /**
   * 上移一层
   */
  private async bringForward(shapeIds: string[]): Promise<void> {
    const allShapes = this.model.getShapes();
    const shapeZIndexes = new Map(allShapes.map((shape: Shape) => [shape.id, shape.zIndex || 0]));

    shapeIds.forEach(shapeId => {
      const currentZIndex = shapeZIndexes.get(shapeId) || 0;
      // 找到当前层级之上的最小层级
      const higherZIndexes = allShapes
        .map((shape: Shape) => shape.zIndex || 0)
        .filter((zIndex: number) => zIndex > currentZIndex)
        .sort((a: number, b: number) => a - b);

      const nextZIndex = higherZIndexes.length > 0 ? higherZIndexes[0] + 0.5 : currentZIndex + 1;
      this.model.updateShape(shapeId, { zIndex: nextZIndex });
    });
  }

  /**
   * 下移一层
   */
  private async sendBackward(shapeIds: string[]): Promise<void> {
    const allShapes = this.model.getShapes();
    const shapeZIndexes = new Map(allShapes.map((shape: Shape) => [shape.id, shape.zIndex || 0]));

    shapeIds.forEach(shapeId => {
      const currentZIndex = shapeZIndexes.get(shapeId) || 0;
      // 找到当前层级之下的最大层级
      const lowerZIndexes = allShapes
        .map((shape: Shape) => shape.zIndex || 0)
        .filter((zIndex: number) => zIndex < currentZIndex)
        .sort((a: number, b: number) => b - a);

      const prevZIndex = lowerZIndexes.length > 0 ? lowerZIndexes[0] - 0.5 : currentZIndex - 1;
      this.model.updateShape(shapeId, { zIndex: prevZIndex });
    });
  }

  /**
   * 设置指定z-index
   */
  private async setZIndex(shapeIds: string[], zIndex: number): Promise<void> {
    shapeIds.forEach(shapeId => {
      this.model.updateShape(shapeId, { zIndex });
    });
  }
}