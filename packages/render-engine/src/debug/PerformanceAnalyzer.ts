/**
 * 性能分析器
 * 提供详细的性能监控、分析和优化建议功能
 */

import type { IEventBus } from '../events/EventBus'

export interface PerformanceMetrics {
  // 帧率指标
  fps: number
  averageFps: number
  minFps: number
  maxFps: number
  frameTime: number

  // 渲染指标
  drawCalls: number
  triangles: number
  vertices: number
  textures: number
  shaderSwitches: number

  // 内存指标
  memoryUsage: {
    total: number
    used: number
    buffers: number
    textures: number
    shaders: number
  }

  // GPU指标
  gpuTime: number
  cpuTime: number

  // 批处理指标
  batchCount: number
  batchSize: number
  instanceCount: number

  // 剔除指标
  culledObjects: number
  visibleObjects: number
  frustumCulls: number
  occlusionCulls: number
}

export interface PerformanceProfile {
  name: string
  startTime: number
  endTime: number
  duration: number
  children: PerformanceProfile[]
  metadata?: any
}

export interface DebugPerformanceAlert {
  type: 'warning' | 'critical'
  category: 'fps' | 'memory' | 'gpu' | 'cpu' | 'batching'
  message: string
  value: number
  threshold: number
  suggestion: string
  timestamp: number
}

export interface PerformanceReport {
  timestamp: number
  duration: number
  metrics: PerformanceMetrics
  profiles: PerformanceProfile[]
  alerts: DebugPerformanceAlert[]
  recommendations: PerformanceRecommendation[]
}

export interface PerformanceRecommendation {
  priority: 'low' | 'medium' | 'high'
  category: string
  issue: string
  solution: string
  impact: string
  effort: 'low' | 'medium' | 'high'
}

export interface PerformanceAnalyzerEvents {
  'metrics-updated': { metrics: PerformanceMetrics }
  'alert-triggered': { alert: DebugPerformanceAlert }
  'profile-started': { name: string }
  'profile-ended': { name: string; duration: number }
  'report-generated': { report: PerformanceReport }
}

/**
 * 性能分析器实现
 */
export class PerformanceAnalyzer {
  private eventBus?: IEventBus

  // 性能数据
  private currentMetrics: PerformanceMetrics
  private metricsHistory: PerformanceMetrics[] = []
  private maxHistorySize = 1000

  // 分析配置
  private thresholds = {
    minFps: 30,
    maxFrameTime: 33.33, // ms
    maxGpuTime: 16.67, // ms
    maxCpuTime: 16.67, // ms
    maxMemoryUsage: 1024 * 1024 * 1024, // 1GB
    maxDrawCalls: 1000,
    minBatchSize: 10,
  }

  // 性能分析状态
  private isAnalyzing = false
  private analysisStartTime = 0

  // 性能分析堆栈
  private profileStack: Array<{ name: string; startTime: number; metadata?: any }> = []
  private profileResults: PerformanceProfile[] = []

  // 警告系统
  private alertHistory: DebugPerformanceAlert[] = []
  private maxAlertHistory = 100

  // 时间测量
  private frameStartTime = 0
  private lastFrameTime = 0
  private frameCount = 0
  private fpsHistory: number[] = []

  constructor() {
    this.currentMetrics = this.createEmptyMetrics()
    this.startFrameTimeTracking()
  }

  /**
   * 设置事件总线
   */
  setEventBus(eventBus: IEventBus): void {
    this.eventBus = eventBus
  }

  /**
   * 开始性能分析
   */
  startAnalysis(): void {
    if (this.isAnalyzing) return

    this.isAnalyzing = true
    this.analysisStartTime = performance.now()
    this.metricsHistory = []
    this.profileResults = []
    this.alertHistory = []
  }

  /**
   * 停止性能分析
   */
  stopAnalysis(): PerformanceReport {
    if (!this.isAnalyzing) {
      return this.generateReport()
    }

    this.isAnalyzing = false
    const report = this.generateReport()

    this.eventBus?.emit('report-generated', { report })

    return report
  }

  /**
   * 开始性能分析点
   */
  startProfile(name: string, metadata?: any): void {
    const startTime = performance.now()

    this.profileStack.push({ name, startTime, metadata })

    this.eventBus?.emit('profile-started', { name })
  }

