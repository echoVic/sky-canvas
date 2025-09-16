/**
 * 高级着色器管理系统
 * 提供着色器预编译、热重载、变体管理和性能优化
 */
import EventEmitter3 from 'eventemitter3';
import { IShaderProgram, ShaderCompilationError, ShaderProgramLinkError, ShaderType } from './ShaderManager';

/**
 * 着色器变体定义
 */
interface ShaderVariant {
  /** 变体名称 */
  name: string;
  /** 预处理器定义 */
  defines: Record<string, string | number | boolean>;
  /** 特性标记 */
  features: string[];
}

/**
 * 着色器模板
 */
interface ShaderTemplate {
  /** 模板ID */
  id: string;
  /** 顶点着色器模板 */
  vertexTemplate: string;
  /** 片元着色器模板 */
  fragmentTemplate: string;
  /** 支持的变体 */
  variants: ShaderVariant[];
  /** 默认uniform值 */
  defaultUniforms: Record<string, unknown>;
}

/**
 * 编译后的着色器程序缓存项
 */
interface CompiledShaderCache {
  program: IShaderProgram;
  lastUsed: number;
  useCount: number;
  compileTime: number;
  memoryUsage: number;
}

/**
 * 着色器性能指标
 */
interface ShaderMetrics {
  compileTime: number;
  linkTime: number;
  uniformSetCount: number;
  drawCallCount: number;
  lastUsed: number;
}

/**
 * 着色器管理器事件
 */
interface ShaderManagerEvents {
  'shader-compiled': { id: string; time: number };
  'shader-cache-hit': { id: string };
  'shader-cache-miss': { id: string };
  'shader-error': { id: string; error: Error };
  'cache-cleaned': { freedMemory: number };
  'hot-reload': { id: string; success: boolean };
}

/**
 * 高级着色器管理器配置
 */
interface AdvancedShaderConfig {
  /** 缓存大小限制（字节） */
  cacheMemoryLimit: number;
  /** 启用热重载 */
  enableHotReload: boolean;
  /** 预编译常用变体 */
  precompileCommonVariants: boolean;
  /** 异步编译 */
  enableAsyncCompilation: boolean;
  /** 缓存清理间隔（毫秒） */
  cacheCleanupInterval: number;
  /** 未使用着色器的过期时间（毫秒） */
  shaderExpirationTime: number;
}

/**
 * 着色器预处理器
 */
class ShaderPreprocessor {
  /**
   * 处理着色器源码，应用defines和includes
   */
  static process(source: string, defines: Record<string, string | number | boolean> = {}): string {
    let processed = source;
    
    // 处理#define指令
    for (const [key, value] of Object.entries(defines)) {
      const defineDirective = `#define ${key} ${value}\n`;
      processed = defineDirective + processed;
    }
    
    // 处理#include指令（简化实现）
    processed = this.processIncludes(processed);
    
    // 处理条件编译
    processed = this.processConditionalCompilation(processed, defines);
    
    return processed;
  }
  
  /**
   * 处理#include指令
   */
  private static processIncludes(source: string): string {
    const includeRegex = /#include\s+["<]([^">]+)[">]/g;
    
    return source.replace(includeRegex, (match, filename) => {
      // 在实际实现中，这里会从着色器库中加载文件
      // 目前返回空字符串作为占位符
      return `// Include: ${filename}\n`;
    });
  }
  
  /**
   * 处理条件编译
   */
  private static processConditionalCompilation(
    source: string, 
    defines: Record<string, string | number | boolean>
  ): string {
    // 简化的条件编译处理
    let processed = source;
    
    // 处理#ifdef指令
    const ifdefRegex = /#ifdef\s+(\w+)([\s\S]*?)(?:#endif|$)/g;
    processed = processed.replace(ifdefRegex, (match, define, content) => {
      return defines[define] !== undefined ? content : '';
    });
    
    // 处理#ifndef指令
    const ifndefRegex = /#ifndef\s+(\w+)([\s\S]*?)(?:#endif|$)/g;
    processed = processed.replace(ifndefRegex, (match, define, content) => {
      return defines[define] === undefined ? content : '';
    });
    
    return processed;
  }
}

/**
 * 高级着色器管理器
 */
export class AdvancedShaderManager extends EventEmitter3 {
  private gl: WebGLRenderingContext;
  private config: AdvancedShaderConfig;
  
  // 着色器模板和缓存
  private templates = new Map<string, ShaderTemplate>();
  private compiledCache = new Map<string, CompiledShaderCache>();
  private metrics = new Map<string, ShaderMetrics>();
  
