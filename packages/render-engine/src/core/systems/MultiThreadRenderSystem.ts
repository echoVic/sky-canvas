import { BaseSystem } from './SystemManager';
import { Extension, ExtensionType } from './ExtensionSystem';

/**
 * 渲染任务类型
 */
export enum RenderTaskType {
  GEOMETRY_PROCESSING = 'geometry_processing',
  TEXTURE_LOADING = 'texture_loading',
  SHADER_COMPILATION = 'shader_compilation',
  CULLING = 'culling',
  SORTING = 'sorting',
  BATCHING = 'batching'
}

/**
 * 渲染任务接口
 */
export interface RenderTask {
  id: string;
  type: RenderTaskType;
  priority: number;
  data: unknown;
  dependencies: string[];
  estimatedTime: number;
  createdAt: number;
}

/**
 * 任务结果接口
 */
export interface TaskResult {
  taskId: string;
  success: boolean;
  data?: unknown;
  error?: string;
  executionTime: number;
}

/**
 * Worker池配置
 */
interface WorkerPoolConfig {
  maxWorkers: number;
  taskQueueSize: number;
  workerIdleTimeout: number;
  enableTaskStealing: boolean;
  enableLoadBalancing: boolean;
}

/**
 * Worker状态
 */
interface WorkerState {
  id: string;
  worker: Worker;
  busy: boolean;
  currentTask: string | null;
  completedTasks: number;
  totalExecutionTime: number;
  lastActivity: number;
}

/**
 * 任务队列
 */
class TaskQueue {
  private tasks: RenderTask[] = [];
  private priorityMap = new Map<number, RenderTask[]>();
  
  enqueue(task: RenderTask): void {
    this.tasks.push(task);
    
    // 按优先级分组
    if (!this.priorityMap.has(task.priority)) {
      this.priorityMap.set(task.priority, []);
    }
    this.priorityMap.get(task.priority)!.push(task);
    
    // 保持队列排序
    this.tasks.sort((a, b) => b.priority - a.priority);
  }
  
  dequeue(): RenderTask | null {
    const task = this.tasks.shift();
    if (task) {
      const priorityTasks = this.priorityMap.get(task.priority)!;
      const index = priorityTasks.indexOf(task);
      if (index > -1) {
        priorityTasks.splice(index, 1);
      }
    }
    return task || null;
  }
  
  peek(): RenderTask | null {
    return this.tasks[0] || null;
  }
  
  size(): number {
    return this.tasks.length;
  }
  
  clear(): void {
    this.tasks = [];
    this.priorityMap.clear();
  }
  
  getTasksByPriority(priority: number): RenderTask[] {
    return this.priorityMap.get(priority) || [];
  }
}

/**
 * 依赖图管理器
 */
class DependencyGraph {
  private graph = new Map<string, Set<string>>();
  private inDegree = new Map<string, number>();
  
  addTask(taskId: string, dependencies: string[]): void {
    if (!this.graph.has(taskId)) {
      this.graph.set(taskId, new Set());
      this.inDegree.set(taskId, 0);
    }
    
    for (const dep of dependencies) {
      if (!this.graph.has(dep)) {
        this.graph.set(dep, new Set());
        this.inDegree.set(dep, 0);
      }
      
      this.graph.get(dep)!.add(taskId);
      this.inDegree.set(taskId, this.inDegree.get(taskId)! + 1);
    }
  }
  
  getReadyTasks(): string[] {
    const ready: string[] = [];
    for (const [taskId, degree] of this.inDegree.entries()) {
      if (degree === 0) {
        ready.push(taskId);
      }
    }
    return ready;
  }
  
  completeTask(taskId: string): string[] {
    const dependents = this.graph.get(taskId) || new Set();
    const newlyReady: string[] = [];
    
    for (const dependent of dependents) {
      const newDegree = this.inDegree.get(dependent)! - 1;
      this.inDegree.set(dependent, newDegree);
      
      if (newDegree === 0) {
        newlyReady.push(dependent);
      }
    }
    
    this.graph.delete(taskId);
    this.inDegree.delete(taskId);
    
    return newlyReady;
  }
  
  clear(): void {
    this.graph.clear();
    this.inDegree.clear();
  }
}

/**
 * 多线程渲染系统
 */
