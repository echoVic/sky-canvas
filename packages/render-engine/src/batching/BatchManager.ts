/**
 * 批处理系统管理器
 * 统一管理和协调不同的批处理策略
 */

import { EnhancedBatcher, BatchStats, RenderBatch, TextureAtlas } from './EnhancedBatcher';
import { AdvancedBatcher } from './AdvancedBatcher';
import { IntelligentBatchGrouper, RenderGroup } from './IntelligentBatchGrouper';
import { IRenderable } from '../core/IRenderEngine';
import { EventEmitter } from '../events/EventBus';

// 批处理策略
export enum BatchStrategy {
  AUTO = 'auto',        // 自动选择
  INTELLIGENT = 'intelligent', // 使用智能分组批处理器
  ENHANCED = 'enhanced', // 使用增强批处理器
  ADVANCED = 'advanced', // 使用高级批处理器
  LEGACY = 'legacy'     // 使用传统方式
}

// 批处理配置
export interface BatchConfig {
  strategy: BatchStrategy;
  maxBatchSize: number;
  instancingThreshold: number;
  maxTextureBinds: number;
  enableTextureAtlas: boolean;
  enableSpatialSorting: boolean;
  enableAutoOptimization: boolean;
  optimizationInterval: number; // ms
}

// 批处理性能指标
export interface PerformanceMetrics {
  frameTime: number;
  batchTime: number;
  renderTime: number;
  drawCalls: number;
  triangles: number;
  textureBinds: number;
  instancedCalls: number;
  memoryUsage: number;
}

// 批处理管理器事件
export interface BatchManagerEvents {
  strategyChanged: BatchStrategy;
  performanceUpdate: PerformanceMetrics;
  optimizationComplete: { before: BatchStats; after: BatchStats };
  warningThreshold: { metric: string; value: number; threshold: number };
}

/**
 * 批处理系统管理器
 */
export class BatchManager extends EventEmitter<BatchManagerEvents> {
  private intelligentGrouper: IntelligentBatchGrouper;
  private enhancedBatcher: EnhancedBatcher;
  private advancedBatcher: AdvancedBatcher;
  private currentStrategy: BatchStrategy;
  private config: BatchConfig;
  private performanceHistory: PerformanceMetrics[] = [];
  private optimizationTimer: number | null = null;
  private frameStartTime = 0;
  private currentRenderGroups: RenderGroup[] = [];

  // 性能阈值
  private readonly PERFORMANCE_THRESHOLDS = {
    frameTime: 16.67, // 60fps
    drawCalls: 100,
    textureBinds: 16,
    memoryUsage: 100 * 1024 * 1024 // 100MB
  };

  constructor(initialConfig?: Partial<BatchConfig>) {
    super();
    
    this.config = {
      strategy: BatchStrategy.AUTO,
      maxBatchSize: 10000,
      instancingThreshold: 50,
      maxTextureBinds: 16,
      enableTextureAtlas: true,
      enableSpatialSorting: true,
      enableAutoOptimization: true,
      optimizationInterval: 5000,
      ...initialConfig
    };

    this.currentStrategy = this.config.strategy;
    this.intelligentGrouper = new IntelligentBatchGrouper();
    this.enhancedBatcher = new EnhancedBatcher();
    this.advancedBatcher = new AdvancedBatcher();
    
    this.setupBatcherEvents();
    this.startAutoOptimization();
  }

  /**
   * 设置批处理器事件监听
   */
  private setupBatcherEvents(): void {
    this.enhancedBatcher.on('batchOptimized', (data) => {
      const beforeStats = data.before as BatchStats;
      const afterStats = data.after as BatchStats;
      this.emit('optimizationComplete', { before: beforeStats, after: afterStats });
    });

    this.intelligentGrouper.on('optimizationComplete', (stats) => {
      // 将智能分组器的统计转换为BatchStats格式
      const batchStats: BatchStats = {
        totalBatches: stats.totalGroups,
        instancedBatches: stats.spatialClusters,
        totalItems: stats.totalObjects,
        drawCalls: stats.totalGroups,
        textureBinds: stats.stateChanges,
        averageBatchSize: stats.totalObjects / Math.max(stats.totalGroups, 1)
      };
      
      this.emit('optimizationComplete', { 
        before: batchStats, 
        after: batchStats 
      });
    });
  }

