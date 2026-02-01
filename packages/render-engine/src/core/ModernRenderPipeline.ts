/**
 * 现代化渲染管道
 * 集成命令系统、变换系统和WebGL后端
 */

import { CommandRendererFactory, type ICommandRenderer } from '../commands/CommandRenderer'
import type { IRenderCommand } from '../commands/IRenderCommand'
import type { IViewport } from '../core/IRenderEngine'
import type { IGraphicsContext } from '../graphics/IGraphicsContext'
import {
  CoordinateSystemManager,
  type IViewportConfig,
  Matrix2D,
  type TransformStack,
} from '../math/Transform'
import { BufferManager, type IBufferManager } from '../webgl/BufferManager'
import { SHADER_LIBRARY } from '../webgl/ShaderLibrary'
import { type IShaderManager, ShaderManager } from '../webgl/ShaderManager'

/**
 * 现代渲染管道接口
 */
export interface IModernRenderPipeline {
  /** 命令渲染器 */
  readonly commandRenderer: ICommandRenderer

  /** 坐标系统管理器 */
  readonly coordinateSystem: CoordinateSystemManager

  /** 着色器管理器 */
  readonly shaderManager: IShaderManager

  /** 缓冲区管理器 */
  readonly bufferManager: IBufferManager

  /** 变换栈 */
  readonly transformStack: TransformStack

  /**
   * 初始化管道
   * @param canvas 画布元素
   * @param config 视口配置
   */
  initialize(canvas: HTMLCanvasElement, config: IViewportConfig): Promise<void>

  /**
   * 开始渲染帧
   */
  beginFrame(): void

  /**
   * 提交渲染命令
   * @param command 渲染命令
   */
  submitCommand(command: IRenderCommand): void

  /**
   * 批量提交渲染命令
   * @param commands 渲染命令数组
   */
  submitCommands(commands: IRenderCommand[]): void

  /**
   * 设置视口
   * @param viewport 视口参数
   */
  setViewport(viewport: IViewport): void

  /**
   * 结束渲染帧
   */
  endFrame(): void

  /**
   * 获取渲染统计
   */
  getStats(): ModernRenderPipelineStats

  /**
   * 销毁管道
   */
  dispose(): void
}

export interface ModernRenderPipelineStats {
  initialized: boolean
  frameId?: number
  commandRenderer?: ReturnType<ICommandRenderer['getStats']>
  shaderManager?: ReturnType<IShaderManager['getStats']>
  bufferManager?: ReturnType<IBufferManager['getStats']>
  coordinateSystem?: {
    viewport: IViewportConfig
    transformStackDepth: number
  }
}

/**
 * WebGL 现代渲染管道实现
 */
export class WebGLModernRenderPipeline implements IModernRenderPipeline {
  readonly commandRenderer: ICommandRenderer
  readonly coordinateSystem: CoordinateSystemManager
  private _shaderManager?: IShaderManager
  private _bufferManager?: IBufferManager
  readonly transformStack: TransformStack

  private gl: WebGLRenderingContext | null = null
  private context: IGraphicsContext | null = null
  private isInitialized = false
  private frameId = 0

  constructor() {
    // 创建高性能命令渲染器
    this.commandRenderer = CommandRendererFactory.createHighPerformance()

    // 创建默认坐标系统
    this.coordinateSystem = new CoordinateSystemManager({
      viewport: { x: 0, y: 0, width: 800, height: 600 },
      worldBounds: { x: 0, y: 0, width: 800, height: 600 },
      devicePixelRatio: window.devicePixelRatio || 1,
      flipY: true, // WebGL 需要翻转 Y 轴
    })

    this.transformStack = this.coordinateSystem.getTransformStack()
  }

  async initialize(canvas: HTMLCanvasElement, config: IViewportConfig): Promise<void> {
    // 获取 WebGL 上下文
    this.gl =
      canvas.getContext('webgl') ||
      (canvas.getContext('experimental-webgl') as WebGLRenderingContext)

    if (!this.gl) {
      throw new Error('WebGL not supported')
    }
    // 创建管理器
    this._shaderManager = new ShaderManager(this.gl)
    this._bufferManager = new BufferManager(this.gl)

    // 更新坐标系统配置
    this.coordinateSystem.updateViewport(config)

    // 初始化 WebGL 状态
    this.setupWebGLState()

    // 加载内置着色器
    await this.loadBuiltinShaders()

    // 创建基础几何体
    this.createBasicGeometry()

    this.isInitialized = true
  }

  beginFrame(): void {
    if (!this.isInitialized || !this.gl) return

    this.frameId++

    // 清空渲染目标
    this.gl.clear(this.gl.COLOR_BUFFER_BIT)

    // 重置变换栈
    this.transformStack.reset()

    // 设置投影矩阵
    const viewportConfig = this.coordinateSystem.getViewportConfig()
    const projMatrix = Matrix2D.orthographic(
      0,
      viewportConfig.viewport.width,
      0,
      viewportConfig.viewport.height
    )

    // 应用投影变换到变换栈
    this.transformStack.setMatrix(projMatrix)
  }

  submitCommand(command: IRenderCommand): void {
    if (!this.isInitialized) return

    this.commandRenderer.submit(command)
  }

  submitCommands(commands: IRenderCommand[]): void {
    if (!this.isInitialized) return

    this.commandRenderer.submitBatch(commands)
  }

