/**
 * 字体加载器实现
 * 支持Web字体加载、进度追踪、错误处理和回退机制
 */

import EventEmitter3 from 'eventemitter3';
import {
  FontSource,
  FontConfig,
  FontLoadingOptions,
  FontLoadingProgress,
  FontLoadingState,
  FontError,
  FontErrorCode,
  IFontLoader,
  FontFormat,
  FontDisplayStrategy
} from './types/FontTypes';

interface LoadingTask {
  id: string;
  source: FontSource;
  options: FontLoadingOptions;
  fontFace: FontFace;
  abortController: AbortController;
  startTime: number;
  progress: FontLoadingProgress;
  promise: Promise<ArrayBuffer>;
  resolve: (buffer: ArrayBuffer) => void;
  reject: (error: Error) => void;
}

interface FontLoaderEvents {
  'progress': { id: string; progress: FontLoadingProgress };
  'loaded': { id: string; buffer: ArrayBuffer };
  'error': { id: string; error: FontError };
  'started': { id: string; source: FontSource };
  'cancelled': { id: string };
}

export class FontLoader extends EventEmitter3 implements IFontLoader {
  private loadingTasks = new Map<string, LoadingTask>();
  private loadedFonts = new Map<string, ArrayBuffer>();
  private cache = new Map<string, ArrayBuffer>();
  private maxCacheSize = 50 * 1024 * 1024; // 50MB
  private currentCacheSize = 0;

  /**
   * 加载字体资源
   */
  async load(source: FontSource, options: FontLoadingOptions = {}): Promise<ArrayBuffer> {
    const id = this.generateLoadingId(source);
    
    // 检查缓存
    const cached = this.cache.get(id);
    if (cached) {
      return cached;
    }

    // 检查是否已经在加载中
    const existingTask = this.loadingTasks.get(id);
    if (existingTask) {
      return existingTask.promise;
    }

    return this.startLoading(id, source, options);
  }

  /**
   * 开始字体加载
   */
  private async startLoading(
    id: string, 
    source: FontSource, 
    options: FontLoadingOptions
  ): Promise<ArrayBuffer> {
    const abortController = new AbortController();
    
    // 如果外部提供了 AbortSignal，级联取消
    if (options.signal) {
      options.signal.addEventListener('abort', () => {
        abortController.abort();
      });
    }

    let resolve: (buffer: ArrayBuffer) => void;
    let reject: (error: Error) => void;
    
    const promise = new Promise<ArrayBuffer>((res, rej) => {
      resolve = res;
      reject = rej;
    });

    // 创建 FontFace 对象
    const fontFace = this.createFontFace(source, options);
    
    const task: LoadingTask = {
      id,
      source,
      options,
      fontFace,
      abortController,
      startTime: performance.now(),
      progress: {
        loaded: 0,
        total: 0,
        percentage: 0,
        bytesLoaded: 0,
        bytesTotal: 0,
        speed: 0,
        remainingTime: undefined
      },
      promise,
      resolve: resolve!,
      reject: reject!
    };

    this.loadingTasks.set(id, task);
    this.emit('started', { id, source });

    try {
      // 设置超时
      const timeout = options.timeout || 30000;
      const timeoutId = setTimeout(() => {
        this.cancelLoading(id, new FontError(
          `Font loading timeout: ${source.url}`,
          FontErrorCode.TIMEOUT,
          undefined,
          source
        ));
      }, timeout);

      // 开始加载
      const buffer = await this.performLoad(task);
      
      clearTimeout(timeoutId);
      
      // 缓存结果
      this.cacheFont(id, buffer);
      
      // 清理任务
      this.loadingTasks.delete(id);
      
      this.emit('loaded', { id, buffer });
      task.resolve(buffer);
      
      return buffer;
      
    } catch (error) {
      this.loadingTasks.delete(id);
      const fontError = error instanceof FontError 
        ? error 
        : new FontError(
            `Font loading failed: ${source.url}`,
            FontErrorCode.LOAD_FAILED,
            undefined,
            source
          );
      
      this.emit('error', { id, error: fontError });
      task.reject(fontError);
      throw fontError;
    }
  }

