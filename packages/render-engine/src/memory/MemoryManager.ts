/**
 * 内存池类型
 */
export enum PoolType {
  VERTEX_BUFFER = 'vertex_buffer',
  INDEX_BUFFER = 'index_buffer',
  UNIFORM_BUFFER = 'uniform_buffer',
  TEXTURE = 'texture',
  FRAMEBUFFER = 'framebuffer',
}

/**
 * 内存块状态
 */
export enum BlockStatus {
  FREE = 'free',
  ALLOCATED = 'allocated',
  FRAGMENTED = 'fragmented',
}

/**
 * 内存块
 */
export interface MemoryBlock {
  id: string
  offset: number
  size: number
  status: BlockStatus
  poolType: PoolType
  lastUsed: number
  refCount: number
  data?: ArrayBuffer
}

/**
 * 内存统计信息
 */
export interface MemoryStats {
  totalAllocated: number
  totalUsed: number
  fragmentation: number
  blockCount: number
  poolStats: Map<PoolType, { allocated: number; used: number; blocks: number }>
}

/**
 * WebGL内存池
 */
export class WebGLMemoryPool {
  private blocks = new Map<string, MemoryBlock>()
  private freeBlocks: MemoryBlock[] = []
  private allocatedBlocks: MemoryBlock[] = []
  private totalSize: number
  private nextBlockId = 0

  constructor(
    private gl: WebGLRenderingContext,
    public readonly type: PoolType,
    initialSize: number = 64 * 1024 * 1024 // 64MB
  ) {
    this.totalSize = initialSize
    this.initializePool()
  }

  private initializePool(): void {
    // 创建初始的大块自由内存
    const initialBlock: MemoryBlock = {
      id: this.generateBlockId(),
      offset: 0,
      size: this.totalSize,
      status: BlockStatus.FREE,
      poolType: this.type,
      lastUsed: Date.now(),
      refCount: 0,
    }

    this.blocks.set(initialBlock.id, initialBlock)
    this.freeBlocks.push(initialBlock)
  }

  private generateBlockId(): string {
    return `${this.type}_block_${this.nextBlockId++}`
  }

  /**
   * 分配内存块
   */
  allocate(size: number, alignment: number = 4): MemoryBlock | null {
    // 对齐大小
    const alignedSize = this.alignSize(size, alignment)

    // 查找最适合的自由块（首次适配算法）
    const blockIndex = this.freeBlocks.findIndex((block) => block.size >= alignedSize)

    if (blockIndex === -1) {
      // 尝试碎片整理
      this.defragment()

      // 再次查找
      const retryIndex = this.freeBlocks.findIndex((block) => block.size >= alignedSize)
      if (retryIndex === -1) {
        return null // 内存不足
      }
      return this.splitAndAllocate(this.freeBlocks[retryIndex], alignedSize, retryIndex)
    }

    return this.splitAndAllocate(this.freeBlocks[blockIndex], alignedSize, blockIndex)
  }

  private alignSize(size: number, alignment: number): number {
    return Math.ceil(size / alignment) * alignment
  }

  private splitAndAllocate(block: MemoryBlock, size: number, freeIndex: number): MemoryBlock {
    // 如果块正好合适，直接使用
    if (block.size === size) {
      block.status = BlockStatus.ALLOCATED
      block.refCount = 1
      block.lastUsed = Date.now()

      this.freeBlocks.splice(freeIndex, 1)
      this.allocatedBlocks.push(block)

      return block
    }

    // 分割块
    const allocatedBlock: MemoryBlock = {
      id: this.generateBlockId(),
      offset: block.offset,
      size: size,
      status: BlockStatus.ALLOCATED,
      poolType: this.type,
      lastUsed: Date.now(),
      refCount: 1,
    }

    const remainingBlock: MemoryBlock = {
      id: this.generateBlockId(),
      offset: block.offset + size,
      size: block.size - size,
      status: BlockStatus.FREE,
      poolType: this.type,
      lastUsed: Date.now(),
      refCount: 0,
    }

    // 更新数据结构
    this.blocks.delete(block.id)
    this.blocks.set(allocatedBlock.id, allocatedBlock)
    this.blocks.set(remainingBlock.id, remainingBlock)

    this.freeBlocks[freeIndex] = remainingBlock
    this.allocatedBlocks.push(allocatedBlock)

    return allocatedBlock
  }

  /**
   * 释放内存块
   */
  deallocate(blockId: string): void {
    const block = this.blocks.get(blockId)
    if (!block || block.status !== BlockStatus.ALLOCATED) {
      return
    }

    block.refCount--
    if (block.refCount > 0) {
      return
    }

    // 标记为自由
    block.status = BlockStatus.FREE
    block.lastUsed = Date.now()

    // 从分配列表移除，加入自由列表
    const allocatedIndex = this.allocatedBlocks.findIndex((b) => b.id === blockId)
    if (allocatedIndex !== -1) {
      this.allocatedBlocks.splice(allocatedIndex, 1)
    }

    this.freeBlocks.push(block)

    // 尝试合并相邻的自由块
    this.coalesceBlock(block)
  }

