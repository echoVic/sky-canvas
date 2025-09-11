/**
 * 统一性能监控系统
 * 避免重复数据采集，提供跨包的统一性能监控接口
 */

import { EventEmitter } from '../events/EventBus';

/**
 * 统一性能指标类型
 */
export enum UnifiedMetricType {
  // 渲染性能
  FPS = 'fps',
  FRAME_TIME = 'frameTime',
  RENDER_TIME = 'renderTime',
  UPDATE_TIME = 'updateTime',
  
  // GPU性能
  DRAW_CALLS = 'drawCalls',
  VERTICES = 'vertices',
  TRIANGLES = 'triangles',
  BATCH_COUNT = 'batchCount',
  GPU_MEMORY = 'gpuMemory',
  SHADER_COMPILE_TIME = 'shaderCompileTime',
  
  // 内存性能
  MEMORY_USAGE = 'memoryUsage',
  TEXTURE_MEMORY = 'textureMemory',
  BUFFER_MEMORY = 'bufferMemory',
  
  // 系统性能
  CPU_USAGE = 'cpuUsage',
  CACHE_HIT_RATE = 'cacheHitRate',
  CULLED_OBJECTS = 'culledObjects',
  LOD_SWITCHES = 'lodSwitches',
  
  // 插件性能
  PLUGIN_LOAD_TIME = 'pluginLoadTime',
  PLUGIN_ACTIVATE_TIME = 'pluginActivateTime',
  PLUGIN_API_CALLS = 'pluginApiCalls',
  PLUGIN_ERRORS = 'pluginErrors',
  
  // 交互性能
  INPUT_LATENCY = 'inputLatency',
  EVENT_PROCESSING_TIME = 'eventProcessingTime',
  GESTURE_RECOGNITION_TIME = 'gestureRecognitionTime'
}

/**
 * 性能数据源类型
 */
export enum DataSourceType {
  RENDER_ENGINE = 'render-engine',
  CANVAS_SDK = 'canvas-sdk',
  FRONTEND_UI = 'frontend-ui',
  PLUGIN_SYSTEM = 'plugin-system'
}

/**
 * 统一性能数据点
 */
export interface UnifiedMetricDataPoint {
  timestamp: number;
  value: number;
  source: DataSourceType;
  metadata?: Record<string, any>;
}

/**
 * 统一性能统计
 */
export interface UnifiedMetricStats {
  min: number;
  max: number;
  avg: number;
  current: number;
  samples: number;
  trend: 'increasing' | 'decreasing' | 'stable';
  sources: DataSourceType[];
}

/**
 * 性能警告配置
 */
export interface UnifiedPerformanceThresholds {
  [UnifiedMetricType.FPS]: { min: number; max: number };
  [UnifiedMetricType.FRAME_TIME]: { max: number };
  [UnifiedMetricType.DRAW_CALLS]: { max: number };
  [UnifiedMetricType.MEMORY_USAGE]: { max: number };
  [UnifiedMetricType.GPU_MEMORY]: { max: number };
  [UnifiedMetricType.CACHE_HIT_RATE]: { min: number };
  [UnifiedMetricType.INPUT_LATENCY]: { max: number };
  [UnifiedMetricType.PLUGIN_LOAD_TIME]: { max: number };
}

/**
 * 统一性能警告
 */
export interface UnifiedPerformanceWarning {
  type: UnifiedMetricType;
  message: string;
  severity: 'low' | 'medium' | 'high';
  timestamp: number;
  value: number;
  threshold: number;
  source: DataSourceType;
  suggestions: string[];
}

/**
 * 性能监控配置
 */
export interface UnifiedPerformanceConfig {
  sampleInterval: number;
  historyRetention: number;
  enableAutoAnalysis: boolean;
  enableWarnings: boolean;
  enableCrossSourcceCorrelation: boolean;
  thresholds: Partial<UnifiedPerformanceThresholds>;
  sources: DataSourceType[];
}

/**
 * 性能事件类型
 */
export interface UnifiedPerformanceEvents {
  'metric-updated': { 
    type: UnifiedMetricType; 
    value: number; 
    timestamp: number; 
    source: DataSourceType 
  };
  'warning-triggered': UnifiedPerformanceWarning;
  'bottleneck-detected': {
    type: 'cpu' | 'gpu' | 'memory' | 'io' | 'network';
    confidence: number;
    description: string;
    affectedSources: DataSourceType[];
    suggestions: string[];
  };
  'correlation-found': {
    metrics: UnifiedMetricType[];
    correlation: number;
    description: string;
  };
}

