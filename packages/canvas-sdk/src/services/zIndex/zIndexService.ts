/**
 * Z轴管理服务 - 处理形状的层次顺序
 * 提供常用的图层操作：置顶、置底、上移、下移
 */

import { createDecorator } from '../../di';
import { Shape } from '@sky-canvas/render-engine';
import { IEventBusService } from '../eventBus/eventBusService';
import { ILogService } from '../logging/logService';

/**
 * Z轴操作类型
 */
export type ZIndexOperation = 'bringToFront' | 'sendToBack' | 'bringForward' | 'sendBackward';

/**
 * Z轴变更事件数据
 */
export interface IZIndexChangeEvent {
  shapeIds: string[];
  operation: ZIndexOperation;
  oldZIndices: Record<string, number>;
  newZIndices: Record<string, number>;
}

/**
 * Z轴管理服务接口
 */
export interface IZIndexService {
  readonly _serviceBrand: undefined;
  /**
   * 置顶 - 将形状移到所有形状的最前面
   */
  bringToFront(shapes: Shape[], allShapes: Shape[]): Shape[];

  /**
   * 置底 - 将形状移到所有形状的最后面
   */
  sendToBack(shapes: Shape[], allShapes: Shape[]): Shape[];

  /**
   * 上移一层
   */
  bringForward(shapes: Shape[], allShapes: Shape[]): Shape[];

  /**
   * 下移一层
   */
  sendBackward(shapes: Shape[], allShapes: Shape[]): Shape[];

  /**
   * 设置指定的zIndex值
   */
  setZIndex(shapes: Shape[], zIndex: number): Shape[];

  /**
   * 重新计算所有形状的zIndex，确保连续性
   */
  normalizeZIndices(allShapes: Shape[]): Shape[];

  /**
   * 获取按zIndex排序的形状列表
   */
  getSortedShapes(shapes: Shape[]): Shape[];

  /**
   * 获取形状的相对层次位置（从0开始）
   */
  getRelativePosition(shape: Shape, allShapes: Shape[]): number;
}

/**
 * Z轴管理服务实现
 */
export class ZIndexService implements IZIndexService {
  readonly _serviceBrand: undefined;

  constructor(
    @IEventBusService private eventBus: IEventBusService,
    @ILogService private logService: ILogService
  ) {}

  bringToFront(shapes: Shape[], allShapes: Shape[]): Shape[] {
    if (shapes.length === 0) return allShapes;

    const maxZIndex = this.getMaxZIndex(allShapes);
    const oldZIndices: Record<string, number> = {};
    const newZIndices: Record<string, number> = {};

    const updatedShapes = allShapes.map(shape => {
      if (shapes.some(s => s.id === shape.id)) {
        oldZIndices[shape.id] = shape.zIndex;
        const newZIndex = maxZIndex + shapes.findIndex(s => s.id === shape.id) + 1;
        newZIndices[shape.id] = newZIndex;

        // 直接修改 Shape 对象的 zIndex
        shape.setZIndex(newZIndex);
        return shape;
      }
      return shape;
    });

    this.emitZIndexChangeEvent(shapes.map(s => s.id), 'bringToFront', oldZIndices, newZIndices);
    this.logService.debug(`Brought ${shapes.length} shapes to front`);

    return updatedShapes;
  }

  sendToBack(shapes: Shape[], allShapes: Shape[]): Shape[] {
    if (shapes.length === 0) return allShapes;

    const minZIndex = this.getMinZIndex(allShapes);
    const oldZIndices: Record<string, number> = {};
    const newZIndices: Record<string, number> = {};

    const updatedShapes = allShapes.map(shape => {
      if (shapes.some(s => s.id === shape.id)) {
        oldZIndices[shape.id] = shape.zIndex;
        const newZIndex = minZIndex - shapes.length + shapes.findIndex(s => s.id === shape.id);
        newZIndices[shape.id] = newZIndex;

        // 直接修改 Shape 对象的 zIndex
        shape.setZIndex(newZIndex);
        return shape;
      }
      return shape;
    });

    this.emitZIndexChangeEvent(shapes.map(s => s.id), 'sendToBack', oldZIndices, newZIndices);
    this.logService.debug(`Sent ${shapes.length} shapes to back`);

    return updatedShapes;
  }