  private coalesceBlock(block: MemoryBlock): void {
    const adjacentBlocks = this.findAdjacentFreeBlocks(block)

    if (adjacentBlocks.length === 0) {
      return
    }

    // 合并所有相邻的自由块
    let mergedSize = block.size
    let mergedOffset = block.offset

    for (const adjacent of adjacentBlocks) {
      mergedSize += adjacent.size
      mergedOffset = Math.min(mergedOffset, adjacent.offset)

      // 移除相邻块
      this.blocks.delete(adjacent.id)
      const freeIndex = this.freeBlocks.findIndex((b) => b.id === adjacent.id)
      if (freeIndex !== -1) {
        this.freeBlocks.splice(freeIndex, 1)
      }
    }

    // 更新原块
    block.offset = mergedOffset
    block.size = mergedSize
    block.lastUsed = Date.now()
  }

  private findAdjacentFreeBlocks(block: MemoryBlock): MemoryBlock[] {
    const adjacent: MemoryBlock[] = []

    for (const freeBlock of this.freeBlocks) {
      if (freeBlock.id === block.id) continue

      // 检查是否相邻
      if (
        freeBlock.offset + freeBlock.size === block.offset ||
        block.offset + block.size === freeBlock.offset
      ) {
        adjacent.push(freeBlock)
      }
    }

    return adjacent
  }

  /**
   * 内存碎片整理
   */
  defragment(): void {
    // 简化的压缩算法：将所有已分配的块移动到内存开始位置
    this.allocatedBlocks.sort((a, b) => a.offset - b.offset)

    let currentOffset = 0

    for (const block of this.allocatedBlocks) {
      if (block.offset !== currentOffset) {
        // 需要移动数据
        if (block.data) {
          // 这里应该实际移动GPU内存，简化实现
          block.offset = currentOffset
        }
      }
      currentOffset += block.size
    }

    // 重建自由块列表
    this.rebuildFreeBlocks(currentOffset)
  }

  private rebuildFreeBlocks(usedMemory: number): void {
    // 清空自由块
    for (const block of this.freeBlocks) {
      this.blocks.delete(block.id)
    }
    this.freeBlocks.length = 0

    // 如果还有剩余空间，创建一个大的自由块
    if (usedMemory < this.totalSize) {
      const freeBlock: MemoryBlock = {
        id: this.generateBlockId(),
        offset: usedMemory,
        size: this.totalSize - usedMemory,
        status: BlockStatus.FREE,
        poolType: this.type,
        lastUsed: Date.now(),
        refCount: 0,
      }

      this.blocks.set(freeBlock.id, freeBlock)
      this.freeBlocks.push(freeBlock)
    }
  }

  /**
   * 获取统计信息
   */
  getStats(): { allocated: number; used: number; fragmentation: number; blocks: number } {
    const allocated = this.allocatedBlocks.reduce((sum, block) => sum + block.size, 0)
    const used = allocated // 简化：假设所有分配的内存都在使用
    const fragmentation = this.calculateFragmentation()

    return {
      allocated,
      used,
      fragmentation,
      blocks: this.blocks.size,
    }
  }

  private calculateFragmentation(): number {
    if (this.freeBlocks.length <= 1) {
      return 0
    }

    // 计算碎片率：小自由块数量 / 总自由块数量
    const smallBlocks = this.freeBlocks.filter((block) => block.size < 1024).length
    return smallBlocks / this.freeBlocks.length
  }

  /**
   * 扩展内存池
   */
  expand(additionalSize: number): void {
    const expansionBlock: MemoryBlock = {
      id: this.generateBlockId(),
      offset: this.totalSize,
      size: additionalSize,
      status: BlockStatus.FREE,
      poolType: this.type,
      lastUsed: Date.now(),
      refCount: 0,
    }

    this.blocks.set(expansionBlock.id, expansionBlock)
    this.freeBlocks.push(expansionBlock)
    this.totalSize += additionalSize

    // 尝试与现有的最后一个自由块合并
    const lastFreeBlock = this.freeBlocks.find(
      (block) => block.offset + block.size === expansionBlock.offset
    )

    if (lastFreeBlock) {
      this.coalesceBlock(expansionBlock)
    }
  }

  dispose(): void {
    this.blocks.clear()
    this.freeBlocks.length = 0
    this.allocatedBlocks.length = 0
  }
}

/**
 * WebGL内存管理器
 */
export class WebGLMemoryManager {
  private pools = new Map<PoolType, WebGLMemoryPool>()
  private globalStats: MemoryStats = {
    totalAllocated: 0,
    totalUsed: 0,
    fragmentation: 0,
    blockCount: 0,
    poolStats: new Map(),
  }

  constructor(private gl: WebGLRenderingContext) {
    this.initializePools()
    this.startCleanupTimer()
  }

