/**
 * 粒子系统类型定义
 */

import type { EasingFunction } from './AnimationTypes'
import type { Point2D, Vector2D } from './PathTypes'

// 重新导出类型，确保它们可以被外部使用
export type { Point2D, Vector2D }

/**
 * 粒子状态
 */
export enum ParticleState {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  DEAD = 'dead',
}

/**
 * 粒子发射器形状
 */
export enum EmitterShape {
  POINT = 'point',
  LINE = 'line',
  CIRCLE = 'circle',
  RECTANGLE = 'rectangle',
  ARC = 'arc',
}

/**
 * 粒子混合模式
 */
export enum BlendMode {
  NORMAL = 'normal',
  ADD = 'add',
  MULTIPLY = 'multiply',
  SCREEN = 'screen',
}

/**
 * 粒子接口
 */
export interface IParticle {
  readonly id: string
  position: Point2D
  velocity: Vector2D
  acceleration: Vector2D
  size: number
  scale: Vector2D
  rotation: number
  angularVelocity: number
  alpha: number
  color: string
  life: number
  maxLife: number
  mass: number
  state: ParticleState
  userData: Record<string, any>

  update(deltaTime: number): void
  reset(): void

  // 生命周期方法
  isAlive(): boolean
  isDead(): boolean
  getLifeProgress(): number
  setLife(life: number): void

  // 空间方法
  getDistanceTo(other: IParticle | Point2D): number
  getVectorTo(other: IParticle | Point2D): Vector2D

  // 力学方法
  applyForce(force: Vector2D): void
}

/**
 * 基础粒子配置
 */
export interface ParticleConfig {
  position?: Point2D
  velocity?: Vector2D
  acceleration?: Vector2D
  size?: number
  scale?: Vector2D
  rotation?: number
  angularVelocity?: number
  alpha?: number
  color?: string
  life?: number
  mass?: number
  userData?: Record<string, any>
}

/**
 * 粒子范围配置（用于随机生成）
 */
export interface ParticleRange<T> {
  min: T
  max: T
}

/**
 * 粒子发射配置
 */
export interface ParticleEmissionConfig {
  // 基础属性
  position: ParticleRange<Point2D>
  velocity: ParticleRange<Vector2D>
  acceleration?: ParticleRange<Vector2D>

  // 外观属性
  size: ParticleRange<number>
  scale?: ParticleRange<Vector2D>
  rotation?: ParticleRange<number>
  angularVelocity?: ParticleRange<number>
  alpha?: ParticleRange<number>
  color?: string[] | ParticleRange<string>

  // 生命周期
  life: ParticleRange<number>
  mass?: ParticleRange<number>

  // 发射参数
  rate: number // 每秒发射粒子数
  burst?: number // 一次性发射数量

  // 形状参数
  emitterShape?: EmitterShape
  emitterSize?: Point2D
  emitterRadius?: number

  // 其他
  userData?: Record<string, any>
}

/**
 * 粒子系统配置
 */
export interface ParticleSystemConfig {
  emission: ParticleEmissionConfig
  maxParticles?: number
  autoStart?: boolean
  loop?: boolean
  duration?: number
  delay?: number
  prewarm?: number
  simulationSpace?: 'local' | 'world'

  // 力场
  gravity?: Vector2D
  damping?: number

  // 渲染
  blendMode?: BlendMode
  sortParticles?: boolean

  // 碰撞
  bounds?: {
    min: Point2D
    max: Point2D
    bounce?: number
  }

  // 性能
  culling?: boolean
  cullBounds?: {
    min: Point2D
    max: Point2D
  }
}

/**
 * 粒子影响器接口
 */
export interface IParticleAffector {
  readonly type: string
  readonly enabled: boolean

  affect(particle: IParticle, deltaTime: number): void
  setEnabled(enabled: boolean): void
}

/**
 * 重力影响器配置
 */
export interface GravityAffectorConfig {
  type: 'gravity'
  force: Vector2D
  enabled?: boolean
}

/**
 * 风力影响器配置
 */
export interface WindAffectorConfig {
  type: 'wind'
  force: Vector2D
  turbulence?: number
  enabled?: boolean
}

/**
 * 吸引器配置
 */
export interface AttractorAffectorConfig {
  type: 'attractor'
  position: Point2D
  strength: number
  range?: number
  falloff?: 'linear' | 'quadratic' | 'constant'
  enabled?: boolean
}

