/**
 * 统一性能监控系统
 * 避免重复数据采集，提供跨包的统一性能监控接口
 */

import { EventEmitter } from '../events/EventBus';
import {
  UnifiedMetricType,
  UnifiedMetricDataPoint,
  UnifiedMetricStats,
  UnifiedPerformanceWarning,
  UnifiedPerformanceConfig,
  UnifiedPerformanceEvents,
  IDataSourceAdapter,
  DataSourceType,
  BottleneckAnalysis,
  CorrelationResult
} from './PerformanceTypes';
import { CrossSourceCorrelationAnalyzer } from './CrossSourceCorrelationAnalyzer';
import { BottleneckAnalyzer } from './BottleneckAnalyzer';
import { PerformanceSuggestionProvider } from './PerformanceSuggestions';

// 重新导出类型供外部使用
export * from './PerformanceTypes';
export { CrossSourceCorrelationAnalyzer } from './CrossSourceCorrelationAnalyzer';
export { BottleneckAnalyzer } from './BottleneckAnalyzer';
export { PerformanceSuggestionProvider } from './PerformanceSuggestions';

/**
 * 默认配置
 */
const DEFAULT_CONFIG: UnifiedPerformanceConfig = {
  sampleInterval: 1000,
  historyRetention: 300,
  enableAutoAnalysis: true,
  enableWarnings: true,
  enableCrossSourcceCorrelation: true,
  thresholds: {
    [UnifiedMetricType.FPS]: { min: 30, max: 120 },
    [UnifiedMetricType.FRAME_TIME]: { max: 33.33 },
    [UnifiedMetricType.DRAW_CALLS]: { max: 1000 },
    [UnifiedMetricType.MEMORY_USAGE]: { max: 512 * 1024 * 1024 },
    [UnifiedMetricType.GPU_MEMORY]: { max: 256 * 1024 * 1024 },
    [UnifiedMetricType.CACHE_HIT_RATE]: { min: 0.8 },
    [UnifiedMetricType.INPUT_LATENCY]: { max: 16 },
    [UnifiedMetricType.PLUGIN_LOAD_TIME]: { max: 1000 }
  },
  sources: [
    DataSourceType.RENDER_ENGINE,
    DataSourceType.CANVAS_SDK,
    DataSourceType.FRONTEND_UI,
    DataSourceType.PLUGIN_SYSTEM
  ]
};

/**
 * 统一性能监控器
 */
export class UnifiedPerformanceMonitor extends EventEmitter<UnifiedPerformanceEvents> {
  private config: UnifiedPerformanceConfig;
  private adapters = new Map<DataSourceType, IDataSourceAdapter>();
  private metrics = new Map<UnifiedMetricType, UnifiedMetricDataPoint[]>();
  private stats = new Map<UnifiedMetricType, UnifiedMetricStats>();
  private warnings: UnifiedPerformanceWarning[] = [];

  private correlationAnalyzer: CrossSourceCorrelationAnalyzer;
  private bottleneckAnalyzer: BottleneckAnalyzer;
  private suggestionProvider: PerformanceSuggestionProvider;

  private isActive = false;
  private sampleTimer: number | null = null;
  private analysisTimer: number | null = null;

  constructor(config?: Partial<UnifiedPerformanceConfig>) {
    super();
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.correlationAnalyzer = new CrossSourceCorrelationAnalyzer();
    this.bottleneckAnalyzer = new BottleneckAnalyzer(this.config.thresholds);
    this.suggestionProvider = new PerformanceSuggestionProvider();
    this.initializeMetrics();
  }

  /** 注册数据源适配器 */
  registerAdapter(adapter: IDataSourceAdapter): void {
    this.adapters.set(adapter.sourceType, adapter);
  }

  /** 初始化监控器 */
  async initialize(): Promise<void> {
    for (const adapter of this.adapters.values()) {
      await adapter.initialize();
    }
    this.initializeMetrics();
  }

