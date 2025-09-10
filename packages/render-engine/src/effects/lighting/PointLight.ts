/**
 * 点光源实现
 */

import { BaseLight } from './BaseLight';
import {
  LightType,
  PointLightConfig,
  MaterialProperties,
  LightingResult,
  ILight
} from '../types/LightingTypes';
import { Point2D, Vector2D } from '../../animation/types/PathTypes';

export class PointLight extends BaseLight {
  protected _config: PointLightConfig;

  constructor(config: PointLightConfig) {
    super(LightType.POINT, config);
    this._config = config;
  }

  calculateLighting(
    position: Point2D,
    normal: Vector2D,
    viewDirection: Vector2D,
    material: MaterialProperties
  ): LightingResult {
    if (!this._enabled || !this.isPointLit(position)) {
      return this.createLightingResult();
    }

    const result = this.createLightingResult();
    const distance = this.distance(this._config.position, position);
    const attenuation = this.calculateAttenuation(distance, this._config.radius, this._config.falloff);
    
    if (attenuation <= 0) {
      return result;
    }

    // 计算光线方向（从光源到着色点）
    const lightDirection = {
      x: position.x - this._config.position.x,
      y: position.y - this._config.position.y
    };
    const normalizedLightDirection = this.normalize(lightDirection);

    // 环境光分量
    const ambientIntensity = material.ambient * attenuation;
    result.ambient = this.applyLightColor(
      { r: 255, g: 255, b: 255 },
      ambientIntensity
    );

    // 漫反射分量
    const diffuseIntensity = this.calculateLambert(
      { x: -normalizedLightDirection.x, y: -normalizedLightDirection.y },
      normal,
      material
    ) * attenuation;
    
    if (diffuseIntensity > 0) {
      result.diffuse = this.applyLightColor(
        { r: 255, g: 255, b: 255 },
        diffuseIntensity
      );
    }

    // 镜面反射分量
    const specularIntensity = this.calculateBlinnPhong(
      { x: -normalizedLightDirection.x, y: -normalizedLightDirection.y },
      normal,
      viewDirection,
      material
    ) * attenuation;
    
    if (specularIntensity > 0) {
      result.specular = this.applyLightColor(
        { r: 255, g: 255, b: 255 },
        specularIntensity
      );
    }

    // 合并所有光照分量
    result.final = {
      r: this.clamp(result.ambient.r + result.diffuse.r + result.specular.r),
      g: this.clamp(result.ambient.g + result.diffuse.g + result.specular.g),
      b: this.clamp(result.ambient.b + result.diffuse.b + result.specular.b)
    };

    result.intensity = this._config.intensity * attenuation;
    return result;
  }

  isPointLit(position: Point2D): boolean {
    if (!this._enabled) {
      return false;
    }
    
    const distance = this.distance(this._config.position, position);
    return distance <= this._config.radius;
  }

  getIntensityAtPoint(position: Point2D): number {
    if (!this.isPointLit(position)) {
      return 0;
    }
    
    const distance = this.distance(this._config.position, position);
    const attenuation = this.calculateAttenuation(distance, this._config.radius, this._config.falloff);
    return this._config.intensity * attenuation;
  }

  getDirectionAtPoint(position: Point2D): Vector2D {
    return this.normalize({
      x: this._config.position.x - position.x,
      y: this._config.position.y - position.y
    });
  }

  clone(): ILight {
    return new PointLight({ ...this._config });
  }

  /**
   * 获取光源位置
   */
  getPosition(): Point2D {
    return { ...this._config.position };
  }

  /**
   * 设置光源位置
   */
  setPosition(position: Point2D): void {
    this._config.position = { ...position };
  }

  /**
   * 获取光源半径
   */
  getRadius(): number {
    return this._config.radius;
  }

  /**
   * 设置光源半径
   */
  setRadius(radius: number): void {
    this._config.radius = Math.max(0, radius);
  }

  /**
   * 获取衰减系数
   */
  getFalloff(): number {
    return this._config.falloff;
  }

  /**
   * 设置衰减系数
   */
  setFalloff(falloff: number): void {
    this._config.falloff = Math.max(0, falloff);
  }
}