/**
 * 剪贴板服务 - 处理复制粘贴功能
 * 功能单一：只负责形状的复制、剪切、粘贴
 */

import { createServiceIdentifier, injectable } from '../../di/ServiceIdentifier';
import { IShapeEntity } from '../../models/entities/Shape';

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
  shapes: IShapeEntity[];
  operation: ClipboardOperation;
  timestamp: number;
}

/**
 * 剪贴板服务接口
 */
export interface IClipboardService {
  copy(shapes: IShapeEntity[]): void;
  cut(shapes: IShapeEntity[]): void;
  paste(): IShapeEntity[] | null;
  clear(): void;
  hasData(): boolean;
  getClipboardData(): IClipboardData | null;
}

/**
 * 剪贴板服务标识符
 */
export const IClipboardService = createServiceIdentifier<IClipboardService>('ClipboardService');

/**
 * 剪贴板服务实现
 */
@injectable
export class ClipboardService implements IClipboardService {
  private clipboardData: IClipboardData | null = null;

  copy(shapes: IShapeEntity[]): void {
    this.clipboardData = {
      shapes: this.deepCloneShapes(shapes),
      operation: ClipboardOperation.COPY,
      timestamp: Date.now()
    };
  }

  cut(shapes: IShapeEntity[]): void {
    this.clipboardData = {
      shapes: this.deepCloneShapes(shapes),
      operation: ClipboardOperation.CUT,
      timestamp: Date.now()
    };
  }

  paste(): IShapeEntity[] | null {
    if (!this.clipboardData) return null;

    // 生成新的 ID 和稍微偏移的位置
    return this.clipboardData.shapes.map(shape => ({
      ...this.deepCloneShape(shape),
      id: this.generateId(),
      transform: {
        ...shape.transform,
        position: {
          x: shape.transform.position.x + 20,
          y: shape.transform.position.y + 20
        }
      },
      createdAt: new Date(),
      updatedAt: new Date()
    }));
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
  private deepCloneShapes(shapes: IShapeEntity[]): IShapeEntity[] {
    return shapes.map(shape => this.deepCloneShape(shape));
  }

  /**
   * 深拷贝单个形状
   */
  private deepCloneShape(shape: IShapeEntity): IShapeEntity {
    return JSON.parse(JSON.stringify(shape));
  }

  /**
   * 生成唯一 ID
   */
  private generateId(): string {
    return `shape_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}