  /** 开始监控 */
  start(): void {
    if (this.isActive) return;
    this.isActive = true;

    this.sampleTimer = window.setInterval(() => {
      this.collectMetrics();
    }, this.config.sampleInterval);

    if (this.config.enableAutoAnalysis) {
      this.analysisTimer = window.setInterval(() => {
        this.performAnalysis();
      }, this.config.sampleInterval * 5);
    }
  }

  /** 停止监控 */
  stop(): void {
    if (!this.isActive) return;
    this.isActive = false;

    if (this.sampleTimer) {
      clearInterval(this.sampleTimer);
      this.sampleTimer = null;
    }
    if (this.analysisTimer) {
      clearInterval(this.analysisTimer);
      this.analysisTimer = null;
    }
  }

  /** 手动记录指标 */
  recordMetric(
    type: UnifiedMetricType,
    value: number,
    source: DataSourceType,
    metadata?: Record<string, unknown>
  ): void {
    const dataPoint: UnifiedMetricDataPoint = {
      timestamp: performance.now(),
      value,
      source,
      metadata
    };
    this.addDataPoint(type, dataPoint);
  }

  /** 获取当前指标 */
  getCurrentMetrics(): Record<UnifiedMetricType, number> {
    const current: Record<string, number> = {};
    for (const [type, stat] of this.stats) {
      current[type] = stat.current;
    }
    return current as Record<UnifiedMetricType, number>;
  }

  /** 获取指标统计 */
  getStats(metricType?: UnifiedMetricType): UnifiedMetricStats | Map<UnifiedMetricType, UnifiedMetricStats> {
    if (metricType) {
      return this.stats.get(metricType) || this.createEmptyStats([]);
    }
    return new Map(this.stats);
  }

  /** 获取历史数据 */
  getHistoryData(metricType: UnifiedMetricType, duration?: number): UnifiedMetricDataPoint[] {
    const data = this.metrics.get(metricType) || [];
    if (duration) {
      const cutoffTime = performance.now() - duration * 1000;
      return data.filter(point => point.timestamp >= cutoffTime);
    }
    return [...data];
  }

  /** 获取警告列表 */
  getWarnings(severity?: 'low' | 'medium' | 'high'): UnifiedPerformanceWarning[] {
    if (severity) {
      return this.warnings.filter(w => w.severity === severity);
    }
    return [...this.warnings];
  }

  /** 执行瓶颈分析 */
  analyzeBottlenecks(): BottleneckAnalysis {
    const recentData = this.getRecentData(30);
    return this.bottleneckAnalyzer.analyze(recentData);
  }

  /** 生成综合性能报告 */
  generateComprehensiveReport(): {
    timestamp: string;
    summary: { totalMetrics: number; activeSources: DataSourceType[]; overallHealth: 'good' | 'warning' | 'critical' };
    metrics: Record<UnifiedMetricType, UnifiedMetricStats>;
    warnings: UnifiedPerformanceWarning[];
    bottlenecks: BottleneckAnalysis;
    correlations: CorrelationResult[];
    recommendations: string[];
  } {
    const activeSources = this.getActiveSources();
    const overallHealth = this.calculateOverallHealth();
    const bottlenecks = this.analyzeBottlenecks();
    const correlations = this.config.enableCrossSourcceCorrelation
      ? this.correlationAnalyzer.detectCrossSourceCorrelations(this.metrics)
      : [];
    const highWarningsCount = this.warnings.filter(w => w.severity === 'high').length;

    return {
      timestamp: new Date().toISOString(),
      summary: { totalMetrics: this.metrics.size, activeSources, overallHealth },
      metrics: Object.fromEntries(this.stats) as Record<UnifiedMetricType, UnifiedMetricStats>,
      warnings: this.warnings,
      bottlenecks,
      correlations,
      recommendations: this.suggestionProvider.generateRecommendations(bottlenecks, correlations, highWarningsCount)
    };
  }

