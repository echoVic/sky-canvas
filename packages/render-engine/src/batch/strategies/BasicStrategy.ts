/**
 * 基础批处理策略
 * 替代原来的 renderQueue 系统，提供简单高效的批处理
 */

import { Vector2 } from '../../math'
import type { Matrix3 } from '../../math/Matrix3'
import {
  BatchBuffer,
  BatchDataUtils,
  type BatchKey,
  type RenderBatch,
  type Vertex,
} from '../core/BatchData'
import type { BatchStats, IRenderable } from '../core/IBatchRenderer'
import type { BatchContext, BatchData, IBatchStrategy } from '../core/IBatchStrategy'

/**
 * 基础批处理策略
 * 根据纹理、着色器、混合模式进行简单分组
 */
export class BasicStrategy implements IBatchStrategy {
  readonly name = 'basic'

  private batches: Map<string, RenderBatch> = new Map()
  private batchBuffer: BatchBuffer

  private stats: BatchStats = {
    drawCalls: 0,
    triangles: 0,
    vertices: 0,
    batches: 0,
    textureBinds: 0,
    shaderSwitches: 0,
    frameTime: 0,
  }

  constructor(private gl: WebGLRenderingContext) {
    this.batchBuffer = new BatchBuffer(gl)
  }

  /**
   * 处理可渲染对象
   */
  process(renderable: IRenderable): void {
    const vertices = this.convertToVertices(renderable)
    const indices = Array.from(renderable.getIndices())

    const batchKey: BatchKey = {
      texture: renderable.getTexture?.() || null,
      shader: renderable.getShader(),
      blendMode: renderable.getBlendMode?.() || 0,
      zIndex: renderable.getZIndex?.() || 0,
    }

    const keyString = this.getBatchKeyString(batchKey)
    const existingBatch = this.batches.get(keyString)

    if (existingBatch) {
      // 合并到现有批次
      const vertexOffset = existingBatch.vertices.length
      existingBatch.vertices.push(...vertices)

      // 调整索引偏移
      for (const index of indices) {
        existingBatch.indices.push(index + vertexOffset)
      }
    } else {
      // 创建新批次
      this.batches.set(keyString, {
        key: batchKey,
        vertices: vertices,
        indices: indices,
      })
    }
  }

  /**
   * 执行批处理渲染
   */
  flush(projectionMatrix: Matrix3, context: BatchContext): void {
    const startTime = performance.now()
    this.resetStats()

    // 按 Z-Index 排序批次
    const sortedBatches = Array.from(this.batches.values()).sort(
      (a, b) => a.key.zIndex - b.key.zIndex
    )

    for (const batch of sortedBatches) {
      this.renderBatch(batch, projectionMatrix, context)
    }

    this.stats.frameTime = performance.now() - startTime
    this.clear()
  }

  /**
   * 清空批处理数据
   */
  clear(): void {
    this.batches.clear()
  }

  /**
   * 获取当前批次
   */
  getBatches(): BatchData[] {
    return Array.from(this.batches.values()).map((batch) => ({
      vertices: BatchDataUtils.verticesToArray(batch.vertices),
      indices: new Uint16Array(batch.indices),
      texture: batch.key.texture,
      shader: batch.key.shader,
      blendMode: batch.key.blendMode,
      zIndex: batch.key.zIndex,
      count: batch.vertices.length,
    }))
  }

  /**
   * 获取统计信息
   */
  getStats(): BatchStats {
    return { ...this.stats }
  }

  /**
   * 释放资源
   */
  dispose(): void {
    this.batchBuffer.dispose()
    this.batches.clear()
  }

  /**
   * 渲染单个批次
   */
  private renderBatch(batch: RenderBatch, projectionMatrix: Matrix3, context: BatchContext): void {
    if (batch.vertices.length === 0 || batch.indices.length === 0) {
      return
    }

    this.setupRenderState(batch, projectionMatrix)

    const vertexData = BatchDataUtils.verticesToArray(batch.vertices)
    const indexData = new Uint16Array(batch.indices)

    this.batchBuffer.uploadVertexData(vertexData)
    this.batchBuffer.uploadIndexData(indexData)
    this.batchBuffer.bind()
    this.batchBuffer.setupVertexAttributes()

    context.gl.drawElements(
      context.gl.TRIANGLES,
      batch.indices.length,
      context.gl.UNSIGNED_SHORT,
      0
    )

    this.stats.drawCalls++
    this.stats.batches++
    this.stats.vertices += batch.vertices.length
    this.stats.triangles += Math.floor(batch.indices.length / 3)
  }

  /**
   * 设置渲染状态
   */
  private setupRenderState(batch: RenderBatch, _projectionMatrix: Matrix3): void {
    // 这里需要根据实际的着色器系统来实现
    // 暂时使用简化的实现

    // 设置混合模式
    this.setBlendMode(batch.key.blendMode)

    // 绑定纹理
    if (batch.key.texture) {
      this.gl.bindTexture(this.gl.TEXTURE_2D, batch.key.texture)
      this.stats.textureBinds++
    }

    // TODO: 设置着色器和uniform
    // this.shaderManager.use(batch.key.shader);
    // this.shaderManager.setUniform('u_projection', projectionMatrix.toWebGL());
  }

  /**
   * 设置混合模式
   */
  private setBlendMode(blendMode: number): void {
    switch (blendMode) {
      case 0: // NORMAL
        this.gl.blendFunc(this.gl.SRC_ALPHA, this.gl.ONE_MINUS_SRC_ALPHA)
        break
      case 1: // ADD
        this.gl.blendFunc(this.gl.SRC_ALPHA, this.gl.ONE)
        break
      case 2: // MULTIPLY
        this.gl.blendFunc(this.gl.DST_COLOR, this.gl.ZERO)
        break
      default:
        this.gl.blendFunc(this.gl.SRC_ALPHA, this.gl.ONE_MINUS_SRC_ALPHA)
    }
  }

  /**
   * 将可渲染对象转换为顶点数组
   */
  private convertToVertices(renderable: IRenderable): Vertex[] {
    const vertexData = renderable.getVertices()
    const vertices: Vertex[] = []

    // 假设顶点格式为: position(2) + color(4) + uv(2) = 8 floats per vertex
    for (let i = 0; i < vertexData.length; i += 8) {
      vertices.push({
        position: new Vector2(vertexData[i], vertexData[i + 1]),
        color: [vertexData[i + 2], vertexData[i + 3], vertexData[i + 4], vertexData[i + 5]],
        uv: new Vector2(vertexData[i + 6], vertexData[i + 7]),
      })
    }

    return vertices
  }

  /**
   * 生成批次键字符串
   */
  private getBatchKeyString(key: BatchKey): string {
    return `${key.shader}_${key.texture ? 'tex' : 'notex'}_${key.blendMode}_${key.zIndex}`
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
      frameTime: 0,
    }
  }
}
