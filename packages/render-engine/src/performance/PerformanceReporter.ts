/**
 * 性能报告生成器
 * 生成和导出性能报告
 */

/**
 * 性能报告类型
 */
export interface PerformanceReport {
  timestamp: string
  metrics: Record<string, { current: number; avg: number; min: number; max: number }>
  warnings: Array<{
    timestamp: string
    type: string
    value: number
    source: string
    severity: string
    message: string
  }>
  bottlenecks: { type: string; description: string; suggestions: string[] }
}

/**
 * 报告数据提供接口
 */
export interface IReportDataProvider {
  generateComprehensiveReport(): PerformanceReport
}

/**
 * 性能报告生成器
 */
export class PerformanceReporter {
  private dataProvider: IReportDataProvider
  private timer: number | null = null
  private counter = 0
  private autoExport: boolean
  private interval: number

  constructor(
    dataProvider: IReportDataProvider,
    interval: number = 60000,
    autoExport: boolean = false
  ) {
    this.dataProvider = dataProvider
    this.interval = interval
    this.autoExport = autoExport
  }

  /**
   * 启动定期报告生成
   */
  start(): void {
    if (this.interval <= 0) return

    this.timer = window.setInterval(() => {
      this.generateAndProcess()
    }, this.interval)
  }

  /**
   * 停止报告生成
   */
  stop(): void {
    if (this.timer) {
      clearInterval(this.timer)
      this.timer = null
    }
  }

  /**
   * 获取报告计数
   */
  getCounter(): number {
    return this.counter
  }

  /**
   * 生成报告
   */
  generate(): PerformanceReport {
    return this.dataProvider.generateComprehensiveReport()
  }

  /**
   * 导出报告
   */
  export(format: 'json' | 'csv' | 'html' = 'json'): string {
    const report = this.generate()

    switch (format) {
      case 'json':
        return JSON.stringify(report, null, 2)
      case 'csv':
        return this.toCSV(report)
      case 'html':
        return this.toHTML(report)
      default:
        return JSON.stringify(report, null, 2)
    }
  }

  /**
   * 生成并处理报告
   */
  private generateAndProcess(): void {
    this.counter++
    const report = this.generate()

    if (this.autoExport) {
      this.exportToFile(report)
    }

    this.emitEvent(report)
  }

  /**
   * 导出到文件
   */
  private exportToFile(report: PerformanceReport): void {
    try {
      const filename = `performance-report-${this.counter}-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.json`
      const dataStr = JSON.stringify(report, null, 2)

      if (typeof window !== 'undefined') {
        const blob = new Blob([dataStr], { type: 'application/json' })
        const url = URL.createObjectURL(blob)

        const link = document.createElement('a')
        link.href = url
        link.download = filename
        link.click()

        URL.revokeObjectURL(url)
      }
    } catch (error) {
      console.warn('Failed to export performance report:', error)
    }
  }

  /**
   * 发送事件
   */
  private emitEvent(report: PerformanceReport): void {
    if (typeof window !== 'undefined') {
      const event = new CustomEvent('performance-report-generated', {
        detail: { report, counter: this.counter },
      })
      window.dispatchEvent(event)
    }
  }

  /**
   * 转换为 CSV
   */
  private toCSV(report: PerformanceReport): string {
    const lines: string[] = ['Timestamp,Metric,Value,Source,Severity']

    for (const [metric, stats] of Object.entries(report.metrics)) {
      lines.push(`${report.timestamp},${metric},${stats.current},,`)
    }

    for (const warning of report.warnings) {
      lines.push(
        `${warning.timestamp},${warning.type},${warning.value},${warning.source},${warning.severity}`
      )
    }

    return lines.join('\n')
  }

  /**
   * 转换为 HTML
   */
  private toHTML(report: PerformanceReport): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <title>性能监控报告</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 20px; }
          .metric { display: inline-block; margin: 10px; padding: 10px; border: 1px solid #ddd; border-radius: 5px; }
          .warning { color: red; margin: 5px 0; }
          .info { color: blue; margin: 5px 0; }
        </style>
      </head>
      <body>
        <h1>性能监控报告</h1>
        <p>生成时间: ${report.timestamp}</p>

        <h2>性能指标</h2>
        ${Object.entries(report.metrics)
          .map(
            ([key, stats]) => `
          <div class="metric">
            <h3>${key}</h3>
            <p>当前值: ${stats.current}</p>
            <p>平均值: ${stats.avg}</p>
            <p>最小值: ${stats.min}</p>
            <p>最大值: ${stats.max}</p>
          </div>
        `
          )
          .join('')}

        <h2>警告信息</h2>
        ${report.warnings
          .map(
            (warning) => `
          <div class="warning">[${warning.severity}] ${warning.message}</div>
        `
          )
          .join('')}

        <h2>瓶颈分析</h2>
        <div class="info">
          <p>类型: ${report.bottlenecks.type}</p>
          <p>描述: ${report.bottlenecks.description}</p>
          <p>建议: ${report.bottlenecks.suggestions.join(', ')}</p>
        </div>
      </body>
      </html>
    `
  }
}
