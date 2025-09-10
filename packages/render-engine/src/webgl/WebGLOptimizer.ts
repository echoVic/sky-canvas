/**
 * WebGL 优化系统
 * 整合着色器管理和缓冲区优化，提供统一的WebGL性能优化方案
 */

import { IShaderManager, IShaderProgram, IShaderSource } from './ShaderManager';
import { IBufferManager, IBuffer, IVertexArray, BufferType, BufferUsage } from './BufferManager';
import { EventEmitter } from '../events/EventBus';

// WebGL状态跟踪
export interface WebGLState {
  currentProgram: WebGLProgram | null;
  currentArrayBuffer: WebGLBuffer | null;
  currentElementArrayBuffer: WebGLBuffer | null;
  currentVAO: WebGLVertexArrayObjectOES | null;
  currentTexture: WebGLTexture | null;
  currentTextureUnit: number;
  blendEnabled: boolean;
  depthTestEnabled: boolean;
  cullFaceEnabled: boolean;
  viewport: { x: number; y: number; width: number; height: number };
}

// 渲染批次优化数据
export interface OptimizedRenderBatch {
  id: string;
  shader: IShaderProgram;
  vertexArray: IVertexArray;
  textureBindings: Map<number, WebGLTexture>;
  uniforms: Map<string, any>;
  drawCalls: Array<{
    mode: number;
    count: number;
    offset: number;
    instances?: number;
  }>;
  sortKey: string;
}

// WebGL优化配置
export interface WebGLOptimizerConfig {
  enableStateTracking: boolean;
  enableBatchOptimization: boolean;
  enableShaderWarmup: boolean;
  enableBufferPooling: boolean;
  maxTextureBindsPerFrame: number;
  maxDrawCallsPerBatch: number;
  bufferPoolSizes: {
    vertex: number;
    index: number;
  };
}

// 优化统计
export interface OptimizationStats {
  frameCount: number;
  stateChanges: {
    shaderSwitches: number;
    textureBinds: number;
    bufferBinds: number;
    vaoBinds: number;
  };
  drawCalls: {
    total: number;
    batched: number;
    instanced: number;
  };
  memory: {
    buffers: number;
    textures: number;
    shaders: number;
  };
}

// WebGL优化器事件
export interface WebGLOptimizerEvents {
  stateChanged: { type: string; from: any; to: any };
  batchOptimized: { before: number; after: number };
  shaderCompiled: { name: string; compileTime: number };
  bufferAllocated: { id: string; size: number; type: string };
  performanceWarning: { metric: string; value: number; threshold: number };
}

/**
 * 着色器缓存系统
 */
export class ShaderCache {
  private cache = new Map<string, IShaderProgram>();
  private compileQueue = new Set<string>();
  private warmupShaders = new Set<string>();

  /**
   * 获取着色器程序（带缓存）
   */
  getProgram(key: string, source: IShaderSource, shaderManager: IShaderManager): IShaderProgram {
    const cached = this.cache.get(key);
    if (cached && cached.isValid) {
      return cached;
    }

    // 编译新着色器
    const program = shaderManager.createShader(source);
    this.cache.set(key, program);
    
    return program;
  }

  /**
   * 预热着色器（异步编译）
   */
  warmupShader(key: string, source: IShaderSource, shaderManager: IShaderManager): void {
    if (this.compileQueue.has(key)) return;
    
    this.compileQueue.add(key);
    this.warmupShaders.add(key);
    
    // 异步编译
    setTimeout(() => {
      try {
        this.getProgram(key, source, shaderManager);
      } catch (error) {
        console.warn(`Failed to warmup shader ${key}:`, error);
      } finally {
        this.compileQueue.delete(key);
      }
    }, 0);
  }

