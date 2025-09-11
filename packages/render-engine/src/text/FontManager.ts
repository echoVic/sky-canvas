/**
 * 字体管理器实现
 * 统一管理字体加载、缓存、回退和生命周期
 */

import { EventEmitter } from '../events/EventBus';
import {
  FontConfig,
  FontLoadingOptions,
  FontLoadingProgress,
  FontLoadingState,
  FontWeight,
  FontStyle,
  FontError,
  FontErrorCode,
  IFont,
  IFontManager,
  IFontLoader,
  IFontCache,
  FontEvents,
  FontMetrics,
  TextMetrics,
  CharacterMetrics,
  SystemFontInfo,
  FontFallbackConfig
} from './types/FontTypes';
import { FontLoader } from './FontLoader';

/**
 * 字体实现类
 */
class Font implements IFont {
  readonly id: string;
  readonly family: string;
  readonly config: FontConfig;
  state: FontLoadingState = FontLoadingState.UNLOADED;
  metrics?: FontMetrics;
  loadTime?: number;
  size: number = 0;

  private buffer?: ArrayBuffer;
  private fontFace?: FontFace;
  private measurementCanvas?: HTMLCanvasElement;
  private measurementContext?: CanvasRenderingContext2D;

  constructor(config: FontConfig) {
    this.family = config.family;
    this.config = config;
    this.id = this.generateId();
    this.initMeasurementCanvas();
  }

  private generateId(): string {
    const parts = [
      this.config.family,
      this.config.weight?.toString() || 'normal',
      this.config.style || 'normal',
      this.config.stretch || 'normal'
    ];
    return btoa(parts.join('|')).replace(/[/+=]/g, '');
  }

  private initMeasurementCanvas(): void {
    this.measurementCanvas = document.createElement('canvas');
    this.measurementCanvas.width = 1;
    this.measurementCanvas.height = 1;
    this.measurementContext = this.measurementCanvas.getContext('2d')!;
  }

  async load(options: FontLoadingOptions = {}): Promise<void> {
    if (this.state === FontLoadingState.LOADED) {
      return;
    }

    if (this.state === FontLoadingState.LOADING) {
      // 等待正在进行的加载
      return new Promise((resolve, reject) => {
        const checkState = () => {
          if (this.state === FontLoadingState.LOADED) {
            resolve();
          } else if (this.state === FontLoadingState.ERROR) {
            reject(new FontError('Font loading failed', FontErrorCode.LOAD_FAILED, this));
          } else {
            setTimeout(checkState, 100);
          }
        };
        checkState();
      });
    }

    this.state = FontLoadingState.LOADING;
    const startTime = performance.now();

    try {
      // 尝试加载字体源
      let lastError: Error | null = null;
      
      for (const source of this.config.sources) {
        try {
          const loader = new FontLoader();
          this.buffer = await loader.load(source, options);
          
          // 创建 FontFace 并添加到文档
          this.fontFace = new FontFace(
            this.config.family,
            this.buffer,
            {
              weight: this.config.weight?.toString(),
              style: this.config.style,
              stretch: this.config.stretch,
              display: this.config.display || 'swap'
            }
          );

          await this.fontFace.load();
          
          if (!document.fonts.check(`1em ${this.config.family}`)) {
            (document.fonts as any).add(this.fontFace);
          }

          this.size = this.buffer.byteLength;
          this.loadTime = performance.now() - startTime;
          this.state = FontLoadingState.LOADED;
          
          // 计算字体度量
          this.calculateMetrics();
          
          return;
        } catch (error) {
          lastError = error instanceof Error ? error : new Error('Unknown error');
          continue;
        }
      }

      // 所有源都失败了，尝试回退
      if (this.config.fallbacks && this.config.fallbacks.length > 0) {
        this.state = FontLoadingState.FALLBACK;
      } else {
        throw lastError || new Error('No font sources available');
      }
      
    } catch (error) {
      this.state = FontLoadingState.ERROR;
      throw new FontError(
        `Failed to load font ${this.config.family}`,
        FontErrorCode.LOAD_FAILED,
        this,
        this.config.sources[0]
      );
    }
  }

