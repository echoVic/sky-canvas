/**
 * WebGPU 渲染器实现
 * 提供基于 WebGPU 的高性能渲染能力
 */

import type { WebGPUContext } from '../adapters/WebGPUContext'
import {
  type Color,
  isWebGPUSupported,
  WebGPUBufferManager,
  WebGPUGeometry,
  WebGPUPipelineManager,
} from '../adapters/webgpu'
import type { RenderContext, RendererCapabilities } from '../core'
import type { IColor, IPoint, IRect, ITransform } from '../graphics/IGraphicsContext'
import type { Rectangle } from '../math/Rectangle'
import {
  type IDrawCircleOptions,
  type IDrawImageOptions,
  type IDrawLineOptions,
  type IDrawRectOptions,
  type IDrawTextOptions,
  type IImageSource,
  RendererBase,
} from './BaseRenderer'

type Rect = IRect

export interface WebGPURenderContext {
  canvas: HTMLCanvasElement
  width: number
  height: number
}

export const WebGPUShaders = {
  basic: {
    vertex: `
      // 基础顶点着色器占位符
      // 实际实现需要 WebGPU 支持
    `,
    fragment: `
      // 基础片段着色器占位符
      // 实际实现需要 WebGPU 支持
    `,
  },
  textured: {
    vertex: `
      // 纹理顶点着色器占位符
      // 实际实现需要 WebGPU 支持
    `,
    fragment: `
      // 纹理片段着色器占位符
      // 实际实现需要 WebGPU 支持
    `,
  },
}

export class WebGPUBuffer {
  private size: number
  private usage: string

  constructor(size: number, usage: string) {
    this.size = size
    this.usage = usage
  }

  write(data: ArrayBuffer | ArrayBufferView): void {
    console.warn('WebGPU buffer write not implemented')
  }

  destroy(): void {}

  getSize(): number {
    return this.size
  }

  getUsage(): string {
    return this.usage
  }
}

export class WebGPUTexture {
  private width: number
  private height: number
  private format: string

  constructor(width: number, height: number, format: string = 'rgba8unorm') {
    this.width = width
    this.height = height
    this.format = format
  }

  updateData(data: ImageData | HTMLImageElement | HTMLCanvasElement): void {
    console.warn('WebGPU texture update not implemented')
  }

  destroy(): void {}

  getWidth(): number {
    return this.width
  }

  getHeight(): number {
    return this.height
  }

  getFormat(): string {
    return this.format
  }
}

export class WebGPURenderer extends RendererBase {
  private context: WebGPUContext
  private buffers: Map<string, WebGPUBuffer> = new Map()
  private textures: Map<string, WebGPUTexture> = new Map()
  private initialized = false

  private device: GPUDevice | null = null
  private gpuContext: GPUCanvasContext | null = null
  private format: GPUTextureFormat = 'bgra8unorm'
  private canvasWidth: number = 0
  private canvasHeight: number = 0

  private bufferManager: WebGPUBufferManager | null = null
  private pipelineManager: WebGPUPipelineManager | null = null

  private commandEncoder: GPUCommandEncoder | null = null
  private renderPass: GPURenderPassEncoder | null = null

  private uniformBuffer: GPUBuffer | null = null
  private uniformBindGroup: GPUBindGroup | null = null

  private renderStats = {
    drawCalls: 0,
    triangles: 0,
    vertices: 0,
  }

  constructor(context: WebGPUContext) {
    super()
    this.context = context
    const canvas = context.getCanvas()
    this.setViewport({ x: 0, y: 0, width: canvas.width, height: canvas.height })
  }

