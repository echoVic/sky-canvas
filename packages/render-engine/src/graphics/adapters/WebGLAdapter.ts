import type {
  IColor,
  IGraphicsCapabilities,
  IGraphicsContext,
  IGraphicsContextFactory,
  IGraphicsState,
  IGraphicsStyle,
  IImageData,
  IPoint,
  IRect,
  ITextStyle,
  ITransform,
} from '../IGraphicsContext'
import type { IRenderCommand } from '../RenderCommand'

/**
 * WebGL着色器程序管理器
 */
class ShaderProgram {
  private gl: WebGLRenderingContext
  private program: WebGLProgram
  private attributes: Map<string, number> = new Map()
  private uniforms: Map<string, WebGLUniformLocation> = new Map()

  constructor(gl: WebGLRenderingContext, vertexShader: string, fragmentShader: string) {
    this.gl = gl
    this.program = this.createProgram(vertexShader, fragmentShader)
    this.extractAttributes()
    this.extractUniforms()
  }

  private createProgram(vertexSource: string, fragmentSource: string): WebGLProgram {
    const gl = this.gl

    const vertexShader = this.createShader(gl.VERTEX_SHADER, vertexSource)
    const fragmentShader = this.createShader(gl.FRAGMENT_SHADER, fragmentSource)

    const program = gl.createProgram()
    if (!program) {
      throw new Error('Failed to create WebGL program')
    }

    gl.attachShader(program, vertexShader)
    gl.attachShader(program, fragmentShader)
    gl.linkProgram(program)

    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      const error = gl.getProgramInfoLog(program)
      gl.deleteProgram(program)
      throw new Error(`Failed to link program: ${error}`)
    }

    return program
  }

  private createShader(type: number, source: string): WebGLShader {
    const gl = this.gl
    const shader = gl.createShader(type)
    if (!shader) {
      throw new Error('Failed to create shader')
    }

    gl.shaderSource(shader, source)
    gl.compileShader(shader)

    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      const error = gl.getShaderInfoLog(shader)
      gl.deleteShader(shader)
      throw new Error(`Failed to compile shader: ${error}`)
    }

    return shader
  }

  private extractAttributes(): void {
    const gl = this.gl
    const count = gl.getProgramParameter(this.program, gl.ACTIVE_ATTRIBUTES)

    for (let i = 0; i < count; i++) {
      const info = gl.getActiveAttrib(this.program, i)
      if (info) {
        const location = gl.getAttribLocation(this.program, info.name)
        this.attributes.set(info.name, location)
      }
    }
  }

  private extractUniforms(): void {
    const gl = this.gl
    const count = gl.getProgramParameter(this.program, gl.ACTIVE_UNIFORMS)

    for (let i = 0; i < count; i++) {
      const info = gl.getActiveUniform(this.program, i)
      if (info) {
        const location = gl.getUniformLocation(this.program, info.name)
        if (location) {
          this.uniforms.set(info.name, location)
        }
      }
    }
  }

  use(): void {
    this.gl.useProgram(this.program)
  }

  getAttributeLocation(name: string): number {
    return this.attributes.get(name) ?? -1
  }

  getUniformLocation(name: string): WebGLUniformLocation | null {
    return this.uniforms.get(name) ?? null
  }

  dispose(): void {
    this.gl.deleteProgram(this.program)
  }
}

/**
 * WebGL图形上下文实现
 */
export class WebGLGraphicsContext implements IGraphicsContext {
  private gl: WebGLRenderingContext
  public readonly width: number
  public readonly height: number
  public readonly devicePixelRatio: number = window.devicePixelRatio || 1
  private currentStyle: IGraphicsStyle = {
    fillColor: '#000000',
    strokeColor: '#000000',
    lineWidth: 1,
    lineCap: 'butt',
    lineJoin: 'miter',
    opacity: 1,
  }
  private transformStack: number[][] = []
  private currentTransform: number[] = [1, 0, 0, 1, 0, 0] // 2D变换矩阵
  private shaderProgram?: ShaderProgram
  private vertexBuffer?: WebGLBuffer
  private indexBuffer?: WebGLBuffer

  constructor(gl: WebGLRenderingContext, width: number, height: number) {
    this.gl = gl
    this.width = width
    this.height = height
    this.initialize()
  }

  private initialize(): void {
    const gl = this.gl

    // 设置视口
    gl.viewport(0, 0, this.width, this.height)

    // 启用混合
    gl.enable(gl.BLEND)
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA)

    // 创建基础着色器程序
    const vertexShaderSource = `
      attribute vec2 a_position;
      uniform mat3 u_transform;
      uniform vec2 u_resolution;
      
      void main() {
        vec3 position = u_transform * vec3(a_position, 1.0);
        vec2 clipSpace = ((position.xy / u_resolution) * 2.0) - 1.0;
        gl_Position = vec4(clipSpace * vec2(1, -1), 0, 1);
      }
    `

