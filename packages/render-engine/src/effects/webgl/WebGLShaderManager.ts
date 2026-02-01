/**
 * WebGL着色器管理器
 * 提供着色器编译、链接和uniform管理功能
 */

export interface ShaderProgram {
  program: WebGLProgram
  vertexShader: WebGLShader
  fragmentShader: WebGLShader
  uniforms: Record<string, WebGLUniformLocation | null>
  attributes: Record<string, number>
}

export interface ShaderUniforms {
  [key: string]: number | number[] | Float32Array | WebGLTexture
}

export class WebGLShaderManager {
  private gl: WebGLRenderingContext
  private programs = new Map<string, ShaderProgram>()
  private currentProgram: ShaderProgram | null = null

  // 标准顶点着色器 - 用于2D图像处理
  static readonly DEFAULT_VERTEX_SHADER = `
    attribute vec2 a_position;
    attribute vec2 a_texCoord;
    
    varying vec2 v_texCoord;
    
    void main() {
      gl_Position = vec4(a_position, 0.0, 1.0);
      v_texCoord = a_texCoord;
    }
  `

  // 基础片段着色器模板
  static readonly FRAGMENT_SHADER_TEMPLATE = `
    precision mediump float;
    
    uniform sampler2D u_image;
    uniform vec2 u_resolution;
    uniform float u_time;
    
    varying vec2 v_texCoord;
    
    // 用户自定义函数将插入到这里
    {{USER_FUNCTION}}
    
    void main() {
      gl_FragColor = applyEffect(texture2D(u_image, v_texCoord), v_texCoord);
    }
  `

  constructor(gl: WebGLRenderingContext) {
    this.gl = gl
  }

  /**
   * 创建着色器程序
   */
  createProgram(
    id: string,
    vertexShaderSource: string,
    fragmentShaderSource: string
  ): ShaderProgram | null {
    const gl = this.gl

    // 编译顶点着色器
    const vertexShader = this.compileShader(gl.VERTEX_SHADER, vertexShaderSource)
    if (!vertexShader) {
      console.error('Failed to compile vertex shader')
      return null
    }

    // 编译片段着色器
    const fragmentShader = this.compileShader(gl.FRAGMENT_SHADER, fragmentShaderSource)
    if (!fragmentShader) {
      console.error('Failed to compile fragment shader')
      gl.deleteShader(vertexShader)
      return null
    }

    // 创建程序
    const program = gl.createProgram()
    if (!program) {
      console.error('Failed to create shader program')
      gl.deleteShader(vertexShader)
      gl.deleteShader(fragmentShader)
      return null
    }

    // 链接着色器
    gl.attachShader(program, vertexShader)
    gl.attachShader(program, fragmentShader)
    gl.linkProgram(program)

    // 检查链接状态
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      const error = gl.getProgramInfoLog(program)
      console.error('Shader program linking failed:', error)
      gl.deleteProgram(program)
      gl.deleteShader(vertexShader)
      gl.deleteShader(fragmentShader)
      return null
    }

    // 获取uniform和attribute位置
    const uniforms = this.getUniformLocations(program)
    const attributes = this.getAttributeLocations(program)

    const shaderProgram: ShaderProgram = {
      program,
      vertexShader,
      fragmentShader,
      uniforms,
      attributes,
    }

