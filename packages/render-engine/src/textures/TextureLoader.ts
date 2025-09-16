/**
 * 纹理加载器
 * 负责异步加载各种格式的纹理资源
 */

import EventEmitter3 from 'eventemitter3';
import { TextureAtlas, TextureInfo, AtlasEntry } from './TextureAtlas';

// 纹理加载状态
export enum TextureLoadState {
  PENDING = 'pending',
  LOADING = 'loading',
  LOADED = 'loaded',
  ERROR = 'error'
}

// 纹理加载任务
export interface TextureLoadTask {
  id: string;
  url: string;
  state: TextureLoadState;
  progress: number;
  error?: Error;
  data?: HTMLImageElement | ImageData | HTMLCanvasElement;
  priority: number;
  retryCount: number;
  maxRetries: number;
}

// 加载选项
export interface LoadOptions {
  priority?: number;
  maxRetries?: number;
  timeout?: number;
  crossOrigin?: string;
  addToAtlas?: boolean;
}

// 加载器事件
export interface LoaderEvents {
  taskStarted: TextureLoadTask;
  taskProgress: { task: TextureLoadTask; progress: number };
  taskCompleted: { task: TextureLoadTask; entry?: AtlasEntry };
  taskFailed: { task: TextureLoadTask; error: Error };
  queueEmpty: void;
}

// 纹理加载器事件接口
export interface TextureLoaderEvents {
  // 标准事件
  update: TextureLoader;
  destroy: TextureLoader;

  // 加载相关事件
  load: { url: string; entry: AtlasEntry };
  error: { url: string; error: Error };
  progress: { url: string; progress: number };
  queueEmpty: void;
  taskStarted: TextureLoadTask;
  taskCompleted: { task: TextureLoadTask; entry?: AtlasEntry };
  taskFailed: { task: TextureLoadTask; error: Error };
}

/**
 * 纹理加载器类
 */
export class TextureLoader extends EventEmitter3<TextureLoaderEvents> {
  private tasks = new Map<string, TextureLoadTask>();
  private loadQueue: TextureLoadTask[] = [];
  private activeLoads = new Set<string>();
  private atlas: TextureAtlas;
  
  private readonly MAX_CONCURRENT_LOADS = 6;
  private readonly DEFAULT_TIMEOUT = 10000;
  private readonly DEFAULT_MAX_RETRIES = 3;

  constructor(atlas?: TextureAtlas) {
    super();
    this.atlas = atlas || new TextureAtlas();
  }

  /**
   * 加载单个纹理
   */
  async loadTexture(url: string, options: LoadOptions = {}): Promise<AtlasEntry | HTMLImageElement> {
    const id = this.generateTextureId(url);
    
    // 检查是否已经在加载或已加载
    const existingTask = this.tasks.get(id);
    if (existingTask) {
      if (existingTask.state === TextureLoadState.LOADED && existingTask.data) {
        if (options.addToAtlas !== false) {
          const atlasEntry = this.atlas.getTexture(id);
          if (atlasEntry) {
            return atlasEntry;
          }
        }
        return existingTask.data as HTMLImageElement;
      } else if (existingTask.state === TextureLoadState.LOADING) {
        return this.waitForTask(existingTask) as Promise<AtlasEntry | HTMLImageElement>;
      }
    }

    // 创建加载任务
    const task: TextureLoadTask = {
      id,
      url,
      state: TextureLoadState.PENDING,
      progress: 0,
      priority: options.priority || 0,
      retryCount: 0,
      maxRetries: options.maxRetries || this.DEFAULT_MAX_RETRIES
    };

    this.tasks.set(id, task);
    this.addToQueue(task);

    return this.waitForTask(task) as Promise<AtlasEntry | HTMLImageElement>;
  }

