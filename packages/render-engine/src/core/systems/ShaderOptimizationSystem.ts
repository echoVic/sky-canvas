import { BaseSystem } from './SystemManager';
import { Extension, ExtensionType } from './ExtensionSystem';

/**
 * 着色器类型
 */
export enum ShaderType {
  VERTEX = 'vertex',
  FRAGMENT = 'fragment',
  COMPUTE = 'compute'
}

/**
 * 着色器变体
 */
export interface ShaderVariant {
  defines: Record<string, string | number | boolean>;
  features: string[];
  hash: string;
}

/**
 * 着色器程序
 */
export interface ShaderProgram {
  id: string;
  name: string;
  vertexShader: WebGLShader;
  fragmentShader: WebGLShader;
  program: WebGLProgram;
  uniforms: Map<string, WebGLUniformLocation>;
  attributes: Map<string, number>;
  variant: ShaderVariant;
  compilationTime: number;
  lastUsed: number;
  useCount: number;
}

/**
 * 着色器源码
 */
interface ShaderSource {
  vertex: string;
  fragment: string;
  includes?: string[];
}

/**
 * 着色器编译统计
 */
export interface ShaderCompilationStats {
  totalPrograms: number;
  compiledPrograms: number;
  cachedPrograms: number;
  failedCompilations: number;
  averageCompilationTime: number;
  totalCompilationTime: number;
  cacheHitRate: number;
  memoryUsage: number;
}

/**
 * 着色器预处理器
 */
class ShaderPreprocessor {
  private includes = new Map<string, string>();
  
  /**
   * 注册包含文件
   */
  registerInclude(name: string, content: string): void {
    this.includes.set(name, content);
  }
  
  /**
   * 预处理着色器源码
   */
  preprocess(source: string, defines: Record<string, string | number | boolean> = {}): string {
    let processed = source;
    
    // 处理宏定义
    for (const [key, value] of Object.entries(defines)) {
      const defineDirective = `#define ${key} ${value}\n`;
      processed = defineDirective + processed;
    }
    
    // 处理包含文件
    processed = this.processIncludes(processed);
    
    // 处理条件编译
    processed = this.processConditionals(processed, defines);
    
    return processed;
  }
  
  /**
   * 处理包含文件
   */
  private processIncludes(source: string): string {
    const includeRegex = /#include\s+["<]([^\s>"]+)[">]/g;
    
    return source.replace(includeRegex, (match, filename) => {
      const includeContent = this.includes.get(filename);
      if (includeContent) {
        return this.processIncludes(includeContent); // 递归处理嵌套包含
      }
      console.warn(`Include file not found: ${filename}`);
      return match;
    });
  }
  
  /**
   * 处理条件编译
   */
  private processConditionals(source: string, defines: Record<string, string | number | boolean>): string {
    const lines = source.split('\n');
    const result: string[] = [];
    const stack: boolean[] = [true]; // 条件栈
    
    for (const line of lines) {
      const trimmed = line.trim();
      
      if (trimmed.startsWith('#ifdef')) {
        const macro = trimmed.substring(6).trim();
        const condition = Object.prototype.hasOwnProperty.call(defines, macro);
        stack.push(stack[stack.length - 1] && condition);
      } else if (trimmed.startsWith('#ifndef')) {
        const macro = trimmed.substring(7).trim();
        const condition = !Object.prototype.hasOwnProperty.call(defines, macro);
        stack.push(stack[stack.length - 1] && condition);
      } else if (trimmed.startsWith('#else')) {
        if (stack.length > 1) {
          const current = stack.pop()!;
          const parent = stack[stack.length - 1];
          stack.push(parent && !current);
        }
      } else if (trimmed.startsWith('#endif')) {
        if (stack.length > 1) {
          stack.pop();
        }
      } else if (stack[stack.length - 1]) {
        result.push(line);
      }
    }
    
    return result.join('\n');
  }
}

/**
 * 着色器缓存
 */
class ShaderCache {
  private cache = new Map<string, ShaderProgram>();
  private maxSize: number;
  private accessOrder: string[] = [];
  
