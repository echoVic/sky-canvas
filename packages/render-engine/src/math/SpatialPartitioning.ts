/**
 * 空间分割系统 - 用于高效的空间查询和碰撞检测
 */

import type { IPoint, IRect } from './Geometry'

/**
 * 空间对象接口 - 可被空间分割系统管理的对象
 */
export interface ISpatialObject {
  id: string
  getBounds(): IRect
}

/**
 * 空间网格系统
 * 将空间分割成网格，提高查询效率
 */
export class SpatialGrid<T extends ISpatialObject> {
  private _cellSize: number
  private _grid: Map<string, Set<T>> = new Map()
  private _objectCells: Map<string, Set<string>> = new Map()

  constructor(cellSize: number = 100) {
    this._cellSize = cellSize
  }

  /**
   * 插入对象到空间网格
   */
  insert(obj: T): void {
    const bounds = obj.getBounds()
    const cells = this.getCellsForBounds(bounds)

    this._objectCells.set(obj.id, cells)

    for (const cellKey of cells) {
      if (!this._grid.has(cellKey)) {
        this._grid.set(cellKey, new Set())
      }
      this._grid.get(cellKey)!.add(obj)
    }
  }

  /**
   * 从空间网格中移除对象
   */
  remove(obj: T): void {
    const cells = this._objectCells.get(obj.id)
    if (!cells) return

    for (const cellKey of cells) {
      const cell = this._grid.get(cellKey)
      if (cell) {
        cell.delete(obj)
        if (cell.size === 0) {
          this._grid.delete(cellKey)
        }
      }
    }

    this._objectCells.delete(obj.id)
  }

  /**
   * 更新对象在空间网格中的位置
   */
  update(obj: T): void {
    this.remove(obj)
    this.insert(obj)
  }

  /**
   * 查询指定边界内的所有对象
   */
  query(bounds: IRect): Set<T> {
    const cells = this.getCellsForBounds(bounds)
    const result = new Set<T>()

    for (const cellKey of cells) {
      const cell = this._grid.get(cellKey)
      if (cell) {
        for (const obj of cell) {
          result.add(obj)
        }
      }
    }

    return result
  }

  /**
   * 查询指定点周围的对象
   */
  queryPoint(point: IPoint): Set<T> {
    const cellKey = this.getCellKey(point.x, point.y)
    return this._grid.get(cellKey) || new Set()
  }

  /**
   * 查询指定半径内的对象
   */
  queryRadius(center: IPoint, radius: number): Set<T> {
    const bounds: IRect = {
      x: center.x - radius,
      y: center.y - radius,
      width: radius * 2,
      height: radius * 2,
    }
    return this.query(bounds)
  }

  /**
   * 清空所有对象
   */
  clear(): void {
    this._grid.clear()
    this._objectCells.clear()
  }

  /**
   * 获取边界对应的网格单元
   */
  private getCellsForBounds(bounds: IRect): Set<string> {
    const cells = new Set<string>()

    const startX = Math.floor(bounds.x / this._cellSize)
    const endX = Math.floor((bounds.x + bounds.width) / this._cellSize)
    const startY = Math.floor(bounds.y / this._cellSize)
    const endY = Math.floor((bounds.y + bounds.height) / this._cellSize)

    for (let x = startX; x <= endX; x++) {
      for (let y = startY; y <= endY; y++) {
        cells.add(`${x},${y}`)
      }
    }

    return cells
  }

  /**
   * 获取点对应的网格单元键
   */
  private getCellKey(x: number, y: number): string {
    const cellX = Math.floor(x / this._cellSize)
    const cellY = Math.floor(y / this._cellSize)
    return `${cellX},${cellY}`
  }

  /**
   * 获取调试信息
   */
  getDebugInfo(): object {
    return {
      cellSize: this._cellSize,
      gridSize: this._grid.size,
      totalObjects: this._objectCells.size,
      cellDistribution: Array.from(this._grid.entries()).map(([key, objects]) => ({
        cell: key,
        objectCount: objects.size,
      })),
    }
  }

