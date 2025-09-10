/**
 * 增强批处理系统
 * 实现智能分组、纹理图集和实例化渲染
 */

import { IRenderable } from '../core/IRenderEngine';
import { EventEmitter } from '../events/EventBus';
import { TextureAtlas, AtlasEntry, globalTextureAtlas } from '../textures/TextureAtlas';
import { InstancedRenderer, InstanceData } from './InstancedRenderer';

// 批处理键生成参数
export interface BatchKeyParams {
  textureId?: string;
  blendMode?: string;
  shaderId?: string;
  zIndex?: number;
  renderableType?: string;
}

// 渲染批次
export interface RenderBatch {
  key: string;
  items: IRenderable[];
  canInstance: boolean;
  priority: number;
  estimatedCost: number;
}

// 为了向后兼容，重新导出AtlasEntry作为TextureAtlasEntry
export type TextureAtlasEntry = AtlasEntry;

// 批处理统计
export interface BatchStats {
  totalBatches: number;
  instancedBatches: number;
  totalItems: number;
  drawCalls: number;
  textureBinds: number;
  averageBatchSize: number;
}

// 批处理事件
export interface BatchEvents {
  batchCreated: RenderBatch;
  batchOptimized: { before: number; after: number };
  textureAtlasUpdated: { textureIds: string[]; atlasId: string };
  instancedRenderExecuted: { batchKey: string; instanceCount: number };
}

// 旧的TextureAtlas类已移除，现在使用新的高级实现

/**
 * 增强批处理器
 */
export class EnhancedBatcher extends EventEmitter<BatchEvents> {
  private batches = new Map<string, RenderBatch>();
  private textureAtlas = new TextureAtlas();
  private instancedRenderer: InstancedRenderer | null = null;
  private instancedRenderables = new Map<string, {
    template: IRenderable;
    instances: InstanceData[];
  }>();
  
  // 配置参数
  private readonly MAX_BATCH_SIZE = 10000;
  private readonly INSTANCING_THRESHOLD = 50;
  private readonly MAX_TEXTURE_BINDS_PER_FRAME = 16;
  
  // 性能统计
  private stats: BatchStats = {
    totalBatches: 0,
    instancedBatches: 0,
    totalItems: 0,
    drawCalls: 0,
    textureBinds: 0,
    averageBatchSize: 0
  };

  /**
   * 初始化WebGL上下文（用于实例化渲染）
   */
  initializeWebGL(gl: WebGLRenderingContext | WebGL2RenderingContext): void {
    this.instancedRenderer = new InstancedRenderer(gl);
    
    // 监听实例化渲染器事件
    this.instancedRenderer.on('batchRendered', (event) => {
      this.emit('instancedRenderExecuted', {
        batchKey: event.batchId,
        instanceCount: event.instanceCount
      });
    });
  }

  /**
   * 添加渲染对象到批处理
   */
  addToBatch(renderable: IRenderable): void {
    const key = this.generateBatchKey(renderable);
    const batch = this.getBatch(key);
    
    batch.items.push(renderable);
    
    // 检查是否可以实例化渲染
    if (batch.items.length >= this.INSTANCING_THRESHOLD && this.canInstanceRender(batch.items)) {
      batch.canInstance = true;
      this.prepareInstancedRendering(batch);
    }
    
    // 检查批次大小限制
    if (batch.items.length >= this.MAX_BATCH_SIZE) {
      this.splitBatch(batch);
    }
    
    this.updateBatchPriority(batch);
  }

  /**
   * 生成批处理键
   */
  private generateBatchKey(renderable: IRenderable): string {
    const params = this.extractBatchKeyParams(renderable);
    
    // 尝试使用纹理图集
    if (params.textureId) {
      const atlasInfo = this.textureAtlas.getTextureInfo(params.textureId);
      if (atlasInfo) {
        params.textureId = atlasInfo.atlasTextureId;
      }
    }
    
    return `${params.textureId || 'none'}-${params.blendMode || 'normal'}-${params.shaderId || 'default'}-${params.zIndex || 0}`;
  }