/**
 * 数据源适配器接口
 */
export interface IDataSourceAdapter {
  readonly sourceType: DataSourceType;
  readonly supportedMetrics: UnifiedMetricType[];
  
  initialize(): Promise<void>;
  collect(): Promise<Map<UnifiedMetricType, number>>;
  dispose(): void;
}

/**
 * 瓶颈分析结果
 */
export interface BottleneckAnalysis {
  type: 'cpu' | 'gpu' | 'memory' | 'io' | 'network' | 'none';
  confidence: number;
  description: string;
  affectedMetrics: UnifiedMetricType[];
  affectedSources: DataSourceType[];
  suggestions: string[];
  severity: 'low' | 'medium' | 'high';
}

/**
 * 跨源关联分析
 */
export class CrossSourceCorrelationAnalyzer {
  private correlationHistory = new Map<string, number[]>();
  private correlationThreshold = 0.7;
  
  /**
   * 计算两个指标的关联性
   */
  calculateCorrelation(
    metric1Data: UnifiedMetricDataPoint[],
    metric2Data: UnifiedMetricDataPoint[]
  ): number {
    if (metric1Data.length < 10 || metric2Data.length < 10) return 0;
    
    // 对齐时间戳
    const alignedData = this.alignDataPoints(metric1Data, metric2Data);
    if (alignedData.length < 5) return 0;
    
    // 计算皮尔逊相关系数
    const values1 = alignedData.map(d => d.value1);
    const values2 = alignedData.map(d => d.value2);
    
    return this.pearsonCorrelation(values1, values2);
  }
  
  /**
   * 检测跨源关联
   */
  detectCrossSourceCorrelations(
    metricsData: Map<UnifiedMetricType, UnifiedMetricDataPoint[]>
  ): Array<{
    metric1: UnifiedMetricType;
    metric2: UnifiedMetricType;
    correlation: number;
    description: string;
  }> {
    const correlations: Array<{
      metric1: UnifiedMetricType;
      metric2: UnifiedMetricType;
      correlation: number;
      description: string;
    }> = [];
    
    const metrics = Array.from(metricsData.keys());
    
    // 检查所有指标对
    for (let i = 0; i < metrics.length; i++) {
      for (let j = i + 1; j < metrics.length; j++) {
        const metric1 = metrics[i];
        const metric2 = metrics[j];
        const data1 = metricsData.get(metric1) || [];
        const data2 = metricsData.get(metric2) || [];
        
        // 只分析来自不同源的指标
        const sources1 = new Set(data1.map(d => d.source));
        const sources2 = new Set(data2.map(d => d.source));
        const hasCommonSource = [...sources1].some(s => sources2.has(s));
        
        if (!hasCommonSource) {
          const correlation = this.calculateCorrelation(data1, data2);
          
          if (Math.abs(correlation) > this.correlationThreshold) {
            correlations.push({
              metric1,
              metric2,
              correlation,
              description: this.getCorrelationDescription(metric1, metric2, correlation)
            });
          }
        }
      }
    }
    
    return correlations;
  }
  
  private alignDataPoints(
    data1: UnifiedMetricDataPoint[],
    data2: UnifiedMetricDataPoint[]
  ): Array<{ value1: number; value2: number; timestamp: number }> {
    const aligned: Array<{ value1: number; value2: number; timestamp: number }> = [];
    const tolerance = 1000; // 1秒容差
    
    for (const point1 of data1) {
      const matchingPoint = data2.find(
        point2 => Math.abs(point2.timestamp - point1.timestamp) <= tolerance
      );
      
      if (matchingPoint) {
        aligned.push({
          value1: point1.value,
          value2: matchingPoint.value,
          timestamp: point1.timestamp
        });
      }
    }
    
    return aligned;
  }
  
