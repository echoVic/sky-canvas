/**
 * 旋转影响器
 * 控制粒子自身的旋转行为
 */

import { EasingFunctions } from '../../easing/EasingFunctions'
import type { EasingFunction } from '../../types/AnimationTypes'
import type { IParticle, ParticleRange, RotationAffectorConfig } from '../../types/ParticleTypes'
import { BaseAffector } from './BaseAffector'

interface RotationAffectorConfigExtended extends RotationAffectorConfig {
  angularAcceleration?: ParticleRange<number>
  curve?: Array<{ time: number; value: number }>
  easing?: EasingFunction
  alignToVelocity?: boolean
}

export class RotationAffector extends BaseAffector {
  readonly type = 'rotation'

  private angularVelocityRange: ParticleRange<number>
  private angularAccelerationRange: ParticleRange<number>
  private curve: Array<{ time: number; value: number }> | null
  private easing: EasingFunction
  private alignToVelocity: boolean
  private initialAngularVelocities = new WeakMap<IParticle, number>()

  constructor(config: RotationAffectorConfig) {
    super()
    const extendedConfig = config as RotationAffectorConfigExtended
    this.angularVelocityRange = { ...config.angularVelocity }
    this.angularAccelerationRange = extendedConfig.angularAcceleration || { min: 0, max: 0 }
    this.curve = extendedConfig.curve ? [...extendedConfig.curve] : null
    this.easing = extendedConfig.easing || EasingFunctions.linear
    this.alignToVelocity = extendedConfig.alignToVelocity || false
    this._enabled = config.enabled !== false

    if (this.curve) {
      this.curve.sort((a, b) => a.time - b.time)
    }
  }

  affect(particle: IParticle, deltaTime: number): void {
    if (!this.shouldAffect(particle)) {
      return
    }

    const dt = deltaTime / 1000

    if (this.alignToVelocity) {
      this.alignParticleToVelocity(particle)
      return
    }

    if (!this.initialAngularVelocities.has(particle)) {
      const initialVelocity = this.randomInRange(this.angularVelocityRange)
      this.initialAngularVelocities.set(particle, initialVelocity)
      particle.angularVelocity = initialVelocity
    }

    if (this.curve) {
      const lifeProgress = particle.getLifeProgress()
      const easedProgress = this.easing(lifeProgress)
      const multiplier = this.evaluateCurve(this.curve, easedProgress)
      const initialVelocity =
        this.initialAngularVelocities.get(particle) ?? particle.angularVelocity
      particle.angularVelocity = initialVelocity * multiplier
    } else {
      const acceleration = this.randomInRange(this.angularAccelerationRange)
      particle.angularVelocity += acceleration * dt
    }

    particle.rotation += particle.angularVelocity * dt
  }

  private alignParticleToVelocity(particle: IParticle): void {
    const { x, y } = particle.velocity
    const speed = Math.sqrt(x * x + y * y)

    if (speed > 0.01) {
      particle.rotation = Math.atan2(y, x)
    }
  }

  private randomInRange(range: ParticleRange<number>): number {
    return range.min + Math.random() * (range.max - range.min)
  }

  setAngularVelocityRange(range: ParticleRange<number>): void {
    this.angularVelocityRange = { ...range }
  }

  getAngularVelocityRange(): ParticleRange<number> {
    return { ...this.angularVelocityRange }
  }

  setAngularAccelerationRange(range: ParticleRange<number>): void {
    this.angularAccelerationRange = { ...range }
  }

  getAngularAccelerationRange(): ParticleRange<number> {
    return { ...this.angularAccelerationRange }
  }

  setCurve(curve: Array<{ time: number; value: number }> | null): void {
    if (curve) {
      this.curve = [...curve]
      this.curve.sort((a, b) => a.time - b.time)
    } else {
      this.curve = null
    }
  }

  getCurve(): Array<{ time: number; value: number }> | null {
    return this.curve ? [...this.curve] : null
  }

  setEasing(easing: EasingFunction): void {
    this.easing = easing
  }

  setAlignToVelocity(align: boolean): void {
    this.alignToVelocity = align
  }

  isAlignedToVelocity(): boolean {
    return this.alignToVelocity
  }

  getConfig(): RotationAffectorConfigExtended {
    return {
      type: 'rotation',
      angularVelocity: { ...this.angularVelocityRange },
      angularAcceleration: { ...this.angularAccelerationRange },
      curve: this.curve ? [...this.curve] : undefined,
      alignToVelocity: this.alignToVelocity,
      enabled: this._enabled,
    }
  }

  updateConfig(config: Partial<RotationAffectorConfigExtended>): void {
    if (config.angularVelocity) {
      this.angularVelocityRange = { ...config.angularVelocity }
    }
    if (config.angularAcceleration) {
      this.angularAccelerationRange = { ...config.angularAcceleration }
    }
    if (config.curve !== undefined) {
      this.setCurve(config.curve || null)
    }
    if (config.easing) {
      this.easing = config.easing
    }
    if (config.alignToVelocity !== undefined) {
      this.alignToVelocity = config.alignToVelocity
    }
    if (config.enabled !== undefined) {
      this._enabled = config.enabled
    }
  }

  static createConstantSpin(speed: number): RotationAffectorConfigExtended {
    return {
      type: 'rotation',
      angularVelocity: { min: speed, max: speed },
      enabled: true,
    }
  }

  static createRandomSpin(minSpeed: number, maxSpeed: number): RotationAffectorConfigExtended {
    return {
      type: 'rotation',
      angularVelocity: { min: minSpeed, max: maxSpeed },
      enabled: true,
    }
  }

  static createSlowDown(): RotationAffectorConfigExtended {
    return {
      type: 'rotation',
      angularVelocity: { min: Math.PI * 4, max: Math.PI * 8 },
      curve: [
        { time: 0, value: 1 },
        { time: 0.5, value: 0.5 },
        { time: 1, value: 0 },
      ],
      enabled: true,
    }
  }

  static createSpeedUp(): RotationAffectorConfigExtended {
    return {
      type: 'rotation',
      angularVelocity: { min: Math.PI, max: Math.PI * 2 },
      curve: [
        { time: 0, value: 0.1 },
        { time: 0.5, value: 0.5 },
        { time: 1, value: 1 },
      ],
      enabled: true,
    }
  }

  static createAlignToDirection(): RotationAffectorConfigExtended {
    return {
      type: 'rotation',
      angularVelocity: { min: 0, max: 0 },
      alignToVelocity: true,
      enabled: true,
    }
  }
}
