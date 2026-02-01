import { type Shader, type ShaderSource, ShaderType } from '../core/RenderTypes'

// 着色器编译结果
export interface ShaderCompileResult {
  success: boolean
  shader?: globalThis.WebGLShader
  error?: string
  warnings?: string[]
}

// 着色器程序
export interface ShaderProgram {
  id: string
  vertexShader: Shader
  fragmentShader: Shader
  program?: WebGLProgram
  uniforms: Map<string, WebGLUniformLocation>
  attributes: Map<string, number>
}

// 着色器管理器接口
export interface IShaderManager {
  loadShader(id: string, source: ShaderSource): Promise<boolean>
  getShader(id: string): ShaderProgram | undefined
  compileShader(type: ShaderType, source: string): Promise<ShaderCompileResult>
  linkProgram(vertexShader: Shader, fragmentShader: Shader): Promise<ShaderProgram | null>
  useProgram(id: string): boolean
  setUniforms(uniforms: Record<string, number | number[] | Float32Array>): void
  dispose(): void
}

// WebGL着色器实现
export class WebGLShader implements Shader {
  id: string
  type: ShaderType
  source: string
  compiled: boolean = false
  size: number = 0
  usage: number = 0

  private gl: WebGLRenderingContext
  private glShader: globalThis.WebGLShader | null = null

  constructor(gl: WebGLRenderingContext, id: string, type: ShaderType, source: string) {
    this.gl = gl
    this.id = id
    this.type = type
    this.source = source
    this.size = source.length
  }

  async compile(): Promise<boolean> {
    const glType = this.type === ShaderType.VERTEX ? this.gl.VERTEX_SHADER : this.gl.FRAGMENT_SHADER

    this.glShader = this.gl.createShader(glType)
    if (!this.glShader) return false

    this.gl.shaderSource(this.glShader, this.source)
    this.gl.compileShader(this.glShader)

    this.compiled = this.gl.getShaderParameter(this.glShader, this.gl.COMPILE_STATUS)

    if (!this.compiled) {
      const error = this.gl.getShaderInfoLog(this.glShader)
      console.error(`Shader compilation failed: ${error}`)
      this.gl.deleteShader(this.glShader)
      this.glShader = null
    }

    return this.compiled
  }

  getShader(): globalThis.WebGLShader | null {
    return this.glShader
  }

  dispose(): void {
    if (this.glShader) {
      this.gl.deleteShader(this.glShader)
      this.glShader = null
    }
    this.compiled = false
  }
}

// WebGL着色器管理器
export class WebGLShaderManager implements IShaderManager {
  private gl: WebGLRenderingContext
  private shaders = new Map<string, ShaderProgram>()
  private currentProgram: string | null = null

  constructor(gl: WebGLRenderingContext) {
    this.gl = gl
  }

  async loadShader(id: string, source: ShaderSource): Promise<boolean> {
    try {
      // 编译顶点着色器
      const vertexShader = new WebGLShader(
        this.gl,
        `${id}_vertex`,
        ShaderType.VERTEX,
        source.vertex
      )
      if (!(await vertexShader.compile())) {
        return false
      }

      // 编译片段着色器
      const fragmentShader = new WebGLShader(
        this.gl,
        `${id}_fragment`,
        ShaderType.FRAGMENT,
        source.fragment
      )
      if (!(await fragmentShader.compile())) {
        vertexShader.dispose()
        return false
      }

      // 链接程序
      const program = await this.linkProgram(vertexShader, fragmentShader)
      if (!program) {
        vertexShader.dispose()
        fragmentShader.dispose()
        return false
      }

      this.shaders.set(id, program)
      return true
    } catch (error) {
      console.error(`Failed to load shader ${id}:`, error)
      return false
    }
  }

  getShader(id: string): ShaderProgram | undefined {
    return this.shaders.get(id)
  }

  async compileShader(type: ShaderType, source: string): Promise<ShaderCompileResult> {
    const shader = new WebGLShader(this.gl, 'temp', type, source)
    const success = await shader.compile()

    if (success) {
      return { success: true, shader: shader.getShader()! }
    } else {
      return {
        success: false,
        error: this.gl.getShaderInfoLog(shader.getShader()!) || 'Unknown error',
      }
    }
  }

