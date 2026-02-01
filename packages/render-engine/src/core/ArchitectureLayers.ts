/**
 * 三层架构定义
 * GL层 -> Core层 -> Feature层
 */

import { Extension, ExtensionType, type IExtension } from './systems/ExtensionSystem'

// ============================================================================
// GL层 - 底层WebGL抽象接口
// ============================================================================

/**
 * WebGL状态管理器
 */
export interface IWebGLState {
  setBlendMode(mode: number): void
  setDepthTest(enable: boolean): void
  setCullFace(enable: boolean): void
  setViewport(x: number, y: number, width: number, height: number): void
  reset(): void
}

/**
 * WebGL缓冲区管理器
 */
export interface IWebGLBuffer {
  readonly id: string
  readonly type: number
  readonly usage: number

  bind(): void
  upload(data: ArrayBuffer | ArrayBufferView): void
  dispose(): void
}

/**
 * WebGL纹理管理器
 */
export interface IWebGLTexture {
  readonly id: string
  readonly width: number
  readonly height: number
  readonly format: number

  bind(unit?: number): void
  upload(source: TexImageSource): void
  generateMipmap(): void
  dispose(): void
}

/**
 * WebGL着色器管理器
 */
export interface IWebGLShader {
  readonly id: string
  readonly program: WebGLProgram

  use(): void
  setUniform(name: string, value: unknown): void
  setAttribute(name: string, buffer: IWebGLBuffer): void
  dispose(): void
}

/**
 * WebGL渲染器接口
 */
export interface IWebGLRenderer {
  readonly gl: WebGLRenderingContext
  readonly state: IWebGLState

  clear(color?: [number, number, number, number]): void
  draw(primitive: number, count: number, offset?: number): void
  drawElements(primitive: number, count: number, type: number, offset?: number): void
}

// ============================================================================
// Core层 - 核心渲染抽象接口
// ============================================================================

/**
 * 渲染上下文
 */
export interface IRenderContext {
  readonly renderer: IWebGLRenderer
  readonly viewport: { x: number; y: number; width: number; height: number }
  readonly deltaTime: number
  readonly frameCount: number
}

/**
 * 变换矩阵
 */
export interface ITransform {
  readonly matrix: Float32Array
  readonly worldMatrix: Float32Array

  setPosition(x: number, y: number): void
  setRotation(angle: number): void
  setScale(x: number, y: number): void
  updateWorldMatrix(parentMatrix?: Float32Array): void
}

/**
 * 几何体
 */
export interface IGeometry {
  readonly vertices: Float32Array
  readonly indices: Uint16Array
  readonly uvs: Float32Array
  readonly normals?: Float32Array

  upload(renderer: IWebGLRenderer): void
  bind(renderer: IWebGLRenderer): void
  dispose(): void
}

/**
 * 材质
 */
export interface IMaterial {
  readonly shader: IWebGLShader
  readonly uniforms: Record<string, unknown>
  readonly textures: IWebGLTexture[]

  bind(renderer: IWebGLRenderer): void
  setUniform(name: string, value: unknown): void
}

/**
 * 渲染对象
 */
export interface IRenderObject {
  readonly id: string
  readonly transform: ITransform
  readonly geometry: IGeometry
  readonly material: IMaterial
  readonly visible: boolean
  readonly zIndex: number

  render(context: IRenderContext): void
  getBounds(): { x: number; y: number; width: number; height: number }
  hitTest(point: { x: number; y: number }): boolean
}

/**
 * 场景图节点
 */
export interface ISceneNode {
  readonly id: string
  readonly parent: ISceneNode | null
  readonly children: ISceneNode[]
  readonly transform: ITransform

  addChild(child: ISceneNode): void
  removeChild(child: ISceneNode): void
  traverse(callback: (node: ISceneNode) => void): void
  updateTransforms(): void
}

// ============================================================================
// Feature层 - 高级功能抽象接口
// ============================================================================

/**
 * 补间动画
 */
export interface ITween {
  readonly target: object
  readonly duration: number
  readonly progress: number

  play(): void
  pause(): void
  stop(): void
  reverse(): void
  onComplete(callback: () => void): ITween
}

/**
 * 动画系统
 */
export interface IAnimationSystem {
  createTween(target: object, properties: object, duration: number): ITween
  update(deltaTime: number): void
  pause(): void
  resume(): void
}

/**
 * 交互系统
 */
export interface IInteractionSystem {
  readonly enabled: boolean

  addInteractiveObject(object: IRenderObject): void
  removeInteractiveObject(object: IRenderObject): void
  hitTest(point: { x: number; y: number }): IRenderObject | null
  processEvent(event: Event): void
}

/**
 * 滤镜接口
 */
export interface IFilter {
  readonly name: string
  readonly enabled: boolean

  apply(input: IWebGLTexture, output: IWebGLTexture, context: IRenderContext): void
  dispose(): void
}

/**
 * 滤镜系统
 */
