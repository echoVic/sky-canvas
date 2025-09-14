/**
 * 异步资源加载器
 * 支持现代 Promise/async-await 模式，提供加载进度回调和错误重试机制
 */

import { EventEmitter } from 'eventemitter3';

/**
 * 资源类型定义
 */
export enum ResourceType {
  TEXTURE = 'texture',
  FONT = 'font',
  AUDIO = 'audio',
  JSON = 'json',
  BINARY = 'binary',
  SVG = 'svg'
}

/**
 * 加载状态
 */
export enum LoadingState {
  PENDING = 'pending',
  LOADING = 'loading',
  LOADED = 'loaded',
  ERROR = 'error',
  CANCELLED = 'cancelled'
}

/**
 * 加载进度信息
 */
export interface LoadingProgress {
  loaded: number;
  total: number;
  percentage: number;
  speed?: number; // bytes per second
  remainingTime?: number; // seconds
}

/**
 * 资源配置
 */
export interface ResourceConfig {
  id: string;
  url: string;
  type: ResourceType;
  priority?: number; // 0-100, 100 为最高优先级
  timeout?: number; // 超时时间（毫秒）
  retries?: number; // 重试次数
  headers?: Record<string, string>;
  credentials?: RequestCredentials;
  crossOrigin?: string;
}

/**
 * 加载任务
 */
export interface LoadingTask {
  config: ResourceConfig;
  state: LoadingState;
  progress: LoadingProgress;
  data?: any;
  error?: Error;
  startTime: number;
  endTime?: number;
  promise: Promise<any>;
  cancel: () => void;
}

/**
 * 加载器事件
 */
export interface LoaderEvents {
  'taskStart': (task: LoadingTask) => void;
  'taskProgress': (task: LoadingTask, progress: LoadingProgress) => void;
  'taskComplete': (task: LoadingTask) => void;
  'taskError': (task: LoadingTask, error: Error) => void;
  'taskCancelled': (task: LoadingTask) => void;
  'batchStart': (batchId: string) => void;
  'batchProgress': (batchId: string, progress: LoadingProgress) => void;
  'batchComplete': (batchId: string) => void;
  'batchError': (batchId: string, error: Error) => void;
}

/**
 * 异步资源加载器
 */
export class AsyncResourceLoader extends EventEmitter {
  private tasks = new Map<string, LoadingTask>();
  private loadQueue: LoadingTask[] = [];
  private activeLoaders = new Set<string>();
  private abortController = new AbortController();

  // 加载器配置
  private readonly maxConcurrentLoads: number;
  private readonly defaultTimeout: number;
  private readonly defaultRetries: number;

  constructor(options: {
    maxConcurrentLoads?: number;
    defaultTimeout?: number;
    defaultRetries?: number;
  } = {}) {
    super();
    
    this.maxConcurrentLoads = options.maxConcurrentLoads ?? 6;
    this.defaultTimeout = options.defaultTimeout ?? 30000; // 30秒
    this.defaultRetries = options.defaultRetries ?? 3;
  }

  /**
   * 加载单个资源
   */
  async loadResource<T = any>(config: ResourceConfig): Promise<T> {
    // 标准化配置
    const normalizedConfig = this.normalizeConfig(config);
    const taskId = normalizedConfig.id;

    // 检查是否已存在任务
    const existingTask = this.tasks.get(taskId);
    if (existingTask) {
      if (existingTask.state === LoadingState.LOADED) {
        return existingTask.data;
      }
      if (existingTask.state === LoadingState.LOADING) {
        return existingTask.promise;
      }
    }

    // 创建加载任务
    const task = this.createTask(normalizedConfig);
    this.tasks.set(taskId, task);

    // 添加到队列并开始处理
    this.addToQueue(task);
    this.processQueue();

    return task.promise;
  }

  /**
   * 批量加载资源
   */
  async loadBatch(configs: ResourceConfig[], batchId?: string): Promise<any[]> {
    const id = batchId ?? `batch_${Date.now()}`;
    
    this.emit('batchStart', id);
    
    try {
      const promises = configs.map(config => this.loadResource(config));
      
      // 监听批次进度
      this.trackBatchProgress(id, configs.map(c => c.id));
      
      const results = await Promise.all(promises);
      
      this.emit('batchComplete', id);
      return results;
    } catch (error) {
      this.emit('batchError', id, error);
      throw error;
    }
  }