  unload(): void {
    if (this.fontFace && document.fonts.check(`1em ${this.config.family}`)) {
      (document.fonts as any).delete(this.fontFace);
    }
    
    this.fontFace = undefined;
    this.buffer = undefined;
    this.metrics = undefined;
    this.state = FontLoadingState.UNLOADED;
  }

  isLoaded(): boolean {
    return this.state === FontLoadingState.LOADED;
  }

  getMetrics(size: number): FontMetrics {
    if (!this.metrics) {
      this.calculateMetrics();
    }

    // 根据指定大小缩放度量
    const scale = size / (this.metrics?.size || 16);
    
    return {
      family: this.family,
      size: size,
      lineHeight: (this.metrics?.lineHeight || size * 1.2) * scale,
      ascent: (this.metrics?.ascent || size * 0.8) * scale,
      descent: (this.metrics?.descent || size * 0.2) * scale,
      capHeight: (this.metrics?.capHeight || size * 0.7) * scale,
      xHeight: (this.metrics?.xHeight || size * 0.5) * scale,
      baseline: (this.metrics?.baseline || 0) * scale,
      unitsPerEm: this.metrics?.unitsPerEm || 1000,
      boundingBox: {
        left: (this.metrics?.boundingBox.left || 0) * scale,
        top: (this.metrics?.boundingBox.top || 0) * scale,
        right: (this.metrics?.boundingBox.right || size) * scale,
        bottom: (this.metrics?.boundingBox.bottom || size) * scale
      }
    };
  }

  measureText(text: string, size: number): TextMetrics {
    if (!this.measurementContext) {
      throw new Error('Measurement context not available');
    }

    this.measurementContext.font = `${size}px ${this.family}`;
    const metrics = this.measurementContext.measureText(text);

    return {
      width: metrics.width,
      height: size,
      actualBoundingBoxLeft: metrics.actualBoundingBoxLeft || 0,
      actualBoundingBoxRight: metrics.actualBoundingBoxRight || metrics.width,
      actualBoundingBoxAscent: metrics.actualBoundingBoxAscent || size * 0.8,
      actualBoundingBoxDescent: metrics.actualBoundingBoxDescent || size * 0.2,
      fontBoundingBoxAscent: metrics.fontBoundingBoxAscent || size * 0.8,
      fontBoundingBoxDescent: metrics.fontBoundingBoxDescent || size * 0.2,
      emHeightAscent: metrics.emHeightAscent || size * 0.8,
      emHeightDescent: metrics.emHeightDescent || size * 0.2,
      hangingBaseline: metrics.hangingBaseline || size * 0.8,
      alphabeticBaseline: 0,
      ideographicBaseline: metrics.ideographicBaseline || size * 0.2
    };
  }

  measureCharacter(char: string, size: number): CharacterMetrics {
    const textMetrics = this.measureText(char, size);
    
    return {
      character: char,
      width: textMetrics.width,
      height: textMetrics.height,
      bearingX: textMetrics.actualBoundingBoxLeft,
      bearingY: textMetrics.actualBoundingBoxAscent,
      advance: textMetrics.width,
      boundingBox: {
        left: -textMetrics.actualBoundingBoxLeft,
        top: textMetrics.actualBoundingBoxAscent,
        right: textMetrics.actualBoundingBoxRight,
        bottom: -textMetrics.actualBoundingBoxDescent
      }
    };
  }

  getKerning(char1: string, char2: string, size: number): number {
    // 简单的字距调整计算
    const combinedWidth = this.measureText(char1 + char2, size).width;
    const individualWidth = this.measureText(char1, size).width + this.measureText(char2, size).width;
    return combinedWidth - individualWidth;
  }

  supports(char: string): boolean {
    if (!this.measurementContext) return false;
    
    // 检查字符是否被支持（非完美但实用的方法）
    const metrics1 = this.measureText(char, 16);
    const metrics2 = this.measureText('?', 16); // 替代字符
    
    return metrics1.width !== metrics2.width;
  }

  clone(): IFont {
    const cloned = new Font(this.config);
    cloned.state = this.state;
    cloned.metrics = this.metrics ? { ...this.metrics } : undefined;
    cloned.loadTime = this.loadTime;
    cloned.size = this.size;
    return cloned;
  }

