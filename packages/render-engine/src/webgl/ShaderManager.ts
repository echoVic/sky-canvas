/**
 * WebGL 着色器管理系统
 * 负责着色器的创建、编译、缓存和状态管理
 */

/**
 * 着色器类型
 */
export enum ShaderType {
  VERTEX = 0x8B31, // WebGLRenderingContext.VERTEX_SHADER
  FRAGMENT = 0x8B30 // WebGLRenderingContext.FRAGMENT_SHADER
}

/**
 * 着色器源码
 */
export interface IShaderSource {
  /** 顶点着色器源码 */
  vertex: string;
  /** 片元着色器源码 */
  fragment: string;
  /** 着色器名称 */
  name: string;
  /** 着色器版本 */
  version?: string;
}

/**
 * 着色器程序接口
 */
export interface IShaderProgram {
  /** 着色器程序ID */
  readonly id: string;
  /** WebGL程序对象 */
  readonly program: WebGLProgram;
  /** 属性位置映射 */
  readonly attributes: Map<string, number>;
  /** Uniform位置映射 */
  readonly uniforms: Map<string, WebGLUniformLocation>;
  /** 是否有效 */
  readonly isValid: boolean;
  
  /**
   * 使用此着色器程序
   * @param gl WebGL上下文
   */
  use(gl: WebGLRenderingContext): void;
  
  /**
   * 设置uniform值
   * @param name uniform名称
   * @param value 值
   */
  setUniform(name: string, value: any): void;
  
  /**
   * 获取属性位置
   * @param name 属性名称
   */
  getAttributeLocation(name: string): number;
  
  /**
   * 获取uniform位置
   * @param name uniform名称
   */
  getUniformLocation(name: string): WebGLUniformLocation | null;
  
  /**
   * 销毁着色器程序
   */
  dispose(): void;
}

/**
 * 着色器编译错误
 */
export class ShaderCompilationError extends Error {
  constructor(
    message: string,
    public readonly shaderType: ShaderType,
    public readonly source: string
  ) {
    super(`Shader compilation failed: ${message}`);
    this.name = 'ShaderCompilationError';
  }
}

/**
 * 着色器程序链接错误
 */
export class ShaderProgramLinkError extends Error {
  constructor(message: string) {
    super(`Shader program linking failed: ${message}`);
    this.name = 'ShaderProgramLinkError';
  }
}

/**
 * 着色器程序实现
 */
export class ShaderProgram implements IShaderProgram {
  private static idCounter = 0;
  
  readonly id: string;
  readonly program: WebGLProgram;
  readonly attributes = new Map<string, number>();
  readonly uniforms = new Map<string, WebGLUniformLocation>();
  private _isValid = false;
  private gl: WebGLRenderingContext;
  
  constructor(
    gl: WebGLRenderingContext,
    source: IShaderSource
  ) {
    this.id = `shader_${++ShaderProgram.idCounter}_${source.name}`;
    this.gl = gl;
    this.program = this.createProgram(gl, source);
    this._isValid = this.program !== null;
    
    if (this._isValid) {
      this.introspectProgram(gl);
    }
  }
  
  get isValid(): boolean {
    return this._isValid;
  }
  
  use(gl: WebGLRenderingContext): void {
    if (!this._isValid) {
      throw new Error(`Cannot use invalid shader program: ${this.id}`);
    }
    gl.useProgram(this.program);
  }
  
  setUniform(name: string, value: any): void {
    const location = this.uniforms.get(name);
    if (!location) {
      console.warn(`Uniform '${name}' not found in shader ${this.id}`);
      return;
    }
    
    this.setUniformValue(this.gl, location, value);
  }
  
  getAttributeLocation(name: string): number {
    return this.attributes.get(name) ?? -1;
  }
  
  getUniformLocation(name: string): WebGLUniformLocation | null {
    return this.uniforms.get(name) ?? null;
  }
  
  dispose(): void {
    if (this.program) {
      this.gl.deleteProgram(this.program);
    }
    this.attributes.clear();
    this.uniforms.clear();
    this._isValid = false;
  }
  
  private createProgram(gl: WebGLRenderingContext, source: IShaderSource): WebGLProgram {
    const vertexShader = this.compileShader(gl, ShaderType.VERTEX, source.vertex);
    const fragmentShader = this.compileShader(gl, ShaderType.FRAGMENT, source.fragment);
    
    const program = gl.createProgram();
    if (!program) {
      throw new Error('Failed to create WebGL program');
    }
    
    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);
    
