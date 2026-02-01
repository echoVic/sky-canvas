/**
 * 实例化批处理策略
 * 专门用于处理大量相同几何体的高效渲染
 */

import { Vector2 } from '../../math'
import { Matrix3 } from '../../math/Matrix3'
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
 * 实例数据结构
 */
interface InstanceData {
  transform: Matrix3 // 变换矩阵
  color: [number, number, number, number] // 颜色
  uvOffset: Vector2 // UV偏移
  uvScale: Vector2 // UV缩放
}

/**
 * 实例化批次
 */
interface InstancedBatch {
  key: BatchKey
  baseVertices: Vertex[] // 基础几何体
  baseIndices: number[] // 基础索引
  instances: InstanceData[] // 实例数据
}

/**
 * 实例化批处理策略
 * 适用于大量相同几何体的场景（如粒子系统、重复UI元素等）
 */
export class InstancedStrategy implements IBatchStrategy {
  readonly name = 'instanced'

  private batches: Map<string, InstancedBatch> = new Map()
  private batchBuffer: BatchBuffer
  private instanceBuffer: WebGLBuffer | null = null

  // 实例化阈值（超过此数量才使用实例化渲染）
  private instanceThreshold = 10

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
    this.instanceBuffer = gl.createBuffer()
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

    const geometryHash = this.getGeometryHash(vertices, indices)
    const keyString = this.getBatchKeyString(batchKey, geometryHash)

    const existingBatch = this.batches.get(keyString)

