/**
 * WebGL图形上下文实现
 */
import {
  type BatchManager,
  type BatchManagerConfig,
  createBatchManagerWithDefaultStrategies,
} from '../batch'
import type {
  IGraphicsState,
  IImageData,
  IPoint,
  ITextStyle,
  ITransform,
} from '../graphics/IGraphicsContext'
import { Matrix3 } from '../math/Matrix3'
import { AdvancedShaderManager } from '../webgl/AdvancedShaderManager'
import { BufferManager, type IBuffer } from '../webgl/BufferManager'
import { SHADER_LIBRARY } from '../webgl/ShaderLibrary'
import { ShaderManager } from '../webgl/ShaderManager'
import { WebGLOptimizer } from '../webgl/WebGLOptimizer'
import { GeometryGenerator } from './GeometryGenerator'
import type { ClipRegion, IWebGLContext, PathPoint, WebGLAdvancedConfig } from './WebGLContextTypes'
import { WebGLRenderableFactory } from './WebGLRenderableFactory'

// 重新导出类型和工厂
export { WebGLContextFactory } from './WebGLContextFactory'
export * from './WebGLContextTypes'
export { WebGLRenderableFactory } from './WebGLRenderableFactory'

/**
 * WebGL上下文实现
 */
export class WebGLContext implements IWebGLContext {
  public readonly width: number
  public readonly height: number
  public readonly devicePixelRatio: number = window.devicePixelRatio || 1
  public readonly gl: WebGLRenderingContext

  // 变换矩阵栈
  private transformStack: Matrix3[] = []
  private currentTransform: Matrix3
  private projectionMatrix: Matrix3

  // 状态栈
  private stateStack: Array<{
    transform: Matrix3
    fillStyle: string
    strokeStyle: string
    lineWidth: number
    globalAlpha: number
  }> = []

  // 当前样式状态
  private fillStyle: string = '#000000'
  private strokeStyle: string = '#000000'
  private lineWidth: number = 1
  private globalAlpha: number = 1
  private currentFont: string = '16px Arial'
  private textAlign: string = 'left'
  private textBaseline: string = 'alphabetic'

  // 管理器
  private shaderManager: ShaderManager
  private bufferManager: BufferManager
  private batchManager: BatchManager
  private advancedShaderManager?: AdvancedShaderManager
  private webglOptimizer?: WebGLOptimizer

  // 缓冲区
  private vertexBuffer: IBuffer | null = null
  private indexBuffer: IBuffer | null = null

  // 路径和裁剪
  private currentPath: PathPoint[] = []
  private pathStarted: boolean = false
  private clipRegions: ClipRegion[] = []

  constructor(
    gl: WebGLRenderingContext,
    canvas: HTMLCanvasElement,
    config?: Partial<BatchManagerConfig>,
    advancedConfig?: WebGLAdvancedConfig
  ) {
    this.gl = gl
    this.width = canvas.width
    this.height = canvas.height

    this.currentTransform = Matrix3.identity()
    this.projectionMatrix = Matrix3.identity()

    this.shaderManager = new ShaderManager(this.gl)
    this.bufferManager = new BufferManager(this.gl)
    this.batchManager = createBatchManagerWithDefaultStrategies(this.gl, config)

    this.initializeAdvancedFeatures(advancedConfig)
    this.setupWebGLState()
    this.setup()
  }

  private initializeAdvancedFeatures(advancedConfig?: WebGLAdvancedConfig): void {
    if (!advancedConfig) return

    if (advancedConfig.enableAdvancedShaders) {
      this.advancedShaderManager = new AdvancedShaderManager(
        this.gl,
        advancedConfig.advancedShaderConfig
      )
    }

    if (advancedConfig.enableOptimizer) {
      this.webglOptimizer = new WebGLOptimizer(
        this.gl,
        this.shaderManager,
        this.bufferManager,
        advancedConfig.optimizerConfig
      )
    }
  }

