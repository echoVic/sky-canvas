/**
 * WebGL资源引用计数器
 */

export class ResourceRefCounter {
  private refCounts = new Map<string, number>()
  private callbacks = new Map<string, () => void>()

  /**
   * 增加引用计数
   */
  addRef(id: string): number {
    const count = (this.refCounts.get(id) || 0) + 1
    this.refCounts.set(id, count)
    return count
  }

  /**
   * 减少引用计数
   */
  releaseRef(id: string): number {
    const count = Math.max(0, (this.refCounts.get(id) || 0) - 1)

    if (count === 0) {
      this.refCounts.delete(id)
      const callback = this.callbacks.get(id)
      if (callback) {
        callback()
        this.callbacks.delete(id)
      }
    } else {
      this.refCounts.set(id, count)
    }

    return count
  }

  /**
   * 获取引用计数
   */
  getRefCount(id: string): number {
    return this.refCounts.get(id) || 0
  }

  /**
   * 设置零引用回调
   */
  setZeroRefCallback(id: string, callback: () => void): void {
    this.callbacks.set(id, callback)
  }

  /**
   * 移除零引用回调
   */
  removeZeroRefCallback(id: string): void {
    this.callbacks.delete(id)
  }

  /**
   * 检查是否无引用
   */
  hasNoReferences(id: string): boolean {
    return this.getRefCount(id) === 0
  }

  /**
   * 清除所有引用
   */
  clear(): void {
    this.refCounts.clear()
    this.callbacks.clear()
  }

  /**
   * 获取所有资源ID
   */
  getAllResourceIds(): string[] {
    return Array.from(this.refCounts.keys())
  }

  /**
   * 获取统计信息
   */
  getStats(): { totalResources: number; totalRefs: number } {
    let totalRefs = 0
    for (const count of this.refCounts.values()) {
      totalRefs += count
    }
    return {
      totalResources: this.refCounts.size,
      totalRefs,
    }
  }
}
