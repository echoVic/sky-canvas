/**
 * 属性动画
 * 对单个对象属性进行补间动画
 */

import { getNestedProperty, setNestedProperty } from '../../utils/ObjectUtils'
import { BaseAnimation } from '../core/BaseAnimation'
import type { PropertyAnimationConfig } from '../types/AnimationTypes'

export class PropertyAnimation extends BaseAnimation {
  private target: Record<string, any>
  private property: string
  private fromValue: number
  private toValue: number
  private initialValue: number | undefined

  constructor(config: PropertyAnimationConfig) {
    super(config)

    this.target = config.target
    this.property = config.property
    this.toValue = config.to

    // 如果未指定 from 值，则使用目标对象当前的属性值
    if (config.from !== undefined) {
      this.fromValue = config.from
    } else {
      this.fromValue = this.getCurrentPropertyValue()
    }

    this.initialValue = this.getCurrentPropertyValue()
  }

  protected applyAnimation(progress: number): void {
    if (!this.target || typeof this.target !== 'object') {
      console.warn(`Animation target is not valid for property: ${this.property}`)
      return
    }

    // 线性插值计算当前值
    const currentValue = this.lerp(this.fromValue, this.toValue, progress)

    try {
      // 支持嵌套属性（如 "transform.x"）
      setNestedProperty(this.target, this.property, currentValue)
    } catch (error) {
      console.error(`Failed to set property ${this.property}:`, error)
    }
  }

  /**
   * 线性插值
   */
  private lerp(from: number, to: number, t: number): number {
    return from + (to - from) * t
  }

  /**
   * 获取当前属性值
   */
  private getCurrentPropertyValue(): number {
    try {
      const value = getNestedProperty(this.target, this.property)
      return typeof value === 'number' ? value : 0
    } catch {
      return 0
    }
  }

  /**
   * 重置属性到初始值
   */
  reset(): this {
    if (this.initialValue !== undefined) {
      setNestedProperty(this.target, this.property, this.initialValue)
    }
    return this
  }

  /**
   * 设置新的目标值
   */
  to(value: number): this {
    this.toValue = value
    return this
  }

  /**
   * 设置新的起始值
   */
  from(value: number): this {
    this.fromValue = value
    return this
  }

  /**
   * 获取属性信息
   */
  getPropertyInfo() {
    return {
      target: this.target,
      property: this.property,
      from: this.fromValue,
      to: this.toValue,
      current: this.getCurrentPropertyValue(),
    }
  }

  /**
   * 创建反向动画
   */
  reverse(): PropertyAnimation {
    return new PropertyAnimation({
      duration: this.duration,
      target: this.target,
      property: this.property,
      from: this.toValue,
      to: this.fromValue,
      easing: this._easingFunction,
    })
  }
}
