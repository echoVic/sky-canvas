import { BaseSystem } from './SystemManager';
import { Extension, ExtensionType } from './ExtensionSystem';
import { BatchRenderSystem } from './BatchRenderSystem';
import { PerformanceSystem } from './PerformanceSystem';
import { ResourceSystem } from './ResourceSystem';
import { GPUResourceOptimizer } from './GPUResourceOptimizer';
import { ShaderOptimizationSystem } from './ShaderOptimizationSystem';
import { SmartCacheSystem } from './SmartCacheSystem';
import { PerformanceMonitorSystem } from './PerformanceMonitorSystem';
import { RenderPipelineScheduler } from './RenderPipelineScheduler';
import { MultiThreadRenderSystem } from './MultiThreadRenderSystem';
import { 
  RenderOptimizationConfig, 
  RenderOptimizationConfigManager,
  renderOptimizationConfig,
  PRESET_CONFIGS
} from './RenderOptimizationConfig';

/**
 * 优化状态
 */
export enum OptimizationState {
  DISABLED = 'disabled',
  INITIALIZING = 'initializing',
  ACTIVE = 'active',
  OPTIMIZING = 'optimizing',
  ERROR = 'error'
}

/**
 * 系统状态
 */
interface SystemStatus {
  name: string;
  state: OptimizationState;
  lastUpdate: number;
  errorCount: number;
  performance: {
    averageTime: number;
    maxTime: number;
    minTime: number;
  };
}

/**
 * 优化指标
 */
export interface OptimizationMetrics {
  frameRate: {
    current: number;
    average: number;
    target: number;
    stability: number;
  };
  memory: {
    used: number;
    budget: number;
    efficiency: number;
  };
  rendering: {
    drawCalls: number;
    triangles: number;
    batches: number;
    culledObjects: number;
  };
  cache: {
    hitRate: number;
    size: number;
    efficiency: number;
  };
  gpu: {
    utilization: number;
    memoryUsage: number;
    bandwidth: number;
  };
}

/**
 * 优化建议
 */
export interface OptimizationRecommendation {
  type: 'performance' | 'memory' | 'quality' | 'stability';
  priority: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  action: string;
  estimatedImpact: number;
  autoApplicable: boolean;
}

/**
 * 渲染优化管理器
 * 统一管理和协调所有渲染优化系统
 */
@Extension({
  type: ExtensionType.RenderSystem,
  name: 'render-optimization-manager',
  priority: 1100
})
export class RenderOptimizationManager extends BaseSystem {
  readonly name = 'render-optimization-manager';
  readonly priority = 1100;
  
  // 子系统实例
  private systems = new Map<string, BaseSystem>();
  private systemStatus = new Map<string, SystemStatus>();
  
  // 配置管理
  private configManager: RenderOptimizationConfigManager;
  private currentConfig: RenderOptimizationConfig;
  
  // 状态管理
  private state = OptimizationState.DISABLED;
  private isInitialized = false;
  private lastOptimizationTime = 0;
  private optimizationInterval = 1000; // 1秒
  
  // 性能监控
  private metrics: OptimizationMetrics = {
    frameRate: { current: 0, average: 0, target: 60, stability: 0 },
    memory: { used: 0, budget: 0, efficiency: 0 },
    rendering: { drawCalls: 0, triangles: 0, batches: 0, culledObjects: 0 },
    cache: { hitRate: 0, size: 0, efficiency: 0 },
    gpu: { utilization: 0, memoryUsage: 0, bandwidth: 0 }
  };
  
  private frameTimeHistory: number[] = [];
  private maxHistorySize = 120; // 2秒的历史记录
  
  // 优化建议
  private recommendations: OptimizationRecommendation[] = [];
  
  // 事件监听器
  private listeners = {
    onStateChange: [] as Array<(state: OptimizationState) => void>,
    onMetricsUpdate: [] as Array<(metrics: OptimizationMetrics) => void>,
    onRecommendation: [] as Array<(recommendations: OptimizationRecommendation[]) => void>
  };
  