@Extension({
  type: ExtensionType.RenderSystem,
  name: 'multi-thread-render-system',
  priority: 900
})
export class MultiThreadRenderSystem extends BaseSystem {
  readonly name = 'multi-thread-render-system';
  readonly priority = 900;
  
  private config: WorkerPoolConfig = {
    maxWorkers: Math.min(navigator.hardwareConcurrency || 4, 8),
    taskQueueSize: 1000,
    workerIdleTimeout: 30000, // 30秒
    enableTaskStealing: true,
    enableLoadBalancing: true
  };
  
  private workers: WorkerState[] = [];
  private taskQueue = new TaskQueue();
  private dependencyGraph = new DependencyGraph();
  private pendingTasks = new Map<string, RenderTask>();
  private completedTasks = new Map<string, TaskResult>();
  
  // 性能统计
  private stats = {
    totalTasks: 0,
    completedTasks: 0,
    failedTasks: 0,
    averageExecutionTime: 0,
    workerUtilization: 0,
    queueLength: 0
  };
  
  // 负载均衡
  private loadBalancer = {
    lastAssignedWorker: 0,
    workerLoads: new Map<string, number>()
  };
  
  init(): void {
    this.initializeWorkers();
    this.startLoadBalancing();
    this.startWorkerMonitoring();
  }
  
  /**
   * 初始化Worker池
   */
  private initializeWorkers(): void {
    for (let i = 0; i < this.config.maxWorkers; i++) {
      const worker = this.createWorker();
      const workerState: WorkerState = {
        id: `worker-${i}`,
        worker,
        busy: false,
        currentTask: null,
        completedTasks: 0,
        totalExecutionTime: 0,
        lastActivity: Date.now()
      };
      
      this.workers.push(workerState);
      this.loadBalancer.workerLoads.set(workerState.id, 0);
      
      // 设置消息处理
      worker.onmessage = (e) => this.handleWorkerMessage(workerState, e);
      worker.onerror = (e) => this.handleWorkerError(workerState, e);
    }
  }
  
  /**
   * 创建Worker
   */
  private createWorker(): Worker {
    const workerCode = `
      // 渲染任务Worker代码
      class RenderWorker {
        constructor() {
          this.taskHandlers = new Map();
          this.initializeHandlers();
        }
        
        initializeHandlers() {
          this.taskHandlers.set('geometry_processing', this.processGeometry.bind(this));
          this.taskHandlers.set('texture_loading', this.loadTexture.bind(this));
          this.taskHandlers.set('shader_compilation', this.compileShader.bind(this));
          this.taskHandlers.set('culling', this.performCulling.bind(this));
          this.taskHandlers.set('sorting', this.sortObjects.bind(this));
          this.taskHandlers.set('batching', this.batchObjects.bind(this));
        }
        
        async executeTask(task) {
          const startTime = performance.now();
          
          try {
            const handler = this.taskHandlers.get(task.type);
            if (!handler) {
              throw new Error('Unknown task type: ' + task.type);
            }
            
            const result = await handler(task.data);
            const executionTime = performance.now() - startTime;
            
            return {
              taskId: task.id,
              success: true,
              data: result,
              executionTime
            };
          } catch (error) {
            const executionTime = performance.now() - startTime;
            
            return {
              taskId: task.id,
              success: false,
              error: error.message,
              executionTime
            };
          }
        }
        
        async processGeometry(data) {
          // 几何体处理逻辑
          await this.simulateWork(50);
          return { processedVertices: data.vertices?.length || 0 };
        }
        
        async loadTexture(data) {
          // 纹理加载逻辑
          await this.simulateWork(100);
          return { textureId: data.url, loaded: true };
        }
        
        async compileShader(data) {
          // 着色器编译逻辑
          await this.simulateWork(200);
          return { shaderId: data.id, compiled: true };
        }
        
        async performCulling(data) {
          // 视锥剔除逻辑
          await this.simulateWork(30);
          const visible = data.objects?.filter(() => Math.random() > 0.3) || [];
          return { visibleObjects: visible };
        }
        
        async sortObjects(data) {
          // 对象排序逻辑
          await this.simulateWork(20);
          const sorted = [...(data.objects || [])].sort((a, b) => (a.depth || 0) - (b.depth || 0));
          return { sortedObjects: sorted };
        }
        
        async batchObjects(data) {
          // 对象批处理逻辑
          await this.simulateWork(40);
          const batches = this.groupObjectsIntoBatches(data.objects || []);
          return { batches };
        }
        
        groupObjectsIntoBatches(objects) {
          const batches = [];
          const batchSize = 32;
          
          for (let i = 0; i < objects.length; i += batchSize) {
            batches.push(objects.slice(i, i + batchSize));
          }
          
          return batches;
        }
        
        simulateWork(ms) {
          return new Promise(resolve => setTimeout(resolve, ms));
        }
      }
      
      const worker = new RenderWorker();
      
      self.onmessage = async function(e) {
        const { type, task } = e.data;
        
        if (type === 'execute') {
          const result = await worker.executeTask(task);
          self.postMessage({ type: 'result', result });
        } else if (type === 'ping') {
          self.postMessage({ type: 'pong' });
        }
      };
    `;
    
    const blob = new Blob([workerCode], { type: 'application/javascript' });
    return new Worker(URL.createObjectURL(blob));
  }
  
