import { Point, Rect, RenderContext } from '../../types';
import { BaseRenderer, Drawable, RendererCapabilities, RenderState } from '../core';
import {
  BlendMode,
  BufferType,
  RenderStats
} from '../core/RenderTypes';
import { Matrix3x3, Vector2 } from '../math';
import { WebGLBuffer, WebGLResourceManager } from '../resources/ResourceManager';
import { DefaultShaders, WebGLShaderManager } from '../shaders/ShaderManager';
import { WebGLTextureManager, TextureAtlas } from '../textures/TextureManager';
import { WebGLMemoryManager, PoolType } from '../memory/MemoryManager';
import { WebGLPerformanceAnalyzer, WebGLPerformanceMonitor } from '../performance/WebGLAnalyzer';

// WebGL渲染上下文
export interface WebGLRenderContext extends RenderContext {
  gl: WebGLRenderingContext;
}

// 顶点数据结构
export interface Vertex {
  position: Vector2;
  color: [number, number, number, number];
  texCoord?: Vector2;
}

// 批量渲染数据
export interface BatchData {
  vertices: Vertex[];
  indices: number[];
  texture?: WebGLTexture;
  blendMode: BlendMode;
}

export class WebGLRenderer extends BaseRenderer {
  private gl: WebGLRenderingContext | null = null;
  private shaderManager: WebGLShaderManager | null = null;
  private resourceManager: WebGLResourceManager | null = null;
  private textureManager: WebGLTextureManager | null = null;
  private memoryManager: WebGLMemoryManager | null = null;
  private performanceAnalyzer: WebGLPerformanceAnalyzer | null = null;
  private performanceMonitor: WebGLPerformanceMonitor | null = null;
  private currentContext: WebGLRenderContext | null = null;
  
  // 高级批量渲染系统
  private batches = new Map<string, BatchData>();
  private currentBatch: BatchData | null = null;
  private maxBatchSize = 65536; // 增加批次大小到64K顶点
  private batchSortKey = '';
  
  // 实例渲染支持
  private instancedArrays: ANGLE_instanced_arrays | null = null;
  private instanceBuffer: WebGLBuffer | null = null;
  private maxInstances = 1000;
  
  // 动态几何缓存
  private geometryCache = new Map<string, { vertices: Float32Array; indices: Uint16Array }>();
  private quadGeometry: { vertices: Float32Array; indices: Uint16Array } | null = null;
  
  // 纹理图集
  private mainAtlas: TextureAtlas | null = null;
  
  // 优化标志
  private enablePerformanceMonitoring = false;
  private enableMemoryOptimization = true;
  
  // 渲染统计
  private stats: RenderStats = {
    drawCalls: 0,
    triangles: 0,
    vertices: 0,
    batches: 0,
    textureBinds: 0,
    shaderSwitches: 0,
    frameTime: 0
  };
  
  // 投影矩阵
  private projectionMatrix = Matrix3x3.identity();
  
  // 缓冲区
  private vertexBuffer: WebGLBuffer | null = null;
  private indexBuffer: WebGLBuffer | null = null;

