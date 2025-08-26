/**
 * 批量渲染系统
 * 实现高效的批量渲染优化，包括智能批次合并和动态纹理图集
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
  textureAtlas?: TextureAtlas;
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
  capacity: number;
}

/**
 * 纹理图集节点
 */
interface AtlasNode {
  x: number;
  y: number;
  width: number;
  height: number;
  used: boolean;
  texture?: WebGLTexture;
  right?: AtlasNode;
  down?: AtlasNode;
}

/**
 * 动态纹理图集
 */
class TextureAtlas {
  private gl: WebGLRenderingContext;
  private texture: WebGLTexture;
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private root: AtlasNode;
  private textureMap = new Map<WebGLTexture, { x: number; y: number; width: number; height: number }>();
  
  constructor(gl: WebGLRenderingContext, size: number = 2048) {
    this.gl = gl;
    this.canvas = document.createElement('canvas');
    this.canvas.width = this.canvas.height = size;
    this.ctx = this.canvas.getContext('2d')!;
    
    this.texture = gl.createTexture()!;
    this.root = { x: 0, y: 0, width: size, height: size, used: false };
    
    this.initTexture();
  }
  
  private initTexture(): void {
    const { gl, texture, canvas } = this;
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, canvas);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  }
  
  addTexture(sourceTexture: WebGLTexture, width: number, height: number): { x: number; y: number; width: number; height: number } | null {
    if (this.textureMap.has(sourceTexture)) {
      return this.textureMap.get(sourceTexture)!;
    }
    
    const node = this.findNode(this.root, width, height);
    if (!node) return null;
    
    const splitNode = this.splitNode(node, width, height);
    const region = { x: splitNode.x, y: splitNode.y, width, height };
    
    // 将纹理绘制到图集中
    this.drawTextureToAtlas(sourceTexture, region);
    this.textureMap.set(sourceTexture, region);
    
    return region;
  }
  
  private findNode(node: AtlasNode, width: number, height: number): AtlasNode | null {
    if (node.used) {
      if (node.right) {
        const rightResult = this.findNode(node.right, width, height);
        if (rightResult) return rightResult;
      }
      if (node.down) {
        return this.findNode(node.down, width, height);
      }
      return null;
    }
    
    if (width <= node.width && height <= node.height) {
      return node;
    }
    
    return null;
  }
  
  private splitNode(node: AtlasNode, width: number, height: number): AtlasNode {
    node.used = true;
    node.down = {
      x: node.x,
      y: node.y + height,
      width: node.width,
      height: node.height - height,
      used: false
    };
    node.right = {
      x: node.x + width,
      y: node.y,
      width: node.width - width,
      height,
      used: false
    };
    return node;
  }
  
  private drawTextureToAtlas(sourceTexture: WebGLTexture, region: { x: number; y: number; width: number; height: number }): void {
    // 创建临时framebuffer来读取纹理数据
    const { gl } = this;
    const framebuffer = gl.createFramebuffer();
    const oldFramebuffer = gl.getParameter(gl.FRAMEBUFFER_BINDING);
    
    try {
      gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
      gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, sourceTexture, 0);
      
      if (gl.checkFramebufferStatus(gl.FRAMEBUFFER) === gl.FRAMEBUFFER_COMPLETE) {
        const pixels = new Uint8Array(region.width * region.height * 4);
        gl.readPixels(0, 0, region.width, region.height, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
        
        // 创建临时canvas来处理像素数据
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = region.width;
        tempCanvas.height = region.height;
        const tempCtx = tempCanvas.getContext('2d')!;
        
        const imageData = tempCtx.createImageData(region.width, region.height);
        imageData.data.set(pixels);
        tempCtx.putImageData(imageData, 0, 0);
        
        // 绘制到主图集canvas
        this.ctx.drawImage(tempCanvas, region.x, region.y);
      }
    } finally {
      gl.bindFramebuffer(gl.FRAMEBUFFER, oldFramebuffer);
      gl.deleteFramebuffer(framebuffer);
    }
  }
  
  getTexture(): WebGLTexture {
    return this.texture;
  }
  
  getUVMapping(sourceTexture: WebGLTexture): { x: number; y: number; width: number; height: number } | null {
    return this.textureMap.get(sourceTexture) || null;
  }
  
  updateTexture(): void {
    const { gl, texture, canvas } = this;
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, gl.RGBA, gl.UNSIGNED_BYTE, canvas);
  }
  
  dispose(): void {
    this.gl.deleteTexture(this.texture);
    this.textureMap.clear();
  }
}

/**
 * 可批量渲染对象接口
 */
export interface IBatchable {
  readonly texture: WebGLTexture | null;
  readonly blendMode: number;
  readonly vertexCount: number;
  readonly indexCount: number;
  readonly priority: number; // 渲染优先级
  readonly bounds: { x: number; y: number; width: number; height: number }; // 包围盒
  
