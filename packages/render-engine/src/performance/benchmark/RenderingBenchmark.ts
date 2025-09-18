/**
 * 渲染性能基准测试
 * 使用新的统一批处理系统进行性能测试
 */

import { PerformanceBenchmark, BenchmarkResult } from './PerformanceBenchmark';
import { BatchManager, createBatchManagerWithDefaultStrategies, BatchOptimizer } from '../../rendering/batch';
import { TextureAtlas } from '../../textures/TextureAtlas';

/**
 * 渲染基准测试配置
 */
export interface RenderingBenchmarkConfig {
  canvasWidth: number;
  canvasHeight: number;
  objectCount: number;
  textureSize: number;
  iterations: number;
  enableProfiling?: boolean;
}

/**
 * 渲染性能基准测试类
 */
export class RenderingBenchmark {
  private benchmark: PerformanceBenchmark;
  private canvas: HTMLCanvasElement;
  private gl: WebGLRenderingContext;
  private batchManager?: BatchManager;
  private textureAtlas?: TextureAtlas;
  private batchOptimizer?: BatchOptimizer;

  constructor(private config: RenderingBenchmarkConfig) {
    this.benchmark = new PerformanceBenchmark();
    this.canvas = this.createCanvas();
    this.gl = this.initializeWebGL();
  }

  private createCanvas(): HTMLCanvasElement {
    const canvas = document.createElement('canvas');
    canvas.width = this.config.canvasWidth;
    canvas.height = this.config.canvasHeight;
    return canvas;
  }

  private initializeWebGL(): WebGLRenderingContext {
    const gl = this.canvas.getContext('webgl');
    if (!gl) {
      throw new Error('WebGL not supported');
    }
    return gl;
  }

  /**
   * 批处理性能测试
   */
  async testBatchRendering(): Promise<BenchmarkResult> {
    const suite = this.benchmark.suite('批处理渲染测试', {
      iterations: this.config.iterations,
      warmupIterations: 10,
      measureMemory: true,
      setup: async () => {
        this.batchManager = createBatchManagerWithDefaultStrategies(this.gl);
        this.batchOptimizer = new BatchOptimizer();
      },
      teardown: async () => {
        this.batchManager?.dispose();
      }
    });

    suite.test('批处理渲染', () => {
      if (this.batchManager) {
        // 模拟批处理渲染任务
        const mockRenderables = this.createMockRenderables(this.config.objectCount);
        mockRenderables.forEach(renderable => {
          this.batchManager!.addRenderable(renderable);
        });
        // 简化的投影矩阵
        const projectionMatrix = { multiply: (m: any) => m } as any;
        this.batchManager.flush(projectionMatrix);
      }
    });

    const results = await suite.run();
    return results[0]; // 返回第一个测试结果
  }

  /**
   * 实例化渲染测试
   */
  async testInstancedRendering(): Promise<BenchmarkResult> {
    const suite = this.benchmark.suite('实例化渲染测试', {
      iterations: this.config.iterations,
      warmupIterations: 10,
      measureMemory: true,
      setup: async () => {
        this.batchManager = createBatchManagerWithDefaultStrategies(this.gl);
        this.batchManager.setStrategy('instanced');
      },
      teardown: async () => {
        this.batchManager?.dispose();
      }
    });

    suite.test('实例化渲染', () => {
      if (this.batchManager) {
        // 模拟实例化渲染任务
        const mockRenderables = this.createMockRenderables(this.config.objectCount);
        mockRenderables.forEach(renderable => {
          this.batchManager!.addRenderable(renderable);
        });
        // 简化的投影矩阵
        const projectionMatrix = { multiply: (m: any) => m } as any;
        this.batchManager.flush(projectionMatrix);
      }
    });

    const results = await suite.run();
    return results[0]; // 返回第一个测试结果
  }

  /**
   * 创建模拟渲染对象
   */
  private createMockRenderables(count: number): any[] {
    const renderables = [];
    for (let i = 0; i < count; i++) {
      renderables.push({
        getVertices: () => new Float32Array([
          -1, -1, 0, 0,
          1, -1, 1, 0,
          1, 1, 1, 1,
          -1, 1, 0, 1
        ]),
        getIndices: () => new Uint16Array([0, 1, 2, 2, 3, 0]),
        getShader: () => 'basic',
        getBlendMode: () => 0,
        getZIndex: () => i % 10
      });
    }
    return renderables;
  }

  /**
   * 获取批处理统计信息
   */
  getBatchStats() {
    return this.batchManager?.getStats();
  }

  /**
   * 获取优化建议
   */
  getOptimizationSuggestions() {
    if (!this.batchOptimizer) return [];
    return this.batchOptimizer.analyze().suggestions;
  }

  /**
   * 清理资源
   */
  dispose(): void {
    this.batchManager?.dispose();
    this.textureAtlas?.dispose();
  }
}