  // 性能监控
  private currentMemoryUsage = 0;
  private compileQueue: Array<{ id: string; template: ShaderTemplate; variant: ShaderVariant }> = [];
  private isCompiling = false;
  
  // 热重载支持
  private watchedFiles = new Map<string, string>();
  
  constructor(gl: WebGLRenderingContext, config?: Partial<AdvancedShaderConfig>) {
    super();
    
    this.gl = gl;
    this.config = {
      cacheMemoryLimit: 50 * 1024 * 1024, // 50MB
      enableHotReload: false,
      precompileCommonVariants: true,
      enableAsyncCompilation: true,
      cacheCleanupInterval: 60000, // 1分钟
      shaderExpirationTime: 300000, // 5分钟
      ...config
    };
    
    this.setupCacheCleanup();
  }
  
  /**
   * 注册着色器模板
   */
  registerTemplate(template: ShaderTemplate): void {
    this.templates.set(template.id, template);
    
    if (this.config.precompileCommonVariants) {
      // 预编译常用变体
      this.precompileVariants(template);
    }
    
    if (this.config.enableHotReload) {
      this.watchTemplate(template);
    }
  }
  
  /**
   * 获取着色器程序（支持变体）
   */
  getProgram(templateId: string, variantName?: string): Promise<IShaderProgram> {
    const template = this.templates.get(templateId);
    if (!template) {
      return Promise.reject(new Error(`Shader template not found: ${templateId}`));
    }
    
    const variant = variantName 
      ? template.variants.find(v => v.name === variantName)
      : template.variants[0];
      
    if (!variant) {
      return Promise.reject(new Error(`Shader variant not found: ${variantName} in template ${templateId}`));
    }
    
    const cacheKey = `${templateId}_${variant.name}`;
    const cached = this.compiledCache.get(cacheKey);
    
    if (cached) {
      cached.lastUsed = Date.now();
      cached.useCount++;
      this.emit('shader-cache-hit', { id: cacheKey });
      return Promise.resolve(cached.program);
    }
    
    this.emit('shader-cache-miss', { id: cacheKey });
    
    if (this.config.enableAsyncCompilation) {
      return this.compileAsync(template, variant);
    } else {
      try {
        return Promise.resolve(this.compileSync(template, variant));
      } catch (error) {
        return Promise.reject(error);
      }
    }
  }
  
  /**
   * 批量预编译着色器
   */
  async precompileShaders(templateIds: string[]): Promise<void> {
    const compilePromises: Promise<unknown>[] = [];
    
    for (const templateId of templateIds) {
      const template = this.templates.get(templateId);
      if (template) {
        for (const variant of template.variants) {
          compilePromises.push(this.getProgram(templateId, variant.name));
        }
      }
    }
    
    await Promise.all(compilePromises);
  }
  
  /**
   * 热重载着色器
   */
  async hotReloadShader(templateId: string): Promise<boolean> {
    if (!this.config.enableHotReload) {
      return false;
    }
    
    try {
      const template = this.templates.get(templateId);
      if (!template) return false;
      
      // 清除缓存的编译版本
      this.clearTemplateCache(templateId);
      
      // 重新编译所有变体
      for (const variant of template.variants) {
        await this.compileAsync(template, variant);
      }
      
      this.emit('hot-reload', { id: templateId, success: true });
      return true;
    } catch (error) {
      this.emit('hot-reload', { id: templateId, success: false });
      this.emit('shader-error', { id: templateId, error: error as Error });
      return false;
    }
  }
  
  /**
   * 获取着色器性能指标
   */
  getMetrics(shaderId?: string): ShaderMetrics | Map<string, ShaderMetrics> {
    if (shaderId) {
      return this.metrics.get(shaderId) || {
        compileTime: 0,
        linkTime: 0,
        uniformSetCount: 0,
        drawCallCount: 0,
        lastUsed: 0
      };
    }
    return new Map(this.metrics);
  }
  
  /**
   * 清理缓存
   */
  cleanupCache(force = false): number {
    const now = Date.now();
    let freedMemory = 0;
    
    for (const [key, cached] of this.compiledCache) {
      const shouldRemove = force || 
        (now - cached.lastUsed > this.config.shaderExpirationTime) ||
        (this.currentMemoryUsage > this.config.cacheMemoryLimit && cached.useCount === 0);
      
      if (shouldRemove) {
        cached.program.dispose();
        this.compiledCache.delete(key);
        this.metrics.delete(key);
        
        freedMemory += cached.memoryUsage;
        this.currentMemoryUsage -= cached.memoryUsage;
      }
    }
    
    if (freedMemory > 0) {
      this.emit('cache-cleaned', { freedMemory });
    }
    
    return freedMemory;
  }
  