  /**
   * 获取网格统计信息
   */
  getStats(): {
    totalCells: number
    totalObjects: number
    averageObjectsPerCell: number
    maxObjectsPerCell: number
    emptyCells: number
  } {
    const totalCells = this._grid.size
    const totalObjects = this._objectCells.size

    let maxObjectsPerCell = 0
    let emptyCells = 0

    for (const cell of this._grid.values()) {
      const size = cell.size
      maxObjectsPerCell = Math.max(maxObjectsPerCell, size)
      if (size === 0) {
        emptyCells++
      }
    }

    return {
      totalCells,
      totalObjects,
      averageObjectsPerCell: totalCells > 0 ? totalObjects / totalCells : 0,
      maxObjectsPerCell,
      emptyCells,
    }
  }
}

/**
 * 四叉树节点
 */
class QuadTreeNode<T extends ISpatialObject> {
  private _bounds: IRect
  private _objects: T[] = []
  private _children: QuadTreeNode<T>[] | null = null
  private _maxObjects: number
  private _maxDepth: number
  private _depth: number

  constructor(bounds: IRect, maxObjects: number = 10, maxDepth: number = 5, depth: number = 0) {
    this._bounds = bounds
    this._maxObjects = maxObjects
    this._maxDepth = maxDepth
    this._depth = depth
  }

  /**
   * 插入对象
   */
  insert(obj: T): void {
    if (!this.boundsContainObject(obj)) {
      return
    }

    if (this._objects.length < this._maxObjects || this._depth >= this._maxDepth) {
      this._objects.push(obj)
      return
    }

    if (!this._children) {
      this.split()
    }

    for (const child of this._children!) {
      child.insert(obj)
    }
  }

  /**
   * 查询指定边界内的对象
   */
  query(bounds: IRect, result: T[] = []): T[] {
    if (!this.boundsIntersect(this._bounds, bounds)) {
      return result
    }

    // 检查当前节点的对象
    for (const obj of this._objects) {
      const objBounds = obj.getBounds()
      if (this.boundsIntersect(objBounds, bounds)) {
        result.push(obj)
      }
    }

    // 递归查询子节点
    if (this._children) {
      for (const child of this._children) {
        child.query(bounds, result)
      }
    }

    return result
  }

  /**
   * 分割当前节点
   */
  private split(): void {
    const halfWidth = this._bounds.width / 2
    const halfHeight = this._bounds.height / 2
    const x = this._bounds.x
    const y = this._bounds.y

    this._children = [
      // 右上
      new QuadTreeNode(
        { x: x + halfWidth, y, width: halfWidth, height: halfHeight },
        this._maxObjects,
        this._maxDepth,
        this._depth + 1
      ),
      // 左上
      new QuadTreeNode(
        { x, y, width: halfWidth, height: halfHeight },
        this._maxObjects,
        this._maxDepth,
        this._depth + 1
      ),
      // 左下
      new QuadTreeNode(
        { x, y: y + halfHeight, width: halfWidth, height: halfHeight },
        this._maxObjects,
        this._maxDepth,
        this._depth + 1
      ),
      // 右下
      new QuadTreeNode(
        { x: x + halfWidth, y: y + halfHeight, width: halfWidth, height: halfHeight },
        this._maxObjects,
        this._maxDepth,
        this._depth + 1
      ),
    ]
  }

  /**
   * 检查边界是否包含对象
   */
  private boundsContainObject(obj: T): boolean {
    const objBounds = obj.getBounds()
    return this.boundsIntersect(this._bounds, objBounds)
  }

  /**
   * 检查两个边界是否相交
   */
  private boundsIntersect(a: IRect, b: IRect): boolean {
    return !(
      a.x + a.width < b.x ||
      b.x + b.width < a.x ||
      a.y + a.height < b.y ||
      b.y + b.height < a.y
    )
  }

  /**
   * 清空节点
   */
  clear(): void {
    this._objects = []
    if (this._children) {
      for (const child of this._children) {
        child.clear()
      }
      this._children = null
    }
  }

  /**
   * 获取调试信息
   */
  getDebugInfo(): object {
    return {
      bounds: this._bounds,
      depth: this._depth,
      objectCount: this._objects.length,
      hasChildren: !!this._children,
      children: this._children ? this._children.map((child) => child.getDebugInfo()) : null,
    }
  }
}

/**
 * 四叉树空间分割系统
 * 适用于动态变化较少的场景
 */