  private calculateMetrics(): void {
    if (!this.measurementContext) return;

    const testSize = 100; // 使用较大的尺寸提高精度
    this.measurementContext.font = `${testSize}px ${this.family}`;

    // 使用多个测试字符来估算度量
    const testChars = {
      ascent: 'Ág',
      descent: 'gjpqy',
      capHeight: 'ABCDEFGH',
      xHeight: 'xzoacvs'
    };

    const ascentMetrics = this.measurementContext.measureText(testChars.ascent);
    const descentMetrics = this.measurementContext.measureText(testChars.descent);
    const capMetrics = this.measurementContext.measureText(testChars.capHeight);
    const xMetrics = this.measurementContext.measureText(testChars.xHeight);

    this.metrics = {
      family: this.family,
      size: testSize,
      lineHeight: testSize * 1.2,
      ascent: ascentMetrics.actualBoundingBoxAscent || testSize * 0.8,
      descent: descentMetrics.actualBoundingBoxDescent || testSize * 0.2,
      capHeight: capMetrics.actualBoundingBoxAscent || testSize * 0.7,
      xHeight: xMetrics.actualBoundingBoxAscent || testSize * 0.5,
      baseline: 0,
      unitsPerEm: 1000,
      boundingBox: {
        left: 0,
        top: ascentMetrics.actualBoundingBoxAscent || testSize * 0.8,
        right: testSize,
        bottom: -(descentMetrics.actualBoundingBoxDescent || testSize * 0.2)
      }
    };
  }
}

/**
 * 简单的字体缓存实现
 */
class FontCache implements IFontCache {
  private cache = new Map<string, { font: IFont; ttl: number }>();
  private stats = {
    hitCount: 0,
    missCount: 0,
    size: 0,
    memoryUsage: 0,
    itemCount: 0
  };

  get(key: string): IFont | null {
    const entry = this.cache.get(key);
    if (entry && (entry.ttl === 0 || Date.now() < entry.ttl)) {
      this.stats.hitCount++;
      return entry.font;
    }
    
    if (entry) {
      this.cache.delete(key);
      this.stats.itemCount--;
      this.stats.memoryUsage -= entry.font.size;
    }
    
    this.stats.missCount++;
    return null;
  }

  set(key: string, font: IFont, ttl?: number): void {
    const expirationTime = ttl ? Date.now() + ttl * 1000 : 0;
    this.cache.set(key, { font, ttl: expirationTime });
    
    this.stats.itemCount++;
    this.stats.memoryUsage += font.size;
    this.stats.size = this.cache.size;
  }

  has(key: string): boolean {
    return this.get(key) !== null;
  }

  delete(key: string): boolean {
    const entry = this.cache.get(key);
    if (entry) {
      this.stats.itemCount--;
      this.stats.memoryUsage -= entry.font.size;
      this.stats.size = this.cache.size;
    }
    return this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
    this.stats.itemCount = 0;
    this.stats.memoryUsage = 0;
    this.stats.size = 0;
  }

  getStats() {
    return {
      ...this.stats,
      hitRate: this.stats.hitCount / (this.stats.hitCount + this.stats.missCount) || 0
    };
  }

  cleanup(): void {
    const now = Date.now();
    const toDelete: string[] = [];
    
    for (const [key, entry] of this.cache.entries()) {
      if (entry.ttl > 0 && now >= entry.ttl) {
        toDelete.push(key);
      }
    }
    
    toDelete.forEach(key => this.delete(key));
  }
}

/**
 * 字体管理器实现
 */
export class FontManager extends EventEmitter<FontEvents> implements IFontManager {
  private fonts = new Map<string, IFont>();
  private cache: IFontCache;
  private loader: IFontLoader;
  private loadingPromises = new Map<string, Promise<IFont>>();

  constructor(cache?: IFontCache, loader?: IFontLoader) {
    super();
    this.cache = cache || new FontCache();
    this.loader = loader || new FontLoader();
  }

