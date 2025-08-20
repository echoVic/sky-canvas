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
  private currentContext: WebGLRenderContext | null = null;
  
  // 批量渲染
  private batches = new Map<string, BatchData>();
  private currentBatch: BatchData | null = null;
  private maxBatchSize = 10000;
  
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

  initialize(canvas: HTMLCanvasElement): boolean {
    // 获取WebGL上下文
    this.gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
    if (!this.gl) {
      console.error('WebGL not supported');
      return false;
    }

    // 初始化管理器
    this.shaderManager = new WebGLShaderManager(this.gl);
    this.resourceManager = new WebGLResourceManager(this.gl);

    // 设置WebGL状态
    this.setupWebGLState();

    // 加载默认着色器
    this.loadDefaultShaders();

    // 创建缓冲区
    this.createBuffers();

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

    // 创建顶点缓冲区
    const vertexData = new ArrayBuffer(this.maxBatchSize * 6 * 4 * 4); // 6 vertices per quad, 4 floats per vertex
    this.vertexBuffer = this.resourceManager.createBuffer(BufferType.VERTEX, vertexData);

    // 创建索引缓冲区
    const indexData = new ArrayBuffer(this.maxBatchSize * 6 * 2); // 6 indices per quad, 2 bytes per index
    this.indexBuffer = this.resourceManager.createBuffer(BufferType.INDEX, indexData);
  }

  render(context: RenderContext): void {
    if (!this.gl || !this.shaderManager) return;

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

    // 开始批量渲染
    this.beginBatch();

    // 渲染所有可见对象
    for (const drawable of this.drawables) {
      if (drawable.visible && this.isDrawableInViewport(drawable, context.viewport)) {
        this.renderDrawable(drawable);
      }
    }

    // 结束批量渲染
    this.endBatch();

    // 更新统计
    this.stats.frameTime = performance.now() - startTime;
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

  private beginBatch(): void {
    this.currentBatch = {
      vertices: [],
      indices: [],
      blendMode: BlendMode.NORMAL
    };
  }

  private endBatch(): void {
    if (this.currentBatch && this.currentBatch.vertices.length > 0) {
      this.flushBatch();
    }
    this.currentBatch = null;
  }

  private renderDrawable(drawable: Drawable): void {
    // 根据drawable类型添加到批次
    this.addToBatch(drawable);
  }

  private addToBatch(drawable: Drawable): void {
    if (!this.currentBatch) return;

    // 简化实现：将drawable转换为四边形
    const bounds = drawable.getBounds();
    const transform = drawable.transform;

    // 创建四边形顶点
    const vertices: Vertex[] = [
      { position: new Vector2(bounds.x, bounds.y), color: [1, 1, 1, 1] },
      { position: new Vector2(bounds.x + bounds.width, bounds.y), color: [1, 1, 1, 1] },
      { position: new Vector2(bounds.x + bounds.width, bounds.y + bounds.height), color: [1, 1, 1, 1] },
      { position: new Vector2(bounds.x, bounds.y + bounds.height), color: [1, 1, 1, 1] }
    ];

    // 应用变换
    if (transform) {
      for (const vertex of vertices) {
        vertex.position = transform.transformPoint(vertex.position);
      }
    }

    // 添加到批次
    const baseIndex = this.currentBatch.vertices.length;
    this.currentBatch.vertices.push(...vertices);
    this.currentBatch.indices.push(
      baseIndex, baseIndex + 1, baseIndex + 2,
      baseIndex, baseIndex + 2, baseIndex + 3
    );

    // 检查是否需要刷新批次
    if (this.currentBatch.vertices.length >= this.maxBatchSize) {
      this.flushBatch();
      this.beginBatch();
    }
  }

  private flushBatch(): void {
    if (!this.currentBatch || !this.gl || !this.shaderManager || !this.vertexBuffer || !this.indexBuffer) return;
    if (this.currentBatch.vertices.length === 0) return;

    // 使用基础着色器
    this.shaderManager.useProgram('basic');
    this.stats.shaderSwitches++;

    // 设置uniform
    this.shaderManager.setUniform('u_projection', this.projectionMatrix.elements);
    this.shaderManager.setUniform('u_transform', Matrix3x3.identity().elements);

    // 准备顶点数据
    const vertexData = this.prepareVertexData(this.currentBatch.vertices);
    const indexData = this.prepareIndexData(this.currentBatch.indices);

    // 更新缓冲区
    this.vertexBuffer.update(vertexData);
    this.indexBuffer.update(indexData);

    // 绑定缓冲区
    this.vertexBuffer.bind();
    this.indexBuffer.bind();

    // 设置顶点属性
    this.setupVertexAttributes();

    // 绘制
    this.gl.drawElements(this.gl.TRIANGLES, this.currentBatch.indices.length, this.gl.UNSIGNED_SHORT, 0);

    // 更新统计
    this.stats.drawCalls++;
    this.stats.batches++;
    this.stats.vertices += this.currentBatch.vertices.length;
    this.stats.triangles += this.currentBatch.indices.length / 3;
  }

  private prepareVertexData(vertices: Vertex[]): ArrayBuffer {
    const buffer = new ArrayBuffer(vertices.length * 6 * 4); // position(2) + color(4) = 6 floats
    const view = new Float32Array(buffer);

    for (let i = 0; i < vertices.length; i++) {
      const vertex = vertices[i];
      const offset = i * 6;
      
      view[offset] = vertex.position.x;
      view[offset + 1] = vertex.position.y;
      view[offset + 2] = vertex.color[0];
      view[offset + 3] = vertex.color[1];
      view[offset + 4] = vertex.color[2];
      view[offset + 5] = vertex.color[3];
    }

    return buffer;
  }

  private prepareIndexData(indices: number[]): ArrayBuffer {
    const buffer = new ArrayBuffer(indices.length * 2);
    const view = new Uint16Array(buffer);
    
    for (let i = 0; i < indices.length; i++) {
      view[i] = indices[i];
    }

    return buffer;
  }

  private setupVertexAttributes(): void {
    if (!this.gl || !this.shaderManager) return;

    const program = this.shaderManager.getShader('basic');
    if (!program) return;

    const stride = 6 * 4; // 6 floats per vertex

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

  dispose(): void {
    this.shaderManager?.dispose();
    this.resourceManager?.dispose();
    this.gl = null;
    this.currentContext = null;
    super.dispose();
  }
}