  constructor(maxSize: number = 100) {
    this.maxSize = maxSize;
  }
  
  /**
   * 获取缓存的着色器程序
   */
  get(hash: string): ShaderProgram | null {
    const program = this.cache.get(hash);
    if (program) {
      // 更新访问顺序
      const index = this.accessOrder.indexOf(hash);
      if (index > -1) {
        this.accessOrder.splice(index, 1);
      }
      this.accessOrder.push(hash);
      
      program.lastUsed = Date.now();
      program.useCount++;
    }
    return program || null;
  }
  
  /**
   * 缓存着色器程序
   */
  set(hash: string, program: ShaderProgram): void {
    if (this.cache.size >= this.maxSize) {
      this.evictLRU();
    }
    
    this.cache.set(hash, program);
    this.accessOrder.push(hash);
  }
  
  /**
   * 移除最近最少使用的程序
   */
  private evictLRU(): void {
    if (this.accessOrder.length > 0) {
      const lruHash = this.accessOrder.shift()!;
      this.cache.delete(lruHash);
    }
  }
  
  /**
   * 清理缓存
   */
  clear(): void {
    this.cache.clear();
    this.accessOrder.length = 0;
  }
  
  /**
   * 获取缓存统计
   */
  getStats(): { size: number; maxSize: number; hitRate: number } {
    const totalAccess = Array.from(this.cache.values()).reduce((sum, p) => sum + p.useCount, 0);
    const cacheHits = Array.from(this.cache.values()).filter(p => p.useCount > 1).length;
    
    return {
      size: this.cache.size,
      maxSize: this.maxSize,
      hitRate: totalAccess > 0 ? cacheHits / totalAccess : 0
    };
  }
}

/**
 * 着色器编译器
 */
class ShaderCompiler {
  private gl: WebGLRenderingContext | WebGL2RenderingContext;
  
  constructor(gl: WebGLRenderingContext | WebGL2RenderingContext) {
    this.gl = gl;
  }
  
  /**
   * 编译着色器
   */
  compileShader(source: string, type: number): WebGLShader {
    const shader = this.gl.createShader(type);
    if (!shader) {
      throw new Error('Failed to create shader');
    }
    
    this.gl.shaderSource(shader, source);
    this.gl.compileShader(shader);
    
    if (!this.gl.getShaderParameter(shader, this.gl.COMPILE_STATUS)) {
      const error = this.gl.getShaderInfoLog(shader);
      this.gl.deleteShader(shader);
      throw new Error(`Shader compilation failed: ${error}`);
    }
    
    return shader;
  }
  
  /**
   * 链接着色器程序
   */
  linkProgram(vertexShader: WebGLShader, fragmentShader: WebGLShader): WebGLProgram {
    const program = this.gl.createProgram();
    if (!program) {
      throw new Error('Failed to create program');
    }
    
    this.gl.attachShader(program, vertexShader);
    this.gl.attachShader(program, fragmentShader);
    this.gl.linkProgram(program);
    
    if (!this.gl.getProgramParameter(program, this.gl.LINK_STATUS)) {
      const error = this.gl.getProgramInfoLog(program);
      this.gl.deleteProgram(program);
      throw new Error(`Program linking failed: ${error}`);
    }
    
    return program;
  }
  
  /**
   * 获取程序的uniform和attribute信息
   */
  introspectProgram(program: WebGLProgram): {
    uniforms: Map<string, WebGLUniformLocation>;
    attributes: Map<string, number>;
  } {
    const uniforms = new Map<string, WebGLUniformLocation>();
    const attributes = new Map<string, number>();
    
    // 获取uniform信息
    const uniformCount = this.gl.getProgramParameter(program, this.gl.ACTIVE_UNIFORMS);
    for (let i = 0; i < uniformCount; i++) {
      const uniformInfo = this.gl.getActiveUniform(program, i);
      if (uniformInfo) {
        const location = this.gl.getUniformLocation(program, uniformInfo.name);
        if (location) {
          uniforms.set(uniformInfo.name, location);
        }
      }
    }
    
    // 获取attribute信息
    const attributeCount = this.gl.getProgramParameter(program, this.gl.ACTIVE_ATTRIBUTES);
    for (let i = 0; i < attributeCount; i++) {
      const attributeInfo = this.gl.getActiveAttrib(program, i);
      if (attributeInfo) {
        const location = this.gl.getAttribLocation(program, attributeInfo.name);
        attributes.set(attributeInfo.name, location);
      }
    }
    
    return { uniforms, attributes };
  }
}

