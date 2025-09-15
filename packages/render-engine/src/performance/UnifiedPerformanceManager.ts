/**
 * 统一性能监控管理器
 * 作为整个系统的性能监控入口点，协调各个数据源适配器
 */

import { 
  UnifiedPerformanceMonitor,
  UnifiedPerformanceConfig,
  UnifiedMetricType,
  DataSourceType,
  UnifiedPerformanceWarning,
  BottleneckAnalysis
} from './UnifiedPerformanceMonitor';
import { RenderEngineAdapter } from './adapters/RenderEngineAdapter';
import { CanvasSDKAdapter } from './adapters/CanvasSDKAdapter';
import { FrontendUIAdapter } from './adapters/FrontendUIAdapter';

/**
 * 性能监控管理器配置
 */
export interface PerformanceManagerConfig extends Partial<UnifiedPerformanceConfig> {
  enabledSources?: DataSourceType[];
  enableDashboard?: boolean;
  dashboardUpdateInterval?: number;
  reportingInterval?: number;
  autoExportReports?: boolean;
  exportPath?: string;
}

/**
 * 性能仪表板配置
 */
interface DashboardConfig {
  position: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
  width: number;
  height: number;
  opacity: number;
  collapsible: boolean;
  refreshInterval: number;
}

/**
 * 统一性能监控管理器
 */
export class UnifiedPerformanceManager {
  private monitor: UnifiedPerformanceMonitor;
  private config: PerformanceManagerConfig;
  
  // 适配器
  private renderEngineAdapter: RenderEngineAdapter | null = null;
  private canvasSDKAdapter: CanvasSDKAdapter | null = null;
  private frontendUIAdapter: FrontendUIAdapter | null = null;
  
  // 仪表板
  private dashboardElement: HTMLElement | null = null;
  private dashboardTimer: number | null = null;
  private dashboardConfig: DashboardConfig = {
    position: 'top-right',
    width: 350,
    height: 400,
    opacity: 0.9,
    collapsible: true,
    refreshInterval: 1000
  };
  
  // 报告生成
  private reportingTimer: number | null = null;
  private reportCounter = 0;
  
  constructor(config?: PerformanceManagerConfig) {
    this.config = {
      sampleInterval: 1000,
      historyRetention: 300,
      enableAutoAnalysis: true,
      enableWarnings: true,
      enableCrossSourcceCorrelation: true,
      enabledSources: [
        DataSourceType.RENDER_ENGINE,
        DataSourceType.CANVAS_SDK,
        DataSourceType.FRONTEND_UI
      ],
      enableDashboard: false,
      dashboardUpdateInterval: 1000,
      reportingInterval: 60000, // 1分钟生成一次报告
      autoExportReports: false,
      ...config
    };
    
    this.monitor = new UnifiedPerformanceMonitor(this.config);
    this.setupEventHandlers();
  }
  
  /**
   * 初始化性能监控管理器
   */
  async initialize(): Promise<void> {
    // 初始化适配器
    await this.initializeAdapters();
    
    // 注册适配器到监控器
    this.registerAdapters();
    
    // 初始化监控器
    await this.monitor.initialize();
    
    // 启动监控
    this.monitor.start();
    
    // 启动仪表板
    if (this.config.enableDashboard) {
      this.createDashboard();
    }
    
    // 启动报告生成
    if (this.config.reportingInterval && this.config.reportingInterval > 0) {
      this.startReportGeneration();
    }
    
    console.log('统一性能监控系统已启动');
  }
  
  /**
   * 设置Render Engine性能组件
   */
  setRenderEngineComponents(
    performanceMonitor?: any,
    performanceMonitorSystem?: any,
    gl?: WebGLRenderingContext
  ): void {
    if (!this.renderEngineAdapter) {
      this.renderEngineAdapter = new RenderEngineAdapter(
        performanceMonitor,
        gl
      );
    }
  }
  
  /**
   * 设置Canvas SDK性能组件
   */
  setCanvasSDKComponents(performanceProvider?: any): void {
    if (!this.canvasSDKAdapter) {
      this.canvasSDKAdapter = new CanvasSDKAdapter();
    }
    
    if (performanceProvider) {
      this.canvasSDKAdapter.setPerformanceProvider(performanceProvider);
    }
  }
  
  /**
   * 设置Frontend UI性能组件
   */
  setFrontendUIComponents(performanceProvider?: any): void {
    if (!this.frontendUIAdapter) {
      this.frontendUIAdapter = new FrontendUIAdapter();
    }
    
    if (performanceProvider) {
      this.frontendUIAdapter.setPerformanceProvider(performanceProvider);
    }
  }
  
