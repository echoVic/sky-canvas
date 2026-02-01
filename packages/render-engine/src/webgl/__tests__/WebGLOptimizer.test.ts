/**
 * WebGL优化系统测试
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { BufferManager, BufferType, BufferUsage } from '../BufferManager'
import { type IShaderSource, ShaderManager } from '../ShaderManager'
import {
  BufferPool,
  createGlobalWebGLOptimizer,
  RenderBatchOptimizer,
  ShaderCache,
  WebGLOptimizer,
  WebGLStateManager,
} from '../WebGLOptimizer'

// Mock WebGL context
const createMockWebGLContext = () => {
  const canvas = document.createElement('canvas')
  const mockGL = {
    // WebGL constants
    VERTEX_SHADER: 0x8b31,
    FRAGMENT_SHADER: 0x8b30,
    ARRAY_BUFFER: 0x8892,
    ELEMENT_ARRAY_BUFFER: 0x8893,
    STATIC_DRAW: 0x88e4,
    DYNAMIC_DRAW: 0x88e8,
    TEXTURE_2D: 0x0de1,
    TEXTURE0: 0x84c0,
    BLEND: 0x0be2,
    DEPTH_TEST: 0x0b71,
    RGBA: 0x1908,
    UNSIGNED_BYTE: 0x1401,
    LINEAR: 0x2601,
    CLAMP_TO_EDGE: 0x812f,

    // Mock methods
    createShader: vi.fn(() => ({ id: 'mock_shader' })),
    createProgram: vi.fn(() => ({ id: 'mock_program' })),
    createBuffer: vi.fn(() => ({ id: 'mock_buffer' })),
    createTexture: vi.fn(() => ({ id: 'mock_texture' })),
    shaderSource: vi.fn(),
    compileShader: vi.fn(),
    attachShader: vi.fn(),
    linkProgram: vi.fn(),
    useProgram: vi.fn(),
    bindBuffer: vi.fn(),
    bindTexture: vi.fn(),
    bindAttribLocation: vi.fn(),
    viewport: vi.fn(),
    enable: vi.fn(),
    disable: vi.fn(),
    activeTexture: vi.fn(),
    deleteShader: vi.fn(),
    deleteProgram: vi.fn(),
    deleteBuffer: vi.fn(),
    deleteTexture: vi.fn(),
    getShaderParameter: vi.fn(() => true),
    getProgramParameter: vi.fn(() => true),
    getShaderInfoLog: vi.fn(() => ''),
    getProgramInfoLog: vi.fn(() => ''),
    getActiveAttrib: vi.fn(() => ({ name: 'position', size: 3, type: 0x1406 })),
    getActiveUniform: vi.fn(() => ({ name: 'uMatrix', size: 1, type: 0x8b5c })),
    getAttribLocation: vi.fn(() => 0),
    getUniformLocation: vi.fn(() => ({ id: 'mock_location' })),
    uniform1f: vi.fn(),
    uniform2fv: vi.fn(),
    uniform3fv: vi.fn(),
    uniform4fv: vi.fn(),
    uniformMatrix4fv: vi.fn(),
    getExtension: vi.fn(() => null), // Mock VAO extension
    canvas,
  }

  return mockGL as unknown as WebGLRenderingContext
}

// Mock shader source
const mockShaderSource: IShaderSource = {
  name: 'testShader',
  version: '1.0',
  vertex: `
    attribute vec2 position;
    uniform mat4 uMatrix;
    void main() {
      gl_Position = uMatrix * vec4(position, 0.0, 1.0);
    }
  `,
  fragment: `
    precision mediump float;
    uniform vec4 uColor;
    void main() {
      gl_FragColor = uColor;
    }
  `,
}

describe('ShaderCache', () => {
  let cache: ShaderCache
  let gl: WebGLRenderingContext
  let shaderManager: ShaderManager

  beforeEach(() => {
    gl = createMockWebGLContext()
    shaderManager = new ShaderManager(gl)
    cache = new ShaderCache()
  })

  it('应该能够缓存着色器程序', () => {
    const program1 = cache.getProgram('test', mockShaderSource, shaderManager)
    const program2 = cache.getProgram('test', mockShaderSource, shaderManager)

    expect(program1).toBe(program2) // 应该返回缓存的程序
  })

  it('应该能够预热着色器', () => {
    cache.warmupShader('warmup_test', mockShaderSource, shaderManager)

    const stats = cache.getStats()
    expect(stats.compiling).toBeGreaterThan(0)
  })

  it('应该能够清理无效着色器', () => {
    cache.getProgram('test', mockShaderSource, shaderManager)

    expect(cache.getStats().cached).toBe(1)

    cache.cleanup()

    // 如果着色器有效，应该保持不变
    expect(cache.getStats().cached).toBe(1)
  })
})

describe('BufferPool', () => {
  let pool: BufferPool
  let gl: WebGLRenderingContext
  let bufferManager: BufferManager

  beforeEach(() => {
    gl = createMockWebGLContext()
    bufferManager = new BufferManager(gl)
    pool = new BufferPool(bufferManager)
  })

  it('应该能够从池中获取缓冲区', () => {
    const buffer = pool.acquireBuffer(BufferType.VERTEX, 1024)

    expect(buffer).toBeDefined()
    expect(buffer.type).toBe(BufferType.VERTEX)
  })

  it('应该能够复用释放的缓冲区', () => {
    const buffer1 = pool.acquireBuffer(BufferType.VERTEX, 0) // size 为 0 以匹配新缓冲区的初始大小
    const buffer1Id = buffer1.id
    pool.releaseBuffer(buffer1)

    const buffer2 = pool.acquireBuffer(BufferType.VERTEX, 0) // size 为 0

    // 应该复用同一个缓冲区（检查对象引用）
    expect(buffer2).toBe(buffer1)
  })

  it('应该能够获取池统计信息', () => {
    pool.acquireBuffer(BufferType.VERTEX, 1024)
    pool.acquireBuffer(BufferType.INDEX, 512)

    const stats = pool.getStats()
    expect(stats.totalBuffers).toBe(2)
    expect(stats.inUseBuffers).toBe(2)
  })

  it('应该能够清理池', () => {
    pool.acquireBuffer(BufferType.VERTEX, 1024)

    expect(() => pool.cleanup()).not.toThrow()
  })
})

describe('WebGLStateManager', () => {
  let stateManager: WebGLStateManager
  let gl: WebGLRenderingContext

  beforeEach(() => {
    gl = createMockWebGLContext()
    stateManager = new WebGLStateManager(gl)
  })

  it('应该能够跟踪着色器程序状态', () => {
    const program = { id: 'test_program' } as WebGLProgram

    stateManager.useProgram(program)
    stateManager.useProgram(program) // 第二次调用应该被跳过

    expect(gl.useProgram).toHaveBeenCalledTimes(1)
  })

  it('应该能够跟踪缓冲区绑定状态', () => {
    const buffer = { id: 'test_buffer' } as WebGLBuffer

    stateManager.bindBuffer(gl.ARRAY_BUFFER, buffer)
    stateManager.bindBuffer(gl.ARRAY_BUFFER, buffer) // 第二次调用应该被跳过

    expect(gl.bindBuffer).toHaveBeenCalledTimes(1)
  })

  it('应该能够跟踪视口状态', () => {
    stateManager.setViewport(0, 0, 800, 600)
    stateManager.setViewport(0, 0, 800, 600) // 第二次调用应该被跳过

    expect(gl.viewport).toHaveBeenCalledTimes(1)
  })

  it('应该能够跟踪混合状态', () => {
    stateManager.setBlendEnabled(true)
    stateManager.setBlendEnabled(true) // 第二次调用应该被跳过

    expect(gl.enable).toHaveBeenCalledTimes(1)
    expect(gl.enable).toHaveBeenCalledWith(gl.BLEND)
  })

  it('应该能够统计状态更改次数', () => {
    const program = { id: 'test_program' } as WebGLProgram

    stateManager.useProgram(program)
    stateManager.setBlendEnabled(true)

    const changeCount = stateManager.resetStateChangeCount()
    expect(changeCount).toBe(2)

    const secondCount = stateManager.resetStateChangeCount()
    expect(secondCount).toBe(0)
  })
})

describe('RenderBatchOptimizer', () => {
  let optimizer: RenderBatchOptimizer

  beforeEach(() => {
    optimizer = new RenderBatchOptimizer()
  })

  it('应该能够添加渲染批次', () => {
    const mockBatch = {
      id: 'batch1',
      shader: {} as any,
      vertexArray: {} as any,
      textureBindings: new Map(),
      uniforms: new Map(),
      drawCalls: [],
      sortKey: 'shader1_texture1_vao1',
    }

    optimizer.addBatch(mockBatch)

    const stats = optimizer.getStats()
    expect(stats.totalBatches).toBe(1)
  })

  it('应该能够按排序键优化批次', () => {
    const batch1 = {
      id: 'batch1',
      shader: {} as any,
      vertexArray: {} as any,
      textureBindings: new Map(),
      uniforms: new Map(),
      drawCalls: [],
      sortKey: 'shader2_texture1_vao1',
    }

    const batch2 = {
      id: 'batch2',
      shader: {} as any,
      vertexArray: {} as any,
      textureBindings: new Map(),
      uniforms: new Map(),
      drawCalls: [],
      sortKey: 'shader1_texture1_vao1',
    }

    optimizer.addBatch(batch1)
    optimizer.addBatch(batch2)

    const optimized = optimizer.optimizeBatches()
    expect(optimized[0].sortKey).toBe('shader1_texture1_vao1')
    expect(optimized[1].sortKey).toBe('shader2_texture1_vao1')
  })

  it('应该能够清空批次', () => {
    const mockBatch = {
      id: 'batch1',
      shader: {} as any,
      vertexArray: {} as any,
      textureBindings: new Map(),
      uniforms: new Map(),
      drawCalls: [],
      sortKey: 'test',
    }

    optimizer.addBatch(mockBatch)
    optimizer.clear()

    const stats = optimizer.getStats()
    expect(stats.totalBatches).toBe(0)
  })
})

describe('WebGLOptimizer', () => {
  let optimizer: WebGLOptimizer
  let gl: WebGLRenderingContext
  let shaderManager: ShaderManager
  let bufferManager: BufferManager

  beforeEach(() => {
    gl = createMockWebGLContext()
    shaderManager = new ShaderManager(gl)
    bufferManager = new BufferManager(gl)

    optimizer = new WebGLOptimizer(gl, shaderManager, bufferManager, {
      enableStateTracking: true,
      enableBatchOptimization: true,
      enableShaderWarmup: false, // 禁用异步操作以便测试
    })
  })

  afterEach(() => {
    optimizer.dispose()
  })

  it('应该能够创建优化器', () => {
    expect(optimizer).toBeInstanceOf(WebGLOptimizer)
  })

  it('应该能够开始和结束帧', () => {
    expect(() => {
      optimizer.beginFrame()
      optimizer.endFrame()
    }).not.toThrow()
  })

  it('应该能够获取优化的着色器', () => {
    const shader = optimizer.getOptimizedShader(mockShaderSource, shaderManager)
    expect(shader).toBeDefined()
    expect(shader.isValid).toBe(true)
  })

  it('应该能够获取优化的缓冲区', () => {
    const buffer = optimizer.getOptimizedBuffer(BufferType.VERTEX, 1024)
    expect(buffer).toBeDefined()
    expect(buffer.type).toBe(BufferType.VERTEX)
  })

  it('应该能够释放缓冲区', () => {
    const buffer = optimizer.getOptimizedBuffer(BufferType.VERTEX, 1024)
    expect(() => {
      optimizer.releaseBuffer(buffer)
    }).not.toThrow()
  })

  it('应该能够优化状态切换', () => {
    const program = { id: 'test_program' } as WebGLProgram

    optimizer.optimizedUseProgram(program)
    optimizer.optimizedUseProgram(program) // 第二次调用应该被状态管理器跳过

    // 状态跟踪启用时，重复调用应该被跳过
    expect(gl.useProgram).toHaveBeenCalledTimes(1)
  })

  it('应该能够跟踪性能统计', () => {
    optimizer.beginFrame()

    const program = { id: 'test_program' } as WebGLProgram
    optimizer.optimizedUseProgram(program)

    optimizer.endFrame()

    const stats = optimizer.getStats()
    expect(stats.stateChanges.shaderSwitches).toBeGreaterThan(0)
  })

  it('应该能够发出性能警告事件', () => {
    let warningReceived = false

    optimizer.on('performanceWarning', (warning) => {
      warningReceived = true
      expect(warning.metric).toBeDefined()
      expect(warning.value).toBeDefined()
      expect(warning.threshold).toBeDefined()
    })

    // 模拟长帧时间
    const originalNow = performance.now
    let callCount = 0
    performance.now = vi.fn(() => {
      callCount++
      if (callCount === 1) return 0 // beginFrame
      return 20 // 超过16.67ms阈值
    })

    optimizer.beginFrame()
    optimizer.endFrame()

    performance.now = originalNow

    expect(warningReceived).toBe(true)
  })

  it('应该能够发出着色器编译事件', () => {
    let compileEventReceived = false

    optimizer.on('shaderCompiled', (event) => {
      compileEventReceived = true
      expect(event.name).toBe('testShader')
      expect(typeof event.compileTime).toBe('number')
    })

    optimizer.getOptimizedShader(mockShaderSource, shaderManager)

    expect(compileEventReceived).toBe(true)
  })

  it('应该能够更新配置', () => {
    optimizer.updateConfig({
      enableStateTracking: false,
      maxTextureBindsPerFrame: 32,
    })

    // 配置更新后状态跟踪应该被禁用
    const program = { id: 'test_program' } as WebGLProgram

    optimizer.optimizedUseProgram(program)
    optimizer.optimizedUseProgram(program)

    // 禁用状态跟踪后，每次都应该调用WebGL
    expect(gl.useProgram).toHaveBeenCalledTimes(2)
  })

  it('应该能够获取详细统计信息', () => {
    const detailedStats = optimizer.getDetailedStats()

    expect(detailedStats.optimization).toBeDefined()
    expect(detailedStats.shaderCache).toBeDefined()
    expect(detailedStats.bufferPool).toBeDefined()
    expect(detailedStats.batchOptimizer).toBeDefined()
  })

  it('应该能够执行维护任务', () => {
    // 模拟100帧后的维护
    for (let i = 0; i < 100; i++) {
      optimizer.beginFrame()
      optimizer.endFrame()
    }

    // 维护应该自动执行，不应该抛出错误
    expect(optimizer.getStats().frameCount).toBe(100)
  })
})

describe('createGlobalWebGLOptimizer', () => {
  it('应该能够创建全局优化器', () => {
    const gl = createMockWebGLContext()
    const shaderManager = new ShaderManager(gl)
    const bufferManager = new BufferManager(gl)

    const optimizer = createGlobalWebGLOptimizer(gl, shaderManager, bufferManager)

    expect(optimizer).toBeInstanceOf(WebGLOptimizer)

    optimizer.dispose()
  })
})