    const fragmentShaderSource = `
      precision mediump float;
      uniform vec4 u_color;
      
      void main() {
        gl_FragColor = u_color;
      }
    `

    this.shaderProgram = new ShaderProgram(gl, vertexShaderSource, fragmentShaderSource)

    // 创建缓冲区
    this.vertexBuffer = gl.createBuffer()
    this.indexBuffer = gl.createBuffer()

    if (!this.vertexBuffer || !this.indexBuffer) {
      throw new Error('Failed to create WebGL buffers')
    }
  }

  // 状态管理
  save(): void {
    this.transformStack.push([...this.currentTransform])
  }

  restore(): void {
    const transform = this.transformStack.pop()
    if (transform) {
      this.currentTransform = transform
    }
  }

  // 变换操作
  translate(x: number, y: number): void {
    this.currentTransform[4] += this.currentTransform[0] * x + this.currentTransform[2] * y
    this.currentTransform[5] += this.currentTransform[1] * x + this.currentTransform[3] * y
  }

  rotate(angle: number): void {
    const cos = Math.cos(angle)
    const sin = Math.sin(angle)
    const [a, b, c, d] = this.currentTransform

    this.currentTransform[0] = a * cos + c * sin
    this.currentTransform[1] = b * cos + d * sin
    this.currentTransform[2] = a * -sin + c * cos
    this.currentTransform[3] = b * -sin + d * cos
  }

  scale(x: number, y: number): void {
    this.currentTransform[0] *= x
    this.currentTransform[1] *= x
    this.currentTransform[2] *= y
    this.currentTransform[3] *= y
  }

  setTransform(transform: ITransform): void {
    this.currentTransform = [
      transform.a,
      transform.b,
      transform.c,
      transform.d,
      transform.e,
      transform.f,
    ]
  }

  transform(a: number, b: number, c: number, d: number, e: number, f: number): void {
    const [m11, m12, m21, m22, dx, dy] = this.currentTransform
    this.currentTransform = [
      m11 * a + m12 * c,
      m11 * b + m12 * d,
      m21 * a + m22 * c,
      m21 * b + m22 * d,
      dx * a + dy * c + e,
      dx * b + dy * d + f,
    ]
  }

  resetTransform(): void {
    this.currentTransform = [1, 0, 0, 1, 0, 0]
  }

  // 状态管理
  getState(): IGraphicsState {
    return {
      transform: {
        a: this.currentTransform[0],
        b: this.currentTransform[1],
        c: this.currentTransform[2],
        d: this.currentTransform[3],
        e: this.currentTransform[4],
        f: this.currentTransform[5],
      },
      style: { ...this.currentStyle },
    }
  }

  setState(state: Partial<IGraphicsState>): void {
    if (state.transform) {
      this.setTransform(state.transform)
    }
    if (state.style) {
      this.setStyle(state.style)
    }
  }

  // 样式设置
  setStyle(style: Partial<IGraphicsStyle>): void {
    this.currentStyle = { ...this.currentStyle, ...style }
  }

  setFillColor(color: IColor | string): void {
    this.currentStyle.fillColor = color
  }

  setStrokeColor(color: IColor | string): void {
    this.currentStyle.strokeColor = color
  }

  setLineWidth(width: number): void {
    this.currentStyle.lineWidth = width
  }

  setOpacity(opacity: number): void {
    this.currentStyle.opacity = opacity
  }

  setFillStyle(color: IColor | string): void {
    this.setFillColor(color)
  }

  setStrokeStyle(color: IColor | string): void {
    this.setStrokeColor(color)
  }

  drawLine(_x1: number, _y1: number, _x2: number, _y2: number): void {
    // WebGL implementation placeholder
    console.warn('drawLine not fully implemented in WebGL context')
  }

  drawRect(rect: IRect, fill?: boolean, stroke?: boolean): void {
    if (fill) {
      this.fillRect(rect.x, rect.y, rect.width, rect.height)
    }
    if (stroke) {
      this.strokeRect(rect.x, rect.y, rect.width, rect.height)
    }
  }

  drawCircle(center: IPoint, radius: number, fill?: boolean, stroke?: boolean): void {
    if (fill) {
      this.fillCircle(center.x, center.y, radius)
    }
    if (stroke) {
      this.strokeCircle(center.x, center.y, radius)
    }
  }

  setTextStyle(_style: Partial<ITextStyle>): void {
    void _style
    // WebGL文本渲染需要额外的纹理支持，这里暂时留空
    console.warn('Text rendering not implemented in WebGL adapter')
  }

  setFont(_font: string): void {
    void _font
    // WebGL不直接支持字体设置，需要通过纹理实现
    console.warn('Font setting not implemented in WebGL adapter')
  }

  setTextAlign(_align: CanvasTextAlign): void {
    void _align
    // WebGL不直接支持文本对齐，需要通过纹理实现
    console.warn('Text align not implemented in WebGL adapter')
  }

  setTextBaseline(_baseline: CanvasTextBaseline): void {
    void _baseline
    // WebGL不直接支持文本基线，需要通过纹理实现
    console.warn('Text baseline not implemented in WebGL adapter')
  }

  setLineDash(_segments: number[]): void {
    void _segments
    // WebGL不直接支持虚线，需要通过着色器实现
    console.warn('Line dash not implemented in WebGL adapter')
  }

  setGlobalAlpha(alpha: number): void {
    this.currentStyle.opacity = Math.max(0, Math.min(1, alpha))
  }

  // 路径操作
  beginPath(): void {
    // WebGL中路径操作需要收集顶点数据
  }

  closePath(): void {
    // 闭合路径
  }

  moveTo(_x: number, _y: number): void {
    void _x
    void _y
    // 移动到指定点
  }

  lineTo(_x: number, _y: number): void {
    void _x
    void _y
    // 画线到指定点
  }

  quadraticCurveTo(_cpx: number, _cpy: number, _x: number, _y: number): void {
    void _cpx
    void _cpy
    void _x
    void _y
    // 二次贝塞尔曲线
  }

  bezierCurveTo(
    _cp1x: number,
    _cp1y: number,
    _cp2x: number,
    _cp2y: number,
    _x: number,
    _y: number
  ): void {
    void _cp1x
    void _cp1y
    void _cp2x
    void _cp2y
    void _x
    void _y
    // 三次贝塞尔曲线
  }

  arc(
    _x: number,
    _y: number,
    _radius: number,
    _startAngle: number,
    _endAngle: number,
    _anticlockwise?: boolean
  ): void {
    void _x
    void _y
    void _radius
    void _startAngle
    void _endAngle
    void _anticlockwise
    // 圆弧
  }

  rect(x: number, y: number, width: number, height: number): void {
    if (!this.shaderProgram || !this.vertexBuffer || !this.indexBuffer) return

    const gl = this.gl

    // 矩形顶点数据
    const vertices = new Float32Array([x, y, x + width, y, x + width, y + height, x, y + height])

    const indices = new Uint16Array([0, 1, 2, 0, 2, 3])

    // 绑定顶点缓冲区
    gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexBuffer)
    gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW)

    // 绑定索引缓冲区
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.indexBuffer)
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, indices, gl.STATIC_DRAW)

    this.drawCurrentGeometry()
  }

  private drawCurrentGeometry(): void {
    if (!this.shaderProgram) return

    const gl = this.gl

    this.shaderProgram.use()

    // 设置属性
    const positionLocation = this.shaderProgram.getAttributeLocation('a_position')
    if (positionLocation >= 0) {
      gl.enableVertexAttribArray(positionLocation)
      gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0)
    }

    // 设置uniform
    const transformLocation = this.shaderProgram.getUniformLocation('u_transform')
    if (transformLocation) {
      const transform = new Float32Array([
        this.currentTransform[0],
        this.currentTransform[1],
        0,
        this.currentTransform[2],
        this.currentTransform[3],
        0,
        this.currentTransform[4],
        this.currentTransform[5],
        1,
      ])
      gl.uniformMatrix3fv(transformLocation, false, transform)
    }

    const resolutionLocation = this.shaderProgram.getUniformLocation('u_resolution')
    if (resolutionLocation) {
      gl.uniform2f(resolutionLocation, this.width, this.height)
    }

    const colorLocation = this.shaderProgram.getUniformLocation('u_color')
    if (colorLocation) {
      const color = this.parseColor(this.currentStyle.fillColor || '#000000')
      gl.uniform4f(colorLocation, color.r, color.g, color.b, this.currentStyle.opacity || 1)
    }

    // 绘制
    gl.drawElements(gl.TRIANGLES, 6, gl.UNSIGNED_SHORT, 0)
  }

  private parseColor(color: IColor | string): { r: number; g: number; b: number } {
    if (typeof color === 'string') {
      if (color.startsWith('#')) {
        const hex = color.slice(1)
        const r = parseInt(hex.slice(0, 2), 16) / 255
        const g = parseInt(hex.slice(2, 4), 16) / 255
        const b = parseInt(hex.slice(4, 6), 16) / 255
        return { r, g, b }
      }
      return { r: 0, g: 0, b: 0 }
    }
    return { r: color.r, g: color.g, b: color.b }
  }

  // 填充和描边
  fill(): void {
    // 填充当前路径
  }

  stroke(): void {
    // 描边当前路径
  }

  fillRect(x: number, y: number, width: number, height: number): void {
    this.rect(x, y, width, height)
    this.fill()
  }

  strokeRect(x: number, y: number, width: number, height: number): void {
    this.rect(x, y, width, height)
    this.stroke()
  }

  fillCircle(x: number, y: number, radius: number): void {
    this.arc(x, y, radius, 0, Math.PI * 2)
    this.fill()
  }

  strokeCircle(x: number, y: number, radius: number): void {
    this.arc(x, y, radius, 0, Math.PI * 2)
    this.stroke()
  }

  // 清除操作
  clear(): void {
    const gl = this.gl
    gl.clearColor(0, 0, 0, 0)
    gl.clear(gl.COLOR_BUFFER_BIT)
  }

  clearRect(x: number, y: number, width: number, height: number): void {
    // WebGL中需要使用scissor test来实现局部清除
    const gl = this.gl
    gl.enable(gl.SCISSOR_TEST)
    gl.scissor(x, this.height - y - height, width, height)
    gl.clearColor(0, 0, 0, 0)
    gl.clear(gl.COLOR_BUFFER_BIT)
    gl.disable(gl.SCISSOR_TEST)
  }

  // 文本渲染
  fillText(_text: string, _x: number, _y: number, _style?: ITextStyle): void {
    void _text
    void _x
    void _y
    void _style
    console.warn('Text rendering not implemented in WebGL adapter')
  }

  strokeText(_text: string, _x: number, _y: number, _style?: ITextStyle): void {
    void _text
    void _x
    void _y
    void _style
    console.warn('Text rendering not implemented in WebGL adapter')
  }

  measureText(_text: string, _style?: ITextStyle): { width: number; height: number } {
    void _text
    void _style
    console.warn('Text measurement not implemented in WebGL adapter')
    return { width: 0, height: 0 }
  }

  // 图像渲染
  drawImage(imageData: IImageData, dx: number, dy: number, dw?: number, dh?: number): void {
    void imageData
    void dx
    void dy
    void dw
    void dh
    console.warn('Image rendering not implemented in WebGL adapter')
  }

  // 像素操作
  getImageData(_x: number, _y: number, _width: number, _height: number): IImageData {
    void _x
    void _y
    void _width
    void _height
    console.warn('getImageData not implemented in WebGL adapter')
    return {
      data: new Uint8ClampedArray(0),
      width: 0,
      height: 0,
    }
  }

  putImageData(_imageData: IImageData, _x: number, _y: number): void {
    void _imageData
    void _x
    void _y
    console.warn('putImageData not implemented in WebGL adapter')
  }

  // 裁剪操作
  clip(): void {
    console.warn('Clipping not implemented in WebGL adapter')
  }

  clipRect(_x: number, _y: number, _width: number, _height: number): void {
    void _x
    void _y
    void _width
    void _height
    console.warn('Clipping not implemented in WebGL adapter')
  }

  // 坐标变换
  screenToWorld(point: IPoint): IPoint {
    // 简化实现，实际需要考虑变换矩阵
    return { x: point.x, y: point.y }
  }

  worldToScreen(point: IPoint): IPoint {
    // 简化实现，实际需要考虑变换矩阵
    return { x: point.x, y: point.y }
  }

  // 命令执行
  executeCommand(_command: IRenderCommand): void {
    void _command
    // 执行渲染命令
  }

  // 提交渲染
  present(): void {
    // WebGL 自动提交到屏幕，无需额外操作
    // 此方法仅为满足接口要求
  }

  // 资源清理
  dispose(): void {
    if (this.shaderProgram) {
      this.shaderProgram.dispose()
    }

    const gl = this.gl
    if (this.vertexBuffer) {
      gl.deleteBuffer(this.vertexBuffer)
    }
    if (this.indexBuffer) {
      gl.deleteBuffer(this.indexBuffer)
    }
  }
}

/**
 * WebGL图形上下文工厂
 */
export class WebGLGraphicsContextFactory implements IGraphicsContextFactory<HTMLCanvasElement> {
  async createContext(canvas: HTMLCanvasElement): Promise<IGraphicsContext> {
    const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl')
    if (!gl) {
      throw new Error('WebGL not supported')
    }

    return new WebGLGraphicsContext(gl as WebGLRenderingContext, canvas.width, canvas.height)
  }

  isSupported(): boolean {
    try {
      const canvas = document.createElement('canvas')
      const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl')
      return !!gl
    } catch {
      return false
    }
  }

  getCapabilities(): IGraphicsCapabilities {
    return {
      supportsHardwareAcceleration: true,
      supportsTransforms: true,
      supportsBlending: true,
      supportsFilters: false,
      maxTextureSize: 4096,
      supportedFormats: ['png', 'jpg', 'jpeg', 'webp'],
    }
  }
}
