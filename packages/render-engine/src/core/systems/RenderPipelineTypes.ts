/**
 * 渲染管线类型定义
 */

/**
 * 渲染阶段
 */
export enum RenderPhase {
  SETUP = 'setup',
  CULL = 'cull',
  SORT = 'sort',
  BATCH = 'batch',
  RENDER = 'render',
  POST_PROCESS = 'post_process',
  PRESENT = 'present',
}

/**
 * 渲染任务
 */
export interface RenderTask {
  id: string
  phase: RenderPhase
  priority: number
  dependencies: string[]
  estimatedTime: number
  actualTime?: number
  status: 'pending' | 'running' | 'completed' | 'failed'
  execute: () => Promise<void> | void
  onComplete?: () => void
  onError?: (error: Error) => void
}

/**
 * 渲染统计
 */
export interface RenderStats {
  frameTime: number
  renderTime: number
  cpuTime: number
  gpuTime: number
  drawCalls: number
  triangles: number
  batchCount: number
  culledObjects: number
  memoryUsage: number
  cacheHitRate: number
  shaderSwitches: number
  textureBinds: number
}

/**
 * 性能预算
 */
export interface PerformanceBudget {
  targetFPS: number
  maxFrameTime: number
  maxDrawCalls: number
  maxTriangles: number
  maxMemoryUsage: number
  maxGPUMemory: number
}

/**
 * 渲染配置
 */
export interface RenderConfig {
  enableBatching: boolean
  enableCulling: boolean
  enableLOD: boolean
  enableOcclusion: boolean
  enableInstancing: boolean
  enableAsyncLoading: boolean
  enablePredictiveCache: boolean
  enableDynamicOptimization: boolean
  maxConcurrentTasks: number
  adaptiveQuality: boolean
}

/**
 * 质量建议
 */
export interface QualityRecommendations {
  lodBias: number
  shadowQuality: number
  textureQuality: number
  effectsQuality: number
}

/**
 * 任务调度器统计
 */
export interface TaskSchedulerStats {
  totalTasks: number
  completedTasks: number
  runningTasks: number
  failedTasks: number
  averageExecutionTime: number
}

/**
 * 默认渲染配置
 */
export const DEFAULT_RENDER_CONFIG: RenderConfig = {
  enableBatching: true,
  enableCulling: true,
  enableLOD: true,
  enableOcclusion: false,
  enableInstancing: true,
  enableAsyncLoading: true,
  enablePredictiveCache: true,
  enableDynamicOptimization: true,
  maxConcurrentTasks: 4,
  adaptiveQuality: true,
}

/**
 * 默认性能预算
 */
export const DEFAULT_PERFORMANCE_BUDGET: PerformanceBudget = {
  targetFPS: 60,
  maxFrameTime: 16.67, // 60 FPS
  maxDrawCalls: 1000,
  maxTriangles: 100000,
  maxMemoryUsage: 512 * 1024 * 1024, // 512MB
  maxGPUMemory: 256 * 1024 * 1024, // 256MB
}

/**
 * 创建初始渲染统计
 */
export function createInitialRenderStats(): RenderStats {
  return {
    frameTime: 0,
    renderTime: 0,
    cpuTime: 0,
    gpuTime: 0,
    drawCalls: 0,
    triangles: 0,
    batchCount: 0,
    culledObjects: 0,
    memoryUsage: 0,
    cacheHitRate: 0,
    shaderSwitches: 0,
    textureBinds: 0,
  }
}