  async loadFont(config: FontConfig): Promise<IFont> {
    const key = this.generateFontKey(config.family, config.weight, config.style);
    
    // 检查缓存
    const cached = this.cache.get(key);
    if (cached && cached.isLoaded()) {
      return cached;
    }

    // 检查是否已经在加载中
    const existingPromise = this.loadingPromises.get(key);
    if (existingPromise) {
      return existingPromise;
    }

    // 开始加载
    const loadingPromise = this.performFontLoad(config);
    this.loadingPromises.set(key, loadingPromise);

    try {
      const font = await loadingPromise;
      this.fonts.set(key, font);
      this.cache.set(key, font, 3600); // 缓存1小时
      this.emit('loaded', { font });
      return font;
    } catch (error) {
      this.emit('error', { font: null, error: error as Error });
      throw error;
    } finally {
      this.loadingPromises.delete(key);
    }
  }

  private async performFontLoad(config: FontConfig): Promise<IFont> {
    const font = new Font(config);
    
    this.emit('loading', { font });

    try {
      await font.load();
      return font;
    } catch (error) {
      // 尝试回退字体
      if (config.fallbacks && config.fallbacks.length > 0) {
        const fallbackFont = await this.loadFallbackFont(config);
        if (fallbackFont) {
          this.emit('fallback', { font, fallbackFont });
          return fallbackFont;
        }
      }
      throw error;
    }
  }

  private async loadFallbackFont(config: FontConfig): Promise<IFont | null> {
    for (const fallbackFamily of config.fallbacks || []) {
      try {
        const fallbackConfig: FontConfig = {
          ...config,
          family: fallbackFamily,
          sources: [] // 系统字体无需sources
        };
        
        const fallbackFont = new Font(fallbackConfig);
        // 系统字体通常已可用，直接标记为已加载
        fallbackFont.state = FontLoadingState.LOADED;
        return fallbackFont;
      } catch {
        continue;
      }
    }
    return null;
  }

  getFont(family: string, weight?: FontWeight, style?: FontStyle): IFont | null {
    const key = this.generateFontKey(family, weight, style);
    return this.fonts.get(key) || this.cache.get(key);
  }

  getFallbackFont(family: string): IFont | null {
    // 查找系统默认回退字体
    const systemFallbacks = [
      'Arial',
      'Helvetica',
      'sans-serif',
      'serif',
      'monospace'
    ];

    for (const fallback of systemFallbacks) {
      const font = this.getFont(fallback);
      if (font && font.isLoaded()) {
        return font;
      }
    }

    return null;
  }

  hasFont(family: string): boolean {
    return Array.from(this.fonts.keys()).some(key => key.startsWith(`${family}|`));
  }

  unloadFont(family: string): void {
    const toDelete: string[] = [];
    
    for (const [key, font] of this.fonts.entries()) {
      if (key.startsWith(`${family}|`)) {
        font.unload();
        this.emit('unload', { font });
        toDelete.push(key);
      }
    }
    
    toDelete.forEach(key => {
      this.fonts.delete(key);
      this.cache.delete(key);
    });
  }

  async preloadFonts(configs: FontConfig[]): Promise<void> {
    const promises = configs.map(config => this.loadFont(config));
    await Promise.allSettled(promises);
  }

  getLoadedFonts(): IFont[] {
    return Array.from(this.fonts.values()).filter(font => font.isLoaded());
  }

  getLoadingProgress(family: string): FontLoadingProgress | null {
    // 委托给加载器
    return this.loader.getLoadingProgress(family);
  }

  clearCache(): void {
    this.cache.clear();
  }

  dispose(): void {
    // 卸载所有字体
    for (const font of this.fonts.values()) {
      font.unload();
    }
    
    this.fonts.clear();
    this.loadingPromises.clear();
    this.clearCache();
    this.removeAllListeners();
    
    if (this.loader && 'dispose' in this.loader) {
      (this.loader as any).dispose();
    }
  }

  private generateFontKey(family: string, weight?: FontWeight | string, style?: FontStyle): string {
    const parts = [
      family,
      weight?.toString() || 'normal',
      style || 'normal'
    ];
    return parts.join('|');
  }
}

/**
 * 创建默认字体管理器
 */
export function createFontManager(): FontManager {
  return new FontManager();
}

/**
 * 全局字体管理器实例
 */
export const globalFontManager = createFontManager();