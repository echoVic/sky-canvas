/**
 * 批处理优化器
 * 提供批处理性能优化和智能分析功能
 */

import type { RenderBatch } from '../core/BatchData'
import type { BatchStats } from '../core/IBatchRenderer'

/**
 * 优化建议类型
 */
export enum OptimizationType {
  REDUCE_DRAW_CALLS = 'reduce_draw_calls',
  MERGE_BATCHES = 'merge_batches',
  TEXTURE_ATLAS = 'texture_atlas',
  INSTANCING = 'instancing',
  DEPTH_SORTING = 'depth_sorting',
  BUFFER_REUSE = 'buffer_reuse',
}

/**
 * 优化建议
 */
export interface OptimizationSuggestion {
  type: OptimizationType
  priority: number // 1-10，数字越大优先级越高
  description: string
  expectedImprovement: string
  implementation: string
}

/**
 * 性能分析结果
 */
export interface PerformanceAnalysis {
  frameTime: number
  drawCallEfficiency: number // 每个draw call的平均顶点数
  batchUtilization: number // 批次利用率
  textureBindRatio: number // 纹理绑定与draw call的比例
  suggestions: OptimizationSuggestion[]
}

/**
 * 批处理优化器
 */
export class BatchOptimizer {
  private performanceHistory: BatchStats[] = []
  private maxHistoryLength = 60 // 保存60帧的历史数据

  /**
   * 记录性能数据
   */
  recordPerformance(stats: BatchStats): void {
    this.performanceHistory.push({ ...stats })

    if (this.performanceHistory.length > this.maxHistoryLength) {
      this.performanceHistory.shift()
    }
  }

  /**
   * 分析性能并提供优化建议
   */
  analyze(): PerformanceAnalysis {
    if (this.performanceHistory.length === 0) {
      return this.getDefaultAnalysis()
    }

    const latestStats = this.performanceHistory[this.performanceHistory.length - 1]
    const averageStats = this.calculateAverageStats()

    const drawCallEfficiency = averageStats.vertices / Math.max(averageStats.drawCalls, 1)
    const batchUtilization = this.calculateBatchUtilization(averageStats)
    const textureBindRatio = averageStats.textureBinds / Math.max(averageStats.drawCalls, 1)

    const suggestions = this.generateSuggestions({
      drawCallEfficiency,
      batchUtilization,
      textureBindRatio,
      stats: averageStats,
    })

    return {
      frameTime: latestStats.frameTime,
      drawCallEfficiency,
      batchUtilization,
      textureBindRatio,
      suggestions,
    }
  }

  /**
   * 优化批次排序
   */
  optimizeBatchOrder(batches: RenderBatch[]): RenderBatch[] {
    return batches.sort((a, b) => {
      // 按以下优先级排序：
      // 1. Z-Index（深度排序）
      if (a.key.zIndex !== b.key.zIndex) {
        return a.key.zIndex - b.key.zIndex
      }

      // 2. 着色器（减少着色器切换）
      if (a.key.shader !== b.key.shader) {
        return a.key.shader.localeCompare(b.key.shader)
      }

      // 3. 纹理（减少纹理绑定）
      const aTexture = a.key.texture ? 'tex' : 'none'
      const bTexture = b.key.texture ? 'tex' : 'none'
      if (aTexture !== bTexture) {
        return aTexture.localeCompare(bTexture)
      }

      // 4. 混合模式（减少状态切换）
      return a.key.blendMode - b.key.blendMode
    })
  }

  /**
   * 检测可合并的批次
   */
  findMergeableBatches(batches: RenderBatch[]): Array<{
    indices: number[]
    estimatedSaving: number
  }> {
    const mergeableGroups: Array<{ indices: number[]; estimatedSaving: number }> = []

    for (let i = 0; i < batches.length; i++) {
      for (let j = i + 1; j < batches.length; j++) {
        const batchA = batches[i]
        const batchB = batches[j]

        if (this.canMergeBatches(batchA, batchB)) {
          const estimatedSaving = this.calculateMergeSaving(batchA, batchB)
          mergeableGroups.push({
            indices: [i, j],
            estimatedSaving,
          })
        }
      }
    }

    // 按节省效果排序
    return mergeableGroups.sort((a, b) => b.estimatedSaving - a.estimatedSaving)
  }

