/**
 * WebGPU 渲染器
 * 负责实际的图形渲染操作
 */

import type { ITransform } from '../../graphics/IGraphicsContext'
import { WebGPUBufferManager } from './WebGPUBufferManager'
import { type Color, WebGPUGeometry } from './WebGPUGeometry'
import { WebGPUPipelineManager } from './WebGPUPipelineManager'

/**
 * 渲染器配置
 */
export interface WebGPURendererConfig {
  device: GPUDevice
  context: GPUCanvasContext
  format: GPUTextureFormat
  width: number
  height: number
}

/**
 * 实例化矩形数据(世界坐标下的位置/尺寸/颜色)
 */
export interface RectInstance {
  x: number
  y: number
  width: number
  height: number
  color: Color
}

/** 每个实例的 float 数量:offset.xy + size.xy + color.rgba */
export const RECT_INSTANCE_STRIDE = 8

/**
 * 将矩形实例数组打包为紧凑的 Float32Array(布局与 instance vertex buffer 一致)。
 * 纯函数,便于单测:每实例 8 float = [x, y, width, height, r, g, b, a]。
 */
export function packRectInstances(rects: RectInstance[]): Float32Array {
  const count = rects.length
  const data = new Float32Array(count * RECT_INSTANCE_STRIDE)
  for (let i = 0; i < count; i++) {
    const r = rects[i]
    const o = i * RECT_INSTANCE_STRIDE
    data[o] = r.x
    data[o + 1] = r.y
    data[o + 2] = r.width
    data[o + 3] = r.height
    data[o + 4] = r.color.r
    data[o + 5] = r.color.g
    data[o + 6] = r.color.b
    data[o + 7] = r.color.a
  }
  return data
}

/**
 * WebGPU 渲染器
 */
export class WebGPURenderer {
  private device: GPUDevice
  private context: GPUCanvasContext
  private format: GPUTextureFormat
  private width: number
  private height: number

  private bufferManager: WebGPUBufferManager
  private pipelineManager: WebGPUPipelineManager

  // 当前渲染状态
  private commandEncoder: GPUCommandEncoder | null = null
  private renderPass: GPURenderPassEncoder | null = null

  // Uniform 缓冲区
  private uniformBuffer: GPUBuffer | null = null
  private uniformBindGroup: GPUBindGroup | null = null

  // 实例化渲染:单位 quad 的顶点/索引缓冲只创建一次并复用
  private quadVertexBuffer: GPUBuffer | null = null
  private quadIndexBuffer: GPUBuffer | null = null
  // 复用的 instance 缓冲(容量不足时按需扩容)
  private instanceBuffer: GPUBuffer | null = null
  private instanceBufferCapacity = 0

  // 统计信息
  private stats = {
    drawCalls: 0,
    triangles: 0,
    vertices: 0,
  }

  constructor(config: WebGPURendererConfig) {
    this.device = config.device
    this.context = config.context
    this.format = config.format
    this.width = config.width
    this.height = config.height

    this.bufferManager = new WebGPUBufferManager(this.device)
    this.pipelineManager = new WebGPUPipelineManager(this.device, this.format)

    this.setupUniformBuffer()
  }

  /**
   * 设置 Uniform 缓冲区
   */
  private setupUniformBuffer(): void {
    // mat3x3 需要 48 字节 (3 * vec4 对齐)，两个矩阵 = 96 字节
    this.uniformBuffer = this.bufferManager.createUniformBuffer(96, 'Transform Uniforms')
  }

  /**
   * 更新变换矩阵
   */
  updateTransform(transform: ITransform): void {
    if (!this.uniformBuffer) return

    // 创建投影矩阵 (屏幕空间到 NDC)
    const projectionMatrix = new Float32Array([
      2 / this.width,
      0,
      0,
      0, // 第一列 + padding
      0,
      -2 / this.height,
      0,
      0, // 第二列 + padding
      -1,
      1,
      1,
      0, // 第三列 + padding
    ])

    // 创建模型矩阵
    const modelMatrix = new Float32Array([
      transform.a,
      transform.b,
      0,
      0,
      transform.c,
      transform.d,
      0,
      0,
      transform.e,
      transform.f,
      1,
      0,
    ])

    // 更新 uniform 缓冲区
    this.device.queue.writeBuffer(this.uniformBuffer, 0, projectionMatrix)
    this.device.queue.writeBuffer(this.uniformBuffer, 48, modelMatrix)
  }

