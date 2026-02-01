/**
 * 性能仪表板
 * 显示实时性能指标的可视化面板
 */

import {
  type BottleneckAnalysis,
  UnifiedMetricType,
  type UnifiedPerformanceWarning,
} from './UnifiedPerformanceMonitor'

/**
 * 仪表板配置
 */
export interface DashboardConfig {
  position: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right'
  width: number
  height: number
  opacity: number
  collapsible: boolean
  refreshInterval: number
}

/**
 * 仪表板数据获取接口
 */
export interface IDashboardDataProvider {
  getCurrentMetrics(): Record<UnifiedMetricType, number>
  getWarnings(severity?: 'low' | 'medium' | 'high'): UnifiedPerformanceWarning[]
  analyzeBottlenecks(): BottleneckAnalysis
  getActiveSources(): string[]
  getReportCounter(): number
}

/**
 * 性能仪表板
 */
export class PerformanceDashboard {
  private element: HTMLElement | null = null
  private timer: number | null = null
  private config: DashboardConfig
  private dataProvider: IDashboardDataProvider

  constructor(dataProvider: IDashboardDataProvider, config?: Partial<DashboardConfig>) {
    this.dataProvider = dataProvider
    this.config = {
      position: 'top-right',
      width: 350,
      height: 400,
      opacity: 0.9,
      collapsible: true,
      refreshInterval: 1000,
      ...config,
    }
  }

  /**
   * 创建仪表板
   */
  create(): void {
    if (typeof document === 'undefined') return

    this.element = document.createElement('div')
    this.element.id = 'unified-performance-dashboard'

    this.updateStyle()
    this.update()

    document.body.appendChild(this.element)

    this.timer = window.setInterval(() => {
      this.update()
    }, this.config.refreshInterval)
  }

  /**
   * 配置仪表板
   */
  configure(config: Partial<DashboardConfig>): void {
    Object.assign(this.config, config)
    if (this.element) {
      this.updateStyle()
    }
  }

  /**
   * 销毁仪表板
   */
  destroy(): void {
    if (this.timer) {
      clearInterval(this.timer)
      this.timer = null
    }

    if (this.element) {
      this.element.remove()
      this.element = null
    }
  }

  /**
   * 是否已创建
   */
  isCreated(): boolean {
    return this.element !== null
  }

  /**
   * 更新样式
   */
  private updateStyle(): void {
    if (!this.element) return

    const positionStyle = {
      'top-left': 'top: 10px; left: 10px;',
      'top-right': 'top: 10px; right: 10px;',
      'bottom-left': 'bottom: 10px; left: 10px;',
      'bottom-right': 'bottom: 10px; right: 10px;',
    }[this.config.position]

    this.element.style.cssText = `
      position: fixed;
      ${positionStyle}
      width: ${this.config.width}px;
      height: ${this.config.height}px;
      background: rgba(0, 0, 0, ${this.config.opacity});
      color: white;
      padding: 12px;
      border-radius: 8px;
      font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
      font-size: 11px;
      line-height: 1.4;
      z-index: 10000;
      overflow-y: auto;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
      border: 1px solid rgba(255, 255, 255, 0.1);
    `
  }

  /**
   * 更新内容
   */
  private update(): void {
    if (!this.element) return

    const metrics = this.dataProvider.getCurrentMetrics()
    const warnings = this.dataProvider.getWarnings().slice(-3)
    const bottlenecks = this.dataProvider.analyzeBottlenecks()

    this.element.innerHTML = this.renderContent(metrics, warnings, bottlenecks)
  }