  /**
   * 自动调整批次大小
   */
  calculateOptimalBatchSize(stats: BatchStats): number {
    const avgVerticesPerBatch = stats.vertices / Math.max(stats.batches, 1)
    const _avgTrianglesPerBatch = stats.triangles / Math.max(stats.batches, 1)

    // 基于当前性能计算最优批次大小
    if (avgVerticesPerBatch < 100) {
      return 1024 // 增大批次
    } else if (avgVerticesPerBatch > 8192) {
      return 4096 // 减小批次
    }

    return Math.min(Math.max(avgVerticesPerBatch * 2, 512), 8192)
  }

  /**
   * 检测实例化机会
   */
  detectInstancingOpportunities(batches: RenderBatch[]): Array<{
    geometryHash: string
    count: number
    estimatedImprovement: number
  }> {
    const geometryGroups = new Map<string, RenderBatch[]>()

    // 按几何体分组
    for (const batch of batches) {
      const hash = this.calculateGeometryHash(batch)
      if (!geometryGroups.has(hash)) {
        geometryGroups.set(hash, [])
      }
      geometryGroups.get(hash)?.push(batch)
    }

    const opportunities: Array<{
      geometryHash: string
      count: number
      estimatedImprovement: number
    }> = []

    // 找出重复的几何体
    for (const [hash, group] of geometryGroups) {
      if (group.length >= 5) {
        // 至少5个相同几何体才值得实例化
        const estimatedImprovement = (group.length - 1) / group.length // 理论上的draw call减少比例
        opportunities.push({
          geometryHash: hash,
          count: group.length,
          estimatedImprovement,
        })
      }
    }

    return opportunities.sort((a, b) => b.estimatedImprovement - a.estimatedImprovement)
  }

  /**
   * 获取性能趋势
   */
  getPerformanceTrend(): {
    frameTime: 'improving' | 'stable' | 'degrading'
    drawCalls: 'improving' | 'stable' | 'degrading'
    vertices: 'improving' | 'stable' | 'degrading'
  } {
    if (this.performanceHistory.length < 10) {
      return {
        frameTime: 'stable',
        drawCalls: 'stable',
        vertices: 'stable',
      }
    }

    const recent = this.performanceHistory.slice(-10)
    const older = this.performanceHistory.slice(-20, -10)

    const recentAvg = this.calculateAverage(recent)
    const olderAvg = older.length > 0 ? this.calculateAverage(older) : recentAvg

    return {
      frameTime: this.compareTrend(recentAvg.frameTime, olderAvg.frameTime, false),
      drawCalls: this.compareTrend(recentAvg.drawCalls, olderAvg.drawCalls, false),
      vertices: this.compareTrend(recentAvg.vertices, olderAvg.vertices, true),
    }
  }

  /**
   * 计算平均统计数据
   */
  private calculateAverageStats(): BatchStats {
    if (this.performanceHistory.length === 0) {
      return {
        drawCalls: 0,
        triangles: 0,
        vertices: 0,
        batches: 0,
        textureBinds: 0,
        shaderSwitches: 0,
        frameTime: 0,
      }
    }

    const sum = this.performanceHistory.reduce(
      (acc, stats) => ({
        drawCalls: acc.drawCalls + stats.drawCalls,
        triangles: acc.triangles + stats.triangles,
        vertices: acc.vertices + stats.vertices,
        batches: acc.batches + stats.batches,
        textureBinds: acc.textureBinds + stats.textureBinds,
        shaderSwitches: acc.shaderSwitches + stats.shaderSwitches,
        frameTime: acc.frameTime + stats.frameTime,
      }),
      {
        drawCalls: 0,
        triangles: 0,
        vertices: 0,
        batches: 0,
        textureBinds: 0,
        shaderSwitches: 0,
        frameTime: 0,
      }
    )

    const count = this.performanceHistory.length
    return {
      drawCalls: sum.drawCalls / count,
      triangles: sum.triangles / count,
      vertices: sum.vertices / count,
      batches: sum.batches / count,
      textureBinds: sum.textureBinds / count,
      shaderSwitches: sum.shaderSwitches / count,
      frameTime: sum.frameTime / count,
    }
  }

  /**
   * 计算批次利用率
   */
  private calculateBatchUtilization(stats: BatchStats): number {
    const maxVerticesPerBatch = 65536 // 假设的最大批次大小
    const avgVerticesPerBatch = stats.vertices / Math.max(stats.batches, 1)
    return Math.min(avgVerticesPerBatch / maxVerticesPerBatch, 1.0)
  }

