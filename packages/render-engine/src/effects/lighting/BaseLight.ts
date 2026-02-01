/**
 * 光源基础类
 */

import type { Point2D, Vector2D } from '../../animation/types/PathTypes'
import type {
  AnyLightConfig,
  ILight,
  LightingResult,
  LightType,
  MaterialProperties,
} from '../types/LightingTypes'

export abstract class BaseLight implements ILight {
  readonly id: string
  readonly type: LightType
  protected _config: AnyLightConfig
  protected _enabled: boolean = true

  constructor(type: LightType, config: AnyLightConfig) {
    this.id = `light_${Math.random().toString(36).substr(2, 9)}`
    this.type = type
    this._config = { ...config }
    this._enabled = config.enabled
  }

  get config(): AnyLightConfig {
    return { ...this._config }
  }

  get enabled(): boolean {
    return this._enabled
  }

  set enabled(value: boolean) {
    this._enabled = value
  }

  updateConfig(config: Partial<AnyLightConfig>): void {
    this._config = { ...this._config, ...config } as AnyLightConfig
  }

  abstract calculateLighting(
    position: Point2D,
    normal: Vector2D,
    viewDirection: Vector2D,
    material: MaterialProperties
  ): LightingResult

  abstract isPointLit(position: Point2D): boolean

  abstract getIntensityAtPoint(position: Point2D): number

  abstract getDirectionAtPoint(position: Point2D): Vector2D

  abstract clone(): ILight

  dispose(): void {
    // 默认清理实现
  }

  /**
   * 解析颜色字符串为RGB值
   */
  protected parseColor(color: string): { r: number; g: number; b: number } {
    // 简化实现，支持十六进制颜色
    if (color.startsWith('#')) {
      const hex = color.slice(1)
      if (hex.length === 3) {
        return {
          r: parseInt(hex[0] + hex[0], 16),
          g: parseInt(hex[1] + hex[1], 16),
          b: parseInt(hex[2] + hex[2], 16),
        }
      } else if (hex.length === 6) {
        return {
          r: parseInt(hex.slice(0, 2), 16),
          g: parseInt(hex.slice(2, 4), 16),
          b: parseInt(hex.slice(4, 6), 16),
        }
      }
    }

    // 默认白色
    return { r: 255, g: 255, b: 255 }
  }

  /**
   * 归一化向量
   */
  protected normalize(vector: Vector2D): Vector2D {
    const length = Math.sqrt(vector.x * vector.x + vector.y * vector.y)
    if (length === 0) {
      return { x: 0, y: 0 }
    }
    return { x: vector.x / length, y: vector.y / length }
  }

  /**
   * 计算两点间距离
   */
  protected distance(p1: Point2D, p2: Point2D): number {
    const dx = p1.x - p2.x
    const dy = p1.y - p2.y
    return Math.sqrt(dx * dx + dy * dy)
  }

  /**
   * 向量点积
   */
  protected dot(v1: Vector2D, v2: Vector2D): number {
    return v1.x * v2.x + v1.y * v2.y
  }

  /**
   * 计算反射向量
   */
  protected reflect(incident: Vector2D, normal: Vector2D): Vector2D {
    const dotProduct = this.dot(incident, normal)
    return {
      x: incident.x - 2 * dotProduct * normal.x,
      y: incident.y - 2 * dotProduct * normal.y,
    }
  }

  /**
   * 限制值在指定范围内
   */
  protected clamp(value: number, min: number = 0, max: number = 1): number {
    return Math.max(min, Math.min(max, value))
  }

  /**
   * 计算衰减
   */
  protected calculateAttenuation(distance: number, radius: number, falloff: number): number {
    if (distance >= radius) {
      return 0
    }

    const normalizedDistance = distance / radius
    return (1 - normalizedDistance) ** falloff
  }

  /**
   * 创建基础光照结果
   */
  protected createLightingResult(): LightingResult {
    return {
      ambient: { r: 0, g: 0, b: 0 },
      diffuse: { r: 0, g: 0, b: 0 },
      specular: { r: 0, g: 0, b: 0 },
      final: { r: 0, g: 0, b: 0 },
      intensity: 0,
    }
  }

  /**
   * 应用光源颜色和强度
   */
  protected applyLightColor(
    color: { r: number; g: number; b: number },
    intensity: number
  ): { r: number; g: number; b: number } {
    const lightColor = this.parseColor(this._config.color)
    const finalIntensity = intensity * this._config.intensity

    return {
      r: (color.r / 255) * (lightColor.r / 255) * finalIntensity,
      g: (color.g / 255) * (lightColor.g / 255) * finalIntensity,
      b: (color.b / 255) * (lightColor.b / 255) * finalIntensity,
    }
  }

  /**
   * 计算Lambert漫反射
   */
  protected calculateLambert(
    lightDirection: Vector2D,
    normal: Vector2D,
    material: MaterialProperties
  ): number {
    const normalizedLight = this.normalize(lightDirection)
    const normalizedNormal = this.normalize(normal)
    const lambertTerm = Math.max(0, this.dot(normalizedLight, normalizedNormal))
    return lambertTerm * material.diffuse
  }

  /**
   * 计算Phong镜面反射
   */
  protected calculatePhong(
    lightDirection: Vector2D,
    normal: Vector2D,
    viewDirection: Vector2D,
    material: MaterialProperties
  ): number {
    const normalizedLight = this.normalize(lightDirection)
    const normalizedNormal = this.normalize(normal)
    const normalizedView = this.normalize(viewDirection)

    const reflectionVector = this.reflect(
      { x: -normalizedLight.x, y: -normalizedLight.y },
      normalizedNormal
    )

    const specularTerm = Math.max(0, this.dot(reflectionVector, normalizedView))
    return specularTerm ** material.shininess * material.specular
  }

  /**
   * 计算Blinn-Phong镜面反射
   */
  protected calculateBlinnPhong(
    lightDirection: Vector2D,
    normal: Vector2D,
    viewDirection: Vector2D,
    material: MaterialProperties
  ): number {
    const normalizedLight = this.normalize(lightDirection)
    const normalizedNormal = this.normalize(normal)
    const normalizedView = this.normalize(viewDirection)

    // 计算半角向量
    const halfVector = this.normalize({
      x: (normalizedLight.x + normalizedView.x) / 2,
      y: (normalizedLight.y + normalizedView.y) / 2,
    })

    const specularTerm = Math.max(0, this.dot(halfVector, normalizedNormal))
    return specularTerm ** (material.shininess * 4) * material.specular
  }
}
