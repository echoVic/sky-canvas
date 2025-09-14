/**
 * WebGL渲染器
 * 使用统一批处理系统的高性能渲染器
 */

import { GeometryGenerator } from '../adapters/GeometryGenerator';
import { IWebGLContext } from '../adapters/WebGLContext';
import {
  BatchManager,
  BatchStats,
  createBatchManagerWithDefaultStrategies,
  IRenderable,
  type BatchManagerConfig
} from '../batch';
import { BaseRenderer, RenderContext, RendererCapabilities } from '../core';
import { IRect } from '../graphics/IGraphicsContext';
import { Matrix3 } from '../math/Matrix3';
import { BufferManager, BufferType, BufferUsage, IBuffer } from '../webgl/BufferManager';
import { SHADER_LIBRARY } from '../webgl/ShaderLibrary';
import { IShaderProgram, ShaderManager } from '../webgl/ShaderManager';

/**
 * WebGL渲染器
 */
export class WebGLRenderer extends BaseRenderer {
  private context: IWebGLContext;
  private gl: WebGLRenderingContext;
  private shaderManager: ShaderManager;
  private bufferManager: BufferManager;
  
  private currentShader: IShaderProgram | null = null;
  private batchManager: BatchManager;
  
  // 常用缓冲区（保留用于非批处理操作）
  private vertexBuffer: IBuffer | null = null;
  private indexBuffer: IBuffer | null = null;

  constructor(context: IWebGLContext, config?: Partial<BatchManagerConfig>) {
    super(); // 调用BaseRenderer构造函数
    this.context = context;
    this.gl = context.gl;

    // 简化：不再直接管理批处理系统，而是通过适配器
    // 保留引用用于某些直接操作
    this.shaderManager = new ShaderManager(this.gl);
    this.bufferManager = new BufferManager(this.gl);
    this.batchManager = createBatchManagerWithDefaultStrategies(this.gl, config);
  }

  // BaseRenderer要求的公共初始化方法
  initialize(canvas: HTMLCanvasElement): boolean {
    // WebGL渲染器在构造时已经初始化
    return true;
  }

  private setup(): void {
    // 初始化标准着色器
    this.setupShaders();
    
    // 创建通用缓冲区
    this.vertexBuffer = this.bufferManager.createBuffer(
      BufferType.VERTEX, 
      BufferUsage.DYNAMIC, 
      'main_vertex_buffer'
    );
    
    this.indexBuffer = this.bufferManager.createBuffer(
      BufferType.INDEX, 
      BufferUsage.DYNAMIC, 
      'main_index_buffer'
    );
  }

  private setupShaders(): void {
    // 创建基础着色器
    this.shaderManager.createShader(SHADER_LIBRARY.BASIC_SHAPE);
    this.shaderManager.createShader(SHADER_LIBRARY.SOLID_COLOR);
    this.shaderManager.createShader(SHADER_LIBRARY.TEXTURE);
  }

  /**
   * 设置批处理策略
   */
  setBatchStrategy(strategy: 'basic' | 'enhanced' | 'instanced'): void {
    this.batchManager.setStrategy(strategy);
  }

  /**
   * 获取当前批处理策略
   */
  getCurrentBatchStrategy(): string {
    return this.batchManager.getCurrentStrategy();
  }

  /**
   * 绘制矩形
   */
  drawRectangle(
    x: number, 
    y: number, 
    width: number, 
    height: number,
    fillColor?: string,
    strokeColor?: string,
    strokeWidth?: number
  ): void {
    // 绘制填充矩形
    if (fillColor) {
      const color = GeometryGenerator.parseColor(fillColor);
      const renderable = this.createRectangleRenderable(x, y, width, height, color);
      this.batchManager.addRenderable(renderable);
    }

    // 绘制描边
    if (strokeColor && strokeWidth && strokeWidth > 0) {
      this.drawRectangleStroke(x, y, width, height, strokeColor, strokeWidth);
    }
  }

