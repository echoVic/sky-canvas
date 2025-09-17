/**
 * 批量渲染缓冲区管理
 */

import { WebGLResourceManager } from '../../resources/ResourceManager';
import { Buffer, BufferType } from '../../core/webgl/types';
import { BatchConfig, BatchVertex } from '../types/BatchTypes';

export class BatchBuffer {
  private gl: WebGLRenderingContext;
  private resourceManager: WebGLResourceManager;
  private config: BatchConfig;

  // 数据数组
  private vertices!: Float32Array;
  private indices!: Uint16Array;
  
  // WebGL缓冲区
  private vertexBuffer!: Buffer;
  private indexBuffer!: Buffer;

  // 当前数据计数
  private vertexCount = 0;
  private indexCount = 0;

  constructor(
    gl: WebGLRenderingContext,
    resourceManager: WebGLResourceManager,
    config: BatchConfig
  ) {
    this.gl = gl;
    this.resourceManager = resourceManager;
    this.config = config;

    this.initializeBuffers();
  }

  /**
   * 初始化缓冲区
   */
  private initializeBuffers(): void {
    // 创建数据数组
    this.vertices = new Float32Array(this.config.maxVertices * this.config.vertexSize);
    this.indices = new Uint16Array(this.config.maxIndices);

    // 创建WebGL缓冲区
    this.vertexBuffer = this.resourceManager.createBuffer(
      BufferType.VERTEX,
      this.vertices.buffer
    );
    this.indexBuffer = this.resourceManager.createBuffer(
      BufferType.INDEX,
      this.indices.buffer
    );
  }

  /**
   * 添加顶点到缓冲区
   */
  addVertex(vertex: BatchVertex): void {
    const offset = this.vertexCount * this.config.vertexSize;
    
    // 位置
    this.vertices[offset] = vertex.position.x;
    this.vertices[offset + 1] = vertex.position.y;
    
    // 颜色
    this.vertices[offset + 2] = vertex.color[0];
    this.vertices[offset + 3] = vertex.color[1];
    this.vertices[offset + 4] = vertex.color[2];
    this.vertices[offset + 5] = vertex.color[3];
    
    // 纹理坐标
    this.vertices[offset + 6] = vertex.texCoord?.x || 0;
    this.vertices[offset + 7] = vertex.texCoord?.y || 0;
    
    this.vertexCount++;
  }

  /**
   * 添加索引到缓冲区
   */
  addIndex(index: number): void {
    this.indices[this.indexCount++] = index;
  }

  /**
   * 添加多个索引
   */
  addIndices(indices: number[]): void {
    for (const index of indices) {
      this.indices[this.indexCount++] = index;
    }
  }

  /**
   * 检查是否有足够空间
   */
  hasSpace(vertexCount: number, indexCount: number): boolean {
    return (
      this.vertexCount + vertexCount <= this.config.maxVertices &&
      this.indexCount + indexCount <= this.config.maxIndices
    );
  }

  /**
   * 更新GPU缓冲区
   */
  updateBuffers(): void {
    if (this.vertexCount > 0) {
      this.vertexBuffer.update(
        this.vertices.buffer.slice(0, this.vertexCount * this.config.vertexSize * 4)
      );
    }
    
    if (this.indexCount > 0) {
      this.indexBuffer.update(
        this.indices.buffer.slice(0, this.indexCount * 2)
      );
    }
  }

  /**
   * 绑定缓冲区
   */
  bind(): void {
    // 绑定顶点缓冲区
    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, (this.vertexBuffer as any).buffer);
    // 绑定索引缓冲区
    this.gl.bindBuffer(this.gl.ELEMENT_ARRAY_BUFFER, (this.indexBuffer as any).buffer);
  }

  /**
   * 清空缓冲区数据
   */
  clear(): void {
    this.vertexCount = 0;
    this.indexCount = 0;
  }

  /**
   * 获取当前顶点数量
   */
  getVertexCount(): number {
    return this.vertexCount;
  }

  /**
   * 获取当前索引数量
   */
  getIndexCount(): number {
    return this.indexCount;
  }

  /**
   * 获取顶点缓冲区
   */
  getVertexBuffer(): WebGLBuffer {
    return this.vertexBuffer;
  }

  /**
   * 获取索引缓冲区
   */
  getIndexBuffer(): WebGLBuffer {
    return this.indexBuffer;
  }

  /**
   * 销毁缓冲区
   */
  dispose(): void {
    this.resourceManager.releaseResource(this.vertexBuffer);
    this.resourceManager.releaseResource(this.indexBuffer);
  }
}