  /** 清理历史数据 */
  clearHistory(metricType?: UnifiedMetricType): void {
    if (metricType) {
      this.metrics.set(metricType, []);
      this.stats.set(metricType, this.createEmptyStats([]));
    } else {
      this.metrics.clear();
      this.stats.clear();
      this.initializeMetrics();
    }
  }

  /** 清理警告 */
  clearWarnings(): void {
    this.warnings = [];
  }

  /** 销毁监控器 */
  dispose(): void {
    this.stop();
    for (const adapter of this.adapters.values()) {
      adapter.dispose();
    }
    this.adapters.clear();
    this.metrics.clear();
    this.stats.clear();
    this.warnings = [];
    this.removeAllListeners();
  }

  private initializeMetrics(): void {
    for (const metricType of Object.values(UnifiedMetricType)) {
      this.metrics.set(metricType as UnifiedMetricType, []);
      this.stats.set(metricType as UnifiedMetricType, this.createEmptyStats([]));
    }
  }

  private async collectMetrics(): Promise<void> {
    for (const [sourceType, adapter] of this.adapters) {
      try {
        const metrics = await adapter.collect();
        for (const [metricType, value] of metrics) {
          this.recordMetric(metricType, value, sourceType);
        }
      } catch (error) {
        console.warn(`Failed to collect metrics from ${sourceType}:`, error);
      }
    }
    this.cleanupOldData();
  }

  private addDataPoint(type: UnifiedMetricType, dataPoint: UnifiedMetricDataPoint): void {
    const dataPoints = this.metrics.get(type) || [];
    dataPoints.push(dataPoint);
    this.updateStats(type, dataPoint);

    this.emit('metric-updated', {
      type,
      value: dataPoint.value,
      timestamp: dataPoint.timestamp,
      source: dataPoint.source
    });

    if (this.config.enableWarnings) {
      this.checkThresholds(type, dataPoint);
    }
  }

  private updateStats(type: UnifiedMetricType, dataPoint: UnifiedMetricDataPoint): void {
    const dataPoints = this.metrics.get(type) || [];
    const stat = this.stats.get(type);

    if (stat) {
      stat.current = dataPoint.value;
      stat.min = Math.min(stat.min, dataPoint.value);
      stat.max = Math.max(stat.max, dataPoint.value);
      stat.samples++;

      const recentPoints = dataPoints.slice(-10);
      stat.avg = recentPoints.reduce((sum, p) => sum + p.value, 0) / recentPoints.length;

      if (dataPoints.length >= 5) {
        const recent = dataPoints.slice(-5).map(p => p.value);
        stat.trend = this.calculateTrend(recent);
      }

      stat.sources = [...new Set(dataPoints.map(p => p.source))];
    }
  }

  private calculateTrend(values: number[]): 'increasing' | 'decreasing' | 'stable' {
    if (values.length < 2) return 'stable';

    let increases = 0;
    let decreases = 0;

    for (let i = 1; i < values.length; i++) {
      if (values[i] > values[i - 1]) increases++;
      else if (values[i] < values[i - 1]) decreases++;
    }

    const threshold = values.length * 0.6;
    if (increases >= threshold) return 'increasing';
    if (decreases >= threshold) return 'decreasing';
    return 'stable';
  }

  private checkThresholds(type: UnifiedMetricType, dataPoint: UnifiedMetricDataPoint): void {
    const threshold = this.config.thresholds[type as keyof typeof this.config.thresholds];
    if (!threshold) return;

    let warning: UnifiedPerformanceWarning | null = null;

    if ('min' in threshold && dataPoint.value < threshold.min) {
      warning = this.createWarning(type, dataPoint, threshold.min, 'low');
    } else if ('max' in threshold && dataPoint.value > threshold.max) {
      warning = this.createWarning(type, dataPoint, threshold.max, 'high');
    }

    if (warning) {
      this.addWarning(warning);
    }
  }