  /**
   * 清理无效着色器
   */
  cleanup(): void {
    for (const [key, program] of this.cache.entries()) {
      if (!program.isValid) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * 获取缓存统计
   */
  getStats() {
    return {
      cached: this.cache.size,
      compiling: this.compileQueue.size,
      warmedUp: this.warmupShaders.size
    };
  }
}

/**
 * 缓冲区池系统
 */
export class BufferPool {
  private pools = new Map<string, IBuffer[]>();
  private inUse = new Map<string, Set<IBuffer>>();

  constructor(private bufferManager: IBufferManager) {}

  /**
   * 获取缓冲区（从池中复用或创建新的）
   */
  acquireBuffer(type: BufferType, size: number, usage: BufferUsage = BufferUsage.DYNAMIC): IBuffer {
    const poolKey = `${type}_${usage}`;
    const pool = this.pools.get(poolKey) || [];
    const inUseSet = this.inUse.get(poolKey) || new Set();

    // 查找合适大小的缓冲区
    const suitableBuffer = pool.find(buffer => 
      buffer.size >= size && 
      buffer.isValid && 
      !inUseSet.has(buffer)
    );

    if (suitableBuffer) {
      inUseSet.add(suitableBuffer);
      this.inUse.set(poolKey, inUseSet);
      return suitableBuffer;
    }

    // 创建新缓冲区
    const newBuffer = this.bufferManager.createBuffer(type, usage);
    pool.push(newBuffer);
    this.pools.set(poolKey, pool);
    
    inUseSet.add(newBuffer);
    this.inUse.set(poolKey, inUseSet);

    return newBuffer;
  }

  /**
   * 释放缓冲区回池中
   */
  releaseBuffer(buffer: IBuffer): void {
    for (const [poolKey, inUseSet] of this.inUse.entries()) {
      if (inUseSet.has(buffer)) {
        inUseSet.delete(buffer);
        break;
      }
    }
  }

  /**
   * 清理池中无效缓冲区
   */
  cleanup(): void {
    for (const [poolKey, pool] of this.pools.entries()) {
      const validBuffers = pool.filter(buffer => buffer.isValid);
      this.pools.set(poolKey, validBuffers);
    }
  }

  /**
   * 获取池统计
   */
  getStats() {
    let totalBuffers = 0;
    let inUseBuffers = 0;
    let totalMemory = 0;

    for (const pool of this.pools.values()) {
      totalBuffers += pool.length;
      for (const buffer of pool) {
        totalMemory += buffer.size;
      }
    }

    for (const inUseSet of this.inUse.values()) {
      inUseBuffers += inUseSet.size;
    }

    return {
      totalBuffers,
      inUseBuffers,
      availableBuffers: totalBuffers - inUseBuffers,
      totalMemory
    };
  }
}

/**
 * WebGL状态管理器
 */
export class WebGLStateManager {
  private currentState: WebGLState = {
    currentProgram: null,
    currentArrayBuffer: null,
    currentElementArrayBuffer: null,
    currentVAO: null,
    currentTexture: null,
    currentTextureUnit: 0,
    blendEnabled: false,
    depthTestEnabled: true,
    cullFaceEnabled: true,
    viewport: { x: 0, y: 0, width: 0, height: 0 }
  };

  private stateChangeCount = 0;
  
  constructor(private gl: WebGLRenderingContext) {}

  /**
   * 使用着色器程序（状态跟踪）
   */
  useProgram(program: WebGLProgram | null): void {
    if (this.currentState.currentProgram !== program) {
      this.gl.useProgram(program);
      this.currentState.currentProgram = program;
      this.stateChangeCount++;
    }
  }

  /**
   * 绑定缓冲区（状态跟踪）
   */
  bindBuffer(target: number, buffer: WebGLBuffer | null): void {
    let currentBuffer: WebGLBuffer | null;
    
    if (target === this.gl.ARRAY_BUFFER) {
      currentBuffer = this.currentState.currentArrayBuffer;
      this.currentState.currentArrayBuffer = buffer;
    } else if (target === this.gl.ELEMENT_ARRAY_BUFFER) {
      currentBuffer = this.currentState.currentElementArrayBuffer;
      this.currentState.currentElementArrayBuffer = buffer;
    } else {
      // 其他类型直接绑定
      this.gl.bindBuffer(target, buffer);
      this.stateChangeCount++;
      return;
    }

    if (currentBuffer !== buffer) {
      this.gl.bindBuffer(target, buffer);
      this.stateChangeCount++;
    }
  }

  /**
   * 绑定纹理（状态跟踪）
   */
  bindTexture(target: number, texture: WebGLTexture | null): void {
    if (this.currentState.currentTexture !== texture) {
      this.gl.bindTexture(target, texture);
      this.currentState.currentTexture = texture;
      this.stateChangeCount++;
    }
  }

  /**
   * 设置视口（状态跟踪）
   */
  setViewport(x: number, y: number, width: number, height: number): void {
    const current = this.currentState.viewport;
    if (current.x !== x || current.y !== y || current.width !== width || current.height !== height) {
      this.gl.viewport(x, y, width, height);
      this.currentState.viewport = { x, y, width, height };
      this.stateChangeCount++;
    }
  }

  /**
   * 启用/禁用混合（状态跟踪）
   */
  setBlendEnabled(enabled: boolean): void {
    if (this.currentState.blendEnabled !== enabled) {
      if (enabled) {
        this.gl.enable(this.gl.BLEND);
      } else {
        this.gl.disable(this.gl.BLEND);
      }
      this.currentState.blendEnabled = enabled;
      this.stateChangeCount++;
    }
  }

  /**
   * 启用/禁用深度测试（状态跟踪）
   */
  setDepthTestEnabled(enabled: boolean): void {
    if (this.currentState.depthTestEnabled !== enabled) {
      if (enabled) {
        this.gl.enable(this.gl.DEPTH_TEST);
      } else {
        this.gl.disable(this.gl.DEPTH_TEST);
      }
      this.currentState.depthTestEnabled = enabled;
      this.stateChangeCount++;
    }
  }

  /**
   * 获取当前状态
   */
  getCurrentState(): Readonly<WebGLState> {
    return this.currentState;
  }

  /**
   * 重置状态更改计数
   */
  resetStateChangeCount(): number {
    const count = this.stateChangeCount;
    this.stateChangeCount = 0;
    return count;
  }
}

/**
 * 渲染批次优化器
 */
export class RenderBatchOptimizer {
  private batches: OptimizedRenderBatch[] = [];

  /**
   * 添加渲染批次
   */
  addBatch(batch: OptimizedRenderBatch): void {
    this.batches.push(batch);
  }

  /**
   * 优化批次顺序
   */
  optimizeBatches(): OptimizedRenderBatch[] {
    // 按优化键排序：着色器 -> 纹理 -> VAO
    return this.batches.sort((a, b) => {
      if (a.sortKey < b.sortKey) return -1;
      if (a.sortKey > b.sortKey) return 1;
      return 0;
    });
  }

  /**
   * 合并兼容的批次
   */
  mergeBatches(): OptimizedRenderBatch[] {
    const optimizedBatches = this.optimizeBatches();
    const mergedBatches: OptimizedRenderBatch[] = [];

    for (const batch of optimizedBatches) {
      const lastBatch = mergedBatches[mergedBatches.length - 1];
      
      if (lastBatch && this.canMergeBatches(lastBatch, batch)) {
        // 合并绘制调用
        lastBatch.drawCalls.push(...batch.drawCalls);
      } else {
        mergedBatches.push(batch);
      }
    }

    return mergedBatches;
  }

  /**
   * 检查是否可以合并批次
   */
  private canMergeBatches(a: OptimizedRenderBatch, b: OptimizedRenderBatch): boolean {
    return a.shader === b.shader &&
           a.vertexArray === b.vertexArray &&
           this.textureBindingsEqual(a.textureBindings, b.textureBindings) &&
           this.uniformsEqual(a.uniforms, b.uniforms);
  }

  /**
   * 比较纹理绑定
   */
  private textureBindingsEqual(a: Map<number, WebGLTexture>, b: Map<number, WebGLTexture>): boolean {
    if (a.size !== b.size) return false;
    
    for (const [unit, texture] of a.entries()) {
      if (b.get(unit) !== texture) return false;
    }
    
    return true;
  }

  /**
   * 比较uniform值
   */
  private uniformsEqual(a: Map<string, any>, b: Map<string, any>): boolean {
    if (a.size !== b.size) return false;
    
    for (const [name, value] of a.entries()) {
      if (b.get(name) !== value) return false;
    }
    
    return true;
  }

  /**
   * 清空批次
   */
  clear(): void {
    this.batches = [];
  }

  /**
   * 获取批次统计
   */
  getStats() {
    return {
      totalBatches: this.batches.length,
      totalDrawCalls: this.batches.reduce((sum, batch) => sum + batch.drawCalls.length, 0)
    };
  }
}

/**
 * WebGL优化器主类
 */
export class WebGLOptimizer extends EventEmitter<WebGLOptimizerEvents> {
  private gl: WebGLRenderingContext;
  private config: WebGLOptimizerConfig;
  private shaderCache: ShaderCache;
  private bufferPool: BufferPool;
  private stateManager: WebGLStateManager;
  private batchOptimizer: RenderBatchOptimizer;
  private stats: OptimizationStats;

  // 性能监控
  private frameStartTime = 0;
  private lastFrameStats = { drawCalls: 0, stateChanges: 0 };

  constructor(
    gl: WebGLRenderingContext,
    shaderManager: IShaderManager,
    bufferManager: IBufferManager,
    config?: Partial<WebGLOptimizerConfig>
  ) {
    super();

    this.gl = gl;
    this.config = {
      enableStateTracking: true,
      enableBatchOptimization: true,
      enableShaderWarmup: true,
      enableBufferPooling: true,
      maxTextureBindsPerFrame: 16,
      maxDrawCallsPerBatch: 100,
      bufferPoolSizes: {
        vertex: 50,
        index: 50
      },
      ...config
    };

    this.shaderCache = new ShaderCache();
    this.bufferPool = new BufferPool(bufferManager);
    this.stateManager = new WebGLStateManager(gl);
    this.batchOptimizer = new RenderBatchOptimizer();

    this.stats = {
      frameCount: 0,
      stateChanges: {
        shaderSwitches: 0,
        textureBinds: 0,
        bufferBinds: 0,
        vaoBinds: 0
      },
      drawCalls: {
        total: 0,
        batched: 0,
        instanced: 0
      },
      memory: {
        buffers: 0,
        textures: 0,
        shaders: 0
      }
    };
  }

  /**
   * 开始帧渲染
   */
  beginFrame(): void {
    this.frameStartTime = performance.now();
    this.stats.frameCount++;
    
    // 重置帧统计
    this.lastFrameStats = { drawCalls: 0, stateChanges: 0 };
    this.batchOptimizer.clear();
  }

  /**
   * 获取优化的着色器程序
   */
  getOptimizedShader(source: IShaderSource, shaderManager: IShaderManager): IShaderProgram {
    const key = `${source.name}_${source.version || '1.0'}`;
    const startTime = performance.now();
    
    const program = this.shaderCache.getProgram(key, source, shaderManager);
    
    const compileTime = performance.now() - startTime;
    this.emit('shaderCompiled', { name: source.name, compileTime });
    
    return program;
  }

  /**
   * 获取优化的缓冲区
   */
  getOptimizedBuffer(type: BufferType, size: number, usage?: BufferUsage): IBuffer {
    if (!this.config.enableBufferPooling) {
      // 直接创建，不使用池
      return this.bufferPool['bufferManager'].createBuffer(type, usage);
    }
    
    const buffer = this.bufferPool.acquireBuffer(type, size, usage);
    this.emit('bufferAllocated', { 
      id: buffer.id, 
      size, 
      type: type === BufferType.VERTEX ? 'vertex' : 'index' 
    });
    
    return buffer;
  }

  /**
   * 释放缓冲区
   */
  releaseBuffer(buffer: IBuffer): void {
    if (this.config.enableBufferPooling) {
      this.bufferPool.releaseBuffer(buffer);
    }
  }

  /**
   * 优化状态切换
   */
  optimizedUseProgram(program: WebGLProgram | null): void {
    if (this.config.enableStateTracking) {
      this.stateManager.useProgram(program);
    } else {
      this.gl.useProgram(program);
    }
    
    this.stats.stateChanges.shaderSwitches++;
    this.lastFrameStats.stateChanges++;
  }

  /**
   * 优化缓冲区绑定
   */
  optimizedBindBuffer(target: number, buffer: WebGLBuffer | null): void {
    if (this.config.enableStateTracking) {
      this.stateManager.bindBuffer(target, buffer);
    } else {
      this.gl.bindBuffer(target, buffer);
    }
    
    this.stats.stateChanges.bufferBinds++;
    this.lastFrameStats.stateChanges++;
  }

  /**
   * 优化纹理绑定
   */
  optimizedBindTexture(target: number, texture: WebGLTexture | null): void {
    if (this.config.enableStateTracking) {
      this.stateManager.bindTexture(target, texture);
    } else {
      this.gl.bindTexture(target, texture);
    }
    
    this.stats.stateChanges.textureBinds++;
    this.lastFrameStats.stateChanges++;
  }

  /**
   * 添加渲染批次
   */
  addRenderBatch(batch: OptimizedRenderBatch): void {
    if (this.config.enableBatchOptimization) {
      this.batchOptimizer.addBatch(batch);
    }
  }

  /**
   * 执行优化的渲染
   */
  executeOptimizedRender(): void {
    if (!this.config.enableBatchOptimization) {
      return;
    }

    const optimizedBatches = this.batchOptimizer.mergeBatches();
    const beforeBatches = this.batchOptimizer.getStats().totalBatches;
    
    for (const batch of optimizedBatches) {
      this.renderBatch(batch);
    }

    this.emit('batchOptimized', { 
      before: beforeBatches, 
      after: optimizedBatches.length 
    });

    this.stats.drawCalls.batched += optimizedBatches.length;
  }

  /**
   * 渲染单个批次
   */
  private renderBatch(batch: OptimizedRenderBatch): void {
    // 设置着色器
    this.optimizedUseProgram(batch.shader.program);
    
    // 设置纹理
    for (const [unit, texture] of batch.textureBindings.entries()) {
      this.gl.activeTexture(this.gl.TEXTURE0 + unit);
      this.optimizedBindTexture(this.gl.TEXTURE_2D, texture);
    }
    
    // 设置uniform
    for (const [name, value] of batch.uniforms.entries()) {
      batch.shader.setUniform(name, value);
    }
    
    // 绑定VAO并绘制
    // 这里需要VAO扩展支持
    for (const drawCall of batch.drawCalls) {
      if (drawCall.instances && drawCall.instances > 1) {
        // 实例化渲染
        // gl.drawElementsInstanced 或 gl.drawArraysInstanced
        this.stats.drawCalls.instanced++;
      } else {
        // 普通渲染
        batch.vertexArray.draw(this.gl, drawCall.mode, drawCall.count, drawCall.offset);
        this.stats.drawCalls.total++;
        this.lastFrameStats.drawCalls++;
      }
    }
  }

  /**
   * 结束帧渲染
   */
  endFrame(): void {
    const frameTime = performance.now() - this.frameStartTime;
    
    // 更新统计信息
    this.updateMemoryStats();
    
    // 检查性能阈值
    this.checkPerformanceThresholds(frameTime);
    
    // 定期清理
    if (this.stats.frameCount % 100 === 0) {
      this.performMaintenance();
    }
  }

  /**
   * 更新内存统计
   */
  private updateMemoryStats(): void {
    const bufferStats = this.bufferPool.getStats();
    const shaderStats = this.shaderCache.getStats();
    
    this.stats.memory.buffers = bufferStats.totalMemory;
    this.stats.memory.shaders = shaderStats.cached;
  }

  /**
   * 检查性能阈值
   */
  private checkPerformanceThresholds(frameTime: number): void {
    const frameTimeThreshold = 16.67; // 60fps
    const stateChangeThreshold = 100;
    const drawCallThreshold = 1000;
    
    if (frameTime > frameTimeThreshold) {
      this.emit('performanceWarning', {
        metric: 'frameTime',
        value: frameTime,
        threshold: frameTimeThreshold
      });
    }
    
    if (this.lastFrameStats.stateChanges > stateChangeThreshold) {
      this.emit('performanceWarning', {
        metric: 'stateChanges',
        value: this.lastFrameStats.stateChanges,
        threshold: stateChangeThreshold
      });
    }
    
    if (this.lastFrameStats.drawCalls > drawCallThreshold) {
      this.emit('performanceWarning', {
        metric: 'drawCalls',
        value: this.lastFrameStats.drawCalls,
        threshold: drawCallThreshold
      });
    }
  }

  /**
   * 执行维护任务
   */
  private performMaintenance(): void {
    this.shaderCache.cleanup();
    this.bufferPool.cleanup();
  }

  /**
   * 预热着色器
   */
  warmupShaders(sources: Array<{ key: string; source: IShaderSource }>, shaderManager: IShaderManager): void {
    if (!this.config.enableShaderWarmup) return;
    
    for (const { key, source } of sources) {
      this.shaderCache.warmupShader(key, source, shaderManager);
    }
  }

  /**
   * 获取优化统计
   */
  getStats(): OptimizationStats {
    return { ...this.stats };
  }

  /**
   * 获取详细统计信息
   */
  getDetailedStats() {
    return {
      optimization: this.getStats(),
      shaderCache: this.shaderCache.getStats(),
      bufferPool: this.bufferPool.getStats(),
      batchOptimizer: this.batchOptimizer.getStats()
    };
  }

  /**
   * 更新配置
   */
  updateConfig(config: Partial<WebGLOptimizerConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * 销毁优化器
   */
  dispose(): void {
    this.performMaintenance();
    // 清理所有资源
  }
}

// 全局WebGL优化器实例
let globalWebGLOptimizer: WebGLOptimizer | null = null;

export function createGlobalWebGLOptimizer(
  gl: WebGLRenderingContext,
  shaderManager: IShaderManager,
  bufferManager: IBufferManager,
  config?: Partial<WebGLOptimizerConfig>
): WebGLOptimizer {
  globalWebGLOptimizer = new WebGLOptimizer(gl, shaderManager, bufferManager, config);
  return globalWebGLOptimizer;
}

export function getGlobalWebGLOptimizer(): WebGLOptimizer | null {
  return globalWebGLOptimizer;
}