/**
 * 透明度变化影响器
 */

import { IParticle, AlphaAffectorConfig } from '../../types/ParticleTypes';
import { BaseAffector } from './BaseAffector';
import { EasingFunction, EasingFunctions } from '../../easing/EasingFunctions';

export class AlphaAffector extends BaseAffector {
  readonly type = 'alpha';
  
  private curve: Array<{ time: number; value: number }>;
  private easing: EasingFunction;
  private initialAlphas = new WeakMap<IParticle, number>();

  constructor(config: AlphaAffectorConfig) {
    super();
    this.curve = [...config.curve];
    this.easing = config.easing || EasingFunctions.linear;
    this._enabled = config.enabled !== false;

    // 确保曲线按时间排序
    this.curve.sort((a, b) => a.time - b.time);
  }

  affect(particle: IParticle, deltaTime: number): void {
    if (!this.shouldAffect(particle)) {
      return;
    }

    // 记录初始透明度
    if (!this.initialAlphas.has(particle)) {
      this.initialAlphas.set(particle, particle.alpha);
    }

    const initialAlpha = this.initialAlphas.get(particle)!;
    const lifeProgress = particle.getLifeProgress();
    
    // 应用缓动函数
    const easedProgress = this.easing(lifeProgress);
    
    // 从曲线获取透明度倍数
    const alphaMultiplier = this.evaluateCurve(this.curve, easedProgress);
    
    // 应用到粒子透明度
    particle.alpha = this.clamp(initialAlpha * alphaMultiplier, 0, 1);
  }

  /**
   * 设置曲线
   */
  setCurve(curve: Array<{ time: number; value: number }>): void {
    this.curve = [...curve];
    this.curve.sort((a, b) => a.time - b.time);
  }

  /**
   * 设置缓动函数
   */
  setEasing(easing: EasingFunction): void {
    this.easing = easing;
  }

  /**
   * 添加关键点
   */
  addKeypoint(time: number, value: number): void {
    this.curve.push({ time: this.clamp(time, 0, 1), value: this.clamp(value, 0, 1) });
    this.curve.sort((a, b) => a.time - b.time);
  }

  /**
   * 移除关键点
   */
  removeKeypoint(index: number): void {
    if (index >= 0 && index < this.curve.length) {
      this.curve.splice(index, 1);
    }
  }

  /**
   * 获取曲线
   */
  getCurve(): Array<{ time: number; value: number }> {
    return [...this.curve];
  }

  /**
   * 更新配置
   */
  updateConfig(config: Partial<AlphaAffectorConfig>): void {
    if (config.curve) {
      this.setCurve(config.curve);
    }
    if (config.easing) {
      this.easing = config.easing;
    }
    if (config.enabled !== undefined) {
      this._enabled = config.enabled;
    }
  }

  /**
   * 创建预设曲线
   */
  static createFadeIn(): Array<{ time: number; value: number }> {
    return [
      { time: 0, value: 0 },
      { time: 1, value: 1 }
    ];
  }

  static createFadeOut(): Array<{ time: number; value: number }> {
    return [
      { time: 0, value: 1 },
      { time: 1, value: 0 }
    ];
  }

  static createFadeInOut(): Array<{ time: number; value: number }> {
    return [
      { time: 0, value: 0 },
      { time: 0.5, value: 1 },
      { time: 1, value: 0 }
    ];
  }

  static createFlicker(): Array<{ time: number; value: number }> {
    return [
      { time: 0, value: 1 },
      { time: 0.1, value: 0.2 },
      { time: 0.2, value: 1 },
      { time: 0.3, value: 0.3 },
      { time: 0.4, value: 1 },
      { time: 0.6, value: 0.5 },
      { time: 0.8, value: 1 },
      { time: 1, value: 0 }
    ];
  }
}