  constructor() {
    super();
    this.configManager = renderOptimizationConfig;
    this.currentConfig = this.configManager.getConfig();
    
    // 监听配置变更
    this.configManager.addListener((config) => {
      this.currentConfig = config;
      this.applyConfiguration();
    });
  }
  
  /**
   * 初始化系统
   */
  async init(): Promise<void> {
    if (this.isInitialized) return;
    
    try {
      this.setState(OptimizationState.INITIALIZING);
      
      // 初始化子系统
      await this.initializeSubSystems();
      
      // 应用配置
      this.applyConfiguration();
      
      // 启动监控
      this.startMonitoring();
      
      this.setState(OptimizationState.ACTIVE);
      this.isInitialized = true;
      
      console.log('Render optimization manager initialized successfully');
    } catch (error) {
      console.error('Failed to initialize render optimization manager:', error);
      this.setState(OptimizationState.ERROR);
      throw error;
    }
  }
  
  /**
   * 初始化子系统
   */
  private async initializeSubSystems(): Promise<void> {
    const systemConfigs = [
      { name: 'batch-render', system: BatchRenderSystem },
      { name: 'performance', system: PerformanceSystem },
      { name: 'resource', system: ResourceSystem },
      { name: 'gpu-optimizer', system: GPUResourceOptimizer },
      { name: 'shader-optimization', system: ShaderOptimizationSystem },
      { name: 'smart-cache', system: SmartCacheSystem },
      { name: 'performance-monitor', system: PerformanceMonitorSystem },
      { name: 'pipeline-scheduler', system: RenderPipelineScheduler },
      { name: 'multi-thread', system: MultiThreadRenderSystem }
    ];
    
    for (const config of systemConfigs) {
      try {
        const system = new config.system();
        await system.init();
        
        this.systems.set(config.name, system);
        this.systemStatus.set(config.name, {
          name: config.name,
          state: OptimizationState.ACTIVE,
          lastUpdate: Date.now(),
          errorCount: 0,
          performance: {
            averageTime: 0,
            maxTime: 0,
            minTime: Infinity
          }
        });
        
        console.log(`Initialized ${config.name} system`);
      } catch (error) {
        console.error(`Failed to initialize ${config.name} system:`, error);
        this.systemStatus.set(config.name, {
          name: config.name,
          state: OptimizationState.ERROR,
          lastUpdate: Date.now(),
          errorCount: 1,
          performance: {
            averageTime: 0,
            maxTime: 0,
            minTime: 0
          }
        });
      }
    }
    
    // 设置系统间的依赖关系
    this.setupSystemDependencies();
  }
  
  /**
   * 设置系统依赖关系
   */
  private setupSystemDependencies(): void {
    const pipelineScheduler = this.systems.get('pipeline-scheduler') as RenderPipelineScheduler;
    
    if (pipelineScheduler) {
      pipelineScheduler.setSubSystems({
        batchSystem: this.systems.get('batch-render') as BatchRenderSystem,
        performanceSystem: this.systems.get('performance') as PerformanceSystem,
        resourceSystem: this.systems.get('resource') as ResourceSystem,
        gpuOptimizer: this.systems.get('gpu-optimizer') as GPUResourceOptimizer,
        shaderSystem: this.systems.get('shader-optimization') as ShaderOptimizationSystem,
        cacheSystem: this.systems.get('smart-cache') as SmartCacheSystem,
        monitorSystem: this.systems.get('performance-monitor') as PerformanceMonitorSystem
      });
    }
  }
  
