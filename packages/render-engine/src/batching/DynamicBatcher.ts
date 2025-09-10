/**
 * 动态批处理合并系统
 * 基于运行时分析优化批处理策略
 */
import { IRenderCommand, MaterialKey, RenderCommandType } from '../commands/IRenderCommand';
import { IBatchData, IBatcher, IVertexLayout, UniversalBatcher } from './Batcher';
import { IRect } from '../graphics/IGraphicsContext';
import { EventEmitter } from '../events/EventBus';

/**
 * 批处理性能分析数据
 */
interface BatchingAnalytics {
  /** 平均每帧批次数量 */
  averageBatchesPerFrame: number;
  /** 平均每批次绘制调用数量 */
  averageDrawCallsPerBatch: number;
  /** 内存使用峰值 */
  peakMemoryUsage: number;
  /** GPU状态切换次数 */
  stateChanges: number;
  /** 批处理合并成功率 */
  mergingSuccessRate: number;
}

/**
 * 动态合并策略
 */
export enum MergingStrategy {
  /** 基于材质的合并（默认） */
  MATERIAL_BASED = 'material',
  /** 基于空间邻近性的合并 */
  SPATIAL_BASED = 'spatial',
  /** 基于渲染顺序的合并 */
  ORDER_BASED = 'order',
  /** 混合策略 */
  HYBRID = 'hybrid'
}

/**
 * 批处理优化配置
 */
interface BatchingConfig {
  /** 最大批次大小 */
  maxBatchSize: number;
  /** 合并策略 */
  mergingStrategy: MergingStrategy;
  /** 启用空间分组 */
  enableSpatialGrouping: boolean;
  /** 空间分组阈值 */
  spatialGroupingThreshold: number;
  /** 启用自适应优化 */
  enableAdaptiveOptimization: boolean;
  /** 性能采样间隔（帧数） */
  analyticsSampleInterval: number;
}

/**
 * 空间区域信息
 */
interface SpatialRegion {
  bounds: IRect;
  commands: IRenderCommand[];
  materialKeys: Set<string>;
}

/**
 * 批处理事件类型
 */
interface BatchingEvents {
  'batch-optimized': { before: number; after: number; strategy: MergingStrategy };
  'performance-warning': { reason: string; metrics: Partial<BatchingAnalytics> };
  'strategy-changed': { from: MergingStrategy; to: MergingStrategy };
}

/**
 * 动态批处理器
 * 根据运行时性能数据自适应优化批处理策略
 */
export class DynamicBatcher extends EventEmitter<BatchingEvents> implements IBatcher {
  readonly maxBatchSize: number;
  readonly vertexLayout: IVertexLayout;
  
  private config: BatchingConfig;
  private baseBatcher: UniversalBatcher;
  private analytics: BatchingAnalytics;
  private frameCount = 0;
  private spatialRegions: SpatialRegion[] = [];
  
  // 性能监控
  private performanceHistory: BatchingAnalytics[] = [];
  private currentFrameStats = {
    batchCount: 0,
    commandCount: 0,
    stateChanges: 0,
    memoryUsage: 0
  };
  
  constructor(config?: Partial<BatchingConfig>) {
    super();
    
    this.config = {
      maxBatchSize: 10000,
      mergingStrategy: MergingStrategy.HYBRID,
      enableSpatialGrouping: true,
      spatialGroupingThreshold: 100,
      enableAdaptiveOptimization: true,
      analyticsSampleInterval: 60,
      ...config
    };
    
    this.baseBatcher = new UniversalBatcher(this.config.maxBatchSize);
    this.maxBatchSize = this.config.maxBatchSize;
    this.vertexLayout = this.baseBatcher.vertexLayout;
    
    this.analytics = {
      averageBatchesPerFrame: 0,
      averageDrawCallsPerBatch: 0,
      peakMemoryUsage: 0,
      stateChanges: 0,
      mergingSuccessRate: 1.0
    };
  }
  
  get batchCount(): number {
    return this.baseBatcher.batchCount;
  }
  
  addCommand(command: IRenderCommand): boolean {
    this.currentFrameStats.commandCount++;
    
    // 根据当前策略决定如何处理命令
    switch (this.config.mergingStrategy) {
      case MergingStrategy.SPATIAL_BASED:
        return this.addCommandSpatial(command);
      case MergingStrategy.ORDER_BASED:
        return this.addCommandOrdered(command);
      case MergingStrategy.HYBRID:
        return this.addCommandHybrid(command);
      default:
        return this.baseBatcher.addCommand(command);
    }
  }
  
  flush(): IBatchData[] {
    const batchData = this.baseBatcher.flush();
    this.currentFrameStats.batchCount = batchData.length;
    
    // 更新性能统计
    this.updateAnalytics();
    
    // 检查是否需要策略调整
    if (this.config.enableAdaptiveOptimization && this.frameCount % this.config.analyticsSampleInterval === 0) {
      this.optimizeStrategy();
    }
    
    this.frameCount++;
    this.resetFrameStats();
    this.spatialRegions = [];
    
    return batchData;
  }
  