  initialize(canvas: HTMLCanvasElement, options?: {
    enablePerformanceMonitoring?: boolean;
    enableMemoryOptimization?: boolean;
  }): boolean {
    // 获取WebGL上下文
    this.gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
    if (!this.gl) {
      console.error('WebGL not supported');
      return false;
    }

    // 设置选项
    this.enablePerformanceMonitoring = options?.enablePerformanceMonitoring ?? false;
    this.enableMemoryOptimization = options?.enableMemoryOptimization ?? true;

    // 获取WebGL扩展
    this.instancedArrays = this.gl.getExtension('ANGLE_instanced_arrays');
    if (this.instancedArrays) {
      console.log('Instanced rendering supported');
    }

    // 初始化管理器
    this.shaderManager = new WebGLShaderManager(this.gl);
    this.resourceManager = new WebGLResourceManager(this.gl);
    this.textureManager = new WebGLTextureManager(this.gl);
    
    if (this.enableMemoryOptimization) {
      this.memoryManager = new WebGLMemoryManager(this.gl);
    }

    if (this.enablePerformanceMonitoring) {
      this.performanceAnalyzer = new WebGLPerformanceAnalyzer(this.gl);
      this.performanceMonitor = new WebGLPerformanceMonitor(this.performanceAnalyzer);
    }

    // 设置WebGL状态
    this.setupWebGLState();

    // 加载默认着色器
    this.loadDefaultShaders();

    // 创建缓冲区
    this.createBuffers();

    // 预构建几何
    this.createQuadGeometry();

    // 创建纹理图集
    this.mainAtlas = this.textureManager!.createAtlas('main', 2048);

    console.log('WebGL Renderer initialized with advanced features');
    return true;
  }

  private setupWebGLState(): void {
    if (!this.gl) return;

    // 启用混合
    this.gl.enable(this.gl.BLEND);
    this.gl.blendFunc(this.gl.SRC_ALPHA, this.gl.ONE_MINUS_SRC_ALPHA);

    // 设置清除颜色
    this.gl.clearColor(0, 0, 0, 0);

    // 禁用深度测试（2D渲染）
    this.gl.disable(this.gl.DEPTH_TEST);
  }

  private async loadDefaultShaders(): Promise<void> {
    if (!this.shaderManager) return;

    await this.shaderManager.loadShader('basic', DefaultShaders.basic);
    await this.shaderManager.loadShader('textured', DefaultShaders.textured);
  }

  private createBuffers(): void {
    if (!this.resourceManager) return;

    // 创建更大的顶点缓冲区 (position + color + texCoord = 8 floats)
    const vertexData = new ArrayBuffer(this.maxBatchSize * 8 * 4);
    this.vertexBuffer = this.resourceManager.createBuffer(BufferType.VERTEX, vertexData);

    // 创建索引缓冲区
    const indexData = new ArrayBuffer(this.maxBatchSize * 6 * 2);
    this.indexBuffer = this.resourceManager.createBuffer(BufferType.INDEX, indexData);

    // 创建实例缓冲区（如果支持）
    if (this.instancedArrays && this.resourceManager) {
      const instanceData = new ArrayBuffer(this.maxInstances * 16 * 4); // 4x4 matrix per instance
      this.instanceBuffer = this.resourceManager.createBuffer(BufferType.VERTEX, instanceData);
    }
  }

  private createQuadGeometry(): void {
    // 预构建四边形几何 - 单位四边形
    const vertices = new Float32Array([
      // position(2) + color(4) + texCoord(2) = 8 components per vertex
      0.0, 0.0, 1.0, 1.0, 1.0, 1.0, 0.0, 0.0, // 左下
      1.0, 0.0, 1.0, 1.0, 1.0, 1.0, 1.0, 0.0, // 右下  
      1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, // 右上
      0.0, 1.0, 1.0, 1.0, 1.0, 1.0, 0.0, 1.0  // 左上
    ]);

    const indices = new Uint16Array([
      0, 1, 2,
      0, 2, 3
    ]);

    this.quadGeometry = { vertices, indices };
    this.geometryCache.set('quad', this.quadGeometry);
  }

  render(context: RenderContext): void {
    if (!this.gl || !this.shaderManager) return;

    // 开始性能分析
    if (this.performanceAnalyzer) {
      this.performanceAnalyzer.beginFrame();
    }

    this.currentContext = context as WebGLRenderContext;
    const startTime = performance.now();

    // 重置统计
    this.resetStats();

    // 设置视口
    this.gl.viewport(0, 0, context.canvas.width, context.canvas.height);

    // 更新投影矩阵
    this.updateProjectionMatrix(context.viewport);

    // 清空画布
    this.clear();

    // 收集并排序可见对象
    const visibleDrawables = this.cullAndSortDrawables(context.viewport);

    // 智能批量渲染
    this.renderDrawablesBatched(visibleDrawables);

    // 更新统计
    this.stats.frameTime = performance.now() - startTime;

    // 更新性能分析器
    if (this.performanceAnalyzer) {
      this.updatePerformanceMetrics();
      this.performanceAnalyzer.endFrame();
    }

    // 内存管理
    if (this.memoryManager?.isUnderMemoryPressure()) {
      this.performMemoryCleanup();
    }
  }