  async initialize(canvas: HTMLCanvasElement): Promise<boolean> {
    this.initialized = await this.context.initialize()

    if (this.initialized) {
      this.device = this.context.getDevice()
      this.gpuContext = this.context.getGPUContext()
      this.format = this.context.getFormat()
      this.canvasWidth = canvas.width
      this.canvasHeight = canvas.height

      if (this.device) {
        this.bufferManager = new WebGPUBufferManager(this.device)
        this.pipelineManager = new WebGPUPipelineManager(this.device, this.format)
        this.setupUniformBuffer()
      }
    }

    return this.initialized
  }

  private setupUniformBuffer(): void {
    if (!this.bufferManager) return
    this.uniformBuffer = this.bufferManager.createUniformBuffer(96, 'Transform Uniforms')
  }

  updateTransform(transform: ITransform): void {
    if (!this.uniformBuffer || !this.device) return

    const projectionMatrix = new Float32Array([
      2 / this.canvasWidth,
      0,
      0,
      0,
      0,
      -2 / this.canvasHeight,
      0,
      0,
      -1,
      1,
      1,
      0,
    ])

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

    this.device.queue.writeBuffer(this.uniformBuffer, 0, projectionMatrix)
    this.device.queue.writeBuffer(this.uniformBuffer, 48, modelMatrix)
  }

  resize(width: number, height: number): void {
    this.context.resize(width, height)
    this.canvasWidth = width
    this.canvasHeight = height
    this.setViewport({ x: 0, y: 0, width, height })
  }

  clear(color?: IColor | string): void {
    this.context.clear()
  }

  beginFrame(): void {
    this.renderStats = { drawCalls: 0, triangles: 0, vertices: 0 }

    if (!this.device || !this.gpuContext) {
      this.context.beginFrame()
      return
    }

    this.commandEncoder = this.device.createCommandEncoder({
      label: 'Frame Command Encoder',
    })

    const textureView = this.gpuContext.getCurrentTexture().createView()

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

    this.setupBindGroup()
  }

