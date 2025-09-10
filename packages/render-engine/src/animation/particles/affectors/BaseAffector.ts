/**
 * 粒子影响器基类
 */

import { IParticle, IParticleAffector } from '../../types/ParticleTypes';

export abstract class BaseAffector implements IParticleAffector {
  abstract readonly type: string;
  protected _enabled: boolean = true;

  get enabled(): boolean {
    return this._enabled;
  }

  abstract affect(particle: IParticle, deltaTime: number): void;

  setEnabled(enabled: boolean): void {
    this._enabled = enabled;
  }

  /**
   * 检查是否应该影响这个粒子
   */
  protected shouldAffect(particle: IParticle): boolean {
    return this._enabled && particle.isAlive();
  }

  /**
   * 插值函数
   */
  protected lerp(a: number, b: number, t: number): number {
    return a + (b - a) * Math.max(0, Math.min(1, t));
  }

  /**
   * 基于生命周期的插值
   */
  protected lerpByLife(particle: IParticle, startValue: number, endValue: number): number {
    const lifeProgress = particle.getLifeProgress();
    return this.lerp(startValue, endValue, lifeProgress);
  }

  /**
   * 根据曲线获取值
   */
  protected evaluateCurve(curve: Array<{ time: number; value: number }>, time: number): number {
    if (curve.length === 0) return 0;
    if (curve.length === 1) return curve[0].value;

    // 如果时间超出范围，返回边界值
    if (time <= curve[0].time) return curve[0].value;
    if (time >= curve[curve.length - 1].time) return curve[curve.length - 1].value;

    // 找到对应的段进行插值
    for (let i = 0; i < curve.length - 1; i++) {
      const current = curve[i];
      const next = curve[i + 1];

      if (time >= current.time && time <= next.time) {
        const t = (time - current.time) / (next.time - current.time);
        return this.lerp(current.value, next.value, t);
      }
    }

    return curve[curve.length - 1].value;
  }

  /**
   * 规范化向量
   */
  protected normalize(vector: { x: number; y: number }): { x: number; y: number } {
    const length = Math.sqrt(vector.x * vector.x + vector.y * vector.y);
    if (length === 0) {
      return { x: 0, y: 0 };
    }
    return {
      x: vector.x / length,
      y: vector.y / length
    };
  }

  /**
   * 计算向量长度
   */
  protected vectorLength(vector: { x: number; y: number }): number {
    return Math.sqrt(vector.x * vector.x + vector.y * vector.y);
  }

  /**
   * 限制数值在范围内
   */
  protected clamp(value: number, min: number, max: number): number {
    return Math.max(min, Math.min(max, value));
  }
}