    this.programs.set(id, shaderProgram)
    return shaderProgram
  }

  /**
   * 编译着色器
   */
  private compileShader(type: number, source: string): WebGLShader | null {
    const gl = this.gl
    const shader = gl.createShader(type)

    if (!shader) {
      console.error('Failed to create shader')
      return null
    }

    gl.shaderSource(shader, source)
    gl.compileShader(shader)

    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      const error = gl.getShaderInfoLog(shader)
      console.error('Shader compilation failed:', error)
      console.error('Shader source:', source)
      gl.deleteShader(shader)
      return null
    }

    return shader
  }

  /**
   * 获取所有uniform位置
   */
  private getUniformLocations(program: WebGLProgram): Record<string, WebGLUniformLocation | null> {
    const gl = this.gl
    const uniforms: Record<string, WebGLUniformLocation | null> = {}

    const numUniforms = gl.getProgramParameter(program, gl.ACTIVE_UNIFORMS)

    for (let i = 0; i < numUniforms; i++) {
      const uniformInfo = gl.getActiveUniform(program, i)
      if (uniformInfo) {
        const location = gl.getUniformLocation(program, uniformInfo.name)
        uniforms[uniformInfo.name] = location
      }
    }

    return uniforms
  }

  /**
   * 获取所有attribute位置
   */
  private getAttributeLocations(program: WebGLProgram): Record<string, number> {
    const gl = this.gl
    const attributes: Record<string, number> = {}

    const numAttributes = gl.getProgramParameter(program, gl.ACTIVE_ATTRIBUTES)

    for (let i = 0; i < numAttributes; i++) {
      const attributeInfo = gl.getActiveAttrib(program, i)
      if (attributeInfo) {
        const location = gl.getAttribLocation(program, attributeInfo.name)
        attributes[attributeInfo.name] = location
      }
    }

    return attributes
  }

  /**
   * 使用着色器程序
   */
  useProgram(id: string): ShaderProgram | null {
    const program = this.programs.get(id)
    if (!program) {
      console.error(`Shader program '${id}' not found`)
      return null
    }

    this.gl.useProgram(program.program)
    this.currentProgram = program
    return program
  }

  /**
   * 设置uniform值
   */
  setUniforms(uniforms: ShaderUniforms): void {
    if (!this.currentProgram) {
      console.error('No shader program is currently active')
      return
    }

    const gl = this.gl
    const program = this.currentProgram

    for (const [name, value] of Object.entries(uniforms)) {
      const location = program.uniforms[name]
      if (location === null || location === undefined) {
        console.warn(`Uniform '${name}' not found in shader`)
        continue
      }

      this.setUniformValue(location, value)
    }
  }

  /**
   * 设置单个uniform值
   */
  private setUniformValue(location: WebGLUniformLocation, value: any): void {
    const gl = this.gl

    if (typeof value === 'number') {
      gl.uniform1f(location, value)
    } else if (Array.isArray(value)) {
      switch (value.length) {
        case 2:
          gl.uniform2fv(location, new Float32Array(value))
          break
        case 3:
          gl.uniform3fv(location, new Float32Array(value))
          break
        case 4:
          gl.uniform4fv(location, new Float32Array(value))
          break
        case 9:
          gl.uniformMatrix3fv(location, false, new Float32Array(value))
          break
        case 16:
          gl.uniformMatrix4fv(location, false, new Float32Array(value))
          break
        default:
          gl.uniform1fv(location, new Float32Array(value))
          break
      }
    } else if (value instanceof Float32Array) {
      if (value.length === 9) {
        gl.uniformMatrix3fv(location, false, value)
      } else if (value.length === 16) {
        gl.uniformMatrix4fv(location, false, value)
      } else {
        gl.uniform1fv(location, value)
      }
    } else if (value && typeof value === 'object' && 'bind' in value) {
      // WebGL纹理
      gl.uniform1i(location, 0)
    }
  }

  /**
   * 删除着色器程序
   */
  deleteProgram(id: string): void {
    const program = this.programs.get(id)
    if (!program) return

    const gl = this.gl
    gl.deleteProgram(program.program)
    gl.deleteShader(program.vertexShader)
    gl.deleteShader(program.fragmentShader)

    this.programs.delete(id)

    if (this.currentProgram === program) {
      this.currentProgram = null
    }
  }

  /**
   * 获取当前程序
   */
  getCurrentProgram(): ShaderProgram | null {
    return this.currentProgram
  }

  /**
   * 清理所有资源
   */
  dispose(): void {
    for (const id of this.programs.keys()) {
      this.deleteProgram(id)
    }
    this.programs.clear()
    this.currentProgram = null
  }

  /**
   * 验证着色器代码
   */
  static validateShaderCode(type: 'vertex' | 'fragment', source: string): string[] {
    const errors: string[] = []

    if (!source.trim()) {
      errors.push('Shader source is empty')
      return errors
    }

    // 移除注释和空行进行检查
    const cleanSource = source
      .replace(/\/\*[\s\S]*?\*\//g, '') // 移除块注释
      .replace(/\/\/.*$/gm, '') // 移除行注释
      .replace(/\s+/g, ' ') // 压缩空白
      .trim()

    // 基础语法检查
    if (type === 'vertex') {
      if (!cleanSource.includes('gl_Position')) {
        errors.push('Vertex shader must set gl_Position')
      }
    } else if (type === 'fragment') {
      if (!cleanSource.includes('gl_FragColor')) {
        errors.push('Fragment shader must set gl_FragColor')
      }
    }

    // 检查void main()函数
    if (!cleanSource.includes('void main()')) {
      errors.push('Shader must contain a main() function')
    }

    // 检查基本语法错误
    const lines = source.split('\n')
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim()
      if (line && !line.endsWith(';') && !line.endsWith('{') && !line.endsWith('}')) {
        // 简单检查是否缺少分号
        if (
          !line.startsWith('#') &&
          !line.startsWith('//') &&
          !line.includes('void main()') &&
          !line.includes('attribute') &&
          !line.includes('uniform') &&
          !line.includes('varying') &&
          !line.includes('precision') &&
          line.length > 3
        ) {
          errors.push(`Line ${i + 1}: Possible missing semicolon`)
        }
      }
    }

    // 检查基本的GLSL语法
    if (cleanSource.includes('=') && !cleanSource.includes(';')) {
      const assignmentLines = source
        .split('\n')
        .filter(
          (line) =>
            line.includes('=') &&
            !line.trim().endsWith(';') &&
            !line.includes('//') &&
            !line.includes('for') &&
            !line.includes('if')
        )

      if (assignmentLines.length > 0) {
        errors.push('Assignment statements should end with semicolon')
      }
    }

    return errors
  }

  /**
   * 创建用户友好的片段着色器
   */
  static createUserFragmentShader(userFunction: string): string {
    return WebGLShaderManager.FRAGMENT_SHADER_TEMPLATE.replace('{{USER_FUNCTION}}', userFunction)
  }
}
