/**
 * 瓶颈分析器
 * 分析性能瓶颈并提供诊断
 */

import {
  type BottleneckAnalysis,
  type DataSourceType,
  type UnifiedMetricDataPoint,
  UnifiedMetricType,
  type UnifiedPerformanceThresholds,
} from './PerformanceTypes'

/**
 * 瓶颈分析器类
 */
export class BottleneckAnalyzer {
  constructor(private thresholds: Partial<UnifiedPerformanceThresholds>) {}

  /**
   * 更新阈值配置
   */
  updateThresholds(thresholds: Partial<UnifiedPerformanceThresholds>): void {
    this.thresholds = { ...this.thresholds, ...thresholds }
  }

  /**
   * 执行瓶颈分析
   */
  analyze(recentData: Map<UnifiedMetricType, UnifiedMetricDataPoint[]>): BottleneckAnalysis {
    const avgMetrics = this.calculateAverageMetrics(recentData)

    // CPU瓶颈检测
    const cpuBottleneck = this.detectCPUBottleneck(avgMetrics, recentData)
    if (cpuBottleneck) return cpuBottleneck

    // GPU瓶颈检测
    const gpuBottleneck = this.detectGPUBottleneck(avgMetrics, recentData)
    if (gpuBottleneck) return gpuBottleneck

    // 内存瓶颈检测
    const memoryBottleneck = this.detectMemoryBottleneck(avgMetrics, recentData)
    if (memoryBottleneck) return memoryBottleneck

    return this.createNoBottleneckResult()
  }

  /**
   * 检测CPU瓶颈
   */
  private detectCPUBottleneck(
    avgMetrics: Record<string, number>,
    recentData: Map<UnifiedMetricType, UnifiedMetricDataPoint[]>
  ): BottleneckAnalysis | null {
    const frameTime = avgMetrics[UnifiedMetricType.FRAME_TIME] || 0
    const updateTime = avgMetrics[UnifiedMetricType.UPDATE_TIME] || 0
    const renderTime = avgMetrics[UnifiedMetricType.RENDER_TIME] || 0

    if (frameTime > 16.67 && updateTime > renderTime) {
      return {
        type: 'cpu',
        confidence: 0.8,
        description: 'CPU处理时间过长，存在CPU瓶颈',
        affectedMetrics: [UnifiedMetricType.FRAME_TIME, UnifiedMetricType.UPDATE_TIME],
        affectedSources: this.getAffectedSources(recentData, [UnifiedMetricType.UPDATE_TIME]),
        suggestions: [
          '优化更新逻辑算法',
          '减少JavaScript计算复杂度',
          '使用Web Workers进行并行处理',
          '启用对象池减少GC压力',
        ],
        severity: frameTime > 33.33 ? 'high' : 'medium',
      }
    }

    return null
  }

  /**
   * 检测GPU瓶颈
   */
  private detectGPUBottleneck(
    avgMetrics: Record<string, number>,
    recentData: Map<UnifiedMetricType, UnifiedMetricDataPoint[]>
  ): BottleneckAnalysis | null {
    const drawCalls = avgMetrics[UnifiedMetricType.DRAW_CALLS] || 0
    const triangles = avgMetrics[UnifiedMetricType.TRIANGLES] || 0

    if (drawCalls > 500 || triangles > 100000) {
      return {
        type: 'gpu',
        confidence: 0.7,
        description: 'GPU渲染负载过高，存在GPU瓶颈',
        affectedMetrics: [
          UnifiedMetricType.DRAW_CALLS,
          UnifiedMetricType.TRIANGLES,
          UnifiedMetricType.RENDER_TIME,
        ],
        affectedSources: this.getAffectedSources(recentData, [
          UnifiedMetricType.DRAW_CALLS,
          UnifiedMetricType.RENDER_TIME,
        ]),
        suggestions: [
          '减少绘制调用数量',
          '优化着色器性能',
          '使用LOD系统',
          '启用视锥剔除',
          '合并批处理',
        ],
        severity: drawCalls > 1000 ? 'high' : 'medium',
      }
    }

    return null
  }

  /**
   * 检测内存瓶颈
   */
  private detectMemoryBottleneck(
    avgMetrics: Record<string, number>,
    recentData: Map<UnifiedMetricType, UnifiedMetricDataPoint[]>
  ): BottleneckAnalysis | null {
    const memoryUsage = avgMetrics[UnifiedMetricType.MEMORY_USAGE] || 0
    const memoryThreshold = this.thresholds[UnifiedMetricType.MEMORY_USAGE]?.max || 0

    if (memoryUsage > memoryThreshold * 0.8) {
      return {
        type: 'memory',
        confidence: 0.6,
        description: '内存使用率过高，可能影响性能',
        affectedMetrics: [UnifiedMetricType.MEMORY_USAGE, UnifiedMetricType.TEXTURE_MEMORY],
        affectedSources: this.getAffectedSources(recentData, [UnifiedMetricType.MEMORY_USAGE]),
        suggestions: ['优化资源管理策略', '启用纹理压缩', '清理未使用资源', '实现资源懒加载'],
        severity: 'medium',
      }
    }

    return null
  }

  /**
   * 计算平均指标
   */
  private calculateAverageMetrics(
    recentData: Map<UnifiedMetricType, UnifiedMetricDataPoint[]>
  ): Record<string, number> {
    const avgMetrics: Record<string, number> = {}

    for (const [type, data] of recentData) {
      if (data.length > 0) {
        avgMetrics[type] = data.reduce((sum, point) => sum + point.value, 0) / data.length
      }
    }

    return avgMetrics
  }

  /**
   * 获取受影响的数据源
   */
  private getAffectedSources(
    recentData: Map<UnifiedMetricType, UnifiedMetricDataPoint[]>,
    metrics: UnifiedMetricType[]
  ): DataSourceType[] {
    const sources = new Set<DataSourceType>()

    for (const metric of metrics) {
      const data = recentData.get(metric) || []
      for (const point of data) {
        sources.add(point.source)
      }
    }

    return [...sources]
  }

  /**
   * 创建无瓶颈结果
   */
  private createNoBottleneckResult(): BottleneckAnalysis {
    return {
      type: 'none',
      confidence: 0,
      description: '未检测到明显瓶颈',
      affectedMetrics: [],
      affectedSources: [],
      suggestions: [],
      severity: 'low',
    }
  }
}