  /**
   * 预加载资源（静默加载，不阻塞）
   */
  preloadResource(config: ResourceConfig): Promise<any> {
    const preloadConfig = { ...config, priority: (config.priority ?? 0) - 50 };
    return this.loadResource(preloadConfig).catch(error => {
      console.warn(`Preload failed for ${config.id}:`, error);
      return null;
    });
  }

  /**
   * 取消资源加载
   */
  cancelResource(id: string): boolean {
    const task = this.tasks.get(id);
    if (!task) return false;

    if (task.state === LoadingState.LOADING || task.state === LoadingState.PENDING) {
      task.cancel();
      task.state = LoadingState.CANCELLED;
      this.emit('taskCancelled', task);
      return true;
    }

    return false;
  }

  /**
   * 取消所有加载任务
   */
  cancelAll(): void {
    this.abortController.abort();
    this.abortController = new AbortController();
    
    for (const [id, task] of this.tasks) {
      if (task.state === LoadingState.LOADING || task.state === LoadingState.PENDING) {
        task.state = LoadingState.CANCELLED;
        this.emit('taskCancelled', task);
      }
    }
    
    this.loadQueue = [];
    this.activeLoaders.clear();
  }

  /**
   * 获取加载任务信息
   */
  getTask(id: string): LoadingTask | null {
    return this.tasks.get(id) ?? null;
  }

  /**
   * 获取所有任务状态
   */
  getAllTasks(): LoadingTask[] {
    return Array.from(this.tasks.values());
  }

  /**
   * 获取加载统计
   */
  getStats() {
    const tasks = Array.from(this.tasks.values());
    const stats = {
      total: tasks.length,
      pending: 0,
      loading: 0,
      loaded: 0,
      error: 0,
      cancelled: 0,
      queueSize: this.loadQueue.length,
      activeLoaders: this.activeLoaders.size
    };

    for (const task of tasks) {
      stats[task.state]++;
    }

    return stats;
  }

  /**
   * 清理已完成的任务
   */
  cleanup(): void {
    const toRemove: string[] = [];
    
    for (const [id, task] of this.tasks) {
      if (task.state === LoadingState.LOADED || 
          task.state === LoadingState.ERROR || 
          task.state === LoadingState.CANCELLED) {
        toRemove.push(id);
      }
    }

    for (const id of toRemove) {
      this.tasks.delete(id);
    }
  }

  /**
   * 销毁加载器
   */
  dispose(): void {
    this.cancelAll();
    this.tasks.clear();
    this.removeAllListeners();
  }

  /**
   * 标准化配置
   */
  private normalizeConfig(config: ResourceConfig): ResourceConfig {
    return {
      priority: 50,
      timeout: this.defaultTimeout,
      retries: this.defaultRetries,
      credentials: 'same-origin',
      ...config
    };
  }

  /**
   * 创建加载任务
   */
  private createTask(config: ResourceConfig): LoadingTask {
    const progress: LoadingProgress = {
      loaded: 0,
      total: 0,
      percentage: 0
    };

    let cancelFn: (() => void) | null = null;
    
    const promise = new Promise<any>((resolve, reject) => {
      const controller = new AbortController();
      
      cancelFn = () => {
        controller.abort();
        reject(new Error('Loading cancelled'));
      };

      this.executeLoad(config, controller.signal, progress)
        .then(resolve)
        .catch(reject);
    });

    const task: LoadingTask = {
      config,
      state: LoadingState.PENDING,
      progress,
      startTime: Date.now(),
      promise,
      cancel: () => cancelFn?.()
    };

    return task;
  }

  /**
   * 添加到队列
   */
  private addToQueue(task: LoadingTask): void {
    // 按优先级排序插入
    const priority = task.config.priority!;
    let insertIndex = this.loadQueue.length;
    
    for (let i = 0; i < this.loadQueue.length; i++) {
      if (this.loadQueue[i].config.priority! < priority) {
        insertIndex = i;
        break;
      }
    }
    
    this.loadQueue.splice(insertIndex, 0, task);
  }

  /**
   * 处理加载队列
   */
  private processQueue(): void {
    while (this.activeLoaders.size < this.maxConcurrentLoads && this.loadQueue.length > 0) {
      const task = this.loadQueue.shift()!;
      if (task.state === LoadingState.PENDING) {
        this.startTask(task);
      }
    }
  }