  /**
   * 添加渲染对象到批处理
   */
  addRenderable(renderable: IRenderable): void {
    const strategy = this.getEffectiveStrategy();
    
    switch (strategy) {
      case BatchStrategy.INTELLIGENT:
        // 智能分组策略暂时收集对象，在renderFrame时统一分组
        break;
      case BatchStrategy.ENHANCED:
        this.enhancedBatcher.addToBatch(renderable);
        break;
      case BatchStrategy.ADVANCED:
        this.advancedBatcher.addInstancedRenderable(renderable);
        break;
      default:
        // 降级到简单渲染
        this.renderDirectly(renderable);
    }
  }

  /**
   * 批量添加渲染对象（用于智能分组）
   */
  addRenderables(renderables: IRenderable[]): void {
    const strategy = this.getEffectiveStrategy();
    
    if (strategy === BatchStrategy.INTELLIGENT) {
      // 使用智能分组器处理所有对象
      this.currentRenderGroups = this.intelligentGrouper.performGrouping(renderables);
    } else {
      // 逐个添加到其他批处理器
      renderables.forEach(renderable => this.addRenderable(renderable));
    }
  }

  /**
   * 获取有效的批处理策略
   */
  private getEffectiveStrategy(): BatchStrategy {
    if (this.currentStrategy === BatchStrategy.AUTO) {
      return this.selectOptimalStrategy();
    }
    return this.currentStrategy;
  }

  /**
   * 选择最优批处理策略
   */
  private selectOptimalStrategy(): BatchStrategy {
    const recentMetrics = this.getRecentPerformanceMetrics();
    
    if (!recentMetrics) {
      return BatchStrategy.INTELLIGENT; // 默认使用智能分组模式
    }

    // 根据性能指标选择策略
    if (recentMetrics.frameTime > 20) {
      // 帧时间过长，使用最优化的智能分组模式
      return BatchStrategy.INTELLIGENT;
    } else if (recentMetrics.drawCalls > 50) {
      // 绘制调用过多，使用智能分组批处理优化
      return BatchStrategy.INTELLIGENT;
    } else if (recentMetrics.memoryUsage > 50 * 1024 * 1024) {
      // 内存使用过高，使用内存优化的高级模式
      return BatchStrategy.ADVANCED;
    }

    return BatchStrategy.INTELLIGENT;
  }

  /**
   * 获取最近的性能指标
   */
  private getRecentPerformanceMetrics(): PerformanceMetrics | null {
    if (this.performanceHistory.length === 0) {
      return null;
    }
    return this.performanceHistory[this.performanceHistory.length - 1];
  }

  /**
   * 开始帧渲染
   */
  beginFrame(): void {
    this.frameStartTime = performance.now();
  }

  /**
   * 渲染所有批次
   */
  renderFrame(context: any): void {
    const batchStartTime = performance.now();
    
    const strategy = this.getEffectiveStrategy();
    
    switch (strategy) {
      case BatchStrategy.INTELLIGENT:
        this.renderIntelligentGroups(context);
        break;
      case BatchStrategy.ENHANCED:
        this.enhancedBatcher.renderBatches(context);
        break;
      case BatchStrategy.ADVANCED:
        this.renderAdvancedBatches(context);
        break;
      case BatchStrategy.LEGACY:
        // 使用传统渲染方式
        break;
      default:
        console.warn(`Unknown batch strategy: ${strategy}`);
    }
    
    const batchEndTime = performance.now();
    
    // 记录性能指标
    this.recordPerformanceMetrics(batchStartTime, batchEndTime);
  }

  /**
   * 使用智能分组渲染
   */
  private renderIntelligentGroups(context: any): void {
    for (const group of this.currentRenderGroups) {
      // 设置渲染状态
      this.applyRenderState(context, group.renderState);
      
      // 渲染组内所有对象
      for (const item of group.items) {
        if (item.visible) {
          item.render(context);
        }
      }
    }
  }

  /**
   * 应用渲染状态
   */
  private applyRenderState(context: any, renderState: any): void {
    // 根据上下文类型应用渲染状态
    if (context && typeof context.globalAlpha !== 'undefined') {
      // Canvas2D context
      if (renderState.opacity !== undefined) {
        context.globalAlpha = renderState.opacity;
      }
      if (renderState.blendMode) {
        context.globalCompositeOperation = renderState.blendMode;
      }
    }
    // 对于WebGL context，这里需要设置相应的状态
    // 具体实现取决于WebGL适配器的接口
  }

  /**
   * 使用高级批处理器渲染
   */
  private renderAdvancedBatches(context: any): void {
    // 简化实现：直接调用高级批处理器
    this.advancedBatcher.setContext(context);
    
    // 这里需要根据AdvancedBatcher的API来实现
    // 暂时使用简化版本
  }

