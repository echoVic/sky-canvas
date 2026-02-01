/**
 * 跨源关联分析器
 * 分析不同数据源之间的性能指标关联性
 */

import type {
  CorrelationResult,
  UnifiedMetricDataPoint,
  UnifiedMetricType,
} from './PerformanceTypes'

/**
 * 跨源关联分析
 */
export class CrossSourceCorrelationAnalyzer {
  private correlationHistory = new Map<string, number[]>()
  private correlationThreshold = 0.7

  /**
   * 计算两个指标的关联性
   */
  calculateCorrelation(
    metric1Data: UnifiedMetricDataPoint[],
    metric2Data: UnifiedMetricDataPoint[]
  ): number {
    if (metric1Data.length < 10 || metric2Data.length < 10) return 0

    // 对齐时间戳
    const alignedData = this.alignDataPoints(metric1Data, metric2Data)
    if (alignedData.length < 5) return 0

    // 计算皮尔逊相关系数
    const values1 = alignedData.map((d) => d.value1)
    const values2 = alignedData.map((d) => d.value2)

    return this.pearsonCorrelation(values1, values2)
  }

  /**
   * 检测跨源关联
   */
  detectCrossSourceCorrelations(
    metricsData: Map<UnifiedMetricType, UnifiedMetricDataPoint[]>
  ): CorrelationResult[] {
    const correlations: CorrelationResult[] = []

    const metrics = Array.from(metricsData.keys())

    // 检查所有指标对
    for (let i = 0; i < metrics.length; i++) {
      for (let j = i + 1; j < metrics.length; j++) {
        const metric1 = metrics[i]
        const metric2 = metrics[j]
        const data1 = metricsData.get(metric1) || []
        const data2 = metricsData.get(metric2) || []

        // 只分析来自不同源的指标
        const sources1 = new Set(data1.map((d) => d.source))
        const sources2 = new Set(data2.map((d) => d.source))
        const hasCommonSource = [...sources1].some((s) => sources2.has(s))

        if (!hasCommonSource) {
          const correlation = this.calculateCorrelation(data1, data2)

          if (Math.abs(correlation) > this.correlationThreshold) {
            correlations.push({
              metric1,
              metric2,
              correlation,
              description: this.getCorrelationDescription(metric1, metric2, correlation),
            })
          }
        }
      }
    }

    return correlations
  }

  /**
   * 设置关联阈值
   */
  setCorrelationThreshold(threshold: number): void {
    this.correlationThreshold = Math.max(0, Math.min(1, threshold))
  }

  /**
   * 获取关联阈值
   */
  getCorrelationThreshold(): number {
    return this.correlationThreshold
  }

  /**
   * 清除历史数据
   */
  clearHistory(): void {
    this.correlationHistory.clear()
  }

  private alignDataPoints(
    data1: UnifiedMetricDataPoint[],
    data2: UnifiedMetricDataPoint[]
  ): Array<{ value1: number; value2: number; timestamp: number }> {
    const aligned: Array<{ value1: number; value2: number; timestamp: number }> = []
    const tolerance = 1000 // 1秒容差

    for (const point1 of data1) {
      const matchingPoint = data2.find(
        (point2) => Math.abs(point2.timestamp - point1.timestamp) <= tolerance
      )

      if (matchingPoint) {
        aligned.push({
          value1: point1.value,
          value2: matchingPoint.value,
          timestamp: point1.timestamp,
        })
      }
    }

    return aligned
  }

  private pearsonCorrelation(x: number[], y: number[]): number {
    const n = Math.min(x.length, y.length)
    if (n === 0) return 0

    const sumX = x.reduce((sum, val) => sum + val, 0)
    const sumY = y.reduce((sum, val) => sum + val, 0)
    const sumXY = x.reduce((sum, val, i) => sum + val * y[i], 0)
    const sumX2 = x.reduce((sum, val) => sum + val * val, 0)
    const sumY2 = y.reduce((sum, val) => sum + val * val, 0)

    const numerator = n * sumXY - sumX * sumY
    const denominator = Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY))

    return denominator === 0 ? 0 : numerator / denominator
  }

  private getCorrelationDescription(
    metric1: UnifiedMetricType,
    metric2: UnifiedMetricType,
    correlation: number
  ): string {
    const strength = Math.abs(correlation) > 0.8 ? '强' : '中等'
    const direction = correlation > 0 ? '正' : '负'

    return `检测到 ${metric1} 和 ${metric2} 之间存在${strength}${direction}相关性 (${correlation.toFixed(2)})`
  }
}
