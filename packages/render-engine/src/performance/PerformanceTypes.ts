/**
 * 性能监控类型定义
 */

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
  metadata?: Record<string, unknown>;
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
    source: DataSourceType;
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
 * 关联分析结果
 */
export interface CorrelationResult {
  metric1: UnifiedMetricType;
  metric2: UnifiedMetricType;
  correlation: number;
  description: string;
}
