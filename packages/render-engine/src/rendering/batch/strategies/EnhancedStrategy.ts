/**
 * 增强批处理策略
 * 从 batching/ 目录迁移的高级功能，支持纹理图集、智能分组等
 */

import { Matrix3 } from '../../../math/Matrix3';
import { Vector2 } from '../../../math';
import { IBatchStrategy, BatchContext, BatchData } from '../core/IBatchStrategy';
import { IRenderable, BatchStats } from '../core/IBatchRenderer';
import { BatchBuffer, BatchDataUtils, RenderBatch, Vertex, BatchKey } from '../core/BatchData';

/**
 * 增强批处理配置
 */
interface EnhancedBatchConfig {
  maxBatchSize: number;
  enableTextureAtlas: boolean;
  enableSpatialSorting: boolean;
  textureAtlasSize: number;
}

/**
 * 纹理区域描述
 */
interface TextureRegion {
  texture: WebGLTexture;
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * 增强批处理策略
 * 支持纹理图集、空间排序、智能分组等高级功能
 */
export class EnhancedStrategy implements IBatchStrategy {
  readonly name = 'enhanced';

  private batches: Map<string, RenderBatch> = new Map();
  private batchBuffer: BatchBuffer;
  private config: EnhancedBatchConfig;
  
  // 纹理图集相关
  private textureAtlas: WebGLTexture | null = null;
  private atlasRegions: Map<WebGLTexture, TextureRegion> = new Map();
  
  private stats: BatchStats = {
    drawCalls: 0,
    triangles: 0,
    vertices: 0,
    batches: 0,
    textureBinds: 0,
    shaderSwitches: 0,
    frameTime: 0
  };

  constructor(
    private gl: WebGLRenderingContext,
    config: Partial<EnhancedBatchConfig> = {}
  ) {
    this.config = {
      maxBatchSize: 65536,
      enableTextureAtlas: true,
      enableSpatialSorting: true,
      textureAtlasSize: 2048,
      ...config
    };
    
    this.batchBuffer = new BatchBuffer(gl);
    
    if (this.config.enableTextureAtlas) {
      this.initializeTextureAtlas();
    }
  }

  /**
   * 处理可渲染对象
   */
  process(renderable: IRenderable): void {
    const vertices = this.convertToVertices(renderable);
    const indices = Array.from(renderable.getIndices());
    
    let batchKey: BatchKey = {
      texture: renderable.getTexture?.() || null,
      shader: renderable.getShader(),
      blendMode: renderable.getBlendMode?.() || 0,
      zIndex: renderable.getZIndex?.() || 0
    };

    // 尝试使用纹理图集
    if (this.config.enableTextureAtlas && batchKey.texture) {
      const atlasRegion = this.atlasRegions.get(batchKey.texture);
      if (atlasRegion) {
        batchKey.texture = this.textureAtlas;
        // 调整UV坐标以适配纹理图集
        this.adjustUVForAtlas(vertices, atlasRegion);
      }
    }

    this.addToBatch(batchKey, vertices, indices);
  }

  /**
   * 执行批处理渲染
   */
  flush(projectionMatrix: Matrix3, context: BatchContext): void {
    const startTime = performance.now();
    this.resetStats();

    let sortedBatches = Array.from(this.batches.values());

    // 空间排序（如果启用）
    if (this.config.enableSpatialSorting) {
      sortedBatches = this.spatialSort(sortedBatches);
    } else {
      // 按 Z-Index 排序
      sortedBatches.sort((a, b) => a.key.zIndex - b.key.zIndex);
    }

    // 渲染批次
    for (const batch of sortedBatches) {
      if (batch.vertices.length >= this.config.maxBatchSize) {
        // 分割过大的批次
        this.renderLargeBatch(batch, projectionMatrix, context);
      } else {
        this.renderBatch(batch, projectionMatrix, context);
      }
    }

    this.stats.frameTime = performance.now() - startTime;
    this.clear();
  }

  /**
   * 清空批处理数据
   */
  clear(): void {
    this.batches.clear();
  }

  /**
   * 获取当前批次
   */
  getBatches(): BatchData[] {
    return Array.from(this.batches.values()).map(batch => ({
      vertices: BatchDataUtils.verticesToArray(batch.vertices),
      indices: new Uint16Array(batch.indices),
      texture: batch.key.texture,
      shader: batch.key.shader,
      blendMode: batch.key.blendMode,
      zIndex: batch.key.zIndex,
      count: batch.vertices.length
    }));
  }