  /**
   * 应用配置
   */
  private applyConfiguration(): void {
    // 应用LOD配置
    const performanceSystem = this.systems.get('performance') as PerformanceSystem;
    if (performanceSystem && this.currentConfig.lod.enabled) {
      // 配置LOD系统
    }
    
    // 应用批处理配置
    const batchSystem = this.systems.get('batch-render') as BatchRenderSystem;
    if (batchSystem && this.currentConfig.batching.enabled) {
      // 配置批处理系统
    }
    
    // 应用缓存配置
    const cacheSystem = this.systems.get('smart-cache') as SmartCacheSystem;
    if (cacheSystem && this.currentConfig.cache.enabled) {
      // 配置缓存系统
    }
    
    // 应用GPU资源配置
    const gpuOptimizer = this.systems.get('gpu-optimizer') as GPUResourceOptimizer;
    if (gpuOptimizer) {
      // 配置GPU优化器
    }
    
    // 应用着色器配置
    const shaderSystem = this.systems.get('shader-optimization') as ShaderOptimizationSystem;
    if (shaderSystem) {
      // 配置着色器系统
    }
    
    // 应用多线程配置
    const multiThreadSystem = this.systems.get('multi-thread') as MultiThreadRenderSystem;
    if (multiThreadSystem && this.currentConfig.multiThread.enabled) {
      // 配置多线程系统
    }
    
    console.log('Applied optimization configuration');
  }
  
  /**
   * 启动监控
   */
  private startMonitoring(): void {
    // 定期更新指标
    setInterval(() => {
      this.updateMetrics();
      this.analyzePerformance();
      this.generateRecommendations();
    }, this.optimizationInterval);
    
    // 监听帧率变化
    this.startFrameRateMonitoring();
  }
  
  /**
   * 启动帧率监控
   */
  private startFrameRateMonitoring(): void {
    let lastTime = performance.now();
    
    const measureFrame = () => {
      const currentTime = performance.now();
      const frameTime = currentTime - lastTime;
      lastTime = currentTime;
      
      this.recordFrameTime(frameTime);
      requestAnimationFrame(measureFrame);
    };
    
    requestAnimationFrame(measureFrame);
  }
  
  /**
   * 记录帧时间
   */
  private recordFrameTime(frameTime: number): void {
    this.frameTimeHistory.push(frameTime);
    
    if (this.frameTimeHistory.length > this.maxHistorySize) {
      this.frameTimeHistory.shift();
    }
    
    // 更新帧率指标
    this.metrics.frameRate.current = 1000 / frameTime;
    
    if (this.frameTimeHistory.length > 0) {
      const averageFrameTime = this.frameTimeHistory.reduce((sum, time) => sum + time, 0) / this.frameTimeHistory.length;
      this.metrics.frameRate.average = 1000 / averageFrameTime;
      
      // 计算稳定性（帧时间方差的倒数）
      const variance = this.frameTimeHistory.reduce((sum, time) => {
        const diff = time - averageFrameTime;
        return sum + diff * diff;
      }, 0) / this.frameTimeHistory.length;
      
      this.metrics.frameRate.stability = variance > 0 ? 1 / Math.sqrt(variance) : 1;
    }
  }
  
  /**
   * 更新指标
   */
  private updateMetrics(): void {
    // 更新内存指标
    const performanceSystem = this.systems.get('performance') as PerformanceSystem;
    if (performanceSystem) {
      const perfStats = performanceSystem.getStats();
      this.metrics.memory.used = perfStats.memoryUsage || 0;
      this.metrics.memory.budget = this.currentConfig.gpuResource.memoryBudget;
      this.metrics.memory.efficiency = this.metrics.memory.budget > 0 ? 
        (this.metrics.memory.budget - this.metrics.memory.used) / this.metrics.memory.budget : 0;
    }
    
    // 更新渲染指标
    const pipelineScheduler = this.systems.get('pipeline-scheduler') as RenderPipelineScheduler;
    if (pipelineScheduler) {
      const renderStats = pipelineScheduler.getRenderStats();
      this.metrics.rendering.drawCalls = renderStats.drawCalls;
      this.metrics.rendering.triangles = renderStats.triangles;
      this.metrics.rendering.batches = renderStats.batchCount;
      this.metrics.rendering.culledObjects = renderStats.culledObjects;
    }
    
    // 更新缓存指标
    const cacheSystem = this.systems.get('smart-cache') as SmartCacheSystem;
    if (cacheSystem) {
      const cacheStatsMap = cacheSystem.getAllStats();
      let totalHits = 0;
      let totalRequests = 0;
      let totalSize = 0;
      
      for (const [, stats] of cacheStatsMap) {
        totalHits += stats.hits;
        totalRequests += stats.hits + stats.misses;
        totalSize += stats.totalSize;
      }
      
      this.metrics.cache.hitRate = totalRequests > 0 ? totalHits / totalRequests : 0;
      this.metrics.cache.size = totalSize;
      this.metrics.cache.efficiency = this.metrics.cache.hitRate;
    }
    
    // 更新GPU指标
    const gpuOptimizer = this.systems.get('gpu-optimizer') as GPUResourceOptimizer;
    if (gpuOptimizer) {
      const gpuStats = gpuOptimizer.getMemoryStats();
      this.metrics.gpu.memoryUsage = gpuStats.totalUsed;
      this.metrics.gpu.utilization = gpuStats.availableMemory > 0 ? gpuStats.totalUsed / (gpuStats.totalUsed + gpuStats.availableMemory) : 0;
    }
    
    // 通知监听器
    this.notifyMetricsUpdate();
  }
  
