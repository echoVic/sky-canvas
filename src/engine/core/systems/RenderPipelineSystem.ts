import { BaseSystem } from './SystemManager';
import { Extension, ExtensionType } from './ExtensionSystem';
// import { IRenderer } from '../renderers/IRenderer';

/**
 * 渲染器接口（临时定义）
 */
interface IRenderer {
  render(): void;
}

/**
 * 渲染任务接口
 */
export interface IRenderTask {
  readonly id: string;
  readonly priority: number;
  readonly estimatedTime: number;
  
  execute(renderer: IRenderer): Promise<void> | void;
  canBatch(other: IRenderTask): boolean;
}

/**
 * 渲染批次
 */
interface RenderBatch {
  tasks: IRenderTask[];
  totalTime: number;
  priority: number;
}

/**
 * GPU驱动渲染命令
 */
interface GPUCommand {
  type: 'draw' | 'compute' | 'copy';
  data: unknown;
  dependencies: string[];
}

/**
 * 多线程渲染管线系统
 */
@Extension({
  type: ExtensionType.RenderSystem,
  name: 'render-pipeline-system',
  priority: 950
})
export class RenderPipelineSystem extends BaseSystem {
  readonly name = 'render-pipeline-system';
  readonly priority = 950;
  
  private renderer: IRenderer | null = null;
  private renderTasks: IRenderTask[] = [];
  private renderBatches: RenderBatch[] = [];
  
  // 多线程支持
  private workers: Worker[] = [];
  private maxWorkers = navigator.hardwareConcurrency || 4;
  private workerTasks = new Map<number, IRenderTask[]>();
  
  // GPU驱动渲染
  private gpuCommandBuffer: GPUCommand[] = [];
  private enableGPUDriven = true;
  
  // 视锥剔除
  private frustumPlanes: Float32Array = new Float32Array(24); // 6个平面，每个4个分量
  private cullingEnabled = true;
  
  // 性能统计
  private stats = {
    totalTasks: 0,
    batchedTasks: 0,
    culledObjects: 0,
    gpuCommands: 0,
    frameTime: 0,
    preparationTime: 0,
    renderTime: 0
  };
  
  init(): void {
    this.initializeWorkers();
  }
  
  setRenderer(renderer: IRenderer): void {
    this.renderer = renderer;
  }
  
  /**
   * 初始化Web Workers
   */
  private initializeWorkers(): void {
    if (typeof Worker === 'undefined') {
      console.warn('Web Workers not supported, falling back to single-threaded rendering');
      return;
    }
    
    for (let i = 0; i < this.maxWorkers; i++) {
      try {
        // 创建内联Worker用于渲染准备工作
        const workerCode = `
          self.onmessage = function(e) {
            const { tasks, type } = e.data;
            
            switch(type) {
              case 'prepare':
                // 执行渲染准备工作（变换计算、剔除等）
                const results = tasks.map(task => {
                  return {
                    id: task.id,
                    prepared: true,
                    transforms: calculateTransforms(task.data),
                    visible: performCulling(task.data)
                  };
                });
                self.postMessage({ type: 'prepared', results });
                break;
            }
          };
          
          function calculateTransforms(data) {
            // 简化的变换计算
            return {
              matrix: [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, data.x || 0, data.y || 0, 0, 1]
            };
          }
          
          function performCulling(data) {
            // 简化的视锥剔除
            return true; // 暂时返回true
          }
        `;
        
        const blob = new Blob([workerCode], { type: 'application/javascript' });
        const worker = new Worker(URL.createObjectURL(blob));
        
        worker.onmessage = (e) => {
          this.handleWorkerMessage(i, e.data);
        };
        
        this.workers.push(worker);
        this.workerTasks.set(i, []);
      } catch (error) {
        console.warn('Failed to create worker:', error);
      }
    }
  }
  
  /**
   * 处理Worker消息
   */
  private handleWorkerMessage(workerId: number, data: { type: string; results?: unknown[] }): void {
    if (data.type === 'prepared') {
      // 处理准备完成的任务
      const tasks = this.workerTasks.get(workerId) || [];
      if (data.results) {
        tasks.forEach((task, index) => {
          const result = data.results?.[index] as { visible?: boolean };
          if (result && result.visible) {
            // 任务可见，添加到渲染队列
            this.addToRenderQueue(task);
          }
        });
      }
      this.workerTasks.set(workerId, []);
    }
  }
  
  /**
   * 添加渲染任务
   */
  addRenderTask(task: IRenderTask): void {
    this.renderTasks.push(task);
    this.stats.totalTasks++;
  }
  
  /**
   * 添加到渲染队列
   */
  private addToRenderQueue(task: IRenderTask): void {
    // 尝试批处理
    let batched = false;
    for (const batch of this.renderBatches) {
      if (batch.tasks.length > 0 && batch.tasks[0].canBatch(task)) {
        batch.tasks.push(task);
        batch.totalTime += task.estimatedTime;
        batched = true;
        this.stats.batchedTasks++;
        break;
      }
    }
    
    if (!batched) {
      this.renderBatches.push({
        tasks: [task],
        totalTime: task.estimatedTime,
        priority: task.priority
      });
    }
  }
  
  /**
   * 设置视锥平面（用于剔除）
   */
  setFrustumPlanes(planes: Float32Array): void {
    this.frustumPlanes.set(planes);
  }
  