  /**
   * 直接渲染（降级方案）
   */
  private renderDirectly(renderable: IRenderable): void {
    // 直接渲染，不使用批处理
    // 这是性能最差但最稳定的方案
  }

  /**
   * 结束帧渲染
   */
  endFrame(): void {
    const frameEndTime = performance.now();
    const frameTime = frameEndTime - this.frameStartTime;
    
    // 检查性能阈值
    this.checkPerformanceThresholds(frameTime);
  }

  /**
   * 检查性能阈值
   */
  private checkPerformanceThresholds(frameTime: number): void {
    if (frameTime > this.PERFORMANCE_THRESHOLDS.frameTime) {
      this.emit('warningThreshold', {
        metric: 'frameTime',
        value: frameTime,
        threshold: this.PERFORMANCE_THRESHOLDS.frameTime
      });
    }
    
    const strategy = this.getEffectiveStrategy();
    let stats: BatchStats;
    
    if (strategy === BatchStrategy.ENHANCED) {
      stats = this.enhancedBatcher.getStats();
    } else {
      stats = {
        totalBatches: 0,
        instancedBatches: 0,
        totalItems: 0,
        drawCalls: 0,
        textureBinds: 0,
        averageBatchSize: 0
      };
    }
    
    if (stats.drawCalls > this.PERFORMANCE_THRESHOLDS.drawCalls) {
      this.emit('warningThreshold', {
        metric: 'drawCalls',
        value: stats.drawCalls,
        threshold: this.PERFORMANCE_THRESHOLDS.drawCalls
      });
    }
  }

  /**
   * 记录性能指标
   */
  private recordPerformanceMetrics(batchStartTime: number, batchEndTime: number): void {
    const frameTime = performance.now() - this.frameStartTime;
    const batchTime = batchEndTime - batchStartTime;
    const renderTime = frameTime - batchTime;
    
    const strategy = this.getEffectiveStrategy();
    let stats: BatchStats;
    
    if (strategy === BatchStrategy.ENHANCED) {
      stats = this.enhancedBatcher.getStats();
    } else {
      stats = {
        totalBatches: 0,
        instancedBatches: 0,
        totalItems: 0,
        drawCalls: 0,
        textureBinds: 0,
        averageBatchSize: 0
      };
    }
    
    const metrics: PerformanceMetrics = {
      frameTime,
      batchTime,
      renderTime,
      drawCalls: stats.drawCalls,
      triangles: stats.totalItems * 2, // 估算三角形数量
      textureBinds: stats.textureBinds,
      instancedCalls: stats.instancedBatches,
      memoryUsage: this.estimateMemoryUsage()
    };
    
    this.performanceHistory.push(metrics);
    
    // 保持历史记录不超过100条
    if (this.performanceHistory.length > 100) {
      this.performanceHistory.shift();
    }
    
    this.emit('performanceUpdate', metrics);
  }

  /**
   * 估算内存使用量
   */
  private estimateMemoryUsage(): number {
    // 简化的内存使用估算
    const strategy = this.getEffectiveStrategy();
    
    if (strategy === BatchStrategy.ENHANCED) {
      const batches = this.enhancedBatcher.getBatches();
      return batches.reduce((total, batch) => {
        return total + (batch.items.length * 100); // 假设每个item 100字节
      }, 0);
    }
    
    return 0;
  }

  /**
   * 开始自动优化
   */
  private startAutoOptimization(): void {
    if (!this.config.enableAutoOptimization) {
      return;
    }

    this.optimizationTimer = window.setInterval(() => {
      this.performOptimization();
    }, this.config.optimizationInterval);
  }

  /**
   * 执行优化
   */
  private performOptimization(): void {
    const strategy = this.getEffectiveStrategy();
    
    if (strategy === BatchStrategy.ENHANCED) {
      this.enhancedBatcher.optimizeBatches();
    }
    
    // 根据性能历史调整策略
    this.adjustStrategyBasedOnPerformance();
  }

  /**
   * 根据性能调整策略
   */
  private adjustStrategyBasedOnPerformance(): void {
    if (this.currentStrategy !== BatchStrategy.AUTO) {
      return; // 手动设置的策略不自动调整
    }
    
    const recentMetrics = this.getRecentPerformanceAverage(10);
    if (!recentMetrics) return;
    
    let newStrategy: BatchStrategy = this.currentStrategy;
    
    if (recentMetrics.frameTime > 25) {
      // 性能不佳，尝试更激进的优化
      newStrategy = BatchStrategy.INTELLIGENT;
    } else if (recentMetrics.frameTime < 8) {
      // 性能很好，可以使用智能分组或高级模式
      newStrategy = BatchStrategy.INTELLIGENT;
    }
    
    if (newStrategy !== this.currentStrategy) {
      this.setStrategy(newStrategy);
    }
  }