/**
 * 着色器优化系统
 */
@Extension({
  type: ExtensionType.RenderSystem,
  name: 'shader-optimization',
  priority: 800
})
export class ShaderOptimizationSystem extends BaseSystem {
  readonly name = 'shader-optimization';
  readonly priority = 800;
  
  private gl: WebGLRenderingContext | WebGL2RenderingContext | null = null;
  private preprocessor = new ShaderPreprocessor();
  private cache = new ShaderCache(100);
  private compiler: ShaderCompiler | null = null;
  
  // 着色器源码库
  private shaderSources = new Map<string, ShaderSource>();
  
  // 编译队列
  private compilationQueue: Array<{
    name: string;
    variant: ShaderVariant;
    resolve: (program: ShaderProgram) => void;
    reject: (error: Error) => void;
  }> = [];
  
  private isCompiling = false;
  
  // 统计信息
  private stats: ShaderCompilationStats = {
    totalPrograms: 0,
    compiledPrograms: 0,
    cachedPrograms: 0,
    failedCompilations: 0,
    averageCompilationTime: 0,
    totalCompilationTime: 0,
    cacheHitRate: 0,
    memoryUsage: 0
  };
  
  // 配置
  private config = {
    enableAsyncCompilation: true,
    enableShaderValidation: true,
    enableOptimization: true,
    maxConcurrentCompilations: 3,
    precompileCommonShaders: true
  };
  
  init(): void {
    this.registerCommonIncludes();
    this.precompileCommonShaders();
  }
  
  /**
   * 设置WebGL上下文
   */
  setWebGLContext(gl: WebGLRenderingContext | WebGL2RenderingContext): void {
    this.gl = gl;
    this.compiler = new ShaderCompiler(gl);
  }
  
  /**
   * 注册着色器源码
   */
  registerShader(name: string, source: ShaderSource): void {
    this.shaderSources.set(name, source);
  }
  
  /**
   * 注册包含文件
   */
  registerInclude(name: string, content: string): void {
    this.preprocessor.registerInclude(name, content);
  }
  
  /**
   * 获取着色器程序
   */
  async getShaderProgram(name: string, variant: ShaderVariant = { defines: {}, features: [], hash: '' }): Promise<ShaderProgram> {
    // 生成变体哈希
    if (!variant.hash) {
      variant.hash = this.generateVariantHash(name, variant);
    }
    
    // 检查缓存
    const cached = this.cache.get(variant.hash);
    if (cached) {
      this.stats.cachedPrograms++;
      return cached;
    }
    
    // 异步编译
    if (this.config.enableAsyncCompilation) {
      return this.compileAsync(name, variant);
    } else {
      return this.compileSync(name, variant);
    }
  }
  
  /**
   * 同步编译着色器
   */
  private compileSync(name: string, variant: ShaderVariant): ShaderProgram {
    const startTime = performance.now();
    
    try {
      const program = this.doCompile(name, variant);
      const compilationTime = performance.now() - startTime;
      
      program.compilationTime = compilationTime;
      this.updateCompilationStats(compilationTime, true);
      
      // 缓存程序
      this.cache.set(variant.hash, program);
      
      return program;
    } catch (error) {
      this.stats.failedCompilations++;
      throw error;
    }
  }
  
  /**
   * 异步编译着色器
   */
  private async compileAsync(name: string, variant: ShaderVariant): Promise<ShaderProgram> {
    return new Promise((resolve, reject) => {
      this.compilationQueue.push({ name, variant, resolve, reject });
      this.processCompilationQueue();
    });
  }
  
