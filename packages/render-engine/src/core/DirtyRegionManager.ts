import { Rectangle } from '../math/Rectangle'
import type { IRenderable } from './IRenderEngine'

/**
 * 形状快照接口
 */
export interface ShapeSnapshot {
  id: string
  bounds: Rectangle
  visible: boolean
  zIndex: number
}

/**
 * 脏区域管理器
 */
export class DirtyRegionManager {
  private dirtyRegions: Rectangle[] = []
  private lastFrameShapes: Map<string, ShapeSnapshot> = new Map()
  private currentFrameShapes: Map<string, ShapeSnapshot> = new Map()

  /**
   * 标记区域为脏区域
   */
  markRegionDirty(bounds: Rectangle, _reason: string = 'unknown'): void {
    this.dirtyRegions.push(bounds.clone())
  }

  /**
   * 优化脏区域（合并相邻区域）
   */
  optimizeDirtyRegions(): Rectangle[] {
    if (this.dirtyRegions.length === 0) return []

    // 简单的合并策略：合并重叠或相邻的区域
    const optimized: Rectangle[] = []
    const regions = [...this.dirtyRegions]

    while (regions.length > 0) {
      const region = regions.shift()
      if (!region) {
        continue
      }
      let merged = false

      for (let i = 0; i < optimized.length; i++) {
        if (this.rectanglesIntersectOrAdjacent(region, optimized[i])) {
          // 合并区域
          optimized[i] = this.mergeRectangles(region, optimized[i])
          merged = true
          break
        }
      }

      if (!merged) {
        optimized.push(region)
      }
    }

    this.dirtyRegions = optimized
    return [...optimized]
  }

  /**
   * 检查两个矩形是否相交或相邻
   */
  private rectanglesIntersectOrAdjacent(rect1: Rectangle, rect2: Rectangle): boolean {
    // 扩展rect1和rect2各1像素以检查相邻
    const extended1 = {
      x: rect1.x - 1,
      y: rect1.y - 1,
      width: rect1.width + 2,
      height: rect1.height + 2,
    }

    return !(
      extended1.x + extended1.width < rect2.x ||
      rect2.x + rect2.width < extended1.x ||
      extended1.y + extended1.height < rect2.y ||
      rect2.y + rect2.height < extended1.y
    )
  }

  /**
   * 合并两个矩形
   */
  private mergeRectangles(rect1: Rectangle, rect2: Rectangle): Rectangle {
    const left = Math.min(rect1.x, rect2.x)
    const top = Math.min(rect1.y, rect2.y)
    const right = Math.max(rect1.x + rect1.width, rect2.x + rect2.width)
    const bottom = Math.max(rect1.y + rect1.height, rect2.y + rect2.height)

    return new Rectangle(left, top, right - left, bottom - top)
  }

  /**
   * 检查形状是否需要重新绘制
   */
  shouldRedrawShape(shape: IRenderable): boolean {
    const id = shape.id
    const currentSnapshot = this.createShapeSnapshot(shape)
    const lastSnapshot = this.lastFrameShapes.get(id)

    // 如果是新形状或形状发生变化，则需要重绘
    if (!lastSnapshot) {
      return true
    }

    return (
      currentSnapshot.bounds.x !== lastSnapshot.bounds.x ||
      currentSnapshot.bounds.y !== lastSnapshot.bounds.y ||
      currentSnapshot.bounds.width !== lastSnapshot.bounds.width ||
      currentSnapshot.bounds.height !== lastSnapshot.bounds.height ||
      currentSnapshot.visible !== lastSnapshot.visible
    )
  }

  /**
   * 创建形状快照
   */
  private createShapeSnapshot(shape: IRenderable): ShapeSnapshot {
    const bounds = shape.getBounds()
    return {
      id: shape.id,
      bounds: new Rectangle(bounds.x, bounds.y, bounds.width, bounds.height),
      visible: shape.visible,
      zIndex: shape.zIndex,
    }
  }

  /**
   * 更新当前帧的形状状态
   */
  updateCurrentFrameShape(shape: IRenderable): void {
    const snapshot = this.createShapeSnapshot(shape)
    this.currentFrameShapes.set(snapshot.id, snapshot)
  }

  /**
   * 准备下一帧
   */
  prepareNextFrame(): void {
    this.lastFrameShapes = new Map(this.currentFrameShapes)
    this.currentFrameShapes.clear()
    this.dirtyRegions = []
  }

  /**
   * 获取所有脏区域
   */
  getDirtyRegions(): Rectangle[] {
    return [...this.dirtyRegions]
  }

  /**
   * 清空脏区域
   */
  clearDirtyRegions(): void {
    this.dirtyRegions = []
  }
}