  /**
   * 执行视锥剔除
   */
  private performFrustumCulling(tasks: IRenderTask[]): IRenderTask[] {
    if (!this.cullingEnabled) {
      return tasks;
    }
    
    const visibleTasks: IRenderTask[] = [];
    
    for (const task of tasks) {
      // 简化的AABB视锥剔除
      const bounds = this.getTaskBounds(task);
      if (this.isAABBInFrustum(bounds)) {
        visibleTasks.push(task);
      } else {
        this.stats.culledObjects++;
      }
    }
    
    return visibleTasks;
  }
  
  /**
   * 获取任务边界框
   */
  private getTaskBounds(_task: IRenderTask): { min: [number, number, number], max: [number, number, number] } {
    // 简化实现，实际应该从任务数据中获取
    return {
      min: [-1, -1, -1],
      max: [1, 1, 1]
    };
  }
  
  /**
   * AABB视锥剔除检测
   */
  private isAABBInFrustum(_bounds: { min: [number, number, number], max: [number, number, number] }): boolean {
    // 简化的视锥剔除实现
    // 实际应该检查AABB与6个视锥平面的关系
    return true; // 暂时返回true
  }
  
  /**
   * 生成GPU命令
   */
  private generateGPUCommands(batches: RenderBatch[]): void {
    if (!this.enableGPUDriven) {
      return;
    }
    
    this.gpuCommandBuffer = [];
    
    for (const batch of batches) {
      // 为每个批次生成GPU命令
      const command: GPUCommand = {
        type: 'draw',
        data: {
          batchId: batch.tasks[0].id,
          taskCount: batch.tasks.length,
          priority: batch.priority
        },
        dependencies: []
      };
      
      this.gpuCommandBuffer.push(command);
      this.stats.gpuCommands++;
    }
  }
  
  /**
   * 执行渲染管线
   */
  async executeRenderPipeline(): Promise<void> {
    if (!this.renderer) {
      return;
    }
    
    const frameStart = performance.now();
    
    // 1. 多线程准备阶段
    const prepStart = performance.now();
    await this.prepareRenderTasks();
    this.stats.preparationTime = performance.now() - prepStart;
    
    // 2. 视锥剔除
    const visibleTasks = this.performFrustumCulling(this.renderTasks);
    
    // 3. 任务批处理
    this.batchRenderTasks(visibleTasks);
    
    // 4. 生成GPU命令
    this.generateGPUCommands(this.renderBatches);
    
    // 5. 执行渲染
    const renderStart = performance.now();
    await this.executeRenderBatches();
    this.stats.renderTime = performance.now() - renderStart;
    
    // 6. 清理
    this.cleanup();
    
    this.stats.frameTime = performance.now() - frameStart;
  }
  
  /**
   * 多线程准备渲染任务
   */
  private async prepareRenderTasks(): Promise<void> {
    if (this.workers.length === 0) {
      return; // 无Worker支持，跳过多线程准备
    }
    
    const tasksPerWorker = Math.ceil(this.renderTasks.length / this.workers.length);
    const promises: Promise<void>[] = [];
    
    for (let i = 0; i < this.workers.length; i++) {
      const startIndex = i * tasksPerWorker;
      const endIndex = Math.min(startIndex + tasksPerWorker, this.renderTasks.length);
      const workerTasks = this.renderTasks.slice(startIndex, endIndex);
      
      if (workerTasks.length > 0) {
        this.workerTasks.set(i, workerTasks);
        
        const promise = new Promise<void>((resolve) => {
          const originalOnMessage = this.workers[i].onmessage;
          this.workers[i].onmessage = (e) => {
            if (originalOnMessage) {
              originalOnMessage.call(this.workers[i], e);
            }
            resolve();
          };
        });
        
        this.workers[i].postMessage({
          type: 'prepare',
          tasks: workerTasks.map(task => ({ id: task.id, data: {} }))
        });
        
        promises.push(promise);
      }
    }
    
    await Promise.all(promises);
  }
  
  /**
   * 批处理渲染任务
   */
  private batchRenderTasks(tasks: IRenderTask[]): void {
    this.renderBatches = [];
    
    // 按优先级排序
    tasks.sort((a, b) => b.priority - a.priority);
    
    for (const task of tasks) {
      this.addToRenderQueue(task);
    }
    
    // 按优先级排序批次
    this.renderBatches.sort((a, b) => b.priority - a.priority);
  }
  
  /**
   * 执行渲染批次
   */
  private async executeRenderBatches(): Promise<void> {
    if (!this.renderer) {
      return;
    }
    
    for (const batch of this.renderBatches) {
      for (const task of batch.tasks) {
        await task.execute(this.renderer);
      }
    }
  }
  
  /**
   * 清理资源
   */
  private cleanup(): void {
    this.renderTasks = [];
    this.renderBatches = [];
    this.gpuCommandBuffer = [];
  }
  
  /**
   * 获取性能统计
   */
  getStats() {
    return { ...this.stats };
  }
  
  /**
   * 重置统计
   */
  resetStats(): void {
    this.stats = {
      totalTasks: 0,
      batchedTasks: 0,
      culledObjects: 0,
      gpuCommands: 0,
      frameTime: 0,
      preparationTime: 0,
      renderTime: 0
    };
  }
  
  /**
   * 销毁系统
   */
  dispose(): void {
    // 终止所有Workers
    for (const worker of this.workers) {
      worker.terminate();
    }
    this.workers = [];
    this.workerTasks.clear();
    
    this.cleanup();
  }
}