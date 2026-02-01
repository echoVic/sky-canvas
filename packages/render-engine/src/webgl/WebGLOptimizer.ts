/**
 * WebGL 优化系统
 * 整合着色器管理和缓冲区优化，提供统一的WebGL性能优化方案
 */

import { EventEmitter } from '../events/EventBus'
import { BufferType, type BufferUsage, type IBuffer, type IBufferManager } from './BufferManager'
import type { IShaderManager, IShaderProgram, IShaderSource } from './ShaderManager'
import {
  BufferPool,
  RenderBatchOptimizer,
  ShaderCache,
  WebGLStateManager,
} from './WebGLOptimizerHelpers'
import {
  createInitialOptimizationStats,
  DEFAULT_OPTIMIZER_CONFIG,
  type OptimizationStats,
  type OptimizedRenderBatch,
  type WebGLOptimizerConfig,
  type WebGLOptimizerEvents,
} from './WebGLOptimizerTypes'

export {
  BufferPool,
  RenderBatchOptimizer,
  ShaderCache,
  WebGLStateManager,
} from './WebGLOptimizerHelpers'
// 重新导出类型和类以保持向后兼容
export type {
  OptimizationStats,
  OptimizedRenderBatch,
  WebGLOptimizerConfig,
  WebGLOptimizerEvents,
  WebGLState,
} from './WebGLOptimizerTypes'
export {
  createInitialOptimizationStats,
  createInitialWebGLState,
  DEFAULT_OPTIMIZER_CONFIG,
} from './WebGLOptimizerTypes'

/**
 * WebGL优化器主类
 */
export class WebGLOptimizer extends EventEmitter<WebGLOptimizerEvents> {
  private gl: WebGLRenderingContext
  private config: WebGLOptimizerConfig
  private shaderCache: ShaderCache
  private bufferPool: BufferPool
  private stateManager: WebGLStateManager
  private batchOptimizer: RenderBatchOptimizer
  private stats: OptimizationStats

  private frameStartTime = 0
  private lastFrameStats = { drawCalls: 0, stateChanges: 0 }

  constructor(
    gl: WebGLRenderingContext,
    shaderManager: IShaderManager,
    bufferManager: IBufferManager,
    config?: Partial<WebGLOptimizerConfig>
  ) {
    super()

    this.gl = gl
    this.config = { ...DEFAULT_OPTIMIZER_CONFIG, ...config }

    this.shaderCache = new ShaderCache()
    this.bufferPool = new BufferPool(bufferManager)
    this.stateManager = new WebGLStateManager(gl)
    this.batchOptimizer = new RenderBatchOptimizer()
    this.stats = createInitialOptimizationStats()
  }

  /**
   * 开始帧渲染
   */
  beginFrame(): void {
    this.frameStartTime = performance.now()
    this.stats.frameCount++

    this.lastFrameStats = { drawCalls: 0, stateChanges: 0 }
    this.batchOptimizer.clear()
  }

  /**
   * 获取优化的着色器程序
   */
  getOptimizedShader(source: IShaderSource, shaderManager: IShaderManager): IShaderProgram {
    const key = `${source.name}_${source.version || '1.0'}`
    const startTime = performance.now()

    const program = this.shaderCache.getProgram(key, source, shaderManager)

    const compileTime = performance.now() - startTime
    this.emit('shaderCompiled', { name: source.name, compileTime })

    return program
  }

  /**
   * 获取优化的缓冲区
   */
  getOptimizedBuffer(type: BufferType, size: number, usage?: BufferUsage): IBuffer {
    if (!this.config.enableBufferPooling) {
      return this.bufferPool.getBufferManager().createBuffer(type, usage)
    }

    const buffer = this.bufferPool.acquireBuffer(type, size, usage)
    this.emit('bufferAllocated', {
      id: buffer.id,
      size,
      type: type === BufferType.VERTEX ? 'vertex' : 'index',
    })

    return buffer
  }

  /**
   * 释放缓冲区
   */
  releaseBuffer(buffer: IBuffer): void {
    if (this.config.enableBufferPooling) {
      this.bufferPool.releaseBuffer(buffer)
    }
  }

  /**
   * 优化状态切换
   */
  optimizedUseProgram(program: WebGLProgram | null): void {
    if (this.config.enableStateTracking) {
      this.stateManager.useProgram(program)
    } else {
      this.gl.useProgram(program)
    }

    this.stats.stateChanges.shaderSwitches++
    this.lastFrameStats.stateChanges++
  }

  /**
   * 优化缓冲区绑定
   */
  optimizedBindBuffer(target: number, buffer: WebGLBuffer | null): void {
    if (this.config.enableStateTracking) {
      this.stateManager.bindBuffer(target, buffer)
    } else {
      this.gl.bindBuffer(target, buffer)
    }

    this.stats.stateChanges.bufferBinds++
    this.lastFrameStats.stateChanges++
  }

  /**
   * 优化纹理绑定
   */
  optimizedBindTexture(target: number, texture: WebGLTexture | null): void {
    if (this.config.enableStateTracking) {
      this.stateManager.bindTexture(target, texture)
    } else {
      this.gl.bindTexture(target, texture)
    }

    this.stats.stateChanges.textureBinds++
    this.lastFrameStats.stateChanges++
  }

