/**
 * 渲染管线调度系统
 * 协调各个渲染子系统，管理渲染任务和性能优化
 */

import { BaseSystem } from './SystemManager';
import { Extension, ExtensionType } from './ExtensionSystem';
import { BatchRenderSystem } from './BatchRenderSystem';
import { PerformanceSystem } from './PerformanceSystem';
import { ResourceSystem } from './ResourceSystem';
import { GPUResourceOptimizer } from './GPUResourceOptimizer';
import { ShaderOptimizationSystem } from './ShaderOptimizationSystem';
import { SmartCacheSystem } from './SmartCacheSystem';
import { PerformanceMonitorSystem } from './PerformanceMonitorSystem';
import { TaskScheduler } from './TaskScheduler';
import { AdaptiveQualityManager } from './AdaptiveQualityManager';
import {
  RenderPhase,
  RenderStats,
  RenderConfig,
  PerformanceBudget,
  TaskSchedulerStats,
  QualityRecommendations,
  DEFAULT_RENDER_CONFIG,
  DEFAULT_PERFORMANCE_BUDGET,
  createInitialRenderStats
} from './RenderPipelineTypes';

// 重新导出类型
export { RenderPhase } from './RenderPipelineTypes';
export type {
  RenderStats,
  RenderConfig,
  PerformanceBudget,
  TaskSchedulerStats,
  QualityRecommendations,
  RenderTask
} from './RenderPipelineTypes';
export { TaskScheduler } from './TaskScheduler';
export { AdaptiveQualityManager } from './AdaptiveQualityManager';

/**
 * 渲染管线调度系统
 */
@Extension({
  type: ExtensionType.RenderSystem,
  name: 'render-pipeline-scheduler',
  priority: 1000
})
export class RenderPipelineScheduler extends BaseSystem {
  readonly name = 'render-pipeline-scheduler';
  readonly priority = 1000;

  // 子系统引用
  private batchSystem: BatchRenderSystem | null = null;
  private performanceSystem: PerformanceSystem | null = null;
  private resourceSystem: ResourceSystem | null = null;
  private gpuOptimizer: GPUResourceOptimizer | null = null;
  private shaderSystem: ShaderOptimizationSystem | null = null;
  private cacheSystem: SmartCacheSystem | null = null;
  private monitorSystem: PerformanceMonitorSystem | null = null;

  // 调度器和管理器
  private taskScheduler: TaskScheduler;
  private qualityManager: AdaptiveQualityManager;

  // 配置和预算
  private config: RenderConfig;
  private budget: PerformanceBudget;

  // 统计信息
  private stats: RenderStats;
  private performanceHistory: { frameTime: number; timestamp: number }[] = [];

  constructor() {
    super();
    this.config = { ...DEFAULT_RENDER_CONFIG };
    this.budget = { ...DEFAULT_PERFORMANCE_BUDGET };
    this.stats = createInitialRenderStats();
    this.taskScheduler = new TaskScheduler(this.config.maxConcurrentTasks);
    this.qualityManager = new AdaptiveQualityManager(this.budget.targetFPS);
  }

  init(): void {
    this.initializeSubSystems();
    this.setupPerformanceMonitoring();
  }

  private initializeSubSystems(): void {
    console.log('Initializing render pipeline subsystems');
  }

  setSubSystems(systems: {
    batchSystem?: BatchRenderSystem;
    performanceSystem?: PerformanceSystem;
    resourceSystem?: ResourceSystem;
    gpuOptimizer?: GPUResourceOptimizer;
    shaderSystem?: ShaderOptimizationSystem;
    cacheSystem?: SmartCacheSystem;
    monitorSystem?: PerformanceMonitorSystem;
  }): void {
    Object.assign(this, systems);
  }

  private setupPerformanceMonitoring(): void {
    setInterval(() => {
      this.analyzePerformance();
      this.optimizeRenderPipeline();
    }, 1000);
  }

  async renderFrame(): Promise<void> {
    const frameStartTime = performance.now();

    try {
      this.taskScheduler.reset();
      this.createRenderTasks();
      await this.taskScheduler.executeTasks();
      this.updateStats(frameStartTime);

      if (this.config.adaptiveQuality) {
        this.qualityManager.updateFrameTime(this.stats.frameTime);
      }
    } catch (error) {
      console.error('Render frame failed:', error);
      throw error;
    }
  }