  private setupWebGLState(): void {
    this.gl.enable(this.gl.BLEND)
    this.gl.blendFunc(this.gl.SRC_ALPHA, this.gl.ONE_MINUS_SRC_ALPHA)
    this.gl.clearColor(0, 0, 0, 0)
    this.gl.disable(this.gl.DEPTH_TEST)
    this.gl.viewport(0, 0, this.width, this.height)
  }

  private setup(): void {
    try {
      for (const [, shaderSource] of Object.entries(SHADER_LIBRARY)) {
        // 使用着色器对象内部的 name 属性，而不是对象键名
        this.shaderManager.createShader({
          name: shaderSource.name,
          vertex: shaderSource.vertex,
          fragment: shaderSource.fragment,
        })
      }
      console.log('WebGL context setup completed')
    } catch (error) {
      console.error('WebGL setup failed:', error)
    }
  }

  // ============ 基础WebGL方法 ============

  clear(color?: string): void {
    if (color) {
      const rgba = this.parseColor(color)
      this.gl.clearColor(rgba[0], rgba[1], rgba[2], rgba[3])
    }
    this.gl.clear(this.gl.COLOR_BUFFER_BIT)
  }

  setBlendMode(mode: string): void {
    switch (mode) {
      case 'normal':
        this.gl.blendFunc(this.gl.SRC_ALPHA, this.gl.ONE_MINUS_SRC_ALPHA)
        break
      case 'additive':
        this.gl.blendFunc(this.gl.SRC_ALPHA, this.gl.ONE)
        break
      case 'multiply':
        this.gl.blendFunc(this.gl.DST_COLOR, this.gl.ZERO)
        break
      default:
        this.gl.blendFunc(this.gl.SRC_ALPHA, this.gl.ONE_MINUS_SRC_ALPHA)
    }
  }

  drawElements(count: number, offset: number = 0): void {
    this.gl.drawElements(this.gl.TRIANGLES, count, this.gl.UNSIGNED_SHORT, offset)
  }

  drawArrays(mode: number, first: number, count: number): void {
    this.gl.drawArrays(mode, first, count)
  }

  createBuffer(): WebGLBuffer | null {
    return this.gl.createBuffer()
  }

  bindBuffer(target: number, buffer: WebGLBuffer | null): void {
    this.gl.bindBuffer(target, buffer)
  }

  bufferData(target: number, data: BufferSource | null, usage: number): void {
    this.gl.bufferData(target, data, usage)
  }

  useProgram(program: WebGLProgram | null): void {
    this.gl.useProgram(program)
  }

  bindTexture(target: number, texture: WebGLTexture | null): void {
    this.gl.bindTexture(target, texture)
  }

  // ============ 状态管理 ============

  save(): void {
    this.stateStack.push({
      transform: this.currentTransform.clone(),
      fillStyle: this.fillStyle,
      strokeStyle: this.strokeStyle,
      lineWidth: this.lineWidth,
      globalAlpha: this.globalAlpha,
    })
    this.transformStack.push(this.currentTransform.clone())
  }

  restore(): void {
    const state = this.stateStack.pop()
    if (state) {
      this.currentTransform = state.transform
      this.fillStyle = state.fillStyle
      this.strokeStyle = state.strokeStyle
      this.lineWidth = state.lineWidth
      this.globalAlpha = state.globalAlpha
      this.gl.lineWidth(this.lineWidth)
    }
    const transform = this.transformStack.pop()
    if (transform) {
      this.currentTransform = transform
    }
  }

  getState(): IGraphicsState {
    const e = this.currentTransform.elements
    return {
      transform: {
        a: e[0],
        b: e[1],
        c: e[3],
        d: e[4],
        e: e[6],
        f: e[7],
      },
      style: {
        fillColor: this.fillStyle,
        strokeColor: this.strokeStyle,
        lineWidth: this.lineWidth,
        opacity: this.globalAlpha,
      },
    }
  }

  setState(state: IGraphicsState): void {
    if (state.transform) {
      this.currentTransform = new Matrix3([
        state.transform.a,
        state.transform.b,
        0,
        state.transform.c,
        state.transform.d,
        0,
        state.transform.e,
        state.transform.f,
        1,
      ])
    }
    if (state.style) {
      if (state.style.fillColor) this.fillStyle = String(state.style.fillColor)
      if (state.style.strokeColor) this.strokeStyle = String(state.style.strokeColor)
      if (state.style.lineWidth) this.setLineWidth(state.style.lineWidth)
      if (state.style.opacity !== undefined) this.setGlobalAlpha(state.style.opacity)
    }
  }