  /**
   * 结束性能分析点
   */
  endProfile(name: string): PerformanceProfile | null {
    const endTime = performance.now()

    // 找到匹配的分析点
    let profileIndex = -1
    for (let i = this.profileStack.length - 1; i >= 0; i--) {
      if (this.profileStack[i].name === name) {
        profileIndex = i
        break
      }
    }

    if (profileIndex === -1) {
      console.warn(`Performance profile '${name}' not found in stack`)
      return null
    }

    const profileData = this.profileStack[profileIndex]
    const duration = endTime - profileData.startTime

    // 收集子分析点
    const children = this.profileStack.slice(profileIndex + 1).map((child) => ({
      name: child.name,
      startTime: child.startTime,
      endTime: endTime,
      duration: endTime - child.startTime,
      children: [] as PerformanceProfile[],
      metadata: child.metadata,
    }))

    const profile: PerformanceProfile = {
      name,
      startTime: profileData.startTime,
      endTime,
      duration,
      children,
      metadata: profileData.metadata,
    }

    // 移除已完成的分析点
    this.profileStack.splice(profileIndex)

    // 添加到结果中
    this.profileResults.push(profile)

    this.eventBus?.emit('profile-ended', { name, duration })

    return profile
  }

  /**
   * 更新渲染指标
   */
  updateRenderMetrics(metrics: Partial<PerformanceMetrics>): void {
    this.currentMetrics = { ...this.currentMetrics, ...metrics }

    if (this.isAnalyzing) {
      this.metricsHistory.push({ ...this.currentMetrics })

      if (this.metricsHistory.length > this.maxHistorySize) {
        this.metricsHistory.shift()
      }
    }

    // 检查是否需要触发警告
    this.checkForAlerts()

    this.eventBus?.emit('metrics-updated', { metrics: this.currentMetrics })
  }

  /**
   * 记录帧时间
   */
  recordFrameTime(): void {
    const now = performance.now()

    if (this.frameStartTime > 0) {
      const frameTime = now - this.frameStartTime
      this.lastFrameTime = frameTime

      // 更新FPS
      this.frameCount++
      const fps = 1000 / frameTime
      this.fpsHistory.push(fps)

      if (this.fpsHistory.length > 60) {
        this.fpsHistory.shift()
      }

      // 计算FPS指标
      const averageFps = this.fpsHistory.reduce((sum, f) => sum + f, 0) / this.fpsHistory.length
      const minFps = Math.min(...this.fpsHistory)
      const maxFps = Math.max(...this.fpsHistory)

      this.currentMetrics.fps = fps
      this.currentMetrics.averageFps = averageFps
      this.currentMetrics.minFps = minFps
      this.currentMetrics.maxFps = maxFps
      this.currentMetrics.frameTime = frameTime
    }

    this.frameStartTime = now
  }

  /**
   * 获取当前性能指标
   */
  getCurrentMetrics(): PerformanceMetrics {
    return { ...this.currentMetrics }
  }

  /**
   * 获取性能历史
   */
  getMetricsHistory(): PerformanceMetrics[] {
    return [...this.metricsHistory]
  }

  /**
   * 获取性能分析结果
   */
  getProfileResults(): PerformanceProfile[] {
    return [...this.profileResults]
  }

  /**
   * 获取警告历史
   */
  getAlertHistory(): DebugPerformanceAlert[] {
    return [...this.alertHistory]
  }

  /**
   * 设置性能阈值
   */
  setThreshold(key: keyof typeof this.thresholds, value: number): void {
    this.thresholds[key] = value
  }

  /**
   * 获取性能阈值
   */
  getThresholds(): typeof this.thresholds {
    return { ...this.thresholds }
  }

