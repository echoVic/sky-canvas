/**
 * 性能监控类型定义
 */

/**
 * 性能指标类型
 */
export enum MetricType {
  /** 帧率 */
  FPS = 'fps',
  /** 帧时间 */
  FRAME_TIME = 'frameTime',
  /** 绘制调用次数 */
  DRAW_CALLS = 'drawCalls',
  /** 顶点数量 */
  VERTICES = 'vertices',
  /** 三角形数量 */
  TRIANGLES = 'triangles',
  /** 内存使用 */
  MEMORY_USAGE = 'memoryUsage',
  /** GPU内存使用 */
  GPU_MEMORY = 'gpuMemory',
  /** 纹理内存 */
  TEXTURE_MEMORY = 'textureMemory',
  /** 缓冲区内存 */
  BUFFER_MEMORY = 'bufferMemory',
  /** 着色器编译时间 */
  SHADER_COMPILE_TIME = 'shaderCompileTime',
  /** 批处理效率 */
  BATCH_EFFICIENCY = 'batchEfficiency',
  /** CPU使用率 */
  CPU_USAGE = 'cpuUsage',
  /** 渲染队列长度 */
  RENDER_QUEUE_LENGTH = 'renderQueueLength',
}

/**
 * 性能数据点
 */
export interface MetricDataPoint {
  timestamp: number
  value: number
}

/**
 * 性能统计
 */
export interface MetricStats {
  min: number
  max: number
  avg: number
  current: number
  samples: number
}

/**
 * 警告阈值配置
 */
export interface PerformanceThresholds {
  fps: { min: number; max: number }
  frameTime: { max: number }
  drawCalls: { max: number }
  memoryUsage: { max: number }
  gpuMemory: { max: number }
}

/**
 * 性能监控配置
 */
export interface PerformanceConfig {
  /** 采样间隔（毫秒） */
  sampleInterval: number
  /** 历史数据保留时间（秒） */
  historyRetention: number
  /** 启用自动分析 */
  enableAutoAnalysis: boolean
  /** 启用性能警告 */
  enableWarnings: boolean
  /** 警告阈值 */
  thresholds: PerformanceThresholds
  /** 启用GPU查询 */
  enableGPUQueries: boolean
  /** 启用内存分析器 */
  enableMemoryProfiler: boolean
}

/**
 * 性能事件
 */
export interface PerformanceEvents {
  'metric-updated': { type: MetricType; value: number; timestamp: number }
  'performance-warning': { type: string; message: string; severity: 'low' | 'medium' | 'high' }
  'fps-drop': { from: number; to: number; duration: number }
  'memory-leak': { type: string; trend: number }
  'gpu-bottleneck': { metric: string; value: number }
}

/**
 * 渲染统计
 */
export interface RenderStats {
  drawCalls: number
  vertices: number
  triangles: number
  batchCount: number
  stateChanges: number
}

/**
 * 默认性能配置
 */
export const DEFAULT_PERFORMANCE_CONFIG: PerformanceConfig = {
  sampleInterval: 1000,
  historyRetention: 300,
  enableAutoAnalysis: true,
  enableWarnings: true,
  thresholds: {
    fps: { min: 30, max: 120 },
    frameTime: { max: 33.33 },
    drawCalls: { max: 1000 },
    memoryUsage: { max: 512 * 1024 * 1024 },
    gpuMemory: { max: 256 * 1024 * 1024 },
  },
  enableGPUQueries: false,
  enableMemoryProfiler: true,
}