    if (existingBatch) {
      // 添加新实例
      existingBatch.instances.push(this.createInstanceData(vertices))
    } else {
      // 创建新的实例化批次
      this.batches.set(keyString, {
        key: batchKey,
        baseVertices: this.normalizeVertices(vertices),
        baseIndices: indices,
        instances: [this.createInstanceData(vertices)],
      })
    }
  }

  /**
   * 执行批处理渲染
   */
  flush(projectionMatrix: Matrix3, context: BatchContext): void {
    const startTime = performance.now()
    this.resetStats()

    // 按 Z-Index 排序
    const sortedBatches = Array.from(this.batches.values()).sort(
      (a, b) => a.key.zIndex - b.key.zIndex
    )

    for (const batch of sortedBatches) {
      if (batch.instances.length >= this.instanceThreshold) {
        this.renderInstancedBatch(batch, projectionMatrix, context)
      } else {
        // 实例数量太少，使用普通渲染
        this.renderNormalBatch(batch, projectionMatrix, context)
      }
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
    return Array.from(this.batches.values()).map((batch) => {
      // 将实例化批次转换为标准批次格式
      const allVertices: Vertex[] = []
      const allIndices: number[] = []
      let vertexOffset = 0

      for (const instance of batch.instances) {
        const transformedVertices = this.transformVertices(batch.baseVertices, instance)
        allVertices.push(...transformedVertices)

        for (const index of batch.baseIndices) {
          allIndices.push(index + vertexOffset)
        }

        vertexOffset += batch.baseVertices.length
      }

      return {
        vertices: BatchDataUtils.verticesToArray(allVertices),
        indices: new Uint16Array(allIndices),
        texture: batch.key.texture,
        shader: batch.key.shader,
        blendMode: batch.key.blendMode,
        zIndex: batch.key.zIndex,
        count: allVertices.length,
      }
    })
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

    if (this.instanceBuffer) {
      this.gl.deleteBuffer(this.instanceBuffer)
      this.instanceBuffer = null
    }
  }

  /**
   * 渲染实例化批次
   */
  private renderInstancedBatch(
    batch: InstancedBatch,
    projectionMatrix: Matrix3,
    context: BatchContext
  ): void {
    if (batch.instances.length === 0) return

    // 检查是否支持实例化扩展
    const instancedArrays = context.gl.getExtension('ANGLE_instanced_arrays')
    if (!instancedArrays) {
      // 回退到普通渲染
      this.renderNormalBatch(batch, projectionMatrix, context)
      return
    }

    // 设置渲染状态
    this.setupRenderState(batch, projectionMatrix)

    // 上传基础几何数据
    const vertexData = BatchDataUtils.verticesToArray(batch.baseVertices)
    const indexData = new Uint16Array(batch.baseIndices)

    this.batchBuffer.uploadVertexData(vertexData)
    this.batchBuffer.uploadIndexData(indexData)
    this.batchBuffer.bind()
    this.batchBuffer.setupVertexAttributes()

    // 上传实例数据
    this.uploadInstanceData(batch.instances)

    // 实例化绘制
    instancedArrays.drawElementsInstancedANGLE(
      context.gl.TRIANGLES,
      batch.baseIndices.length,
      context.gl.UNSIGNED_SHORT,
      0,
      batch.instances.length
    )

    // 更新统计
    this.stats.drawCalls++
    this.stats.batches++
    this.stats.vertices += batch.baseVertices.length * batch.instances.length
    this.stats.triangles += Math.floor(batch.baseIndices.length / 3) * batch.instances.length
  }

  /**
   * 渲染普通批次（非实例化）
   */
  private renderNormalBatch(
    batch: InstancedBatch,
    projectionMatrix: Matrix3,
    context: BatchContext
  ): void {
    for (const instance of batch.instances) {
      const transformedVertices = this.transformVertices(batch.baseVertices, instance)

      const renderBatch: RenderBatch = {
        key: batch.key,
        vertices: transformedVertices,
        indices: batch.baseIndices,
      }

      this.renderSingleBatch(renderBatch, projectionMatrix, context)
    }
  }

  /**
   * 渲染单个批次
   */
  private renderSingleBatch(
    batch: RenderBatch,
    projectionMatrix: Matrix3,
    context: BatchContext
  ): void {
    if (batch.vertices.length === 0 || batch.indices.length === 0) return

    // 设置渲染状态
    this.setupRenderState({ key: batch.key } as InstancedBatch, projectionMatrix)

    // 上传几何数据
    const vertexData = BatchDataUtils.verticesToArray(batch.vertices)
    const indexData = new Uint16Array(batch.indices)

    this.batchBuffer.uploadVertexData(vertexData)
    this.batchBuffer.uploadIndexData(indexData)
    this.batchBuffer.bind()
    this.batchBuffer.setupVertexAttributes()

    // 绘制
    context.gl.drawElements(
      context.gl.TRIANGLES,
      batch.indices.length,
      context.gl.UNSIGNED_SHORT,
      0
    )

    // 更新统计
    this.stats.drawCalls++
    this.stats.batches++
    this.stats.vertices += batch.vertices.length
    this.stats.triangles += Math.floor(batch.indices.length / 3)
  }

  /**
   * 上传实例数据
   */
  private uploadInstanceData(instances: InstanceData[]): void {
    if (!this.instanceBuffer) return

    // 创建实例数据缓冲区
    // 每个实例包含：变换矩阵(9) + 颜色(4) + UV偏移(2) + UV缩放(2) = 17 floats
    const instanceData = new Float32Array(instances.length * 17)
    let offset = 0

    for (const instance of instances) {
      // 变换矩阵 (3x3)
      const matrix = instance.transform.toArray()
      for (let i = 0; i < 9; i++) {
        instanceData[offset++] = matrix[i]
      }

      // 颜色
      instanceData[offset++] = instance.color[0]
      instanceData[offset++] = instance.color[1]
      instanceData[offset++] = instance.color[2]
      instanceData[offset++] = instance.color[3]

      // UV变换
      instanceData[offset++] = instance.uvOffset.x
      instanceData[offset++] = instance.uvOffset.y
      instanceData[offset++] = instance.uvScale.x
      instanceData[offset++] = instance.uvScale.y
    }

    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.instanceBuffer)
    this.gl.bufferData(this.gl.ARRAY_BUFFER, instanceData, this.gl.DYNAMIC_DRAW)

    // 设置实例属性
    this.setupInstanceAttributes()
  }

  /**
   * 设置实例属性
   */
  private setupInstanceAttributes(): void {
    const instancedArrays = this.gl.getExtension('ANGLE_instanced_arrays')
    if (!instancedArrays) return

    const stride = 17 * 4 // 17 floats * 4 bytes per float

    // 变换矩阵属性 (3x3，使用3个vec3)
    for (let i = 0; i < 3; i++) {
      const location = 3 + i // 从属性3开始
      this.gl.enableVertexAttribArray(location)
      this.gl.vertexAttribPointer(location, 3, this.gl.FLOAT, false, stride, i * 3 * 4)
      instancedArrays.vertexAttribDivisorANGLE(location, 1)
    }

    // 颜色属性
    this.gl.enableVertexAttribArray(6)
    this.gl.vertexAttribPointer(6, 4, this.gl.FLOAT, false, stride, 9 * 4)
    instancedArrays.vertexAttribDivisorANGLE(6, 1)

    // UV变换属性
    this.gl.enableVertexAttribArray(7)
    this.gl.vertexAttribPointer(7, 4, this.gl.FLOAT, false, stride, 13 * 4)
    instancedArrays.vertexAttribDivisorANGLE(7, 1)
  }

  /**
   * 设置渲染状态
   */
  private setupRenderState(batch: InstancedBatch, projectionMatrix: Matrix3): void {
    // 设置混合模式
    this.setBlendMode(batch.key.blendMode)

    // 绑定纹理
    if (batch.key.texture) {
      this.gl.bindTexture(this.gl.TEXTURE_2D, batch.key.texture)
      this.stats.textureBinds++
    }
  }

  /**
   * 创建实例数据
   */
  private createInstanceData(vertices: Vertex[]): InstanceData {
    // 从顶点数据中提取变换信息
    // 这里简化处理，实际应用中可能需要更复杂的逻辑
    return {
      transform: Matrix3.identity(),
      color: vertices.length > 0 ? vertices[0].color : [1, 1, 1, 1],
      uvOffset: new Vector2(0, 0),
      uvScale: new Vector2(1, 1),
    }
  }

  /**
   * 规范化顶点（移除变换，保留基础形状）
   */
  private normalizeVertices(vertices: Vertex[]): Vertex[] {
    // 简化实现，实际可能需要更复杂的规范化逻辑
    return vertices.map((vertex) => ({
      ...vertex,
      color: [1, 1, 1, 1], // 使用白色，颜色由实例数据控制
    }))
  }

  /**
   * 应用实例变换到顶点
   */
  private transformVertices(baseVertices: Vertex[], instance: InstanceData): Vertex[] {
    return baseVertices.map((vertex) => {
      // 简化的变换实现，这里可以根据Matrix3的实际API调整
      const transformedPos = vertex.position // 暂时不做变换
      return {
        position: transformedPos,
        color: instance.color,
        uv: new Vector2(
          vertex.uv.x * instance.uvScale.x + instance.uvOffset.x,
          vertex.uv.y * instance.uvScale.y + instance.uvOffset.y
        ),
      }
    })
  }

  /**
   * 获取几何体哈希值
   */
  private getGeometryHash(vertices: Vertex[], indices: number[]): string {
    // 简化的几何体哈希，实际可能需要更精确的实现
    return `${vertices.length}_${indices.length}`
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
  private getBatchKeyString(key: BatchKey, geometryHash: string): string {
    return `${key.shader}_${key.texture ? 'tex' : 'notex'}_${key.blendMode}_${key.zIndex}_${geometryHash}`
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