  /**
   * 开始渲染帧
   */
  beginFrame(): void {
    this.stats = { drawCalls: 0, triangles: 0, vertices: 0 }

    this.commandEncoder = this.device.createCommandEncoder({
      label: 'Frame Command Encoder',
    })

    const textureView = this.context.getCurrentTexture().createView()

    this.renderPass = this.commandEncoder.beginRenderPass({
      label: 'Main Render Pass',
      colorAttachments: [
        {
          view: textureView,
          clearValue: { r: 0, g: 0, b: 0, a: 0 },
          loadOp: 'clear',
          storeOp: 'store',
        },
      ],
    })

    // 设置 bind group
    this.setupBindGroup()
  }

  /**
   * 设置 bind group
   */
  private setupBindGroup(): void {
    if (!this.uniformBuffer) return

    const { bindGroupLayout } = this.pipelineManager.getBasic2DPipeline()

    this.uniformBindGroup = this.device.createBindGroup({
      label: 'Transform Bind Group',
      layout: bindGroupLayout,
      entries: [
        {
          binding: 0,
          resource: { buffer: this.uniformBuffer },
        },
      ],
    })
  }

  /**
   * 结束渲染帧
   */
  endFrame(): void {
    if (!this.renderPass || !this.commandEncoder) return

    this.renderPass.end()
    this.renderPass = null

    const commands = this.commandEncoder.finish()
    this.device.queue.submit([commands])
    this.commandEncoder = null
  }

  /**
   * 绘制填充矩形
   */
  fillRect(x: number, y: number, width: number, height: number, color: Color): void {
    if (!this.renderPass || !this.uniformBindGroup) return

    const geometry = WebGPUGeometry.createRect(x, y, width, height, color)
    this.drawGeometry(geometry.vertices, geometry.indices, geometry.indexCount)
  }

  /**
   * 绘制描边矩形
   */
  strokeRect(
    x: number,
    y: number,
    width: number,
    height: number,
    lineWidth: number,
    color: Color
  ): void {
    if (!this.renderPass || !this.uniformBindGroup) return

    const geometry = WebGPUGeometry.createRectStroke(x, y, width, height, lineWidth, color)
    this.drawGeometry(geometry.vertices, geometry.indices, geometry.indexCount)
  }

  /**
   * 绘制填充圆
   */
  fillCircle(centerX: number, centerY: number, radius: number, color: Color): void {
    if (!this.renderPass || !this.uniformBindGroup) return

    const geometry = WebGPUGeometry.createCircleFill(centerX, centerY, radius, color)
    this.drawGeometry(geometry.vertices, geometry.indices, geometry.indexCount)
  }

  /**
   * 绘制线段
   */
  drawLine(x1: number, y1: number, x2: number, y2: number, lineWidth: number, color: Color): void {
    if (!this.renderPass || !this.uniformBindGroup) return

    const geometry = WebGPUGeometry.createLine(x1, y1, x2, y2, lineWidth, color)
    if (geometry.indexCount === 0) return

    this.drawGeometry(geometry.vertices, geometry.indices, geometry.indexCount)
  }

  /**
   * 绘制几何图形
   */
  private drawGeometry(vertices: Float32Array, indices: Uint16Array, indexCount: number): void {
    if (!this.renderPass || !this.uniformBindGroup) return

    // 创建缓冲区
    const vertexBuffer = this.bufferManager.createVertexBuffer(vertices)
    const indexBuffer = this.bufferManager.createIndexBuffer(indices)

    // 设置管线
    const { pipeline } = this.pipelineManager.getBasic2DPipeline()
    this.renderPass.setPipeline(pipeline)
    this.renderPass.setBindGroup(0, this.uniformBindGroup)
    this.renderPass.setVertexBuffer(0, vertexBuffer)
    this.renderPass.setIndexBuffer(indexBuffer, 'uint16')
    this.renderPass.drawIndexed(indexCount)

    // 更新统计
    this.stats.drawCalls++
    this.stats.triangles += indexCount / 3
    this.stats.vertices += vertices.length / 6

    // 销毁临时缓冲区
    vertexBuffer.destroy()
    indexBuffer.destroy()
  }

