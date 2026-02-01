/**
 * WebGL渲染器
 * 使用统一批处理系统的高性能渲染器
 */

import { GeometryGenerator } from '../adapters/GeometryGenerator'
import type { IWebGLContext } from '../adapters/WebGLContext'
import {
  type BatchManager,
  type BatchManagerConfig,
  type BatchStats,
  createBatchManagerWithDefaultStrategies,
  type IRenderable,
} from '../batch'
import type { RenderContext, RendererCapabilities } from '../core'
import type { IColor, IPoint, IRect } from '../graphics/IGraphicsContext'
import { Matrix3 } from '../math/Matrix3'
import { BufferManager, BufferType, BufferUsage, type IBuffer } from '../webgl/BufferManager'
import { SHADER_LIBRARY } from '../webgl/ShaderLibrary'
import { type IShaderProgram, ShaderManager } from '../webgl/ShaderManager'
import { TextureManager } from '../webgl/TextureManager'
import { type TextRenderOptions, WebGLTextRenderer } from '../webgl/WebGLTextRenderer'
import {
  type IDrawCircleOptions,
  type IDrawImageOptions,
  type IDrawLineOptions,
  type IDrawRectOptions,
  type IDrawTextOptions,
  type IImageSource,
  RendererBase,
} from './BaseRenderer'

export class WebGLRenderer extends RendererBase {
  private context: IWebGLContext
  private gl: WebGLRenderingContext
  private shaderManager: ShaderManager
  private bufferManager: BufferManager
  private textureManager: TextureManager
  private textRenderer: WebGLTextRenderer

  private currentShader: IShaderProgram | null = null
  private batchManager: BatchManager

  private vertexBuffer: IBuffer | null = null
  private indexBuffer: IBuffer | null = null

  constructor(context: IWebGLContext, config?: Partial<BatchManagerConfig>) {
    super()
    this.context = context
    this.gl = context.gl

    this.shaderManager = new ShaderManager(this.gl)
    this.bufferManager = new BufferManager(this.gl)
    this.textureManager = new TextureManager(this.gl)
    this.batchManager = createBatchManagerWithDefaultStrategies(this.gl, config)
    this.textRenderer = new WebGLTextRenderer(this.gl, this.textureManager)
  }

  initialize(canvas: HTMLCanvasElement): boolean {
    return true
  }

  private setup(): void {
    this.setupShaders()

    this.vertexBuffer = this.bufferManager.createBuffer(
      BufferType.VERTEX,
      BufferUsage.DYNAMIC,
      'main_vertex_buffer'
    )

    this.indexBuffer = this.bufferManager.createBuffer(
      BufferType.INDEX,
      BufferUsage.DYNAMIC,
      'main_index_buffer'
    )
  }

  private setupShaders(): void {
    this.shaderManager.createShader(SHADER_LIBRARY.BASIC_SHAPE)
    this.shaderManager.createShader(SHADER_LIBRARY.SOLID_COLOR)
    this.shaderManager.createShader(SHADER_LIBRARY.TEXTURE)
  }

  setBatchStrategy(strategy: 'basic' | 'enhanced' | 'instanced'): void {
    this.batchManager.setStrategy(strategy)
  }

  getCurrentBatchStrategy(): string {
    return this.batchManager.getCurrentStrategy()
  }

  drawRect(x: number, y: number, width: number, height: number, options?: IDrawRectOptions): void {
    this.save()

    if (options?.style) {
      this.applyStyleFromOptions(options)
    }

    const colorArr = this.parseColor(this.fillColor)

    if (options?.filled !== false) {
      const renderable = this.createRectangleRenderable(x, y, width, height, colorArr)
      this.batchManager.addRenderable(renderable)
    }

    if (!options?.filled || options?.style?.strokeColor) {
      const strokeColorArr = options?.style?.strokeColor
        ? this.parseColor(options.style.strokeColor)
        : this.parseColor(this.strokeColor)
      const strokeWidth = options?.style?.lineWidth ?? this.currentLineWidth
      this.drawRectangleStrokeInternal(x, y, width, height, strokeColorArr, strokeWidth)
    }

    this.restore()
  }

  private drawRectangleStrokeInternal(
    x: number,
    y: number,
    width: number,
    height: number,
    color: [number, number, number, number],
    strokeWidth: number
  ): void {
    const lines = [
      { x1: x, y1: y, x2: x + width, y2: y },
      { x1: x + width, y1: y, x2: x + width, y2: y + height },
      { x1: x + width, y1: y + height, x2: x, y2: y + height },
      { x1: x, y1: y + height, x2: x, y2: y },
    ]

    lines.forEach((line) => {
      const renderable = this.createLineRenderable(
        line.x1,
        line.y1,
        line.x2,
        line.y2,
        strokeWidth,
        color
      )
      this.batchManager.addRenderable(renderable)
    })
  }