  bringForward(shapes: Shape[], allShapes: Shape[]): Shape[] {
    if (shapes.length === 0) return allShapes;

    const sortedAllShapes = this.getSortedShapes(allShapes);
    const oldZIndices: Record<string, number> = {};
    const newZIndices: Record<string, number> = {};

    const updatedShapes = [...sortedAllShapes];

    // 从高zIndex开始处理，避免重复交换
    const shapesToMove = shapes
      .map(shape => ({ shape, index: sortedAllShapes.findIndex(s => s.id === shape.id) }))
      .sort((a, b) => b.index - a.index);

    shapesToMove.forEach(({ shape, index }) => {
      if (index < updatedShapes.length - 1) {
        oldZIndices[shape.id] = shape.zIndex;

        // 找到下一个非选中的形状并交换zIndex
        let nextIndex = index + 1;
        while (nextIndex < updatedShapes.length && shapes.some(s => s.id === updatedShapes[nextIndex].id)) {
          nextIndex++;
        }

        if (nextIndex < updatedShapes.length) {
          const nextShape = updatedShapes[nextIndex];
          const tempZIndex = shape.zIndex;

          // 交换 zIndex
          shape.setZIndex(nextShape.zIndex);
          nextShape.setZIndex(tempZIndex);

          updatedShapes[index] = shape;
          updatedShapes[nextIndex] = nextShape;

          newZIndices[shape.id] =nextShape.zIndex;
        }
      }
    });

    this.emitZIndexChangeEvent(shapes.map(s => s.id), 'bringForward', oldZIndices, newZIndices);
    this.logService.debug(`Moved ${shapes.length} shapes forward`);

    return updatedShapes;
  }

  sendBackward(shapes: Shape[], allShapes: Shape[]): Shape[] {
    if (shapes.length === 0) return allShapes;

    const sortedAllShapes = this.getSortedShapes(allShapes);
    const oldZIndices: Record<string, number> = {};
    const newZIndices: Record<string, number> = {};

    const updatedShapes = [...sortedAllShapes];

    // 从低zIndex开始处理，避免重复交换
    const shapesToMove = shapes
      .map(shape => ({ shape, index: sortedAllShapes.findIndex(s => s.id === shape.id) }))
      .sort((a, b) => a.index - b.index);

    shapesToMove.forEach(({ shape, index }) => {
      if (index > 0) {
        oldZIndices[shape.id] = shape.zIndex;

        // 找到前一个非选中的形状并交换zIndex
        let prevIndex = index - 1;
        while (prevIndex >= 0 && shapes.some(s => s.id === updatedShapes[prevIndex].id)) {
          prevIndex--;
        }

        if (prevIndex >= 0) {
          const prevShape = updatedShapes[prevIndex];
          const tempZIndex = shape.zIndex;

          // 交换 zIndex
          shape.setZIndex(prevShape.zIndex);
          prevShape.setZIndex(tempZIndex);

          updatedShapes[index] = shape;
          updatedShapes[prevIndex] = prevShape;

          newZIndices[shape.id] =prevShape.zIndex;
        }
      }
    });

    this.emitZIndexChangeEvent(shapes.map(s => s.id), 'sendBackward', oldZIndices, newZIndices);
    this.logService.debug(`Moved ${shapes.length} shapes backward`);

    return updatedShapes;
  }

  setZIndex(shapes: Shape[], zIndex: number): Shape[] {
    const oldZIndices: Record<string, number> = {};
    const newZIndices: Record<string, number> = {};

    const updatedShapes = shapes.map((shape, index) => {
      oldZIndices[shape.id] = shape.zIndex;
      const newZIndex = zIndex + index;
      newZIndices[shape.id] = newZIndex;

      // 直接修改 Shape 对象的 zIndex
      shape.setZIndex(newZIndex);
      return shape;
    });

    this.logService.debug(`Set zIndex to ${zIndex} for ${shapes.length} shapes`);

    return updatedShapes;
  }

  normalizeZIndices(allShapes: Shape[]): Shape[] {
    const sortedShapes = this.getSortedShapes(allShapes);

    // 直接修改 Shape 对象的 zIndex，不创建新对象
    sortedShapes.forEach((shape, index) => {
      shape.setZIndex(index);
    });

    this.logService.debug(`Normalized zIndex for ${allShapes.length} shapes`);

    return sortedShapes;
  }

  getSortedShapes(shapes: Shape[]): Shape[] {
    return [...shapes].sort((a, b) => a.zIndex - b.zIndex);
  }

  getRelativePosition(shape: Shape, allShapes: Shape[]): number {
    const sortedShapes = this.getSortedShapes(allShapes);
    return sortedShapes.findIndex(s => s.id === shape.id);
  }

  private getMaxZIndex(shapes: Shape[]): number {
    if (shapes.length === 0) return 0;
    return Math.max(...shapes.map(s => s.zIndex));
  }

  private getMinZIndex(shapes: Shape[]): number {
    if (shapes.length === 0) return 0;
    return Math.min(...shapes.map(s => s.zIndex));
  }

  private emitZIndexChangeEvent(
    shapeIds: string[],
    operation: ZIndexOperation,
    oldZIndices: Record<string, number>,
    newZIndices: Record<string, number>
  ): void {
    const eventData: IZIndexChangeEvent = {
      shapeIds,
      operation,
      oldZIndices,
      newZIndices
    };

    this.eventBus.emit('canvas:zIndexChanged', eventData);
  }
}

/**
 * Z轴管理服务标识符
 */
export const IZIndexService = createDecorator<IZIndexService>('ZIndexService');