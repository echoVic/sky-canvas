/**
 * 批量渲染系统
 * 实现高效的批量渲染优化
 */

import { BaseSystem } from './SystemManager';
import { ExtensionType, Extension } from './ExtensionSystem';
import { BaseRenderer } from '../index';

/**
 * 批次状态
 */
interface BatchState {
  texture: WebGLTexture | null;
  blendMode: number;
  shader: WebGLProgram | null;
  vertexCount: number;
  indexCount: number;
}

/**
 * 批次数据
 */
interface BatchData {
  vertices: Float32Array;
  indices: Uint16Array;
  uvs: Float32Array;
  colors: Uint32Array;
  count: number;
}

/**
 * 可批量渲染对象接口
 */
export interface IBatchable {
  readonly texture: WebGLTexture | null;
  readonly blendMode: number;
  readonly vertexCount: number;
  readonly indexCount: number;
  
  fillBatchData(vertices: Float32Array, indices: Uint16Array, uvs: Float32Array, colors: Uint32Array, offset: number): number;
  canBatch(other: IBatchable): boolean;
}

/**
 * 批量渲染系统
 */
@Extension({
  type: ExtensionType.RenderSystem,
  name: 'batch-render-system',
  priority: 900
})
export class BatchRenderSystem extends BaseSystem {
  readonly name = 'batch-render-system';
  readonly priority = 900;
  
  private renderer: BaseRenderer | null = null;
  private gl: WebGLRenderingContext | null = null;
  
  // 批次配置
  private readonly maxBatchSize = 4096;
  private readonly maxTextureUnits = 16;
  
  // 批次数据
  private currentBatch: BatchData;
  private currentState: BatchState;
  private batches: IBatchable[] = [];
  
  // WebGL 资源
  private vertexBuffer: WebGLBuffer | null = null;
  private indexBuffer: WebGLBuffer | null = null;
  private shader: WebGLProgram | null = null;
  
  // 纹理管理
  private textureUnits: (WebGLTexture | null)[] = [];
  private currentTextureUnit = 0;
  
  // 性能统计
  private stats = {
    batchCount: 0,
    drawCalls: 0,
    objectsBatched: 0,
    textureSwaps: 0
  };
  
  constructor() {
    super();
    
    this.currentBatch = this.createBatchData();
    this.currentState = this.createBatchState();
    this.textureUnits = new Array(this.maxTextureUnits).fill(null);
  }
  
  /**
   * 初始化
   */
  async init(): Promise<void> {
    // 严格的渲染器验证
    if (!this.renderer) {
      throw new Error('Renderer is required and cannot be null or undefined');
    }
    
    // 安全获取渲染上下文
    let renderContext;
    try {
      renderContext = this.renderer.getContext?.();
    } catch (error) {
      throw new Error(`Failed to get render context: ${error}`);
    }
    
    if (!renderContext) {
      throw new Error('Render context is not available - renderer does not support getContext method');
    }
    
    // 验证canvas存在性和类型
    let canvas: HTMLCanvasElement | null = null;
    
    // 从渲染上下文获取canvas - 添加更严格的空值检查
    if (renderContext && 'canvas' in renderContext && renderContext.canvas instanceof HTMLCanvasElement) {
      canvas = renderContext.canvas;
    }
    
    if (!canvas) {
      throw new Error('Canvas is not available in render context');
    }
    
    // 获取WebGL上下文
    const gl = canvas.getContext('webgl2') || canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
    if (!gl) {
      throw new Error('WebGL is not supported in this browser');
    }
    
    if (!(gl instanceof WebGLRenderingContext) && !(gl instanceof WebGL2RenderingContext)) {
      throw new Error('WebGL context required for batch rendering');
    }
    
    this.gl = gl as WebGLRenderingContext;
    
    // 验证WebGL上下文初始化
    if (!this.gl) {
      throw new Error('Failed to initialize WebGL context');
    }
    
    // 初始化WebGL资源
    this.initWebGLResources();
    
    console.log('BatchRenderSystem initialized');
  }
  
  /**
   * 设置渲染器
   */
  setRenderer(renderer: BaseRenderer): void {
    if (!renderer) {
      throw new Error('Renderer cannot be null or undefined');
    }
    this.renderer = renderer;
  }
  
  /**
   * 开始批次
   */
  begin(): void {
    this.resetStats();
    this.resetBatch();
    this.resetTextureUnits();
  }
  
  /**
   * 添加可批量渲染对象
   */
  addBatchable(batchable: IBatchable): void {
    // 检查是否可以与当前批次合并
    if (this.canAddToBatch(batchable)) {
      this.addToBatch(batchable);
    } else {
      // 渲染当前批次并开始新批次
      this.flush();
      this.startNewBatch(batchable);
      this.addToBatch(batchable);
    }
  }
  
  /**
   * 结束批次并渲染
   */
  end(): void {
    if (this.currentBatch.count > 0) {
      this.flush();
    }
  }
  
