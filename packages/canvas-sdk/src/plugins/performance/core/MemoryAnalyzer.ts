/**
 * 内存分析器 - 负责内存使用分析和泄漏检测
 */

import type {
  MemoryLeakReport,
  MemoryStats,
  PluginMemoryUsage,
  ResourceInfo,
} from '../types/MemoryTypes'

export class MemoryAnalyzer {
  private memoryThreshold = 100 * 1024 * 1024 // 100MB

  /**
   * 获取插件内存使用情况
   */
  getPluginMemoryUsage(resources: Map<string, ResourceInfo>, pluginId: string): PluginMemoryUsage {
    const pluginResources = Array.from(resources.values()).filter(
      (resource) => resource.pluginId === pluginId
    )

    return {
      totalSize: pluginResources.reduce((sum, resource) => sum + resource.size, 0),
      resourceCount: pluginResources.length,
      resources: pluginResources,
    }
  }

  /**
   * 获取系统总内存使用情况
   */
  getSystemMemoryUsage(resources: Map<string, ResourceInfo>): MemoryStats {
    const byPlugin = new Map<string, number>()
    const byType = new Map<string, number>()
    let totalSize = 0

    for (const resource of resources.values()) {
      totalSize += resource.size

      // 按插件统计
      const pluginTotal = byPlugin.get(resource.pluginId) || 0
      byPlugin.set(resource.pluginId, pluginTotal + resource.size)

      // 按类型统计
      const typeTotal = byType.get(resource.type) || 0
      byType.set(resource.type, typeTotal + resource.size)
    }

    return {
      totalSize,
      resourceCount: resources.size,
      byPlugin,
      byType,
    }
  }

  /**
   * 检查内存泄漏
   */
  checkMemoryLeaks(resources: Map<string, ResourceInfo>): MemoryLeakReport {
    const now = Date.now()
    const oneHour = 60 * 60 * 1000
    const thirtyMinutes = 30 * 60 * 1000
    const largeThreshold = 10 * 1024 * 1024 // 10MB

    const pluginSizes = new Map<string, number>()
    const oldResources: ResourceInfo[] = []
    const largeResources: ResourceInfo[] = []
    const unusedResources: ResourceInfo[] = []

    for (const resource of resources.values()) {
      // 统计插件大小
      const currentSize = pluginSizes.get(resource.pluginId) || 0
      pluginSizes.set(resource.pluginId, currentSize + resource.size)

      // 检查老旧资源
      if (now - resource.created > oneHour) {
        oldResources.push(resource)
      }

      // 检查大型资源
      if (resource.size > largeThreshold) {
        largeResources.push(resource)
      }

      // 检查未使用资源
      if (now - resource.lastAccessed > thirtyMinutes) {
        unusedResources.push(resource)
      }
    }

    // 找出可疑插件（内存使用超过阈值）
    const suspiciousPlugins = Array.from(pluginSizes.entries())
      .filter(([, size]) => size > this.memoryThreshold)
      .map(([pluginId]) => pluginId)

    return {
      suspiciousPlugins,
      oldResources,
      largeResources,
      unusedResources,
    }
  }

  /**
   * 设置内存阈值
   */
  setMemoryThreshold(threshold: number): void {
    this.memoryThreshold = threshold
  }

  /**
   * 获取内存阈值
   */
  getMemoryThreshold(): number {
    return this.memoryThreshold
  }

  /**
   * 生成内存报告
   */
  generateMemoryReport(resources: Map<string, ResourceInfo>): {
    stats: MemoryStats
    leaks: MemoryLeakReport
    recommendations: string[]
  } {
    const stats = this.getSystemMemoryUsage(resources)
    const leaks = this.checkMemoryLeaks(resources)
    const recommendations: string[] = []

    // 生成优化建议
    if (leaks.suspiciousPlugins.length > 0) {
      recommendations.push(`发现 ${leaks.suspiciousPlugins.length} 个插件内存使用过高，建议检查`)
    }

    if (leaks.unusedResources.length > 0) {
      recommendations.push(`发现 ${leaks.unusedResources.length} 个未使用资源，建议清理`)
    }

    if (leaks.largeResources.length > 0) {
      recommendations.push(`发现 ${leaks.largeResources.length} 个大型资源，建议优化`)
    }

    if (stats.totalSize > this.memoryThreshold) {
      recommendations.push('系统内存使用超过阈值，建议执行垃圾回收')
    }

    return {
      stats,
      leaks,
      recommendations,
    }
  }
}