  private updatePerformanceMetrics(): void {
    if (!this.performanceAnalyzer) return;

    // 更新内存使用情况
    const textureStats = this.textureManager?.getStats() || { memoryUsage: 0 };
    const memoryStats = this.memoryManager?.getGlobalStats() || { totalUsed: 0 };
    
    this.performanceAnalyzer.updateMemoryUsage(
      memoryStats.totalUsed,
      textureStats.memoryUsage
    );
  }

  private performMemoryCleanup(): void {
    // 清理纹理
    this.textureManager?.cleanup();
    
    // 执行垃圾回收
    this.memoryManager?.garbageCollect();
    
    console.log('Performed memory cleanup due to memory pressure');
  }

  private cullAndSortDrawables(viewport: Rect): Drawable[] {
    const visible = this.drawables.filter(drawable => 
      drawable.visible && this.isDrawableInViewport(drawable, viewport)
    );

    // 按渲染状态排序以减少状态切换
    return visible.sort((a, b) => {
      // 首先按纹理排序
      const aTexture = this.getDrawableTexture(a);
      const bTexture = this.getDrawableTexture(b);
      if (aTexture !== bTexture) {
        return (aTexture || '').localeCompare(bTexture || '');
      }

      // 然后按混合模式排序  
      const aBlend = this.getDrawableBlendMode(a);
      const bBlend = this.getDrawableBlendMode(b);
      if (aBlend !== bBlend) {
        return aBlend - bBlend;
      }

      // 最后按深度排序
      return (a.transform?.position?.x || 0) - (b.transform?.position?.x || 0);
    });
  }

  private renderDrawablesBatched(drawables: Drawable[]): void {
    this.batches.clear();
    
    // 将drawables分组到批次中
    for (const drawable of drawables) {
      const batchKey = this.generateBatchKey(drawable);
      this.addDrawableToBatch(drawable, batchKey);
    }

    // 渲染所有批次
    for (const [key, batch] of this.batches) {
      if (batch.vertices.length > 0) {
        this.renderBatch(batch);
      }
    }
  }

  private generateBatchKey(drawable: Drawable): string {
    const texture = this.getDrawableTexture(drawable) || 'none';
    const blendMode = this.getDrawableBlendMode(drawable);
    return `${texture}_${blendMode}`;
  }

  private getDrawableTexture(drawable: Drawable): string | null {
    // 简化实现，实际应该从drawable属性中获取
    return null;
  }

  private getDrawableBlendMode(drawable: Drawable): BlendMode {
    // 简化实现，实际应该从drawable属性中获取
    return BlendMode.NORMAL;
  }

  private resetStats(): void {
    this.stats.drawCalls = 0;
    this.stats.triangles = 0;
    this.stats.vertices = 0;
    this.stats.batches = 0;
    this.stats.textureBinds = 0;
    this.stats.shaderSwitches = 0;
  }

  private updateProjectionMatrix(viewport: Rect): void {
    // 创建正交投影矩阵
    const left = viewport.x;
    const right = viewport.x + viewport.width;
    const bottom = viewport.y + viewport.height;
    const top = viewport.y;

    this.projectionMatrix = Matrix3x3.orthographic(left, right, bottom, top);
  }

