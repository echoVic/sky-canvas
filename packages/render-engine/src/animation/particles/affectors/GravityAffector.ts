/**
 * 重力影响器
 */

import type { GravityAffectorConfig, IParticle, Vector2D } from '../../types/ParticleTypes'
import { BaseAffector } from './BaseAffector'

export class GravityAffector extends BaseAffector {
  readonly type = 'gravity'

  private force: Vector2D

  constructor(config: GravityAffectorConfig) {
    super()
    this.force = { ...config.force }
    this._enabled = config.enabled !== false
  }

  affect(particle: IParticle, deltaTime: number): void {
    if (!this.shouldAffect(particle)) {
      return
    }

    const dt = deltaTime / 1000 // 转换为秒

    // 应用重力加速度
    particle.acceleration.x += this.force.x
    particle.acceleration.y += this.force.y
  }

  /**
   * 设置重力
   */
  setForce(force: Vector2D): void {
    this.force = { ...force }
  }

  /**
   * 获取重力
   */
  getForce(): Vector2D {
    return { ...this.force }
  }

  /**
   * 更新配置
   */
  updateConfig(config: Partial<GravityAffectorConfig>): void {
    if (config.force) {
      this.force = { ...config.force }
    }
    if (config.enabled !== undefined) {
      this._enabled = config.enabled
    }
  }
}