  /**
   * 获取最近性能指标的平均值
   */
  private getRecentPerformanceAverage(count: number): PerformanceMetrics | null {
    if (this.performanceHistory.length === 0) return null;
    
    const recentMetrics = this.performanceHistory.slice(-count);
    const avgMetrics: PerformanceMetrics = {
      frameTime: 0,
      batchTime: 0,
      renderTime: 0,
      drawCalls: 0,
      triangles: 0,
      textureBinds: 0,
      instancedCalls: 0,
      memoryUsage: 0
    };
    
    recentMetrics.forEach(metric => {
      avgMetrics.frameTime += metric.frameTime;
      avgMetrics.batchTime += metric.batchTime;
      avgMetrics.renderTime += metric.renderTime;
      avgMetrics.drawCalls += metric.drawCalls;
      avgMetrics.triangles += metric.triangles;
      avgMetrics.textureBinds += metric.textureBinds;
      avgMetrics.instancedCalls += metric.instancedCalls;
      avgMetrics.memoryUsage += metric.memoryUsage;
    });
    
    const count_actual = recentMetrics.length;
    avgMetrics.frameTime /= count_actual;
    avgMetrics.batchTime /= count_actual;
    avgMetrics.renderTime /= count_actual;
    avgMetrics.drawCalls /= count_actual;
    avgMetrics.triangles /= count_actual;
    avgMetrics.textureBinds /= count_actual;
    avgMetrics.instancedCalls /= count_actual;
    avgMetrics.memoryUsage /= count_actual;
    
    return avgMetrics;
  }

  /**
   * 设置批处理策略
   */
  setStrategy(strategy: BatchStrategy): void {
    if (this.currentStrategy !== strategy) {
      this.currentStrategy = strategy;
      this.emit('strategyChanged', strategy);
    }
  }

  /**
   * 更新配置
   */
  updateConfig(config: Partial<BatchConfig>): void {
    this.config = { ...this.config, ...config };
    
    // 重启自动优化
    if (this.optimizationTimer) {
      clearInterval(this.optimizationTimer);
      this.optimizationTimer = null;
    }
    this.startAutoOptimization();
  }

  /**
   * 获取当前策略
   */
  getCurrentStrategy(): BatchStrategy {
    return this.currentStrategy;
  }

  /**
   * 获取配置
   */
  getConfig(): BatchConfig {
    return { ...this.config };
  }

  /**
   * 获取性能历史
   */
  getPerformanceHistory(): PerformanceMetrics[] {
    return [...this.performanceHistory];
  }

  /**
   * 获取批处理统计
   */
  getStats(): BatchStats {
    const strategy = this.getEffectiveStrategy();
    
    if (strategy === BatchStrategy.INTELLIGENT) {
      const grouperStats = this.intelligentGrouper.getStats();
      return {
        totalBatches: grouperStats.totalGroups,
        instancedBatches: grouperStats.spatialClusters,
        totalItems: grouperStats.totalObjects,
        drawCalls: grouperStats.totalGroups,
        textureBinds: grouperStats.stateChanges,
        averageBatchSize: grouperStats.totalObjects / Math.max(grouperStats.totalGroups, 1)
      };
    } else if (strategy === BatchStrategy.ENHANCED) {
      return this.enhancedBatcher.getStats();
    } else {
      return {
        totalBatches: 0,
        instancedBatches: 0,
        totalItems: 0,
        drawCalls: 0,
        textureBinds: 0,
        averageBatchSize: 0
      };
    }
  }

  /**
   * 获取纹理图集
   */
  getTextureAtlas(): TextureAtlas | null {
    if (this.getEffectiveStrategy() === BatchStrategy.ENHANCED) {
      return this.enhancedBatcher.getTextureAtlas();
    }
    return null;
  }

  /**
   * 清空所有批次
   */
  clear(): void {
    this.currentRenderGroups = [];
    this.intelligentGrouper.reset();
    this.enhancedBatcher.clear();
    this.advancedBatcher.clearInstancedRenderables();
    this.advancedBatcher.clearMergedGeometries();
  }

  /**
   * 销毁管理器
   */
  dispose(): void {
    if (this.optimizationTimer) {
      clearInterval(this.optimizationTimer);
      this.optimizationTimer = null;
    }
    
    this.clear();
    this.performanceHistory = [];
  }
}

// 全局批处理管理器实例
export const globalBatchManager = new BatchManager();