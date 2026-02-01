/**
 * 数据冲突解决器
 * 处理本地和远程数据之间的冲突
 */

import type { ConflictResolutionResult } from './DataBridgeTypes'

/**
 * 数据冲突解决器
 */
export class ConflictResolver {
  /**
   * 解决数据冲突
   */
  resolve<T>(
    localData: T,
    remoteData: T,
    strategy: 'client' | 'server' | 'merge' = 'merge'
  ): ConflictResolutionResult<T> {
    switch (strategy) {
      case 'client':
        return { resolved: localData, hasConflicts: false, conflicts: [] }

      case 'server':
        return { resolved: remoteData, hasConflicts: false, conflicts: [] }

      case 'merge':
      default:
        return this.mergeData(localData, remoteData)
    }
  }

  private mergeData<T>(localData: T, remoteData: T): ConflictResolutionResult<T> {
    if (!localData || !remoteData) {
      return {
        resolved: (localData || remoteData) as T,
        hasConflicts: false,
        conflicts: [],
      }
    }

    if (typeof localData !== 'object' || typeof remoteData !== 'object') {
      return {
        resolved: remoteData,
        hasConflicts: localData !== remoteData,
        conflicts: localData !== remoteData ? ['value'] : [],
      }
    }

    const conflicts: string[] = []
    const localRecord = localData as Record<string, unknown>
    const remoteRecord = remoteData as Record<string, unknown>
    const resolved: Record<string, unknown> = { ...localRecord }

    for (const key in remoteRecord) {
      if (Object.hasOwn(remoteRecord, key)) {
        const localValue = localRecord[key]
        const remoteValue = remoteRecord[key]

        if (localValue !== remoteValue) {
          if (localValue === undefined) {
            resolved[key] = remoteValue
          } else if (remoteValue === undefined) {
            delete resolved[key]
          } else if (typeof localValue === 'object' && typeof remoteValue === 'object') {
            const subResult = this.mergeData(localValue, remoteValue)
            resolved[key] = subResult.resolved
            conflicts.push(...subResult.conflicts.map((c) => `${key}.${c}`))
          } else {
            resolved[key] = remoteValue
            conflicts.push(key)
          }
        }
      }
    }

    return {
      resolved: resolved as T,
      hasConflicts: conflicts.length > 0,
      conflicts,
    }
  }
}