  /**
   * 获取统计信息
   */
  getStats(): BatchStats {
    return { ...this.stats };
  }

  /**
   * 释放资源
   */
  dispose(): void {
    this.batchBuffer.dispose();
    this.batches.clear();
    
    if (this.textureAtlas) {
      this.gl.deleteTexture(this.textureAtlas);
      this.textureAtlas = null;
    }
    
    this.atlasRegions.clear();
  }

  /**
   * 添加到批次
   */
  private addToBatch(batchKey: BatchKey, vertices: Vertex[], indices: number[]): void {
    const keyString = this.getBatchKeyString(batchKey);
    const existingBatch = this.batches.get(keyString);

    if (existingBatch && 
        BatchDataUtils.canMergeBatches(existingBatch.key, batchKey) &&
        (existingBatch.vertices.length + vertices.length) < this.config.maxBatchSize) {
      // 合并到现有批次
      const vertexOffset = existingBatch.vertices.length;
      existingBatch.vertices.push(...vertices);
      
      // 调整索引偏移
      for (const index of indices) {
        existingBatch.indices.push(index + vertexOffset);
      }
    } else {
      // 创建新批次
      this.batches.set(keyString + '_' + this.batches.size, {
        key: batchKey,
        vertices: vertices,
        indices: indices
      });
    }
  }

  /**
   * 空间排序
   * 按照物体在屏幕上的位置进行排序，提高渲染效率
   */
  private spatialSort(batches: RenderBatch[]): RenderBatch[] {
    return batches.sort((a, b) => {
      // 计算批次的中心点
      const centerA = this.calculateBatchCenter(a);
      const centerB = this.calculateBatchCenter(b);
      
      // 按 Z-Index 优先，然后按空间位置排序
      if (a.key.zIndex !== b.key.zIndex) {
        return a.key.zIndex - b.key.zIndex;
      }
      
      // 使用希尔伯特曲线或简单的从左到右、从上到下排序
      if (Math.abs(centerA.y - centerB.y) > 50) {
        return centerA.y - centerB.y;
      }
      return centerA.x - centerB.x;
    });
  }

  /**
   * 计算批次的中心点
   */
  private calculateBatchCenter(batch: RenderBatch): Vector2 {
    if (batch.vertices.length === 0) {
      return new Vector2(0, 0);
    }

    let totalX = 0;
    let totalY = 0;

    for (const vertex of batch.vertices) {
      totalX += vertex.position.x;
      totalY += vertex.position.y;
    }

    return new Vector2(
      totalX / batch.vertices.length,
      totalY / batch.vertices.length
    );
  }

  /**
   * 渲染大批次（分割处理）
   */
  private renderLargeBatch(batch: RenderBatch, projectionMatrix: Matrix3, context: BatchContext): void {
    const chunkSize = this.config.maxBatchSize;
    
    for (let i = 0; i < batch.vertices.length; i += chunkSize) {
      const endIndex = Math.min(i + chunkSize, batch.vertices.length);
      const chunkVertices = batch.vertices.slice(i, endIndex);
      
      // 调整对应的索引
      const chunkIndices: number[] = [];
      const vertexOffset = i;
      
      for (const index of batch.indices) {
        if (index >= i && index < endIndex) {
          chunkIndices.push(index - vertexOffset);
        }
      }

      if (chunkVertices.length > 0 && chunkIndices.length > 0) {
        const chunkBatch: RenderBatch = {
          key: batch.key,
          vertices: chunkVertices,
          indices: chunkIndices
        };
        
        this.renderBatch(chunkBatch, projectionMatrix, context);
      }
    }
  }