  /**
   * 分析性能瓶颈
   */
  analyzeBottlenecks(): PerformanceRecommendation[] {
    const recommendations: PerformanceRecommendation[] = []
    const metrics = this.currentMetrics

    // 分析FPS问题
    if (metrics.averageFps < this.thresholds.minFps) {
      recommendations.push({
        priority: 'high',
        category: 'Frame Rate',
        issue: `Average FPS (${metrics.averageFps.toFixed(1)}) is below target (${this.thresholds.minFps})`,
        solution: 'Reduce visual complexity, optimize shaders, or enable frame rate limiting',
        impact: 'Poor user experience, choppy animation',
        effort: 'medium',
      })
    }

    // 分析绘制调用
    if (metrics.drawCalls > this.thresholds.maxDrawCalls) {
      recommendations.push({
        priority: 'high',
        category: 'Draw Calls',
        issue: `Too many draw calls (${metrics.drawCalls}) exceed threshold (${this.thresholds.maxDrawCalls})`,
        solution: 'Enable batching, use instancing, or merge geometry',
        impact: 'CPU overhead, reduced frame rate',
        effort: 'medium',
      })
    }

    // 分析批处理效率
    if (metrics.batchSize < this.thresholds.minBatchSize && metrics.batchCount > 10) {
      recommendations.push({
        priority: 'medium',
        category: 'Batching',
        issue: `Low batch efficiency (${metrics.batchSize.toFixed(1)} objects per batch)`,
        solution: 'Improve object grouping, use texture atlases, or optimize material usage',
        impact: 'Suboptimal GPU utilization',
        effort: 'high',
      })
    }

    // 分析GPU时间
    if (metrics.gpuTime > this.thresholds.maxGpuTime) {
      recommendations.push({
        priority: 'high',
        category: 'GPU Performance',
        issue: `GPU frame time (${metrics.gpuTime.toFixed(2)}ms) exceeds target (${this.thresholds.maxGpuTime}ms)`,
        solution: 'Reduce shader complexity, lower resolution, or optimize geometry',
        impact: 'GPU bottleneck, reduced frame rate',
        effort: 'high',
      })
    }

    // 分析CPU时间
    if (metrics.cpuTime > this.thresholds.maxCpuTime) {
      recommendations.push({
        priority: 'high',
        category: 'CPU Performance',
        issue: `CPU frame time (${metrics.cpuTime.toFixed(2)}ms) exceeds target (${this.thresholds.maxCpuTime}ms)`,
        solution: 'Optimize algorithms, reduce JavaScript execution, or use web workers',
        impact: 'CPU bottleneck, reduced frame rate',
        effort: 'medium',
      })
    }

    // 分析内存使用
    if (metrics.memoryUsage.used > this.thresholds.maxMemoryUsage) {
      recommendations.push({
        priority: 'medium',
        category: 'Memory Usage',
        issue: `High memory usage (${(metrics.memoryUsage.used / 1024 / 1024).toFixed(1)}MB)`,
        solution: 'Implement texture streaming, reduce buffer sizes, or enable garbage collection',
        impact: 'Memory pressure, potential crashes',
        effort: 'high',
      })
    }

    // 分析剔除效率
    const totalObjects = metrics.visibleObjects + metrics.culledObjects
    const cullRatio = totalObjects > 0 ? metrics.culledObjects / totalObjects : 0

    if (cullRatio < 0.3 && totalObjects > 100) {
      recommendations.push({
        priority: 'low',
        category: 'Culling',
        issue: `Low culling efficiency (${(cullRatio * 100).toFixed(1)}% objects culled)`,
        solution: 'Implement better spatial partitioning or improve frustum culling',
        impact: 'Unnecessary rendering overhead',
        effort: 'medium',
      })
    }

    return recommendations.sort((a, b) => {
      const priorityOrder = { high: 3, medium: 2, low: 1 }
      return priorityOrder[b.priority] - priorityOrder[a.priority]
    })
  }

  /**
   * 生成性能报告
   */
  private generateReport(): PerformanceReport {
    const now = performance.now()
    const duration = this.isAnalyzing ? now - this.analysisStartTime : 0

    return {
      timestamp: now,
      duration,
      metrics: this.getCurrentMetrics(),
      profiles: this.getProfileResults(),
      alerts: this.getAlertHistory(),
      recommendations: this.analyzeBottlenecks(),
    }
  }