  async linkProgram(vertexShader: Shader, fragmentShader: Shader): Promise<ShaderProgram | null> {
    const program = this.gl.createProgram()
    if (!program) return null

    const vs = (vertexShader as WebGLShader).getShader()
    const fs = (fragmentShader as WebGLShader).getShader()

    if (!vs || !fs) return null

    this.gl.attachShader(program, vs)
    this.gl.attachShader(program, fs)
    this.gl.linkProgram(program)

    const success = this.gl.getProgramParameter(program, this.gl.LINK_STATUS)
    if (!success) {
      const error = this.gl.getProgramInfoLog(program)
      console.error(`Program linking failed: ${error}`)
      this.gl.deleteProgram(program)
      return null
    }

    // 获取uniform和attribute位置
    const uniforms = new Map<string, WebGLUniformLocation>()
    const attributes = new Map<string, number>()

    const numUniforms = this.gl.getProgramParameter(program, this.gl.ACTIVE_UNIFORMS)
    for (let i = 0; i < numUniforms; i++) {
      const info = this.gl.getActiveUniform(program, i)
      if (info) {
        const location = this.gl.getUniformLocation(program, info.name)
        if (location) {
          uniforms.set(info.name, location)
        }
      }
    }

    const numAttributes = this.gl.getProgramParameter(program, this.gl.ACTIVE_ATTRIBUTES)
    for (let i = 0; i < numAttributes; i++) {
      const info = this.gl.getActiveAttrib(program, i)
      if (info) {
        const location = this.gl.getAttribLocation(program, info.name)
        attributes.set(info.name, location)
      }
    }

    return {
      id: `${vertexShader.id}_${fragmentShader.id}`,
      vertexShader,
      fragmentShader,
      program,
      uniforms,
      attributes,
    }
  }

  useProgram(id: string): boolean {
    const shaderProgram = this.shaders.get(id)
    if (!shaderProgram || !shaderProgram.program) return false

    if (this.currentProgram !== id) {
      this.gl.useProgram(shaderProgram.program)
      this.currentProgram = id
    }
    return true
  }

  setUniform(name: string, value: number | number[] | Float32Array): void {
    if (!this.currentProgram) return

    const program = this.shaders.get(this.currentProgram)
    if (!program) return

    const location = program.uniforms.get(name)
    if (!location) return

    // 根据值类型设置uniform
    if (typeof value === 'number') {
      this.gl.uniform1f(location, value)
    } else if (Array.isArray(value)) {
      switch (value.length) {
        case 2:
          this.gl.uniform2fv(location, value)
          break
        case 3:
          this.gl.uniform3fv(location, value)
          break
        case 4:
          this.gl.uniform4fv(location, value)
          break
        case 9:
          this.gl.uniformMatrix3fv(location, false, value)
          break
        case 16:
          this.gl.uniformMatrix4fv(location, false, value)
          break
      }
    }
  }

  setUniforms(uniforms: Record<string, number | number[] | Float32Array>): void {
    for (const [name, value] of Object.entries(uniforms)) {
      this.setUniform(name, value)
    }
  }

  dispose(): void {
    for (const [id, program] of this.shaders) {
      if (program.program) {
        this.gl.deleteProgram(program.program)
      }
      program.vertexShader.dispose()
      program.fragmentShader.dispose()
    }
    this.shaders.clear()
    this.currentProgram = null
  }
}