  /**
   * 绘制矩形描边
   */
  private drawRectangleStroke(
    x: number, 
    y: number, 
    width: number, 
    height: number,
    strokeColor: string,
    strokeWidth: number
  ): void {
    const color = GeometryGenerator.parseColor(strokeColor);
    
    // 绘制四条边线
    const lines = [
      // 上边
      { x1: x, y1: y, x2: x + width, y2: y },
      // 右边
      { x1: x + width, y1: y, x2: x + width, y2: y + height },
      // 下边
      { x1: x + width, y1: y + height, x2: x, y2: y + height },
      // 左边
      { x1: x, y1: y + height, x2: x, y2: y }
    ];

    lines.forEach(line => {
      const renderable = this.createLineRenderable(
        line.x1, line.y1, line.x2, line.y2, strokeWidth, color
      );
      this.batchManager.addRenderable(renderable);
    });
  }

  /**
   * 绘制圆形 - 通过适配器调用
   */
  drawCircle(
    centerX: number,
    centerY: number,
    radius: number,
    fillColor?: string,
    strokeColor?: string,
    strokeWidth?: number
  ): void {
    // 设置适配器状态
    if (fillColor) {
      this.context.setFillStyle(fillColor);
      this.context.fillCircle(centerX, centerY, radius);
    }

    if (strokeColor && strokeWidth) {
      this.context.setStrokeStyle(strokeColor);
      this.context.setLineWidth(strokeWidth);
      this.context.strokeCircle(centerX, centerY, radius);
    }
  }

  /**
   * 绘制线条 - 通过适配器调用
   */
  drawLine(
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    color?: string,
    width?: number
  ): void {
    if (color) this.context.setStrokeStyle(color);
    if (width) this.context.setLineWidth(width);
    this.context.drawLine(x1, y1, x2, y2);
  }

  /**
   * 绘制多边形
   */
  drawPolygon(points: { x: number; y: number }[], fillColor?: string): void {
    if (points.length < 3) return;
    
    const color = fillColor ? 
      GeometryGenerator.parseColor(fillColor) : 
      [1, 1, 1, 1] as [number, number, number, number];
    
    // 将多边形三角化
    const geometry = GeometryGenerator.createPolygon(points, color);
    
    if (geometry.vertexCount > 0) {
      const renderable = this.geometryDataToRenderable(geometry, 'basic');
      this.batchManager.addRenderable(renderable);
    }
  }

  /**
   * 绘制文本（占位符实现）
   */
  drawText(
    text: string, 
    x: number, 
    y: number, 
    color?: string, 
    font?: string, 
    stroke?: boolean
  ): void {
    // WebGL文本渲染需要预渲染文本到纹理
    // 这里是简化实现，实际项目中需要文本纹理系统
    console.warn(`WebGL text rendering not implemented: "${text}" at (${x}, ${y})`);
  }

  /**
   * 绘制纹理
   */
  drawTexture(
    texture: WebGLTexture | null, 
    x: number, 
    y: number, 
    width: number, 
    height: number
  ): void {
    if (!texture) return;
    
    const renderable = this.createTextureRenderable(x, y, width, height, texture);
    this.batchManager.addRenderable(renderable);
  }

  /**
   * 执行渲染
   */
  flush(projectionMatrix: Matrix3, transformMatrix?: Matrix3): void {
    // 清除深度缓冲区（虽然2D不需要，但保持良好习惯）
    this.gl.clear(this.gl.DEPTH_BUFFER_BIT);

    // 组合投影和变换矩阵
    const combinedMatrix = transformMatrix ? 
      projectionMatrix.multiply(transformMatrix) : 
      projectionMatrix;
    
    // 使用统一批处理系统渲染
    this.batchManager.flush(combinedMatrix);
  }

  /**
   * 清空画布 - 通过适配器调用
   */
  clear(): void {
    this.context.clear();
  }

  /**
   * BaseRenderer要求的渲染方法 - 通过适配器调用
   */
  render(context: RenderContext): void {
    // 设置视口
    this.gl.viewport(0, 0, context.canvas.width, context.canvas.height);

    // 清空画布
    this.clear();

    // 渲染所有可见对象
    for (const drawable of this.drawables) {
      if (drawable.visible && this.boundsIntersect(drawable.getBounds(), context.viewport)) {
        drawable.draw(context);
      }
    }

    // 通过适配器执行渲染
    this.context.present();
  }

