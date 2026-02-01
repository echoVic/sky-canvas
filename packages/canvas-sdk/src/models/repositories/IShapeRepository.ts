/**
 * 形状数据访问接口
 * MVVM架构中的Model层 - 数据访问抽象
 */

import type { ShapeEntity } from '../entities/Shape'

/**
 * 查询条件
 */
export interface IShapeQuery {
  type?: string
  visible?: boolean
  zIndexRange?: { min: number; max: number }
  boundingBox?: {
    x: number
    y: number
    width: number
    height: number
  }
  createdAfter?: Date
  createdBefore?: Date
}

/**
 * 排序选项
 */
export interface IShapeSortOptions {
  field: 'createdAt' | 'updatedAt' | 'zIndex' | 'type'
  order: 'asc' | 'desc'
}

/**
 * 分页选项
 */
export interface IPaginationOptions {
  offset: number
  limit: number
}

/**
 * 查询结果
 */
export interface IShapeQueryResult {
  shapes: ShapeEntity[]
  total: number
  hasMore: boolean
}

/**
 * 形状仓储接口
 */
export interface IShapeRepository {
  /**
   * 添加形状
   */
  add(shape: ShapeEntity): Promise<ShapeEntity>

  /**
   * 批量添加形状
   */
  addBatch(shapes: ShapeEntity[]): Promise<ShapeEntity[]>

  /**
   * 根据ID获取形状
   */
  getById(id: string): Promise<ShapeEntity | null>

  /**
   * 批量根据ID获取形状
   */
  getByIds(ids: string[]): Promise<ShapeEntity[]>

  /**
   * 获取所有形状
   */
  getAll(): Promise<ShapeEntity[]>

  /**
   * 查询形状
   */
  query(
    query?: IShapeQuery,
    sort?: IShapeSortOptions,
    pagination?: IPaginationOptions
  ): Promise<IShapeQueryResult>

  /**
   * 更新形状
   */
  update(id: string, updates: Partial<ShapeEntity>): Promise<ShapeEntity | null>

  /**
   * 批量更新形状
   */
  updateBatch(updates: Array<{ id: string; updates: Partial<ShapeEntity> }>): Promise<ShapeEntity[]>

  /**
   * 删除形状
   */
  remove(id: string): Promise<boolean>

  /**
   * 批量删除形状
   */
  removeBatch(ids: string[]): Promise<boolean>

  /**
   * 清空所有形状
   */
  clear(): Promise<void>

  /**
   * 获取形状数量
   */
  count(query?: IShapeQuery): Promise<number>

  /**
   * 检查形状是否存在
   */
  exists(id: string): Promise<boolean>

  /**
   * 事务操作
   */
  transaction<T>(operation: (repo: IShapeRepository) => Promise<T>): Promise<T>

  /**
   * 订阅数据变化
   */
  subscribe(callback: (event: IRepositoryEvent) => void): () => void
}

/**
 * 仓储事件
 */
export interface IRepositoryEvent {
  type: 'added' | 'updated' | 'removed' | 'cleared'
  shapes: ShapeEntity[]
  timestamp: Date
}

/**
 * 内存形状仓储实现
 */
export class MemoryShapeRepository implements IShapeRepository {
  private shapes = new Map<string, ShapeEntity>()
  private subscribers = new Set<(event: IRepositoryEvent) => void>()

  async add(shape: ShapeEntity): Promise<ShapeEntity> {
    this.shapes.set(shape.id, { ...shape })
    this.notifySubscribers({ type: 'added', shapes: [shape], timestamp: new Date() })
    return shape
  }

  async addBatch(shapes: ShapeEntity[]): Promise<ShapeEntity[]> {
    for (const shape of shapes) {
      this.shapes.set(shape.id, { ...shape })
    }
    this.notifySubscribers({ type: 'added', shapes, timestamp: new Date() })
    return shapes
  }

  async getById(id: string): Promise<ShapeEntity | null> {
    const shape = this.shapes.get(id)
    return shape ? { ...shape } : null
  }

  async getByIds(ids: string[]): Promise<ShapeEntity[]> {
    const result: ShapeEntity[] = []
    for (const id of ids) {
      const shape = this.shapes.get(id)
      if (shape) {
        result.push({ ...shape })
      }
    }
    return result
  }

  async getAll(): Promise<ShapeEntity[]> {
    return Array.from(this.shapes.values()).map((shape) => ({ ...shape }))
  }

