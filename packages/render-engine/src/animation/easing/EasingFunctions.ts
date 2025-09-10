/**
 * 缓动函数库
 * 提供各种常用的缓动函数实现
 */

import { EasingType, EasingFunction } from '../types/AnimationTypes';

export class EasingFunctions {
  private static readonly functions = new Map<EasingType, EasingFunction>();

  static {
    this.initializeFunctions();
  }

  /**
   * 获取缓动函数
   */
  static get(type: EasingType): EasingFunction {
    const func = this.functions.get(type);
    if (!func) {
      console.warn(`Unknown easing type: ${type}, using linear`);
      return this.functions.get(EasingType.LINEAR)!;
    }
    return func;
  }

  /**
   * 注册自定义缓动函数
   */
  static register(type: EasingType, func: EasingFunction): void {
    this.functions.set(type, func);
  }

  /**
   * 获取所有可用的缓动类型
   */
  static getAvailableTypes(): EasingType[] {
    return Array.from(this.functions.keys());
  }

  private static initializeFunctions(): void {
    // 线性
    this.functions.set(EasingType.LINEAR, (t: number) => t);

    // 基础缓动
    this.functions.set(EasingType.EASE_IN, (t: number) => t * t);
    this.functions.set(EasingType.EASE_OUT, (t: number) => t * (2 - t));
    this.functions.set(EasingType.EASE_IN_OUT, (t: number) => 
      t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t
    );

    // 二次方缓动
    this.functions.set(EasingType.EASE_IN_QUAD, (t: number) => t * t);
    this.functions.set(EasingType.EASE_OUT_QUAD, (t: number) => t * (2 - t));
    this.functions.set(EasingType.EASE_IN_OUT_QUAD, (t: number) => 
      t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t
    );

    // 三次方缓动
    this.functions.set(EasingType.EASE_IN_CUBIC, (t: number) => t * t * t);
    this.functions.set(EasingType.EASE_OUT_CUBIC, (t: number) => 
      (--t) * t * t + 1
    );
    this.functions.set(EasingType.EASE_IN_OUT_CUBIC, (t: number) => 
      t < 0.5 ? 4 * t * t * t : (t - 1) * (2 * t - 2) * (2 * t - 2) + 1
    );

    // 四次方缓动
    this.functions.set(EasingType.EASE_IN_QUART, (t: number) => t * t * t * t);
    this.functions.set(EasingType.EASE_OUT_QUART, (t: number) => 
      1 - (--t) * t * t * t
    );
    this.functions.set(EasingType.EASE_IN_OUT_QUART, (t: number) => 
      t < 0.5 ? 8 * t * t * t * t : 1 - 8 * (--t) * t * t * t
    );

    // 回弹缓动
    this.functions.set(EasingType.EASE_IN_BACK, (t: number) => {
      const c1 = 1.70158;
      const c3 = c1 + 1;
      return c3 * t * t * t - c1 * t * t;
    });

    this.functions.set(EasingType.EASE_OUT_BACK, (t: number) => {
      const c1 = 1.70158;
      const c3 = c1 + 1;
      return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
    });

    this.functions.set(EasingType.EASE_IN_OUT_BACK, (t: number) => {
      const c1 = 1.70158;
      const c2 = c1 * 1.525;
      
      return t < 0.5
        ? (Math.pow(2 * t, 2) * ((c2 + 1) * 2 * t - c2)) / 2
        : (Math.pow(2 * t - 2, 2) * ((c2 + 1) * (t * 2 - 2) + c2) + 2) / 2;
    });

    // 弹跳缓动
    this.functions.set(EasingType.EASE_IN_BOUNCE, (t: number) => 
      1 - this.bounceOut(1 - t)
    );

    this.functions.set(EasingType.EASE_OUT_BOUNCE, (t: number) => 
      this.bounceOut(t)
    );

    this.functions.set(EasingType.EASE_IN_OUT_BOUNCE, (t: number) => 
      t < 0.5
        ? (1 - this.bounceOut(1 - 2 * t)) / 2
        : (1 + this.bounceOut(2 * t - 1)) / 2
    );
  }

  private static bounceOut(t: number): number {
    const n1 = 7.5625;
    const d1 = 2.75;

    if (t < 1 / d1) {
      return n1 * t * t;
    } else if (t < 2 / d1) {
      return n1 * (t -= 1.5 / d1) * t + 0.75;
    } else if (t < 2.5 / d1) {
      return n1 * (t -= 2.25 / d1) * t + 0.9375;
    } else {
      return n1 * (t -= 2.625 / d1) * t + 0.984375;
    }
  }

  /**
   * 创建贝塞尔缓动函数
   */
  static createBezier(x1: number, y1: number, x2: number, y2: number): EasingFunction {
    return (t: number) => {
      // 三次贝塞尔曲线的数值近似
      // P0 = (0, 0), P1 = (x1, y1), P2 = (x2, y2), P3 = (1, 1)
      const precision = 0.0001;
      let start = 0;
      let end = 1;
      let current = t;

      // 使用二分法寻找 t 值
      while (Math.abs(start - end) > precision) {
        const mid = (start + end) / 2;
        const x = this.cubicBezier(mid, x1, x2);
        
        if (x < t) {
          start = mid;
        } else {
          end = mid;
        }
        current = mid;
      }

      return this.cubicBezier(current, y1, y2);
    };
  }

  private static cubicBezier(t: number, p1: number, p2: number): number {
    const omt = 1 - t;
    return 3 * omt * omt * t * p1 + 3 * omt * t * t * p2 + t * t * t;
  }

  /**
   * 弹性缓动函数生成器
   */
  static createElastic(amplitude = 1, period = 0.3): {
    easeIn: EasingFunction;
    easeOut: EasingFunction;
    easeInOut: EasingFunction;
  } {
    const s = period / 4;

    return {
      easeIn: (t: number) => {
        if (t === 0) return 0;
        if (t === 1) return 1;
        return -(amplitude * Math.pow(2, 10 * (t - 1)) * Math.sin((t - 1 - s) * (2 * Math.PI) / period));
      },

      easeOut: (t: number) => {
        if (t === 0) return 0;
        if (t === 1) return 1;
        return amplitude * Math.pow(2, -10 * t) * Math.sin((t - s) * (2 * Math.PI) / period) + 1;
      },

      easeInOut: (t: number) => {
        if (t === 0) return 0;
        if (t === 1) return 1;
        t *= 2;
        if (t < 1) {
          return -0.5 * (amplitude * Math.pow(2, 10 * (t - 1)) * Math.sin((t - 1 - s) * (2 * Math.PI) / period));
        }
        return amplitude * Math.pow(2, -10 * (t - 1)) * Math.sin((t - 1 - s) * (2 * Math.PI) / period) * 0.5 + 1;
      }
    };
  }
}