  private createWarning(
    type: UnifiedMetricType,
    dataPoint: UnifiedMetricDataPoint,
    thresholdValue: number,
    issue: 'low' | 'high'
  ): UnifiedPerformanceWarning {
    const isLow = issue === 'low';
    const message = isLow
      ? `${type} 低于阈值: ${dataPoint.value} < ${thresholdValue}`
      : `${type} 超过阈值: ${dataPoint.value} > ${thresholdValue}`;

    const severityMultiplier = isLow ? 0.5 : 1.5;
    const isSevere = isLow
      ? dataPoint.value <= thresholdValue * severityMultiplier
      : dataPoint.value >= thresholdValue * severityMultiplier;

    return {
      type,
      message,
      severity: isSevere ? 'high' : 'medium',
      timestamp: dataPoint.timestamp,
      value: dataPoint.value,
      threshold: thresholdValue,
      source: dataPoint.source,
      suggestions: this.suggestionProvider.getSuggestionsForMetric(type, issue)
    };
  }

  private addWarning(warning: UnifiedPerformanceWarning): void {
    const recentWarning = this.warnings.find(
      w => w.type === warning.type && w.source === warning.source && warning.timestamp - w.timestamp < 5000
    );

    if (!recentWarning) {
      this.warnings.push(warning);
      if (this.warnings.length > 100) {
        this.warnings = this.warnings.slice(-100);
      }
      this.emit('warning-triggered', warning);
    }
  }

  private performAnalysis(): void {
    const bottlenecks = this.analyzeBottlenecks();
    if (bottlenecks.type !== 'none') {
      this.emit('bottleneck-detected', {
        type: bottlenecks.type,
        confidence: bottlenecks.confidence,
        description: bottlenecks.description,
        affectedSources: bottlenecks.affectedSources,
        suggestions: bottlenecks.suggestions
      });
    }

    if (this.config.enableCrossSourcceCorrelation) {
      const correlations = this.correlationAnalyzer.detectCrossSourceCorrelations(this.metrics);
      for (const correlation of correlations) {
        this.emit('correlation-found', {
          metrics: [correlation.metric1, correlation.metric2],
          correlation: correlation.correlation,
          description: correlation.description
        });
      }
    }
  }

  private getRecentData(count: number): Map<UnifiedMetricType, UnifiedMetricDataPoint[]> {
    const recentData = new Map<UnifiedMetricType, UnifiedMetricDataPoint[]>();
    for (const [type, data] of this.metrics) {
      const recent = data.slice(-count);
      if (recent.length > 0) {
        recentData.set(type, recent);
      }
    }
    return recentData;
  }

  private getActiveSources(): DataSourceType[] {
    return [
      ...new Set(
        Array.from(this.metrics.values())
          .flat()
          .map(d => d.source)
      )
    ];
  }

  private calculateOverallHealth(): 'good' | 'warning' | 'critical' {
    const criticalWarnings = this.warnings.filter(w => w.severity === 'high');
    const mediumWarnings = this.warnings.filter(w => w.severity === 'medium');

    if (criticalWarnings.length > 0) return 'critical';
    if (mediumWarnings.length > 3) return 'warning';
    return 'good';
  }

  private cleanupOldData(): void {
    const cutoffTime = performance.now() - this.config.historyRetention * 1000;

    for (const [type, dataPoints] of this.metrics) {
      const filteredData = dataPoints.filter(point => point.timestamp >= cutoffTime);
      this.metrics.set(type, filteredData);
    }

    this.warnings = this.warnings.filter(
      warning => Date.now() - warning.timestamp < this.config.historyRetention * 1000
    );
  }

  private createEmptyStats(sources: DataSourceType[]): UnifiedMetricStats {
    return { min: Infinity, max: -Infinity, avg: 0, current: 0, samples: 0, trend: 'stable', sources };
  }
}