  private pearsonCorrelation(x: number[], y: number[]): number {
    const n = Math.min(x.length, y.length);
    if (n === 0) return 0;
    
    const sumX = x.reduce((sum, val) => sum + val, 0);
    const sumY = y.reduce((sum, val) => sum + val, 0);
    const sumXY = x.reduce((sum, val, i) => sum + val * y[i], 0);
    const sumX2 = x.reduce((sum, val) => sum + val * val, 0);
    const sumY2 = y.reduce((sum, val) => sum + val * val, 0);
    
    const numerator = n * sumXY - sumX * sumY;
    const denominator = Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY));
    
    return denominator === 0 ? 0 : numerator / denominator;
  }
  
  private getCorrelationDescription(
    metric1: UnifiedMetricType,
    metric2: UnifiedMetricType,
    correlation: number
  ): string {
    const strength = Math.abs(correlation) > 0.8 ? '强' : '中等';
    const direction = correlation > 0 ? '正' : '负';
    
    return `检测到 ${metric1} 和 ${metric2} 之间存在${strength}${direction}相关性 (${correlation.toFixed(2)})`;
  }
}

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
  
  private isActive = false;
  private sampleTimer: number | null = null;
  private analysisTimer: number | null = null;
  
  constructor(config?: Partial<UnifiedPerformanceConfig>) {
    super();
    
    this.config = {
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
      ],
      ...config
    };
    
    this.correlationAnalyzer = new CrossSourceCorrelationAnalyzer();
    this.initializeMetrics();
  }
  
  /**
   * 注册数据源适配器
   */
  registerAdapter(adapter: IDataSourceAdapter): void {
    this.adapters.set(adapter.sourceType, adapter);
  }
  
  /**
   * 初始化监控器
   */
  async initialize(): Promise<void> {
    // 初始化所有适配器
    for (const adapter of this.adapters.values()) {
      await adapter.initialize();
    }
    
    this.initializeMetrics();
  }
  
  /**
   * 开始监控
   */
  start(): void {
    if (this.isActive) return;
    
    this.isActive = true;
    
    // 启动数据采集定时器
    this.sampleTimer = window.setInterval(() => {
      this.collectMetrics();
    }, this.config.sampleInterval);
    
    // 启动分析定时器
    if (this.config.enableAutoAnalysis) {
      this.analysisTimer = window.setInterval(() => {
        this.performAnalysis();
      }, this.config.sampleInterval * 5); // 5倍采集间隔进行分析
    }
  }
  
  /**
   * 停止监控
   */
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
  
  /**
   * 手动记录指标
   */
  recordMetric(
    type: UnifiedMetricType,
    value: number,
    source: DataSourceType,
    metadata?: Record<string, any>
  ): void {
    const dataPoint: UnifiedMetricDataPoint = {
      timestamp: performance.now(),
      value,
      source,
      metadata
    };
    
    this.addDataPoint(type, dataPoint);
  }
  
  /**
   * 获取当前指标
   */
  getCurrentMetrics(): Record<UnifiedMetricType, number> {
    const current: Record<string, number> = {};
    
    for (const [type, stat] of this.stats) {
      current[type] = stat.current;
    }
    
    return current as Record<UnifiedMetricType, number>;
  }
  
  /**
   * 获取指标统计
   */
  getStats(metricType?: UnifiedMetricType): UnifiedMetricStats | Map<UnifiedMetricType, UnifiedMetricStats> {
    if (metricType) {
      return this.stats.get(metricType) || this.createEmptyStats([]);
    }
    return new Map(this.stats);
  }
  
  /**
   * 获取历史数据
   */
  getHistoryData(metricType: UnifiedMetricType, duration?: number): UnifiedMetricDataPoint[] {
    const data = this.metrics.get(metricType) || [];
    
    if (duration) {
      const cutoffTime = performance.now() - duration * 1000;
      return data.filter(point => point.timestamp >= cutoffTime);
    }
    
    return [...data];
  }
  
  /**
   * 获取警告列表
   */
  getWarnings(severity?: 'low' | 'medium' | 'high'): UnifiedPerformanceWarning[] {
    if (severity) {
      return this.warnings.filter(w => w.severity === severity);
    }
    return [...this.warnings];
  }
  
  /**
   * 执行瓶颈分析
   */
  analyzeBottlenecks(): BottleneckAnalysis {
    const recentData = new Map<UnifiedMetricType, UnifiedMetricDataPoint[]>();
    
    // 获取最近的数据
    for (const [type, data] of this.metrics) {
      const recent = data.slice(-30); // 最近30个数据点
      if (recent.length > 0) {
        recentData.set(type, recent);
      }
    }
    
    return this.performBottleneckAnalysis(recentData);
  }
  
  /**
   * 生成综合性能报告
   */
  generateComprehensiveReport(): {
    timestamp: string;
    summary: {
      totalMetrics: number;
      activeSources: DataSourceType[];
      overallHealth: 'good' | 'warning' | 'critical';
    };
    metrics: Record<UnifiedMetricType, UnifiedMetricStats>;
    warnings: UnifiedPerformanceWarning[];
    bottlenecks: BottleneckAnalysis;
    correlations: Array<{
      metric1: UnifiedMetricType;
      metric2: UnifiedMetricType;
      correlation: number;
      description: string;
    }>;
    recommendations: string[];
  } {
    const activeSources = [...new Set(
      Array.from(this.metrics.values())
        .flat()
        .map(d => d.source)
    )];
    
    const criticalWarnings = this.warnings.filter(w => w.severity === 'high');
    const mediumWarnings = this.warnings.filter(w => w.severity === 'medium');
    
    let overallHealth: 'good' | 'warning' | 'critical' = 'good';
    if (criticalWarnings.length > 0) {
      overallHealth = 'critical';
    } else if (mediumWarnings.length > 3) {
      overallHealth = 'warning';
    }
    
    const bottlenecks = this.analyzeBottlenecks();
    const correlations = this.config.enableCrossSourcceCorrelation ? 
      this.correlationAnalyzer.detectCrossSourceCorrelations(this.metrics) : [];
    
    return {
      timestamp: new Date().toISOString(),
      summary: {
        totalMetrics: this.metrics.size,
        activeSources,
        overallHealth
      },
      metrics: Object.fromEntries(this.stats) as Record<UnifiedMetricType, UnifiedMetricStats>,
      warnings: this.warnings,
      bottlenecks,
      correlations,
      recommendations: this.generateRecommendations(bottlenecks, correlations)
    };
  }
  
  /**
   * 清理历史数据
   */
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
  
  /**
   * 清理警告
   */
  clearWarnings(): void {
    this.warnings = [];
  }
  
  /**
   * 销毁监控器
   */
  dispose(): void {
    this.stop();
    
    // 销毁所有适配器
    for (const adapter of this.adapters.values()) {
      adapter.dispose();
    }
    
    this.adapters.clear();
    this.metrics.clear();
    this.stats.clear();
    this.warnings = [];
    this.removeAllListeners();
  }
  
  /**
   * 初始化指标存储
   */
  private initializeMetrics(): void {
    for (const metricType of Object.values(UnifiedMetricType)) {
      this.metrics.set(metricType as UnifiedMetricType, []);
      this.stats.set(metricType as UnifiedMetricType, this.createEmptyStats([]));
    }
  }
  
  /**
   * 采集指标数据
   */
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
    
    // 清理过期数据
    this.cleanupOldData();
  }
  
  /**
   * 添加数据点
   */
  private addDataPoint(type: UnifiedMetricType, dataPoint: UnifiedMetricDataPoint): void {
    const dataPoints = this.metrics.get(type) || [];
    dataPoints.push(dataPoint);
    
    // 更新统计
    this.updateStats(type, dataPoint);
    
    // 发射事件
    this.emit('metric-updated', {
      type,
      value: dataPoint.value,
      timestamp: dataPoint.timestamp,
      source: dataPoint.source
    });
    
    // 检查警告
    if (this.config.enableWarnings) {
      this.checkThresholds(type, dataPoint);
    }
  }
  
  /**
   * 更新统计信息
   */
  private updateStats(type: UnifiedMetricType, dataPoint: UnifiedMetricDataPoint): void {
    const dataPoints = this.metrics.get(type) || [];
    const stat = this.stats.get(type);
    
    if (stat) {
      stat.current = dataPoint.value;
      stat.min = Math.min(stat.min, dataPoint.value);
      stat.max = Math.max(stat.max, dataPoint.value);
      stat.samples++;
      
      // 计算移动平均
      const recentPoints = dataPoints.slice(-10);
      stat.avg = recentPoints.reduce((sum, p) => sum + p.value, 0) / recentPoints.length;
      
      // 计算趋势
      if (dataPoints.length >= 5) {
        const recent = dataPoints.slice(-5).map(p => p.value);
        const trend = this.calculateTrend(recent);
        stat.trend = trend;
      }
      
      // 更新数据源
      const sources = [...new Set(dataPoints.map(p => p.source))];
      stat.sources = sources;
    }
  }
  
  /**
   * 计算趋势
   */
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
  
  /**
   * 检查阈值警告
   */
  private checkThresholds(type: UnifiedMetricType, dataPoint: UnifiedMetricDataPoint): void {
    const threshold = this.config.thresholds[type as keyof typeof this.config.thresholds];
    if (!threshold) return;
    
    let warning: UnifiedPerformanceWarning | null = null;
    
    if ('min' in threshold && dataPoint.value < threshold.min) {
      warning = {
        type,
        message: `${type} 低于阈值: ${dataPoint.value} < ${threshold.min}`,
        severity: dataPoint.value < threshold.min * 0.5 ? 'high' : 'medium',
        timestamp: dataPoint.timestamp,
        value: dataPoint.value,
        threshold: threshold.min,
        source: dataPoint.source,
        suggestions: this.getSuggestions(type, 'low')
      };
    } else if ('max' in threshold && dataPoint.value > threshold.max) {
      warning = {
        type,
        message: `${type} 超过阈值: ${dataPoint.value} > ${threshold.max}`,
        severity: dataPoint.value > threshold.max * 1.5 ? 'high' : 'medium',
        timestamp: dataPoint.timestamp,
        value: dataPoint.value,
        threshold: threshold.max,
        source: dataPoint.source,
        suggestions: this.getSuggestions(type, 'high')
      };
    }
    
    if (warning) {
      this.addWarning(warning);
    }
  }
  
  /**
   * 添加警告
   */
  private addWarning(warning: UnifiedPerformanceWarning): void {
    // 避免重复警告
    const recentWarning = this.warnings.find(
      w => w.type === warning.type && 
           w.source === warning.source &&
           warning.timestamp - w.timestamp < 5000
    );
    
    if (!recentWarning) {
      this.warnings.push(warning);
      
      // 限制警告数量
      if (this.warnings.length > 100) {
        this.warnings = this.warnings.slice(-100);
      }
      
      this.emit('warning-triggered', warning);
    }
  }
  
  /**
   * 执行性能分析
   */
  private performAnalysis(): void {
    // 瓶颈检测
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
    
    // 跨源关联分析
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
  
  /**
   * 执行瓶颈分析
   */
  private performBottleneckAnalysis(
    recentData: Map<UnifiedMetricType, UnifiedMetricDataPoint[]>
  ): BottleneckAnalysis {
    const avgMetrics = this.calculateAverageMetrics(recentData);
    
    // CPU瓶颈检测
    if (avgMetrics.frameTime > 16.67 && avgMetrics.updateTime > avgMetrics.renderTime) {
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
          '启用对象池减少GC压力'
        ],
        severity: avgMetrics.frameTime > 33.33 ? 'high' : 'medium'
      };
    }
    
    // GPU瓶颈检测
    if (avgMetrics.drawCalls > 500 || avgMetrics.triangles > 100000) {
      return {
        type: 'gpu',
        confidence: 0.7,
        description: 'GPU渲染负载过高，存在GPU瓶颈',
        affectedMetrics: [UnifiedMetricType.DRAW_CALLS, UnifiedMetricType.TRIANGLES, UnifiedMetricType.RENDER_TIME],
        affectedSources: this.getAffectedSources(recentData, [UnifiedMetricType.DRAW_CALLS, UnifiedMetricType.RENDER_TIME]),
        suggestions: [
          '减少绘制调用数量',
          '优化着色器性能',
          '使用LOD系统',
          '启用视锥剔除',
          '合并批处理'
        ],
        severity: avgMetrics.drawCalls > 1000 ? 'high' : 'medium'
      };
    }
    
    // 内存瓶颈检测
    if (avgMetrics.memoryUsage > (this.config.thresholds[UnifiedMetricType.MEMORY_USAGE]?.max || 0) * 0.8) {
      return {
        type: 'memory',
        confidence: 0.6,
        description: '内存使用率过高，可能影响性能',
        affectedMetrics: [UnifiedMetricType.MEMORY_USAGE, UnifiedMetricType.TEXTURE_MEMORY],
        affectedSources: this.getAffectedSources(recentData, [UnifiedMetricType.MEMORY_USAGE]),
        suggestions: [
          '优化资源管理策略',
          '启用纹理压缩',
          '清理未使用资源',
          '实现资源懒加载'
        ],
        severity: 'medium'
      };
    }
    
    return {
      type: 'none',
      confidence: 0,
      description: '未检测到明显瓶颈',
      affectedMetrics: [],
      affectedSources: [],
      suggestions: [],
      severity: 'low'
    };
  }
  
  /**
   * 计算平均指标
   */
  private calculateAverageMetrics(
    recentData: Map<UnifiedMetricType, UnifiedMetricDataPoint[]>
  ): Record<string, number> {
    const avgMetrics: Record<string, number> = {};
    
    for (const [type, data] of recentData) {
      if (data.length > 0) {
        avgMetrics[type] = data.reduce((sum, point) => sum + point.value, 0) / data.length;
      }
    }
    
    return avgMetrics;
  }
  
  /**
   * 获取受影响的数据源
   */
  private getAffectedSources(
    recentData: Map<UnifiedMetricType, UnifiedMetricDataPoint[]>,
    metrics: UnifiedMetricType[]
  ): DataSourceType[] {
    const sources = new Set<DataSourceType>();
    
    for (const metric of metrics) {
      const data = recentData.get(metric) || [];
      for (const point of data) {
        sources.add(point.source);
      }
    }
    
    return [...sources];
  }
  
  /**
   * 清理过期数据
   */
  private cleanupOldData(): void {
    const cutoffTime = performance.now() - this.config.historyRetention * 1000;
    
    for (const [type, dataPoints] of this.metrics) {
      const filteredData = dataPoints.filter(point => point.timestamp >= cutoffTime);
      this.metrics.set(type, filteredData);
    }
    
    // 清理过期警告
    this.warnings = this.warnings.filter(warning => 
      Date.now() - warning.timestamp < this.config.historyRetention * 1000
    );
  }
  
  /**
   * 创建空统计对象
   */
  private createEmptyStats(sources: DataSourceType[]): UnifiedMetricStats {
    return {
      min: Infinity,
      max: -Infinity,
      avg: 0,
      current: 0,
      samples: 0,
      trend: 'stable',
      sources
    };
  }
  
  /**
   * 获取性能建议
   */
  private getSuggestions(metricType: UnifiedMetricType, issue: 'low' | 'high'): string[] {
    const suggestions: Record<UnifiedMetricType, Record<'low' | 'high', string[]>> = {
      [UnifiedMetricType.FPS]: {
        low: ['减少渲染复杂度', '优化着色器', '启用批处理', '使用LOD系统'],
        high: ['检查是否有不必要的优化', '可以提高渲染质量']
      },
      [UnifiedMetricType.FRAME_TIME]: {
        low: ['检查计时器精度'],
        high: ['优化渲染管线', '减少CPU处理时间', '启用并行处理']
      },
      [UnifiedMetricType.RENDER_TIME]: {
        low: ['渲染效率良好'],
        high: ['优化渲染管线', '减少渲染复杂度', '启用并行渲染']
      },
      [UnifiedMetricType.UPDATE_TIME]: {
        low: ['更新效率良好'],
        high: ['优化更新逻辑', '减少不必要计算', '启用增量更新']
      },
      [UnifiedMetricType.DRAW_CALLS]: {
        low: ['可以进一步合并批处理'],
        high: ['合并绘制调用', '使用实例化渲染', '启用批处理系统']
      },
      [UnifiedMetricType.VERTICES]: {
        low: ['顶点数量合理'],
        high: ['减少顶点数量', '使用LOD系统', '启用几何优化']
      },
      [UnifiedMetricType.TRIANGLES]: {
        low: ['三角形数量合理'],
        high: ['减少三角形数量', '使用LOD系统', '启用网格优化']
      },
      [UnifiedMetricType.BATCH_COUNT]: {
        low: ['批处理效率良好'],
        high: ['合并更多批次', '优化批处理算法', '启用智能分组']
      },
      [UnifiedMetricType.GPU_MEMORY]: {
        low: ['GPU内存使用合理'],
        high: ['清理GPU资源', '启用纹理压缩', '优化缓冲区管理']
      },
      [UnifiedMetricType.SHADER_COMPILE_TIME]: {
        low: ['着色器编译效率良好'],
        high: ['缓存编译结果', '优化着色器代码', '启用预编译']
      },
      [UnifiedMetricType.MEMORY_USAGE]: {
        low: ['检查是否有内存泄漏'],
        high: ['清理未使用资源', '启用纹理压缩', '优化资源管理']
      },
      [UnifiedMetricType.TEXTURE_MEMORY]: {
        low: ['纹理内存使用合理'],
        high: ['压缩纹理', '清理未使用纹理', '优化纹理格式']
      },
      [UnifiedMetricType.BUFFER_MEMORY]: {
        low: ['缓冲区内存使用合理'],
        high: ['清理缓冲区', '优化缓冲区大小', '启用内存池']
      },
      [UnifiedMetricType.CPU_USAGE]: {
        low: ['CPU使用率良好'],
        high: ['优化CPU密集型操作', '启用多线程', '减少同步等待']
      },
      [UnifiedMetricType.CACHE_HIT_RATE]: {
        low: ['优化缓存策略', '增加缓存容量', '改善缓存键算法'],
        high: ['缓存效率良好']
      },
      [UnifiedMetricType.CULLED_OBJECTS]: {
        low: ['裁剪效率有待提高'],
        high: ['裁剪系统工作良好']
      },
      [UnifiedMetricType.LOD_SWITCHES]: {
        low: ['LOD切换较少'],
        high: ['优化LOD阈值', '减少频繁切换', '改善LOD算法']
      },
      [UnifiedMetricType.PLUGIN_LOAD_TIME]: {
        low: ['插件加载效率良好'],
        high: ['优化插件加载', '启用懒加载', '压缩插件资源']
      },
      [UnifiedMetricType.PLUGIN_ACTIVATE_TIME]: {
        low: ['插件激活效率良好'],
        high: ['优化插件初始化', '减少依赖加载', '启用异步激活']
      },
      [UnifiedMetricType.PLUGIN_API_CALLS]: {
        low: ['插件API调用较少'],
        high: ['优化API调用频率', '启用批量操作', '缓存API结果']
      },
      [UnifiedMetricType.PLUGIN_ERRORS]: {
        low: ['插件运行稳定'],
        high: ['修复插件错误', '加强错误处理', '验证插件兼容性']
      },
      [UnifiedMetricType.INPUT_LATENCY]: {
        low: ['输入响应良好'],
        high: ['优化事件处理', '减少输入队列积压', '启用预测输入']
      },
      [UnifiedMetricType.EVENT_PROCESSING_TIME]: {
        low: ['事件处理效率良好'],
        high: ['优化事件处理逻辑', '启用事件池', '减少事件传播']
      },
      [UnifiedMetricType.GESTURE_RECOGNITION_TIME]: {
        low: ['手势识别效率良好'],
        high: ['优化识别算法', '减少计算复杂度', '启用硬件加速']
      }
    };
    
    return suggestions[metricType]?.[issue] || ['暂无建议'];
  }
  
  /**
   * 生成综合建议
   */
  private generateRecommendations(
    bottlenecks: BottleneckAnalysis,
    correlations: Array<{
      metric1: UnifiedMetricType;
      metric2: UnifiedMetricType;
      correlation: number;
      description: string;
    }>
  ): string[] {
    const recommendations: string[] = [];
    
    // 基于瓶颈分析的建议
    if (bottlenecks.type !== 'none') {
      recommendations.push(...bottlenecks.suggestions);
    }
    
    // 基于关联分析的建议
    for (const correlation of correlations) {
      if (Math.abs(correlation.correlation) > 0.8) {
        recommendations.push(
          `注意 ${correlation.metric1} 和 ${correlation.metric2} 之间的强关联性，优化时需要同时考虑`
        );
      }
    }
    
    // 通用建议
    const highWarnings = this.warnings.filter(w => w.severity === 'high');
    if (highWarnings.length > 0) {
      recommendations.push('优先处理高严重性警告');
    }
    
    return [...new Set(recommendations)]; // 去重
  }
}