  /**
   * 处理Worker消息
   */
  private handleWorkerMessage(workerState: WorkerState, e: MessageEvent): void {
    const { type, result } = e.data;
    
    if (type === 'result') {
      this.handleTaskResult(workerState, result);
    } else if (type === 'pong') {
      workerState.lastActivity = Date.now();
    }
  }
  
  /**
   * 处理Worker错误
   */
  private handleWorkerError(workerState: WorkerState, error: ErrorEvent): void {
    console.error(`Worker ${workerState.id} error:`, error);
    
    if (workerState.currentTask) {
      const taskResult: TaskResult = {
        taskId: workerState.currentTask,
        success: false,
        error: error.message,
        executionTime: 0
      };
      
      this.handleTaskResult(workerState, taskResult);
    }
  }
  
  /**
   * 处理任务结果
   */
  private handleTaskResult(workerState: WorkerState, result: TaskResult): void {
    workerState.busy = false;
    workerState.currentTask = null;
    workerState.completedTasks++;
    workerState.totalExecutionTime += result.executionTime;
    workerState.lastActivity = Date.now();
    
    // 更新负载
    const currentLoad = this.loadBalancer.workerLoads.get(workerState.id) || 0;
    this.loadBalancer.workerLoads.set(workerState.id, Math.max(0, currentLoad - 1));
    
    // 保存结果
    this.completedTasks.set(result.taskId, result);
    
    // 更新统计
    if (result.success) {
      this.stats.completedTasks++;
    } else {
      this.stats.failedTasks++;
    }
    
    this.stats.averageExecutionTime = 
      (this.stats.averageExecutionTime * (this.stats.completedTasks - 1) + result.executionTime) / 
      this.stats.completedTasks;
    
    // 处理依赖
    const newlyReady = this.dependencyGraph.completeTask(result.taskId);
    for (const taskId of newlyReady) {
      const task = this.pendingTasks.get(taskId);
      if (task) {
        this.taskQueue.enqueue(task);
        this.pendingTasks.delete(taskId);
      }
    }
    
    // 尝试分配新任务
    this.assignTaskToWorker(workerState);
  }
  
  /**
   * 提交渲染任务
   */
  submitTask(task: RenderTask): void {
    this.stats.totalTasks++;
    
    // 添加到依赖图
    this.dependencyGraph.addTask(task.id, task.dependencies);
    
    // 检查依赖
    if (task.dependencies.length === 0) {
      this.taskQueue.enqueue(task);
    } else {
      this.pendingTasks.set(task.id, task);
    }
    
    // 尝试分配任务
    this.tryAssignTasks();
  }
  
  /**
   * 尝试分配任务
   */
  private tryAssignTasks(): void {
    for (const worker of this.workers) {
      if (!worker.busy) {
        this.assignTaskToWorker(worker);
      }
    }
  }
  
  /**
   * 分配任务给Worker
   */
  private assignTaskToWorker(workerState: WorkerState): void {
    if (workerState.busy || this.taskQueue.size() === 0) {
      return;
    }
    
    const task = this.taskQueue.dequeue();
    if (!task) return;
    
    workerState.busy = true;
    workerState.currentTask = task.id;
    workerState.lastActivity = Date.now();
    
    // 更新负载
    const currentLoad = this.loadBalancer.workerLoads.get(workerState.id) || 0;
    this.loadBalancer.workerLoads.set(workerState.id, currentLoad + 1);
    
    // 发送任务给Worker
    workerState.worker.postMessage({
      type: 'execute',
      task
    });
  }
  
