/**
 * 吸引器影响器
 */

import type { AttractorAffectorConfig, IParticle, Point2D } from '../../types/ParticleTypes'
import { BaseAffector } from './BaseAffector'

export class AttractorAffector extends BaseAffector {
  readonly type = 'attractor'

  private position: Point2D
  private strength: number
  private range: number
  private falloff: 'linear' | 'quadratic' | 'constant'

  constructor(config: AttractorAffectorConfig) {
    super()
    this.position = { ...config.position }
    this.strength = config.strength
    this.range = config.range || Infinity
    this.falloff = config.falloff || 'quadratic'
    this._enabled = config.enabled !== false
  }

  affect(particle: IParticle, deltaTime: number): void {
    if (!this.shouldAffect(particle)) {
      return
    }

    const distance = particle.getDistanceTo(this.position)

    // 如果超出范围则不受影响
    if (distance > this.range) {
      return
    }

    // 避免除零错误
    if (distance < 1) {
      return
    }

    // 计算方向向量
    const direction = particle.getVectorTo(this.position)
    const normalizedDirection = this.normalize(direction)

    // 根据衰减模式计算力的强度
    let forceStrength = this.strength

    switch (this.falloff) {
      case 'linear':
        forceStrength *= (this.range - distance) / this.range
        break
      case 'quadratic':
        forceStrength *= 1 / (distance * distance)
        break
      case 'constant':
        // 不衰减
        break
    }

    // 应用力
    const force = {
      x: normalizedDirection.x * forceStrength,
      y: normalizedDirection.y * forceStrength,
    }

    particle.applyForce(force)
  }

  /**
   * 设置吸引器位置
   */
  setPosition(position: Point2D): void {
    this.position = { ...position }
  }

  /**
   * 设置强度
   */
  setStrength(strength: number): void {
    this.strength = strength
  }

  /**
   * 设置范围
   */
  setRange(range: number): void {
    this.range = Math.max(0, range)
  }

  /**
   * 设置衰减模式
   */
  setFalloff(falloff: 'linear' | 'quadratic' | 'constant'): void {
    this.falloff = falloff
  }

  /**
   * 获取配置
   */
  getConfig(): AttractorAffectorConfig {
    return {
      type: 'attractor',
      position: { ...this.position },
      strength: this.strength,
      range: this.range,
      falloff: this.falloff,
      enabled: this._enabled,
    }
  }

  /**
   * 更新配置
   */
  updateConfig(config: Partial<AttractorAffectorConfig>): void {
    if (config.position) {
      this.position = { ...config.position }
    }
    if (config.strength !== undefined) {
      this.strength = config.strength
    }
    if (config.range !== undefined) {
      this.range = config.range
    }
    if (config.falloff) {
      this.falloff = config.falloff
    }
    if (config.enabled !== undefined) {
      this._enabled = config.enabled
    }
  }
}
