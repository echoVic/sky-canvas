/**
 * GPU内存分配器
 */

/**
 * 内存块
 */
export interface MemoryBlock {
  offset: number
  size: number
}

/**
 * 分配器统计
 */
export interface AllocatorStats {
  totalBudget: number
  allocatedMemory: number
  freeMemory: number
  fragmentationRatio: number
}

/**
 * GPU内存分配器
 */
export class GPUMemoryAllocator {
  private totalBudget: number
  private allocatedMemory = 0
  private allocations = new Map<string, number>()
  private freeBlocks: MemoryBlock[] = []

  constructor(budget: number) {
    this.totalBudget = budget
    this.freeBlocks.push({ offset: 0, size: budget })
  }

  /**
   * 分配内存
   */
  allocate(id: string, size: number): MemoryBlock | null {
    const blockIndex = this.freeBlocks.findIndex((block) => block.size >= size)

    if (blockIndex === -1) {
      return null
    }

    const block = this.freeBlocks[blockIndex]
    const allocation = { offset: block.offset, size }

    if (block.size === size) {
      this.freeBlocks.splice(blockIndex, 1)
    } else {
      block.offset += size
      block.size -= size
    }

    this.allocations.set(id, allocation.offset)
    this.allocatedMemory += size

    return allocation
  }

  /**
   * 释放内存
   */
  deallocate(id: string, size: number): void {
    const offset = this.allocations.get(id)
    if (offset === undefined) return

    this.allocations.delete(id)
    this.allocatedMemory -= size

    this.addFreeBlock({ offset, size })
  }

  /**
   * 添加空闲块
   */
  private addFreeBlock(newBlock: MemoryBlock): void {
    let inserted = false

    for (let i = 0; i < this.freeBlocks.length; i++) {
      const block = this.freeBlocks[i]

      if (newBlock.offset + newBlock.size === block.offset) {
        block.offset = newBlock.offset
        block.size += newBlock.size
        inserted = true
        break
      } else if (block.offset + block.size === newBlock.offset) {
        block.size += newBlock.size
        inserted = true
        break
      } else if (newBlock.offset < block.offset) {
        this.freeBlocks.splice(i, 0, newBlock)
        inserted = true
        break
      }
    }

    if (!inserted) {
      this.freeBlocks.push(newBlock)
    }

    this.mergeFreeBlocks()
  }

  /**
   * 合并相邻空闲块
   */
  private mergeFreeBlocks(): void {
    this.freeBlocks.sort((a, b) => a.offset - b.offset)

    for (let i = 0; i < this.freeBlocks.length - 1; i++) {
      const current = this.freeBlocks[i]
      const next = this.freeBlocks[i + 1]

      if (current.offset + current.size === next.offset) {
        current.size += next.size
        this.freeBlocks.splice(i + 1, 1)
        i--
      }
    }
  }

  /**
   * 获取碎片化比率
   */
  getFragmentationRatio(): number {
    if (this.freeBlocks.length <= 1) return 0

    const totalFreeMemory = this.freeBlocks.reduce((sum, block) => sum + block.size, 0)
    const largestFreeBlock = Math.max(...this.freeBlocks.map((block) => block.size))

    return totalFreeMemory > 0 ? 1 - largestFreeBlock / totalFreeMemory : 0
  }

  /**
   * 获取统计信息
   */
  getStats(): AllocatorStats {
    return {
      totalBudget: this.totalBudget,
      allocatedMemory: this.allocatedMemory,
      freeMemory: this.totalBudget - this.allocatedMemory,
      fragmentationRatio: this.getFragmentationRatio(),
    }
  }

  /**
   * 检查是否有足够内存
   */
  hasEnoughMemory(size: number): boolean {
    return this.freeBlocks.some((block) => block.size >= size)
  }

  /**
   * 重置分配器
   */
  reset(): void {
    this.allocatedMemory = 0
    this.allocations.clear()
    this.freeBlocks = [{ offset: 0, size: this.totalBudget }]
  }

  /**
   * 更新预算
   */
  updateBudget(newBudget: number): void {
    this.totalBudget = newBudget
    this.reset()
  }
}
