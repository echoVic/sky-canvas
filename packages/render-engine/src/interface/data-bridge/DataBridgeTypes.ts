/**
 * 数据桥接器类型定义
 */

/**
 * 数据变更类型
 */
export enum DataChangeType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  BATCH = 'batch',
}

/**
 * 数据变更记录
 */
export interface DataChange<T = unknown> {
  type: DataChangeType
  id: string
  data?: T
  previousData?: T
  timestamp: number
  source: string
  fields?: string[]
}

/**
 * 增量更新数据
 */
export interface IncrementalData<T = unknown> {
  id: string
  changes: Partial<T>
  version: number
  checksum?: string
}

/**
 * 数据同步配置
 */
export interface SyncConfig {
  enableIncrementalSync: boolean
  enableCompression: boolean
  enableChecksum: boolean
  batchSize: number
  syncInterval: number
  conflictResolution: 'client' | 'server' | 'merge'
}

/**
 * 默认同步配置
 */
export const DEFAULT_SYNC_CONFIG: SyncConfig = {
  enableIncrementalSync: true,
  enableCompression: true,
  enableChecksum: true,
  batchSize: 100,
  syncInterval: 1000,
  conflictResolution: 'merge',
}

/**
 * 同步结果
 */
export interface SyncResult {
  success: boolean
  transferred?: unknown
  size?: number
}

/**
 * 批量同步结果
 */
export interface BatchSyncResult {
  success: boolean
  results: Array<{ id: string; success: boolean; size?: number }>
}

/**
 * 数据桥接器统计信息
 */
export interface DataBridgeStats {
  totalChanges: number
  incrementalUpdates: number
  compressionSavings: number
  conflictsResolved: number
  dataTransferred: number
  changeLogSize: number
  subscriberCount: number
}

/**
 * 冲突解决结果
 */
export interface ConflictResolutionResult<T> {
  resolved: T
  hasConflicts: boolean
  conflicts: string[]
}

/**
 * 压缩结果
 */
export interface CompressionResult<T> {
  compressed: boolean
  data: T
  originalSize: number
  compressedSize: number
}
