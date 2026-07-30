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
 * 实例化圆形数据(世界坐标下的圆心/半径/颜色)
 */
export interface CircleInstance {
  cx: number
  cy: number
  radius: number
  color: Color
}

/** 每个实例的 float 数量:center.xy + radius + color.rgba */
export const CIRCLE_INSTANCE_STRIDE = 7

/**
 * 将圆形实例数组打包为紧凑 Float32Array:每实例 7 float = [cx, cy, radius, r, g, b, a]。
 */
export function packCircleInstances(circles: CircleInstance[]): Float32Array {
  const count = circles.length
  const data = new Float32Array(count * CIRCLE_INSTANCE_STRIDE)
  for (let i = 0; i < count; i++) {
    const c = circles[i]
    const o = i * CIRCLE_INSTANCE_STRIDE
    data[o] = c.cx
    data[o + 1] = c.cy
    data[o + 2] = c.radius
    data[o + 3] = c.color.r
    data[o + 4] = c.color.g
    data[o + 5] = c.color.b
    data[o + 6] = c.color.a
  }
  return data
}

/**
 * 实例化线段数据(世界坐标下的两端点/线宽/颜色)
 */
export interface LineInstance {
  x1: number
  y1: number
  x2: number
  y2: number
  width: number
  color: Color
}

/** 每个实例的 float 数量:p1.xy + p2.xy + width + color.rgba */
export const LINE_INSTANCE_STRIDE = 9

/**
 * 将线段实例数组打包为紧凑 Float32Array:每实例 9 float = [x1,y1,x2,y2,width,r,g,b,a]。
 */