  drawCircle(center: IPoint, radius: number, options?: IDrawCircleOptions): void {
    this.save()

    if (options?.style) {
      this.applyStyleFromOptions(options)
    }

    const colorArr = this.parseColor(this.fillColor)
    const segments = Math.max(32, Math.ceil(radius * 0.5))

    if (options?.filled) {
      const renderable = this.createCircleRenderable(center.x, center.y, radius, segments, colorArr)
      this.batchManager.addRenderable(renderable)
    } else {
      const strokeColorArr = options?.style?.strokeColor
        ? this.parseColor(options.style.strokeColor)
        : this.parseColor(this.strokeColor)
      const strokeWidth = options?.style?.lineWidth ?? this.currentLineWidth

      for (let i = 0; i < segments; i++) {
        const angle1 = (i / segments) * Math.PI * 2
        const angle2 = ((i + 1) / segments) * Math.PI * 2
        const x1 = center.x + Math.cos(angle1) * radius
        const y1 = center.y + Math.sin(angle1) * radius
        const x2 = center.x + Math.cos(angle2) * radius
        const y2 = center.y + Math.sin(angle2) * radius

        const renderable = this.createLineRenderable(x1, y1, x2, y2, strokeWidth, strokeColorArr)
        this.batchManager.addRenderable(renderable)
      }
    }

    this.restore()
  }

  drawLine(start: IPoint, end: IPoint, options?: IDrawLineOptions): void {
    this.save()

    if (options?.style) {
      this.applyStyleFromOptions(options)
    }

    const colorArr = this.parseColor(this.strokeColor)
    const width = options?.style?.lineWidth ?? this.currentLineWidth

    const renderable = this.createLineRenderable(start.x, start.y, end.x, end.y, width, colorArr)
    this.batchManager.addRenderable(renderable)

    this.restore()
  }

  drawText(text: string, position: IPoint, options?: IDrawTextOptions): void {
    if (!text) return

    this.save()

    let renderOptions: TextRenderOptions | undefined

    if (options?.style) {
      this.applyStyleFromOptions(options)
      const style = options.style
      const textAlign =
        style.textAlign === 'start' || style.textAlign === 'end'
          ? style.textAlign === 'start'
            ? 'left'
            : 'right'
          : style.textAlign
      renderOptions = {
        color:
          typeof this.fillColor === 'string'
            ? this.fillColor
            : this.colorToString(this.fillColor as IColor),
        fontFamily: style.fontFamily,
        fontSize: style.fontSize,
        fontWeight: style.fontWeight?.toString(),
        textAlign: textAlign as 'left' | 'center' | 'right' | undefined,
        textBaseline: style.textBaseline,
      }
    }

    const renderable = this.textRenderer.drawText(text, position.x, position.y, renderOptions)
    if (renderable) {
      this.batchManager.addRenderable(renderable)
    }

    this.restore()
  }