  fillBatchData(vertices: Float32Array, indices: Uint16Array, uvs: Float32Array, colors: Uint32Array, offset: number): number;
  canBatch(other: IBatchable): boolean;
  getTextureSize(): { width: number; height: number };
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
  private readonly atlasSize = 2048;
  
  // 批次数据
  private currentBatch: BatchData;
  private currentState: BatchState;
  private batches: IBatchable[] = [];
  private sortedBatches: IBatchable[] = [];
  
  // WebGL 资源
  private vertexBuffer: WebGLBuffer | null = null;
  private indexBuffer: WebGLBuffer | null = null;
  private shader: WebGLProgram | null = null;
  
  // 纹理管理
  private textureUnits: (WebGLTexture | null)[] = [];
  private currentTextureUnit = 0;
  private textureAtlas: TextureAtlas | null = null;
  private enableAtlas = true;
  
  // 智能批次合并
  private batchGroups = new Map<string, IBatchable[]>();
  private frameObjectCount = 0;
  private lastFrameTime = 0;
  
  // 性能统计
  private stats = {
    batchCount: 0,
    drawCalls: 0,
    objectsBatched: 0,
    textureSwaps: 0,
    atlasHits: 0,
    atlasMisses: 0,
    sortTime: 0,
    batchTime: 0
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
    
    // 初始化纹理图集
    if (this.enableAtlas) {
      this.textureAtlas = new TextureAtlas(this.gl, this.atlasSize);
      console.log('Texture atlas initialized with size:', this.atlasSize);
    }
    
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
    // 尝试使用纹理图集优化
    if (this.enableAtlas && this.textureAtlas && batchable.texture) {
      this.tryAddToAtlas(batchable);
    }
    
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
      count: 0,
      capacity: this.maxBatchSize
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
   * 尝试将纹理添加到图集
   */
  private tryAddToAtlas(batchable: IBatchable): void {
    if (!this.textureAtlas || !batchable.texture) return;
    
    const textureSize = batchable.getTextureSize();
    const atlasRegion = this.textureAtlas.addTexture(
      batchable.texture,
      textureSize.width,
      textureSize.height
    );
    
    if (atlasRegion) {
      this.stats.atlasHits++;
      // 更新纹理图集
      this.textureAtlas.updateTexture();
    } else {
      this.stats.atlasMisses++;
    }
  }
  
  /**
   * 智能批次分组
   */
  private groupBatches(): void {
    const startTime = performance.now();
    
    this.batchGroups.clear();
    
    for (const batchable of this.batches) {
      const key = this.getBatchKey(batchable);
      if (!this.batchGroups.has(key)) {
        this.batchGroups.set(key, []);
      }
      this.batchGroups.get(key)!.push(batchable);
    }
    
    this.stats.sortTime = performance.now() - startTime;
  }
  
  /**
   * 获取批次分组键
   */
  private getBatchKey(batchable: IBatchable): string {
    const textureId = batchable.texture ? this.getTextureId(batchable.texture) : 'null';
    return `${textureId}_${batchable.blendMode}`;
  }
  
  /**
   * 获取纹理ID
   */
  private getTextureId(texture: WebGLTexture): string {
    // 简化的纹理ID生成
    return texture.toString();
  }
  
  /**
   * 优化批次排序
   */
  private optimizeBatchOrder(): void {
    this.sortedBatches = [];
    
    // 按优先级和状态分组排序
    const groups = Array.from(this.batchGroups.values());
    groups.sort((a, b) => {
      const avgPriorityA = a.reduce((sum, item) => sum + item.priority, 0) / a.length;
      const avgPriorityB = b.reduce((sum, item) => sum + item.priority, 0) / b.length;
      return avgPriorityB - avgPriorityA;
    });
    
    // 在每组内按包围盒排序（空间局部性）
    for (const group of groups) {
      group.sort((a, b) => {
        const distA = a.bounds.x + a.bounds.y;
        const distB = b.bounds.x + b.bounds.y;
        return distA - distB;
      });
      this.sortedBatches.push(...group);
    }
  }
  
  /**
   * 处理智能批次合并
   */
  processSmartBatching(): void {
    if (this.batches.length === 0) return;
    
    const startTime = performance.now();
    
    // 分组和排序
    this.groupBatches();
    this.optimizeBatchOrder();
    
    // 处理排序后的批次
    for (const batchable of this.sortedBatches) {
      this.addBatchable(batchable);
    }
    
    this.stats.batchTime = performance.now() - startTime;
    this.batches = [];
  }
  
  /**
   * 添加到批次队列
   */
  queueBatchable(batchable: IBatchable): void {
    this.batches.push(batchable);
    this.frameObjectCount++;
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
    
    // 销毁纹理图集
    if (this.textureAtlas) {
      this.textureAtlas.dispose();
      this.textureAtlas = null;
    }
    
    this.renderer = null;
    this.gl = null;
    this.vertexBuffer = null;
    this.indexBuffer = null;
    this.shader = null;
    this.batchGroups.clear();
    this.batches = [];
    this.sortedBatches = [];
  }
}