  /**
   * 检查性能警告
   */
  private checkForAlerts(): void {
    const metrics = this.currentMetrics
    const now = Date.now()

    // FPS警告
    if (metrics.fps < this.thresholds.minFps) {
      this.triggerAlert({
        type: metrics.fps < this.thresholds.minFps * 0.5 ? 'critical' : 'warning',
        category: 'fps',
        message: `Low frame rate detected: ${metrics.fps.toFixed(1)} FPS`,
        value: metrics.fps,
        threshold: this.thresholds.minFps,
        suggestion: 'Consider reducing visual complexity or enabling performance optimizations',
        timestamp: now,
      })
    }

    // 帧时间警告
    if (metrics.frameTime > this.thresholds.maxFrameTime) {
      this.triggerAlert({
        type: metrics.frameTime > this.thresholds.maxFrameTime * 2 ? 'critical' : 'warning',
        category: 'fps',
        message: `High frame time: ${metrics.frameTime.toFixed(2)}ms`,
        value: metrics.frameTime,
        threshold: this.thresholds.maxFrameTime,
        suggestion: 'Optimize rendering pipeline or reduce scene complexity',
        timestamp: now,
      })
    }

    // GPU时间警告
    if (metrics.gpuTime > this.thresholds.maxGpuTime) {
      this.triggerAlert({
        type: 'warning',
        category: 'gpu',
        message: `High GPU time: ${metrics.gpuTime.toFixed(2)}ms`,
        value: metrics.gpuTime,
        threshold: this.thresholds.maxGpuTime,
        suggestion: 'Reduce shader complexity or lower rendering resolution',
        timestamp: now,
      })
    }

    // 内存警告
    if (metrics.memoryUsage.used > this.thresholds.maxMemoryUsage) {
      this.triggerAlert({
        type: 'warning',
        category: 'memory',
        message: `High memory usage: ${(metrics.memoryUsage.used / 1024 / 1024).toFixed(1)}MB`,
        value: metrics.memoryUsage.used,
        threshold: this.thresholds.maxMemoryUsage,
        suggestion: 'Implement resource management or reduce asset quality',
        timestamp: now,
      })
    }

    // 绘制调用警告
    if (metrics.drawCalls > this.thresholds.maxDrawCalls) {
      this.triggerAlert({
        type: 'warning',
        category: 'batching',
        message: `Too many draw calls: ${metrics.drawCalls}`,
        value: metrics.drawCalls,
        threshold: this.thresholds.maxDrawCalls,
        suggestion: 'Enable batching or use instanced rendering',
        timestamp: now,
      })
    }
  }

  /**
   * 触发性能警告
   */
  private triggerAlert(alert: DebugPerformanceAlert): void {
    // 避免重复警告（在短时间内）
    const recentAlert = this.alertHistory.find(
      (a) =>
        a.category === alert.category &&
        a.message === alert.message &&
        alert.timestamp - a.timestamp < 5000 // 5秒内
    )

    if (recentAlert) return

    this.alertHistory.push(alert)

    if (this.alertHistory.length > this.maxAlertHistory) {
      this.alertHistory.shift()
    }

    this.eventBus?.emit('alert-triggered', { alert })
  }

  /**
   * 创建空的性能指标
   */
  private createEmptyMetrics(): PerformanceMetrics {
    return {
      fps: 0,
      averageFps: 0,
      minFps: 0,
      maxFps: 0,
      frameTime: 0,
      drawCalls: 0,
      triangles: 0,
      vertices: 0,
      textures: 0,
      shaderSwitches: 0,
      memoryUsage: {
        total: 0,
        used: 0,
        buffers: 0,
        textures: 0,
        shaders: 0,
      },
      gpuTime: 0,
      cpuTime: 0,
      batchCount: 0,
      batchSize: 0,
      instanceCount: 0,
      culledObjects: 0,
      visibleObjects: 0,
      frustumCulls: 0,
      occlusionCulls: 0,
    }
  }

  /**
   * 开始帧时间跟踪
   */
  private startFrameTimeTracking(): void {
    const trackFrame = () => {
      this.recordFrameTime()
      requestAnimationFrame(trackFrame)
    }

    requestAnimationFrame(trackFrame)
  }

  /**
   * 导出性能数据
   */
  exportData(format: 'json' | 'csv'): string {
    const report = this.generateReport()

    if (format === 'json') {
      return JSON.stringify(report, null, 2)
    } else {
      // CSV格式导出
      const headers = [
        'Timestamp',
        'FPS',
        'Frame Time',
        'Draw Calls',
        'GPU Time',
        'CPU Time',
        'Memory Used',
      ]
      const rows = this.metricsHistory.map((metric) => [
        new Date().toISOString(),
        metric.fps.toFixed(2),
        metric.frameTime.toFixed(2),
        metric.drawCalls.toString(),
        metric.gpuTime.toFixed(2),
        metric.cpuTime.toFixed(2),
        (metric.memoryUsage.used / 1024 / 1024).toFixed(2),
      ])

      return [headers.join(','), ...rows.map((row) => row.join(','))].join('\n')
    }
  }

  /**
   * 重置分析器
   */
  reset(): void {
    this.currentMetrics = this.createEmptyMetrics()
    this.metricsHistory = []
    this.profileResults = []
    this.alertHistory = []
    this.profileStack = []
    this.frameCount = 0
    this.fpsHistory = []
  }

  /**
   * 销毁分析器
   */
  dispose(): void {
    this.reset()
  }
}