  /**
   * 批量加载纹理
   */
  async loadTextures(urls: string[], options: LoadOptions = {}): Promise<Map<string, AtlasEntry | HTMLImageElement>> {
    const promises = urls.map(url => this.loadTexture(url, options));
    const results = await Promise.allSettled(promises);
    
    const resultMap = new Map<string, AtlasEntry | HTMLImageElement>();
    
    urls.forEach((url, index) => {
      const result = results[index];
      if (result.status === 'fulfilled') {
        resultMap.set(url, result.value);
      }
    });

    return resultMap;
  }

  /**
   * 预加载纹理
   */
  preloadTexture(url: string, options: LoadOptions = {}): void {
    this.loadTexture(url, { ...options, priority: -1 }).catch(error => {
      console.warn(`Failed to preload texture: ${url}`, error);
    });
  }

  /**
   * 取消加载任务
   */
  cancelLoad(url: string): boolean {
    const id = this.generateTextureId(url);
    const task = this.tasks.get(id);
    
    if (task && task.state !== TextureLoadState.LOADED) {
      task.state = TextureLoadState.ERROR;
      task.error = new Error('Load cancelled');
      
      // 从队列中移除
      const queueIndex = this.loadQueue.findIndex(t => t.id === id);
      if (queueIndex !== -1) {
        this.loadQueue.splice(queueIndex, 1);
      }
      
      this.activeLoads.delete(id);
      return true;
    }
    
    return false;
  }

  /**
   * 获取加载进度
   */
  getProgress(): { completed: number; total: number; percentage: number } {
    const total = this.tasks.size;
    const completed = Array.from(this.tasks.values())
      .filter(task => task.state === TextureLoadState.LOADED).length;
    
    return {
      completed,
      total,
      percentage: total > 0 ? (completed / total) * 100 : 0
    };
  }

  /**
   * 获取任务状态
   */
  getTaskState(url: string): TextureLoadState {
    const id = this.generateTextureId(url);
    const task = this.tasks.get(id);
    return task ? task.state : TextureLoadState.PENDING;
  }

  /**
   * 清理已完成的任务
   */
  cleanup(): void {
    const completedTasks = Array.from(this.tasks.entries())
      .filter(([, task]) => task.state === TextureLoadState.LOADED || 
                           task.state === TextureLoadState.ERROR);
    
    for (const [id] of completedTasks) {
      this.tasks.delete(id);
    }
  }

  /**
   * 添加任务到队列
   */
  private addToQueue(task: TextureLoadTask): void {
    // 按优先级排序插入
    let insertIndex = this.loadQueue.length;
    for (let i = 0; i < this.loadQueue.length; i++) {
      if (this.loadQueue[i].priority < task.priority) {
        insertIndex = i;
        break;
      }
    }
    
    this.loadQueue.splice(insertIndex, 0, task);
    this.processQueue();
  }

  /**
   * 处理加载队列
   */
  private processQueue(): void {
    while (this.activeLoads.size < this.MAX_CONCURRENT_LOADS && this.loadQueue.length > 0) {
      const task = this.loadQueue.shift()!;
      this.startLoad(task);
    }
  }

  /**
   * 开始加载任务
   */
  private async startLoad(task: TextureLoadTask): Promise<void> {
    if (this.activeLoads.has(task.id)) {
      return;
    }

    this.activeLoads.add(task.id);
    task.state = TextureLoadState.LOADING;

    this.emit('update', this);
    this.emit('taskStarted', task);

    try {
      const data = await this.loadImageData(task);
      task.data = data;
      task.state = TextureLoadState.LOADED;
      task.progress = 100;

      // 添加到纹理图集
      let entry: AtlasEntry | undefined;
      if (data) {
        const textureInfo: TextureInfo = {
          id: task.id,
          width: data.width,
          height: data.height,
          data: data,
          url: task.url
        };
        
        entry = this.atlas.addTexture(textureInfo) || undefined;
      }

      this.emit('load', { url: task.url, entry });
      this.emit('taskCompleted', { task, entry });

    } catch (error) {
      this.emit('taskFailed', { task, error: error as Error });
      await this.handleLoadError(task, error as Error);
    } finally {
      this.activeLoads.delete(task.id);
      
      // 处理下一个任务
      this.processQueue();
      
      // 检查队列是否为空
      if (this.loadQueue.length === 0 && this.activeLoads.size === 0) {
        this.emit('queueEmpty', undefined);
      }
    }
  }

