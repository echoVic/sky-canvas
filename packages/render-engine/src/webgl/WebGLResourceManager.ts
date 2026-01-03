/**
 * WebGL 资源管理器
 * 统一管理WebGL资源的生命周期，包括纹理、帧缓冲、渲染缓冲等
 */

import { EventEmitter } from '../events/EventBus';
import { createLogger } from '../utils/Logger';

const logger = createLogger('WebGLResourceManager');
import { TextureManager } from './TextureManager';
import { FramebufferManager } from './FramebufferManager';
import { ResourceRefCounter } from './ResourceRefCounter';
import {
  TextureConfig,
  FramebufferConfig,
  ResourceRef,
  MemoryBudget,
  GCConfig,
  ResourceManagerEvents,
  MemoryUsage,
  DEFAULT_MEMORY_BUDGET,
  DEFAULT_GC_CONFIG
} from './WebGLResourceTypes';

// 重新导出类型和类
export { ResourceType, ResourceState } from './WebGLResourceTypes';
export type {
  TextureConfig,
  FramebufferConfig,
  ResourceRef,
  MemoryBudget,
  GCConfig,
  ResourceManagerEvents,
  MemoryUsage,
  ResourceMetadata
} from './WebGLResourceTypes';
export { TextureManager } from './TextureManager';
export { FramebufferManager } from './FramebufferManager';
export { ResourceRefCounter } from './ResourceRefCounter';

/**
 * WebGL资源管理器
 */
export class WebGLResourceManager extends EventEmitter<ResourceManagerEvents> {
  private textureManager: TextureManager;
  private framebufferManager: FramebufferManager;
  private refCounter: ResourceRefCounter;
  private memoryBudget: MemoryBudget;
  private gcConfig: GCConfig;
  private gcTimer: number | null = null;
  private memoryUsage: MemoryUsage = { textures: 0, buffers: 0, other: 0, total: 0 };

  constructor(
    private gl: WebGLRenderingContext,
    budget?: Partial<MemoryBudget>,
    gcConfig?: Partial<GCConfig>
  ) {
    super();

    this.textureManager = new TextureManager(gl);
    this.framebufferManager = new FramebufferManager(gl, this.textureManager);
    this.refCounter = new ResourceRefCounter();

    this.memoryBudget = { ...DEFAULT_MEMORY_BUDGET, ...budget };
    this.gcConfig = { ...DEFAULT_GC_CONFIG, ...gcConfig };

    if (this.gcConfig.enabled) {
      this.startGC();
    }
  }

  /**
   * 创建纹理
   */
  createTexture(
    id: string,
    config: TextureConfig,
    data?: ArrayBufferView | ImageData | HTMLImageElement
  ): ResourceRef<WebGLTexture> {
    this.checkMemoryPressure('textures');
    const ref = this.textureManager.createTexture(id, config, data);
    this.updateMemoryUsage();
    this.emit('resourceCreated', ref.metadata);
    return ref;
  }

  /**
   * 创建帧缓冲
   */
  createFramebuffer(id: string, config: FramebufferConfig): ResourceRef<WebGLFramebuffer> {
    this.checkMemoryPressure('other');
    const ref = this.framebufferManager.createFramebuffer(id, config);
    this.updateMemoryUsage();
    this.emit('resourceCreated', ref.metadata);
    return ref;
  }

  /**
   * 获取纹理
   */
  getTexture(id: string): ResourceRef<WebGLTexture> | null {
    return this.textureManager.getTexture(id);
  }

  /**
   * 获取帧缓冲
   */
  getFramebuffer(id: string): ResourceRef<WebGLFramebuffer> | null {
    return this.framebufferManager.getFramebuffer(id);
  }

  /**
   * 增加资源引用
   */
  addResourceRef(id: string): number {
    return this.refCounter.addRef(id);
  }

  /**
   * 释放资源引用
   */
  releaseResourceRef(id: string): number {
    return this.refCounter.releaseRef(id);
  }

