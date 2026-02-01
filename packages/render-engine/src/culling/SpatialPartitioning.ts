/**
 * 空间分割和剔除优化系统
 * 提供高效的空间查询和视锥剔除功能
 */

import type { IRenderCommand } from '../commands/IRenderCommand'
import { IPoint, type IRect } from '../graphics/IGraphicsContext'

/**
 * 空间节点接口
 */
export interface ISpatialNode {
  /** 节点边界 */
  readonly bounds: IRect
  /** 包含的对象 */
  readonly objects: IRenderCommand[]
  /** 是否为叶子节点 */
  readonly isLeaf: boolean

  /**
   * 添加对象到节点
   * @param object 渲染对象
   */
  addObject(object: IRenderCommand): boolean

  /**
   * 移除对象
   * @param object 渲染对象
   */
  removeObject(object: IRenderCommand): boolean

  /**
   * 查询区域内的对象
   * @param region 查询区域
   * @returns 对象列表
   */
  query(region: IRect): IRenderCommand[]

  /**
   * 清空节点
   */
  clear(): void
}

/**
 * 四叉树节点实现
 */
export class QuadTreeNode implements ISpatialNode {
  readonly bounds: IRect
  readonly objects: IRenderCommand[] = []
  private children: QuadTreeNode[] | null = null
  private maxObjects: number
  private maxLevels: number
  private level: number

  constructor(bounds: IRect, maxObjects: number = 10, maxLevels: number = 5, level: number = 0) {
    this.bounds = { ...bounds }
    this.maxObjects = maxObjects
    this.maxLevels = maxLevels
    this.level = level
  }

  get isLeaf(): boolean {
    return this.children === null
  }

  addObject(object: IRenderCommand): boolean {
    const objectBounds = object.getBounds()

    // 检查对象是否在此节点范围内
    if (!this.intersects(objectBounds, this.bounds)) {
      return false
    }

    // 如果是叶子节点且未超过容量，直接添加
    if (this.isLeaf && this.objects.length < this.maxObjects) {
      this.objects.push(object)
      return true
    }

    // 如果达到最大层数，强制添加到当前节点
    if (this.level >= this.maxLevels) {
      this.objects.push(object)
      return true
    }

    // 需要分割或已经分割
    if (this.isLeaf) {
      this.split()
    }

    // 尝试添加到子节点
    if (this.children) {
      for (const child of this.children) {
        if (child.addObject(object)) {
          return true
        }
      }
    }

    // 如果无法添加到任何子节点，添加到当前节点
    this.objects.push(object)
    return true
  }

  removeObject(object: IRenderCommand): boolean {
    const index = this.objects.indexOf(object)
    if (index >= 0) {
      this.objects.splice(index, 1)
      return true
    }

    // 从子节点中移除
    if (this.children) {
      for (const child of this.children) {
        if (child.removeObject(object)) {
          return true
        }
      }
    }

    return false
  }

  query(region: IRect): IRenderCommand[] {
    const result: IRenderCommand[] = []

    // 检查区域是否与当前节点相交
    if (!this.intersects(region, this.bounds)) {
      return result
    }

    // 添加当前节点的对象
    for (const object of this.objects) {
      const objectBounds = object.getBounds()
      if (this.intersects(region, objectBounds)) {
        result.push(object)
      }
    }

    // 查询子节点
    if (this.children) {
      for (const child of this.children) {
        result.push(...child.query(region))
      }
    }

    return result
  }

  clear(): void {
    this.objects.length = 0
    this.children = null
  }

  private split(): void {
    const { x, y, width, height } = this.bounds
    const halfWidth = width / 2
    const halfHeight = height / 2

    this.children = [
      // 左上
      new QuadTreeNode(
        { x, y: y + halfHeight, width: halfWidth, height: halfHeight },
        this.maxObjects,
        this.maxLevels,
        this.level + 1
      ),
      // 右上
      new QuadTreeNode(
        { x: x + halfWidth, y: y + halfHeight, width: halfWidth, height: halfHeight },
        this.maxObjects,
        this.maxLevels,
        this.level + 1
      ),
      // 左下
      new QuadTreeNode(
        { x, y, width: halfWidth, height: halfHeight },
        this.maxObjects,
        this.maxLevels,
        this.level + 1
      ),
      // 右下
      new QuadTreeNode(
        { x: x + halfWidth, y, width: halfWidth, height: halfHeight },
        this.maxObjects,
        this.maxLevels,
        this.level + 1
      ),
    ]

    // 将现有对象重新分配到子节点
    const objectsToReassign = [...this.objects]
    this.objects.length = 0

    for (const object of objectsToReassign) {
      this.addObject(object)
    }
  }