  /**
   * 分析性能
   */
  private analyzePerformance(): void {
    const now = Date.now();
    
    if (now - this.lastOptimizationTime < this.optimizationInterval) {
      return;
    }
    
    this.lastOptimizationTime = now;
    
    // 检查是否需要优化
    const needsOptimization = this.checkOptimizationNeeds();
    
    if (needsOptimization.length > 0) {
      this.setState(OptimizationState.OPTIMIZING);
      this.performOptimizations(needsOptimization);
      this.setState(OptimizationState.ACTIVE);
    }
  }
  
  /**
   * 检查优化需求
   */
  private checkOptimizationNeeds(): string[] {
    const needs: string[] = [];
    
    // 检查帧率
    if (this.metrics.frameRate.average < this.metrics.frameRate.target * 0.9) {
      needs.push('framerate');
    }
    
    // 检查内存使用
    if (this.metrics.memory.efficiency < 0.2) {
      needs.push('memory');
    }
    
    // 检查绘制调用
    const maxDrawCalls = this.currentConfig.monitoring.alertThresholds.drawCalls;
    if (this.metrics.rendering.drawCalls > maxDrawCalls) {
      needs.push('drawcalls');
    }
    
    // 检查缓存效率
    if (this.metrics.cache.hitRate < 0.7) {
      needs.push('cache');
    }
    
    return needs;
  }
  
  /**
   * 执行优化
   */
  private performOptimizations(needs: string[]): void {
    for (const need of needs) {
      switch (need) {
        case 'framerate':
          this.optimizeFrameRate();
          break;
        case 'memory':
          this.optimizeMemory();
          break;
        case 'drawcalls':
          this.optimizeDrawCalls();
          break;
        case 'cache':
          this.optimizeCache();
          break;
      }
    }
  }
  
  /**
   * 优化帧率
   */
  private optimizeFrameRate(): void {
    // 降低质量设置
    const newConfig = { ...this.currentConfig };
    
    // 调整LOD偏移
    newConfig.lod.biasMultiplier = Math.min(3.0, newConfig.lod.biasMultiplier * 1.2);
    
    // 减少批处理大小
    newConfig.batching.maxBatchSize = Math.max(50, Math.floor(newConfig.batching.maxBatchSize * 0.8));
    
    // 启用更激进的剔除
    newConfig.culling.smallObjectThreshold = Math.max(0.5, newConfig.culling.smallObjectThreshold * 0.8);
    
    this.configManager.setConfig(newConfig);
    console.log('Applied frame rate optimizations');
  }
  
  /**
   * 优化内存
   */
  private optimizeMemory(): void {
    // 清理缓存
    const cacheSystem = this.systems.get('smart-cache') as SmartCacheSystem;
    if (cacheSystem) {
      // 清理所有缓存实例
      const cacheStatsMap = cacheSystem.getAllStats();
      for (const [cacheName] of cacheStatsMap) {
        cacheSystem.clear(cacheName);
      }
    }
    
    // 减少纹理质量
    const newConfig = { ...this.currentConfig };
    newConfig.gpuResource.maxTextureSize = Math.max(512, newConfig.gpuResource.maxTextureSize / 2);
    
    this.configManager.setConfig(newConfig);
    console.log('Applied memory optimizations');
  }
  