  async query(
    query?: IShapeQuery,
    sort?: IShapeSortOptions,
    pagination?: IPaginationOptions
  ): Promise<IShapeQueryResult> {
    let results = Array.from(this.shapes.values())

    // 应用查询条件
    if (query) {
      results = results.filter((shape) => this.matchesQuery(shape, query))
    }

    // 应用排序
    if (sort) {
      results.sort((a, b) => this.compareShapes(a, b, sort))
    }

    const total = results.length

    // 应用分页
    if (pagination) {
      const { offset, limit } = pagination
      results = results.slice(offset, offset + limit)
    }

    return {
      shapes: results.map((shape) => ({ ...shape })),
      total,
      hasMore: pagination ? pagination.offset + pagination.limit < total : false,
    }
  }

  async update(id: string, updates: Partial<ShapeEntity>): Promise<ShapeEntity | null> {
    const shape = this.shapes.get(id)
    if (!shape) return null

    const updatedShape = {
      ...shape,
      ...updates,
      id, // 确保ID不被更改
      updatedAt: new Date(),
    } as ShapeEntity

    this.shapes.set(id, updatedShape)
    this.notifySubscribers({ type: 'updated', shapes: [updatedShape], timestamp: new Date() })
    return { ...updatedShape }
  }

  async updateBatch(
    updates: Array<{ id: string; updates: Partial<ShapeEntity> }>
  ): Promise<ShapeEntity[]> {
    const updatedShapes: ShapeEntity[] = []

    for (const { id, updates: shapeUpdates } of updates) {
      const shape = this.shapes.get(id)
      if (shape) {
        const updatedShape = {
          ...shape,
          ...shapeUpdates,
          id,
          updatedAt: new Date(),
        } as ShapeEntity
        this.shapes.set(id, updatedShape)
        updatedShapes.push({ ...updatedShape })
      }
    }

    if (updatedShapes.length > 0) {
      this.notifySubscribers({ type: 'updated', shapes: updatedShapes, timestamp: new Date() })
    }

    return updatedShapes
  }

  async remove(id: string): Promise<boolean> {
    const shape = this.shapes.get(id)
    if (!shape) return false

    this.shapes.delete(id)
    this.notifySubscribers({ type: 'removed', shapes: [shape], timestamp: new Date() })
    return true
  }

  async removeBatch(ids: string[]): Promise<boolean> {
    const removedShapes: ShapeEntity[] = []

    for (const id of ids) {
      const shape = this.shapes.get(id)
      if (shape) {
        this.shapes.delete(id)
        removedShapes.push(shape)
      }
    }

    if (removedShapes.length > 0) {
      this.notifySubscribers({ type: 'removed', shapes: removedShapes, timestamp: new Date() })
    }

    return removedShapes.length > 0
  }

  async clear(): Promise<void> {
    const allShapes = Array.from(this.shapes.values())
    this.shapes.clear()
    if (allShapes.length > 0) {
      this.notifySubscribers({ type: 'cleared', shapes: allShapes, timestamp: new Date() })
    }
  }

  async count(query?: IShapeQuery): Promise<number> {
    if (!query) return this.shapes.size

    let count = 0
    for (const shape of this.shapes.values()) {
      if (this.matchesQuery(shape, query)) {
        count++
      }
    }
    return count
  }

  async exists(id: string): Promise<boolean> {
    return this.shapes.has(id)
  }

  async transaction<T>(operation: (repo: IShapeRepository) => Promise<T>): Promise<T> {
    // 简单实现：直接执行操作
    // 在实际应用中，可以实现事务回滚机制
    return operation(this)
  }

  subscribe(callback: (event: IRepositoryEvent) => void): () => void {
    this.subscribers.add(callback)
    return () => {
      this.subscribers.delete(callback)
    }
  }

  private notifySubscribers(event: IRepositoryEvent): void {
    this.subscribers.forEach((callback) => {
      try {
        callback(event)
      } catch {}
    })
  }

  private matchesQuery(shape: ShapeEntity, query: IShapeQuery): boolean {
    if (query.type && shape.type !== query.type) return false
    if (query.visible !== undefined && shape.visible !== query.visible) return false
    if (query.zIndexRange) {
      const { min, max } = query.zIndexRange
      if (shape.zIndex < min || shape.zIndex > max) return false
    }
    if (query.createdAfter && shape.createdAt < query.createdAfter) return false
    if (query.createdBefore && shape.createdAt > query.createdBefore) return false
    return true
  }

  private compareShapes(a: ShapeEntity, b: ShapeEntity, sort: IShapeSortOptions): number {
    const { field, order } = sort
    let comparison = 0

    switch (field) {
      case 'createdAt':
        comparison = a.createdAt.getTime() - b.createdAt.getTime()
        break
      case 'updatedAt':
        comparison = a.updatedAt.getTime() - b.updatedAt.getTime()
        break
      case 'zIndex':
        comparison = a.zIndex - b.zIndex
        break
      case 'type':
        comparison = a.type.localeCompare(b.type)
        break
    }

    return order === 'desc' ? -comparison : comparison
  }
}
