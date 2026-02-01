/**
 * 数据版本管理器
 * 管理数据版本、快照和增量计算
 */

import type { IncrementalData } from './DataBridgeTypes'

/**
 * 数据版本管理器
 */
export class DataVersionManager {
  private versions = new Map<string, number>()
  private snapshots = new Map<string, unknown>()
  private maxSnapshots = 100

  /**
   * 获取数据版本
   */
  getVersion(id: string): number {
    return this.versions.get(id) || 0
  }

  /**
   * 更新数据版本
   */
  updateVersion(id: string, data?: unknown): number {
    const currentVersion = this.getVersion(id)
    const newVersion = currentVersion + 1

    this.versions.set(id, newVersion)

    if (data) {
      this.saveSnapshot(id, newVersion, data)
    }

    return newVersion
  }

  /**
   * 获取数据快照
   */
  getSnapshot(id: string, version: number): unknown | null {
    const key = `${id}_${version}`
    return this.snapshots.get(key) || null
  }

  /**
   * 计算增量变更
   */
  calculateDelta<T>(id: string, newData: T): IncrementalData<T> | null {
    const currentVersion = this.getVersion(id)
    const previousSnapshot = this.getSnapshot(id, currentVersion)

    if (!previousSnapshot) {
      return {
        id,
        changes: newData as Partial<T>,
        version: this.updateVersion(id, newData),
      }
    }

    const changes = this.diffObjects(previousSnapshot, newData) as Partial<T>

    if (Object.keys(changes).length === 0) {
      return null
    }

    return {
      id,
      changes,
      version: this.updateVersion(id, newData),
      checksum: this.calculateChecksum(changes),
    }
  }

  /**
   * 清理旧版本数据
   */
  cleanup(): void {
    const toDelete: string[] = []

    for (const key of this.snapshots.keys()) {
      if (this.snapshots.size > this.maxSnapshots / 2) {
        toDelete.push(key)
      }
    }

    toDelete.slice(0, toDelete.length / 2).forEach((key) => {
      this.snapshots.delete(key)
    })
  }

  dispose(): void {
    this.versions.clear()
    this.snapshots.clear()
  }

  private saveSnapshot(id: string, version: number, data: unknown): void {
    const key = `${id}_${version}`

    if (this.snapshots.size >= this.maxSnapshots) {
      const firstKey = this.snapshots.keys().next().value
      if (firstKey !== undefined) {
        this.snapshots.delete(firstKey)
      }
    }

    this.snapshots.set(key, this.deepClone(data))
  }

  private diffObjects(oldObj: unknown, newObj: unknown): Record<string, unknown> {
    const changes: Record<string, unknown> = {}
    const oldRecord = oldObj as Record<string, unknown>
    const newRecord = newObj as Record<string, unknown>

    for (const key in newRecord) {
      if (Object.hasOwn(newRecord, key)) {
        if (!this.isEqual(oldRecord[key], newRecord[key])) {
          changes[key] = newRecord[key]
        }
      }
    }

    for (const key in oldRecord) {
      if (Object.hasOwn(oldRecord, key) && !Object.hasOwn(newRecord, key)) {
        changes[key] = undefined
      }
    }

    return changes
  }

  private isEqual(a: unknown, b: unknown): boolean {
    if (a === b) return true

    if (a instanceof Date && b instanceof Date) {
      return a.getTime() === b.getTime()
    }

    if (!a || !b || (typeof a !== 'object' && typeof b !== 'object')) {
      return a === b
    }

    if (a === null || a === undefined || b === null || b === undefined) {
      return false
    }

    const aObj = a as Record<string, unknown>
    const bObj = b as Record<string, unknown>

    if (Object.getPrototypeOf(aObj) !== Object.getPrototypeOf(bObj)) return false

    const keys = Object.keys(aObj)
    if (keys.length !== Object.keys(bObj).length) return false

    return keys.every((k) => this.isEqual(aObj[k], bObj[k]))
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

  private deepClone(obj: unknown): unknown {
    if (obj === null || typeof obj !== 'object') return obj
    if (obj instanceof Date) return new Date(obj.getTime())
    if (obj instanceof Array) return obj.map((item) => this.deepClone(item))

    const cloned: Record<string, unknown> = {}
    const record = obj as Record<string, unknown>
    for (const key in record) {
      if (Object.hasOwn(record, key)) {
        cloned[key] = this.deepClone(record[key])
      }
    }
    return cloned
  }
}
