/**
 * 颜色渐变影响器
 * 支持从起始颜色到结束颜色的渐变，基于粒子生命周期
 */

import { EasingFunctions } from '../../easing/EasingFunctions'
import type { EasingFunction } from '../../types/AnimationTypes'
import type { ColorAffectorConfig, IParticle } from '../../types/ParticleTypes'
import { BaseAffector } from './BaseAffector'

interface ColorRGBA {
  r: number
  g: number
  b: number
  a: number
}

export class ColorAffector extends BaseAffector {
  readonly type = 'color'

  private gradient: Array<{ time: number; color: string }>
  private easing: EasingFunction
  private parsedColors: Array<{ time: number; rgba: ColorRGBA }> = []

  constructor(config: ColorAffectorConfig) {
    super()
    this.gradient = [...config.gradient]
    this.easing = config.easing || EasingFunctions.linear
    this._enabled = config.enabled !== false

    this.gradient.sort((a, b) => a.time - b.time)
    this.parseColors()
  }

  private parseColors(): void {
    this.parsedColors = this.gradient.map((item) => ({
      time: item.time,
      rgba: this.parseColor(item.color),
    }))
  }

  private parseColor(color: string): ColorRGBA {
    if (color.startsWith('#')) {
      return this.parseHexColor(color)
    }
    if (color.startsWith('rgb')) {
      return this.parseRgbColor(color)
    }
    return { r: 255, g: 255, b: 255, a: 1 }
  }

  private parseHexColor(hex: string): ColorRGBA {
    let r = 0,
      g = 0,
      b = 0,
      a = 1

    if (hex.length === 4) {
      r = parseInt(hex[1] + hex[1], 16)
      g = parseInt(hex[2] + hex[2], 16)
      b = parseInt(hex[3] + hex[3], 16)
    } else if (hex.length === 7) {
      r = parseInt(hex.slice(1, 3), 16)
      g = parseInt(hex.slice(3, 5), 16)
      b = parseInt(hex.slice(5, 7), 16)
    } else if (hex.length === 9) {
      r = parseInt(hex.slice(1, 3), 16)
      g = parseInt(hex.slice(3, 5), 16)
      b = parseInt(hex.slice(5, 7), 16)
      a = parseInt(hex.slice(7, 9), 16) / 255
    }

    return { r, g, b, a }
  }

  private parseRgbColor(rgb: string): ColorRGBA {
    const match = rgb.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/)
    if (match) {
      return {
        r: parseInt(match[1], 10),
        g: parseInt(match[2], 10),
        b: parseInt(match[3], 10),
        a: match[4] ? parseFloat(match[4]) : 1,
      }
    }
    return { r: 255, g: 255, b: 255, a: 1 }
  }

  private rgbaToString(rgba: ColorRGBA): string {
    return `rgba(${Math.round(rgba.r)}, ${Math.round(rgba.g)}, ${Math.round(rgba.b)}, ${rgba.a.toFixed(3)})`
  }

  private interpolateColor(color1: ColorRGBA, color2: ColorRGBA, t: number): ColorRGBA {
    return {
      r: this.lerp(color1.r, color2.r, t),
      g: this.lerp(color1.g, color2.g, t),
      b: this.lerp(color1.b, color2.b, t),
      a: this.lerp(color1.a, color2.a, t),
    }
  }

  private evaluateGradient(time: number): ColorRGBA {
    if (this.parsedColors.length === 0) {
      return { r: 255, g: 255, b: 255, a: 1 }
    }
    if (this.parsedColors.length === 1) {
      return { ...this.parsedColors[0].rgba }
    }

    if (time <= this.parsedColors[0].time) {
      return { ...this.parsedColors[0].rgba }
    }
    if (time >= this.parsedColors[this.parsedColors.length - 1].time) {
      return { ...this.parsedColors[this.parsedColors.length - 1].rgba }
    }

    for (let i = 0; i < this.parsedColors.length - 1; i++) {
      const current = this.parsedColors[i]
      const next = this.parsedColors[i + 1]

      if (time >= current.time && time <= next.time) {
        const t = (time - current.time) / (next.time - current.time)
        return this.interpolateColor(current.rgba, next.rgba, t)
      }
    }

    return { ...this.parsedColors[this.parsedColors.length - 1].rgba }
  }

  affect(particle: IParticle, _deltaTime: number): void {
    if (!this.shouldAffect(particle)) {
      return
    }

    const lifeProgress = particle.getLifeProgress()
    const easedProgress = this.easing(lifeProgress)
    const color = this.evaluateGradient(easedProgress)

    particle.color = this.rgbaToString(color)
  }

  setGradient(gradient: Array<{ time: number; color: string }>): void {
    this.gradient = [...gradient]
    this.gradient.sort((a, b) => a.time - b.time)
    this.parseColors()
  }

  setEasing(easing: EasingFunction): void {
    this.easing = easing
  }

  addColorStop(time: number, color: string): void {
    this.gradient.push({ time: this.clamp(time, 0, 1), color })
    this.gradient.sort((a, b) => a.time - b.time)
    this.parseColors()
  }

  removeColorStop(index: number): void {
    if (index >= 0 && index < this.gradient.length) {
      this.gradient.splice(index, 1)
      this.parseColors()
    }
  }

  getGradient(): Array<{ time: number; color: string }> {
    return [...this.gradient]
  }

  updateConfig(config: Partial<ColorAffectorConfig>): void {
    if (config.gradient) {
      this.setGradient(config.gradient)
    }
    if (config.easing) {
      this.easing = config.easing
    }
    if (config.enabled !== undefined) {
      this._enabled = config.enabled
    }
  }

  static createFireGradient(): Array<{ time: number; color: string }> {
    return [
      { time: 0, color: '#FFFF00' },
      { time: 0.3, color: '#FF8800' },
      { time: 0.6, color: '#FF4400' },
      { time: 1, color: '#440000' },
    ]
  }

  static createRainbowGradient(): Array<{ time: number; color: string }> {
    return [
      { time: 0, color: '#FF0000' },
      { time: 0.17, color: '#FF8800' },
      { time: 0.33, color: '#FFFF00' },
      { time: 0.5, color: '#00FF00' },
      { time: 0.67, color: '#0088FF' },
      { time: 0.83, color: '#8800FF' },
      { time: 1, color: '#FF00FF' },
    ]
  }

  static createSmokeGradient(): Array<{ time: number; color: string }> {
    return [
      { time: 0, color: '#FFFFFF' },
      { time: 0.5, color: '#888888' },
      { time: 1, color: '#333333' },
    ]
  }

  static createFadeToTransparent(startColor: string): Array<{ time: number; color: string }> {
    return [
      { time: 0, color: startColor },
      { time: 1, color: 'rgba(0, 0, 0, 0)' },
    ]
  }
}