  // ============ 变换 ============

  translate(x: number, y: number): void {
    this.currentTransform.translate(x, y)
  }

  rotate(angle: number): void {
    this.currentTransform.rotate(angle)
  }

  scale(scaleX: number, scaleY: number): void {
    this.currentTransform.scale(scaleX, scaleY)
  }

  setTransform(transform: ITransform): void {
    this.currentTransform = new Matrix3([
      transform.a,
      transform.b,
      0,
      transform.c,
      transform.d,
      0,
      transform.e,
      transform.f,
      1,
    ])
  }

  transform(a: number, b: number, c: number, d: number, e: number, f: number): void {
    const matrix = new Matrix3([a, b, 0, c, d, 0, e, f, 1])
    this.currentTransform.multiply(matrix)
  }

  resetTransform(): void {
    this.currentTransform = Matrix3.identity()
  }

  getCurrentTransform(): Matrix3 {
    return this.currentTransform.clone()
  }

  getProjectionMatrix(): Matrix3 {
    return this.projectionMatrix.clone()
  }

  getMVPMatrix(): Matrix3 {
    return this.projectionMatrix.clone().multiply(this.currentTransform)
  }

  // ============ 样式设置 ============

  setOpacity(opacity: number): void {
    this.globalAlpha = Math.max(0, Math.min(1, opacity))
  }

  setStrokeStyle(style: string): void {
    this.strokeStyle = style
  }

  setFillStyle(style: string): void {
    this.fillStyle = style
  }

  setLineWidth(width: number): void {
    this.lineWidth = Math.max(0, width)
    this.gl.lineWidth(width)
  }

  setLineDash(_segments: number[]): void {
    // WebGL中虚线需要通过着色器实现
  }

  setGlobalAlpha(alpha: number): void {
    this.globalAlpha = Math.max(0, Math.min(1, alpha))
  }

  setTextAlign(align: 'left' | 'center' | 'right' | 'start' | 'end'): void {
    this.textAlign = align
  }

  setTextBaseline(baseline: 'top' | 'middle' | 'bottom' | 'alphabetic' | 'hanging'): void {
    this.textBaseline = baseline
  }

  setFont(font: string): void {
    this.currentFont = font
  }

  setStyle(style: Record<string, unknown>): void {
    if (style.fillStyle) this.fillStyle = style.fillStyle as string
    if (style.strokeStyle) this.strokeStyle = style.strokeStyle as string
    if (style.lineWidth) this.setLineWidth(style.lineWidth as number)
    if (style.globalAlpha) this.setGlobalAlpha(style.globalAlpha as number)
  }

  setFillColor(color: string): void {
    this.fillStyle = color
  }

  setStrokeColor(color: string): void {
    this.strokeStyle = color
  }

  // ============ 坐标转换 ============

  screenToWorld(point: IPoint): IPoint {
    return { x: point.x, y: this.height - point.y }
  }

  worldToScreen(point: IPoint): IPoint {
    return { x: point.x, y: this.height - point.y }
  }

  // ============ 路径方法 ============

  beginPath(): void {
    this.currentPath = []
    this.pathStarted = true
  }

  closePath(): void {
    if (this.currentPath.length > 0) {
      const firstPoint = this.currentPath[0]
      this.currentPath.push({ x: firstPoint.x, y: firstPoint.y })
    }
  }

  moveTo(x: number, y: number): void {
    this.currentPath = [{ x, y }]
    this.pathStarted = true
  }

  lineTo(x: number, y: number): void {
    if (this.pathStarted) {
      this.currentPath.push({ x, y })
    }
  }