  /**
   * 获取缓存统计信息
   */
  getCacheStats(): {
    totalPrograms: number;
    memoryUsage: number;
    memoryLimit: number;
    hitRate: number;
  } {
    let totalHits = 0;
    let totalMisses = 0;
    
    for (const cached of this.compiledCache.values()) {
      if (cached.useCount > 0) totalHits += cached.useCount;
      else totalMisses++;
    }
    
    const hitRate = totalHits + totalMisses > 0 ? totalHits / (totalHits + totalMisses) : 0;
    
    return {
      totalPrograms: this.compiledCache.size,
      memoryUsage: this.currentMemoryUsage,
      memoryLimit: this.config.cacheMemoryLimit,
      hitRate
    };
  }
  
  /**
   * 销毁管理器
   */
  dispose(): void {
    this.cleanupCache(true);
    this.removeAllListeners();
  }
  
  /**
   * 同步编译着色器
   */
  private compileSync(template: ShaderTemplate, variant: ShaderVariant): IShaderProgram {
    const startTime = Date.now();
    
    try {
      const vertexSource = ShaderPreprocessor.process(template.vertexTemplate, variant.defines);
      const fragmentSource = ShaderPreprocessor.process(template.fragmentTemplate, variant.defines);
      
      const program = this.createShaderProgram(vertexSource, fragmentSource, template.id);
      const compileTime = Date.now() - startTime;
      
      this.cacheProgram(template.id, variant, program, compileTime);
      this.emit('shader-compiled', { id: `${template.id}_${variant.name}`, time: compileTime });
      
      return program;
    } catch (error) {
      this.emit('shader-error', { id: template.id, error: error as Error });
      throw error;
    }
  }
  
  /**
   * 异步编译着色器
   */
  private async compileAsync(template: ShaderTemplate, variant: ShaderVariant): Promise<IShaderProgram> {
    return new Promise((resolve, reject) => {
      this.compileQueue.push({ id: template.id, template, variant });
      this.processCompileQueue().then(() => {
        const cacheKey = `${template.id}_${variant.name}`;
        const cached = this.compiledCache.get(cacheKey);
        if (cached) {
          resolve(cached.program);
        } else {
          reject(new Error(`Failed to compile shader: ${cacheKey}`));
        }
      }).catch(reject);
    });
  }
  
  /**
   * 处理编译队列
   */
  private async processCompileQueue(): Promise<void> {
    if (this.isCompiling || this.compileQueue.length === 0) {
      return;
    }
    
    this.isCompiling = true;
    
    while (this.compileQueue.length > 0) {
      const item = this.compileQueue.shift()!;
      
      try {
        // 使用requestIdleCallback或setTimeout来避免阻塞主线程
        await new Promise(resolve => setTimeout(resolve, 0));
        this.compileSync(item.template, item.variant);
      } catch (error) {
        this.emit('shader-error', { id: item.id, error: error as Error });
      }
    }
    
    this.isCompiling = false;
  }
  
  /**
   * 创建着色器程序
   */
  private createShaderProgram(vertexSource: string, fragmentSource: string, name: string): IShaderProgram {
    const vertexShader = this.createShader(ShaderType.VERTEX, vertexSource);
    const fragmentShader = this.createShader(ShaderType.FRAGMENT, fragmentSource);
    
    const program = this.gl.createProgram();
    if (!program) {
      throw new Error('Failed to create shader program');
    }
    
    this.gl.attachShader(program, vertexShader);
    this.gl.attachShader(program, fragmentShader);
    this.gl.linkProgram(program);
    
    if (!this.gl.getProgramParameter(program, this.gl.LINK_STATUS)) {
      const error = this.gl.getProgramInfoLog(program) || 'Unknown linking error';
      this.gl.deleteProgram(program);
      this.gl.deleteShader(vertexShader);
      this.gl.deleteShader(fragmentShader);
      throw new ShaderProgramLinkError(error);
    }
    
    // 清理着色器对象（已经链接到程序中）
    this.gl.deleteShader(vertexShader);
    this.gl.deleteShader(fragmentShader);
    
    return this.createShaderProgramWrapper(program, name);
  }
  
  /**
   * 创建单个着色器
   */
  private createShader(type: ShaderType, source: string): WebGLShader {
    const shader = this.gl.createShader(type);
    if (!shader) {
      throw new Error(`Failed to create ${type === ShaderType.VERTEX ? 'vertex' : 'fragment'} shader`);
    }
    
    this.gl.shaderSource(shader, source);
    this.gl.compileShader(shader);
    
    if (!this.gl.getShaderParameter(shader, this.gl.COMPILE_STATUS)) {
      const error = this.gl.getShaderInfoLog(shader) || 'Unknown compilation error';
      this.gl.deleteShader(shader);
      throw new ShaderCompilationError(error, type, source);
    }
    
    return shader;
  }
  