  private setupBindGroup(): void {
    if (!this.uniformBuffer || !this.pipelineManager || !this.device) return

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

  endFrame(): void {
    if (!this.renderPass || !this.commandEncoder || !this.device) {
      this.context.endFrame()
      return
    }

    this.renderPass.end()
    this.renderPass = null

    const commands = this.commandEncoder.finish()
    this.device.queue.submit([commands])
    this.commandEncoder = null
  }

  drawRect(x: number, y: number, width: number, height: number, options?: IDrawRectOptions): void {
    if (!this.renderPass || !this.uniformBindGroup) return

    this.save()

    if (options?.style) {
      this.applyStyleFromOptions(options)
    }

    const colorArr = this.parseColor(this.fillColor)
    const color: Color = { r: colorArr[0], g: colorArr[1], b: colorArr[2], a: colorArr[3] }

    if (options?.filled !== false) {
      const geometry = WebGPUGeometry.createRect(x, y, width, height, color)
      this.drawGeometry(geometry.vertices, geometry.indices, geometry.indexCount)
    }

    if (!options?.filled || options?.style?.strokeColor) {
      const strokeColorArr = options?.style?.strokeColor
        ? this.parseColor(options.style.strokeColor)
        : this.parseColor(this.strokeColor)
      const strokeColor: Color = {
        r: strokeColorArr[0],
        g: strokeColorArr[1],
        b: strokeColorArr[2],
        a: strokeColorArr[3],
      }
      const lineWidth = options?.style?.lineWidth ?? this.currentLineWidth

      const geometry = WebGPUGeometry.createRectStroke(x, y, width, height, lineWidth, strokeColor)
      this.drawGeometry(geometry.vertices, geometry.indices, geometry.indexCount)
    }

    this.restore()
  }

  drawCircle(center: IPoint, radius: number, options?: IDrawCircleOptions): void {
    if (!this.renderPass || !this.uniformBindGroup) return

    this.save()

    if (options?.style) {
      this.applyStyleFromOptions(options)
    }

    const colorArr = this.parseColor(this.fillColor)
    const color: Color = { r: colorArr[0], g: colorArr[1], b: colorArr[2], a: colorArr[3] }

    if (options?.filled) {
      const geometry = WebGPUGeometry.createCircleFill(center.x, center.y, radius, color)
      this.drawGeometry(geometry.vertices, geometry.indices, geometry.indexCount)
    } else {
      const strokeColorArr = options?.style?.strokeColor
        ? this.parseColor(options.style.strokeColor)
        : this.parseColor(this.strokeColor)
      const strokeColor: Color = {
        r: strokeColorArr[0],
        g: strokeColorArr[1],
        b: strokeColorArr[2],
        a: strokeColorArr[3],
      }
      const lineWidth = options?.style?.lineWidth ?? this.currentLineWidth

      const segments = Math.max(32, Math.ceil(radius * 0.5))
      for (let i = 0; i < segments; i++) {
        const angle1 = (i / segments) * Math.PI * 2
        const angle2 = ((i + 1) / segments) * Math.PI * 2
        const x1 = center.x + Math.cos(angle1) * radius
        const y1 = center.y + Math.sin(angle1) * radius
        const x2 = center.x + Math.cos(angle2) * radius
        const y2 = center.y + Math.sin(angle2) * radius

        const geometry = WebGPUGeometry.createLine(x1, y1, x2, y2, lineWidth, strokeColor)
        if (geometry.indexCount > 0) {
          this.drawGeometry(geometry.vertices, geometry.indices, geometry.indexCount)
        }
      }
    }

    this.restore()
  }

  drawLine(start: IPoint, end: IPoint, options?: IDrawLineOptions): void {
    if (!this.renderPass || !this.uniformBindGroup) return

    this.save()

    if (options?.style) {
      this.applyStyleFromOptions(options)
    }

    const colorArr = this.parseColor(this.strokeColor)
    const color: Color = { r: colorArr[0], g: colorArr[1], b: colorArr[2], a: colorArr[3] }
    const width = options?.style?.lineWidth ?? this.currentLineWidth

    const geometry = WebGPUGeometry.createLine(start.x, start.y, end.x, end.y, width, color)
    if (geometry.indexCount === 0) {
      this.restore()
      return
    }

    this.drawGeometry(geometry.vertices, geometry.indices, geometry.indexCount)

    this.restore()
  }

  drawText(text: string, position: IPoint, options?: IDrawTextOptions): void {
    console.warn('WebGPU drawText not fully implemented:', text)
  }

  drawImage(
    image: IImageSource,
    position: IPoint,
    size?: { width: number; height: number },
    options?: IDrawImageOptions
  ): void {
    console.warn('WebGPU drawImage not fully implemented')
  }

  private drawGeometry(vertices: Float32Array, indices: Uint16Array, indexCount: number): void {
    if (!this.renderPass || !this.uniformBindGroup || !this.bufferManager || !this.pipelineManager)
      return

    const vertexBuffer = this.bufferManager.createVertexBuffer(vertices)
    const indexBuffer = this.bufferManager.createIndexBuffer(indices)

    const { pipeline } = this.pipelineManager.getBasic2DPipeline()
    this.renderPass.setPipeline(pipeline)
    this.renderPass.setBindGroup(0, this.uniformBindGroup)
    this.renderPass.setVertexBuffer(0, vertexBuffer)
    this.renderPass.setIndexBuffer(indexBuffer, 'uint16')
    this.renderPass.drawIndexed(indexCount)

    this.renderStats.drawCalls++
    this.renderStats.triangles += indexCount / 3
    this.renderStats.vertices += vertices.length / 6

    vertexBuffer.destroy()
    indexBuffer.destroy()
  }

  fillRect(x: number, y: number, width: number, height: number, color: Color): void {
    if (!this.renderPass || !this.uniformBindGroup) return

    const geometry = WebGPUGeometry.createRect(x, y, width, height, color)
    this.drawGeometry(geometry.vertices, geometry.indices, geometry.indexCount)
  }

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

  fillCircle(centerX: number, centerY: number, radius: number, color: Color): void {
    if (!this.renderPass || !this.uniformBindGroup) return

    const geometry = WebGPUGeometry.createCircleFill(centerX, centerY, radius, color)
    this.drawGeometry(geometry.vertices, geometry.indices, geometry.indexCount)
  }

  drawLineInternal(start: IPoint, end: IPoint, color: Color, width: number = 1): void {
    if (!this.renderPass || !this.uniformBindGroup) return

    const geometry = WebGPUGeometry.createLine(start.x, start.y, end.x, end.y, width, color)
    if (geometry.indexCount === 0) return

    this.drawGeometry(geometry.vertices, geometry.indices, geometry.indexCount)
  }

  drawRectInternal(rect: Rectangle, color: Color): void {
    this.fillRect(rect.x, rect.y, rect.width, rect.height, color)
  }

  drawCircleInternal(center: IPoint, radius: number, color: Color): void {
    this.fillCircle(center.x, center.y, radius, color)
  }

  drawTexture(
    texture: WebGPUTexture,
    position: IPoint,
    size?: { width: number; height: number }
  ): void {
    console.warn('WebGPU drawTexture not implemented')
  }

  createBuffer(size: number, usage: string): WebGPUBuffer {
    const buffer = new WebGPUBuffer(size, usage)
    return buffer
  }

  createTexture(width: number, height: number, format: string = 'rgba8unorm'): WebGPUTexture {
    const texture = new WebGPUTexture(width, height, format)
    return texture
  }

  setViewport(viewport: Rect): void {
    super.setViewport(viewport)
    this.context.setViewport(viewport.x, viewport.y, viewport.width, viewport.height)
  }

  setViewportBounds(x: number, y: number, width: number, height: number): void {
    this.setViewport({ x, y, width, height })
  }

  setTransform(matrix: number[]): void {
    if (matrix.length >= 6) {
      this.updateTransform({
        a: matrix[0],
        b: matrix[1],
        c: matrix[2],
        d: matrix[3],
        e: matrix[4],
        f: matrix[5],
      })
    }
  }

  render(context: RenderContext): void {
    this.drawables.forEach((drawable) => {
      if (drawable.visible) {
        drawable.draw(context)
      }
    })
  }

  getCapabilities(): RendererCapabilities {
    const contextCaps = this.context.getCapabilities()
    return {
      supportsTransforms: contextCaps.supportsTransforms,
      supportsFilters: contextCaps.supportsFilters,
      supportsBlending: contextCaps.supportsBlending,
      maxTextureSize: contextCaps.maxTextureSize,
      supportedFormats: contextCaps.supportedFormats,
    }
  }

  getStats(): {
    drawCalls: number
    triangles: number
    vertices: number
  } {
    return { ...this.renderStats }
  }

  isInitialized(): boolean {
    return this.initialized
  }

  static isSupported(): boolean {
    return isWebGPUSupported()
  }

  static getCapabilities(): {
    maxTextureSize: number
    maxBufferSize: number
    supportedFormats: string[]
  } {
    return {
      maxTextureSize: 4096,
      maxBufferSize: 268435456,
      supportedFormats: ['rgba8unorm', 'bgra8unorm'],
    }
  }

  dispose(): void {
    this.buffers.forEach((buffer) => {
      buffer.destroy()
    })
    this.buffers.clear()

    this.textures.forEach((texture) => {
      texture.destroy()
    })
    this.textures.clear()

    if (this.uniformBuffer) {
      this.uniformBuffer.destroy()
      this.uniformBuffer = null
    }

    if (this.bufferManager) {
      this.bufferManager.dispose()
      this.bufferManager = null
    }

    if (this.pipelineManager) {
      this.pipelineManager.dispose()
      this.pipelineManager = null
    }

    this.context.dispose()

    super.dispose()
    this.initialized = false
  }
}