  /**
   * 确保单位 quad 缓冲已创建(顶点 (0,0)-(1,1),两个三角形)。只创建一次并复用。
   */
  private ensureQuadBuffers(): void {
    if (this.quadVertexBuffer && this.quadIndexBuffer) return
    // 单位 quad 的 4 个顶点(x,y),shader 里以 i_offset + position * i_size 展开
    const quad = new Float32Array([0, 0, 1, 0, 1, 1, 0, 1])
    const indices = new Uint16Array([0, 1, 2, 0, 2, 3])
    this.quadVertexBuffer = this.bufferManager.createVertexBuffer(quad, 'InstancedRect Quad VB')
    this.quadIndexBuffer = this.bufferManager.createIndexBuffer(indices, 'InstancedRect Quad IB')
  }

  /**
   * 实例化绘制矩形:一次 drawIndexed 渲染全部矩形。
   *
   * 每个实例 8 个 float:offset.xy + size.xy + color.rgba。
   * 相比逐个 fillRect(每个矩形一次 draw call + 建/毁 buffer),这里 draw call 恒为 1,
   * 是支撑「10 万对象 60fps」的关键路径。
   *
   * @param instanceData 打包好的实例数据(长度必须是 8 的倍数),或 RectInstance 数组
   */
  drawInstancedRects(instanceData: Float32Array | RectInstance[]): void {
    if (!this.renderPass || !this.uniformBindGroup) return

    // 归一化为 Float32Array(每实例 8 float)
    const data =
      instanceData instanceof Float32Array ? instanceData : packRectInstances(instanceData)
    const count = Math.floor(data.length / 8)
    if (count === 0) return

    this.ensureQuadBuffers()
    const quadVB = this.quadVertexBuffer
    const quadIB = this.quadIndexBuffer
    if (!quadVB || !quadIB) return

    // 复用 instance buffer,容量不足时按需扩容(2 倍增长,减少重建次数)
    const byteLength = data.byteLength
    if (!this.instanceBuffer || this.instanceBufferCapacity < byteLength) {
      this.instanceBuffer?.destroy()
      const newCapacity = Math.max(byteLength, this.instanceBufferCapacity * 2)
      this.instanceBuffer = this.device.createBuffer({
        label: 'InstancedRect Instance Buffer',
        size: newCapacity,
        usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
      })
      this.instanceBufferCapacity = newCapacity
    }
    this.device.queue.writeBuffer(this.instanceBuffer, 0, data, 0, count * 8)

    const { pipeline } = this.pipelineManager.getInstancedRectPipeline()
    this.renderPass.setPipeline(pipeline)
    this.renderPass.setBindGroup(0, this.uniformBindGroup)
    this.renderPass.setVertexBuffer(0, quadVB)
    this.renderPass.setVertexBuffer(1, this.instanceBuffer)
    this.renderPass.setIndexBuffer(quadIB, 'uint16')
    this.renderPass.drawIndexed(6, count)

    // 统计:draw call 恒为 1,与逐个绘制形成对比
    this.stats.drawCalls++
    this.stats.triangles += count * 2
    this.stats.vertices += count * 4
  }

  /**
   * 调整大小
   */
  resize(width: number, height: number): void {
    this.width = width
    this.height = height
  }

  /**
   * 获取统计信息
   */
  getStats(): typeof this.stats {
    return { ...this.stats }
  }

  /**
   * 销毁资源
   */
  dispose(): void {
    if (this.uniformBuffer) {
      this.uniformBuffer.destroy()
      this.uniformBuffer = null
    }
    this.quadVertexBuffer?.destroy()
    this.quadVertexBuffer = null
    this.quadIndexBuffer?.destroy()
    this.quadIndexBuffer = null
    this.instanceBuffer?.destroy()
    this.instanceBuffer = null
    this.instanceBufferCapacity = 0
    this.bufferManager.dispose()
    this.pipelineManager.dispose()
  }
}
