/**
 * 多属性动画
 * 同时对多个属性进行补间动画
 */

import { BaseAnimation } from '../core/BaseAnimation';
import { MultiPropertyAnimationConfig, AnimationState } from '../types/AnimationTypes';
import { getNestedProperty, setNestedProperty } from '../../../utils/ObjectUtils';

interface PropertyState {
  property: string;
  fromValue: number;
  toValue: number;
  initialValue: number;
}

export class MultiPropertyAnimation extends BaseAnimation {
  private target: Record<string, any>;
  private properties: PropertyState[] = [];

  constructor(config: MultiPropertyAnimationConfig) {
    super(config);
    
    this.target = config.target;
    
    // 验证目标对象
    if (!this.target || typeof this.target !== 'object') {
      console.warn('Animation target is not valid');
      return;
    }
    
    // 初始化属性状态
    for (const [property, values] of Object.entries(config.properties)) {
      const currentValue = this.getCurrentPropertyValue(property);
      
      this.properties.push({
        property,
        fromValue: values.from !== undefined ? values.from : currentValue,
        toValue: values.to,
        initialValue: currentValue
      });
    }
  }

  protected applyAnimation(progress: number): void {
    if (!this.target || typeof this.target !== 'object') {
      console.warn(`Animation target is not valid`);
      return;
    }

    // 同时更新所有属性
    for (const propState of this.properties) {
      const currentValue = this.lerp(
        propState.fromValue,
        propState.toValue,
        progress
      );
      
      try {
        setNestedProperty(this.target, propState.property, currentValue);
      } catch (error) {
        console.error(`Failed to set property ${propState.property}:`, error);
      }
    }
  }

  /**
   * 线性插值
   */
  private lerp(from: number, to: number, t: number): number {
    return from + (to - from) * t;
  }

  /**
   * 获取当前属性值
   */
  private getCurrentPropertyValue(property: string): number {
    try {
      const value = getNestedProperty(this.target, property);
      return typeof value === 'number' ? value : 0;
    } catch {
      return 0;
    }
  }


  /**
   * 重置所有属性到初始值
   */
  reset(): this {
    // 停止动画并重置状态
    this.stop();
    this._state = AnimationState.IDLE;
    this._currentTime = 0;
    this._currentLoopCount = 0;
    this._isReversed = false;
    
    for (const propState of this.properties) {
      setNestedProperty(
        this.target,
        propState.property,
        propState.initialValue
      );
    }
    return this;
  }

  /**
   * 添加新的属性动画
   */
  addProperty(
    property: string,
    to: number,
    from?: number
  ): this {
    // 检查属性是否已存在
    const existingIndex = this.properties.findIndex(p => p.property === property);
    
    if (existingIndex !== -1) {
      // 更新已存在的属性
      const currentValue = this.getCurrentPropertyValue(property);
      this.properties[existingIndex] = {
        property,
        fromValue: from !== undefined ? from : currentValue,
        toValue: to,
        initialValue: this.properties[existingIndex].initialValue // 保持原始初始值
      };
    } else {
      // 添加新属性
      const currentValue = this.getCurrentPropertyValue(property);
      this.properties.push({
        property,
        fromValue: from !== undefined ? from : currentValue,
        toValue: to,
        initialValue: currentValue
      });
    }
    
    return this;
  }

  /**
   * 移除属性动画
   */
  removeProperty(property: string): this {
    this.properties = this.properties.filter(
      prop => prop.property !== property
    );
    return this;
  }

  /**
   * 更新属性的目标值
   */
  updateProperty(
    property: string,
    to: number,
    from?: number
  ): this {
    const propState = this.properties.find(p => p.property === property);
    if (propState) {
      propState.toValue = to;
      if (from !== undefined) {
        propState.fromValue = from;
      }
    } else {
      this.addProperty(property, to, from);
    }
    return this;
  }

  /**
   * 获取所有属性信息
   */
  getPropertiesInfo() {
    return this.properties.map(propState => ({
      property: propState.property,
      from: propState.fromValue,
      to: propState.toValue,
      current: this.getCurrentPropertyValue(propState.property)
    }));
  }

  /**
   * 获取特定属性信息
   */
  getPropertyInfo(property: string) {
    const propState = this.properties.find(p => p.property === property);
    if (!propState) {
      return null;
    }

    return {
      property: propState.property,
      from: propState.fromValue,
      to: propState.toValue,
      current: this.getCurrentPropertyValue(propState.property)
    };
  }

  /**
   * 创建反向动画
   */
  reverse(): MultiPropertyAnimation {
    const reversedProperties: Record<string, { from?: number; to: number }> = {};
    
    for (const propState of this.properties) {
      reversedProperties[propState.property] = {
        from: propState.toValue,
        to: propState.fromValue
      };
    }

    return new MultiPropertyAnimation({
      duration: this.duration,
      target: this.target,
      properties: reversedProperties,
      easing: this._easingFunction
    });
  }
}