export class QuadTree<T extends ISpatialObject> {
  private _root: QuadTreeNode<T>
  private _maxObjects: number
  private _maxDepth: number

  constructor(bounds: IRect, maxObjects: number = 10, maxDepth: number = 5) {
    this._root = new QuadTreeNode(bounds, maxObjects, maxDepth)
    this._maxObjects = maxObjects
    this._maxDepth = maxDepth
  }

  /**
   * 插入对象
   */
  insert(obj: T): void {
    this._root.insert(obj)
  }

  /**
   * 查询指定边界内的对象
   */
  query(bounds: IRect): T[] {
    return this._root.query(bounds)
  }

  /**
   * 查询指定点周围的对象
   */
  queryPoint(point: IPoint): T[] {
    const bounds: IRect = { x: point.x, y: point.y, width: 0, height: 0 }
    return this.query(bounds)
  }

  /**
   * 清空四叉树
   */
  clear(): void {
    this._root.clear()
  }

  /**
   * 获取调试信息
   */
  getDebugInfo(): object {
    return {
      maxObjects: this._maxObjects,
      maxDepth: this._maxDepth,
      tree: this._root.getDebugInfo(),
    }
  }
}

/**
 * 空间分割管理器
 * 统一管理不同的空间分割算法
 */
export class SpatialPartitionManager<T extends ISpatialObject> {
  private _spatialGrid: SpatialGrid<T>
  private _quadTree: QuadTree<T> | null = null
  private _useQuadTree: boolean = false

  constructor(cellSize: number = 100, bounds?: IRect) {
    this._spatialGrid = new SpatialGrid<T>(cellSize)
    if (bounds) {
      this._quadTree = new QuadTree<T>(bounds)
    }
  }

  /**
   * 设置是否使用四叉树
   */
  setUseQuadTree(useQuadTree: boolean): void {
    this._useQuadTree = useQuadTree && !!this._quadTree
  }

  /**
   * 插入对象
   */
  insert(obj: T): void {
    this._spatialGrid.insert(obj)
    if (this._useQuadTree && this._quadTree) {
      this._quadTree.insert(obj)
    }
  }

  /**
   * 移除对象
   */
  remove(obj: T): void {
    this._spatialGrid.remove(obj)
    // 四叉树不支持单独移除，需要重建
    if (this._useQuadTree && this._quadTree) {
      // 这里可以考虑标记为删除，定期重建
      console.warn('QuadTree does not support individual removal, consider rebuilding')
    }
  }

  /**
   * 更新对象
   */
  update(obj: T): void {
    this._spatialGrid.update(obj)
    // 四叉树需要重建来更新对象位置
    if (this._useQuadTree && this._quadTree) {
      console.warn('QuadTree update requires rebuilding')
    }
  }

  /**
   * 查询指定边界内的对象
   */
  query(bounds: IRect): T[] {
    if (this._useQuadTree && this._quadTree) {
      return this._quadTree.query(bounds)
    } else {
      return Array.from(this._spatialGrid.query(bounds))
    }
  }

  /**
   * 查询指定点周围的对象
   */
  queryPoint(point: IPoint): T[] {
    if (this._useQuadTree && this._quadTree) {
      return this._quadTree.queryPoint(point)
    } else {
      return Array.from(this._spatialGrid.queryPoint(point))
    }
  }

  /**
   * 查询指定半径内的对象
   */
  queryRadius(center: IPoint, radius: number): T[] {
    const bounds: IRect = {
      x: center.x - radius,
      y: center.y - radius,
      width: radius * 2,
      height: radius * 2,
    }
    return this.query(bounds)
  }

  /**
   * 清空所有对象
   */
  clear(): void {
    this._spatialGrid.clear()
    if (this._quadTree) {
      this._quadTree.clear()
    }
  }

  /**
   * 重建四叉树（用于批量更新后）
   */
  rebuildQuadTree(objects: T[]): void {
    if (this._quadTree) {
      this._quadTree.clear()
      for (const obj of objects) {
        this._quadTree.insert(obj)
      }
    }
  }

  /**
   * 获取调试信息
   */
  getDebugInfo(): object {
    return {
      useQuadTree: this._useQuadTree,
      spatialGrid: this._spatialGrid.getDebugInfo(),
      quadTree: this._quadTree?.getDebugInfo() || null,
    }
  }
}