  quadraticCurveTo(cpx: number, cpy: number, x: number, y: number): void {
    if (this.pathStarted && this.currentPath.length > 0) {
      const lastPoint = this.currentPath[this.currentPath.length - 1]
      const segments = 20
      for (let i = 1; i <= segments; i++) {
        const t = i / segments
        const it = 1 - t
        const newX = it * it * lastPoint.x + 2 * it * t * cpx + t * t * x
        const newY = it * it * lastPoint.y + 2 * it * t * cpy + t * t * y
        this.currentPath.push({ x: newX, y: newY })
      }
    }
  }

  bezierCurveTo(
    cp1x: number,
    cp1y: number,
    cp2x: number,
    cp2y: number,
    x: number,
    y: number
  ): void {
    if (this.pathStarted && this.currentPath.length > 0) {
      const lastPoint = this.currentPath[this.currentPath.length - 1]
      const segments = 30
      for (let i = 1; i <= segments; i++) {
        const t = i / segments
        const it = 1 - t
        const newX =
          it * it * it * lastPoint.x +
          3 * it * it * t * cp1x +
          3 * it * t * t * cp2x +
          t * t * t * x
        const newY =
          it * it * it * lastPoint.y +
          3 * it * it * t * cp1y +
          3 * it * t * t * cp2y +
          t * t * t * y
        this.currentPath.push({ x: newX, y: newY })
      }
    }
  }

  arc(
    x: number,
    y: number,
    radius: number,
    startAngle: number,
    endAngle: number,
    counterclockwise?: boolean
  ): void {
    const segments = Math.max(16, Math.ceil((Math.abs(endAngle - startAngle) * 32) / (2 * Math.PI)))
    const angleStep = ((endAngle - startAngle) / segments) * (counterclockwise ? -1 : 1)

    for (let i = 0; i <= segments; i++) {
      const angle = startAngle + angleStep * i
      const pointX = x + Math.cos(angle) * radius
      const pointY = y + Math.sin(angle) * radius

      if (i === 0 && !this.pathStarted) {
        this.moveTo(pointX, pointY)
      } else {
        this.lineTo(pointX, pointY)
      }
    }
  }

  rect(x: number, y: number, width: number, height: number): void {
    this.moveTo(x, y)
    this.lineTo(x + width, y)
    this.lineTo(x + width, y + height)
    this.lineTo(x, y + height)
    this.closePath()
  }

  fill(): void {
    if (this.currentPath.length < 3) {
      return
    }

    // 应用当前变换矩阵到路径点
    const transformedPath = this.currentPath.map((p) => this.transformPoint(p.x, p.y))

    // 使用扇形三角剖分（适用于凸多边形和简单凹多边形）
    const color = GeometryGenerator.parseColor(this.fillStyle)
    color[3] *= this.globalAlpha
    const vertices: number[] = []
    const colors: number[] = []

    // 计算路径中心点
    let centerX = 0,
      centerY = 0
    for (const point of transformedPath) {
      centerX += point.x
      centerY += point.y
    }
    centerX /= transformedPath.length
    centerY /= transformedPath.length

    // 使用扇形三角剖分
    for (let i = 0; i < transformedPath.length; i++) {
      const p1 = transformedPath[i]
      const p2 = transformedPath[(i + 1) % transformedPath.length]

      // 三角形：中心点 -> 当前点 -> 下一点
      vertices.push(centerX, centerY, p1.x, p1.y, p2.x, p2.y)
      // 每个顶点添加颜色 (color 是 [r, g, b, a] 数组)
      for (let j = 0; j < 3; j++) {
        colors.push(color[0], color[1], color[2], color[3])
      }
    }

    if (vertices.length > 0) {
      const renderable = WebGLRenderableFactory.createFromVertices(vertices, colors)
      this.batchManager.addRenderable(renderable)
    }

    // 重置路径
    this.currentPath = []
    this.pathStarted = false
  }