  setViewport(viewport: IViewport): void {
    if (!this.gl) return

    // 更新 WebGL 视口
    this.gl.viewport(0, 0, viewport.width, viewport.height)

    // 更新坐标系统
    this.coordinateSystem.updateViewport({
      viewport: {
        x: viewport.x,
        y: viewport.y,
        width: viewport.width,
        height: viewport.height,
      },
    })

    // 更新命令渲染器视口
    this.commandRenderer.setViewport(viewport)
  }

  endFrame(): void {
    if (!this.isInitialized || !this.gl || !this.context) return

    try {
      // 渲染所有命令
      this.commandRenderer.render(this.context)
    } catch (error) {
      console.error('Frame rendering failed:', error)
    }
  }

  get shaderManager(): IShaderManager {
    if (!this._shaderManager) {
      throw new Error('ShaderManager not initialized')
    }
    return this._shaderManager
  }

  get bufferManager(): IBufferManager {
    if (!this._bufferManager) {
      throw new Error('BufferManager not initialized')
    }
    return this._bufferManager
  }

  getStats(): ModernRenderPipelineStats {
    if (!this.isInitialized) {
      return { initialized: false }
    }

    return {
      initialized: true,
      frameId: this.frameId,
      commandRenderer: this.commandRenderer.getStats(),
      shaderManager: this.shaderManager.getStats(),
      bufferManager: this.bufferManager.getStats(),
      coordinateSystem: {
        viewport: this.coordinateSystem.getViewportConfig(),
        transformStackDepth: this.transformStack.getDepth(),
      },
    }
  }

  dispose(): void {
    if (this._shaderManager) {
      this._shaderManager.dispose()
    }

    if (this._bufferManager) {
      this._bufferManager.dispose()
    }

    this.commandRenderer.clear()
    this.isInitialized = false
    this.gl = null
    this.context = null
  }

  private setupWebGLState(): void {
    if (!this.gl) return

    const gl = this.gl

    // 启用混合
    gl.enable(gl.BLEND)
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA)

    // 设置清空颜色
    gl.clearColor(0.0, 0.0, 0.0, 0.0)

    // 禁用深度测试（2D渲染不需要）
    gl.disable(gl.DEPTH_TEST)

    // 禁用剔除
    gl.disable(gl.CULL_FACE)
  }

  private async loadBuiltinShaders(): Promise<void> {
    if (!this.shaderManager) return

    try {
      // 加载基础形状着色器
      this.shaderManager.createShader(SHADER_LIBRARY.BASIC_SHAPE)

      // 加载纹理着色器
      this.shaderManager.createShader(SHADER_LIBRARY.TEXTURE)

      // 加载 SDF 着色器
      this.shaderManager.createShader(SHADER_LIBRARY.SDF_CIRCLE)
      this.shaderManager.createShader(SHADER_LIBRARY.SDF_RECT)

      // 加载批处理着色器
      this.shaderManager.createShader(SHADER_LIBRARY.BATCH)

      console.log('Built-in shaders loaded successfully')
    } catch (error) {
      console.error('Failed to load built-in shaders:', error)
    }
  }

  private createBasicGeometry(): void {
    if (!this.bufferManager || !this.gl) return

    // 创建单位四边形几何体（用于各种形状的基础）
    const quadVertices = new Float32Array([
      -0.5,
      -0.5, // 左下
      0.5,
      -0.5, // 右下
      0.5,
      0.5, // 右上
      -0.5,
      0.5, // 左上
    ])

    const quadIndices = new Uint16Array([
      0,
      1,
      2, // 第一个三角形
      2,
      3,
      0, // 第二个三角形
    ])

    // 创建顶点缓冲区
    const vertexBuffer = this.bufferManager.createBuffer(
      WebGLRenderingContext.ARRAY_BUFFER,
      WebGLRenderingContext.STATIC_DRAW,
      'quad_vertices'
    )
    vertexBuffer.uploadData(this.gl, quadVertices)

    // 创建索引缓冲区
    const indexBuffer = this.bufferManager.createBuffer(
      WebGLRenderingContext.ELEMENT_ARRAY_BUFFER,
      WebGLRenderingContext.STATIC_DRAW,
      'quad_indices'
    )
    indexBuffer.uploadData(this.gl, quadIndices)

    // 创建顶点数组对象
    const _vertexArray = this.bufferManager.createVertexArray(
      vertexBuffer,
      {
        stride: 8, // 2 floats * 4 bytes
        attributes: [
          {
            name: 'a_position',
            size: 2,
            type: this.gl.FLOAT,
            normalized: false,
            offset: 0,
          },
        ],
      },
      indexBuffer,
      'basic_quad'
    )
  }
}

/**
 * 渲染管道工厂
 */
export class RenderPipelineFactory {
  /**
   * 创建WebGL渲染管道
   * @param config 可选配置
   */
  static createWebGL(_config?: unknown): IModernRenderPipeline {
    return new WebGLModernRenderPipeline()
  }

  /**
   * 创建Canvas2D渲染管道
   * @param config 可选配置
   */
  static createCanvas2D(_config?: unknown): IModernRenderPipeline {
    // 留待未来实现
    throw new Error('Canvas2D render pipeline not implemented yet')
  }

  /**
   * 自动选择最佳渲染管道
   * @param preferredType 首选类型
   */
  static createBest(preferredType?: 'webgl' | 'canvas2d'): IModernRenderPipeline {
    // 检测 WebGL 支持
    const canvas = document.createElement('canvas')
    const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl')

    if (gl && preferredType !== 'canvas2d') {
      return RenderPipelineFactory.createWebGL()
    } else {
      return RenderPipelineFactory.createCanvas2D()
    }
  }
}
