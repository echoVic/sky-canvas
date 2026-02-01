import { vi } from 'vitest'

class WebGLShader {
  constructor(public type: number) {}
}

class WebGLProgram {}

class WebGLBuffer {}

class WebGLFramebuffer {}

class WebGLRenderbuffer {}

class WebGLTexture {}

class WebGLUniformLocation {}

class WebGLActiveInfo {
  constructor(
    public size: number,
    public type: number,
    public name: string
  ) {}
}

const createWebGLRenderingContext = (): WebGLRenderingContext => {
  const canvas = document.createElement('canvas')

  const shaders = new Map<WebGLShader, { source: string; compiled: boolean }>()
  const programs = new Map<
    WebGLProgram,
    { shaders: WebGLShader[]; linked: boolean; attributes: Map<string, number> }
  >()

  const gl: any = {
    canvas,
    drawingBufferWidth: 300,
    drawingBufferHeight: 150,

    VERTEX_SHADER: 35633,
    FRAGMENT_SHADER: 35632,
    COMPILE_STATUS: 35713,
    LINK_STATUS: 35714,
    COLOR_BUFFER_BIT: 16384,
    DEPTH_BUFFER_BIT: 256,
    STENCIL_BUFFER_BIT: 1024,
    ARRAY_BUFFER: 34962,
    ELEMENT_ARRAY_BUFFER: 34963,
    STATIC_DRAW: 35044,
    DYNAMIC_DRAW: 35048,
    TRIANGLES: 4,
    TRIANGLE_STRIP: 5,
    TRIANGLE_FAN: 6,
    FLOAT: 5126,
    UNSIGNED_BYTE: 5121,
    UNSIGNED_SHORT: 5123,
    TEXTURE_2D: 3553,
    TEXTURE0: 33984,
    RGBA: 6408,
    RGB: 6407,
    ALPHA: 6406,
    LUMINANCE: 6409,
    LUMINANCE_ALPHA: 6410,
    LINEAR: 9729,
    NEAREST: 9728,
    CLAMP_TO_EDGE: 33071,
    REPEAT: 10497,
    TEXTURE_MIN_FILTER: 10241,
    TEXTURE_MAG_FILTER: 10240,
    TEXTURE_WRAP_S: 10242,
    TEXTURE_WRAP_T: 10243,
    BLEND: 3042,
    DEPTH_TEST: 2929,
    CULL_FACE: 2884,
    SCISSOR_TEST: 3089,
    SRC_ALPHA: 770,
    ONE_MINUS_SRC_ALPHA: 771,
    ONE: 1,
    ZERO: 0,
    FRAMEBUFFER: 36160,
    RENDERBUFFER: 36161,
    COLOR_ATTACHMENT0: 36064,
    DEPTH_ATTACHMENT: 36096,
    STENCIL_ATTACHMENT: 36128,

    createShader: vi.fn((type: number) => new WebGLShader(type)),

    shaderSource: vi.fn((shader: WebGLShader, source: string) => {
      shaders.set(shader, { source, compiled: false })
    }),

    compileShader: vi.fn((shader: WebGLShader) => {
      const shaderData = shaders.get(shader)
      if (shaderData) {
        shaderData.compiled = true
      }
    }),

    getShaderParameter: vi.fn((shader: WebGLShader, pname: number) => {
      if (pname === 35713) {
        const shaderData = shaders.get(shader)
        return shaderData?.compiled ?? true
      }
      return true
    }),

    getShaderInfoLog: vi.fn(() => ''),

    createProgram: vi.fn(() => {
      const program = new WebGLProgram()
      programs.set(program, { shaders: [], linked: false, attributes: new Map() })
      return program
    }),

    attachShader: vi.fn((program: WebGLProgram, shader: WebGLShader) => {
      const programData = programs.get(program)
      if (programData) {
        programData.shaders.push(shader)
      }
    }),

    bindAttribLocation: vi.fn((program: WebGLProgram, index: number, name: string) => {
      const programData = programs.get(program)
      if (programData) {
        programData.attributes.set(name, index)
      }
    }),

    linkProgram: vi.fn((program: WebGLProgram) => {
      const programData = programs.get(program)
      if (programData) {
        programData.linked = true
      }
    }),

    getProgramParameter: vi.fn((program: WebGLProgram, pname: number) => {
      if (pname === 35714) {
        const programData = programs.get(program)
        return programData?.linked ?? true
      }
      return true
    }),

    getProgramInfoLog: vi.fn(() => ''),

    useProgram: vi.fn(),

    getAttribLocation: vi.fn((program: WebGLProgram, name: string) => {
      const programData = programs.get(program)
      if (programData?.attributes.has(name)) {
        return programData.attributes.get(name)!
      }
      return 0
    }),

    getUniformLocation: vi.fn(() => new WebGLUniformLocation()),

    enableVertexAttribArray: vi.fn(),
    disableVertexAttribArray: vi.fn(),
    vertexAttribPointer: vi.fn(),

    uniform1f: vi.fn(),
    uniform2f: vi.fn(),
    uniform3f: vi.fn(),
    uniform4f: vi.fn(),
    uniform1i: vi.fn(),
    uniform2i: vi.fn(),
    uniform3i: vi.fn(),
    uniform4i: vi.fn(),
    uniform1fv: vi.fn(),
    uniform2fv: vi.fn(),
    uniform3fv: vi.fn(),
    uniform4fv: vi.fn(),
    uniformMatrix2fv: vi.fn(),
    uniformMatrix3fv: vi.fn(),
    uniformMatrix4fv: vi.fn(),

    createBuffer: vi.fn(() => new WebGLBuffer()),
    bindBuffer: vi.fn(),
    bufferData: vi.fn(),
    bufferSubData: vi.fn(),
    deleteBuffer: vi.fn(),

    createTexture: vi.fn(() => new WebGLTexture()),
    bindTexture: vi.fn(),
    texImage2D: vi.fn(),
    texParameteri: vi.fn(),
    generateMipmap: vi.fn(),
    activeTexture: vi.fn(),
    deleteTexture: vi.fn(),

    createFramebuffer: vi.fn(() => new WebGLFramebuffer()),
    bindFramebuffer: vi.fn(),
    framebufferTexture2D: vi.fn(),
    framebufferRenderbuffer: vi.fn(),
    deleteFramebuffer: vi.fn(),

    createRenderbuffer: vi.fn(() => new WebGLRenderbuffer()),
    bindRenderbuffer: vi.fn(),
    renderbufferStorage: vi.fn(),
    deleteRenderbuffer: vi.fn(),

    viewport: vi.fn(),
    scissor: vi.fn(),

    clear: vi.fn(),
    clearColor: vi.fn(),
    clearDepth: vi.fn(),
    clearStencil: vi.fn(),

    enable: vi.fn(),
    disable: vi.fn(),

    blendFunc: vi.fn(),
    blendFuncSeparate: vi.fn(),
    blendEquation: vi.fn(),

    depthFunc: vi.fn(),
    depthMask: vi.fn(),

    cullFace: vi.fn(),
    frontFace: vi.fn(),

    drawArrays: vi.fn(),
    drawElements: vi.fn(),

    flush: vi.fn(),
    finish: vi.fn(),

    getParameter: vi.fn((pname: number) => {
      if (pname === 3379) return 16384
      if (pname === 34076) return 16
      if (pname === 34024) return 16384
      return null
    }),

    getError: vi.fn(() => 0),

    pixelStorei: vi.fn(),
    readPixels: vi.fn(),

    deleteShader: vi.fn(),
    deleteProgram: vi.fn(),

    getExtension: vi.fn((name: string) => {
      if (name === 'WEBGL_lose_context') {
        return {
          loseContext: vi.fn(),
          restoreContext: vi.fn(),
        }
      }
      return null
    }),

    getSupportedExtensions: vi.fn(() => ['WEBGL_lose_context']),

    isContextLost: vi.fn(() => false),

    getContextAttributes: vi.fn(() => ({
      alpha: true,
      depth: true,
      stencil: false,
      antialias: true,
      premultipliedAlpha: true,
      preserveDrawingBuffer: false,
    })),
  }

  return gl as WebGLRenderingContext
}

