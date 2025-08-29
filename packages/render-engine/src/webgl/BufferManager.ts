/**
 * WebGL 缓冲区管理系统
 * 负责顶点缓冲区、索引缓冲区的创建、管理和优化
 */

/**
 * 缓冲区类型
 */
export enum BufferType {
  VERTEX = WebGLRenderingContext.ARRAY_BUFFER,
  INDEX = WebGLRenderingContext.ELEMENT_ARRAY_BUFFER
}

/**
 * 缓冲区使用模式
 */
export enum BufferUsage {
  STATIC = WebGLRenderingContext.STATIC_DRAW,
  DYNAMIC = WebGLRenderingContext.DYNAMIC_DRAW,
  STREAM = WebGLRenderingContext.STREAM_DRAW
}

/**
 * 顶点属性描述
 */
export interface IVertexAttribute {
  /** 属性名称 */
  name: string;
  /** 组件数量 (1-4) */
  size: number;
  /** 数据类型 */
  type: number;
  /** 是否归一化 */
  normalized: boolean;
  /** 字节偏移 */
  offset: number;
}

/**
 * 顶点布局描述
 */
export interface IVertexLayout {
  /** 步长（字节） */
  stride: number;
  /** 属性列表 */
  attributes: IVertexAttribute[];
}

/**
 * 缓冲区接口
 */
export interface IBuffer {
  /** 缓冲区ID */
  readonly id: string;
  /** WebGL缓冲区对象 */
  readonly buffer: WebGLBuffer;
  /** 缓冲区类型 */
  readonly type: BufferType;
  /** 使用模式 */
  readonly usage: BufferUsage;
  /** 大小（字节） */
  readonly size: number;
  /** 是否有效 */
  readonly isValid: boolean;
  
  /**
   * 绑定缓冲区
   * @param gl WebGL上下文
   */
  bind(gl: WebGLRenderingContext): void;
  
  /**
   * 解绑缓冲区
   * @param gl WebGL上下文
   */
  unbind(gl: WebGLRenderingContext): void;
  
  /**
   * 上传数据
   * @param gl WebGL上下文
   * @param data 数据
   * @param offset 偏移
   */
  uploadData(gl: WebGLRenderingContext, data: ArrayBufferView, offset?: number): void;
  
  /**
   * 部分更新数据
   * @param gl WebGL上下文
   * @param data 数据
   * @param offset 偏移
   */
  updateData(gl: WebGLRenderingContext, data: ArrayBufferView, offset: number): void;
  
  /**
   * 销毁缓冲区
   * @param gl WebGL上下文
   */
  dispose(gl: WebGLRenderingContext): void;
}

/**
 * 缓冲区实现
 */
export class Buffer implements IBuffer {
  private static idCounter = 0;
  
  readonly id: string;
  readonly buffer: WebGLBuffer;
  readonly type: BufferType;
  readonly usage: BufferUsage;
  private _size = 0;
  private _isValid = true;
  
  constructor(
    gl: WebGLRenderingContext,
    type: BufferType,
    usage: BufferUsage = BufferUsage.STATIC,
    name?: string
  ) {
    this.id = name || `buffer_${++Buffer.idCounter}`;
    this.type = type;
    this.usage = usage;
    
    const buffer = gl.createBuffer();
    if (!buffer) {
      throw new Error('Failed to create WebGL buffer');
    }
    this.buffer = buffer;
  }
  
  get size(): number {
    return this._size;
  }
  
  get isValid(): boolean {
    return this._isValid;
  }
  
  bind(gl: WebGLRenderingContext): void {
    if (!this._isValid) {
      throw new Error(`Cannot bind invalid buffer: ${this.id}`);
    }
    gl.bindBuffer(this.type, this.buffer);
  }
  
  unbind(gl: WebGLRenderingContext): void {
    gl.bindBuffer(this.type, null);
  }
  
  uploadData(gl: WebGLRenderingContext, data: ArrayBufferView, offset: number = 0): void {
    this.bind(gl);
    
    if (offset === 0) {
      // 完整上传
      gl.bufferData(this.type, data, this.usage);
      this._size = data.byteLength;
    } else {
      // 部分上传
      gl.bufferSubData(this.type, offset, data);
    }
  }
  
  updateData(gl: WebGLRenderingContext, data: ArrayBufferView, offset: number): void {
    if (offset + data.byteLength > this._size) {
      throw new Error('Buffer update out of bounds');
    }
    
    this.bind(gl);
    gl.bufferSubData(this.type, offset, data);
  }
  