  /**
   * 生成优化建议
   */
  private generateSuggestions(analysis: {
    drawCallEfficiency: number
    batchUtilization: number
    textureBindRatio: number
    stats: BatchStats
  }): OptimizationSuggestion[] {
    const suggestions: OptimizationSuggestion[] = []

    // 检查draw call效率
    if (analysis.drawCallEfficiency < 50) {
      suggestions.push({
        type: OptimizationType.MERGE_BATCHES,
        priority: 9,
        description: '平均每个draw call的顶点数过少，建议合并更多批次',
        expectedImprovement: '可减少30-50%的draw calls',
        implementation: '启用更aggressive的批次合并策略',
      })
    }

    // 检查纹理绑定比例
    if (analysis.textureBindRatio > 0.8) {
      suggestions.push({
        type: OptimizationType.TEXTURE_ATLAS,
        priority: 8,
        description: '纹理切换频繁，建议使用纹理图集',
        expectedImprovement: '可减少70%的纹理绑定操作',
        implementation: '实现纹理图集系统，将小纹理合并到大图集中',
      })
    }

    // 检查批次利用率
    if (analysis.batchUtilization < 0.3) {
      suggestions.push({
        type: OptimizationType.REDUCE_DRAW_CALLS,
        priority: 7,
        description: '批次大小利用不充分，可以增大批次大小',
        expectedImprovement: '可提升20-30%的渲染效率',
        implementation: '调整maxBatchSize参数或改进批次合并逻辑',
      })
    }

    // 检查帧时间
    if (analysis.stats.frameTime > 16.67) {
      // 超过60fps的时间预算
      suggestions.push({
        type: OptimizationType.BUFFER_REUSE,
        priority: 6,
        description: '渲染时间过长，建议优化缓冲区管理',
        expectedImprovement: '可减少10-20%的CPU时间',
        implementation: '实现缓冲区池化和复用机制',
      })
    }

    return suggestions.sort((a, b) => b.priority - a.priority)
  }

  /**
   * 检查两个批次是否可以合并
   */
  private canMergeBatches(batchA: RenderBatch, batchB: RenderBatch): boolean {
    return (
      batchA.key.texture === batchB.key.texture &&
      batchA.key.shader === batchB.key.shader &&
      batchA.key.blendMode === batchB.key.blendMode &&
      batchA.key.zIndex === batchB.key.zIndex
    )
  }

  /**
   * 计算合并节省效果
   */
  private calculateMergeSaving(_batchA: RenderBatch, _batchB: RenderBatch): number {
    // 简化计算：合并后可以减少一个draw call
    return 1.0
  }

  /**
   * 计算几何体哈希
   */
  private calculateGeometryHash(batch: RenderBatch): string {
    // 简化的几何体哈希，基于顶点数和索引数
    return `${batch.vertices.length}_${batch.indices.length}`
  }

  /**
   * 计算平均值
   */
  private calculateAverage(stats: BatchStats[]): BatchStats {
    if (stats.length === 0) {
      return {
        drawCalls: 0,
        triangles: 0,
        vertices: 0,
        batches: 0,
        textureBinds: 0,
        shaderSwitches: 0,
        frameTime: 0,
      }
    }

    const sum = stats.reduce((acc, stat) => ({
      drawCalls: acc.drawCalls + stat.drawCalls,
      triangles: acc.triangles + stat.triangles,
      vertices: acc.vertices + stat.vertices,
      batches: acc.batches + stat.batches,
      textureBinds: acc.textureBinds + stat.textureBinds,
      shaderSwitches: acc.shaderSwitches + stat.shaderSwitches,
      frameTime: acc.frameTime + stat.frameTime,
    }))

    const count = stats.length
    return {
      drawCalls: sum.drawCalls / count,
      triangles: sum.triangles / count,
      vertices: sum.vertices / count,
      batches: sum.batches / count,
      textureBinds: sum.textureBinds / count,
      shaderSwitches: sum.shaderSwitches / count,
      frameTime: sum.frameTime / count,
    }
  }

  /**
   * 比较趋势
   */
  private compareTrend(
    recent: number,
    older: number,
    higherIsBetter: boolean
  ): 'improving' | 'stable' | 'degrading' {
    const threshold = 0.1 // 10%的变化阈值
    const ratio = recent / Math.max(older, 0.001)

    if (Math.abs(ratio - 1) < threshold) {
      return 'stable'
    }

    if (higherIsBetter) {
      return ratio > 1 ? 'improving' : 'degrading'
    } else {
      return ratio < 1 ? 'improving' : 'degrading'
    }
  }

  /**
   * 获取默认分析结果
   */
  private getDefaultAnalysis(): PerformanceAnalysis {
    return {
      frameTime: 0,
      drawCallEfficiency: 0,
      batchUtilization: 0,
      textureBindRatio: 0,
      suggestions: [],
    }
  }
}