  /**
   * 删除资源
   */
  deleteResource(id: string): boolean {
    if (!this.refCounter.hasNoReferences(id)) {
      logger.warn(`Cannot delete resource '${id}': still has references`);
      return false;
    }

    let deleted = false;
    let metadata = null;

    const texture = this.textureManager.getTexture(id);
    if (texture) {
      metadata = texture.metadata;
      deleted = this.textureManager.deleteTexture(id);
    } else {
      const framebuffer = this.framebufferManager.getFramebuffer(id);
      if (framebuffer) {
        metadata = framebuffer.metadata;
        deleted = this.framebufferManager.deleteFramebuffer(id);
      }
    }

    if (deleted && metadata) {
      this.updateMemoryUsage();
      this.emit('resourceDisposed', metadata);
    }

    return deleted;
  }

  private checkMemoryPressure(type: keyof MemoryBudget): void {
    const usage = this.memoryUsage[type as keyof MemoryUsage] || 0;
    const budget = this.memoryBudget[type];

    if (usage > budget) {
      this.emit('memoryPressure', { used: usage, budget });
      if (this.gcConfig.enabled) {
        this.performGC('memory_pressure');
      }
    }
  }

  private updateMemoryUsage(): void {
    let textureMemory = 0;
    for (const texture of this.textureManager.getAllTextures()) {
      textureMemory += texture.metadata.size;
    }

    this.memoryUsage = {
      textures: textureMemory,
      buffers: 0,
      other: 0,
      total: textureMemory
    };
  }

  private startGC(): void {
    if (this.gcTimer) return;
    this.gcTimer = window.setInterval(() => {
      this.performGC('scheduled');
    }, this.gcConfig.interval);
  }

  private performGC(reason: string): void {
    this.emit('gcStarted', { reason });

    const now = performance.now();
    const candidates: string[] = [];
    let freedMemory = 0;

    for (const texture of this.textureManager.getAllTextures()) {
      const metadata = texture.metadata;
      const age = now - metadata.createTime;
      const unusedTime = now - metadata.lastAccessed;

      if (
        this.refCounter.hasNoReferences(metadata.id) &&
        (age > this.gcConfig.maxAge || unusedTime > this.gcConfig.maxUnusedTime)
      ) {
        candidates.push(metadata.id);
        freedMemory += metadata.size;
      }
    }

    for (const id of candidates) {
      this.deleteResource(id);
    }

    this.emit('gcCompleted', { freedMemory, freedResources: candidates.length });
  }

  /**
   * 手动触发垃圾收集
   */
  forceGC(): void {
    this.performGC('manual');
  }

  /**
   * 获取内存使用情况
   */
  getMemoryUsage(): MemoryUsage {
    return { ...this.memoryUsage };
  }

  /**
   * 获取内存预算
   */
  getMemoryBudget(): MemoryBudget {
    return { ...this.memoryBudget };
  }

  /**
   * 获取资源统计
   */
  getResourceStats(): {
    textures: number;
    framebuffers: number;
    totalMemory: number;
    memoryUtilization: number;
  } {
    return {
      textures: this.textureManager.getAllTextures().length,
      framebuffers: this.framebufferManager.getAllFramebuffers().length,
      totalMemory: this.memoryUsage.total,
      memoryUtilization: this.memoryUsage.total / this.memoryBudget.total
    };
  }

  /**
   * 销毁资源管理器
   */
  dispose(): void {
    if (this.gcTimer) {
      clearInterval(this.gcTimer);
      this.gcTimer = null;
    }

    for (const texture of this.textureManager.getAllTextures()) {
      this.textureManager.deleteTexture(texture.id);
    }

    for (const fb of this.framebufferManager.getAllFramebuffers()) {
      this.framebufferManager.deleteFramebuffer(fb.id);
    }

    this.refCounter.clear();
  }
}
