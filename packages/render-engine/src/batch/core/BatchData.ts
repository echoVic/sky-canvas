/**
 * 批处理数据结构
 * 统一的批处理数据格式和工具函数
 */

import type { Vector2 } from '../../math'

/**
 * 顶点数据结构
 */
export interface Vertex {
  position: Vector2
  color: [number, number, number, number]
  uv: Vector2
}

/**
 * 批次关键字（用于批次合并判断）
 */
export interface BatchKey {
  texture: WebGLTexture | null
  shader: string
  blendMode: number
  zIndex: number
}

/**
 * 渲染批次
 */
export interface RenderBatch {
  key: BatchKey
  vertices: Vertex[]
  indices: number[]
  instanceData?: Float32Array
}

/**
 * 批处理缓冲区
 */
export class BatchBuffer {
  private vertexBuffer: WebGLBuffer | null = null
  private indexBuffer: WebGLBuffer | null = null
  private instanceBuffer: WebGLBuffer | null = null

  constructor(private gl: WebGLRenderingContext) {
    this.createBuffers()
  }

  private createBuffers(): void {
    this.vertexBuffer = this.gl.createBuffer()
    this.indexBuffer = this.gl.createBuffer()
    this.instanceBuffer = this.gl.createBuffer()
  }

  /**
   * 上传顶点数据
   */
  uploadVertexData(vertices: Float32Array): void {
    if (!this.vertexBuffer) return

    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.vertexBuffer)
    this.gl.bufferData(this.gl.ARRAY_BUFFER, vertices, this.gl.DYNAMIC_DRAW)
  }

  /**
   * 上传索引数据
   */
  uploadIndexData(indices: Uint16Array): void {
    if (!this.indexBuffer) return

    this.gl.bindBuffer(this.gl.ELEMENT_ARRAY_BUFFER, this.indexBuffer)
    this.gl.bufferData(this.gl.ELEMENT_ARRAY_BUFFER, indices, this.gl.DYNAMIC_DRAW)
  }

  /**
   * 上传实例数据
   */
  uploadInstanceData(instanceData: Float32Array): void {
    if (!this.instanceBuffer) return

    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.instanceBuffer)
    this.gl.bufferData(this.gl.ARRAY_BUFFER, instanceData, this.gl.DYNAMIC_DRAW)
  }

  /**
   * 绑定缓冲区
   */
  bind(): void {
    if (this.vertexBuffer) {
      this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.vertexBuffer)
    }
    if (this.indexBuffer) {
      this.gl.bindBuffer(this.gl.ELEMENT_ARRAY_BUFFER, this.indexBuffer)
    }
  }

  /**
   * 设置顶点属性
   */
  setupVertexAttributes(): void {
    const stride = 8 * 4 // position(2) + color(4) + uv(2) = 8 floats

    // 位置属性
    this.gl.enableVertexAttribArray(0)
    this.gl.vertexAttribPointer(0, 2, this.gl.FLOAT, false, stride, 0)

    // 颜色属性
    this.gl.enableVertexAttribArray(1)
    this.gl.vertexAttribPointer(1, 4, this.gl.FLOAT, false, stride, 2 * 4)

    // UV属性
    this.gl.enableVertexAttribArray(2)
    this.gl.vertexAttribPointer(2, 2, this.gl.FLOAT, false, stride, 6 * 4)
  }

  /**
   * 释放资源
   */
  dispose(): void {
    if (this.vertexBuffer) {
      this.gl.deleteBuffer(this.vertexBuffer)
      this.vertexBuffer = null
    }
    if (this.indexBuffer) {
      this.gl.deleteBuffer(this.indexBuffer)
      this.indexBuffer = null
    }
    if (this.instanceBuffer) {
      this.gl.deleteBuffer(this.instanceBuffer)
      this.instanceBuffer = null
    }
  }
}

/**
 * 批处理数据工具
 */
export class BatchDataUtils {
  /**
   * 检查两个批次键是否可以合并
   */
  static canMergeBatches(key1: BatchKey, key2: BatchKey): boolean {
    return (
      key1.texture === key2.texture &&
      key1.shader === key2.shader &&
      key1.blendMode === key2.blendMode &&
      key1.zIndex === key2.zIndex
    )
  }

  /**
   * 将顶点数据转换为Float32Array
   */
  static verticesToArray(vertices: Vertex[]): Float32Array {
    const array = new Float32Array(vertices.length * 8)
    let offset = 0

    for (const vertex of vertices) {
      // 位置
      array[offset++] = vertex.position.x
      array[offset++] = vertex.position.y

      // 颜色
      array[offset++] = vertex.color[0]
      array[offset++] = vertex.color[1]
      array[offset++] = vertex.color[2]
      array[offset++] = vertex.color[3]

      // UV
      array[offset++] = vertex.uv.x
      array[offset++] = vertex.uv.y
    }

    return array
  }

  /**
   * 合并多个批次的顶点数据
   */
  static mergeBatches(batches: RenderBatch[]): RenderBatch | null {
    if (batches.length === 0) return null
    if (batches.length === 1) return batches[0]

    const firstBatch = batches[0]
    const mergedVertices: Vertex[] = []
    const mergedIndices: number[] = []
    let vertexOffset = 0

    for (const batch of batches) {
      // 检查是否可以合并
      if (!BatchDataUtils.canMergeBatches(firstBatch.key, batch.key)) {
        console.warn('Cannot merge incompatible batches')
        continue
      }

      // 合并顶点
      mergedVertices.push(...batch.vertices)

      // 合并索引（调整偏移）
      for (const index of batch.indices) {
        mergedIndices.push(index + vertexOffset)
      }

      vertexOffset += batch.vertices.length
    }

    return {
      key: firstBatch.key,
      vertices: mergedVertices,
      indices: mergedIndices,
    }
  }
}