// 默认着色器源码
export const DefaultShaders = {
  basic: {
    vertex: `
      attribute vec2 a_position;
      attribute vec4 a_color;
      
      uniform mat3 u_transform;
      uniform mat3 u_projection;
      
      varying vec4 v_color;
      
      void main() {
        vec3 position = u_projection * u_transform * vec3(a_position, 1.0);
        gl_Position = vec4(position.xy, 0.0, 1.0);
        v_color = a_color;
      }
    `,
    fragment: `
      precision mediump float;
      
      varying vec4 v_color;
      
      void main() {
        gl_FragColor = v_color;
      }
    `,
  },

  textured: {
    vertex: `
      attribute vec2 a_position;
      attribute vec2 a_texCoord;
      attribute vec4 a_color;
      
      uniform mat3 u_transform;
      uniform mat3 u_projection;
      
      varying vec2 v_texCoord;
      varying vec4 v_color;
      
      void main() {
        vec3 position = u_projection * u_transform * vec3(a_position, 1.0);
        gl_Position = vec4(position.xy, 0.0, 1.0);
        v_texCoord = a_texCoord;
        v_color = a_color;
      }
    `,
    fragment: `
      precision mediump float;
      
      uniform sampler2D u_texture;
      
      varying vec2 v_texCoord;
      varying vec4 v_color;
      
      void main() {
        vec4 texColor = texture2D(u_texture, v_texCoord);
        gl_FragColor = texColor * v_color;
      }
    `,
  },

  // 新增：渐变着色器
  gradient: {
    vertex: `
      attribute vec2 a_position;
      attribute vec4 a_color;
      attribute vec2 a_texCoord;
      
      uniform mat3 u_transform;
      uniform mat3 u_projection;
      
      varying vec4 v_color;
      varying vec2 v_texCoord;
      
      void main() {
        vec3 position = u_projection * u_transform * vec3(a_position, 1.0);
        gl_Position = vec4(position.xy, 0.0, 1.0);
        v_color = a_color;
        v_texCoord = a_texCoord;
      }
    `,
    fragment: `
      precision mediump float;
      
      uniform vec4 u_gradientStart;
      uniform vec4 u_gradientEnd;
      uniform vec2 u_gradientDirection;
      
      varying vec4 v_color;
      varying vec2 v_texCoord;
      
      void main() {
        float t = dot(v_texCoord, u_gradientDirection);
        t = clamp(t, 0.0, 1.0);
        vec4 gradientColor = mix(u_gradientStart, u_gradientEnd, t);
        gl_FragColor = gradientColor * v_color;
      }
    `,
  },

  // 新增：发光效果着色器
  glow: {
    vertex: `
      attribute vec2 a_position;
      attribute vec4 a_color;
      attribute vec2 a_texCoord;
      
      uniform mat3 u_transform;
      uniform mat3 u_projection;
      
      varying vec4 v_color;
      varying vec2 v_texCoord;
      
      void main() {
        vec3 position = u_projection * u_transform * vec3(a_position, 1.0);
        gl_Position = vec4(position.xy, 0.0, 1.0);
        v_color = a_color;
        v_texCoord = a_texCoord;
      }
    `,
    fragment: `
      precision mediump float;
      
      uniform float u_glowIntensity;
      uniform vec4 u_glowColor;
      uniform float u_time;
      
      varying vec4 v_color;
      varying vec2 v_texCoord;
      
      void main() {
        vec2 center = vec2(0.5, 0.5);
        float dist = distance(v_texCoord, center);
        float glow = 1.0 - smoothstep(0.0, 0.7, dist);
        
        // 添加时间动画
        float pulse = sin(u_time * 3.0) * 0.5 + 0.5;
        glow *= u_glowIntensity * (0.5 + pulse * 0.5);
        
        vec4 glowEffect = u_glowColor * glow;
        gl_FragColor = mix(v_color, glowEffect, glow);
      }
    `,
  },

  // 新增：粒子系统着色器
  particle: {
    vertex: `
      attribute vec2 a_position;
      attribute vec4 a_color;
      attribute float a_size;
      
      uniform mat3 u_transform;
      uniform mat3 u_projection;
      uniform float u_time;
      
      varying vec4 v_color;
      varying float v_life;
      
      void main() {
        vec3 position = u_projection * u_transform * vec3(a_position, 1.0);
        gl_Position = vec4(position.xy, 0.0, 1.0);
        gl_PointSize = a_size;
        
        v_color = a_color;
        v_life = a_color.a; // 使用alpha通道存储生命值
      }
    `,
    fragment: `
      precision mediump float;
      
      uniform float u_time;
      
      varying vec4 v_color;
      varying float v_life;
      
      void main() {
        vec2 center = gl_PointCoord - vec2(0.5);
        float dist = length(center);
        
        if (dist > 0.5) discard;
        
        float alpha = (1.0 - dist * 2.0) * v_life;
        gl_FragColor = vec4(v_color.rgb, alpha);
      }
    `,
  },
}
