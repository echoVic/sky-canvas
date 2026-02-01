/**
 * 内存管理相关类型定义
 */

export interface MemoryUsage {
  pluginId: string
  heapUsed: number
  heapTotal: number
  external: number
  arrayBuffers: number
  timestamp: number
}

export interface ResourceInfo {
  type: 'texture' | 'buffer' | 'shader' | 'image' | 'audio' | 'data'
  size: number
  pluginId: string
  id: string
  created: number
  lastAccessed: number
}

export interface MemoryLeakReport {
  suspiciousPlugins: string[]
  oldResources: ResourceInfo[]
  largeResources: ResourceInfo[]
  unusedResources: ResourceInfo[]
}

export interface MemoryStats {
  totalSize: number
  resourceCount: number
  byPlugin: Map<string, number>
  byType: Map<string, number>
}

export interface GarbageCollectionResult {
  releasedResources: number
  freedMemory: number
}

export interface PluginMemoryUsage {
  totalSize: number
  resourceCount: number
  resources: ResourceInfo[]
}