  /**
   * 检查是否可以添加到当前批次
   */
  private canAddToBatch(batchable: IBatchable): boolean {
    // 检查批次大小限制
    if (this.currentBatch.count + batchable.vertexCount > this.maxBatchSize) {
      return false;
    }
    
    // 检查纹理单元限制
    if (batchable.texture && !this.hasTextureUnit(batchable.texture)) {
      if (this.currentTextureUnit >= this.maxTextureUnits) {
        return false;
      }
    }
    
    // 检查状态兼容性
    return this.isStateCompatible(batchable);
  }
  
  /**
   * 添加到当前批次
   */
  private addToBatch(batchable: IBatchable): void {
    const offset = this.currentBatch.count;
    
    // 分配纹理单元
    if (batchable.texture) {
      this.assignTextureUnit(batchable.texture);
    }
    
    // 填充批次数据
    const verticesAdded = batchable.fillBatchData(
      this.currentBatch.vertices,
      this.currentBatch.indices,
      this.currentBatch.uvs,
      this.currentBatch.colors,
      offset
    );
    
    this.currentBatch.count += verticesAdded;
    this.stats.objectsBatched++;
  }
  
  /**
   * 开始新批次
   */
  private startNewBatch(batchable: IBatchable): void {
    this.currentState.texture = batchable.texture;
    this.currentState.blendMode = batchable.blendMode;
    this.currentState.vertexCount = 0;
    this.currentState.indexCount = 0;
    
    this.resetBatch();
    this.stats.batchCount++;
  }
  
  /**
   * 渲染当前批次
   */
  private flush(): void {
    if (!this.gl || !this.shader || this.currentBatch.count === 0) {
      return;
    }
    
    // 上传顶点数据
    this.uploadBatchData();
    
    // 设置渲染状态
    this.setRenderState();
    
    // 绑定纹理
    this.bindTextures();
    
    // 绘制
    this.gl.drawElements(
      this.gl.TRIANGLES,
      this.currentBatch.count * 6, // 每个四边形6个索引
      this.gl.UNSIGNED_SHORT,
      0
    );
    
    this.stats.drawCalls++;
    this.resetBatch();
  }
  
  /**
   * 上传批次数据到GPU
   */
  private uploadBatchData(): void {
    if (!this.gl || !this.vertexBuffer || !this.indexBuffer) {
      return;
    }
    
    // 上传顶点数据
    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.vertexBuffer);
    this.gl.bufferSubData(this.gl.ARRAY_BUFFER, 0, this.currentBatch.vertices.subarray(0, this.currentBatch.count * 4));
    