  /**
   * 手动记录指标
   */
  recordMetric(
    type: UnifiedMetricType,
    value: number,
    source: DataSourceType,
    metadata?: Record<string, any>
  ): void {
    this.monitor.recordMetric(type, value, source, metadata);
  }
  
  /**
   * 获取当前性能指标
   */
  getCurrentMetrics(): Record<UnifiedMetricType, number> {
    return this.monitor.getCurrentMetrics();
  }
  
  /**
   * 获取性能统计
   */
  getStats() {
    return this.monitor.getStats();
  }
  
  /**
   * 获取警告列表
   */
  getWarnings(severity?: 'low' | 'medium' | 'high'): UnifiedPerformanceWarning[] {
    return this.monitor.getWarnings(severity);
  }
  
  /**
   * 执行瓶颈分析
   */
  analyzeBottlenecks(): BottleneckAnalysis {
    return this.monitor.analyzeBottlenecks();
  }
  
  /**
   * 生成综合性能报告
   */
  generateReport(): any {
    return this.monitor.generateComprehensiveReport();
  }
  
  /**
   * 导出性能报告
   */
  exportReport(format: 'json' | 'csv' | 'html' = 'json'): string {
    const report = this.generateReport();
    
    switch (format) {
      case 'json':
        return JSON.stringify(report, null, 2);
      case 'csv':
        return this.convertReportToCSV(report);
      case 'html':
        return this.convertReportToHTML(report);
      default:
        return JSON.stringify(report, null, 2);
    }
  }
  
  /**
   * 启用/禁用仪表板
   */
  setDashboardEnabled(enabled: boolean): void {
    this.config.enableDashboard = enabled;
    
    if (enabled && !this.dashboardElement) {
      this.createDashboard();
    } else if (!enabled && this.dashboardElement) {
      this.destroyDashboard();
    }
  }
  
  /**
   * 配置仪表板
   */
  configureDashboard(config: Partial<DashboardConfig>): void {
    Object.assign(this.dashboardConfig, config);
    
    if (this.dashboardElement) {
      this.updateDashboardStyle();
    }
  }
  
  /**
   * 清理历史数据
   */
  clearHistory(): void {
    this.monitor.clearHistory();
  }
  
  /**
   * 清理警告
   */
  clearWarnings(): void {
    this.monitor.clearWarnings();
  }
  
  /**
   * 重启监控
   */
  restart(): void {
    this.stop();
    this.monitor.start();
    
    if (this.config.enableDashboard && !this.dashboardElement) {
      this.createDashboard();
    }
  }
  
  /**
   * 停止监控
   */
  stop(): void {
    this.monitor.stop();
    this.destroyDashboard();
    this.stopReportGeneration();
  }
  
  /**
   * 销毁管理器
   */
  dispose(): void {
    this.stop();
    this.monitor.dispose();
    
    // 销毁适配器
    if (this.renderEngineAdapter) {
      this.renderEngineAdapter.dispose();
      this.renderEngineAdapter = null;
    }
    
    if (this.canvasSDKAdapter) {
      this.canvasSDKAdapter.dispose();
      this.canvasSDKAdapter = null;
    }
    
    if (this.frontendUIAdapter) {
      this.frontendUIAdapter.dispose();
      this.frontendUIAdapter = null;
    }
  }
  
  /**
   * 初始化适配器
   */
  private async initializeAdapters(): Promise<void> {
    const enabledSources = this.config.enabledSources || [];
    
    // 初始化Render Engine适配器
    if (enabledSources.includes(DataSourceType.RENDER_ENGINE)) {
      if (!this.renderEngineAdapter) {
        this.renderEngineAdapter = new RenderEngineAdapter();
      }
      await this.renderEngineAdapter.initialize();
    }
    
    // 初始化Canvas SDK适配器
    if (enabledSources.includes(DataSourceType.CANVAS_SDK)) {
      if (!this.canvasSDKAdapter) {
        this.canvasSDKAdapter = new CanvasSDKAdapter();
      }
      await this.canvasSDKAdapter.initialize();
    }
    
    // 初始化Frontend UI适配器
    if (enabledSources.includes(DataSourceType.FRONTEND_UI)) {
      if (!this.frontendUIAdapter) {
        this.frontendUIAdapter = new FrontendUIAdapter();
      }
      await this.frontendUIAdapter.initialize();
    }
  }
  
  /**
   * 注册适配器到监控器
   */
  private registerAdapters(): void {
    if (this.renderEngineAdapter) {
      this.monitor.registerAdapter(this.renderEngineAdapter);
    }
    
    if (this.canvasSDKAdapter) {
      this.monitor.registerAdapter(this.canvasSDKAdapter);
    }
    
    if (this.frontendUIAdapter) {
      this.monitor.registerAdapter(this.frontendUIAdapter);
    }
  }
  