  private createRenderTasks(): void {
    // 设置阶段
    this.taskScheduler.addTask({
      id: 'setup',
      phase: RenderPhase.SETUP,
      priority: 100,
      dependencies: [],
      estimatedTime: 1,
      status: 'pending',
      execute: () => this.executeSetupPhase()
    });

    // 视锥剔除阶段
    if (this.config.enableCulling) {
      this.taskScheduler.addTask({
        id: 'cull',
        phase: RenderPhase.CULL,
        priority: 90,
        dependencies: ['setup'],
        estimatedTime: 2,
        status: 'pending',
        execute: () => this.executeCullPhase()
      });
    }

    // 排序阶段
    this.taskScheduler.addTask({
      id: 'sort',
      phase: RenderPhase.SORT,
      priority: 80,
      dependencies: this.config.enableCulling ? ['cull'] : ['setup'],
      estimatedTime: 1,
      status: 'pending',
      execute: () => this.executeSortPhase()
    });

    // 批处理阶段
    if (this.config.enableBatching) {
      this.taskScheduler.addTask({
        id: 'batch',
        phase: RenderPhase.BATCH,
        priority: 70,
        dependencies: ['sort'],
        estimatedTime: 3,
        status: 'pending',
        execute: () => this.executeBatchPhase()
      });
    }

    // 渲染阶段
    this.taskScheduler.addTask({
      id: 'render',
      phase: RenderPhase.RENDER,
      priority: 60,
      dependencies: this.config.enableBatching ? ['batch'] : ['sort'],
      estimatedTime: 10,
      status: 'pending',
      execute: () => this.executeRenderPhase()
    });

    // 后处理阶段
    this.taskScheduler.addTask({
      id: 'post_process',
      phase: RenderPhase.POST_PROCESS,
      priority: 50,
      dependencies: ['render'],
      estimatedTime: 5,
      status: 'pending',
      execute: () => this.executePostProcessPhase()
    });

    // 呈现阶段
    this.taskScheduler.addTask({
      id: 'present',
      phase: RenderPhase.PRESENT,
      priority: 40,
      dependencies: ['post_process'],
      estimatedTime: 1,
      status: 'pending',
      execute: () => this.executePresentPhase()
    });
  }

  private executeSetupPhase(): void {
    console.log('Executing setup phase');
  }

  private executeCullPhase(): void {
    console.log('Executing cull phase');
  }

  private executeSortPhase(): void {
    console.log('Executing sort phase');
  }

  private executeBatchPhase(): void {
    if (this.batchSystem) {
      console.log('Executing batch phase');
    }
  }

  private executeRenderPhase(): void {
    console.log('Executing render phase');
  }

  private executePostProcessPhase(): void {
    console.log('Executing post-process phase');
  }

  private executePresentPhase(): void {
    console.log('Executing present phase');
  }

  private updateStats(frameStartTime: number): void {
    this.stats.frameTime = performance.now() - frameStartTime;

    if (this.performanceSystem) {
      const perfStats = this.performanceSystem.getStats();
      this.stats.memoryUsage = perfStats.memoryUsage || 0;
      this.stats.cacheHitRate = perfStats.cacheHitRate || 0;
    }

    if (this.gpuOptimizer) {
      const gpuStats = this.gpuOptimizer.getMemoryStats();
      this.stats.drawCalls = gpuStats.allocationCount;
    }

    this.performanceHistory.push({
      frameTime: this.stats.frameTime,
      timestamp: Date.now()
    });

    if (this.performanceHistory.length > 1000) {
      this.performanceHistory.shift();
    }
  }

  private analyzePerformance(): void {
    if (this.performanceHistory.length < 10) return;

    const budgetViolations = this.checkBudgetViolations();
    if (budgetViolations.length > 0) {
      console.warn('Performance budget violations:', budgetViolations);
      this.triggerOptimizations(budgetViolations);
    }
  }

  private checkBudgetViolations(): string[] {
    const violations: string[] = [];
    if (this.stats.frameTime > this.budget.maxFrameTime) violations.push('frame_time');
    if (this.stats.drawCalls > this.budget.maxDrawCalls) violations.push('draw_calls');
    if (this.stats.triangles > this.budget.maxTriangles) violations.push('triangles');
    if (this.stats.memoryUsage > this.budget.maxMemoryUsage) violations.push('memory_usage');
    return violations;
  }

  private triggerOptimizations(violations: string[]): void {
    for (const violation of violations) {
      switch (violation) {
        case 'frame_time': console.log('Optimizing frame time'); break;
        case 'draw_calls': console.log('Optimizing draw calls'); break;
        case 'triangles': console.log('Optimizing triangle count'); break;
        case 'memory_usage': console.log('Optimizing memory usage'); break;
      }
    }
  }

  private optimizeRenderPipeline(): void {
    if (!this.config.enableDynamicOptimization) return;
    const recommendations = this.qualityManager.getQualityRecommendations();
    console.log('Applying quality settings:', recommendations);
    this.adjustConcurrency();
  }

  private adjustConcurrency(): void {
    const currentFrameTime = this.stats.frameTime;
    const targetFrameTime = this.budget.maxFrameTime;

    if (currentFrameTime > targetFrameTime * 1.2) {
      this.config.maxConcurrentTasks = Math.max(1, this.config.maxConcurrentTasks - 1);
    } else if (currentFrameTime < targetFrameTime * 0.8) {
      this.config.maxConcurrentTasks = Math.min(8, this.config.maxConcurrentTasks + 1);
    }

    this.taskScheduler.setMaxConcurrent(this.config.maxConcurrentTasks);
  }

  getRenderStats(): RenderStats {
    return { ...this.stats };
  }

  getSchedulerStats(): TaskSchedulerStats {
    return this.taskScheduler.getStats();
  }

  getQualityInfo(): { currentQuality: number; recommendations: QualityRecommendations } {
    return {
      currentQuality: this.qualityManager.getCurrentQuality(),
      recommendations: this.qualityManager.getQualityRecommendations()
    };
  }

  setConfig(config: Partial<RenderConfig>): void {
    Object.assign(this.config, config);
  }

  setBudget(budget: Partial<PerformanceBudget>): void {
    Object.assign(this.budget, budget);
    this.qualityManager = new AdaptiveQualityManager(budget.targetFPS || 60);
  }

  dispose(): void {
    this.taskScheduler.reset();
    this.performanceHistory.length = 0;
  }
}