  private addDrawableToBatch(drawable: Drawable, batchKey: string): void {
    let batch = this.batches.get(batchKey);
    if (!batch) {
      batch = {
        vertices: [],
        indices: [],
        blendMode: this.getDrawableBlendMode(drawable),
        texture: undefined
      };
      this.batches.set(batchKey, batch);
    }

    // 使用预构建的四边形几何
    if (this.quadGeometry) {
      const bounds = drawable.getBounds();
      const transform = drawable.transform;
      
      // 计算变换矩阵
      const matrix = this.calculateTransformMatrix(bounds, transform);
      
      // 添加变换后的顶点
      this.addTransformedQuad(batch, matrix, [1, 1, 1, 1]);
    }
  }

  private calculateTransformMatrix(bounds: Rect, transform?: any): Matrix3x3 {
    let matrix = Matrix3x3.identity();
    
    // 应用位移
    matrix = matrix.multiply(Matrix3x3.translation(bounds.x, bounds.y));
    
    // 应用缩放
    matrix = matrix.multiply(Matrix3x3.scale(bounds.width, bounds.height));
    
    // 应用额外变换
    if (transform) {
      // 简化实现，实际应该使用transform的完整矩阵
      if (transform.rotation) {
        matrix = matrix.multiply(Matrix3x3.rotation(transform.rotation));
      }
    }
    
    return matrix;
  }

  private addTransformedQuad(
    batch: BatchData, 
    transform: Matrix3x3, 
    color: [number, number, number, number]
  ): void {
    if (!this.quadGeometry) return;

    const baseIndex = batch.vertices.length;
    
    // 变换四边形顶点
    for (let i = 0; i < 4; i++) {
      const srcIndex = i * 8; // 8 components per vertex in source
      const x = this.quadGeometry.vertices[srcIndex];
      const y = this.quadGeometry.vertices[srcIndex + 1];
      
      const transformedPos = transform.transformPoint(new Vector2(x, y));
      
      batch.vertices.push({
        position: transformedPos,
        color: color,
        texCoord: new Vector2(
          this.quadGeometry.vertices[srcIndex + 6], // u
          this.quadGeometry.vertices[srcIndex + 7]  // v
        )
      });
    }

    // 添加索引（调整为当前批次的基础索引）
    for (const index of this.quadGeometry.indices) {
      batch.indices.push(baseIndex + index);
    }
  }

  private renderBatch(batch: BatchData): void {
    if (!this.gl || !this.shaderManager || !this.vertexBuffer || !this.indexBuffer) return;
    if (batch.vertices.length === 0) return;

    // 选择适当的着色器
    const shaderName = batch.texture ? 'textured' : 'basic';
    this.shaderManager.useProgram(shaderName);
    this.stats.shaderSwitches++;

    // 设置uniform
    this.shaderManager.setUniform('u_projection', this.projectionMatrix.elements);
    this.shaderManager.setUniform('u_transform', Matrix3x3.identity().elements);

    // 绑定纹理（如果有）
    if (batch.texture) {
      this.gl.activeTexture(this.gl.TEXTURE0);
      this.gl.bindTexture(this.gl.TEXTURE_2D, batch.texture);
      this.shaderManager.setUniform('u_texture', 0);
      this.stats.textureBinds++;
    }

    // 设置混合模式
    this.setBlendMode(batch.blendMode);

    // 准备数据
    const vertexData = this.prepareOptimizedVertexData(batch.vertices);
    const indexData = this.prepareIndexData(batch.indices);

    // 更新缓冲区
    this.vertexBuffer.update(vertexData);
    this.indexBuffer.update(indexData);

    // 绑定缓冲区
    this.vertexBuffer.bind();
    this.indexBuffer.bind();

    // 设置顶点属性
    this.setupOptimizedVertexAttributes();

    // 绘制
    this.gl.drawElements(this.gl.TRIANGLES, batch.indices.length, this.gl.UNSIGNED_SHORT, 0);

    // 更新统计
    this.stats.drawCalls++;
    this.stats.batches++;
    this.stats.vertices += batch.vertices.length;
    this.stats.triangles += batch.indices.length / 3;
  }