  /**
   * 提取批处理键参数
   */
  private extractBatchKeyParams(renderable: IRenderable): BatchKeyParams {
    // 这里需要根据IRenderable的实际接口来实现
    return {
      textureId: (renderable as any).textureId,
      blendMode: (renderable as any).blendMode || 'normal',
      shaderId: (renderable as any).shaderId || 'default',
      zIndex: (renderable as any).zIndex || 0,
      renderableType: renderable.constructor.name
    };
  }

  /**
   * 获取或创建批次
   */
  private getBatch(key: string): RenderBatch {
    if (!this.batches.has(key)) {
      const batch: RenderBatch = {
        key,
        items: [],
        canInstance: false,
        priority: 0,
        estimatedCost: 0
      };
      
      this.batches.set(key, batch);
      this.emit('batchCreated', batch);
    }
    
    return this.batches.get(key)!;
  }

  /**
   * 检查是否可以实例化渲染
   */
  private canInstanceRender(items: IRenderable[]): boolean {
    if (items.length < 2) return false;
    
    const template = items[0];
    return items.slice(1).every(item => this.isSameRenderableType(template, item));
  }

  /**
   * 检查是否为相同类型的渲染对象
   */
  private isSameRenderableType(a: IRenderable, b: IRenderable): boolean {
    return a.constructor === b.constructor && 
           this.hasSameRenderProperties(a, b);
  }

  /**
   * 检查是否有相同的渲染属性
   */
  private hasSameRenderProperties(a: IRenderable, b: IRenderable): boolean {
    const aProps = this.extractBatchKeyParams(a);
    const bProps = this.extractBatchKeyParams(b);
    
    return aProps.textureId === bProps.textureId &&
           aProps.blendMode === bProps.blendMode &&
           aProps.shaderId === bProps.shaderId;
  }

  /**
   * 准备实例化渲染
   */
  private prepareInstancedRendering(batch: RenderBatch): void {
    const key = batch.key;
    const template = batch.items[0];
    const instances: InstanceData[] = batch.items.map(item => this.extractInstanceData(item));
    
    this.instancedRenderables.set(key, { template, instances });
    
    // 如果有WebGL实例化渲染器，更新批次数据
    if (this.instancedRenderer) {
      this.instancedRenderer.updateBatch(key, template, instances);
    }
  }

  /**
   * 提取实例数据
   */
  private extractInstanceData(renderable: IRenderable): InstanceData {
    const bounds = renderable.getBounds();
    
    return {
      transform: new Float32Array([
        bounds.x, bounds.y, 
        bounds.width, bounds.height,
        0, 0, 0, 1 // rotation and scale
      ]),
      tint: new Float32Array([1, 1, 1, 1]), // RGBA
      textureOffset: new Float32Array([0, 0, 1, 1]), // UV coordinates
      customData: new Float32Array([0, 0, 0, 0]) // 自定义数据
    };
  }

  /**
   * 分割过大的批次
   */
  private splitBatch(batch: RenderBatch): void {
    if (batch.items.length <= this.MAX_BATCH_SIZE) return;
    
    const halfSize = Math.floor(batch.items.length / 2);
    const firstHalf = batch.items.slice(0, halfSize);
    const secondHalf = batch.items.slice(halfSize);
    
    // 更新原批次
    batch.items = firstHalf;
    
    // 创建新批次
    const newKey = `${batch.key}_split_${Date.now()}`;
    const newBatch: RenderBatch = {
      key: newKey,
      items: secondHalf,
      canInstance: batch.canInstance,
      priority: batch.priority,
      estimatedCost: 0
    };
    
    this.batches.set(newKey, newBatch);
    
    // 重新计算批次成本
    this.updateBatchPriority(batch);
    this.updateBatchPriority(newBatch);
  }