/**
 * 阻尼影响器配置
 */
export interface DampingAffectorConfig {
  type: 'damping'
  factor: number
  enabled?: boolean
}

/**
 * 大小变化影响器配置
 */
export interface SizeAffectorConfig {
  type: 'size'
  curve: Array<{ time: number; value: number }>
  easing?: EasingFunction
  enabled?: boolean
}

/**
 * 透明度变化影响器配置
 */
export interface AlphaAffectorConfig {
  type: 'alpha'
  curve: Array<{ time: number; value: number }>
  easing?: EasingFunction
  enabled?: boolean
}

/**
 * 颜色变化影响器配置
 */
export interface ColorAffectorConfig {
  type: 'color'
  gradient: Array<{ time: number; color: string }>
  easing?: EasingFunction
  enabled?: boolean
}

/**
 * 旋转影响器配置
 */
export interface RotationAffectorConfig {
  type: 'rotation'
  angularVelocity: ParticleRange<number>
  enabled?: boolean
}

/**
 * 涡流影响器配置
 */
export interface VortexAffectorConfig {
  type: 'vortex'
  center: Point2D
  strength: number
  range?: number
  enabled?: boolean
}

/**
 * 影响器配置联合类型
 */
export type AffectorConfig =
  | GravityAffectorConfig
  | WindAffectorConfig
  | AttractorAffectorConfig
  | DampingAffectorConfig
  | SizeAffectorConfig
  | AlphaAffectorConfig
  | ColorAffectorConfig
  | RotationAffectorConfig
  | VortexAffectorConfig

/**
 * 粒子系统事件
 */
export interface ParticleSystemEvents {
  start: (system: IParticleSystem) => void
  stop: (system: IParticleSystem) => void
  pause: (system: IParticleSystem) => void
  resume: (system: IParticleSystem) => void
  particleSpawn: (particle: IParticle, system: IParticleSystem) => void
  particleDeath: (particle: IParticle, system: IParticleSystem) => void
  complete: (system: IParticleSystem) => void
  [key: string]: (...args: any[]) => void
}

/**
 * 粒子系统状态
 */
export enum ParticleSystemState {
  IDLE = 'idle',
  PLAYING = 'playing',
  PAUSED = 'paused',
  STOPPED = 'stopped',
  COMPLETED = 'completed',
}

/**
 * 粒子系统接口
 */
export interface IParticleSystem {
  readonly id: string
  readonly state: ParticleSystemState
  readonly particles: IParticle[]
  readonly activeParticles: number
  readonly config: ParticleSystemConfig
  readonly affectors: IParticleAffector[]

  // 生命周期
  start(): this
  stop(): this
  pause(): this
  resume(): this
  restart(): this

  // 更新
  update(deltaTime: number): void

  // 发射控制
  emitParticles(count?: number): void
  burst(count: number): void

  // 影响器管理
  addAffector(config: AffectorConfig): IParticleAffector
  removeAffector(affector: IParticleAffector): boolean
  getAffector(type: string): IParticleAffector | undefined

  // 配置
  updateConfig(config: Partial<ParticleSystemConfig>): void

  // 清理
  clear(): void
  dispose(): void

  // 事件
  on<K extends keyof ParticleSystemEvents>(event: K, listener: ParticleSystemEvents[K]): this
  off<K extends keyof ParticleSystemEvents>(event: K, listener?: ParticleSystemEvents[K]): this
  emit<K extends keyof ParticleSystemEvents>(
    event: K,
    ...args: Parameters<ParticleSystemEvents[K]>
  ): this
}

/**
 * 粒子渲染器接口
 */
export interface IParticleRenderer {
  render(particles: IParticle[], context: CanvasRenderingContext2D | WebGLRenderingContext): void
  setBlendMode(mode: BlendMode): void
}

/**
 * 粒子池接口
 */
export interface IParticlePool {
  get(): IParticle | null
  release(particle: IParticle): void
  grow(count: number): void
  clear(): void
  readonly size: number
  readonly available: number
}

/**
 * 粒子工厂接口
 */
export interface IParticleFactory {
  create(config?: ParticleConfig): IParticle
  createFromEmission(emission: ParticleEmissionConfig): IParticle
}