  private initializePools(): void {
    // 创建不同类型的内存池
    const poolConfigs = [
      { type: PoolType.VERTEX_BUFFER, size: 32 * 1024 * 1024 }, // 32MB
      { type: PoolType.INDEX_BUFFER, size: 16 * 1024 * 1024 }, // 16MB
      { type: PoolType.UNIFORM_BUFFER, size: 4 * 1024 * 1024 }, // 4MB
      { type: PoolType.TEXTURE, size: 128 * 1024 * 1024 }, // 128MB
      { type: PoolType.FRAMEBUFFER, size: 64 * 1024 * 1024 }, // 64MB
    ]

    for (const config of poolConfigs) {
      const pool = new WebGLMemoryPool(this.gl, config.type, config.size)
      this.pools.set(config.type, pool)
    }
  }

  /**
   * 分配内存
   */
  allocate(type: PoolType, size: number, alignment?: number): MemoryBlock | null {
    const pool = this.pools.get(type)
    if (!pool) {
      throw new Error(`Pool type ${type} not found`)
    }

    let block = pool.allocate(size, alignment)

    // 如果分配失败，尝试扩展内存池
    if (!block) {
      const poolStats = pool.getStats()
      const expansionSize = Math.max(size * 2, poolStats.allocated * 0.5)
      pool.expand(expansionSize)
      block = pool.allocate(size, alignment)
    }

    if (block) {
      this.updateGlobalStats()
    }

    return block
  }

  /**
   * 释放内存
   */
  deallocate(block: MemoryBlock): void {
    const pool = this.pools.get(block.poolType)
    if (pool) {
      pool.deallocate(block.id)
      this.updateGlobalStats()
    }
  }

  /**
   * 批量分配
   */
  allocateBatch(
    requests: Array<{ type: PoolType; size: number; alignment?: number }>
  ): MemoryBlock[] {
    const results: MemoryBlock[] = []

    for (const request of requests) {
      const block = this.allocate(request.type, request.size, request.alignment)
      if (block) {
        results.push(block)
      }
    }

    return results
  }

  /**
   * 获取池统计信息
   */
  getPoolStats(
    type: PoolType
  ): { allocated: number; used: number; fragmentation: number; blocks: number } | null {
    const pool = this.pools.get(type)
    return pool ? pool.getStats() : null
  }

  /**
   * 更新全局统计信息
   */
  private updateGlobalStats(): void {
    let totalAllocated = 0
    let totalUsed = 0
    let totalFragmentation = 0
    let totalBlocks = 0

    this.globalStats.poolStats.clear()

    for (const [type, pool] of this.pools) {
      const stats = pool.getStats()

      totalAllocated += stats.allocated
      totalUsed += stats.used
      totalFragmentation += stats.fragmentation
      totalBlocks += stats.blocks

      this.globalStats.poolStats.set(type, stats)
    }

    this.globalStats.totalAllocated = totalAllocated
    this.globalStats.totalUsed = totalUsed
    this.globalStats.fragmentation = totalFragmentation / this.pools.size
    this.globalStats.blockCount = totalBlocks
  }

  /**
   * 获取全局统计信息
   */
  getGlobalStats(): MemoryStats {
    this.updateGlobalStats()
    return { ...this.globalStats }
  }

  /**
   * 执行垃圾回收
   */
  garbageCollect(): void {
    for (const [type, pool] of this.pools) {
      // 执行碎片整理
      pool.defragment()
    }

    this.updateGlobalStats()
  }

  /**
   * 自动清理定时器
   */
  private startCleanupTimer(): void {
    setInterval(() => {
      this.performPeriodicCleanup()
    }, 30000) // 每30秒执行一次清理
  }

  private performPeriodicCleanup(): void {
    const stats = this.getGlobalStats()

    // 如果碎片率过高，执行垃圾回收
    if (stats.fragmentation > 0.3) {
      this.garbageCollect()
    }
  }

  /**
   * 内存压力检测
   */
  isUnderMemoryPressure(): boolean {
    const stats = this.getGlobalStats()
    const usageRatio = stats.totalUsed / stats.totalAllocated

    return usageRatio > 0.85 || stats.fragmentation > 0.5
  }

  /**
   * 获取内存使用建议
   */
  getMemoryRecommendations(): string[] {
    const recommendations: string[] = []
    const stats = this.getGlobalStats()

    if (stats.fragmentation > 0.3) {
      recommendations.push('High memory fragmentation detected. Consider calling garbageCollect()')
    }

    if (this.isUnderMemoryPressure()) {
      recommendations.push('System is under memory pressure. Consider freeing unused resources')
    }

    for (const [type, poolStats] of stats.poolStats) {
      const usageRatio = poolStats.used / poolStats.allocated
      if (usageRatio > 0.9) {
        recommendations.push(`${type} pool is almost full (${Math.round(usageRatio * 100)}% used)`)
      }
    }

    return recommendations
  }

  /**
   * 销毁管理器
   */
  dispose(): void {
    for (const pool of this.pools.values()) {
      pool.dispose()
    }
    this.pools.clear()
  }
}
