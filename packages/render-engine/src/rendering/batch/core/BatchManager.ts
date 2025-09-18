/**
 * 统一批处理管理器
 * 管理不同的批处理策略，提供统一的批处理接口
 */

import { Matrix3 } from '../../../math/Matrix3';
import { IBatchRenderer, IRenderable, BatchStats } from './IBatchRenderer';
import { IBatchStrategy, BatchContext } from './IBatchStrategy';

/**
 * 批处理管理器配置
 */
export interface BatchManagerConfig {
  maxBatchSize: number;
  enableProfiling: boolean;
  defaultStrategy: string;
}

/**
 * 统一批处理管理器
 */
export class BatchManager implements IBatchRenderer {
  private gl: WebGLRenderingContext;
  private strategies: Map<string, IBatchStrategy> = new Map();
  private currentStrategy: IBatchStrategy | null = null;
  private config: BatchManagerConfig;
  
  // 性能统计
  private frameStats: BatchStats = {
    drawCalls: 0,
    triangles: 0,
    vertices: 0,
    batches: 0,
    textureBinds: 0,
    shaderSwitches: 0,
    frameTime: 0
  };
  
  private frameStartTime = 0;
  private frameNumber = 0;

  constructor(gl: WebGLRenderingContext, config: Partial<BatchManagerConfig> = {}) {
    this.gl = gl;
    this.config = {
      maxBatchSize: 65536,
      enableProfiling: true,
      defaultStrategy: 'basic',
      ...config
    };
  }

  /**
   * 注册批处理策略
   */
  registerStrategy(strategy: IBatchStrategy): void {
    this.strategies.set(strategy.name, strategy);
    
    // 如果没有当前策略，使用第一个注册的策略
    if (!this.currentStrategy) {
      this.currentStrategy = strategy;
    }
  }

  /**
   * 设置当前批处理策略
   */
  setStrategy(name: string): boolean {
    const strategy = this.strategies.get(name);
    if (!strategy) {
      console.warn(`Batch strategy '${name}' not found`);
      return false;
    }

    if (this.currentStrategy !== strategy) {
      // 切换前先清空当前策略
      if (this.currentStrategy) {
        this.currentStrategy.clear();
      }
      this.currentStrategy = strategy;
    }

    return true;
  }

  /**
   * 获取当前策略名称
   */
  getCurrentStrategy(): string {
    return this.currentStrategy?.name || 'none';
  }

  /**
   * 获取所有可用策略
   */
  getAvailableStrategies(): string[] {
    return Array.from(this.strategies.keys());
  }

  /**
   * 添加可渲染对象
   */
  addRenderable(renderable: IRenderable): void {
    if (!this.currentStrategy) {
      console.warn('No batch strategy set');
      return;
    }

    this.currentStrategy.process(renderable);
  }

  /**
   * 执行批处理渲染
   */
  flush(projectionMatrix: Matrix3): void {
    if (!this.currentStrategy) {
      return;
    }

    this.frameStartTime = performance.now();
    this.frameNumber++;

    // 创建批处理上下文
    const context: BatchContext = {
      gl: this.gl,
      maxBatchSize: this.config.maxBatchSize,
      currentFrame: this.frameNumber
    };

    // 执行策略渲染
    this.currentStrategy.flush(projectionMatrix, context);

    // 更新统计信息
    if (this.config.enableProfiling) {
      this.updateStats();
    }
  }

  /**
   * 清空批处理队列
   */
  clear(): void {
    if (this.currentStrategy) {
      this.currentStrategy.clear();
    }
    this.resetStats();
  }

  /**
   * 获取渲染统计信息
   */
  getStats(): BatchStats {
    if (!this.currentStrategy) {
      return this.frameStats;
    }

    const strategyStats = this.currentStrategy.getStats();
    
    // 合并统计信息
    return {
      ...strategyStats,
      frameTime: this.frameStats.frameTime
    };
  }

  /**
   * 获取详细的性能信息
   */
  getDetailedStats(): {
    manager: BatchStats;
    strategy: BatchStats;
    strategyName: string;
  } {
    return {
      manager: { ...this.frameStats },
      strategy: this.currentStrategy?.getStats() || this.getEmptyStats(),
      strategyName: this.getCurrentStrategy()
    };
  }

  /**
   * 释放资源
   */
  dispose(): void {
    for (const strategy of this.strategies.values()) {
      strategy.dispose();
    }
    this.strategies.clear();
    this.currentStrategy = null;
  }

  /**
   * 更新性能统计
   */
  private updateStats(): void {
    this.frameStats.frameTime = performance.now() - this.frameStartTime;
  }

  /**
   * 重置统计信息
   */
  private resetStats(): void {
    this.frameStats = {
      drawCalls: 0,
      triangles: 0,
      vertices: 0,
      batches: 0,
      textureBinds: 0,
      shaderSwitches: 0,
      frameTime: 0
    };
  }

  /**
   * 获取空的统计信息
   */
  private getEmptyStats(): BatchStats {
    return {
      drawCalls: 0,
      triangles: 0,
      vertices: 0,
      batches: 0,
      textureBinds: 0,
      shaderSwitches: 0,
      frameTime: 0
    };
  }

  /**
   * 自动优化策略选择
   */
  autoOptimize(): void {
    const stats = this.getStats();
    const batchEfficiency = stats.vertices / Math.max(stats.drawCalls, 1);

    if (batchEfficiency < 100 && this.strategies.has('enhanced')) {
      this.setStrategy('enhanced');
    } else if (batchEfficiency > 1000 && this.strategies.has('instanced')) {
      this.setStrategy('instanced');
    }
  }
}

/**
 * 创建默认的批处理管理器
 */
export function createBatchManager(
  gl: WebGLRenderingContext, 
  config?: Partial<BatchManagerConfig>
): BatchManager {
  return new BatchManager(gl, config);
}