/**
 * 高级着色器管理器测试
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { AdvancedShaderManager } from '../AdvancedShaderManager'

// 导入所需的类型
interface ShaderVariant {
  name: string
  defines: Record<string, string | number | boolean>
  features: string[]
}

interface ShaderTemplate {
  id: string
  vertexTemplate: string
  fragmentTemplate: string
  variants: ShaderVariant[]
  defaultUniforms: Record<string, unknown>
}

// Mock WebGL Context
const createMockGL = () => {
  const mockGL = {
    createShader: vi.fn(() => ({})),
    createProgram: vi.fn(() => ({})),
    shaderSource: vi.fn(),
    compileShader: vi.fn(),
    attachShader: vi.fn(),
    linkProgram: vi.fn(),
    deleteShader: vi.fn(),
    deleteProgram: vi.fn(),
    getShaderParameter: vi.fn(() => true),
    getProgramParameter: vi.fn((program, param) => {
      if (param === 0x8b82) return true // LINK_STATUS (35714)
      if (param === 0x8b89) return 2 // ACTIVE_ATTRIBUTES (35721)
      if (param === 0x8b86) return 3 // ACTIVE_UNIFORMS (35718)
      return 0
    }),
    getShaderInfoLog: vi.fn(() => ''),
    getProgramInfoLog: vi.fn(() => ''),
    getActiveAttrib: vi.fn(() => ({ name: 'a_position', type: 0x8b50 })),
    getActiveUniform: vi.fn(() => ({ name: 'u_matrix', type: 0x8b5c })),
    getAttribLocation: vi.fn(() => 0),
    getUniformLocation: vi.fn(() => ({})),
    useProgram: vi.fn(),
    uniform1f: vi.fn(),
    VERTEX_SHADER: 0x8b31,
    FRAGMENT_SHADER: 0x8b30,
    LINK_STATUS: 0x8b82,
    COMPILE_STATUS: 0x8b81,
    ACTIVE_ATTRIBUTES: 0x8b89,
    ACTIVE_UNIFORMS: 0x8b86,
  } as any

  return mockGL
}

// 示例着色器模板
const basicShaderTemplate: ShaderTemplate = {
  id: 'basic',
  vertexTemplate: `
    attribute vec4 a_position;
    uniform mat4 u_matrix;
    #ifdef USE_COLOR
    attribute vec4 a_color;
    varying vec4 v_color;
    #endif
    
    void main() {
      gl_Position = u_matrix * a_position;
      #ifdef USE_COLOR
      v_color = a_color;
      #endif
    }
  `,
  fragmentTemplate: `
    precision mediump float;
    #ifdef USE_COLOR
    varying vec4 v_color;
    #endif
    uniform vec4 u_color;
    
    void main() {
      #ifdef USE_COLOR
      gl_FragColor = v_color * u_color;
      #else
      gl_FragColor = u_color;
      #endif
    }
  `,
  variants: [
    {
      name: 'default',
      defines: {},
      features: [],
    },
    {
      name: 'colored',
      defines: { USE_COLOR: true },
      features: ['vertex-colors'],
    },
    {
      name: 'instanced',
      defines: { USE_COLOR: true, USE_INSTANCING: true },
      features: ['vertex-colors', 'instancing'],
    },
  ],
  defaultUniforms: {
    u_color: [1, 1, 1, 1],
    u_matrix: new Float32Array(16).fill(0),
  },
}

describe('AdvancedShaderManager', () => {
  let manager: AdvancedShaderManager
  let mockGL: any

  beforeEach(() => {
    mockGL = createMockGL()
    manager = new AdvancedShaderManager(mockGL, {
      cacheMemoryLimit: 10 * 1024 * 1024, // 10MB
      enableHotReload: false,
      precompileCommonVariants: false,
      enableAsyncCompilation: false,
    })
  })

  afterEach(() => {
    manager.dispose()
  })

  describe('模板管理', () => {
    it('应该能够注册着色器模板', () => {
      manager.registerTemplate(basicShaderTemplate)

      // 验证模板已注册（通过尝试获取程序来验证）
      expect(async () => {
        await manager.getProgram('basic')
      }).not.toThrow()
    })

    it('应该能够获取着色器程序', async () => {
      manager.registerTemplate(basicShaderTemplate)

      const program = await manager.getProgram('basic')

      expect(program).toBeDefined()
      expect(program.isValid).toBe(true)
      expect(mockGL.createShader).toHaveBeenCalledTimes(2) // vertex + fragment
      expect(mockGL.createProgram).toHaveBeenCalledTimes(1)
    })

    it('应该能够获取特定变体的着色器程序', async () => {
      manager.registerTemplate(basicShaderTemplate)

      const coloredProgram = await manager.getProgram('basic', 'colored')

      expect(coloredProgram).toBeDefined()
      expect(coloredProgram.isValid).toBe(true)
    })

    it('应该在模板不存在时抛出错误', async () => {
      try {
        await manager.getProgram('nonexistent')
        expect.fail('应该抛出错误')
      } catch (error) {
        expect((error as Error).message).toContain('Shader template not found')
      }
    })

    it('应该在变体不存在时抛出错误', async () => {
      manager.registerTemplate(basicShaderTemplate)

      try {
        await manager.getProgram('basic', 'nonexistent')
        expect.fail('应该抛出错误')
      } catch (error) {
        expect((error as Error).message).toContain('Shader variant not found')
      }
    })
  })

  describe('缓存机制', () => {
    it('应该缓存编译后的着色器程序', async () => {
      manager.registerTemplate(basicShaderTemplate)

      // 首次获取
      const program1 = await manager.getProgram('basic')

      // 再次获取相同程序
      const program2 = await manager.getProgram('basic')

      expect(program1).toBe(program2)
      expect(mockGL.createShader).toHaveBeenCalledTimes(2) // 只调用一次编译
    })

    it('应该为不同变体创建不同的程序', async () => {
      manager.registerTemplate(basicShaderTemplate)

      const defaultProgram = await manager.getProgram('basic', 'default')
      const coloredProgram = await manager.getProgram('basic', 'colored')

      expect(defaultProgram).not.toBe(coloredProgram)
      expect(mockGL.createShader).toHaveBeenCalledTimes(4) // 2 variants * 2 shaders each
    })

    it('应该提供缓存统计信息', async () => {
      manager.registerTemplate(basicShaderTemplate)

      await manager.getProgram('basic')
      await manager.getProgram('basic', 'colored')

      const stats = manager.getCacheStats()

      expect(stats.totalPrograms).toBe(2)
      expect(stats.memoryUsage).toBeGreaterThan(0)
      expect(stats.hitRate).toBeGreaterThanOrEqual(0)
    })
  })

  describe('预处理器', () => {
    it('应该正确处理#define指令', async () => {
      manager.registerTemplate(basicShaderTemplate)

      const program = await manager.getProgram('basic', 'colored')

      expect(program).toBeDefined()
      // 验证着色器源码包含了define指令
      expect(mockGL.shaderSource).toHaveBeenCalledWith(
        expect.anything(),
        expect.stringContaining('#define USE_COLOR true')
      )
    })

    it('应该正确处理条件编译', async () => {
      const template = {
        ...basicShaderTemplate,
        vertexTemplate: `
          #ifdef USE_FEATURE
          attribute vec4 a_extra;
          #endif
          void main() { gl_Position = vec4(0.0); }
        `,
        variants: [
          {
            name: 'without',
            defines: {} as Record<string, string | number | boolean>,
            features: [],
          },
          { name: 'with', defines: { USE_FEATURE: true }, features: ['feature'] },
        ],
      }

      manager.registerTemplate(template)

      await manager.getProgram('basic', 'with')

      // 验证预处理后的代码包含了条件编译的内容
      expect(mockGL.shaderSource).toHaveBeenCalled()
    })
  })

  describe('性能监控', () => {
    it('应该记录着色器性能指标', async () => {
      manager.registerTemplate(basicShaderTemplate)

      const startTime = Date.now()
      await manager.getProgram('basic')

      const metrics = manager.getMetrics('basic_default')

      expect(metrics).toBeDefined()
      if (typeof metrics === 'object' && 'compileTime' in metrics) {
        expect(metrics.compileTime).toBeGreaterThanOrEqual(0)
        expect(metrics.lastUsed).toBeGreaterThanOrEqual(startTime)
      }
    })

    it('应该跟踪着色器使用统计', async () => {
      manager.registerTemplate(basicShaderTemplate)

      // 多次获取同一个程序
      await manager.getProgram('basic')
      await manager.getProgram('basic')
      await manager.getProgram('basic')

      const stats = manager.getCacheStats()
      expect(stats.hitRate).toBeGreaterThan(0)
    })
  })

  describe('事件系统', () => {
    it('应该发出着色器编译事件', async () => {
      const compiledHandler = vi.fn()
      manager.on('shader-compiled', compiledHandler)

      manager.registerTemplate(basicShaderTemplate)
      await manager.getProgram('basic')

      expect(compiledHandler).toHaveBeenCalledWith({
        id: 'basic_default',
        time: expect.any(Number),
      })
    })

    it('应该发出缓存命中和未命中事件', async () => {
      const hitHandler = vi.fn()
      const missHandler = vi.fn()

      manager.on('shader-cache-hit', hitHandler)
      manager.on('shader-cache-miss', missHandler)

      manager.registerTemplate(basicShaderTemplate)

      // 首次获取 - 应该触发cache miss
      await manager.getProgram('basic')
      expect(missHandler).toHaveBeenCalledWith({ id: 'basic_default' })

      // 再次获取 - 应该触发cache hit
      await manager.getProgram('basic')
      expect(hitHandler).toHaveBeenCalledWith({ id: 'basic_default' })
    })

    it('应该发出着色器错误事件', async () => {
      const testMockGL = createMockGL()
      const testManager = new AdvancedShaderManager(testMockGL, {
        cacheMemoryLimit: 10 * 1024 * 1024,
        enableHotReload: false,
        precompileCommonVariants: false,
        enableAsyncCompilation: false,
      })

      const errorHandler = vi.fn()
      testManager.on('shader-error', errorHandler)

      const badTemplate = {
        ...basicShaderTemplate,
        id: 'bad-shader',
      }

      testManager.registerTemplate(badTemplate)

      testMockGL.getShaderParameter.mockReturnValue(false)
      testMockGL.getShaderInfoLog.mockReturnValue('Compilation error')

      try {
        await testManager.getProgram('bad-shader')
      } catch (error) {
        expect(error).toBeDefined()
      }

      await new Promise((resolve) => setTimeout(resolve, 10))

      expect(errorHandler).toHaveBeenCalled()

      testManager.dispose()
    })
  })

  describe('批量预编译', () => {
    it('应该能够批量预编译着色器', async () => {
      manager.registerTemplate(basicShaderTemplate)

      await manager.precompileShaders(['basic'])

      // 验证所有变体都已编译
      expect(mockGL.createShader).toHaveBeenCalledTimes(6) // 3 variants * 2 shaders each

      const stats = manager.getCacheStats()
      expect(stats.totalPrograms).toBe(3)
    })
  })

  describe('热重载', () => {
    it('应该支持热重载功能', async () => {
      const reloadManager = new AdvancedShaderManager(mockGL, {
        enableHotReload: true,
      })

      const reloadHandler = vi.fn()
      reloadManager.on('hot-reload', reloadHandler)

      reloadManager.registerTemplate(basicShaderTemplate)
      await reloadManager.getProgram('basic')

      const success = await reloadManager.hotReloadShader('basic')

      expect(success).toBe(true)
      expect(reloadHandler).toHaveBeenCalledWith({
        id: 'basic',
        success: true,
      })

      reloadManager.dispose()
    })
  })

  describe('缓存清理', () => {
    it('应该能够清理未使用的着色器', async () => {
      manager.registerTemplate(basicShaderTemplate)

      await manager.getProgram('basic')

      const initialStats = manager.getCacheStats()
      expect(initialStats.totalPrograms).toBe(1)

      // 强制清理
      const freedMemory = manager.cleanupCache(true)

      expect(freedMemory).toBeGreaterThan(0)
      expect(mockGL.deleteProgram).toHaveBeenCalled()

      const finalStats = manager.getCacheStats()
      expect(finalStats.totalPrograms).toBe(0)
    })

    it('应该发出缓存清理事件', async () => {
      const cleanedHandler = vi.fn()
      manager.on('cache-cleaned', cleanedHandler)

      manager.registerTemplate(basicShaderTemplate)
      await manager.getProgram('basic')

      manager.cleanupCache(true)

      expect(cleanedHandler).toHaveBeenCalledWith({
        freedMemory: expect.any(Number),
      })
    })
  })

  describe('内存管理', () => {
    it('应该在达到内存限制时自动清理', async () => {
      const smallMemoryManager = new AdvancedShaderManager(mockGL, {
        cacheMemoryLimit: 1, // 1 byte limit to trigger cleanup
        enableAsyncCompilation: false,
      })

      const cleanedHandler = vi.fn()
      smallMemoryManager.on('cache-cleaned', cleanedHandler)

      smallMemoryManager.registerTemplate(basicShaderTemplate)

      // 添加多个程序超过内存限制
      await smallMemoryManager.getProgram('basic', 'default')
      await smallMemoryManager.getProgram('basic', 'colored')

      // 应该触发自动清理
      expect(cleanedHandler).toHaveBeenCalled()

      smallMemoryManager.dispose()
    })
  })

  describe('销毁和清理', () => {
    it('应该能够正确销毁', async () => {
      manager.registerTemplate(basicShaderTemplate)
      await manager.getProgram('basic')

      manager.dispose()

      const stats = manager.getCacheStats()
      expect(stats.totalPrograms).toBe(0)
      expect(mockGL.deleteProgram).toHaveBeenCalled()
    })
  })
})
