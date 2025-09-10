/**
 * 大小变化影响器
 */

import { IParticle, SizeAffectorConfig } from '../../types/ParticleTypes';
import { BaseAffector } from './BaseAffector';
import { EasingFunction, EasingFunctions } from '../../easing/EasingFunctions';

export class SizeAffector extends BaseAffector {
  readonly type = 'size';
  
  private curve: Array<{ time: number; value: number }>;
  private easing: EasingFunction;
  private initialSizes = new WeakMap<IParticle, number>();

  constructor(config: SizeAffectorConfig) {
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

    // 记录初始大小
    if (!this.initialSizes.has(particle)) {
      this.initialSizes.set(particle, particle.size);
    }

    const initialSize = this.initialSizes.get(particle)!;
    const lifeProgress = particle.getLifeProgress();
    
    // 应用缓动函数
    const easedProgress = this.easing(lifeProgress);
    
    // 从曲线获取缩放因子
    const scaleFactor = this.evaluateCurve(this.curve, easedProgress);
    
    // 应用到粒子大小
    particle.size = initialSize * scaleFactor;
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
    this.curve.push({ time, value });
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
  updateConfig(config: Partial<SizeAffectorConfig>): void {
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
  static createFadeInOut(): Array<{ time: number; value: number }> {
    return [
      { time: 0, value: 0 },
      { time: 0.2, value: 1 },
      { time: 0.8, value: 1 },
      { time: 1, value: 0 }
    ];
  }

  static createGrow(): Array<{ time: number; value: number }> {
    return [
      { time: 0, value: 0.1 },
      { time: 1, value: 2 }
    ];
  }

  static createShrink(): Array<{ time: number; value: number }> {
    return [
      { time: 0, value: 2 },
      { time: 1, value: 0.1 }
    ];
  }
}