if (typeof HTMLCanvasElement !== 'undefined') {
  const originalGetContext = HTMLCanvasElement.prototype.getContext

  HTMLCanvasElement.prototype.getContext = function (contextId: string, options?: any) {
    if (contextId === 'webgl' || contextId === 'experimental-webgl') {
      return createWebGLRenderingContext()
    }
    if (contextId === '2d') {
      return {
        fillStyle: 'black',
        strokeStyle: 'black',
        lineWidth: 1,
        lineCap: 'butt',
        lineJoin: 'miter',
        miterLimit: 10,
        font: '10px sans-serif',
        textAlign: 'start',
        textBaseline: 'alphabetic',
        globalAlpha: 1,
        globalCompositeOperation: 'source-over',
        shadowBlur: 0,
        shadowColor: 'rgba(0, 0, 0, 0)',
        shadowOffsetX: 0,
        shadowOffsetY: 0,

        save: vi.fn(),
        restore: vi.fn(),
        scale: vi.fn(),
        rotate: vi.fn(),
        translate: vi.fn(),
        transform: vi.fn(),
        setTransform: vi.fn(),
        resetTransform: vi.fn(),

        clearRect: vi.fn(),
        fillRect: vi.fn(),
        strokeRect: vi.fn(),

        beginPath: vi.fn(),
        closePath: vi.fn(),
        moveTo: vi.fn(),
        lineTo: vi.fn(),
        bezierCurveTo: vi.fn(),
        quadraticCurveTo: vi.fn(),
        arc: vi.fn(),
        arcTo: vi.fn(),
        ellipse: vi.fn(),
        rect: vi.fn(),

        fill: vi.fn(),
        stroke: vi.fn(),
        clip: vi.fn(),

        fillText: vi.fn(),
        strokeText: vi.fn(),
        measureText: vi.fn(() => ({ width: 100 })),

        drawImage: vi.fn(),

        createImageData: vi.fn((width: number, height: number) => ({
          width,
          height,
          data: new Uint8ClampedArray(width * height * 4),
        })),
        getImageData: vi.fn((x: number, y: number, width: number, height: number) => ({
          width,
          height,
          data: new Uint8ClampedArray(width * height * 4),
        })),
        putImageData: vi.fn(),

        createLinearGradient: vi.fn(() => ({
          addColorStop: vi.fn(),
        })),
        createRadialGradient: vi.fn(() => ({
          addColorStop: vi.fn(),
        })),
        createPattern: vi.fn(() => ({})),

        setLineDash: vi.fn(),
        getLineDash: vi.fn(() => []),
        lineDashOffset: 0,

        // 添加 IGraphicsContext 需要的方法
        clear: vi.fn(),
        present: vi.fn(),
      } as any
    }
    return originalGetContext.call(this, contextId, options)
  }
}

