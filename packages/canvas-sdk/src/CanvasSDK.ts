/**
 * Canvas SDK - 业务 API 类
 * 由 DI 容器创建，通过构造函数注入获取服务
 */

import { ICanvasManager } from './managers/CanvasManager'
import { ISceneManager } from './managers/SceneManager'
import { IToolManager } from './managers/ToolManager'
import type { LogLevel } from './services'
import { ILogService } from './services'

/**
 * SDK 配置选项
 */
export interface ICanvasSDKConfig {
  renderEngine?: 'webgl' | 'canvas2d' | 'webgpu'
  enableInteraction?: boolean
  enableHistory?: boolean
  logLevel?: LogLevel
  viewport?: {
    x?: number
    y?: number
    width?: number
    height?: number
    zoom?: number
  }
}

/**
 * Canvas SDK 主类 - 业务 API
 * 通过 DI 容器创建，所有依赖通过构造函数注入
 */
export class CanvasSDK {
  private _disposed: boolean = false

  constructor(
    @ICanvasManager private canvasManager: ICanvasManager,
    @ISceneManager private sceneManager: ISceneManager,
    @IToolManager private toolManager: IToolManager,
    @ILogService private logger: ILogService
  ) {
    this.logger.info('Canvas SDK instance created via DI container')
  }

  get isDisposed(): boolean {
    return this._disposed
  }

  /**
   * 获取 Canvas Manager - 主要 API 入口
   */
  getCanvasManager(): ICanvasManager {
    return this.canvasManager
  }

  on(eventName: string, callback: (...args: unknown[]) => void): void {
    this.canvasManager.on(eventName, callback)
  }

  off(eventName: string, callback?: (...args: unknown[]) => void): void {
    if (!callback) return
    this.canvasManager.off(eventName, callback)
  }

  /**
   * 获取 Scene Manager - 场景管理
   */
  getSceneManager(): ISceneManager {
    return this.sceneManager
  }

  /**
   * 获取 Tool Manager - 工具管理
   */
  getToolManager(): IToolManager {
    return this.toolManager
  }

  /**
   * 销毁 SDK
   */
  dispose(): void {
    if (this._disposed) {
      return
    }

    if (this.sceneManager) {
      this.sceneManager.dispose()
    }

    if (this.canvasManager) {
      this.canvasManager.dispose()
    }

    if (this.toolManager) {
      this.toolManager.dispose()
    }

    this._disposed = true
    this.logger.info('Canvas SDK disposed')
  }
}

/**
 * 默认导出
 */
export default CanvasSDK
