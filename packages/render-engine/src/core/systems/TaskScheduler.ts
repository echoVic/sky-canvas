/**
 * 任务调度器
 * 管理渲染任务的并发执行和依赖关系
 */

import { RenderTask, TaskSchedulerStats } from './RenderPipelineTypes';

/**
 * 任务调度器
 */
export class TaskScheduler {
  private tasks = new Map<string, RenderTask>();
  private runningTasks = new Set<string>();
  private completedTasks = new Set<string>();
  private maxConcurrent: number;

  constructor(maxConcurrent: number = 4) {
    this.maxConcurrent = maxConcurrent;
  }

  /**
   * 添加任务
   */
  addTask(task: RenderTask): void {
    this.tasks.set(task.id, task);
  }

  /**
   * 执行任务
   */
  async executeTasks(): Promise<void> {
    const readyTasks = this.getReadyTasks();
    const promises: Promise<void>[] = [];

    for (const task of readyTasks) {
      if (this.runningTasks.size >= this.maxConcurrent) {
        break;
      }

      promises.push(this.executeTask(task));
    }

    if (promises.length > 0) {
      await Promise.all(promises);

      // 递归执行剩余任务
      if (this.hasRemainingTasks()) {
        await this.executeTasks();
      }
    }
  }

  /**
   * 获取就绪的任务
   */
  private getReadyTasks(): RenderTask[] {
    const ready: RenderTask[] = [];

    for (const task of this.tasks.values()) {
      if (task.status === 'pending' && this.areDependenciesMet(task)) {
        ready.push(task);
      }
    }

    // 按优先级排序
    return ready.sort((a, b) => b.priority - a.priority);
  }

  /**
   * 检查依赖是否满足
   */
  private areDependenciesMet(task: RenderTask): boolean {
    return task.dependencies.every(dep => this.completedTasks.has(dep));
  }

  /**
   * 执行单个任务
   */
  private async executeTask(task: RenderTask): Promise<void> {
    this.runningTasks.add(task.id);
    task.status = 'running';

    const startTime = performance.now();

    try {
      await task.execute();
      task.status = 'completed';
      task.actualTime = performance.now() - startTime;

      this.completedTasks.add(task.id);
      task.onComplete?.();
    } catch (error) {
      task.status = 'failed';
      task.onError?.(error as Error);
      throw error;
    } finally {
      this.runningTasks.delete(task.id);
    }
  }

  /**
   * 检查是否有剩余任务
   */
  private hasRemainingTasks(): boolean {
    return Array.from(this.tasks.values()).some(task =>
      task.status === 'pending' && this.areDependenciesMet(task)
    );
  }

  /**
   * 重置调度器
   */
  reset(): void {
    this.tasks.clear();
    this.runningTasks.clear();
    this.completedTasks.clear();
  }

  /**
   * 设置最大并发数
   */
  setMaxConcurrent(max: number): void {
    this.maxConcurrent = Math.max(1, max);
  }

  /**
   * 获取最大并发数
   */
  getMaxConcurrent(): number {
    return this.maxConcurrent;
  }

  /**
   * 获取统计信息
   */
  getStats(): TaskSchedulerStats {
    const tasks = Array.from(this.tasks.values());
    const completed = tasks.filter(t => t.status === 'completed');
    const failed = tasks.filter(t => t.status === 'failed');

    const totalTime = completed.reduce((sum, t) => sum + (t.actualTime || 0), 0);
    const averageTime = completed.length > 0 ? totalTime / completed.length : 0;

    return {
      totalTasks: tasks.length,
      completedTasks: completed.length,
      runningTasks: this.runningTasks.size,
      failedTasks: failed.length,
      averageExecutionTime: averageTime
    };
  }
}