  /**
   * 处理编译队列
   */
  private async processCompilationQueue(): Promise<void> {
    if (this.isCompiling || this.compilationQueue.length === 0) {
      return;
    }
    
    this.isCompiling = true;
    
    while (this.compilationQueue.length > 0) {
      const task = this.compilationQueue.shift()!;
      
      try {
        const startTime = performance.now();
        const program = this.doCompile(task.name, task.variant);
        const compilationTime = performance.now() - startTime;
        
        program.compilationTime = compilationTime;
        this.updateCompilationStats(compilationTime, true);
        
        // 缓存程序
        this.cache.set(task.variant.hash, program);
        
        task.resolve(program);
      } catch (error) {
        this.stats.failedCompilations++;
        task.reject(error as Error);
      }
      
      // 让出控制权，避免阻塞主线程
      await new Promise(resolve => setTimeout(resolve, 0));
    }
    
    this.isCompiling = false;
  }
  
  /**
   * 执行着色器编译
   */
  private doCompile(name: string, variant: ShaderVariant): ShaderProgram {
    if (!this.gl || !this.compiler) {
      throw new Error('WebGL context not set');
    }
    
    const source = this.shaderSources.get(name);
    if (!source) {
      throw new Error(`Shader source not found: ${name}`);
    }
    
    // 预处理着色器源码
    const vertexSource = this.preprocessor.preprocess(source.vertex, variant.defines);
    const fragmentSource = this.preprocessor.preprocess(source.fragment, variant.defines);
    
    // 编译着色器
    const vertexShader = this.compiler.compileShader(vertexSource, this.gl.VERTEX_SHADER);
    const fragmentShader = this.compiler.compileShader(fragmentSource, this.gl.FRAGMENT_SHADER);
    
    // 链接程序
    const program = this.compiler.linkProgram(vertexShader, fragmentShader);
    
    // 获取uniform和attribute信息
    const { uniforms, attributes } = this.compiler.introspectProgram(program);
    
    // 验证着色器
    if (this.config.enableShaderValidation) {
      this.validateShader(program);
    }
    
    const shaderProgram: ShaderProgram = {
      id: this.generateProgramId(),
      name,
      vertexShader,
      fragmentShader,
      program,
      uniforms,
      attributes,
      variant,
      compilationTime: 0,
      lastUsed: Date.now(),
      useCount: 1
    };
    
    this.stats.compiledPrograms++;
    this.stats.totalPrograms++;
    
    return shaderProgram;
  }
  
  /**
   * 验证着色器
   */
  private validateShader(program: WebGLProgram): void {
    if (!this.gl) return;
    
    this.gl.validateProgram(program);
    
    if (!this.gl.getProgramParameter(program, this.gl.VALIDATE_STATUS)) {
      const error = this.gl.getProgramInfoLog(program);
      console.warn(`Shader validation warning: ${error}`);
    }
  }
  