    // 清理着色器对象（程序已链接）
    gl.deleteShader(vertexShader);
    gl.deleteShader(fragmentShader);
    
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      const error = gl.getProgramInfoLog(program);
      gl.deleteProgram(program);
      throw new ShaderProgramLinkError(error || 'Unknown linking error');
    }
    
    return program;
  }
  
  private compileShader(gl: WebGLRenderingContext, type: ShaderType, source: string): WebGLShader {
    const shader = gl.createShader(type);
    if (!shader) {
      throw new Error(`Failed to create shader of type ${type}`);
    }
    
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      const error = gl.getShaderInfoLog(shader);
      gl.deleteShader(shader);
      throw new ShaderCompilationError(error || 'Unknown compilation error', type, source);
    }
    
    return shader;
  }
  
  private introspectProgram(gl: WebGLRenderingContext): void {
    // 获取所有活动属性
    const attributeCount = gl.getProgramParameter(this.program, gl.ACTIVE_ATTRIBUTES);
    for (let i = 0; i < attributeCount; i++) {
      const info = gl.getActiveAttrib(this.program, i);
      if (info) {
        const location = gl.getAttribLocation(this.program, info.name);
        this.attributes.set(info.name, location);
      }
    }
    
    // 获取所有活动uniform
    const uniformCount = gl.getProgramParameter(this.program, gl.ACTIVE_UNIFORMS);
    for (let i = 0; i < uniformCount; i++) {
      const info = gl.getActiveUniform(this.program, i);
      if (info) {
        const location = gl.getUniformLocation(this.program, info.name);
        if (location) {
          this.uniforms.set(info.name, location);
        }
      }
    }
  }
  
  private setUniformValue(gl: WebGLRenderingContext, location: WebGLUniformLocation, value: any): void {
    if (typeof value === 'number') {
      gl.uniform1f(location, value);
    } else if (Array.isArray(value)) {
      switch (value.length) {
        case 2:
          gl.uniform2fv(location, value);
          break;
        case 3:
          gl.uniform3fv(location, value);
          break;
        case 4:
          gl.uniform4fv(location, value);
          break;
        case 9:
          gl.uniformMatrix3fv(location, false, value);
          break;
        case 16:
          gl.uniformMatrix4fv(location, false, value);
          break;
        default:
          console.warn(`Unsupported uniform array length: ${value.length}`);
      }
    } else if (value && typeof value === 'object') {
      // 处理矩阵和向量对象
      if (value.elements && value.elements.length === 16) {
        gl.uniformMatrix4fv(location, false, value.elements);
      } else if (value.x !== undefined && value.y !== undefined) {
        if (value.z !== undefined && value.w !== undefined) {
          gl.uniform4f(location, value.x, value.y, value.z, value.w);
        } else if (value.z !== undefined) {
          gl.uniform3f(location, value.x, value.y, value.z);
        } else {
          gl.uniform2f(location, value.x, value.y);
        }
      }
    }
  }
}

/**
 * 着色器管理器接口
 */
export interface IShaderManager {
  /**
   * 创建着色器程序
   * @param source 着色器源码
   * @returns 着色器程序
   */
  createShader(source: IShaderSource): IShaderProgram;
  
  /**
   * 获取着色器程序
   * @param id 着色器ID
   */
  getShader(id: string): IShaderProgram | null;
  
  /**
   * 根据名称获取着色器程序
   * @param name 着色器名称
   */
  getShaderByName(name: string): IShaderProgram | null;
  
  /**
   * 删除着色器程序
   * @param id 着色器ID
   */
  deleteShader(id: string): void;
  
  /**
   * 清理所有着色器
   */
  dispose(): void;
  
  /**
   * 获取统计信息
   */
  getStats(): {
    totalShaders: number;
    validShaders: number;
    invalidShaders: number;
  };
}

/**
 * 着色器管理器实现
 */
export class ShaderManager implements IShaderManager {
  private shaders = new Map<string, IShaderProgram>();
  private shadersByName = new Map<string, IShaderProgram>();
  private gl: WebGLRenderingContext;
  
  constructor(gl: WebGLRenderingContext) {
    this.gl = gl;
  }
  
  createShader(source: IShaderSource): IShaderProgram {
    const shader = new ShaderProgram(this.gl, source);
    this.shaders.set(shader.id, shader);
    this.shadersByName.set(source.name, shader);
    return shader;
  }
  
  getShader(id: string): IShaderProgram | null {
    return this.shaders.get(id) || null;
  }
  
  getShaderByName(name: string): IShaderProgram | null {
    return this.shadersByName.get(name) || null;
  }
  
  deleteShader(id: string): void {
    const shader = this.shaders.get(id);
    if (shader) {
      // 也要从名称映射中删除
      for (const [name, shaderInstance] of this.shadersByName.entries()) {
        if (shaderInstance === shader) {
          this.shadersByName.delete(name);
          break;
        }
      }
      
      shader.dispose();
      this.shaders.delete(id);
    }
  }
  
  dispose(): void {
    for (const shader of this.shaders.values()) {
      shader.dispose();
    }
    this.shaders.clear();
    this.shadersByName.clear();
  }
  
  getStats() {
    let validShaders = 0;
    let invalidShaders = 0;
    
    for (const shader of this.shaders.values()) {
      if (shader.isValid) {
        validShaders++;
      } else {
        invalidShaders++;
      }
    }
    
    return {
      totalShaders: this.shaders.size,
      validShaders,
      invalidShaders
    };
  }
}