export function packLineInstances(lines: LineInstance[]): Float32Array {
  const count = lines.length
  const data = new Float32Array(count * LINE_INSTANCE_STRIDE)
  for (let i = 0; i < count; i++) {
    const l = lines[i]
    const o = i * LINE_INSTANCE_STRIDE
    data[o] = l.x1
    data[o + 1] = l.y1
    data[o + 2] = l.x2
    data[o + 3] = l.y2
    data[o + 4] = l.width
    data[o + 5] = l.color.r
    data[o + 6] = l.color.g
    data[o + 7] = l.color.b
    data[o + 8] = l.color.a
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

  // 实例化渲染:不同图元用不同的单位 quad(rect: 0~1;circle: -1~1;line: x 0~1,y -0.5~0.5)
  // 每种 quad 的 顶点/索引缓冲只创建一次并按 key 缓存
  private quadBuffers = new Map<string, { vertex: GPUBuffer; index: GPUBuffer }>()
  // 每种图元一块独立的 instance 缓冲,按 key 缓存(容量不足时按需扩容)。
  // 独立分块可避免同一帧内多种图元共用一块 buffer、后写覆盖前写导致的数据错乱。
  private instanceBuffers = new Map<string, { buffer: GPUBuffer; capacity: number }>()

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
   * 获取(或惰性创建)某种图元的单位 quad 顶点/索引缓冲,按 key 缓存复用。
   * @param key 缓存键
   * @param quad 4 个顶点的 x,y(共 8 个 float)
   */
  private getQuadBuffers(key: string, quad: Float32Array): { vertex: GPUBuffer; index: GPUBuffer } {
    const cached = this.quadBuffers.get(key)
    if (cached) return cached
    const indices = new Uint16Array([0, 1, 2, 0, 2, 3])
    const entry = {
      vertex: this.bufferManager.createVertexBuffer(quad, `${key} Quad VB`),
      index: this.bufferManager.createIndexBuffer(indices, `${key} Quad IB`),
    }
    this.quadBuffers.set(key, entry)
    return entry
  }

  /**
   * 确保某图元的 instance buffer 容量足够并写入数据(容量不足时按 2 倍扩容,复用不重建),
   * 返回该图元专属的 buffer。每种图元独立分块,避免同帧多图元互相覆盖。
   */
  private uploadInstanceData(key: string, data: Float32Array): GPUBuffer {
    const byteLength = data.byteLength
    let slot = this.instanceBuffers.get(key)
    if (!slot || slot.capacity < byteLength) {
      slot?.buffer.destroy()
      const newCapacity = Math.max(byteLength, (slot?.capacity ?? 0) * 2)
      slot = {
        buffer: this.device.createBuffer({
          label: `Instanced Instance Buffer (${key})`,
          size: newCapacity,
          usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
        }),
        capacity: newCapacity,
      }
      this.instanceBuffers.set(key, slot)
    }
    this.device.queue.writeBuffer(slot.buffer, 0, data, 0, data.length)
    return slot.buffer
  }

  /**
   * 通用实例化绘制:一次 drawIndexed(6, count) 渲染全部实例,draw call 恒为 1。
   * 每种图元(quadKey)使用独立的 instance buffer,同帧多图元互不覆盖。
   */
  private drawInstanced(
    quadKey: string,
    quad: Float32Array,
    pipeline: GPURenderPipeline,
    data: Float32Array,
    strideFloats: number
  ): void {
    if (!this.renderPass || !this.uniformBindGroup) return
    const count = Math.floor(data.length / strideFloats)
    if (count === 0) return

    const { vertex, index } = this.getQuadBuffers(quadKey, quad)
    const instanceBuffer = this.uploadInstanceData(quadKey, data)

    this.renderPass.setPipeline(pipeline)
    this.renderPass.setBindGroup(0, this.uniformBindGroup)
    this.renderPass.setVertexBuffer(0, vertex)
    this.renderPass.setVertexBuffer(1, instanceBuffer)
    this.renderPass.setIndexBuffer(index, 'uint16')
    this.renderPass.drawIndexed(6, count)

    this.stats.drawCalls++
    this.stats.triangles += count * 2
    this.stats.vertices += count * 4
  }

  // 各图元的单位 quad 定义
  private static readonly QUAD_RECT = new Float32Array([0, 0, 1, 0, 1, 1, 0, 1])
  private static readonly QUAD_CIRCLE = new Float32Array([-1, -1, 1, -1, 1, 1, -1, 1])
  private static readonly QUAD_LINE = new Float32Array([0, -0.5, 1, -0.5, 1, 0.5, 0, 0.5])

  /**
   * 实例化绘制矩形。每实例 8 float:offset.xy + size.xy + color.rgba。
   * 相比逐个 fillRect,draw call 恒为 1,是支撑海量对象 60fps 的关键路径。
   */
  drawInstancedRects(instanceData: Float32Array | RectInstance[]): void {
    const data =
      instanceData instanceof Float32Array ? instanceData : packRectInstances(instanceData)
    this.drawInstanced(
      'rect',
      WebGPURenderer.QUAD_RECT,
      this.pipelineManager.getInstancedRectPipeline().pipeline,
      data,
      RECT_INSTANCE_STRIDE
    )
  }

  /**
   * 实例化绘制圆形(SDF 抗锯齿)。每实例 7 float:center.xy + radius + color.rgba。
   */
  drawInstancedCircles(instanceData: Float32Array | CircleInstance[]): void {
    const data =
      instanceData instanceof Float32Array ? instanceData : packCircleInstances(instanceData)
    this.drawInstanced(
      'circle',
      WebGPURenderer.QUAD_CIRCLE,
      this.pipelineManager.getInstancedCirclePipeline().pipeline,
      data,
      CIRCLE_INSTANCE_STRIDE
    )
  }

  /**
   * 实例化绘制线段。每实例 9 float:p1.xy + p2.xy + width + color.rgba。
   */
  drawInstancedLines(instanceData: Float32Array | LineInstance[]): void {
    const data =
      instanceData instanceof Float32Array ? instanceData : packLineInstances(instanceData)
    this.drawInstanced(
      'line',
      WebGPURenderer.QUAD_LINE,
      this.pipelineManager.getInstancedLinePipeline().pipeline,
      data,
      LINE_INSTANCE_STRIDE
    )
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
    for (const { vertex, index } of this.quadBuffers.values()) {
      vertex.destroy()
      index.destroy()
    }
    this.quadBuffers.clear()
    for (const { buffer } of this.instanceBuffers.values()) {
      buffer.destroy()
    }
    this.instanceBuffers.clear()
    this.bufferManager.dispose()
    this.pipelineManager.dispose()
  }
}
