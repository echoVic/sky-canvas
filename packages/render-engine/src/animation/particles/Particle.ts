/**
 * 基础粒子实现
 */

import {
  type IParticle,
  type ParticleConfig,
  ParticleState,
  type Point2D,
  type Vector2D,
} from '../types/ParticleTypes'

export class Particle implements IParticle {
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

  // 初始状态缓存（用于重置）
  private initialConfig: Required<ParticleConfig>

  constructor(config: ParticleConfig = {}) {
    this.id = `particle_${Math.random().toString(36).substr(2, 9)}`

    // 设置默认值
    this.position = config.position ? { ...config.position } : { x: 0, y: 0 }
    this.velocity = config.velocity ? { ...config.velocity } : { x: 0, y: 0 }
    this.acceleration = config.acceleration ? { ...config.acceleration } : { x: 0, y: 0 }
    this.size = config.size ?? 1
    this.scale = config.scale ? { ...config.scale } : { x: 1, y: 1 }
    this.rotation = config.rotation ?? 0
    this.angularVelocity = config.angularVelocity ?? 0
    this.alpha = config.alpha ?? 1
    this.color = config.color ?? '#ffffff'
    this.life = config.life ?? 1000 // 默认1秒生命
    this.maxLife = this.life
    this.mass = config.mass ?? 1
    this.state = ParticleState.ACTIVE
    this.userData = config.userData ? { ...config.userData } : {}

    // 缓存初始配置用于重置
    this.initialConfig = {
      position: { ...this.position },
      velocity: { ...this.velocity },
      acceleration: { ...this.acceleration },
      size: this.size,
      scale: { ...this.scale },
      rotation: this.rotation,
      angularVelocity: this.angularVelocity,
      alpha: this.alpha,
      color: this.color,
      life: this.life,
      mass: this.mass,
      userData: { ...this.userData },
    }
  }

  update(deltaTime: number): void {
    if (this.state !== ParticleState.ACTIVE) {
      return
    }

    const dt = deltaTime / 1000 // 转换为秒

    // 更新物理
    this.velocity.x += this.acceleration.x * dt
    this.velocity.y += this.acceleration.y * dt

    this.position.x += this.velocity.x * dt
    this.position.y += this.velocity.y * dt

    // 更新旋转
    this.rotation += this.angularVelocity * dt

    // 更新生命
    this.life -= deltaTime

    if (this.life <= 0) {
      this.state = ParticleState.DEAD
    }
  }

  reset(): void {
    this.position = { ...this.initialConfig.position }
    this.velocity = { ...this.initialConfig.velocity }
    this.acceleration = { ...this.initialConfig.acceleration }
    this.size = this.initialConfig.size
    this.scale = { ...this.initialConfig.scale }
    this.rotation = this.initialConfig.rotation
    this.angularVelocity = this.initialConfig.angularVelocity
    this.alpha = this.initialConfig.alpha
    this.color = this.initialConfig.color
    this.life = this.initialConfig.life
    this.maxLife = this.life
    this.mass = this.initialConfig.mass
    this.state = ParticleState.ACTIVE
    this.userData = { ...this.initialConfig.userData }
  }

  /**
   * 更新初始配置
   */
  updateInitialConfig(config: Partial<ParticleConfig>): void {
    if (config.position) this.initialConfig.position = { ...config.position }
    if (config.velocity) this.initialConfig.velocity = { ...config.velocity }
    if (config.acceleration) this.initialConfig.acceleration = { ...config.acceleration }
    if (config.size !== undefined) this.initialConfig.size = config.size
    if (config.scale) this.initialConfig.scale = { ...config.scale }
    if (config.rotation !== undefined) this.initialConfig.rotation = config.rotation
    if (config.angularVelocity !== undefined)
      this.initialConfig.angularVelocity = config.angularVelocity
    if (config.alpha !== undefined) this.initialConfig.alpha = config.alpha
    if (config.color) this.initialConfig.color = config.color
    if (config.life !== undefined) {
      this.initialConfig.life = config.life
      this.maxLife = config.life
    }
    if (config.mass !== undefined) this.initialConfig.mass = config.mass
    if (config.userData) this.initialConfig.userData = { ...config.userData }
  }

  /**
   * 获取生命进度 (0-1)
   */
  getLifeProgress(): number {
    return 1 - this.life / this.maxLife
  }

  /**
   * 获取剩余生命进度 (0-1)
   */
  getRemainingLifeProgress(): number {
    return this.life / this.maxLife
  }

  /**
   * 设置生命值
   */
  setLife(life: number): void {
    this.life = Math.max(0, life)
    if (this.life <= 0) {
      this.state = ParticleState.DEAD
    }
  }

  /**
   * 延长生命
   */
  extendLife(amount: number): void {
    this.life += amount
    if (this.state === ParticleState.DEAD && this.life > 0) {
      this.state = ParticleState.ACTIVE
    }
  }

  /**
   * 是否存活
   */
  isAlive(): boolean {
    return this.state === ParticleState.ACTIVE && this.life > 0
  }

  /**
   * 是否死亡
   */
  isDead(): boolean {
    return this.state === ParticleState.DEAD || this.life <= 0
  }

  /**
   * 克隆粒子
   */
  clone(): Particle {
    const cloned = new Particle()

    cloned.position = { ...this.position }
    cloned.velocity = { ...this.velocity }
    cloned.acceleration = { ...this.acceleration }
    cloned.size = this.size
    cloned.scale = { ...this.scale }
    cloned.rotation = this.rotation
    cloned.angularVelocity = this.angularVelocity
    cloned.alpha = this.alpha
    cloned.color = this.color
    cloned.life = this.life
    cloned.maxLife = this.maxLife
    cloned.mass = this.mass
    cloned.state = this.state
    cloned.userData = { ...this.userData }

    cloned.initialConfig = { ...this.initialConfig }

    return cloned
  }

  /**
   * 应用力
   */
  applyForce(force: Vector2D): void {
    this.acceleration.x += force.x / this.mass
    this.acceleration.y += force.y / this.mass
  }

  /**
   * 获取距离某点的距离
   */
  getDistanceTo(point: Point2D): number {
    const dx = this.position.x - point.x
    const dy = this.position.y - point.y
    return Math.sqrt(dx * dx + dy * dy)
  }

  /**
   * 获取到某点的向量
   */
  getVectorTo(point: Point2D): Vector2D {
    return {
      x: point.x - this.position.x,
      y: point.y - this.position.y,
    }
  }

  /**
   * 获取速度大小
   */
  getSpeed(): number {
    return Math.sqrt(this.velocity.x * this.velocity.x + this.velocity.y * this.velocity.y)
  }

  /**
   * 设置速度大小（保持方向）
   */
  setSpeed(speed: number): void {
    const currentSpeed = this.getSpeed()
    if (currentSpeed > 0) {
      const factor = speed / currentSpeed
      this.velocity.x *= factor
      this.velocity.y *= factor
    }
  }

  /**
   * 获取速度方向（弧度）
   */
  getVelocityAngle(): number {
    return Math.atan2(this.velocity.y, this.velocity.x)
  }

  /**
   * 设置速度方向（保持大小）
   */
  setVelocityAngle(angle: number): void {
    const speed = this.getSpeed()
    this.velocity.x = Math.cos(angle) * speed
    this.velocity.y = Math.sin(angle) * speed
  }
}