  /**
   * 开始任务
   */
  private async startTask(task: LoadingTask): Promise<void> {
    const { config } = task;
    
    task.state = LoadingState.LOADING;
    this.activeLoaders.add(config.id);
    this.emit('taskStart', task);

    try {
      const result = await task.promise;
      task.data = result;
      task.state = LoadingState.LOADED;
      task.endTime = Date.now();
      this.emit('taskComplete', task);
    } catch (error) {
      task.error = error instanceof Error ? error : new Error(String(error));
      task.state = LoadingState.ERROR;
      task.endTime = Date.now();
      this.emit('taskError', task, error);
    } finally {
      this.activeLoaders.delete(config.id);
      this.processQueue();
    }
  }

  /**
   * 执行实际加载
   */
  private async executeLoad(
    config: ResourceConfig,
    signal: AbortSignal,
    progress: LoadingProgress
  ): Promise<any> {
    let lastTry = false;
    let retries = config.retries!;

    while (retries >= 0) {
      try {
        lastTry = retries === 0;
        return await this.performLoad(config, signal, progress);
      } catch (error) {
        if (signal.aborted || lastTry) {
          throw error;
        }
        retries--;
        
        // 重试延迟
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, config.retries! - retries) * 1000));
      }
    }

    throw new Error('Max retries exceeded');
  }

  /**
   * 执行具体加载逻辑
   */
  private async performLoad(
    config: ResourceConfig,
    signal: AbortSignal,
    progress: LoadingProgress
  ): Promise<any> {
    switch (config.type) {
      case ResourceType.TEXTURE:
        return this.loadTexture(config, signal, progress);
      case ResourceType.FONT:
        return this.loadFont(config, signal, progress);
      case ResourceType.AUDIO:
        return this.loadAudio(config, signal, progress);
      case ResourceType.JSON:
        return this.loadJSON(config, signal, progress);
      case ResourceType.BINARY:
        return this.loadBinary(config, signal, progress);
      case ResourceType.SVG:
        return this.loadSVG(config, signal, progress);
      default:
        throw new Error(`Unsupported resource type: ${config.type}`);
    }
  }

  /**
   * 加载纹理
   */
  private async loadTexture(
    config: ResourceConfig, 
    signal: AbortSignal,
    progress: LoadingProgress
  ): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      
      if (config.crossOrigin) {
        img.crossOrigin = config.crossOrigin;
      }

      const timeout = setTimeout(() => {
        reject(new Error(`Texture loading timeout: ${config.url}`));
      }, config.timeout);

      img.onload = () => {
        clearTimeout(timeout);
        progress.loaded = progress.total = img.naturalWidth * img.naturalHeight * 4;
        progress.percentage = 100;
        this.updateProgress(config.id, progress);
        resolve(img);
      };

      img.onerror = () => {
        clearTimeout(timeout);
        reject(new Error(`Failed to load texture: ${config.url}`));
      };

      signal.addEventListener('abort', () => {
        clearTimeout(timeout);
        img.src = '';
        reject(new Error('Loading cancelled'));
      });

      img.src = config.url;
    });
  }

  /**
   * 加载字体
   */
  private async loadFont(
    config: ResourceConfig,
    signal: AbortSignal,
    progress: LoadingProgress
  ): Promise<FontFace> {
    const response = await fetch(config.url, {
      signal,
      headers: config.headers,
      credentials: config.credentials
    });

    if (!response.ok) {
      throw new Error(`Font loading failed: ${response.statusText}`);
    }

    const buffer = await this.loadWithProgress(response, progress, config.id);
    const fontFace = new FontFace(config.id, buffer);
    await fontFace.load();
    
    return fontFace;
  }

  /**
   * 加载音频
   */
  private async loadAudio(
    config: ResourceConfig,
    signal: AbortSignal, 
    progress: LoadingProgress
  ): Promise<AudioBuffer> {
    const response = await fetch(config.url, {
      signal,
      headers: config.headers,
      credentials: config.credentials
    });

    if (!response.ok) {
      throw new Error(`Audio loading failed: ${response.statusText}`);
    }

    const buffer = await this.loadWithProgress(response, progress, config.id);
    
    // 需要 AudioContext 来解码
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    return audioContext.decodeAudioData(buffer);
  }

  /**
   * 加载 JSON
   */
  private async loadJSON(
    config: ResourceConfig,
    signal: AbortSignal,
    progress: LoadingProgress
  ): Promise<any> {
    const response = await fetch(config.url, {
      signal,
      headers: { 'Accept': 'application/json', ...config.headers },
      credentials: config.credentials
    });

    if (!response.ok) {
      throw new Error(`JSON loading failed: ${response.statusText}`);
    }

    await this.loadWithProgress(response.clone(), progress, config.id);
    return response.json();
  }

  /**
   * 加载二进制数据
   */
  private async loadBinary(
    config: ResourceConfig,
    signal: AbortSignal,
    progress: LoadingProgress
  ): Promise<ArrayBuffer> {
    const response = await fetch(config.url, {
      signal,
      headers: config.headers,
      credentials: config.credentials
    });

    if (!response.ok) {
      throw new Error(`Binary loading failed: ${response.statusText}`);
    }

    return this.loadWithProgress(response, progress, config.id);
  }

  /**
   * 加载 SVG
   */
  private async loadSVG(
    config: ResourceConfig,
    signal: AbortSignal,
    progress: LoadingProgress
  ): Promise<string> {
    const response = await fetch(config.url, {
      signal,
      headers: { 'Accept': 'image/svg+xml', ...config.headers },
      credentials: config.credentials
    });

    if (!response.ok) {
      throw new Error(`SVG loading failed: ${response.statusText}`);
    }

    await this.loadWithProgress(response.clone(), progress, config.id);
    return response.text();
  }

  /**
   * 带进度的加载
   */
  private async loadWithProgress(
    response: Response,
    progress: LoadingProgress,
    taskId: string
  ): Promise<ArrayBuffer> {
    const contentLength = response.headers.get('Content-Length');
    progress.total = contentLength ? parseInt(contentLength) : 0;
    
    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error('Unable to read response body');
    }

    const chunks: Uint8Array[] = [];
    let receivedLength = 0;
    const startTime = Date.now();

    while (true) {
      const { done, value } = await reader.read();
      
      if (done) break;
      
      chunks.push(value);
      receivedLength += value.length;
      
      progress.loaded = receivedLength;
      progress.percentage = progress.total > 0 ? (receivedLength / progress.total) * 100 : 0;
      
      // 计算加载速度
      const elapsed = (Date.now() - startTime) / 1000;
      if (elapsed > 0) {
        progress.speed = receivedLength / elapsed;
        if (progress.total > 0) {
          progress.remainingTime = (progress.total - receivedLength) / progress.speed;
        }
      }
      
      this.updateProgress(taskId, progress);
    }

    // 合并所有chunks
    const result = new Uint8Array(receivedLength);
    let position = 0;
    for (const chunk of chunks) {
      result.set(chunk, position);
      position += chunk.length;
    }

    return result.buffer;
  }

  /**
   * 更新进度
   */
  private updateProgress(taskId: string, progress: LoadingProgress): void {
    const task = this.tasks.get(taskId);
    if (task) {
      task.progress = { ...progress };
      this.emit('taskProgress', task, progress);
    }
  }

  /**
   * 跟踪批次进度
   */
  private trackBatchProgress(batchId: string, taskIds: string[]): void {
    const updateBatchProgress = () => {
      const tasks = taskIds.map(id => this.tasks.get(id)).filter(Boolean) as LoadingTask[];
      
      const totalProgress = tasks.reduce((sum, task) => sum + task.progress.percentage, 0);
      const averageProgress = totalProgress / tasks.length || 0;
      
      const totalLoaded = tasks.reduce((sum, task) => sum + task.progress.loaded, 0);
      const totalSize = tasks.reduce((sum, task) => sum + task.progress.total, 0);
      
      const batchProgress: LoadingProgress = {
        loaded: totalLoaded,
        total: totalSize,
        percentage: averageProgress
      };
      
      this.emit('batchProgress', batchId, batchProgress);
    };

    // 监听所有相关任务的进度更新
    const progressHandler = (task: LoadingTask) => {
      if (taskIds.includes(task.config.id)) {
        updateBatchProgress();
      }
    };

    this.on('taskProgress', progressHandler);
    this.on('taskComplete', progressHandler);
    this.on('taskError', progressHandler);
    this.on('taskCancelled', progressHandler);
  }
}

// 全局实例
let globalLoader: AsyncResourceLoader | null = null;

/**
 * 获取全局资源加载器
 */
export function getResourceLoader(): AsyncResourceLoader {
  if (!globalLoader) {
    globalLoader = new AsyncResourceLoader();
  }
  return globalLoader;
}

/**
 * 设置全局资源加载器
 */
export function setResourceLoader(loader: AsyncResourceLoader): void {
  globalLoader = loader;
}