  clear(): void {
    this.baseBatcher.clear();
    this.spatialRegions = [];
    this.resetFrameStats();
  }
  
  getStats(): {
    totalCommands: number;
    totalBatches: number;
    averageCommandsPerBatch: number;
    memoryUsage: number;
  } {
    return this.baseBatcher.getStats();
  }
  
  /**
   * 获取详细的性能分析数据
   */
  getAnalytics(): BatchingAnalytics {
    return { ...this.analytics };
  }
  
  /**
   * 更新批处理配置
   */
  updateConfig(newConfig: Partial<BatchingConfig>): void {
    const oldStrategy = this.config.mergingStrategy;
    this.config = { ...this.config, ...newConfig };
    
    if (oldStrategy !== this.config.mergingStrategy) {
      this.emit('strategy-changed', { from: oldStrategy, to: this.config.mergingStrategy });
    }
  }
  
  /**
   * 基于空间邻近性添加命令
   */
  private addCommandSpatial(command: IRenderCommand): boolean {
    if (!this.config.enableSpatialGrouping) {
      return this.baseBatcher.addCommand(command);
    }
    
    const commandBounds = command.getBounds();
    
    // 寻找合适的空间区域
    const region = this.findSpatialRegion(commandBounds, command.materialKey);
    
    if (region) {
      region.commands.push(command);
      region.materialKeys.add(this.getMaterialKeyString(command.materialKey));
      return true;
    } else {
      // 创建新的空间区域
      const newRegion: SpatialRegion = {
        bounds: { ...commandBounds },
        commands: [command],
        materialKeys: new Set([this.getMaterialKeyString(command.materialKey)])
      };
      this.spatialRegions.push(newRegion);
      return true;
    }
  }
  
  /**
   * 基于渲染顺序添加命令
   */
  private addCommandOrdered(command: IRenderCommand): boolean {
    // 对于顺序策略，我们可以更激进地合并相邻的命令
    return this.baseBatcher.addCommand(command);
  }
  
  /**
   * 混合策略添加命令
   */
  private addCommandHybrid(command: IRenderCommand): boolean {
    // 混合策略：结合材质、空间和顺序信息
    const commandBounds = command.getBounds();
    const area = commandBounds.width * commandBounds.height;
    
    // 对于小对象使用空间分组，大对象使用材质分组
    if (area < this.config.spatialGroupingThreshold * this.config.spatialGroupingThreshold) {
      return this.addCommandSpatial(command);
    } else {
      return this.baseBatcher.addCommand(command);
    }
  }
  
  /**
   * 查找合适的空间区域
   */
  private findSpatialRegion(bounds: IRect, materialKey: MaterialKey): SpatialRegion | null {
    const materialKeyString = this.getMaterialKeyString(materialKey);
    
    for (const region of this.spatialRegions) {
      // 检查空间邻近性
      if (this.areRectanglesNear(region.bounds, bounds, this.config.spatialGroupingThreshold)) {
        // 检查材质兼容性
        if (region.materialKeys.has(materialKeyString) || region.materialKeys.size < 4) {
          return region;
        }
      }
    }
    
    return null;
  }
  
  /**
   * 检查两个矩形是否在指定阈值内
   */
  private areRectanglesNear(rect1: IRect, rect2: IRect, threshold: number): boolean {
    const dx = Math.max(0, Math.max(rect1.x - (rect2.x + rect2.width), rect2.x - (rect1.x + rect1.width)));
    const dy = Math.max(0, Math.max(rect1.y - (rect2.y + rect2.height), rect2.y - (rect1.y + rect1.height)));
    
    return Math.sqrt(dx * dx + dy * dy) <= threshold;
  }
  
  /**
   * 获取材质键的字符串表示
   */
  private getMaterialKeyString(materialKey: MaterialKey): string {
    return `${materialKey.textureId || 'none'}_${materialKey.shaderId || 'default'}_${materialKey.blendMode || 'normal'}`;
  }
  
  /**
   * 更新性能分析数据
   */
  private updateAnalytics(): void {
    const stats = this.getStats();
    
    // 更新平均值（使用滑动窗口）
    const alpha = 0.1; // 平滑因子
    
    this.analytics.averageBatchesPerFrame = 
      this.analytics.averageBatchesPerFrame * (1 - alpha) + 
      this.currentFrameStats.batchCount * alpha;
      
    this.analytics.averageDrawCallsPerBatch = 
      this.analytics.averageDrawCallsPerBatch * (1 - alpha) + 
      (this.currentFrameStats.batchCount > 0 ? this.currentFrameStats.commandCount / this.currentFrameStats.batchCount : 0) * alpha;
    
    this.analytics.peakMemoryUsage = Math.max(this.analytics.peakMemoryUsage, stats.memoryUsage);
    this.analytics.stateChanges = this.currentFrameStats.stateChanges;
    
    // 计算合并成功率
    if (this.currentFrameStats.commandCount > 0) {
      const expectedBatches = this.currentFrameStats.commandCount;
      const actualBatches = this.currentFrameStats.batchCount;
      const currentSuccessRate = Math.max(0, (expectedBatches - actualBatches) / expectedBatches);
      
      this.analytics.mergingSuccessRate = 
        this.analytics.mergingSuccessRate * (1 - alpha) + 
        currentSuccessRate * alpha;
    }
  }
  