  /**
   * 渲染单个批次
   */
  private renderBatch(batch: RenderBatch, projectionMatrix: Matrix3, context: BatchContext): void {
    if (batch.vertices.length === 0 || batch.indices.length === 0) {
      return;
    }

    // 设置渲染状态
    this.setupRenderState(batch, projectionMatrix);

    // 上传几何数据
    const vertexData = BatchDataUtils.verticesToArray(batch.vertices);
    const indexData = new Uint16Array(batch.indices);

    this.batchBuffer.uploadVertexData(vertexData);
    this.batchBuffer.uploadIndexData(indexData);
    this.batchBuffer.bind();
    this.batchBuffer.setupVertexAttributes();

    // 绘制
    context.gl.drawElements(
      context.gl.TRIANGLES,
      batch.indices.length,
      context.gl.UNSIGNED_SHORT,
      0
    );

    // 更新统计
    this.stats.drawCalls++;
    this.stats.batches++;
    this.stats.vertices += batch.vertices.length;
    this.stats.triangles += Math.floor(batch.indices.length / 3);
  }

  /**
   * 设置渲染状态
   */
  private setupRenderState(batch: RenderBatch, projectionMatrix: Matrix3): void {
    // 设置混合模式
    this.setBlendMode(batch.key.blendMode);
    
    // 绑定纹理
    if (batch.key.texture) {
      this.gl.bindTexture(this.gl.TEXTURE_2D, batch.key.texture);
      this.stats.textureBinds++;
    }

    // TODO: 集成着色器系统
  }

  /**
   * 初始化纹理图集
   */
  private initializeTextureAtlas(): void {
    this.textureAtlas = this.gl.createTexture();
    if (!this.textureAtlas) return;

    this.gl.bindTexture(this.gl.TEXTURE_2D, this.textureAtlas);
    this.gl.texImage2D(
      this.gl.TEXTURE_2D, 0, this.gl.RGBA,
      this.config.textureAtlasSize, this.config.textureAtlasSize,
      0, this.gl.RGBA, this.gl.UNSIGNED_BYTE, null
    );
    
    this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MIN_FILTER, this.gl.LINEAR);
    this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MAG_FILTER, this.gl.LINEAR);
    this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_S, this.gl.CLAMP_TO_EDGE);
    this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_T, this.gl.CLAMP_TO_EDGE);
  }

  /**
   * 调整UV坐标以适配纹理图集
   */
  private adjustUVForAtlas(vertices: Vertex[], region: TextureRegion): void {
    const atlasWidth = this.config.textureAtlasSize;
    const atlasHeight = this.config.textureAtlasSize;
    
    const regionU = region.x / atlasWidth;
    const regionV = region.y / atlasHeight;
    const regionWidth = region.width / atlasWidth;
    const regionHeight = region.height / atlasHeight;

    for (const vertex of vertices) {
      vertex.uv.x = regionU + vertex.uv.x * regionWidth;
      vertex.uv.y = regionV + vertex.uv.y * regionHeight;
    }
  }

  /**
   * 设置混合模式
   */
  private setBlendMode(blendMode: number): void {
    switch (blendMode) {
      case 0: // NORMAL
        this.gl.blendFunc(this.gl.SRC_ALPHA, this.gl.ONE_MINUS_SRC_ALPHA);
        break;
      case 1: // ADD
        this.gl.blendFunc(this.gl.SRC_ALPHA, this.gl.ONE);
        break;
      case 2: // MULTIPLY
        this.gl.blendFunc(this.gl.DST_COLOR, this.gl.ZERO);
        break;
      default:
        this.gl.blendFunc(this.gl.SRC_ALPHA, this.gl.ONE_MINUS_SRC_ALPHA);
    }
  }

  /**
   * 将可渲染对象转换为顶点数组
   */
  private convertToVertices(renderable: IRenderable): Vertex[] {
    const vertexData = renderable.getVertices();
    const vertices: Vertex[] = [];
    
    for (let i = 0; i < vertexData.length; i += 8) {
      vertices.push({
        position: new Vector2(vertexData[i], vertexData[i + 1]),
        color: [vertexData[i + 2], vertexData[i + 3], vertexData[i + 4], vertexData[i + 5]],
        uv: new Vector2(vertexData[i + 6], vertexData[i + 7])
      });
    }

    return vertices;
  }

  /**
   * 生成批次键字符串
   */
  private getBatchKeyString(key: BatchKey): string {
    return `${key.shader}_${key.texture ? 'tex' : 'notex'}_${key.blendMode}_${key.zIndex}`;
  }

  /**
   * 重置统计信息
   */
  private resetStats(): void {
    this.stats = {
      drawCalls: 0,
      triangles: 0,
      vertices: 0,
      batches: 0,
      textureBinds: 0,
      shaderSwitches: 0,
      frameTime: 0
    };
  }
}