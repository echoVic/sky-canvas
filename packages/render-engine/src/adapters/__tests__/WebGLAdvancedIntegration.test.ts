/**
 * WebGL高级功能集成测试
 * 验证AdvancedShaderManager和WebGLOptimizer与WebGLContext的集成
 */
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { type IWebGLContext, type WebGLAdvancedConfig, WebGLContextFactory } from '../WebGLContext'

// Mock WebGL API (复用之前的mock)
const mockWebGLContext = {
  enable: vi.fn(),
  disable: vi.fn(),
  blendFunc: vi.fn(),
  clearColor: vi.fn(),
  viewport: vi.fn(),
  clear: vi.fn(),
  lineWidth: vi.fn(),
  createBuffer: vi.fn().mockReturnValue({}),
  bindBuffer: vi.fn(),
  bufferData: vi.fn(),
  bufferSubData: vi.fn(),
  deleteBuffer: vi.fn(),
  useProgram: vi.fn(),
  bindTexture: vi.fn(),
  drawElements: vi.fn(),
  drawArrays: vi.fn(),
  readPixels: vi.fn(),
  createTexture: vi.fn(),
  texImage2D: vi.fn(),
  texParameteri: vi.fn(),
  deleteTexture: vi.fn(),
  scissor: vi.fn(),
  getParameter: vi.fn().mockReturnValue(4096),
  getExtension: vi.fn().mockReturnValue(null),
  createShader: vi.fn().mockReturnValue({}),
  shaderSource: vi.fn(),
  compileShader: vi.fn(),
  createProgram: vi.fn().mockReturnValue({}),
  attachShader: vi.fn(),
  linkProgram: vi.fn(),
  deleteShader: vi.fn(),
  deleteProgram: vi.fn(),
  getAttribLocation: vi.fn().mockReturnValue(0),
  getUniformLocation: vi.fn().mockReturnValue({}),
  uniformMatrix3fv: vi.fn(),
  uniform4fv: vi.fn(),
  uniform1f: vi.fn(),
  uniform2f: vi.fn(),
  uniform3f: vi.fn(),
  uniform4f: vi.fn(),
  uniform2fv: vi.fn(),
  uniform3fv: vi.fn(),
  uniformMatrix4fv: vi.fn(),
  enableVertexAttribArray: vi.fn(),
  vertexAttribPointer: vi.fn(),
  finish: vi.fn(),
  getProgramParameter: vi.fn().mockReturnValue(true),
  getShaderParameter: vi.fn().mockReturnValue(true),
  getProgramInfoLog: vi.fn().mockReturnValue(''),
  getShaderInfoLog: vi.fn().mockReturnValue(''),
  getActiveAttrib: vi.fn().mockReturnValue({ name: 'position', type: 35665, size: 1 }),
  getActiveUniform: vi.fn().mockReturnValue({ name: 'uProjection', type: 35676, size: 1 }),
  COLOR_BUFFER_BIT: 0x00004000,
  BLEND: 0x0be2,
  SRC_ALPHA: 0x0302,
  ONE_MINUS_SRC_ALPHA: 0x0303,
  DEPTH_TEST: 0x0b71,
  MAX_TEXTURE_SIZE: 0x0d33,
  TRIANGLES: 0x0004,
  UNSIGNED_SHORT: 0x1403,
  TEXTURE_2D: 0x0de1,
  RGBA: 0x1908,
  UNSIGNED_BYTE: 0x1401,
  TEXTURE_MIN_FILTER: 0x2801,
  TEXTURE_MAG_FILTER: 0x2800,
  NEAREST: 0x2600,
  SCISSOR_TEST: 0x0c11,
  ARRAY_BUFFER: 0x8892,
  ELEMENT_ARRAY_BUFFER: 0x8893,
  STATIC_DRAW: 0x88e4,
  DYNAMIC_DRAW: 0x88e8,
  STREAM_DRAW: 0x88e0,
  VERTEX_SHADER: 0x8b31,
  FRAGMENT_SHADER: 0x8b30,
  COMPILE_STATUS: 0x8b81,
  LINK_STATUS: 0x8b82,
  ACTIVE_ATTRIBUTES: 0x8b89,
  ACTIVE_UNIFORMS: 0x8b86,
  TEXTURE0: 0x84c0,
}