  /**
   * 生成变体哈希
   */
  private generateVariantHash(name: string, variant: ShaderVariant): string {
    const defineStr = Object.entries(variant.defines)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, value]) => `${key}=${value}`)
      .join('|');
    
    const featureStr = variant.features.sort().join('|');
    
    return `${name}:${defineStr}:${featureStr}`;
  }
  
  /**
   * 生成程序ID
   */
  private generateProgramId(): string {
    return `shader_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
  
  /**
   * 更新编译统计
   */
  private updateCompilationStats(compilationTime: number, success: boolean): void {
    if (success) {
      this.stats.totalCompilationTime += compilationTime;
      this.stats.averageCompilationTime = this.stats.totalCompilationTime / this.stats.compiledPrograms;
    }
    
    const cacheStats = this.cache.getStats();
    this.stats.cacheHitRate = cacheStats.hitRate;
  }
  
  /**
   * 注册常用包含文件
   */
  private registerCommonIncludes(): void {
    // 常用的着色器包含文件
    this.registerInclude('common.glsl', `
      precision mediump float;
      
      // 常用常量
      #define PI 3.14159265359
      #define TWO_PI 6.28318530718
      #define HALF_PI 1.57079632679
      
      // 常用函数
      float saturate(float x) {
        return clamp(x, 0.0, 1.0);
      }
      
      vec3 saturate(vec3 x) {
        return clamp(x, 0.0, 1.0);
      }
    `);
    
    this.registerInclude('lighting.glsl', `
      // 兰伯特光照模型
      float lambert(vec3 normal, vec3 lightDir) {
        return max(0.0, dot(normal, lightDir));
      }
      
      // Blinn-Phong光照模型
      float blinnPhong(vec3 normal, vec3 lightDir, vec3 viewDir, float shininess) {
        vec3 halfDir = normalize(lightDir + viewDir);
        return pow(max(0.0, dot(normal, halfDir)), shininess);
      }
    `);
    
    this.registerInclude('noise.glsl', `
      // 简单噪声函数
      float random(vec2 st) {
        return fract(sin(dot(st.xy, vec2(12.9898, 78.233))) * 43758.5453123);
      }
      
      float noise(vec2 st) {
        vec2 i = floor(st);
        vec2 f = fract(st);
        
        float a = random(i);
        float b = random(i + vec2(1.0, 0.0));
        float c = random(i + vec2(0.0, 1.0));
        float d = random(i + vec2(1.0, 1.0));
        
        vec2 u = f * f * (3.0 - 2.0 * f);
        
        return mix(a, b, u.x) + (c - a) * u.y * (1.0 - u.x) + (d - b) * u.x * u.y;
      }
    `);
  }
  
  /**
   * 预编译常用着色器
   */
  private precompileCommonShaders(): void {
    if (!this.config.precompileCommonShaders) return;
    
    // 注册基础着色器
    this.registerShader('basic', {
      vertex: `
        #include "common.glsl"
        
        attribute vec3 a_position;
        attribute vec2 a_texCoord;
        
        uniform mat4 u_mvpMatrix;
        
        varying vec2 v_texCoord;
        
        void main() {
          gl_Position = u_mvpMatrix * vec4(a_position, 1.0);
          v_texCoord = a_texCoord;
        }
      `,
      fragment: `
        #include "common.glsl"
        
        uniform sampler2D u_texture;
        uniform vec4 u_color;
        
        varying vec2 v_texCoord;
        
        void main() {
          vec4 texColor = texture2D(u_texture, v_texCoord);
          gl_FragColor = texColor * u_color;
        }
      `
    });
    
    // 预编译基础变体
    const commonVariants: ShaderVariant[] = [
      { defines: {}, features: [], hash: '' },
      { defines: { USE_TEXTURE: 1 }, features: ['texture'], hash: '' },
      { defines: { USE_LIGHTING: 1 }, features: ['lighting'], hash: '' }
    ];
    
    for (const variant of commonVariants) {
      this.getShaderProgram('basic', variant).catch(error => {
        console.warn('Failed to precompile shader variant:', error);
      });
    }
  }
  
  /**
   * 获取编译统计
   */
  getCompilationStats(): ShaderCompilationStats {
    return { ...this.stats };
  }
  
  /**
   * 获取缓存统计
   */
  getCacheStats(): { size: number; maxSize: number; hitRate: number } {
    return this.cache.getStats();
  }
  
  /**
   * 清理未使用的着色器
   */
  cleanupUnusedShaders(maxAge: number = 300000): void {
    // 这里需要遍历缓存中的程序，但cache是私有的
    // 在实际实现中，需要添加相应的方法
    console.log(`Cleaning up shaders older than ${maxAge}ms`);
  }
  
  /**
   * 设置配置
   */
  setConfig(config: Partial<typeof this.config>): void {
    Object.assign(this.config, config);
  }
  
  /**
   * 销毁系统
   */
  dispose(): void {
    this.cache.clear();
    this.shaderSources.clear();
    this.compilationQueue.length = 0;
  }
}