export interface IFilterSystem {
  applyFilter(object: IRenderObject, filter: IFilter): void
  removeFilter(object: IRenderObject, filter: IFilter): void
  render(context: IRenderContext): void
}

/**
 * 粒子系统
 */
export interface IParticleSystem {
  readonly maxParticles: number
  readonly activeParticles: number

  emit(count: number, position: { x: number; y: number }): void
  update(deltaTime: number): void
  render(context: IRenderContext): void
  clear(): void
}

/**
 * 物理体
 */
export interface IPhysicsBody {
  readonly id: string
  readonly position: { x: number; y: number }
  readonly velocity: { x: number; y: number }
  readonly mass: number

  applyForce(force: { x: number; y: number }): void
  setPosition(x: number, y: number): void
  setVelocity(x: number, y: number): void
}

/**
 * 物理系统
 */
export interface IPhysicsSystem {
  addBody(body: IPhysicsBody): void
  removeBody(body: IPhysicsBody): void
  step(deltaTime: number): void
  raycast(from: { x: number; y: number }, to: { x: number; y: number }): IPhysicsBody[]
}

/**
 * 架构层级管理器
 */
@Extension({
  type: ExtensionType.RenderSystem,
  name: 'architecture-manager',
  priority: 1200,
})
export class ArchitectureManager implements IExtension {
  name = 'architecture-manager'
  priority = 1200
  isInitialized = false
  private glLayer: Map<string, unknown> = new Map()
  private coreLayer: Map<string, unknown> = new Map()
  private featureLayer: Map<string, unknown> = new Map()

  /**
   * 注册GL层组件
   */
  registerGLComponent<T>(name: string, component: T): void {
    this.glLayer.set(name, component)
  }

  /**
   * 注册Core层组件
   */
  registerCoreComponent<T>(name: string, component: T): void {
    this.coreLayer.set(name, component)
  }

  /**
   * 注册Feature层组件
   */
  registerFeatureComponent<T>(name: string, component: T): void {
    this.featureLayer.set(name, component)
  }

  /**
   * 获取GL层组件
   */
  getGLComponent<T>(name: string): T | null {
    return (this.glLayer.get(name) as T) || null
  }

  /**
   * 获取Core层组件
   */
  getCoreComponent<T>(name: string): T | null {
    return (this.coreLayer.get(name) as T) || null
  }

  /**
   * 获取Feature层组件
   */
  getFeatureComponent<T>(name: string): T | null {
    return (this.featureLayer.get(name) as T) || null
  }

  /**
   * 验证架构依赖
   */
  validateDependencies(): { valid: boolean; violations: string[] } {
    const violations: string[] = []

    // Feature层不能直接依赖GL层
    // Core层可以依赖GL层
    // Feature层只能依赖Core层

    try {
      // 验证GL层组件不依赖其他层
      for (const [name] of this.glLayer) {
        // GL层应该是最底层，不应该依赖其他层
        // 这里可以添加更具体的检查逻辑
        if (this.checkForCircularDependency(name, 'gl')) {
          violations.push(`GL component ${name} has circular dependency`)
        }
      }

      // 验证Core层只依赖GL层
      for (const [name] of this.coreLayer) {
        if (this.checkForFeatureDependency(name)) {
          violations.push(`Core component ${name} illegally depends on Feature layer`)
        }
      }

      // 验证Feature层不直接依赖GL层
      for (const [name] of this.featureLayer) {
        if (this.checkForGLDependency(name)) {
          violations.push(`Feature component ${name} illegally depends on GL layer directly`)
        }
      }

      return {
        valid: violations.length === 0,
        violations,
      }
    } catch (error) {
      violations.push(`Dependency validation error: ${error}`)
      return {
        valid: false,
        violations,
      }
    }
  }

  /**
   * 检查循环依赖
   */
  private checkForCircularDependency(
    componentName: string,
    layer: 'gl' | 'core' | 'feature'
  ): boolean {
    // 简化的循环依赖检查 - 实际项目中应该更复杂
    // 这里返回false表示没有循环依赖
    return false
  }

  /**
   * 检查Feature层依赖
   */
  private checkForFeatureDependency(componentName: string): boolean {
    // 检查Core层组件是否依赖Feature层
    return false
  }

  /**
   * 检查GL层依赖
   */
  private checkForGLDependency(componentName: string): boolean {
    // 检查Feature层组件是否直接依赖GL层
    return false
  }

  /**
   * 获取架构统计
   */
  getArchitectureStats() {
    return {
      glComponents: this.glLayer.size,
      coreComponents: this.coreLayer.size,
      featureComponents: this.featureLayer.size,
    }
  }

  /**
   * 初始化扩展
   */
  init(): void {
    this.isInitialized = true
  }

  /**
   * 销毁扩展
   */
  destroy(): void {
    this.clear()
    this.isInitialized = false
  }

  /**
   * 清理所有组件
   */
  clear(): void {
    this.glLayer.clear()
    this.coreLayer.clear()
    this.featureLayer.clear()
  }
}