describe('WebGL高级功能集成测试', () => {
  let canvas: HTMLCanvasElement
  let context: IWebGLContext

  beforeEach(async () => {
    // 创建模拟canvas
    canvas = document.createElement('canvas')
    canvas.width = 800
    canvas.height = 600

    // Mock getContext返回WebGL上下文
    canvas.getContext = vi.fn().mockReturnValue(mockWebGLContext)
  })

  describe('基础集成测试', () => {
    it('应该支持不启用高级功能的情况', async () => {
      const factory = new WebGLContextFactory()
      context = await factory.createContext(canvas)

      expect(context.getAdvancedShaderManager?.()).toBeUndefined()
      expect(context.getWebGLOptimizer?.()).toBeUndefined()
    })

    it('应该能够启用高级着色器管理', async () => {
      const factory = new WebGLContextFactory()
      const advancedConfig: WebGLAdvancedConfig = {
        enableAdvancedShaders: true,
        advancedShaderConfig: {
          enableHotReload: true,
          precompileCommonVariants: false,
        },
      }

      context = await factory.createContext(canvas, undefined, advancedConfig)

      expect(context.getAdvancedShaderManager?.()).toBeDefined()
      expect(context.getWebGLOptimizer?.()).toBeUndefined()
    })

    it('应该能够启用WebGL优化器', async () => {
      const factory = new WebGLContextFactory()
      const advancedConfig: WebGLAdvancedConfig = {
        enableOptimizer: true,
        optimizerConfig: {
          enableStateTracking: true,
          enableBatchOptimization: true,
        },
      }

      context = await factory.createContext(canvas, undefined, advancedConfig)

      expect(context.getAdvancedShaderManager?.()).toBeUndefined()
      expect(context.getWebGLOptimizer?.()).toBeDefined()
    })

    it('应该能够同时启用所有高级功能', async () => {
      const factory = new WebGLContextFactory()
      const advancedConfig: WebGLAdvancedConfig = {
        enableAdvancedShaders: true,
        enableOptimizer: true,
        advancedShaderConfig: {
          enableAsyncCompilation: true,
        },
        optimizerConfig: {
          enableBufferPooling: true,
        },
      }

      context = await factory.createContext(canvas, undefined, advancedConfig)

      expect(context.getAdvancedShaderManager?.()).toBeDefined()
      expect(context.getWebGLOptimizer?.()).toBeDefined()
    })
  })

  describe('高级功能使用测试', () => {
    beforeEach(async () => {
      const factory = new WebGLContextFactory()
      const advancedConfig: WebGLAdvancedConfig = {
        enableAdvancedShaders: true,
        enableOptimizer: true,
      }

      context = await factory.createContext(canvas, undefined, advancedConfig)
    })

    it('应该能够通过高级着色器管理器注册着色器模板', () => {
      const advancedShaderManager = context.getAdvancedShaderManager?.()
      expect(advancedShaderManager).toBeDefined()

      if (advancedShaderManager) {
        // 测试注册着色器模板
        const template = {
          id: 'test_shader',
          vertexTemplate: `
            attribute vec2 position;
            void main() {
              gl_Position = vec4(position, 0.0, 1.0);
            }
          `,
          fragmentTemplate: `
            precision mediump float;
            void main() {
              gl_FragColor = vec4(1.0, 0.0, 0.0, 1.0);
            }
          `,
          variants: [
            {
              name: 'default',
              defines: {},
              features: [],
            },
          ],
          defaultUniforms: {},
        }

        expect(() => {
          advancedShaderManager.registerTemplate(template)
        }).not.toThrow()
      }
    })

    it('应该能够通过WebGL优化器进行性能监控', () => {
      const optimizer = context.getWebGLOptimizer?.()
      expect(optimizer).toBeDefined()

      if (optimizer) {
        // 测试性能统计
        const stats = optimizer.getStats()
        expect(stats).toBeDefined()
        expect(typeof stats.frameCount).toBe('number')
        expect(typeof stats.stateChanges).toBe('object')
        expect(typeof stats.drawCalls).toBe('object')
        expect(typeof stats.memory).toBe('object')
      }
    })

    it('应该能够正常执行基础绘制操作', () => {
      // 测试基础绘制功能仍然正常工作
      expect(() => {
        context.setFillStyle('#ff0000')
        context.fillRect(10, 10, 100, 100)
        context.present()
      }).not.toThrow()
    })
  })

  describe('资源管理测试', () => {
    it('应该能够正确清理高级功能资源', async () => {
      const factory = new WebGLContextFactory()
      const advancedConfig: WebGLAdvancedConfig = {
        enableAdvancedShaders: true,
        enableOptimizer: true,
      }

      context = await factory.createContext(canvas, undefined, advancedConfig)

      // 验证高级功能已初始化
      expect(context.getAdvancedShaderManager?.()).toBeDefined()
      expect(context.getWebGLOptimizer?.()).toBeDefined()

      // 测试资源清理
      expect(() => {
        context.dispose()
      }).not.toThrow()
    })
  })

  describe('性能测试', () => {
    it('高级功能不应该显著影响基础渲染性能', async () => {
      // 创建没有高级功能的上下文
      const factory = new WebGLContextFactory()
      const basicContext = await factory.createContext(canvas)

      // 创建有高级功能的上下文
      const advancedConfig: WebGLAdvancedConfig = {
        enableAdvancedShaders: true,
        enableOptimizer: true,
      }
      const advancedContext = await factory.createContext(canvas, undefined, advancedConfig)

      // 基准测试
      const testRenderOperations = (ctx: any) => {
        const startTime = performance.now()
        for (let i = 0; i < 100; i++) {
          ctx.setFillStyle(`#${Math.floor(Math.random() * 16777215).toString(16)}`)
          ctx.fillRect(i, i, 10, 10)
        }
        ctx.present()
        return performance.now() - startTime
      }

      const basicTime = testRenderOperations(basicContext)
      const advancedTime = testRenderOperations(advancedContext)

      // 高级功能的开销应该是合理的（不超过2倍）
      expect(advancedTime / basicTime).toBeLessThan(2)

      basicContext.dispose()
      advancedContext.dispose()
    })
  })
})