  /**
   * 加载图像数据
   */
  private loadImageData(task: TextureLoadTask): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      
      // 设置超时
      const timeout = setTimeout(() => {
        reject(new Error(`Load timeout: ${task.url}`));
      }, this.DEFAULT_TIMEOUT);

      img.onload = () => {
        clearTimeout(timeout);
        task.progress = 100;
        this.emit('progress', { url: task.url, progress: 100 });
        resolve(img);
      };

      img.onerror = () => {
        clearTimeout(timeout);
        reject(new Error(`Failed to load image: ${task.url}`));
      };

      // 进度模拟（实际的进度监控需要更复杂的实现）
      const progressInterval = setInterval(() => {
        if (task.progress < 90) {
          task.progress += Math.random() * 20;
          this.emit('progress', { url: task.url, progress: task.progress });
        } else {
          clearInterval(progressInterval);
        }
      }, 100);

      img.crossOrigin = 'anonymous';
      img.src = task.url;
    });
  }

  /**
   * 处理加载错误
   */
  private async handleLoadError(task: TextureLoadTask, error: Error): Promise<void> {
    task.retryCount++;
    
    if (task.retryCount < task.maxRetries) {
      console.warn(`Retrying load for ${task.url} (${task.retryCount}/${task.maxRetries})`);
      
      // 延迟重试
      await new Promise(resolve => setTimeout(resolve, 1000 * task.retryCount));
      
      // 重新加载
      await this.startLoad(task);
    } else {
      task.state = TextureLoadState.ERROR;
      task.error = error;
      
      this.emit('error', { url: task.url, error });
    }
  }

  /**
   * 等待任务完成
   */
  private waitForTask(task: TextureLoadTask): Promise<AtlasEntry | HTMLImageElement | HTMLCanvasElement | ImageData> {
    return new Promise((resolve, reject) => {
      if (task.state === TextureLoadState.LOADED && task.data) {
        const atlasEntry = this.atlas.getTexture(task.id);
        resolve(atlasEntry || task.data);
        return;
      }

      if (task.state === TextureLoadState.ERROR) {
        reject(task.error);
        return;
      }

      // 监听加载完成
      const onLoad = (event: { url: string; entry: AtlasEntry }) => {
        if (event.url === task.url) {
          this.off('load', onLoad);
          this.off('error', onError);
          resolve(task.data!);
        }
      };

      const onError = (event: { url: string; error: Error }) => {
        if (event.url === task.url) {
          this.off('load', onLoad);
          this.off('error', onError);
          reject(event.error);
        }
      };

      this.on('load', onLoad);
      this.on('error', onError);
    });
  }

  /**
   * 生成纹理ID
   */
  private generateTextureId(url: string): string {
    // 使用URL的hash作为ID，确保同一URL的纹理只加载一次
    return `texture_${this.hashString(url)}`;
  }

  /**
   * 字符串哈希
   */
  private hashString(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // 转换为32位整数
    }
    return Math.abs(hash).toString(36);
  }

  /**
   * 销毁加载器
   */
  dispose(): void {
    // 1. 先发送 destroy 事件
    this.emit('destroy', this);

    // 2. 取消所有活动加载
    for (const taskId of this.activeLoads) {
      const task = this.tasks.get(taskId);
      if (task) {
        task.state = TextureLoadState.ERROR;
        task.error = new Error('Loader disposed');
      }
    }

    // 3. 清理资源
    this.tasks.clear();
    this.loadQueue = [];
    this.activeLoads.clear();

    // 4. 最后移除所有监听器
    this.removeAllListeners();
  }
}

// 全局纹理加载器实例
export const globalTextureLoader = new TextureLoader();