  drawImage(
    image: IImageSource,
    position: IPoint,
    size?: { width: number; height: number },
    options?: IDrawImageOptions
  ): void {
    const targetWidth = size?.width ?? image.width
    const targetHeight = size?.height ?? image.height

    if (
      image.data &&
      (image.data instanceof HTMLImageElement || image.data instanceof HTMLCanvasElement)
    ) {
      const textureId = `img_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      try {
        const textureRef = this.textureManager.createTexture(
          textureId,
          {
            width: image.width,
            height: image.height,
            format: this.gl.RGBA,
            type: this.gl.UNSIGNED_BYTE,
          },
          image.data as HTMLImageElement
        )

        if (textureRef.resource) {
          const renderable = this.createTextureRenderable(
            position.x,
            position.y,
            targetWidth,
            targetHeight,
            textureRef.resource
          )
          this.batchManager.addRenderable(renderable)
        }
      } catch (error) {
        console.warn('Failed to create texture for image:', error)
      }
    }
  }

  drawPolygon(points: IPoint[], options?: IDrawRectOptions): void {
    if (points.length < 3) return

    this.save()

    if (options?.style) {
      this.applyStyleFromOptions(options)
    }

    const colorArr = this.parseColor(this.fillColor)
    const geometry = GeometryGenerator.createPolygon(points, colorArr)

    if (geometry.vertexCount > 0) {
      const renderable = this.geometryDataToRenderable(geometry, 'basic')
      this.batchManager.addRenderable(renderable)
    }

    this.restore()
  }

  measureText(text: string, options?: TextRenderOptions): { width: number; height: number } {
    return this.textRenderer.measureText(text, options)
  }

  getTextRenderer(): WebGLTextRenderer {
    return this.textRenderer
  }

  drawTexture(
    texture: WebGLTexture | null,
    x: number,
    y: number,
    width: number,
    height: number
  ): void {
    if (!texture) return

    const renderable = this.createTextureRenderable(x, y, width, height, texture)
    this.batchManager.addRenderable(renderable)
  }

  flush(projectionMatrix: Matrix3, transformMatrix?: Matrix3): void {
    this.gl.clear(this.gl.DEPTH_BUFFER_BIT)

    const combinedMatrix = transformMatrix
      ? projectionMatrix.multiply(transformMatrix)
      : projectionMatrix

    this.batchManager.flush(combinedMatrix)
  }

  clear(color?: IColor | string): void {
    if (color) {
      const [r, g, b, a] = this.parseColor(color)
      this.gl.clearColor(r, g, b, a)
    }
    this.context.clear()
  }

  render(context: RenderContext): void {
    this.gl.viewport(0, 0, context.canvas.width, context.canvas.height)

    this.clear()

    for (const drawable of this.drawables) {
      if (drawable.visible && this.boundsIntersect(drawable.getBounds(), context.viewport)) {
        drawable.draw(context)
      }
    }

    this.context.present()
  }

  getCapabilities(): RendererCapabilities {
    return {
      supportsTransforms: true,
      supportsFilters: false,
      supportsBlending: true,
      maxTextureSize: this.gl.getParameter(this.gl.MAX_TEXTURE_SIZE),
      supportedFormats: ['png', 'jpg', 'jpeg', 'webp'],
    }
  }

  private createProjectionMatrix(viewport: IRect): Matrix3 {
    const left = viewport.x
    const right = viewport.x + viewport.width
    const bottom = viewport.y + viewport.height
    const top = viewport.y

    const width = right - left
    const height = bottom - top

    return new Matrix3([
      2 / width,
      0,
      0,
      0,
      -2 / height,
      0,
      -(right + left) / width,
      (bottom + top) / height,
      1,
    ])
  }

  getStats(): {
    batchStats: BatchStats
    shaderStats: ReturnType<ShaderManager['getStats']>
    bufferStats: ReturnType<BufferManager['getStats']>
    currentStrategy: string
  } {
    return {
      batchStats: this.batchManager.getStats(),
      shaderStats: this.shaderManager.getStats(),
      bufferStats: this.bufferManager.getStats(),
      currentStrategy: this.batchManager.getCurrentStrategy(),
    }
  }

  getRenderStats(): {
    drawCalls: number
    triangles: number
    vertices: number
    batches: number
    textureBinds: number
    shaderSwitches: number
    frameTime: number
  } {
    const batchStats = this.batchManager.getStats()
    return {
      drawCalls: batchStats.drawCalls || 0,
      triangles: batchStats.triangles || 0,
      vertices: batchStats.vertices || 0,
      batches: batchStats.batches || 0,
      textureBinds: 0,
      shaderSwitches: 0,
      frameTime: 0,
    }
  }

  getDetailedBatchStats() {
    return this.batchManager.getDetailedStats()
  }

  autoOptimize(): void {
    this.batchManager.autoOptimize()
  }

  dispose(): void {
    this.clear()
    this.textRenderer.dispose()
    this.batchManager.dispose()
    this.shaderManager.dispose()
    this.bufferManager.dispose()
    this.currentShader = null
    this.vertexBuffer = null
    this.indexBuffer = null
    super.dispose()
  }

  private createRectangleRenderable(
    x: number,
    y: number,
    width: number,
    height: number,
    color: [number, number, number, number]
  ): IRenderable {
    const vertices = new Float32Array([
      x,
      y,
      color[0],
      color[1],
      color[2],
      color[3],
      0,
      0,
      x + width,
      y,
      color[0],
      color[1],
      color[2],
      color[3],
      1,
      0,
      x + width,
      y + height,
      color[0],
      color[1],
      color[2],
      color[3],
      1,
      1,
      x,
      y + height,
      color[0],
      color[1],
      color[2],
      color[3],
      0,
      1,
    ])

    const indices = new Uint16Array([0, 1, 2, 0, 2, 3])

    return {
      getVertices: () => vertices,
      getIndices: () => indices,
      getShader: () => 'basic_shape',
      getBlendMode: () => 0,
      getZIndex: () => 0,
    }
  }

  private createCircleRenderable(
    centerX: number,
    centerY: number,
    radius: number,
    segments: number,
    color: [number, number, number, number]
  ): IRenderable {
    const vertexCount = segments + 1
    const vertices = new Float32Array(vertexCount * 8)
    const indices: number[] = []

    let offset = 0
    vertices[offset++] = centerX
    vertices[offset++] = centerY
    vertices[offset++] = color[0]
    vertices[offset++] = color[1]
    vertices[offset++] = color[2]
    vertices[offset++] = color[3]
    vertices[offset++] = 0.5
    vertices[offset++] = 0.5

    for (let i = 0; i < segments; i++) {
      const angle = (i / segments) * Math.PI * 2
      const x = centerX + Math.cos(angle) * radius
      const y = centerY + Math.sin(angle) * radius

      vertices[offset++] = x
      vertices[offset++] = y
      vertices[offset++] = color[0]
      vertices[offset++] = color[1]
      vertices[offset++] = color[2]
      vertices[offset++] = color[3]
      vertices[offset++] = (Math.cos(angle) + 1) * 0.5
      vertices[offset++] = (Math.sin(angle) + 1) * 0.5
    }

    for (let i = 0; i < segments; i++) {
      const next = (i + 1) % segments
      indices.push(0, i + 1, next + 1)
    }

    return {
      getVertices: () => vertices,
      getIndices: () => new Uint16Array(indices),
      getShader: () => 'basic_shape',
      getBlendMode: () => 0,
      getZIndex: () => 0,
    }
  }

  private createLineRenderable(
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    width: number,
    color: [number, number, number, number]
  ): IRenderable {
    const dx = x2 - x1
    const dy = y2 - y1
    const length = Math.sqrt(dx * dx + dy * dy)

    if (length < 0.001) {
      return {
        getVertices: () => new Float32Array(0),
        getIndices: () => new Uint16Array(0),
        getShader: () => 'basic_shape',
        getBlendMode: () => 0,
        getZIndex: () => 0,
      }
    }

    const dirX = dx / length
    const dirY = dy / length
    const normalX = -dirY
    const normalY = dirX
    const halfWidth = width * 0.5

    const vertices = new Float32Array([
      x1 + normalX * halfWidth,
      y1 + normalY * halfWidth,
      color[0],
      color[1],
      color[2],
      color[3],
      0,
      0,
      x1 - normalX * halfWidth,
      y1 - normalY * halfWidth,
      color[0],
      color[1],
      color[2],
      color[3],
      0,
      1,
      x2 - normalX * halfWidth,
      y2 - normalY * halfWidth,
      color[0],
      color[1],
      color[2],
      color[3],
      1,
      1,
      x2 + normalX * halfWidth,
      y2 + normalY * halfWidth,
      color[0],
      color[1],
      color[2],
      color[3],
      1,
      0,
    ])

    const indices = new Uint16Array([0, 1, 2, 0, 2, 3])

    return {
      getVertices: () => vertices,
      getIndices: () => indices,
      getShader: () => 'basic_shape',
      getBlendMode: () => 0,
      getZIndex: () => 0,
    }
  }

  private createTextureRenderable(
    x: number,
    y: number,
    width: number,
    height: number,
    texture: WebGLTexture
  ): IRenderable {
    const vertices = new Float32Array([
      x,
      y,
      1,
      1,
      1,
      1,
      0,
      0,
      x + width,
      y,
      1,
      1,
      1,
      1,
      1,
      0,
      x + width,
      y + height,
      1,
      1,
      1,
      1,
      1,
      1,
      x,
      y + height,
      1,
      1,
      1,
      1,
      0,
      1,
    ])

    const indices = new Uint16Array([0, 1, 2, 0, 2, 3])

    return {
      getVertices: () => vertices,
      getIndices: () => indices,
      getTexture: () => texture,
      getShader: () => 'texture',
      getBlendMode: () => 0,
      getZIndex: () => 0,
    }
  }

  private geometryDataToRenderable(
    geometry: {
      vertices: Float32Array | number[]
      indices: Uint16Array | number[]
      vertexCount: number
    },
    shaderName: string
  ): IRenderable {
    return {
      getVertices: () =>
        geometry.vertices instanceof Float32Array
          ? geometry.vertices
          : new Float32Array(geometry.vertices),
      getIndices: () =>
        geometry.indices instanceof Uint16Array
          ? geometry.indices
          : new Uint16Array(geometry.indices),
      getShader: () => shaderName,
      getBlendMode: () => 0,
      getZIndex: () => 0,
    }
  }
}