  /**
   * BaseRenderer要求的能力查询方法
   */
  getCapabilities(): RendererCapabilities {
    return {
      supportsTransforms: true,
      supportsFilters: false,
      supportsBlending: true,
      maxTextureSize: this.gl.getParameter(this.gl.MAX_TEXTURE_SIZE),
      supportedFormats: ['png', 'jpg', 'jpeg', 'webp']
    };
  }

  /**
   * 创建投影矩阵
   */
  private createProjectionMatrix(viewport: IRect): Matrix3 {
    // 创建正交投影矩阵
    const left = viewport.x;
    const right = viewport.x + viewport.width;
    const bottom = viewport.y + viewport.height;
    const top = viewport.y;
    
    // 简化的正交投影矩阵创建
    const width = right - left;
    const height = bottom - top;
    
    return new Matrix3([
      2 / width, 0, 0,
      0, -2 / height, 0,
      -(right + left) / width, (bottom + top) / height, 1
    ]);
  }

  /**
   * 获取渲染统计
   */
  getStats(): {
    batchStats: BatchStats;
    shaderStats: any;
    bufferStats: any;
    currentStrategy: string;
  } {
    return {
      batchStats: this.batchManager.getStats(),
      shaderStats: this.shaderManager.getStats(),
      bufferStats: this.bufferManager.getStats(),
      currentStrategy: this.batchManager.getCurrentStrategy()
    };
  }

  /**
   * 获取渲染统计(符合BaseRenderer接口)
   */
  getRenderStats(): { drawCalls: number; triangles: number; vertices: number; batches: number; textureBinds: number; shaderSwitches: number; frameTime: number } {
    const batchStats = this.batchManager.getStats();
    return {
      drawCalls: batchStats.drawCalls || 0,
      triangles: batchStats.triangles || 0,
      vertices: batchStats.vertices || 0,
      batches: batchStats.batches || 0,
      textureBinds: 0, // TODO: 从纹理管理器获取
      shaderSwitches: 0, // TODO: 从着色器管理器获取
      frameTime: 0
    };
  }

  /**
   * 获取详细的批处理性能信息
   */
  getDetailedBatchStats() {
    return this.batchManager.getDetailedStats();
  }

  /**
   * 自动优化批处理策略
   */
  autoOptimize(): void {
    this.batchManager.autoOptimize();
  }

  /**
   * 释放资源
   */
  dispose(): void {
    this.clear();
    this.batchManager.dispose();
    this.shaderManager.dispose();
    this.bufferManager.dispose();
    this.currentShader = null;
    this.vertexBuffer = null;
    this.indexBuffer = null;
  }

  /**
   * 创建矩形可渲染对象
   */
  private createRectangleRenderable(
    x: number, y: number, width: number, height: number,
    color: [number, number, number, number]
  ): IRenderable {
    const vertices = new Float32Array([
      // position + color + uv
      x, y, color[0], color[1], color[2], color[3], 0, 0,
      x + width, y, color[0], color[1], color[2], color[3], 1, 0,
      x + width, y + height, color[0], color[1], color[2], color[3], 1, 1,
      x, y + height, color[0], color[1], color[2], color[3], 0, 1
    ]);

    const indices = new Uint16Array([0, 1, 2, 0, 2, 3]);

    return {
      getVertices: () => vertices,
      getIndices: () => indices,
      getShader: () => 'basic_shape',
      getBlendMode: () => 0, // NORMAL
      getZIndex: () => 0
    };
  }