  /**
   * 渲染内容
   */
  private renderContent(
    metrics: Record<UnifiedMetricType, number>,
    warnings: UnifiedPerformanceWarning[],
    bottlenecks: BottleneckAnalysis
  ): string {
    return `
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; padding-bottom: 8px; border-bottom: 1px solid rgba(255, 255, 255, 0.2);">
        <div style="font-weight: bold; font-size: 12px;">🚀 统一性能监控</div>
        <div style="font-size: 10px; opacity: 0.7;">${new Date().toLocaleTimeString()}</div>
      </div>

      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 12px;">
        <div>
          <div style="color: #4CAF50; font-weight: bold; margin-bottom: 4px;">📊 核心指标</div>
          <div>FPS: <span style="color: ${this.getValueColor(metrics[UnifiedMetricType.FPS], 30, 60)}">${(metrics[UnifiedMetricType.FPS] || 0).toFixed(1)}</span></div>
          <div>帧时间: <span style="color: ${this.getValueColor(metrics[UnifiedMetricType.FRAME_TIME], 33, 16, true)}">${(metrics[UnifiedMetricType.FRAME_TIME] || 0).toFixed(1)}ms</span></div>
          <div>渲染: <span style="color: ${this.getValueColor(metrics[UnifiedMetricType.RENDER_TIME], 16, 8, true)}">${(metrics[UnifiedMetricType.RENDER_TIME] || 0).toFixed(1)}ms</span></div>
          <div>更新: <span style="color: ${this.getValueColor(metrics[UnifiedMetricType.UPDATE_TIME], 16, 8, true)}">${(metrics[UnifiedMetricType.UPDATE_TIME] || 0).toFixed(1)}ms</span></div>
        </div>
        <div>
          <div style="color: #2196F3; font-weight: bold; margin-bottom: 4px;">💾 资源</div>
          <div>内存: <span style="color: ${this.getMemoryColor(metrics[UnifiedMetricType.MEMORY_USAGE])}">${this.formatBytes(metrics[UnifiedMetricType.MEMORY_USAGE] || 0)}</span></div>
          <div>GPU: <span style="color: ${this.getMemoryColor(metrics[UnifiedMetricType.GPU_MEMORY])}">${this.formatBytes(metrics[UnifiedMetricType.GPU_MEMORY] || 0)}</span></div>
          <div>绘制: <span style="color: ${this.getValueColor(metrics[UnifiedMetricType.DRAW_CALLS], 1000, 500, true)}">${metrics[UnifiedMetricType.DRAW_CALLS] || 0}</span></div>
          <div>缓存: <span style="color: ${this.getValueColor(metrics[UnifiedMetricType.CACHE_HIT_RATE], 0.8, 0.9)}">${((metrics[UnifiedMetricType.CACHE_HIT_RATE] || 0) * 100).toFixed(0)}%</span></div>
        </div>
      </div>

      ${bottlenecks.type !== 'none' ? this.renderBottleneck(bottlenecks) : ''}
      ${warnings.length > 0 ? this.renderWarnings(warnings) : ''}

      <div style="margin-top: 8px; padding-top: 8px; border-top: 1px solid rgba(255, 255, 255, 0.1);">
        <div style="display: flex; justify-content: space-between; font-size: 10px; opacity: 0.7;">
          <span>数据源: ${this.dataProvider.getActiveSources().join(', ')}</span>
          <span>报告: #${this.dataProvider.getReportCounter()}</span>
        </div>
      </div>
    `
  }

  private renderBottleneck(bottlenecks: BottleneckAnalysis): string {
    return `
      <div style="margin-bottom: 12px;">
        <div style="color: #FF9800; font-weight: bold; margin-bottom: 4px;">⚠️ 瓶颈分析</div>
        <div style="font-size: 10px; color: ${this.getSeverityColor(bottlenecks.severity)};">
          ${bottlenecks.description} (置信度: ${(bottlenecks.confidence * 100).toFixed(0)}%)
        </div>
      </div>
    `
  }

  private renderWarnings(warnings: UnifiedPerformanceWarning[]): string {
    return `
      <div style="margin-bottom: 12px;">
        <div style="color: #F44336; font-weight: bold; margin-bottom: 4px;">🚨 警告</div>
        ${warnings
          .map(
            (w) => `
          <div style="font-size: 10px; color: ${this.getSeverityColor(w.severity)}; margin-bottom: 2px;">
            [${w.source}] ${w.message}
          </div>
        `
          )
          .join('')}
      </div>
    `
  }

  private getValueColor(value: number, warning: number, good: number, reverse = false): string {
    if (!value) return '#888'
    if (reverse) {
      if (value <= good) return '#4CAF50'
      if (value <= warning) return '#FF9800'
      return '#F44336'
    } else {
      if (value >= good) return '#4CAF50'
      if (value >= warning) return '#FF9800'
      return '#F44336'
    }
  }

  private getMemoryColor(bytes: number): string {
    if (!bytes) return '#888'
    const mb = bytes / (1024 * 1024)
    if (mb < 100) return '#4CAF50'
    if (mb < 300) return '#FF9800'
    return '#F44336'
  }

  private getSeverityColor(severity: string): string {
    switch (severity) {
      case 'high':
        return '#F44336'
      case 'medium':
        return '#FF9800'
      case 'low':
        return '#FFEB3B'
      default:
        return '#888'
    }
  }

  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / k ** i).toFixed(1)) + ' ' + sizes[i]
  }
}
