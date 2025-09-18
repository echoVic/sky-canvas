/**
 * 方向光实现
 */

import { BaseLight } from './BaseLight';
import {
  LightType,
  DirectionalLightConfig,
  MaterialProperties,
  LightingResult,
  ILight
} from '../types/LightingTypes';
import { Point2D, Vector2D } from '../../animation/types/PathTypes';

export class DirectionalLight extends BaseLight {
  protected _config: DirectionalLightConfig;

  constructor(config: DirectionalLightConfig) {
    super(LightType.DIRECTIONAL, config);
    this._config = config;
  }

  calculateLighting(
    position: Point2D,
    normal: Vector2D,
    viewDirection: Vector2D,
    material: MaterialProperties
  ): LightingResult {
    if (!this._enabled) {
      return this.createLightingResult();
    }

    const result = this.createLightingResult();
    const lightDirection = this.normalize(this._config.direction);
    
    // 环境光分量
    const ambientColor = this.applyLightColor(
      { r: 255, g: 255, b: 255 },
      material.ambient
    );
    result.ambient = ambientColor;

    // 漫反射分量
    const diffuseIntensity = this.calculateLambert(lightDirection, normal, material);
    if (diffuseIntensity > 0) {
      result.diffuse = this.applyLightColor(
        { r: 255, g: 255, b: 255 },
        diffuseIntensity
      );
    }

    // 镜面反射分量
    const specularIntensity = this.calculateBlinnPhong(
      lightDirection,
      normal,
      viewDirection,
      material
    );
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

    result.intensity = this._config.intensity;
    return result;
  }

  isPointLit(position: Point2D): boolean {
    // 方向光照亮所有点
    return this._enabled;
  }

  getIntensityAtPoint(position: Point2D): number {
    return this._enabled ? this._config.intensity : 0;
  }

  getDirectionAtPoint(position: Point2D): Vector2D {
    return this.normalize(this._config.direction);
  }

  clone(): ILight {
    return new DirectionalLight({ ...this._config });
  }

  /**
   * 计算阴影方向
   */
  getShadowDirection(): Vector2D {
    return {
      x: -this._config.direction.x,
      y: -this._config.direction.y
    };
  }

  /**
   * 计算阴影距离
   */
  getShadowDistance(): number {
    return this._config.shadowDistance;
  }
}