  /**
   * 优化绘制调用
   */
  private optimizeDrawCalls(): void {
    // 增加批处理大小
    const newConfig = { ...this.currentConfig };
    newConfig.batching.maxBatchSize = Math.min(1000, newConfig.batching.maxBatchSize * 1.5);
    newConfig.batching.enableInstancing = true;
    
    this.configManager.setConfig(newConfig);
    console.log('Applied draw call optimizations');
  }
  
  /**
   * 优化缓存
   */
  private optimizeCache(): void {
    // 增加缓存大小
    const newConfig = { ...this.currentConfig };
    newConfig.cache.maxSize = Math.min(1024 * 1024 * 1024, newConfig.cache.maxSize * 1.5); // 最大1GB
    newConfig.cache.predictiveLoading = true;
    
    this.configManager.setConfig(newConfig);
    console.log('Applied cache optimizations');
  }
  
  /**
   * 生成优化建议
   */
  private generateRecommendations(): void {
    const newRecommendations: OptimizationRecommendation[] = [];
    
    // 帧率建议
    if (this.metrics.frameRate.average < this.metrics.frameRate.target * 0.8) {
      newRecommendations.push({
        type: 'performance',
        priority: 'high',
        description: 'Frame rate is significantly below target',
        action: 'Reduce rendering quality or enable more aggressive optimizations',
        estimatedImpact: 0.3,
        autoApplicable: true
      });
    }
    
    // 内存建议
    if (this.metrics.memory.efficiency < 0.1) {
      newRecommendations.push({
        type: 'memory',
        priority: 'critical',
        description: 'Memory usage is critically high',
        action: 'Clear caches and reduce texture quality',
        estimatedImpact: 0.5,
        autoApplicable: true
      });
    }
    
    // 缓存建议
    if (this.metrics.cache.hitRate < 0.5) {
      newRecommendations.push({
        type: 'performance',
        priority: 'medium',
        description: 'Cache hit rate is low',
        action: 'Increase cache size or enable predictive loading',
        estimatedImpact: 0.2,
        autoApplicable: true
      });
    }
    
    // 稳定性建议
    if (this.metrics.frameRate.stability < 0.5) {
      newRecommendations.push({
        type: 'stability',
        priority: 'medium',
        description: 'Frame rate is unstable',
        action: 'Enable adaptive quality or reduce dynamic effects',
        estimatedImpact: 0.25,
        autoApplicable: false
      });
    }
    
    this.recommendations = newRecommendations;
    this.notifyRecommendations();
  }
  
  /**
   * 设置状态
   */
  private setState(newState: OptimizationState): void {
    if (this.state !== newState) {
      this.state = newState;
      this.notifyStateChange();
    }
  }
  
  /**
   * 通知状态变更
   */
  private notifyStateChange(): void {
    this.listeners.onStateChange.forEach(listener => listener(this.state));
  }
  
  /**
   * 通知指标更新
   */
  private notifyMetricsUpdate(): void {
    this.listeners.onMetricsUpdate.forEach(listener => listener(this.metrics));
  }
  
  /**
   * 通知建议更新
   */
  private notifyRecommendations(): void {
    this.listeners.onRecommendation.forEach(listener => listener(this.recommendations));
  }
  
  // 公共API
  
  /**
   * 获取当前状态
   */
  getState(): OptimizationState {
    return this.state;
  }
  
  /**
   * 获取指标
   */
  getMetrics(): OptimizationMetrics {
    return { ...this.metrics };
  }
  
  /**
   * 获取建议
   */
  getRecommendations(): OptimizationRecommendation[] {
    return [...this.recommendations];
  }
  
  /**
   * 获取系统状态
   */
  getSystemStatus(): Map<string, SystemStatus> {
    return new Map(this.systemStatus);
  }
  
  /**
   * 应用预设配置
   */
  applyPreset(preset: keyof typeof PRESET_CONFIGS): void {
    this.configManager.applyPreset(preset);
  }
  