  stroke(): void {
    if (this.currentPath.length < 2) {
      return
    }

    const color = GeometryGenerator.parseColor(this.strokeStyle)
    color[3] *= this.globalAlpha

    const transformedPath = this.currentPath.map((p) => this.transformPoint(p.x, p.y))

    for (let i = 0; i < transformedPath.length - 1; i++) {
      const p1 = transformedPath[i]
      const p2 = transformedPath[i + 1]
      const renderable = WebGLRenderableFactory.createLine(
        p1.x,
        p1.y,
        p2.x,
        p2.y,
        this.lineWidth,
        color
      )
      this.batchManager.addRenderable(renderable)
    }

    // 如果路径闭合，连接最后一点和第一点
    if (transformedPath.length > 2) {
      const first = transformedPath[0]
      const last = transformedPath[transformedPath.length - 1]
      // 检查是否需要闭合（最后一点是否回到起点）
      if (Math.abs(first.x - last.x) > 0.1 || Math.abs(first.y - last.y) > 0.1) {
        // 路径未闭合，不自动连接
      }
    }

    // 重置路径
    this.currentPath = []
    this.pathStarted = false
  }

  /**
   * 应用当前变换矩阵到点
   */
  private transformPoint(x: number, y: number): { x: number; y: number } {
    const e = this.currentTransform.elements
    return {
      x: e[0] * x + e[3] * y + e[6],
      y: e[1] * x + e[4] * y + e[7],
    }
  }

  // ============ 绘制方法 ============

  fillRect(x: number, y: number, width: number, height: number): void {
    const color = GeometryGenerator.parseColor(this.fillStyle)
    color[3] *= this.globalAlpha
    // 应用变换到矩形的四个角
    const p1 = this.transformPoint(x, y)
    const p2 = this.transformPoint(x + width, y)
    const p3 = this.transformPoint(x + width, y + height)
    const p4 = this.transformPoint(x, y + height)
    // 使用变换后的顶点创建矩形
    const vertices: number[] = [
      p1.x,
      p1.y,
      p2.x,
      p2.y,
      p3.x,
      p3.y,
      p1.x,
      p1.y,
      p3.x,
      p3.y,
      p4.x,
      p4.y,
    ]
    const colors: number[] = []
    for (let i = 0; i < 6; i++) {
      colors.push(color[0], color[1], color[2], color[3])
    }
    const renderable = WebGLRenderableFactory.createFromVertices(vertices, colors)
    this.batchManager.addRenderable(renderable)
  }

  strokeRect(x: number, y: number, width: number, height: number): void {
    const color = GeometryGenerator.parseColor(this.strokeStyle)
    color[3] *= this.globalAlpha
    // 应用变换到矩形的四个角
    const p1 = this.transformPoint(x, y)
    const p2 = this.transformPoint(x + width, y)
    const p3 = this.transformPoint(x + width, y + height)
    const p4 = this.transformPoint(x, y + height)
    // 绘制四条边
    const lines = [
      WebGLRenderableFactory.createLine(p1.x, p1.y, p2.x, p2.y, this.lineWidth, color),
      WebGLRenderableFactory.createLine(p2.x, p2.y, p3.x, p3.y, this.lineWidth, color),
      WebGLRenderableFactory.createLine(p3.x, p3.y, p4.x, p4.y, this.lineWidth, color),
      WebGLRenderableFactory.createLine(p4.x, p4.y, p1.x, p1.y, this.lineWidth, color),
    ]
    lines.forEach((r) => this.batchManager.addRenderable(r))
  }

  fillCircle(x: number, y: number, radius: number): void {
    const color = GeometryGenerator.parseColor(this.fillStyle)
    color[3] *= this.globalAlpha
    // 应用变换到圆心
    const center = this.transformPoint(x, y)
    // 注意：这里简化处理，假设变换不包含非均匀缩放
    const renderable = WebGLRenderableFactory.createCircle(center.x, center.y, radius, 32, color)
    this.batchManager.addRenderable(renderable)
  }

  strokeCircle(x: number, y: number, radius: number): void {
    const strokeColorParsed = GeometryGenerator.parseColor(this.strokeStyle)
    strokeColorParsed[3] *= this.globalAlpha
    // 应用变换到圆心
    const center = this.transformPoint(x, y)
    const outerRadius = radius + this.lineWidth / 2
    const outerRenderable = WebGLRenderableFactory.createCircle(
      center.x,
      center.y,
      outerRadius,
      32,
      strokeColorParsed
    )
    this.batchManager.addRenderable(outerRenderable)
  }

