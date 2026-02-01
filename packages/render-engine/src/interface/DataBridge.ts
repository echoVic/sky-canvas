/**
 * 数据桥接器 - 优化Canvas SDK与Render Engine之间的数据传输
 * 提供增量更新、数据压缩、智能缓存等优化机制
 */

import {
  type BatchSyncResult,
  type DataBridgeStats,
  type DataChange,
  DataChangeType,
  DEFAULT_SYNC_CONFIG,
  type IncrementalData,
  type SyncConfig,
  type SyncResult,
} from './data-bridge'
import { ConflictResolver } from './data-bridge/ConflictResolver'
import { DataCompressor } from './data-bridge/DataCompressor'
import { DataVersionManager } from './data-bridge/DataVersionManager'
import { globalInterfaceOptimizer } from './OptimizedInterface'

export type {
  BatchSyncResult,
  DataChange,
  IncrementalData,
  SyncConfig,
  SyncResult,
} from './data-bridge'
// 重新导出类型
export { DataChangeType } from './data-bridge'

/**
 * 数据桥接器主类
 */
export class DataBridge {
  private versionManager = new DataVersionManager()
  private compressor = new DataCompressor()
  private conflictResolver = new ConflictResolver()
  private changeLog: DataChange[] = []
  private subscribers = new Map<string, Set<(data: unknown) => void>>()

  private config: SyncConfig = { ...DEFAULT_SYNC_CONFIG }

  private stats = {
    totalChanges: 0,
    incrementalUpdates: 0,
    compressionSavings: 0,
    conflictsResolved: 0,
    dataTransferred: 0,
  }

  /**
   * 同步数据到目标
   */
  sync<T>(id: string, data: T, source: string): SyncResult {
    try {
      let dataToTransfer: unknown
      let transferSize: number

      if (this.config.enableIncrementalSync) {
        const delta = this.versionManager.calculateDelta(id, data)

        if (!delta) {
          return { success: true }
        }

        dataToTransfer = delta
        this.stats.incrementalUpdates++
      } else {
        dataToTransfer = { id, data, version: this.versionManager.updateVersion(id, data) }
      }

      if (this.config.enableCompression) {
        const compressed = this.compressor.compress(dataToTransfer)
        dataToTransfer = {
          ...(dataToTransfer as object),
          compressed: compressed.compressed,
          data: compressed.data,
        }

        this.stats.compressionSavings += compressed.originalSize - compressed.compressedSize
        transferSize = compressed.compressedSize
      } else {
        transferSize = JSON.stringify(dataToTransfer).length
      }

      this.recordChange({
        type: DataChangeType.UPDATE,
        id,
        data,
        timestamp: Date.now(),
        source,
      })

      this.notifySubscribers(id, data)

      this.stats.totalChanges++
      this.stats.dataTransferred += transferSize

      return {
        success: true,
        transferred: dataToTransfer,
        size: transferSize,
      }
    } catch (error) {
      console.error('Data sync failed:', error)
      return { success: false }
    }
  }

  /**
   * 批量同步数据
   */
  syncBatch<T>(items: Array<{ id: string; data: T }>, source: string): BatchSyncResult {
    const results: Array<{ id: string; success: boolean; size?: number }> = []

    // 使用批处理管理器延迟执行
    globalInterfaceOptimizer.batchManager.addCall(
      'dataSyncBatch',
      { items, source },
      (batches: Array<{ items: Array<{ id: string; data: T }>; source: string }>) => {
        for (const batch of batches) {
          for (const item of batch.items) {
            const result = this.sync(item.id, item.data, batch.source)
            results.push({
              id: item.id,
              success: result.success,
              size: result.size,
            })
          }
        }
      }
    )

    // 立即刷新以获取结果
    globalInterfaceOptimizer.batchManager.flush()

    return { success: true, results }
  }

  /**
   * 应用增量更新
   */
  applyDelta<T extends object>(id: string, delta: IncrementalData<T>, currentData: T): T {
    if (!delta.changes) return currentData

    if (this.config.enableChecksum && delta.checksum) {
      const calculatedChecksum = this.calculateChecksum(delta.changes)
      if (calculatedChecksum !== delta.checksum) {
        console.warn('Checksum mismatch for delta update')
        return currentData
      }
    }

    const updatedData = { ...currentData } as Record<string, unknown>

    for (const [key, value] of Object.entries(delta.changes)) {
      if (value === undefined) {
        delete updatedData[key]
      } else {
        updatedData[key] = value
      }
    }

    return updatedData as T
  }

  /**
   * 解决冲突并合并数据
   */
  resolveConflict<T>(id: string, localData: T, remoteData: T): T {
    const resolution = this.conflictResolver.resolve(
      localData,
      remoteData,
      this.config.conflictResolution
    )

    if (resolution.hasConflicts) {
      console.warn(`Data conflicts resolved for ${id}:`, resolution.conflicts)
      this.stats.conflictsResolved++
    }

    return resolution.resolved
  }

  /**
   * 订阅数据变更
   */
  subscribe(id: string, callback: (data: unknown) => void): () => void {
    if (!this.subscribers.has(id)) {
      this.subscribers.set(id, new Set())
    }

    this.subscribers.get(id)!.add(callback)

    return () => {
      const subscribers = this.subscribers.get(id)
      if (subscribers) {
        subscribers.delete(callback)
        if (subscribers.size === 0) {
          this.subscribers.delete(id)
        }
      }
    }
  }

  /**
   * 获取变更历史
   */
  getChangeHistory(id?: string, limit = 100): DataChange[] {
    let history = this.changeLog

    if (id) {
      history = history.filter((change) => change.id === id)
    }

    return history.slice(-limit)
  }

  /**
   * 配置数据桥接器
   */
  configure(config: Partial<SyncConfig>): void {
    Object.assign(this.config, config)
  }

  /**
   * 获取统计信息
   */
  getStats(): DataBridgeStats {
    return {
      ...this.stats,
      changeLogSize: this.changeLog.length,
      subscriberCount: this.subscribers.size,
    }
  }

  /**
   * 清理旧数据
   */
  cleanup(): void {
    this.versionManager.cleanup()

    const cutoff = Date.now() - 24 * 60 * 60 * 1000
    this.changeLog = this.changeLog.filter((change) => change.timestamp > cutoff)
  }

  /**
   * 销毁数据桥接器
   */
  dispose(): void {
    this.versionManager.dispose()
    this.subscribers.clear()
    this.changeLog = []
  }

  private notifySubscribers(id: string, data: unknown): void {
    const subscribers = this.subscribers.get(id)
    if (subscribers) {
      for (const callback of subscribers) {
        try {
          callback(data)
        } catch (error) {
          console.error('Subscriber notification error:', error)
        }
      }
    }
  }

  private recordChange(change: DataChange): void {
    this.changeLog.push(change)

    if (this.changeLog.length > 10000) {
      this.changeLog = this.changeLog.slice(-5000)
    }
  }

  private calculateChecksum(data: unknown): string {
    const str = JSON.stringify(data)
    let hash = 0

    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i)
      hash = (hash << 5) - hash + char
      hash = hash & hash
    }

    return hash.toString(36)
  }
}

// 创建全局数据桥接器实例
export const globalDataBridge = new DataBridge()