    // 上传索引数据
    this.gl.bindBuffer(this.gl.ELEMENT_ARRAY_BUFFER, this.indexBuffer);
    this.gl.bufferSubData(this.gl.ELEMENT_ARRAY_BUFFER, 0, this.currentBatch.indices.subarray(0, this.currentBatch.count * 6));
  }
  
  /**
   * 设置渲染状态
   */
  private setRenderState(): void {
    if (!this.gl) return;
    
    // 设置混合模式
    this.setBlendMode(this.currentState.blendMode);
    
    // 使用着色器
    this.gl.useProgram(this.shader);
  }
  
  /**
   * 绑定纹理
   */
  private bindTextures(): void {
    if (!this.gl) return;
    
    for (let i = 0; i < this.currentTextureUnit; i++) {
      const texture = this.textureUnits[i];
      if (texture) {
        this.gl.activeTexture(this.gl.TEXTURE0 + i);
        this.gl.bindTexture(this.gl.TEXTURE_2D, texture);
      }
    }
  }
  
  /**
   * 设置混合模式
   */
  private setBlendMode(blendMode: number): void {
    if (!this.gl) return;
    
    switch (blendMode) {
      case 0: // NORMAL
        this.gl.blendFunc(this.gl.SRC_ALPHA, this.gl.ONE_MINUS_SRC_ALPHA);
        break;
      case 1: // ADD
        this.gl.blendFunc(this.gl.SRC_ALPHA, this.gl.ONE);
        break;
      case 2: // MULTIPLY
        this.gl.blendFunc(this.gl.DST_COLOR, this.gl.ONE_MINUS_SRC_ALPHA);
        break;
      default:
        this.gl.blendFunc(this.gl.SRC_ALPHA, this.gl.ONE_MINUS_SRC_ALPHA);
    }
  }
  
  /**
   * 检查是否有纹理单元
   */
  private hasTextureUnit(texture: WebGLTexture): boolean {
    return this.textureUnits.indexOf(texture) !== -1;
  }
  
  /**
   * 分配纹理单元
   */
  private assignTextureUnit(texture: WebGLTexture): number {
    let unit = this.textureUnits.indexOf(texture);
    
    if (unit === -1) {
      unit = this.currentTextureUnit++;
      this.textureUnits[unit] = texture;
      this.stats.textureSwaps++;
    }
    
    return unit;
  }
  
  /**
   * 检查状态兼容性
   */
  private isStateCompatible(batchable: IBatchable): boolean {
    return this.currentState.blendMode === batchable.blendMode;
  }
  
  /**
   * 创建批次数据
   */
  private createBatchData(): BatchData {
    return {
      vertices: new Float32Array(this.maxBatchSize * 8), // x,y,u,v per vertex, 4 vertices per quad
      indices: new Uint16Array(this.maxBatchSize * 6), // 6 indices per quad
      uvs: new Float32Array(this.maxBatchSize * 8),
      colors: new Uint32Array(this.maxBatchSize * 4),
      count: 0
    };
  }
  
  /**
   * 创建批次状态
   */
  private createBatchState(): BatchState {
    return {
      texture: null,
      blendMode: 0,
      shader: null,
      vertexCount: 0,
      indexCount: 0
    };
  }
  
  /**
   * 重置批次
   */
  private resetBatch(): void {
    this.currentBatch.count = 0;
  }
  
  /**
   * 重置纹理单元
   */
  private resetTextureUnits(): void {
    this.textureUnits.fill(null);
    this.currentTextureUnit = 0;
  }
  
  /**
   * 重置统计
   */
  private resetStats(): void {
    this.stats.batchCount = 0;
    this.stats.drawCalls = 0;
    this.stats.objectsBatched = 0;
    this.stats.textureSwaps = 0;
  }
  
  /**
   * 初始化WebGL资源
   */
  private initWebGLResources(): void {
    if (!this.gl) return;
    
    // 创建缓冲区
    this.vertexBuffer = this.gl.createBuffer();
    this.indexBuffer = this.gl.createBuffer();
    
    // 初始化缓冲区数据
    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.vertexBuffer);
    this.gl.bufferData(this.gl.ARRAY_BUFFER, this.currentBatch.vertices, this.gl.DYNAMIC_DRAW);
    
    this.gl.bindBuffer(this.gl.ELEMENT_ARRAY_BUFFER, this.indexBuffer);
    this.gl.bufferData(this.gl.ELEMENT_ARRAY_BUFFER, this.currentBatch.indices, this.gl.DYNAMIC_DRAW);
    
    // 创建着色器（简化版本）
    this.shader = this.createShader();
  }
  
  /**
   * 创建着色器
   */
  private createShader(): WebGLProgram | null {
    if (!this.gl) return null;
    
    const vertexShaderSource = `
      attribute vec2 a_position;
      attribute vec2 a_texCoord;
      attribute vec4 a_color;
      
      uniform mat3 u_matrix;
      
      varying vec2 v_texCoord;
      varying vec4 v_color;
      
      void main() {
        vec3 position = u_matrix * vec3(a_position, 1.0);
        gl_Position = vec4(position.xy, 0.0, 1.0);
        v_texCoord = a_texCoord;
        v_color = a_color;
      }
    `;
    
    const fragmentShaderSource = `
      precision mediump float;
      
      uniform sampler2D u_texture;
      
      varying vec2 v_texCoord;
      varying vec4 v_color;
      
      void main() {
        gl_FragColor = texture2D(u_texture, v_texCoord) * v_color;
      }
    `;
    
    const vertexShader = this.compileShader(vertexShaderSource, this.gl.VERTEX_SHADER);
    const fragmentShader = this.compileShader(fragmentShaderSource, this.gl.FRAGMENT_SHADER);
    
    if (!vertexShader || !fragmentShader) {
      return null;
    }
    
    const program = this.gl.createProgram();
    if (!program) return null;
    
    this.gl.attachShader(program, vertexShader);
    this.gl.attachShader(program, fragmentShader);
    this.gl.linkProgram(program);
    
    if (!this.gl.getProgramParameter(program, this.gl.LINK_STATUS)) {
      console.error('Shader program link error:', this.gl.getProgramInfoLog(program));
      return null;
    }
    
    return program;
  }
  
  /**
   * 编译着色器
   */
  private compileShader(source: string, type: number): WebGLShader | null {
    if (!this.gl) return null;
    
    const shader = this.gl.createShader(type);
    if (!shader) return null;
    
    this.gl.shaderSource(shader, source);
    this.gl.compileShader(shader);
    
    if (!this.gl.getShaderParameter(shader, this.gl.COMPILE_STATUS)) {
      console.error('Shader compile error:', this.gl.getShaderInfoLog(shader));
      this.gl.deleteShader(shader);
      return null;
    }
    
    return shader;
  }
  
  /**
   * 获取统计信息
   */
  getStats() {
    return { ...this.stats };
  }
  
  /**
   * 销毁
   */
  destroy(): void {
    if (this.gl) {
      if (this.vertexBuffer) {
        this.gl.deleteBuffer(this.vertexBuffer);
      }
      if (this.indexBuffer) {
        this.gl.deleteBuffer(this.indexBuffer);
      }
      if (this.shader) {
        this.gl.deleteProgram(this.shader);
      }
    }
    
    this.renderer = null;
    this.gl = null;
    this.vertexBuffer = null;
    this.indexBuffer = null;
    this.shader = null;
  }
}