  /**
   * 创建着色器程序包装器
   */
  private createShaderProgramWrapper(program: WebGLProgram, name: string): IShaderProgram {
    // 获取所有属性和uniform位置
    const attributes = new Map<string, number>();
    const uniforms = new Map<string, WebGLUniformLocation>();
    
    const attributeCount = this.gl.getProgramParameter(program, this.gl.ACTIVE_ATTRIBUTES);
    for (let i = 0; i < attributeCount; i++) {
      const info = this.gl.getActiveAttrib(program, i);
      if (info) {
        const location = this.gl.getAttribLocation(program, info.name);
        attributes.set(info.name, location);
      }
    }
    
    const uniformCount = this.gl.getProgramParameter(program, this.gl.ACTIVE_UNIFORMS);
    for (let i = 0; i < uniformCount; i++) {
      const info = this.gl.getActiveUniform(program, i);
      if (info) {
        const location = this.gl.getUniformLocation(program, info.name);
        if (location) {
          uniforms.set(info.name, location);
        }
      }
    }
    
    return {
      id: name,
      program,
      attributes,
      uniforms,
      isValid: true,
      
      use: (gl: WebGLRenderingContext) => {
        gl.useProgram(program);
      },
      
      setUniform: (name: string, value: unknown) => {
        const location = uniforms.get(name);
        if (location) {
          // 这里需要根据值的类型调用相应的uniform方法
          // 简化实现，实际需要更复杂的类型检查
          if (typeof value === 'number') {
            this.gl.uniform1f(location, value);
          }
        }
      },
      
      getAttributeLocation: (name: string) => {
        return attributes.get(name) || -1;
      },
      
      getUniformLocation: (name: string) => {
        return uniforms.get(name) || null;
      },
      
      dispose: () => {
        this.gl.deleteProgram(program);
      }
    };
  }
  
  /**
   * 缓存编译后的程序
   */
  private cacheProgram(templateId: string, variant: ShaderVariant, program: IShaderProgram, compileTime: number): void {
    const cacheKey = `${templateId}_${variant.name}`;
    const memoryUsage = 1024; // 简化的内存使用估算
    
    const cached: CompiledShaderCache = {
      program,
      lastUsed: Date.now(),
      useCount: 0,
      compileTime,
      memoryUsage
    };
    
    this.compiledCache.set(cacheKey, cached);
    this.currentMemoryUsage += memoryUsage;
    
    // 记录性能指标
    this.metrics.set(cacheKey, {
      compileTime,
      linkTime: 0,
      uniformSetCount: 0,
      drawCallCount: 0,
      lastUsed: Date.now()
    });
    
    // 检查是否需要清理缓存
    if (this.currentMemoryUsage > this.config.cacheMemoryLimit) {
      this.cleanupCache();
    }
  }
  
  /**
   * 预编译常用变体
   */
  private precompileVariants(template: ShaderTemplate): void {
    // 预编译前几个变体
    const variantsToPrecompile = template.variants.slice(0, 3);
    
    setTimeout(() => {
      for (const variant of variantsToPrecompile) {
        this.getProgram(template.id, variant.name).catch(error => {
          console.warn(`Failed to precompile shader variant ${template.id}_${variant.name}:`, error);
        });
      }
    }, 0);
  }
  
  /**
   * 监听着色器模板文件变化
   */
  private watchTemplate(template: ShaderTemplate): void {
    // 在实际实现中，这里会设置文件监听器
    // 目前只是存储模板以备热重载使用
    this.watchedFiles.set(template.id, template.vertexTemplate + template.fragmentTemplate);
  }
  
  /**
   * 清除指定模板的缓存
   */
  private clearTemplateCache(templateId: string): void {
    const keysToDelete = Array.from(this.compiledCache.keys()).filter(key => key.startsWith(templateId + '_'));
    
    for (const key of keysToDelete) {
      const cached = this.compiledCache.get(key);
      if (cached) {
        cached.program.dispose();
        this.compiledCache.delete(key);
        this.metrics.delete(key);
        this.currentMemoryUsage -= cached.memoryUsage;
      }
    }
  }
  
  /**
   * 设置缓存清理定时器
   */
  private setupCacheCleanup(): void {
    setInterval(() => {
      this.cleanupCache();
    }, this.config.cacheCleanupInterval);
  }
}