  drawLine(x1: number, y1: number, x2: number, y2: number): void {
    const color = GeometryGenerator.parseColor(this.strokeStyle)
    color[3] *= this.globalAlpha
    // 应用变换到线段的两个端点
    const p1 = this.transformPoint(x1, y1)
    const p2 = this.transformPoint(x2, y2)
    const renderable = WebGLRenderableFactory.createLine(
      p1.x,
      p1.y,
      p2.x,
      p2.y,
      this.lineWidth,
      color
    )
    this.batchManager.addRenderable(renderable)
  }

  drawRect(
    rect: { x: number; y: number; width: number; height: number },
    fill?: boolean,
    stroke?: boolean
  ): void {
    if (fill) this.fillRect(rect.x, rect.y, rect.width, rect.height)
    if (stroke) this.strokeRect(rect.x, rect.y, rect.width, rect.height)
  }

  drawCircle(center: IPoint, radius: number, fill?: boolean, stroke?: boolean): void {
    if (fill) this.fillCircle(center.x, center.y, radius)
    if (stroke) this.strokeCircle(center.x, center.y, radius)
  }

  clearRect(x: number, y: number, width: number, height: number): void {
    this.gl.enable(this.gl.SCISSOR_TEST)
    this.gl.scissor(x, this.height - y - height, width, height)
    this.gl.clearColor(0, 0, 0, 0)
    this.gl.clear(this.gl.COLOR_BUFFER_BIT)
    this.gl.disable(this.gl.SCISSOR_TEST)
  }

  // ============ 文本方法 ============

  fillText(text: string, x: number, y: number, _style?: unknown): void {
    console.log('Text fill operation - requires higher level renderer', { text, x, y })
  }

  strokeText(text: string, x: number, y: number, _style?: unknown): void {
    console.log('Text stroke operation - requires higher level renderer', { text, x, y })
  }

  measureText(text: string, style?: ITextStyle): { width: number; height: number } {
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    if (ctx) {
      // 构建字体字符串
      const fontSize = style?.fontSize || 16
      const fontFamily = style?.fontFamily || 'Arial'
      const fontWeight = style?.fontWeight || 'normal'
      const fontStyle = style?.fontStyle || 'normal'
      ctx.font = `${fontStyle} ${fontWeight} ${fontSize}px ${fontFamily}`
      const metrics = ctx.measureText(text)
      return { width: metrics.width, height: fontSize }
    }
    return { width: text.length * 8, height: 16 }
  }

  // ============ 图像方法 ============

  drawImage(imageData: IImageData, dx: number, dy: number, dw?: number, dh?: number): void {
    console.log('Drawing image', { imageData, dx, dy, dw, dh })
  }

  getImageData(x: number, y: number, width: number, height: number): ImageData {
    const pixels = new Uint8ClampedArray(width * height * 4)
    this.gl.readPixels(
      x,
      this.height - y - height,
      width,
      height,
      this.gl.RGBA,
      this.gl.UNSIGNED_BYTE,
      pixels
    )

    const flippedPixels = new Uint8ClampedArray(pixels.length)
    for (let row = 0; row < height; row++) {
      const srcRow = height - 1 - row
      for (let col = 0; col < width; col++) {
        const srcIndex = (srcRow * width + col) * 4
        const dstIndex = (row * width + col) * 4
        flippedPixels[dstIndex] = pixels[srcIndex]
        flippedPixels[dstIndex + 1] = pixels[srcIndex + 1]
        flippedPixels[dstIndex + 2] = pixels[srcIndex + 2]
        flippedPixels[dstIndex + 3] = pixels[srcIndex + 3]
      }
    }

    return new ImageData(flippedPixels, width, height)
  }