  private setBlendMode(mode: BlendMode): void {
    if (!this.gl) return;

    switch (mode) {
      case BlendMode.NORMAL:
        this.gl.blendFunc(this.gl.SRC_ALPHA, this.gl.ONE_MINUS_SRC_ALPHA);
        break;
      case BlendMode.ADDITIVE:
        this.gl.blendFunc(this.gl.SRC_ALPHA, this.gl.ONE);
        break;
      case BlendMode.MULTIPLY:
        this.gl.blendFunc(this.gl.DST_COLOR, this.gl.ZERO);
        break;
      default:
        this.gl.blendFunc(this.gl.SRC_ALPHA, this.gl.ONE_MINUS_SRC_ALPHA);
    }
  }

  private prepareOptimizedVertexData(vertices: Vertex[]): ArrayBuffer {
    // 优化：直接写入Float32Array而不是ArrayBuffer
    const buffer = new Float32Array(vertices.length * 8); // position(2) + color(4) + texCoord(2)

    for (let i = 0; i < vertices.length; i++) {
      const vertex = vertices[i];
      const offset = i * 8;
      
      // 位置
      buffer[offset] = vertex.position.x;
      buffer[offset + 1] = vertex.position.y;
      
      // 颜色
      buffer[offset + 2] = vertex.color[0];
      buffer[offset + 3] = vertex.color[1];
      buffer[offset + 4] = vertex.color[2];
      buffer[offset + 5] = vertex.color[3];
      
      // 纹理坐标
      buffer[offset + 6] = vertex.texCoord?.x || 0;
      buffer[offset + 7] = vertex.texCoord?.y || 0;
    }

    return buffer.buffer;
  }

  private setupOptimizedVertexAttributes(): void {
    if (!this.gl || !this.shaderManager) return;

    const program = this.shaderManager.getShader('basic');
    if (!program) return;

    const stride = 8 * 4; // 8 floats per vertex

    // 位置属性
    const positionLocation = program.attributes.get('a_position');
    if (positionLocation !== undefined) {
      this.gl.enableVertexAttribArray(positionLocation);
      this.gl.vertexAttribPointer(positionLocation, 2, this.gl.FLOAT, false, stride, 0);
    }

    // 颜色属性
    const colorLocation = program.attributes.get('a_color');
    if (colorLocation !== undefined) {
      this.gl.enableVertexAttribArray(colorLocation);
      this.gl.vertexAttribPointer(colorLocation, 4, this.gl.FLOAT, false, stride, 2 * 4);
    }

    // 纹理坐标属性
    const texCoordLocation = program.attributes.get('a_texCoord');
    if (texCoordLocation !== undefined) {
      this.gl.enableVertexAttribArray(texCoordLocation);
      this.gl.vertexAttribPointer(texCoordLocation, 2, this.gl.FLOAT, false, stride, 6 * 4);
    }
  }

  private prepareIndexData(indices: number[]): ArrayBuffer {
    const buffer = new Uint16Array(indices);
    return buffer.buffer;
  }

  clear(): void {
    if (!this.gl) return;
    this.gl.clear(this.gl.COLOR_BUFFER_BIT);
  }

  getCapabilities(): RendererCapabilities {
    if (!this.gl) {
      return {
        supportsTransforms: false,
        supportsFilters: false,
        supportsBlending: false,
        maxTextureSize: 0,
        supportedFormats: []
      };
    }

    return {
      supportsTransforms: true,
      supportsFilters: true,
      supportsBlending: true,
      maxTextureSize: this.gl.getParameter(this.gl.MAX_TEXTURE_SIZE),
      supportedFormats: ['png', 'jpg', 'jpeg', 'webp']
    };
  }

  getRenderStats(): RenderStats {
    return { ...this.stats };
  }