  /**
   * 创建圆形可渲染对象
   */
  private createCircleRenderable(
    centerX: number, centerY: number, radius: number, segments: number,
    color: [number, number, number, number]
  ): IRenderable {
    const vertexCount = segments + 1; // 中心点 + 圆周点
    const vertices = new Float32Array(vertexCount * 8); // position(2) + color(4) + uv(2)
    const indices: number[] = [];

    // 中心点
    let offset = 0;
    vertices[offset++] = centerX; // x
    vertices[offset++] = centerY; // y
    vertices[offset++] = color[0]; // r
    vertices[offset++] = color[1]; // g
    vertices[offset++] = color[2]; // b
    vertices[offset++] = color[3]; // a
    vertices[offset++] = 0.5; // u
    vertices[offset++] = 0.5; // v

    // 圆周点
    for (let i = 0; i < segments; i++) {
      const angle = (i / segments) * Math.PI * 2;
      const x = centerX + Math.cos(angle) * radius;
      const y = centerY + Math.sin(angle) * radius;
      
      vertices[offset++] = x;
      vertices[offset++] = y;
      vertices[offset++] = color[0];
      vertices[offset++] = color[1];
      vertices[offset++] = color[2];
      vertices[offset++] = color[3];
      vertices[offset++] = (Math.cos(angle) + 1) * 0.5;
      vertices[offset++] = (Math.sin(angle) + 1) * 0.5;
    }

    // 生成扇形索引
    for (let i = 0; i < segments; i++) {
      const next = (i + 1) % segments;
      indices.push(0, i + 1, next + 1);
    }

    return {
      getVertices: () => vertices,
      getIndices: () => new Uint16Array(indices),
      getShader: () => 'basic_shape',
      getBlendMode: () => 0,
      getZIndex: () => 0
    };
  }

  /**
   * 创建线条可渲染对象
   */
  private createLineRenderable(
    x1: number, y1: number, x2: number, y2: number, width: number,
    color: [number, number, number, number]
  ): IRenderable {
    const dx = x2 - x1;
    const dy = y2 - y1;
    const length = Math.sqrt(dx * dx + dy * dy);
    
    if (length < 0.001) {
      return {
        getVertices: () => new Float32Array(0),
        getIndices: () => new Uint16Array(0),
        getShader: () => 'basic_shape',
        getBlendMode: () => 0,
        getZIndex: () => 0
      };
    }

    const dirX = dx / length;
    const dirY = dy / length;
    const normalX = -dirY;
    const normalY = dirX;
    const halfWidth = width * 0.5;

    const vertices = new Float32Array([
      // 起点左侧
      x1 + normalX * halfWidth, y1 + normalY * halfWidth, 
      color[0], color[1], color[2], color[3], 0, 0,
      // 起点右侧
      x1 - normalX * halfWidth, y1 - normalY * halfWidth, 
      color[0], color[1], color[2], color[3], 0, 1,
      // 终点右侧
      x2 - normalX * halfWidth, y2 - normalY * halfWidth, 
      color[0], color[1], color[2], color[3], 1, 1,
      // 终点左侧
      x2 + normalX * halfWidth, y2 + normalY * halfWidth, 
      color[0], color[1], color[2], color[3], 1, 0
    ]);

    const indices = new Uint16Array([0, 1, 2, 0, 2, 3]);

    return {
      getVertices: () => vertices,
      getIndices: () => indices,
      getShader: () => 'basic_shape',
      getBlendMode: () => 0,
      getZIndex: () => 0
    };
  }

  /**
   * 创建纹理可渲染对象
   */
  private createTextureRenderable(
    x: number, y: number, width: number, height: number,
    texture: WebGLTexture
  ): IRenderable {
    const vertices = new Float32Array([
      // position + color + uv
      x, y, 1, 1, 1, 1, 0, 0,
      x + width, y, 1, 1, 1, 1, 1, 0,
      x + width, y + height, 1, 1, 1, 1, 1, 1,
      x, y + height, 1, 1, 1, 1, 0, 1
    ]);

    const indices = new Uint16Array([0, 1, 2, 0, 2, 3]);

    return {
      getVertices: () => vertices,
      getIndices: () => indices,
      getTexture: () => texture,
      getShader: () => 'texture',
      getBlendMode: () => 0,
      getZIndex: () => 0
    };
  }

  /**
   * 将GeometryData转换为IRenderable
   */
  private geometryDataToRenderable(geometry: any, shaderName: string): IRenderable {
    return {
      getVertices: () => new Float32Array(geometry.vertices),
      getIndices: () => new Uint16Array(geometry.indices),
      getShader: () => shaderName,
      getBlendMode: () => 0,
      getZIndex: () => 0
    };
  }
}