  dispose(gl: WebGLRenderingContext): void {
    if (this._isValid) {
      gl.deleteBuffer(this.buffer);
      this._isValid = false;
      this._size = 0;
    }
  }
}

/**
 * 顶点数组对象接口
 */
export interface IVertexArray {
  /** VAO ID */
  readonly id: string;
  /** WebGL VAO对象 */
  readonly vao: WebGLVertexArrayObjectOES | null;
  /** 顶点缓冲区 */
  readonly vertexBuffer: IBuffer;
  /** 索引缓冲区 */
  readonly indexBuffer?: IBuffer;
  /** 顶点布局 */
  readonly layout: IVertexLayout;
  /** 是否有效 */
  readonly isValid: boolean;
  
  /**
   * 绑定VAO
   * @param gl WebGL上下文
   * @param ext VAO扩展
   */
  bind(gl: WebGLRenderingContext, ext: OES_vertex_array_object): void;
  
  /**
   * 解绑VAO
   * @param gl WebGL上下文
   * @param ext VAO扩展
   */
  unbind(gl: WebGLRenderingContext, ext: OES_vertex_array_object): void;
  
  /**
   * 设置顶点属性
   * @param gl WebGL上下文
   * @param program 着色器程序
   */
  setupAttributes(gl: WebGLRenderingContext, program: WebGLProgram): void;
  
  /**
   * 绘制
   * @param gl WebGL上下文
   * @param mode 绘制模式
   * @param count 顶点/索引数量
   * @param offset 偏移
   */
  draw(gl: WebGLRenderingContext, mode: number, count: number, offset?: number): void;
  
  /**
   * 销毁VAO
   * @param gl WebGL上下文
   * @param ext VAO扩展
   */
  dispose(gl: WebGLRenderingContext, ext: OES_vertex_array_object): void;
}

/**
 * 顶点数组对象实现
 */
export class VertexArray implements IVertexArray {
  private static idCounter = 0;
  
  readonly id: string;
  readonly vao: WebGLVertexArrayObjectOES | null;
  readonly vertexBuffer: IBuffer;
  readonly indexBuffer?: IBuffer;
  readonly layout: IVertexLayout;
  private _isValid = true;
  
  constructor(
    gl: WebGLRenderingContext,
    ext: OES_vertex_array_object | null,
    vertexBuffer: IBuffer,
    layout: IVertexLayout,
    indexBuffer?: IBuffer,
    name?: string
  ) {
    this.id = name || `vao_${++VertexArray.idCounter}`;
    this.vertexBuffer = vertexBuffer;
    this.indexBuffer = indexBuffer;
    this.layout = layout;
    
    // 创建VAO（如果支持）
    this.vao = ext ? ext.createVertexArrayOES() : null;
    
    if (this.vao && ext) {
      // 设置VAO
      ext.bindVertexArrayOES(this.vao);
      this.setupAttributes(gl, null); // 预设置属性
      ext.bindVertexArrayOES(null);
    }
  }
  
  get isValid(): boolean {
    return this._isValid && this.vertexBuffer.isValid;
  }
  
  bind(gl: WebGLRenderingContext, ext: OES_vertex_array_object): void {
    if (!this._isValid) {
      throw new Error(`Cannot bind invalid VAO: ${this.id}`);
    }
    
    if (this.vao) {
      ext.bindVertexArrayOES(this.vao);
    } else {
      // 手动绑定缓冲区
      this.vertexBuffer.bind(gl);
      if (this.indexBuffer) {
        this.indexBuffer.bind(gl);
      }
    }
  }
  
  unbind(gl: WebGLRenderingContext, ext: OES_vertex_array_object): void {
    if (this.vao) {
      ext.bindVertexArrayOES(null);
    } else {
      this.vertexBuffer.unbind(gl);
      if (this.indexBuffer) {
        this.indexBuffer.unbind(gl);
      }
    }
  }
  
  setupAttributes(gl: WebGLRenderingContext, program: WebGLProgram | null): void {
    this.vertexBuffer.bind(gl);
    
    for (const attr of this.layout.attributes) {
      let location = -1;
      
      if (program) {
        location = gl.getAttribLocation(program, attr.name);
      }
      
      if (location >= 0) {
        gl.enableVertexAttribArray(location);
        gl.vertexAttribPointer(
          location,
          attr.size,
          attr.type,
          attr.normalized,
          this.layout.stride,
          attr.offset
        );
      }
    }
    
    if (this.indexBuffer) {
      this.indexBuffer.bind(gl);
    }
  }
  