  // 绘制基础图形方法
  drawLine(start: Point, end: Point, style?: Partial<RenderState>): void {
    // 实现线段绘制
    this.addLineToCurrentBatch(start, end, style);
  }

  drawRect(x: number, y: number, width: number, height: number, filled = false, style?: Partial<RenderState>): void {
    // 实现矩形绘制
    this.addRectToCurrentBatch(x, y, width, height, filled, style);
  }

  drawCircle(center: Point, radius: number, filled = false, style?: Partial<RenderState>): void {
    // 实现圆形绘制
    this.addCircleToCurrentBatch(center, radius, filled, style);
  }

  private addLineToCurrentBatch(start: Point, end: Point, style?: Partial<RenderState>): void {
    if (!this.currentBatch) return;

    const color: [number, number, number, number] = [1, 1, 1, 1];
    if (style?.strokeStyle && typeof style.strokeStyle === 'string') {
      // 简化颜色解析
      const rgba = this.parseColor(style.strokeStyle);
      color[0] = rgba[0];
      color[1] = rgba[1];
      color[2] = rgba[2];
      color[3] = rgba[3];
    }

    const vertices: Vertex[] = [
      { position: new Vector2(start.x, start.y), color },
      { position: new Vector2(end.x, end.y), color }
    ];

    const baseIndex = this.currentBatch.vertices.length;
    this.currentBatch.vertices.push(...vertices);
    this.currentBatch.indices.push(baseIndex, baseIndex + 1);
  }

  private addRectToCurrentBatch(x: number, y: number, width: number, height: number, filled: boolean, style?: Partial<RenderState>): void {
    if (!this.currentBatch) return;

    const color: [number, number, number, number] = [1, 1, 1, 1];
    if (style?.fillStyle && typeof style.fillStyle === 'string') {
      const rgba = this.parseColor(style.fillStyle);
      color[0] = rgba[0];
      color[1] = rgba[1];
      color[2] = rgba[2];
      color[3] = rgba[3];
    }

    const vertices: Vertex[] = [
      { position: new Vector2(x, y), color },
      { position: new Vector2(x + width, y), color },
      { position: new Vector2(x + width, y + height), color },
      { position: new Vector2(x, y + height), color }
    ];

    const baseIndex = this.currentBatch.vertices.length;
    this.currentBatch.vertices.push(...vertices);

    if (filled) {
      this.currentBatch.indices.push(
        baseIndex, baseIndex + 1, baseIndex + 2,
        baseIndex, baseIndex + 2, baseIndex + 3
      );
    } else {
      this.currentBatch.indices.push(
        baseIndex, baseIndex + 1,
        baseIndex + 1, baseIndex + 2,
        baseIndex + 2, baseIndex + 3,
        baseIndex + 3, baseIndex
      );
    }
  }

  private addCircleToCurrentBatch(center: Point, radius: number, filled: boolean, style?: Partial<RenderState>): void {
    if (!this.currentBatch) return;

    const segments = Math.max(8, Math.min(64, Math.floor(radius / 2)));
    const color: [number, number, number, number] = [1, 1, 1, 1];
    
    if (style?.fillStyle && typeof style.fillStyle === 'string') {
      const rgba = this.parseColor(style.fillStyle);
      color[0] = rgba[0];
      color[1] = rgba[1];
      color[2] = rgba[2];
      color[3] = rgba[3];
    }

    const vertices: Vertex[] = [];
    const baseIndex = this.currentBatch.vertices.length;

    // 中心点
    if (filled) {
      vertices.push({ position: new Vector2(center.x, center.y), color });
    }

    // 圆周点
    for (let i = 0; i <= segments; i++) {
      const angle = (i / segments) * Math.PI * 2;
      const x = center.x + Math.cos(angle) * radius;
      const y = center.y + Math.sin(angle) * radius;
      vertices.push({ position: new Vector2(x, y), color });
    }

    this.currentBatch.vertices.push(...vertices);

    // 生成索引
    if (filled) {
      for (let i = 0; i < segments; i++) {
        this.currentBatch.indices.push(
          baseIndex, // 中心点
          baseIndex + 1 + i,
          baseIndex + 1 + ((i + 1) % segments)
        );
      }
    } else {
      for (let i = 0; i < segments; i++) {
        this.currentBatch.indices.push(
          baseIndex + i,
          baseIndex + ((i + 1) % segments)
        );
      }
    }
  }