  putImageData(imageData: ImageData, x: number, y: number): void {
    const texture = this.gl.createTexture()
    this.gl.bindTexture(this.gl.TEXTURE_2D, texture)
    this.gl.texImage2D(
      this.gl.TEXTURE_2D,
      0,
      this.gl.RGBA,
      imageData.width,
      imageData.height,
      0,
      this.gl.RGBA,
      this.gl.UNSIGNED_BYTE,
      imageData.data
    )
    this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MIN_FILTER, this.gl.NEAREST)
    this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MAG_FILTER, this.gl.NEAREST)
    console.log('Texture rendering operation', { x, y })
    this.gl.deleteTexture(texture)
  }

  // ============ 裁剪方法 ============

  clip(): void {
    if (this.currentPath.length >= 3) {
      let minX = this.currentPath[0].x,
        minY = this.currentPath[0].y
      let maxX = minX,
        maxY = minY

      for (const point of this.currentPath) {
        minX = Math.min(minX, point.x)
        minY = Math.min(minY, point.y)
        maxX = Math.max(maxX, point.x)
        maxY = Math.max(maxY, point.y)
      }

      this.clipRect(minX, minY, maxX - minX, maxY - minY)
    }
  }

  clipRect(x: number, y: number, width: number, height: number): void {
    this.clipRegions.push({ x, y, width, height })
    this.gl.enable(this.gl.SCISSOR_TEST)
    const currentClip = this.getCurrentClipRect()
    this.gl.scissor(
      currentClip.x,
      this.height - currentClip.y - currentClip.height,
      currentClip.width,
      currentClip.height
    )
  }

  private getCurrentClipRect(): ClipRegion {
    if (this.clipRegions.length === 0) {
      return { x: 0, y: 0, width: this.width, height: this.height }
    }

    let result = this.clipRegions[0]
    for (let i = 1; i < this.clipRegions.length; i++) {
      const clip = this.clipRegions[i]
      const x1 = Math.max(result.x, clip.x)
      const y1 = Math.max(result.y, clip.y)
      const x2 = Math.min(result.x + result.width, clip.x + clip.width)
      const y2 = Math.min(result.y + result.height, clip.y + clip.height)
      result = { x: x1, y: y1, width: Math.max(0, x2 - x1), height: Math.max(0, y2 - y1) }
    }
    return result
  }

  // ============ 渲染方法 ============

  present(): void {
    const basicShader = this.shaderManager.getShaderByName('basic_shape')
    if (!basicShader) {
      return
    }

    basicShader.use(this.gl)

    const projectionMatrix = this.createProjectionMatrix()
    const identityMatrix = Matrix3.identity()

    basicShader.setUniform('u_projection', projectionMatrix.toArray())
    basicShader.setUniform('u_transform', identityMatrix.toArray())

    this.gl.enable(this.gl.BLEND)
    this.gl.blendFunc(this.gl.SRC_ALPHA, this.gl.ONE_MINUS_SRC_ALPHA)

    this.batchManager.flush(projectionMatrix)
  }

  private createProjectionMatrix(): Matrix3 {
    const width = this.width
    const height = this.height
    return new Matrix3([2 / width, 0, 0, 0, -2 / height, 0, -1, 1, 1])
  }

  // ============ 高级功能访问 ============

  getAdvancedShaderManager(): AdvancedShaderManager | undefined {
    return this.advancedShaderManager
  }

  getWebGLOptimizer(): WebGLOptimizer | undefined {
    return this.webglOptimizer
  }

  // ============ 工具方法 ============

  private parseColor(colorStr: string): [number, number, number, number] {
    if (colorStr.startsWith('#')) {
      const hex = colorStr.slice(1)
      const r = parseInt(hex.slice(0, 2), 16) / 255
      const g = parseInt(hex.slice(2, 4), 16) / 255
      const b = parseInt(hex.slice(4, 6), 16) / 255
      return [r, g, b, 1]
    }
    return [1, 1, 1, 1]
  }

  // ============ 销毁 ============

  dispose(): void {
    if (this.advancedShaderManager) this.advancedShaderManager.dispose()
    if (this.webglOptimizer) this.webglOptimizer.dispose()
    this.batchManager.dispose()
    this.shaderManager.dispose()
    this.bufferManager.dispose()
    if (this.vertexBuffer) this.vertexBuffer.dispose(this.gl)
    if (this.indexBuffer) this.indexBuffer.dispose(this.gl)
  }
}