  /**
   * 添加渲染批次
   */
  addRenderBatch(batch: OptimizedRenderBatch): void {
    if (this.config.enableBatchOptimization) {
      this.batchOptimizer.addBatch(batch)
    }
  }

  /**
   * 执行优化的渲染
   */
  executeOptimizedRender(): void {
    if (!this.config.enableBatchOptimization) {
      return
    }

    const optimizedBatches = this.batchOptimizer.mergeBatches()
    const beforeBatches = this.batchOptimizer.getStats().totalBatches

    for (const batch of optimizedBatches) {
      this.renderBatch(batch)
    }

    this.emit('batchOptimized', {
      before: beforeBatches,
      after: optimizedBatches.length,
    })

    this.stats.drawCalls.batched += optimizedBatches.length
  }

  private renderBatch(batch: OptimizedRenderBatch): void {
    this.optimizedUseProgram(batch.shader.program)

    for (const [unit, texture] of batch.textureBindings.entries()) {
      this.gl.activeTexture(this.gl.TEXTURE0 + unit)
      this.optimizedBindTexture(this.gl.TEXTURE_2D, texture)
    }

    for (const [name, value] of batch.uniforms.entries()) {
      batch.shader.setUniform(name, value)
    }

    for (const drawCall of batch.drawCalls) {
      if (drawCall.instances && drawCall.instances > 1) {
        this.stats.drawCalls.instanced++
      } else {
        batch.vertexArray.draw(this.gl, drawCall.mode, drawCall.count, drawCall.offset)
        this.stats.drawCalls.total++
        this.lastFrameStats.drawCalls++
      }
    }
  }

  /**
   * 结束帧渲染
   */
  endFrame(): void {
    const frameTime = performance.now() - this.frameStartTime

    this.updateMemoryStats()
    this.checkPerformanceThresholds(frameTime)

    if (this.stats.frameCount % 100 === 0) {
      this.performMaintenance()
    }
  }

  private updateMemoryStats(): void {
    const bufferStats = this.bufferPool.getStats()
    const shaderStats = this.shaderCache.getStats()

    this.stats.memory.buffers = bufferStats.totalMemory
    this.stats.memory.shaders = shaderStats.cached
  }

  private checkPerformanceThresholds(frameTime: number): void {
    const frameTimeThreshold = 16.67
    const stateChangeThreshold = 100
    const drawCallThreshold = 1000

    if (frameTime > frameTimeThreshold) {
      this.emit('performanceWarning', {
        metric: 'frameTime',
        value: frameTime,
        threshold: frameTimeThreshold,
      })
    }

    if (this.lastFrameStats.stateChanges > stateChangeThreshold) {
      this.emit('performanceWarning', {
        metric: 'stateChanges',
        value: this.lastFrameStats.stateChanges,
        threshold: stateChangeThreshold,
      })
    }

    if (this.lastFrameStats.drawCalls > drawCallThreshold) {
      this.emit('performanceWarning', {
        metric: 'drawCalls',
        value: this.lastFrameStats.drawCalls,
        threshold: drawCallThreshold,
      })
    }
  }

  private performMaintenance(): void {
    this.shaderCache.cleanup()
    this.bufferPool.cleanup()
  }

  /**
   * 预热着色器
   */
  warmupShaders(
    sources: Array<{ key: string; source: IShaderSource }>,
    shaderManager: IShaderManager
  ): void {
    if (!this.config.enableShaderWarmup) return

    for (const { key, source } of sources) {
      this.shaderCache.warmupShader(key, source, shaderManager)
    }
  }

  /**
   * 获取优化统计
   */
  getStats(): OptimizationStats {
    return { ...this.stats }
  }

  /**
   * 获取详细统计信息
   */
  getDetailedStats(): {
    optimization: OptimizationStats
    shaderCache: { cached: number; compiling: number; warmedUp: number }
    bufferPool: {
      totalBuffers: number
      inUseBuffers: number
      availableBuffers: number
      totalMemory: number
    }
    batchOptimizer: { totalBatches: number; totalDrawCalls: number }
  } {
    return {
      optimization: this.getStats(),
      shaderCache: this.shaderCache.getStats(),
      bufferPool: this.bufferPool.getStats(),
      batchOptimizer: this.batchOptimizer.getStats(),
    }
  }

  /**
   * 更新配置
   */
  updateConfig(config: Partial<WebGLOptimizerConfig>): void {
    this.config = { ...this.config, ...config }
  }

  /**
   * 销毁优化器
   */
  dispose(): void {
    this.performMaintenance()
  }
}

// 全局WebGL优化器实例
let globalWebGLOptimizer: WebGLOptimizer | null = null

export function createGlobalWebGLOptimizer(
  gl: WebGLRenderingContext,
  shaderManager: IShaderManager,
  bufferManager: IBufferManager,
  config?: Partial<WebGLOptimizerConfig>
): WebGLOptimizer {
  globalWebGLOptimizer = new WebGLOptimizer(gl, shaderManager, bufferManager, config)
  return globalWebGLOptimizer
}

export function getGlobalWebGLOptimizer(): WebGLOptimizer | null {
  return globalWebGLOptimizer
}
