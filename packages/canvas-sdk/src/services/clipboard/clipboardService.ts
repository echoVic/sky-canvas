/**
 * 剪贴板服务 - 处理复制粘贴功能
 * 功能单一：只负责形状的复制、剪切、粘贴
 */

import { createDecorator } from '../../di'
import type { IShapeEntity } from '../../models/entities/Shape'

/**
 * 剪贴板操作类型
 */
export enum ClipboardOperation {
  COPY = 'copy',
  CUT = 'cut',
}

/**
 * 剪贴板数据
 */
export interface IClipboardData {
  shapes: IShapeEntity[]
  operation: ClipboardOperation
  timestamp: number
}

/**
 * 剪贴板服务接口
 */
export interface IClipboardService {
  readonly _serviceBrand: undefined
  copy(shapes: IShapeEntity[]): void
  cut(shapes: IShapeEntity[]): void
  paste(): Promise<IShapeEntity[] | null>
  clear(): void
  hasData(): boolean
  getClipboardData(): IClipboardData | null
}

/**
 * 剪贴板服务标识符
 */
export const IClipboardService = createDecorator<IClipboardService>('ClipboardService')

/**
 * 剪贴板服务实现
 */
export class ClipboardService implements IClipboardService {
  readonly _serviceBrand: undefined
  private clipboardData: IClipboardData | null = null

  copy(shapes: IShapeEntity[]): void {
    this.clipboardData = {
      shapes: this.deepCloneShapes(shapes),
      operation: ClipboardOperation.COPY,
      timestamp: Date.now(),
    }
    void this.writeToSystemClipboard(this.clipboardData)
  }

  cut(shapes: IShapeEntity[]): void {
    this.clipboardData = {
      shapes: this.deepCloneShapes(shapes),
      operation: ClipboardOperation.CUT,
      timestamp: Date.now(),
    }
    void this.writeToSystemClipboard(this.clipboardData)
  }

  async paste(): Promise<IShapeEntity[] | null> {
    if (!this.clipboardData) {
      const systemData = await this.readFromSystemClipboard()
      if (systemData) {
        this.clipboardData = systemData
      }
    }

    if (!this.clipboardData) return null

    return this.clipboardData.shapes.map((shape) => ({
      ...this.deepCloneShape(shape),
      id: this.generateId(),
      transform: {
        ...shape.transform,
        position: {
          x: shape.transform.position.x + 20,
          y: shape.transform.position.y + 20,
        },
      },
      createdAt: new Date(),
      updatedAt: new Date(),
    }))
  }

  clear(): void {
    this.clipboardData = null
  }

  hasData(): boolean {
    return this.clipboardData !== null
  }

  getClipboardData(): IClipboardData | null {
    return this.clipboardData
  }

  /**
   * 深拷贝形状数组
   */
  private deepCloneShapes(shapes: IShapeEntity[]): IShapeEntity[] {
    return shapes.map((shape) => this.deepCloneShape(shape))
  }

  /**
   * 深拷贝单个形状
   */
  private deepCloneShape(shape: IShapeEntity): IShapeEntity {
    return JSON.parse(JSON.stringify(shape))
  }

  /**
   * 生成唯一 ID
   */
  private generateId(): string {
    return `shape_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`
  }

  private async writeToSystemClipboard(data: IClipboardData): Promise<void> {
    if (typeof navigator === 'undefined' || !navigator.clipboard?.writeText) return
    const payload = JSON.stringify({
      type: 'sky-canvas',
      version: 1,
      data,
    })
    try {
      await navigator.clipboard.writeText(payload)
    } catch {
      return
    }
  }

  private async readFromSystemClipboard(): Promise<IClipboardData | null> {
    if (typeof navigator === 'undefined' || !navigator.clipboard?.readText) return null
    try {
      const text = await navigator.clipboard.readText()
      const parsed = JSON.parse(text)
      if (parsed?.type !== 'sky-canvas' || !parsed.data) return null
      return parsed.data as IClipboardData
    } catch {
      return null
    }
  }
}