  /**
   * 更新批次优先级
   */
  private updateBatchPriority(batch: RenderBatch): void {
    // 优先级计算基于：批次大小、是否可实例化、纹理数量等
    let priority = 0;
    
    // 批次大小加分
    priority += batch.items.length * 0.1;
    
    // 实例化渲染加分
    if (batch.canInstance) {
      priority += 100;
    }
    
    // 相同纹理加分
    const textureIds = new Set(batch.items.map(item => 
      this.extractBatchKeyParams(item).textureId
    ));
    if (textureIds.size === 1) {
      priority += 50;
    }
    
    batch.priority = priority;
    
    // 估算渲染成本
    batch.estimatedCost = this.estimateRenderCost(batch);
  }

  /**
   * 估算渲染成本
   */
  private estimateRenderCost(batch: RenderBatch): number {
    const drawCallCost = 10;
    const instanceCost = 0.1;
    const texturBindCost = 5;
    
    if (batch.canInstance) {
      return drawCallCost + (batch.items.length * instanceCost) + texturBindCost;
    } else {
      return (batch.items.length * drawCallCost) + texturBindCost;
    }
  }

  /**
   * 渲染所有批次
   */
  renderBatches(context: any, shader?: WebGLProgram): void {
    this.resetStats();
    
    // 按优先级排序批次
    const sortedBatches = Array.from(this.batches.values())
      .sort((a, b) => b.priority - a.priority);
    
    let textureBindCount = 0;
    
    for (const batch of sortedBatches) {
      if (textureBindCount >= this.MAX_TEXTURE_BINDS_PER_FRAME) {
        break; // 达到纹理绑定上限
      }
      
      if (batch.canInstance) {
        this.renderInstancedBatch(batch, context, shader);
        this.stats.instancedBatches++;
      } else {
        this.renderNormalBatch(batch, context);
      }
      
      textureBindCount++;
      this.stats.drawCalls++;
    }
    
    this.stats.totalBatches = sortedBatches.length;
    this.stats.textureBinds = textureBindCount;
    this.stats.averageBatchSize = this.stats.totalItems / this.stats.totalBatches;
  }

  /**
   * 渲染实例化批次
   */
  private renderInstancedBatch(batch: RenderBatch, context: any, shader?: WebGLProgram): void {
    const instancedData = this.instancedRenderables.get(batch.key);
    if (!instancedData) return;
    
    // 使用高级WebGL实例化渲染器
    if (this.instancedRenderer && this.instancedRenderer.isInstancedRenderingSupported() && shader) {
      this.instancedRenderer.renderBatch(batch.key, shader);
    } else {
      // 回退到传统实例化渲染
      this.performInstancedRender(instancedData.template, instancedData.instances, context);
      
      this.emit('instancedRenderExecuted', {
        batchKey: batch.key,
        instanceCount: instancedData.instances.length
      });
    }
    
    this.stats.totalItems += batch.items.length;
  }

  /**
   * 渲染普通批次
   */
  private renderNormalBatch(batch: RenderBatch, context: any): void {
    for (const item of batch.items) {
      if (item.render) {
        item.render(context);
      }
    }
    
    this.stats.totalItems += batch.items.length;
  }

  /**
   * 执行实例化渲染
   */
  private performInstancedRender(template: IRenderable, instances: InstanceData[], context: any): void {
    // 这里是WebGL实例化渲染的具体实现
    // 简化版本：循环渲染每个实例
    instances.forEach(instance => {
      // 设置实例变换
      this.setInstanceTransform(context, instance.transform);
      
      // 渲染模板
      if (template.render) {
        template.render(context);
      }
    });
  }

  /**
   * 设置实例变换
   */
  private setInstanceTransform(context: any, transform: Float32Array): void {
    // WebGL变换矩阵设置
    // 这里是简化实现
  }