  private parseColor(colorStr: string): [number, number, number, number] {
    // 简化的颜色解析，支持十六进制
    if (colorStr.startsWith('#')) {
      const hex = colorStr.slice(1);
      const r = parseInt(hex.slice(0, 2), 16) / 255;
      const g = parseInt(hex.slice(2, 4), 16) / 255;
      const b = parseInt(hex.slice(4, 6), 16) / 255;
      return [r, g, b, 1];
    }
    return [1, 1, 1, 1]; // 默认白色
  }

  private isDrawableInViewport(drawable: Drawable, viewport: Rect): boolean {
    const bounds = drawable.getBounds();
    return this.boundsIntersect(bounds, viewport);
  }

  // 公共访问方法
  
  /**
   * 获取性能分析器
   */
  getPerformanceAnalyzer(): WebGLPerformanceAnalyzer | null {
    return this.performanceAnalyzer;
  }

  /**
   * 获取性能监控器
   */
  getPerformanceMonitor(): WebGLPerformanceMonitor | null {
    return this.performanceMonitor;
  }

  /**
   * 获取纹理管理器
   */
  getTextureManager(): WebGLTextureManager | null {
    return this.textureManager;
  }

  /**
   * 获取内存管理器
   */
  getMemoryManager(): WebGLMemoryManager | null {
    return this.memoryManager;
  }

  /**
   * 创建性能调试面板
   */
  createPerformanceDebugPanel(): HTMLElement | null {
    return this.performanceMonitor?.createDebugPanel() || null;
  }

  /**
   * 生成性能报告
   */
  generatePerformanceReport(): string {
    return this.performanceAnalyzer?.generatePerformanceReport() || 'Performance monitoring disabled';
  }

  /**
   * 启用/禁用性能监控
   */
  setPerformanceMonitoringEnabled(enabled: boolean): void {
    this.performanceAnalyzer?.setEnabled(enabled);
  }

  /**
   * 手动触发内存清理
   */
  forceMemoryCleanup(): void {
    this.performMemoryCleanup();
  }

  /**
   * 获取WebGL能力信息
   */
  getWebGLCapabilities(): { 
    instancedArrays: boolean;
    maxTextureSize: number;
    maxVertexAttribs: number;
    maxFragmentUniforms: number;
  } {
    if (!this.gl) {
      return {
        instancedArrays: false,
        maxTextureSize: 0,
        maxVertexAttribs: 0,
        maxFragmentUniforms: 0
      };
    }

    return {
      instancedArrays: !!this.instancedArrays,
      maxTextureSize: this.gl.getParameter(this.gl.MAX_TEXTURE_SIZE),
      maxVertexAttribs: this.gl.getParameter(this.gl.MAX_VERTEX_ATTRIBS),
      maxFragmentUniforms: this.gl.getParameter(this.gl.MAX_FRAGMENT_UNIFORM_VECTORS)
    };
  }

  dispose(): void {
    // 清理所有管理器
    this.performanceMonitor?.dispose();
    this.performanceAnalyzer?.dispose();
    this.memoryManager?.dispose();
    this.textureManager?.dispose();
    this.mainAtlas?.dispose();
    this.shaderManager?.dispose();
    this.resourceManager?.dispose();
    
    // 清理缓存
    this.batches.clear();
    this.geometryCache.clear();
    
    this.gl = null;
    this.currentContext = null;
    super.dispose();

    console.log('WebGL Renderer disposed');
  }
}