  /**
   * 开始负载均衡
   */
  private startLoadBalancing(): void {
    if (!this.config.enableLoadBalancing) return;
    
    setInterval(() => {
      this.performLoadBalancing();
    }, 5000); // 每5秒执行一次负载均衡
  }
  
  /**
   * 执行负载均衡
   */
  private performLoadBalancing(): void {
    if (!this.config.enableTaskStealing) return;
    
    const loads = Array.from(this.loadBalancer.workerLoads.entries())
      .map(([id, load]) => ({ id, load }))
      .sort((a, b) => a.load - b.load);
    
    const lightestWorker = loads[0];
    const heaviestWorker = loads[loads.length - 1];
    
    // 如果负载差异超过阈值，尝试任务窃取
    if (heaviestWorker.load - lightestWorker.load > 2) {
      this.attemptTaskStealing(lightestWorker.id, heaviestWorker.id);
    }
  }
  
  /**
   * 尝试任务窃取
   */
  private attemptTaskStealing(stealerId: string, victimId: string): void {
    // 简化的任务窃取逻辑
    // 在实际实现中，这里会涉及更复杂的任务重分配
    console.log(`Worker ${stealerId} attempting to steal task from ${victimId}`);
  }
  
  /**
   * 开始Worker监控
   */
  private startWorkerMonitoring(): void {
    setInterval(() => {
      this.monitorWorkers();
      this.updateStats();
    }, 1000); // 每秒监控一次
  }
  
  /**
   * 监控Worker状态
   */
  private monitorWorkers(): void {
    const now = Date.now();
    
    for (const worker of this.workers) {
      // 检查Worker是否响应
      if (now - worker.lastActivity > this.config.workerIdleTimeout) {
        this.pingWorker(worker);
      }
    }
  }
  
  /**
   * Ping Worker
   */
  private pingWorker(workerState: WorkerState): void {
    workerState.worker.postMessage({ type: 'ping' });
  }
  
  /**
   * 更新统计信息
   */
  private updateStats(): void {
    const busyWorkers = this.workers.filter(w => w.busy).length;
    this.stats.workerUtilization = busyWorkers / this.workers.length;
    this.stats.queueLength = this.taskQueue.size();
  }
  
  /**
   * 获取任务结果
   */
  getTaskResult(taskId: string): TaskResult | null {
    return this.completedTasks.get(taskId) || null;
  }
  
  /**
   * 等待任务完成
   */
  async waitForTask(taskId: string, timeout = 10000): Promise<TaskResult> {
    return new Promise((resolve, reject) => {
      const startTime = Date.now();
      
      const checkResult = () => {
        const result = this.completedTasks.get(taskId);
        if (result) {
          resolve(result);
          return;
        }
        
        if (Date.now() - startTime > timeout) {
          reject(new Error(`Task ${taskId} timeout`));
          return;
        }
        
        setTimeout(checkResult, 100);
      };
      
      checkResult();
    });
  }
  
  /**
   * 获取系统统计
   */
  getStats(): typeof this.stats {
    return { ...this.stats };
  }
  
  /**
   * 获取Worker状态
   */
  getWorkerStates(): WorkerState[] {
    return this.workers.map(w => ({
      id: w.id,
      worker: w.worker,
      busy: w.busy,
      currentTask: w.currentTask,
      completedTasks: w.completedTasks,
      totalExecutionTime: w.totalExecutionTime,
      lastActivity: w.lastActivity
    }));
  }
  
  /**
   * 清空任务队列
   */
  clearQueue(): void {
    this.taskQueue.clear();
    this.pendingTasks.clear();
    this.dependencyGraph.clear();
  }
  
  /**
   * 销毁系统
   */
  dispose(): void {
    // 终止所有Worker
    for (const worker of this.workers) {
      worker.worker.terminate();
    }
    
    this.workers = [];
    this.taskQueue.clear();
    this.pendingTasks.clear();
    this.completedTasks.clear();
    this.dependencyGraph.clear();
    this.loadBalancer.workerLoads.clear();
  }
}