  /**
   * 优化批次
   */
  optimizeBatches(): void {
    const beforeCount = this.batches.size;
    
    // 合并相似批次
    this.mergeSimilarBatches();
    
    // 重新分组优化
    this.regroupBatches();
    
    const afterCount = this.batches.size;
    
    this.emit('batchOptimized', { before: beforeCount, after: afterCount });
  }

  /**
   * 合并相似批次
   */
  private mergeSimilarBatches(): void {
    const batches = Array.from(this.batches.values());
    
    for (let i = 0; i < batches.length; i++) {
      for (let j = i + 1; j < batches.length; j++) {
        if (this.canMergeBatches(batches[i], batches[j])) {
          this.mergeBatches(batches[i], batches[j]);
          batches.splice(j, 1);
          j--;
        }
      }
    }
  }

  /**
   * 检查是否可以合并批次
   */
  private canMergeBatches(batch1: RenderBatch, batch2: RenderBatch): boolean {
    const key1Parts = batch1.key.split('-');
    const key2Parts = batch2.key.split('-');
    
    // 检查纹理、混合模式、着色器是否相同
    return key1Parts[0] === key2Parts[0] && // texture
           key1Parts[1] === key2Parts[1] && // blend mode
           key1Parts[2] === key2Parts[2] && // shader
           Math.abs(parseInt(key1Parts[3]) - parseInt(key2Parts[3])) <= 1; // z-index差异不超过1
  }

  /**
   * 合并两个批次
   */
  private mergeBatches(target: RenderBatch, source: RenderBatch): void {
    target.items.push(...source.items);
    this.batches.delete(source.key);
    
    // 重新计算属性
    target.canInstance = this.canInstanceRender(target.items);
    this.updateBatchPriority(target);
    
    if (target.canInstance) {
      this.prepareInstancedRendering(target);
    }
  }

  /**
   * 重新分组批次
   */
  private regroupBatches(): void {
    const allItems: IRenderable[] = [];
    
    // 收集所有渲染对象
    for (const batch of this.batches.values()) {
      allItems.push(...batch.items);
    }
    
    // 清空现有批次
    this.batches.clear();
    this.instancedRenderables.clear();
    
    // 重新添加到批处理
    for (const item of allItems) {
      this.addToBatch(item);
    }
  }

  /**
   * 重置统计信息
   */
  private resetStats(): void {
    this.stats = {
      totalBatches: 0,
      instancedBatches: 0,
      totalItems: 0,
      drawCalls: 0,
      textureBinds: 0,
      averageBatchSize: 0
    };
  }

  /**
   * 清空所有批次
   */
  clear(): void {
    this.batches.clear();
    this.instancedRenderables.clear();
  }

  /**
   * 获取批处理统计
   */
  getStats(): BatchStats & { instancedRenderer?: any } {
    const stats = { ...this.stats };
    
    if (this.instancedRenderer) {
      return {
        ...stats,
        instancedRenderer: this.instancedRenderer.getStats()
      };
    }
    
    return stats;
  }

  /**
   * 获取所有批次
   */
  getBatches(): RenderBatch[] {
    return Array.from(this.batches.values());
  }

  /**
   * 获取纹理图集
   */
  getTextureAtlas(): TextureAtlas {
    return this.textureAtlas;
  }

  /**
   * 添加纹理到图集
   */
  addTextureToAtlas(textureId: string, width: number, height: number): TextureAtlasEntry | null {
    const entry = this.textureAtlas.addTexture(textureId, width, height);
    
    if (entry) {
      this.emit('textureAtlasUpdated', {
        textureIds: [textureId],
        atlasId: entry.atlasTextureId
      });
    }
    
    return entry;
  }

  /**
   * 销毁批处理器
   */
  dispose(): void {
    if (this.instancedRenderer) {
      this.instancedRenderer.dispose();
      this.instancedRenderer = null;
    }
    
    this.clear();
    this.textureAtlas.dispose();
  }
}

// 全局批处理器实例
export const globalBatcher = new EnhancedBatcher();