  /**
   * 设置事件处理器
   */
  private setupEventHandlers(): void {
    this.monitor.on('warning-triggered', (warning) => {
      console.warn(`性能警告 [${warning.severity}] ${warning.source}:`, warning.message);
      
      // 更新仪表板警告显示
      if (this.dashboardElement) {
        this.updateDashboard();
      }
    });
    
    this.monitor.on('bottleneck-detected', (bottleneck) => {
      console.warn(`性能瓶颈检测 [${bottleneck.type}]:`, bottleneck.description);
    });
    
    this.monitor.on('correlation-found', (correlation) => {
      console.info('发现性能关联:', correlation.description);
    });
  }
  
  /**
   * 创建性能仪表板
   */
  private createDashboard(): void {
    if (typeof document === 'undefined') return;
    
    this.dashboardElement = document.createElement('div');
    this.dashboardElement.id = 'unified-performance-dashboard';
    
    this.updateDashboardStyle();
    this.updateDashboard();
    
    document.body.appendChild(this.dashboardElement);
    
    // 启动仪表板更新定时器
    this.dashboardTimer = window.setInterval(() => {
      this.updateDashboard();
    }, this.dashboardConfig.refreshInterval);
  }
  
  /**
   * 更新仪表板样式
   */
  private updateDashboardStyle(): void {
    if (!this.dashboardElement) return;
    
    const position = this.dashboardConfig.position;
    const positionStyle = {
      'top-left': 'top: 10px; left: 10px;',
      'top-right': 'top: 10px; right: 10px;',
      'bottom-left': 'bottom: 10px; left: 10px;',
      'bottom-right': 'bottom: 10px; right: 10px;'
    }[position];
    
    this.dashboardElement.style.cssText = `
      position: fixed;
      ${positionStyle}
      width: ${this.dashboardConfig.width}px;
      height: ${this.dashboardConfig.height}px;
      background: rgba(0, 0, 0, ${this.dashboardConfig.opacity});
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
    `;
  }
  
  /**
   * 更新仪表板内容
   */
  private updateDashboard(): void {
    if (!this.dashboardElement) return;
    
    const metrics = this.getCurrentMetrics();
    const warnings = this.getWarnings().slice(-3); // 最近3个警告
    const bottlenecks = this.analyzeBottlenecks();
    
    const html = `
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
      
      ${bottlenecks.type !== 'none' ? `
        <div style="margin-bottom: 12px;">
          <div style="color: #FF9800; font-weight: bold; margin-bottom: 4px;">⚠️ 瓶颈分析</div>
          <div style="font-size: 10px; color: ${this.getSeverityColor(bottlenecks.severity)};">
            ${bottlenecks.description} (置信度: ${(bottlenecks.confidence * 100).toFixed(0)}%)
          </div>
        </div>
      ` : ''}
      
      ${warnings.length > 0 ? `
        <div style="margin-bottom: 12px;">
          <div style="color: #F44336; font-weight: bold; margin-bottom: 4px;">🚨 警告</div>
          ${warnings.map(w => `
            <div style="font-size: 10px; color: ${this.getSeverityColor(w.severity)}; margin-bottom: 2px;">
              [${w.source}] ${w.message}
            </div>
          `).join('')}
        </div>
      ` : ''}
      
      <div style="margin-top: 8px; padding-top: 8px; border-top: 1px solid rgba(255, 255, 255, 0.1);">
        <div style="display: flex; justify-content: space-between; font-size: 10px; opacity: 0.7;">
          <span>数据源: ${this.getActiveSources().join(', ')}</span>
          <span>报告: #${this.reportCounter}</span>
        </div>
      </div>
    `;
    
    this.dashboardElement.innerHTML = html;
  }
  
  /**
   * 销毁仪表板
   */
  private destroyDashboard(): void {
    if (this.dashboardTimer) {
      clearInterval(this.dashboardTimer);
      this.dashboardTimer = null;
    }
    
    if (this.dashboardElement) {
      this.dashboardElement.remove();
      this.dashboardElement = null;
    }
  }
  
  /**
   * 启动报告生成
   */
  private startReportGeneration(): void {
    if (!this.config.reportingInterval) return;
    
    this.reportingTimer = window.setInterval(() => {
      this.generateAndProcessReport();
    }, this.config.reportingInterval);
  }
  
  /**
   * 停止报告生成
   */
  private stopReportGeneration(): void {
    if (this.reportingTimer) {
      clearInterval(this.reportingTimer);
      this.reportingTimer = null;
    }
  }
  
