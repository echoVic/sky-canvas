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
import { PerformanceDashboard, IDashboardDataProvider, DashboardConfig } from './PerformanceDashboard';
import { PerformanceReporter, IReportDataProvider } from './PerformanceReporter';
import { PerformanceMonitor } from './PerformanceMonitor';
import { PerformanceMonitorSystem } from '../core/systems/PerformanceMonitorSystem';

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
 * 性能报告类型（简化版，用于管理器接口）
 */
export interface PerformanceReport {
  timestamp: string;
  metrics: Record<string, { current: number; avg: number; min: number; max: number }>;
  warnings: Array<{ timestamp: string; type: string; value: number; source: string; severity: string; message: string }>;
  bottlenecks: { type: string; description: string; suggestions: string[] };
}

/**
 * 统一性能监控管理器
 */
export class UnifiedPerformanceManager implements IDashboardDataProvider, IReportDataProvider {
  private monitor: UnifiedPerformanceMonitor;
  private config: PerformanceManagerConfig;

  // 适配器
  private renderEngineAdapter: RenderEngineAdapter | null = null;
  private canvasSDKAdapter: CanvasSDKAdapter | null = null;
  private frontendUIAdapter: FrontendUIAdapter | null = null;

  // 仪表板和报告器
  private dashboard: PerformanceDashboard | null = null;
  private reporter: PerformanceReporter | null = null;

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
      reportingInterval: 60000,
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
    await this.initializeAdapters();
    this.registerAdapters();
    await this.monitor.initialize();
    this.monitor.start();

    if (this.config.enableDashboard) {
      this.createDashboard();
    }

    if (this.config.reportingInterval && this.config.reportingInterval > 0) {
      this.createReporter();
    }

    console.log('统一性能监控系统已启动');
  }

  /**
   * 设置Render Engine性能组件
   */
  setRenderEngineComponents(
    performanceMonitor?: PerformanceMonitor,
    performanceMonitorSystem?: PerformanceMonitorSystem,
    gl?: WebGLRenderingContext
  ): void {
    if (!this.renderEngineAdapter) {
      this.renderEngineAdapter = new RenderEngineAdapter(
        performanceMonitor,
        performanceMonitorSystem,
        gl
      );
    }
  }

  /**
   * 设置Canvas SDK性能组件
   */
  setCanvasSDKComponents(performanceProvider?: unknown): void {
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
  setFrontendUIComponents(performanceProvider?: unknown): void {
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
    metadata?: Record<string, unknown>
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
  getStats(): ReturnType<UnifiedPerformanceMonitor['getStats']> {
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
  generateComprehensiveReport(): PerformanceReport {
    const report = this.monitor.generateComprehensiveReport();
    // 转换为简化的报告格式
    return {
      timestamp: report.timestamp,
      metrics: Object.fromEntries(
        Object.entries(report.metrics).map(([key, value]) => [key, {
          current: value.current,
          avg: value.avg,
          min: value.min,
          max: value.max
        }])
      ),
      warnings: report.warnings.map(w => ({
        timestamp: new Date(w.timestamp).toISOString(),
        type: w.type,
        value: w.value,
        source: w.source,
        severity: w.severity,
        message: w.message
      })),
      bottlenecks: {
        type: report.bottlenecks.type,
        description: report.bottlenecks.description,
        suggestions: report.bottlenecks.suggestions
      }
    };
  }

  /**
   * 获取活跃数据源
   */
  getActiveSources(): string[] {
    const sources: string[] = [];
    if (this.renderEngineAdapter) sources.push('RE');
    if (this.canvasSDKAdapter) sources.push('SDK');
    if (this.frontendUIAdapter) sources.push('UI');
    return sources;
  }

  /**
   * 获取报告计数
   */
  getReportCounter(): number {
    return this.reporter?.getCounter() ?? 0;
  }

  /**
   * 导出性能报告
   */
  exportReport(format: 'json' | 'csv' | 'html' = 'json'): string {
    if (!this.reporter) {
      this.reporter = new PerformanceReporter(this);
    }
    return this.reporter.export(format);
  }

  /**
   * 启用/禁用仪表板
   */
  setDashboardEnabled(enabled: boolean): void {
    this.config.enableDashboard = enabled;

    if (enabled && !this.dashboard) {
      this.createDashboard();
    } else if (!enabled && this.dashboard) {
      this.dashboard.destroy();
      this.dashboard = null;
    }
  }

  /**
   * 配置仪表板
   */
  configureDashboard(config: Partial<DashboardConfig>): void {
    this.dashboard?.configure(config);
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

    if (this.config.enableDashboard && !this.dashboard?.isCreated()) {
      this.createDashboard();
    }
  }

  /**
   * 停止监控
   */
  stop(): void {
    this.monitor.stop();
    this.dashboard?.destroy();
    this.reporter?.stop();
  }

  /**
   * 销毁管理器
   */
  dispose(): void {
    this.stop();
    this.monitor.dispose();

    this.renderEngineAdapter?.dispose();
    this.renderEngineAdapter = null;

    this.canvasSDKAdapter?.dispose();
    this.canvasSDKAdapter = null;

    this.frontendUIAdapter?.dispose();
    this.frontendUIAdapter = null;

    this.dashboard = null;
    this.reporter = null;
  }

  /**
   * 初始化适配器
   */
  private async initializeAdapters(): Promise<void> {
    const enabledSources = this.config.enabledSources || [];

    if (enabledSources.includes(DataSourceType.RENDER_ENGINE)) {
      if (!this.renderEngineAdapter) {
        this.renderEngineAdapter = new RenderEngineAdapter();
      }
      await this.renderEngineAdapter.initialize();
    }

    if (enabledSources.includes(DataSourceType.CANVAS_SDK)) {
      if (!this.canvasSDKAdapter) {
        this.canvasSDKAdapter = new CanvasSDKAdapter();
      }
      await this.canvasSDKAdapter.initialize();
    }

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
    });

    this.monitor.on('bottleneck-detected', (bottleneck) => {
      console.warn(`性能瓶颈检测 [${bottleneck.type}]:`, bottleneck.description);
    });

    this.monitor.on('correlation-found', (correlation) => {
      console.info('发现性能关联:', correlation.description);
    });
  }

  /**
   * 创建仪表板
   */
  private createDashboard(): void {
    this.dashboard = new PerformanceDashboard(this, {
      refreshInterval: this.config.dashboardUpdateInterval
    });
    this.dashboard.create();
  }

  /**
   * 创建报告器
   */
  private createReporter(): void {
    this.reporter = new PerformanceReporter(
      this,
      this.config.reportingInterval,
      this.config.autoExportReports
    );
    this.reporter.start();
  }
}

// 创建全局实例
export const globalPerformanceManager = new UnifiedPerformanceManager({
  enableDashboard: false,
  reportingInterval: 0,
  sources: [
    DataSourceType.RENDER_ENGINE,
    DataSourceType.CANVAS_SDK,
    DataSourceType.FRONTEND_UI
  ]
});

// 暴露到全局对象（方便调试）
if (typeof window !== 'undefined') {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (window as any).performanceManager = globalPerformanceManager;
}
