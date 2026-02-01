/**
 * 风力影响器
 */

import type { IParticle, Vector2D, WindAffectorConfig } from '../../types/ParticleTypes'
import { BaseAffector } from './BaseAffector'

export class WindAffector extends BaseAffector {
  readonly type = 'wind'

  private force: Vector2D
  private turbulence: number
  private time: number = 0

  constructor(config: WindAffectorConfig) {
    super()
    this.force = { ...config.force }
    this.turbulence = config.turbulence || 0
    this._enabled = config.enabled !== false
  }

  affect(particle: IParticle, deltaTime: number): void {
    if (!this.shouldAffect(particle)) {
      return
    }

    const dt = deltaTime / 1000
    this.time += dt

    const windForce = { ...this.force }

    // 添加湍流效果
    if (this.turbulence > 0) {
      const turbulenceX = Math.sin(this.time * 2 + particle.position.x * 0.01) * this.turbulence
      const turbulenceY = Math.cos(this.time * 1.5 + particle.position.y * 0.01) * this.turbulence

      windForce.x += turbulenceX
      windForce.y += turbulenceY
    }

    // 考虑粒子质量
    const massEffect = 1 / particle.mass
    particle.applyForce({
      x: windForce.x * massEffect,
      y: windForce.y * massEffect,
    })
  }

  /**
   * 设置风力
   */
  setForce(force: Vector2D): void {
    this.force = { ...force }
  }

  /**
   * 设置湍流强度
   */
  setTurbulence(turbulence: number): void {
    this.turbulence = Math.max(0, turbulence)
  }

  /**
   * 获取配置
   */
  getConfig(): { force: Vector2D; turbulence: number } {
    return {
      force: { ...this.force },
      turbulence: this.turbulence,
    }
  }

  /**
   * 更新配置
   */
  updateConfig(config: Partial<WindAffectorConfig>): void {
    if (config.force) {
      this.force = { ...config.force }
    }
    if (config.turbulence !== undefined) {
      this.turbulence = config.turbulence
    }
    if (config.enabled !== undefined) {
      this._enabled = config.enabled
    }
  }
}