  /**
   * 生成并处理报告
   */
  private generateAndProcessReport(): void {
    this.reportCounter++;
    const report = this.generateReport();
    
    // 如果启用了自动导出
    if (this.config.autoExportReports) {
      this.exportReportToFile(report);
    }
    
    // 发射自定义事件
    if (typeof window !== 'undefined') {
      const event = new CustomEvent('performance-report-generated', {
        detail: { report, counter: this.reportCounter }
      });
      window.dispatchEvent(event);
    }
  }
  
  /**
   * 导出报告到文件
   */
  private exportReportToFile(report: any): void {
    try {
      const filename = `performance-report-${this.reportCounter}-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.json`;
      const dataStr = JSON.stringify(report, null, 2);
      
      if (typeof window !== 'undefined') {
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(dataBlob);
        
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        link.click();
        
        URL.revokeObjectURL(url);
      }
    } catch (error) {
      console.warn('Failed to export performance report:', error);
    }
  }
  
  /**
   * 将报告转换为CSV格式
   */
  private convertReportToCSV(report: any): string {
    const lines: string[] = [];
    
    // 添加头部信息
    lines.push('Timestamp,Metric,Value,Source,Severity');
    
    // 添加指标数据
    for (const [metric, stats] of Object.entries(report.metrics)) {
      lines.push(`${report.timestamp},${metric},${(stats as any).current},,`);
    }
    
    // 添加警告数据
    for (const warning of report.warnings) {
      lines.push(`${warning.timestamp},${warning.type},${warning.value},${warning.source},${warning.severity}`);
    }
    
    return lines.join('\n');
  }
  
  /**
   * 将报告转换为HTML格式
   */
  private convertReportToHTML(report: any): string {
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
        ${Object.entries(report.metrics).map(([key, stats]) => `
          <div class="metric">
            <h3>${key}</h3>
            <p>当前值: ${(stats as any).current}</p>
            <p>平均值: ${(stats as any).avg}</p>
            <p>最小值: ${(stats as any).min}</p>
            <p>最大值: ${(stats as any).max}</p>
          </div>
        `).join('')}
        
        <h2>警告信息</h2>
        ${report.warnings.map((warning: any) => `
          <div class="warning">[${warning.severity}] ${warning.message}</div>
        `).join('')}
        
        <h2>瓶颈分析</h2>
        <div class="info">
          <p>类型: ${report.bottlenecks.type}</p>
          <p>描述: ${report.bottlenecks.description}</p>
          <p>建议: ${report.bottlenecks.suggestions.join(', ')}</p>
        </div>
      </body>
      </html>
    `;
  }
  
  /**
   * 获取数值对应的颜色
   */
  private getValueColor(value: number, warning: number, good: number, reverse = false): string {
    if (!value) return '#888';
    
    if (reverse) {
      if (value <= good) return '#4CAF50';
      if (value <= warning) return '#FF9800';
      return '#F44336';
    } else {
      if (value >= good) return '#4CAF50';
      if (value >= warning) return '#FF9800';
      return '#F44336';
    }
  }
  
  /**
   * 获取内存使用对应的颜色
   */
  private getMemoryColor(bytes: number): string {
    if (!bytes) return '#888';
    
    const mb = bytes / (1024 * 1024);
    if (mb < 100) return '#4CAF50';
    if (mb < 300) return '#FF9800';
    return '#F44336';
  }
  
  /**
   * 获取严重性对应的颜色
   */
  private getSeverityColor(severity: string): string {
    switch (severity) {
      case 'high': return '#F44336';
      case 'medium': return '#FF9800';
      case 'low': return '#FFEB3B';
      default: return '#888';
    }
  }
  
  /**
   * 格式化字节数
   */
  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B';
    
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  }
  
  /**
   * 获取活跃数据源
   */
  private getActiveSources(): string[] {
    const sources: string[] = [];
    if (this.renderEngineAdapter) sources.push('RE');
    if (this.canvasSDKAdapter) sources.push('SDK');
    if (this.frontendUIAdapter) sources.push('UI');
    return sources;
  }
}

// 创建全局实例
export const globalPerformanceManager = new UnifiedPerformanceManager({
  enableDashboard: false, // 默认关闭仪表板
  reportingInterval: 0, // 默认不生成报告
  sources: [
    DataSourceType.RENDER_ENGINE,
    DataSourceType.CANVAS_SDK,
    DataSourceType.FRONTEND_UI
  ]
});

// 暴露到全局对象（方便调试）
if (typeof window !== 'undefined') {
  (window as any).performanceManager = globalPerformanceManager;
}