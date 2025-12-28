/**
 * WebGL 优化器辅助类
 */

import { IShaderManager, IShaderProgram, IShaderSource } from './ShaderManager';
import { IBufferManager, IBuffer, BufferType, BufferUsage } from './BufferManager';
import { WebGLState, OptimizedRenderBatch, createInitialWebGLState } from './WebGLOptimizerTypes';

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
  getStats(): { cached: number; compiling: number; warmedUp: number } {
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
    for (const inUseSet of this.inUse.values()) {
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
   * 获取内部缓冲区管理器
   */
  getBufferManager(): IBufferManager {
    return this.bufferManager;
  }

  /**
   * 获取池统计
   */
  getStats(): { totalBuffers: number; inUseBuffers: number; availableBuffers: number; totalMemory: number } {
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
  private currentState: WebGLState;
  private stateChangeCount = 0;

  constructor(private gl: WebGLRenderingContext) {
    this.currentState = createInitialWebGLState();
  }

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
        lastBatch.drawCalls.push(...batch.drawCalls);
      } else {
        mergedBatches.push(batch);
      }
    }

    return mergedBatches;
  }

  private canMergeBatches(a: OptimizedRenderBatch, b: OptimizedRenderBatch): boolean {
    return a.shader === b.shader &&
           a.vertexArray === b.vertexArray &&
           this.textureBindingsEqual(a.textureBindings, b.textureBindings) &&
           this.uniformsEqual(a.uniforms, b.uniforms);
  }

  private textureBindingsEqual(a: Map<number, WebGLTexture>, b: Map<number, WebGLTexture>): boolean {
    if (a.size !== b.size) return false;

    for (const [unit, texture] of a.entries()) {
      if (b.get(unit) !== texture) return false;
    }

    return true;
  }

  private uniformsEqual(a: Map<string, unknown>, b: Map<string, unknown>): boolean {
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
  getStats(): { totalBatches: number; totalDrawCalls: number } {
    return {
      totalBatches: this.batches.length,
      totalDrawCalls: this.batches.reduce((sum, batch) => sum + batch.drawCalls.length, 0)
    };
  }
}