  draw(gl: WebGLRenderingContext, mode: number, count: number, offset: number = 0): void {
    if (this.indexBuffer) {
      gl.drawElements(mode, count, gl.UNSIGNED_SHORT, offset);
    } else {
      gl.drawArrays(mode, offset, count);
    }
  }
  
  dispose(gl: WebGLRenderingContext, ext: OES_vertex_array_object): void {
    if (this._isValid) {
      if (this.vao) {
        ext.deleteVertexArrayOES(this.vao);
      }
      this.vertexBuffer.dispose(gl);
      if (this.indexBuffer) {
        this.indexBuffer.dispose(gl);
      }
      this._isValid = false;
    }
  }
}

/**
 * 缓冲区管理器接口
 */
export interface IBufferManager {
  /**
   * 创建缓冲区
   * @param type 缓冲区类型
   * @param usage 使用模式
   * @param name 名称
   */
  createBuffer(type: BufferType, usage?: BufferUsage, name?: string): IBuffer;
  
  /**
   * 创建顶点数组对象
   * @param vertexBuffer 顶点缓冲区
   * @param layout 顶点布局
   * @param indexBuffer 索引缓冲区
   * @param name 名称
   */
  createVertexArray(
    vertexBuffer: IBuffer,
    layout: IVertexLayout,
    indexBuffer?: IBuffer,
    name?: string
  ): IVertexArray;
  
  /**
   * 获取缓冲区
   * @param id 缓冲区ID
   */
  getBuffer(id: string): IBuffer | null;
  
  /**
   * 获取VAO
   * @param id VAO ID
   */
  getVertexArray(id: string): IVertexArray | null;
  
  /**
   * 删除缓冲区
   * @param id 缓冲区ID
   */
  deleteBuffer(id: string): void;
  
  /**
   * 删除VAO
   * @param id VAO ID
   */
  deleteVertexArray(id: string): void;
  
  /**
   * 清理所有资源
   */
  dispose(): void;
  
  /**
   * 获取统计信息
   */
  getStats(): {
    bufferCount: number;
    vaoCount: number;
    totalMemory: number;
  };
}

/**
 * 缓冲区管理器实现
 */
export class BufferManager implements IBufferManager {
  private gl: WebGLRenderingContext;
  private vaoExt: OES_vertex_array_object | null;
  private buffers = new Map<string, IBuffer>();
  private vertexArrays = new Map<string, IVertexArray>();
  
  constructor(gl: WebGLRenderingContext) {
    this.gl = gl;
    this.vaoExt = gl.getExtension('OES_vertex_array_object');
  }
  
  createBuffer(type: BufferType, usage: BufferUsage = BufferUsage.STATIC, name?: string): IBuffer {
    const buffer = new Buffer(this.gl, type, usage, name);
    this.buffers.set(buffer.id, buffer);
    return buffer;
  }
  
  createVertexArray(
    vertexBuffer: IBuffer,
    layout: IVertexLayout,
    indexBuffer?: IBuffer,
    name?: string
  ): IVertexArray {
    const vao = new VertexArray(this.gl, this.vaoExt, vertexBuffer, layout, indexBuffer, name);
    this.vertexArrays.set(vao.id, vao);
    return vao;
  }
  
  getBuffer(id: string): IBuffer | null {
    return this.buffers.get(id) || null;
  }
  
  getVertexArray(id: string): IVertexArray | null {
    return this.vertexArrays.get(id) || null;
  }
  
  deleteBuffer(id: string): void {
    const buffer = this.buffers.get(id);
    if (buffer) {
      buffer.dispose(this.gl);
      this.buffers.delete(id);
    }
  }
  
  deleteVertexArray(id: string): void {
    const vao = this.vertexArrays.get(id);
    if (vao && this.vaoExt) {
      vao.dispose(this.gl, this.vaoExt);
      this.vertexArrays.delete(id);
    }
  }
  
  dispose(): void {
    // 清理所有VAO
    if (this.vaoExt) {
      for (const vao of this.vertexArrays.values()) {
        vao.dispose(this.gl, this.vaoExt);
      }
    }
    this.vertexArrays.clear();
    
    // 清理所有缓冲区
    for (const buffer of this.buffers.values()) {
      buffer.dispose(this.gl);
    }
    this.buffers.clear();
  }
  
  getStats() {
    let totalMemory = 0;
    for (const buffer of this.buffers.values()) {
      totalMemory += buffer.size;
    }
    
    return {
      bufferCount: this.buffers.size,
      vaoCount: this.vertexArrays.size,
      totalMemory
    };
  }
}