  private intersects(rect1: IRect, rect2: IRect): boolean {
    return !(
      rect1.x + rect1.width < rect2.x ||
      rect2.x + rect2.width < rect1.x ||
      rect1.y + rect1.height < rect2.y ||
      rect2.y + rect2.height < rect1.y
    )
  }
}

/**
 * 空间哈希网格
 * 适用于大量均匀分布的对象
 */
export class SpatialHashGrid {
  private cellSize: number
  private cells = new Map<string, IRenderCommand[]>()
  private objectToKeys = new Map<IRenderCommand, Set<string>>()

  constructor(cellSize: number = 64) {
    this.cellSize = cellSize
  }

  /**
   * 添加对象
   * @param object 渲染对象
   */
  addObject(object: IRenderCommand): void {
    this.removeObject(object) // 先移除可能存在的旧记录

    const bounds = object.getBounds()
    const keys = this.getBoundsCells(bounds)

    this.objectToKeys.set(object, keys)

    for (const key of keys) {
      if (!this.cells.has(key)) {
        this.cells.set(key, [])
      }
      this.cells.get(key)!.push(object)
    }
  }

  /**
   * 移除对象
   * @param object 渲染对象
   */
  removeObject(object: IRenderCommand): boolean {
    const keys = this.objectToKeys.get(object)
    if (!keys) return false

    for (const key of keys) {
      const cell = this.cells.get(key)
      if (cell) {
        const index = cell.indexOf(object)
        if (index >= 0) {
          cell.splice(index, 1)
        }
        // 如果格子为空，删除它
        if (cell.length === 0) {
          this.cells.delete(key)
        }
      }
    }

    this.objectToKeys.delete(object)
    return true
  }

  /**
   * 查询区域内的对象
   * @param region 查询区域
   * @returns 对象列表
   */
  query(region: IRect): IRenderCommand[] {
    const keys = this.getBoundsCells(region)
    const result = new Set<IRenderCommand>()

    for (const key of keys) {
      const cell = this.cells.get(key)
      if (cell) {
        for (const object of cell) {
          const objectBounds = object.getBounds()
          if (this.intersects(region, objectBounds)) {
            result.add(object)
          }
        }
      }
    }

    return Array.from(result)
  }

  /**
   * 清空所有对象
   */
  clear(): void {
    this.cells.clear()
    this.objectToKeys.clear()
  }

  /**
   * 获取统计信息
   */
  getStats(): {
    totalCells: number
    totalObjects: number
    averageObjectsPerCell: number
    maxObjectsPerCell: number
  } {
    let totalObjects = 0
    let maxObjectsPerCell = 0

    for (const cell of this.cells.values()) {
      totalObjects += cell.length
      maxObjectsPerCell = Math.max(maxObjectsPerCell, cell.length)
    }

    return {
      totalCells: this.cells.size,
      totalObjects: this.objectToKeys.size,
      averageObjectsPerCell: this.cells.size > 0 ? totalObjects / this.cells.size : 0,
      maxObjectsPerCell,
    }
  }

  private getBoundsCells(bounds: IRect): Set<string> {
    const keys = new Set<string>()

    const minX = Math.floor(bounds.x / this.cellSize)
    const minY = Math.floor(bounds.y / this.cellSize)
    const maxX = Math.floor((bounds.x + bounds.width) / this.cellSize)
    const maxY = Math.floor((bounds.y + bounds.height) / this.cellSize)

    for (let x = minX; x <= maxX; x++) {
      for (let y = minY; y <= maxY; y++) {
        keys.add(`${x},${y}`)
      }
    }

    return keys
  }

  private intersects(rect1: IRect, rect2: IRect): boolean {
    return !(
      rect1.x + rect1.width < rect2.x ||
      rect2.x + rect2.width < rect1.x ||
      rect1.y + rect1.height < rect2.y ||
      rect2.y + rect2.height < rect1.y
    )
  }
}

/**
 * 剔除管理器
 */
export class CullingManager {
  private spatialIndex: ISpatialNode | SpatialHashGrid
  private cullMargin: number
  private stats = {
    totalObjects: 0,
    visibleObjects: 0,
    culledObjects: 0,
    queryTime: 0,
  }

  constructor(spatialIndex: ISpatialNode | SpatialHashGrid, cullMargin: number = 50) {
    this.spatialIndex = spatialIndex
    this.cullMargin = cullMargin
  }

  /**
   * 更新对象位置
   * @param object 渲染对象
   */
  updateObject(object: IRenderCommand): void {
    if (this.spatialIndex instanceof SpatialHashGrid) {
      this.spatialIndex.addObject(object)
    } else {
      // 对于四叉树，需要重新插入
      this.spatialIndex.removeObject(object)
      this.spatialIndex.addObject(object)
    }
  }