if (typeof global.ImageData === 'undefined') {
  global.ImageData = class ImageData {
    width: number
    height: number
    data: Uint8ClampedArray

    constructor(widthOrData: number | Uint8ClampedArray, height?: number) {
      if (typeof widthOrData === 'number') {
        this.width = widthOrData
        this.height = height!
        this.data = new Uint8ClampedArray(this.width * this.height * 4)
      } else {
        this.data = widthOrData
        this.width = Math.sqrt(widthOrData.length / 4)
        this.height = this.width
      }
    }
  } as any
}

if (!global.performance) {
  global.performance = {
    now: vi.fn(() => Date.now()),
  } as any
}

const navigatorRef = globalThis.navigator ?? ({} as Navigator)
if (!globalThis.navigator) {
  ;(globalThis as any).navigator = navigatorRef
}
if (!(navigatorRef as any).gpu) {
  ;(navigatorRef as any).gpu = {
    getPreferredCanvasFormat: () => 'bgra8unorm',
    requestAdapter: async () => ({
      requestDevice: async () => ({}),
    }),
  }
}

let animationId = 1
const animationCallbacks = new Map<number, FrameRequestCallback>()

global.requestAnimationFrame = vi.fn((callback: FrameRequestCallback) => {
  const id = animationId++
  animationCallbacks.set(id, callback)

  setTimeout(() => {
    const cb = animationCallbacks.get(id)
    if (cb) {
      cb(performance.now())
      animationCallbacks.delete(id)
    }
  }, 16)

  return id
})

global.cancelAnimationFrame = vi.fn((id: number) => {
  animationCallbacks.delete(id)
})