  /**
   * 执行实际的字体加载
   */
  private async performLoad(task: LoadingTask): Promise<ArrayBuffer> {
    const { source, fontFace, abortController } = task;

    try {
      // 使用 FontFace API 加载字体
      await fontFace.load();

      if (abortController.signal.aborted) {
        throw new FontError(
          'Font loading was cancelled',
          FontErrorCode.CANCELLED,
          undefined,
          source
        );
      }

      // 获取字体数据
      const response = await fetch(source.url, {
        signal: abortController.signal
      });

      if (!response.ok) {
        throw new FontError(
          `HTTP ${response.status}: ${response.statusText}`,
          FontErrorCode.NETWORK_ERROR,
          undefined,
          source
        );
      }

      const contentLength = response.headers.get('content-length');
      const total = contentLength ? parseInt(contentLength, 10) : 0;

      task.progress.total = total;
      task.progress.bytesTotal = total;

      if (!response.body) {
        throw new FontError(
          'Response body is null',
          FontErrorCode.NETWORK_ERROR,
          undefined,
          source
        );
      }

      return this.readWithProgress(response.body.getReader(), task);

    } catch (error) {
      if (error instanceof FontError) {
        throw error;
      }

      if (error instanceof DOMException && error.name === 'AbortError') {
        throw new FontError(
          'Font loading was cancelled',
          FontErrorCode.CANCELLED,
          undefined,
          source
        );
      }

      if (error instanceof Error && error.message.includes('network')) {
        throw new FontError(
          `Network error: ${error.message}`,
          FontErrorCode.NETWORK_ERROR,
          undefined,
          source
        );
      }

      throw new FontError(
        `Parse error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        FontErrorCode.PARSE_ERROR,
        undefined,
        source
      );
    }
  }

  /**
   * 带进度的数据读取
   */
  private async readWithProgress(
    reader: ReadableStreamDefaultReader<Uint8Array>,
    task: LoadingTask
  ): Promise<ArrayBuffer> {
    const chunks: Uint8Array[] = [];
    let loaded = 0;

    while (true) {
      const { done, value } = await reader.read();

      if (task.abortController.signal.aborted) {
        throw new FontError(
          'Font loading was cancelled',
          FontErrorCode.CANCELLED,
          undefined,
          task.source
        );
      }

      if (done) break;

      chunks.push(value);
      loaded += value.length;

      // 更新进度
      this.updateProgress(task, loaded);
    }

    // 合并所有数据块
    const totalLength = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
    const result = new ArrayBuffer(totalLength);
    const view = new Uint8Array(result);
    
    let offset = 0;
    for (const chunk of chunks) {
      view.set(chunk, offset);
      offset += chunk.length;
    }

    return result;
  }

  /**
   * 更新加载进度
   */
  private updateProgress(task: LoadingTask, loaded: number): void {
    const { progress } = task;
    const now = performance.now();
    const elapsed = (now - task.startTime) / 1000; // 秒

    progress.loaded = loaded;
    progress.bytesLoaded = loaded;
    progress.percentage = progress.total > 0 ? (loaded / progress.total) * 100 : 0;
    
    // 计算速度
    if (elapsed > 0) {
      progress.speed = loaded / elapsed;
      
      // 估算剩余时间
      if (progress.speed > 0 && progress.total > 0) {
        const remaining = progress.total - loaded;
        progress.remainingTime = remaining / progress.speed;
      }
    }

    // 触发进度事件
    this.emit('progress', { id: task.id, progress: { ...progress } });
    
    // 调用用户回调
    if (task.options.onProgress) {
      task.options.onProgress(progress);
    }
  }

  /**
   * 创建 FontFace 对象
   */
  private createFontFace(source: FontSource, options: FontLoadingOptions): FontFace {
    const descriptors: FontFaceDescriptors = {};

    if (source.weight) {
      descriptors.weight = source.weight.toString();
    }
    if (source.style) {
      descriptors.style = source.style;
    }
    if (source.stretch) {
      descriptors.stretch = source.stretch;
    }
    if (options.display) {
      descriptors.display = options.display;
    }

    return new FontFace('temp-font', `url(${source.url})`, descriptors);
  }

  /**
   * 缓存字体数据
   */
  private cacheFont(id: string, buffer: ArrayBuffer): void {
    const size = buffer.byteLength;
    
    // 检查缓存大小限制
    while (this.currentCacheSize + size > this.maxCacheSize && this.cache.size > 0) {
      // 删除最旧的条目（简单的FIFO策略）
      const firstKey = this.cache.keys().next().value;
      if (firstKey) {
        const oldBuffer = this.cache.get(firstKey);
        if (oldBuffer) {
          this.currentCacheSize -= oldBuffer.byteLength;
        }
        this.cache.delete(firstKey);
      }
    }

    this.cache.set(id, buffer);
    this.currentCacheSize += size;
  }

  /**
   * 生成加载ID
   */
  private generateLoadingId(source: FontSource): string {
    const params = [
      source.url,
      source.format,
      source.weight?.toString() || '',
      source.style || '',
      source.stretch || ''
    ].join('|');
    
    return btoa(params).replace(/[/+=]/g, '');
  }

  /**
   * 取消字体加载
   */
  cancel(url: string): void {
    for (const [id, task] of this.loadingTasks.entries()) {
      if (task.source.url === url) {
        this.cancelLoading(id, new FontError(
          'Font loading cancelled by user',
          FontErrorCode.CANCELLED,
          undefined,
          task.source
        ));
      }
    }
  }

  /**
   * 取消特定的加载任务
   */
  private cancelLoading(id: string, error: FontError): void {
    const task = this.loadingTasks.get(id);
    if (task) {
      task.abortController.abort();
      this.loadingTasks.delete(id);
      this.emit('cancelled', { id });
      task.reject(error);
    }
  }

  /**
   * 检查是否支持特定格式
   */
  supports(format: FontFormat): boolean {
    if (!('FontFace' in window)) {
      return false;
    }

    // 基本格式支持检查
    const supportedFormats: Record<FontFormat, boolean> = {
      [FontFormat.WOFF2]: this.checkFormatSupport('woff2'),
      [FontFormat.WOFF]: this.checkFormatSupport('woff'),
      [FontFormat.TTF]: this.checkFormatSupport('truetype'),
      [FontFormat.OTF]: this.checkFormatSupport('opentype'),
      [FontFormat.EOT]: false, // 现代浏览器通常不支持EOT
      [FontFormat.SVG]: false  // SVG字体已被废弃
    };

    return supportedFormats[format] || false;
  }

  /**
   * 检查格式支持
   */
  private checkFormatSupport(format: string): boolean {
    try {
      // 创建测试用的 data URL
      const testDataUrl = `data:font/${format};base64,`;
      new FontFace('test', testDataUrl);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * 获取加载进度
   */
  getLoadingProgress(url: string): FontLoadingProgress | null {
    for (const task of this.loadingTasks.values()) {
      if (task.source.url === url) {
        return { ...task.progress };
      }
    }
    return null;
  }

  /**
   * 清理缓存
   */
  clearCache(): void {
    this.cache.clear();
    this.currentCacheSize = 0;
  }

  /**
   * 获取缓存统计信息
   */
  getCacheStats() {
    return {
      size: this.cache.size,
      memoryUsage: this.currentCacheSize,
      maxSize: this.maxCacheSize
    };
  }

  /**
   * 销毁加载器
   */
  dispose(): void {
    // 取消所有进行中的加载
    for (const [id, task] of this.loadingTasks.entries()) {
      task.abortController.abort();
    }
    
    this.loadingTasks.clear();
    this.clearCache();
    this.removeAllListeners();
  }
}

/**
 * 创建默认字体加载器
 */
export function createFontLoader(): FontLoader {
  return new FontLoader();
}

/**
 * 字体加载工具函数
 */
export class FontLoadingUtils {
  /**
   * 检测系统字体可用性
   */
  static async detectSystemFont(family: string): Promise<boolean> {
    if (!('FontFace' in window)) {
      return false;
    }

    try {
      const testText = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
      const fallbackFamily = 'monospace';
      
      // 创建测试元素
      const testElement = document.createElement('div');
      testElement.style.position = 'absolute';
      testElement.style.left = '-9999px';
      testElement.style.fontSize = '72px';
      testElement.textContent = testText;
      
      // 测试fallback字体
      testElement.style.fontFamily = fallbackFamily;
      document.body.appendChild(testElement);
      const fallbackWidth = testElement.offsetWidth;
      
      // 测试目标字体
      testElement.style.fontFamily = `${family}, ${fallbackFamily}`;
      const targetWidth = testElement.offsetWidth;
      
      document.body.removeChild(testElement);
      
      // 如果宽度不同，说明字体可用
      return targetWidth !== fallbackWidth;
    } catch {
      return false;
    }
  }

  /**
   * 获取最佳字体格式
   */
  static getBestFontFormat(sources: FontSource[]): FontSource | null {
    const formatPriority = [
      FontFormat.WOFF2,
      FontFormat.WOFF,
      FontFormat.TTF,
      FontFormat.OTF
    ];

    for (const format of formatPriority) {
      const source = sources.find(s => s.format === format);
      if (source) {
        return source;
      }
    }

    return sources[0] || null;
  }

  /**
   * 预连接到字体服务器
   */
  static preconnectToFontServer(url: string): void {
    try {
      const urlObj = new URL(url);
      const origin = urlObj.origin;
      
      // 检查是否已经存在预连接
      const existing = document.querySelector(`link[rel="preconnect"][href="${origin}"]`);
      if (existing) return;
      
      const link = document.createElement('link');
      link.rel = 'preconnect';
      link.href = origin;
      link.crossOrigin = 'anonymous';
      
      document.head.appendChild(link);
    } catch {
      // 忽略URL解析错误
    }
  }
}