/**
 * 涡流影响器
 * 让粒子围绕中心点旋转，产生漩涡效果
 */

import type { IParticle, Point2D, VortexAffectorConfig } from '../../types/ParticleTypes'
import { BaseAffector } from './BaseAffector'

interface VortexAffectorConfigExtended extends VortexAffectorConfig {
  inwardForce?: number
  falloff?: 'linear' | 'quadratic' | 'constant'
}

export class VortexAffector extends BaseAffector {
  readonly type = 'vortex'

  private center: Point2D
  private strength: number
  private range: number
  private inwardForce: number
  private falloff: 'linear' | 'quadratic' | 'constant'

  constructor(config: VortexAffectorConfig) {
    super()
    this.center = { ...config.center }
    this.strength = config.strength
    this.range = config.range || Infinity
    this.inwardForce = (config as VortexAffectorConfigExtended).inwardForce || 0
    this.falloff = (config as VortexAffectorConfigExtended).falloff || 'linear'
    this._enabled = config.enabled !== false
  }

  affect(particle: IParticle, _deltaTime: number): void {
    if (!this.shouldAffect(particle)) {
      return
    }

    const dx = particle.position.x - this.center.x
    const dy = particle.position.y - this.center.y
    const distance = Math.sqrt(dx * dx + dy * dy)

    if (distance > this.range || distance < 0.1) {
      return
    }

    let effectStrength = this.strength

    switch (this.falloff) {
      case 'linear':
        effectStrength *= 1 - distance / this.range
        break
      case 'quadratic':
        effectStrength *= 1 / (1 + distance * distance * 0.01)
        break
      case 'constant':
        break
    }

    const normalizedX = dx / distance
    const normalizedY = dy / distance

    const tangentX = -normalizedY
    const tangentY = normalizedX

    const tangentialForce = {
      x: tangentX * effectStrength,
      y: tangentY * effectStrength,
    }

    const inward = {
      x: -normalizedX * this.inwardForce * effectStrength,
      y: -normalizedY * this.inwardForce * effectStrength,
    }

    particle.applyForce({
      x: tangentialForce.x + inward.x,
      y: tangentialForce.y + inward.y,
    })
  }

  setCenter(center: Point2D): void {
    this.center = { ...center }
  }

  getCenter(): Point2D {
    return { ...this.center }
  }

  setStrength(strength: number): void {
    this.strength = strength
  }

  getStrength(): number {
    return this.strength
  }

  setRange(range: number): void {
    this.range = Math.max(0, range)
  }

  getRange(): number {
    return this.range
  }

  setInwardForce(force: number): void {
    this.inwardForce = force
  }

  getInwardForce(): number {
    return this.inwardForce
  }

  setFalloff(falloff: 'linear' | 'quadratic' | 'constant'): void {
    this.falloff = falloff
  }

  getFalloff(): 'linear' | 'quadratic' | 'constant' {
    return this.falloff
  }

  getConfig(): VortexAffectorConfigExtended {
    return {
      type: 'vortex',
      center: { ...this.center },
      strength: this.strength,
      range: this.range,
      inwardForce: this.inwardForce,
      falloff: this.falloff,
      enabled: this._enabled,
    }
  }

  updateConfig(config: Partial<VortexAffectorConfigExtended>): void {
    if (config.center) {
      this.center = { ...config.center }
    }
    if (config.strength !== undefined) {
      this.strength = config.strength
    }
    if (config.range !== undefined) {
      this.range = config.range
    }
    if (config.inwardForce !== undefined) {
      this.inwardForce = config.inwardForce
    }
    if (config.falloff) {
      this.falloff = config.falloff
    }
    if (config.enabled !== undefined) {
      this._enabled = config.enabled
    }
  }

  static createWhirlpool(center: Point2D, strength: number = 100): VortexAffectorConfigExtended {
    return {
      type: 'vortex',
      center,
      strength,
      range: 300,
      inwardForce: 0.3,
      falloff: 'quadratic',
      enabled: true,
    }
  }

  static createTornado(center: Point2D, strength: number = 200): VortexAffectorConfigExtended {
    return {
      type: 'vortex',
      center,
      strength,
      range: 500,
      inwardForce: 0.1,
      falloff: 'linear',
      enabled: true,
    }
  }

  static createGentleSwirl(center: Point2D, strength: number = 30): VortexAffectorConfigExtended {
    return {
      type: 'vortex',
      center,
      strength,
      range: 200,
      inwardForce: 0,
      falloff: 'constant',
      enabled: true,
    }
  }
}