  /**
   * 批量更新对象
   * @param objects 渲染对象数组
   */
  updateObjects(objects: IRenderCommand[]): void {
    for (const object of objects) {
      this.updateObject(object)
    }
  }

  /**
   * 执行视锥剔除
   * @param viewport 视口范围
   * @returns 可见对象列表
   */
  cull(viewport: IRect): IRenderCommand[] {
    const startTime = performance.now()

    // 扩展视口范围以包含剔除边距
    const expandedViewport: IRect = {
      x: viewport.x - this.cullMargin,
      y: viewport.y - this.cullMargin,
      width: viewport.width + this.cullMargin * 2,
      height: viewport.height + this.cullMargin * 2,
    }

    // 查询可见对象
    let visibleObjects: IRenderCommand[]
    if (this.spatialIndex instanceof SpatialHashGrid) {
      visibleObjects = this.spatialIndex.query(expandedViewport)
    } else {
      visibleObjects = this.spatialIndex.query(expandedViewport)
    }

    // 精确剔除检查
    const finalVisibleObjects = visibleObjects.filter((object) => {
      return object.isVisible(viewport)
    })

    // 更新统计信息
    const queryTime = performance.now() - startTime
    this.stats = {
      totalObjects: visibleObjects.length,
      visibleObjects: finalVisibleObjects.length,
      culledObjects: visibleObjects.length - finalVisibleObjects.length,
      queryTime,
    }

    return finalVisibleObjects
  }

  /**
   * 添加对象到空间索引
   * @param object 渲染对象
   */
  addObject(object: IRenderCommand): void {
    if (this.spatialIndex instanceof SpatialHashGrid) {
      this.spatialIndex.addObject(object)
    } else {
      this.spatialIndex.addObject(object)
    }
  }

  /**
   * 从空间索引移除对象
   * @param object 渲染对象
   */
  removeObject(object: IRenderCommand): void {
    if (this.spatialIndex instanceof SpatialHashGrid) {
      this.spatialIndex.removeObject(object)
    } else {
      this.spatialIndex.removeObject(object)
    }
  }

  /**
   * 清空所有对象
   */
  clear(): void {
    if (this.spatialIndex instanceof SpatialHashGrid) {
      this.spatialIndex.clear()
    } else {
      this.spatialIndex.clear()
    }
  }

  /**
   * 获取剔除统计信息
   */
  getStats() {
    const spatialStats =
      this.spatialIndex instanceof SpatialHashGrid
        ? this.spatialIndex.getStats()
        : { totalObjects: 0, totalCells: 0 }

    return {
      ...this.stats,
      cullingRatio:
        this.stats.totalObjects > 0 ? this.stats.culledObjects / this.stats.totalObjects : 0,
      spatialIndex: spatialStats,
    }
  }

  /**
   * 设置剔除边距
   * @param margin 边距值
   */
  setCullMargin(margin: number): void {
    this.cullMargin = margin
  }
}

/**
 * 剔除管理器工厂
 */
export class CullingManagerFactory {
  /**
   * 创建基于四叉树的剔除管理器
   * @param bounds 空间边界
   * @param maxObjects 最大对象数
   * @param maxLevels 最大层数
   * @param cullMargin 剔除边距
   */
  static createQuadTree(
    bounds: IRect,
    maxObjects: number = 10,
    maxLevels: number = 5,
    cullMargin: number = 50
  ): CullingManager {
    const quadTree = new QuadTreeNode(bounds, maxObjects, maxLevels)
    return new CullingManager(quadTree, cullMargin)
  }

  /**
   * 创建基于空间哈希的剔除管理器
   * @param cellSize 格子大小
   * @param cullMargin 剔除边距
   */
  static createSpatialHash(cellSize: number = 64, cullMargin: number = 50): CullingManager {
    const spatialHash = new SpatialHashGrid(cellSize)
    return new CullingManager(spatialHash, cullMargin)
  }

  /**
   * 自动选择最佳剔除策略
   * @param bounds 空间边界
   * @param estimatedObjectCount 预估对象数量
   * @param cullMargin 剔除边距
   */
  static createOptimal(
    bounds: IRect,
    estimatedObjectCount: number,
    cullMargin: number = 50
  ): CullingManager {
    // 根据对象数量和空间大小选择最佳策略
    const area = bounds.width * bounds.height
    const density = estimatedObjectCount / area

    if (density > 0.01) {
      // 高密度场景，使用空间哈希
      const cellSize = Math.sqrt(area / estimatedObjectCount) * 2
      return CullingManagerFactory.createSpatialHash(
        Math.max(32, Math.min(256, cellSize)),
        cullMargin
      )
    } else {
      // 低密度场景，使用四叉树
      return CullingManagerFactory.createQuadTree(bounds, 15, 6, cullMargin)
    }
  }
}
