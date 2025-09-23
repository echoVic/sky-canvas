/**
 * 剪贴板服务 - 处理复制粘贴功能
 * 功能单一：只负责形状的复制、剪切、粘贴
 */

import { Circle, Rectangle, Shape } from '@sky-canvas/render-engine';
import { createDecorator } from '../../di';

/**
 * 剪贴板操作类型
 */
export enum ClipboardOperation {
  COPY = 'copy',
  CUT = 'cut'
}

/**
 * 剪贴板数据
 */
export interface IClipboardData {
  shapes: Shape[];
  operation: ClipboardOperation;
  timestamp: number;
}

/**
 * 剪贴板服务接口
 */
export interface IClipboardService {
  readonly _serviceBrand: undefined;
  copy(shapes: Shape[]): void;
  cut(shapes: Shape[]): void;
  paste(): Shape[] | null;
  clear(): void;
  hasData(): boolean;
  getClipboardData(): IClipboardData | null;
}

/**
 * 剪贴板服务标识符
 */
export const IClipboardService = createDecorator<IClipboardService>('ClipboardService');

/**
 * 剪贴板服务实现
 */
export class ClipboardService implements IClipboardService {
  readonly _serviceBrand: undefined;
  private clipboardData: IClipboardData | null = null;

  copy(shapes: Shape[]): void {
    this.clipboardData = {
      shapes: this.deepCloneShapes(shapes),
      operation: ClipboardOperation.COPY,
      timestamp: Date.now()
    };
  }

  cut(shapes: Shape[]): void {
    this.clipboardData = {
      shapes: this.deepCloneShapes(shapes),
      operation: ClipboardOperation.CUT,
      timestamp: Date.now()
    };
  }

  paste(): Shape[] | null {
    if (!this.clipboardData) return null;

    // 创建新的 Shape 实例，而不是普通对象
    return this.clipboardData.shapes.map(shape => {
      const clonedShape = this.createShapeFromOriginal(shape);

      // 偏移位置
      clonedShape.x += 20;
      clonedShape.y += 20;

      return clonedShape;
    });
  }

  clear(): void {
    this.clipboardData = null;
  }

  hasData(): boolean {
    return this.clipboardData !== null;
  }

  getClipboardData(): IClipboardData | null {
    return this.clipboardData;
  }

  /**
   * 深拷贝形状数组
   */
  private deepCloneShapes(shapes: Shape[]): Shape[] {
    return shapes.map(shape => this.deepCloneShape(shape));
  }

  /**
   * 深拷贝单个形状
   */
  private deepCloneShape(shape: Shape): Shape {
    return JSON.parse(JSON.stringify(shape));
  }

  /**
   * 从原始形状创建新的 Shape 实例
   */
  private createShapeFromOriginal(originalShape: Shape): Shape {
    const style = originalShape.style();

    // 根据形状类型创建相应的实例
    if (originalShape instanceof Rectangle) {
      const bounds = originalShape.getBounds();
      return new Rectangle({
        x: originalShape.x,
        y: originalShape.y,
        width: bounds.width,
        height: bounds.height,
        style: { ...style }
      });
    } else if (originalShape instanceof Circle) {
      const bounds = originalShape.getBounds();
      return new Circle({
        x: originalShape.x,
        y: originalShape.y,
        radius: bounds.width / 2,
        style: { ...style }
      });
    }

    // 默认情况，如果是其他类型的 Shape
    throw new Error(`Unsupported shape type for cloning: ${originalShape.constructor.name}`);
  }

  /**
   * 生成唯一 ID
   */
  private generateId(): string {
    return `shape_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }
}