  /**
   * 基于性能数据优化批处理策略
   */
  private optimizeStrategy(): void {
    const currentPerformance = { ...this.analytics };
    this.performanceHistory.push(currentPerformance);
    
    // 保持历史记录在合理范围内
    if (this.performanceHistory.length > 10) {
      this.performanceHistory.shift();
    }
    
    // 检查性能警告条件
    this.checkPerformanceWarnings(currentPerformance);
    
    // 如果性能不佳，尝试切换策略
    if (this.shouldOptimizeStrategy(currentPerformance)) {
      this.selectOptimalStrategy();
    }
  }
  
  /**
   * 检查性能警告
   */
  private checkPerformanceWarnings(performance: BatchingAnalytics): void {
    if (performance.averageBatchesPerFrame > 100) {
      this.emit('performance-warning', {
        reason: '批次数量过多，可能影响性能',
        metrics: { averageBatchesPerFrame: performance.averageBatchesPerFrame }
      });
    }
    
    if (performance.mergingSuccessRate < 0.5) {
      this.emit('performance-warning', {
        reason: '批处理合并效率低',
        metrics: { mergingSuccessRate: performance.mergingSuccessRate }
      });
    }
    
    if (performance.peakMemoryUsage > 50 * 1024 * 1024) { // 50MB
      this.emit('performance-warning', {
        reason: '内存使用量过高',
        metrics: { peakMemoryUsage: performance.peakMemoryUsage }
      });
    }
  }
  
  /**
   * 判断是否需要优化策略
   */
  private shouldOptimizeStrategy(performance: BatchingAnalytics): boolean {
    if (this.performanceHistory.length < 3) return false;
    
    const recentHistory = this.performanceHistory.slice(-3);
    const averageRecentBatches = recentHistory.reduce((sum, p) => sum + p.averageBatchesPerFrame, 0) / recentHistory.length;
    const averageRecentSuccess = recentHistory.reduce((sum, p) => sum + p.mergingSuccessRate, 0) / recentHistory.length;
    
    return averageRecentBatches > 50 || averageRecentSuccess < 0.6;
  }
  
  /**
   * 选择最优策略
   */
  private selectOptimalStrategy(): void {
    const currentStrategy = this.config.mergingStrategy;
    let bestStrategy = currentStrategy;
    
    // 基于当前性能指标选择策略
    if (this.analytics.averageBatchesPerFrame > 50) {
      // 如果批次过多，优先使用空间分组
      bestStrategy = MergingStrategy.SPATIAL_BASED;
    } else if (this.analytics.mergingSuccessRate < 0.6) {
      // 如果合并效率低，使用混合策略
      bestStrategy = MergingStrategy.HYBRID;
    }
    
    if (bestStrategy !== currentStrategy) {
      const beforeBatches = this.analytics.averageBatchesPerFrame;
      this.updateConfig({ mergingStrategy: bestStrategy });
      
      // 发出优化事件
      this.emit('batch-optimized', {
        before: beforeBatches,
        after: 0, // 将在下一帧更新
        strategy: bestStrategy
      });
    }
  }
  
  /**
   * 重置帧统计数据
   */
  private resetFrameStats(): void {
    this.currentFrameStats = {
      batchCount: 0,
      commandCount: 0,
      stateChanges: 0,
      memoryUsage: 0
    };
  }
}

/**
 * 批处理工厂类
 * 根据不同需求创建合适的批处理器
 */
export class BatcherFactory {
  /**
   * 创建标准批处理器
   */
  static createStandard(maxBatchSize = 10000): IBatcher {
    return new UniversalBatcher(maxBatchSize);
  }
  
  /**
   * 创建动态批处理器
   */
  static createDynamic(config?: Partial<BatchingConfig>): DynamicBatcher {
    return new DynamicBatcher(config);
  }
  
  /**
   * 创建高性能批处理器（针对大量小对象优化）
   */
  static createHighPerformance(): DynamicBatcher {
    return new DynamicBatcher({
      maxBatchSize: 20000,
      mergingStrategy: MergingStrategy.SPATIAL_BASED,
      enableSpatialGrouping: true,
      spatialGroupingThreshold: 50,
      enableAdaptiveOptimization: true,
      analyticsSampleInterval: 30
    });
  }
  
  /**
   * 创建低延迟批处理器（针对实时应用优化）
   */
  static createLowLatency(): DynamicBatcher {
    return new DynamicBatcher({
      maxBatchSize: 5000,
      mergingStrategy: MergingStrategy.ORDER_BASED,
      enableSpatialGrouping: false,
      enableAdaptiveOptimization: false
    });
  }
}