  /**
   * 应用建议
   */
  applyRecommendation(recommendation: OptimizationRecommendation): void {
    if (!recommendation.autoApplicable) {
      console.warn('Recommendation is not auto-applicable:', recommendation.description);
      return;
    }
    
    switch (recommendation.type) {
      case 'performance':
        if (recommendation.description.includes('frame rate')) {
          this.optimizeFrameRate();
        } else if (recommendation.description.includes('cache')) {
          this.optimizeCache();
        }
        break;
      case 'memory':
        this.optimizeMemory();
        break;
    }
    
    // 移除已应用的建议
    const index = this.recommendations.indexOf(recommendation);
    if (index !== -1) {
      this.recommendations.splice(index, 1);
      this.notifyRecommendations();
    }
  }
  
  /**
   * 添加事件监听器
   */
  addEventListener<T extends keyof typeof this.listeners>(
    event: T,
    listener: typeof this.listeners[T][0]
  ): void {
    const eventListeners = this.listeners[event] as Array<typeof listener>;
    eventListeners.push(listener);
  }
  
  /**
   * 移除事件监听器
   */
  removeEventListener<T extends keyof typeof this.listeners>(
    event: T,
    listener: typeof this.listeners[T][0]
  ): void {
    const eventListeners = this.listeners[event] as Array<typeof listener>;
    const index = eventListeners.indexOf(listener);
    if (index !== -1) {
      eventListeners.splice(index, 1);
    }
  }
  
  /**
   * 强制优化
   */
  forceOptimization(): void {
    this.setState(OptimizationState.OPTIMIZING);
    
    const allNeeds = ['framerate', 'memory', 'drawcalls', 'cache'];
    this.performOptimizations(allNeeds);
    
    this.setState(OptimizationState.ACTIVE);
    console.log('Forced optimization completed');
  }
  
  /**
   * 重置优化
   */
  resetOptimizations(): void {
    // 恢复默认配置
    const defaultConfig = PRESET_CONFIGS.MEDIUM_END;
    this.configManager.setConfig(defaultConfig);
    
    // 清除建议
    this.recommendations = [];
    this.notifyRecommendations();
    
    console.log('Optimizations reset to defaults');
  }
  
  /**
   * 获取性能报告
   */
  getPerformanceReport(): {
    summary: string;
    metrics: OptimizationMetrics;
    recommendations: OptimizationRecommendation[];
    systemStatus: Array<{ name: string; status: SystemStatus }>;
    config: ReturnType<RenderOptimizationConfigManager['getConfigSummary']>;
  } {
    const systemStatusArray = Array.from(this.systemStatus.entries()).map(([name, status]) => ({
      name,
      status
    }));
    
    let summary = 'Performance is ';
    if (this.metrics.frameRate.average >= this.metrics.frameRate.target * 0.9) {
      summary += 'excellent';
    } else if (this.metrics.frameRate.average >= this.metrics.frameRate.target * 0.7) {
      summary += 'good';
    } else if (this.metrics.frameRate.average >= this.metrics.frameRate.target * 0.5) {
      summary += 'fair';
    } else {
      summary += 'poor';
    }
    
    summary += `. Average FPS: ${this.metrics.frameRate.average.toFixed(1)}, Memory efficiency: ${(this.metrics.memory.efficiency * 100).toFixed(1)}%`;
    
    return {
      summary,
      metrics: this.metrics,
      recommendations: this.recommendations,
      systemStatus: systemStatusArray,
      config: this.configManager.getConfigSummary()
    };
  }
  
  /**
   * 销毁系统
   */
  dispose(): void {
    // 销毁所有子系统
    for (const system of this.systems.values()) {
      if ('dispose' in system && typeof (system as { dispose?: () => void }).dispose === 'function') {
        (system as { dispose: () => void }).dispose();
      }
    }
    
    this.systems.clear();
    this.systemStatus.clear();
    this.frameTimeHistory = [];
    this.recommendations = [];
    
    // 清除监听器
    Object.keys(this.listeners).forEach(key => {
      const typedKey = key as keyof typeof this.listeners;
      (this.listeners[typedKey] as unknown[]) = [];
    });
    
    this.setState(OptimizationState.DISABLED);
    this.isInitialized = false;
  }
}