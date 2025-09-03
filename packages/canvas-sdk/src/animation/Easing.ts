/**
 * 缓动函数接口
 */
export type EasingFunction = (t: number) => number;

/**
 * 缓动函数库
 */
export class Easing {
  // 线性缓动
  static linear: EasingFunction = (t: number) => t;
  
  // 二次缓动
  static quadIn: EasingFunction = (t: number) => t * t;
  static quadOut: EasingFunction = (t: number) => t * (2 - t);
  static quadInOut: EasingFunction = (t: number) => 
    t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
  
  // 三次缓动
  static cubicIn: EasingFunction = (t: number) => t * t * t;
  static cubicOut: EasingFunction = (t: number) => (--t) * t * t + 1;
  static cubicInOut: EasingFunction = (t: number) => 
    t < 0.5 ? 4 * t * t * t : (t - 1) * (2 * t - 2) * (2 * t - 2) + 1;
  
  // 四次缓动
  static quartIn: EasingFunction = (t: number) => t * t * t * t;
  static quartOut: EasingFunction = (t: number) => 1 - (--t) * t * t * t;
  static quartInOut: EasingFunction = (t: number) => 
    t < 0.5 ? 8 * t * t * t * t : 1 - 8 * (--t) * t * t * t;
  
  // 正弦缓动
  static sineIn: EasingFunction = (t: number) => 1 - Math.cos(t * Math.PI / 2);
  static sineOut: EasingFunction = (t: number) => Math.sin(t * Math.PI / 2);
  static sineInOut: EasingFunction = (t: number) => 
    -0.5 * (Math.cos(Math.PI * t) - 1);
  
  // 指数缓动
  static expoIn: EasingFunction = (t: number) => 
    t === 0 ? 0 : Math.pow(1024, t - 1);
  static expoOut: EasingFunction = (t: number) => 
    t === 1 ? 1 : 1 - Math.pow(2, -10 * t);
  static expoInOut: EasingFunction = (t: number) => {
    if (t === 0) return 0;
    if (t === 1) return 1;
    if ((t *= 2) < 1) return 0.5 * Math.pow(1024, t - 1);
    return 0.5 * (-Math.pow(2, -10 * (t - 1)) + 2);
  };
  
  // 弹跳缓动
  static bounceOut: EasingFunction = (t: number) => {
    if (t < (1 / 2.75)) {
      return 7.5625 * t * t;
    } else if (t < (2 / 2.75)) {
      return 7.5625 * (t -= (1.5 / 2.75)) * t + 0.75;
    } else if (t < (2.5 / 2.75)) {
      return 7.5625 * (t -= (2.25 / 2.75)) * t + 0.9375;
    } else {
      return 7.5625 * (t -= (2.625 / 2.75)) * t + 0.984375;
    }
  };
  
  static bounceIn: EasingFunction = (t: number) => 1 - Easing.bounceOut(1 - t);
  
  static bounceInOut: EasingFunction = (t: number) => 
    t < 0.5 
      ? Easing.bounceIn(t * 2) * 0.5 
      : Easing.bounceOut(t * 2 - 1) * 0.5 + 0.5;
  
  // 弹性缓动
  static elasticIn: EasingFunction = (t: number) => {
    if (t === 0 || t === 1) return t;
    return -Math.pow(2, 10 * (t - 1)) * Math.sin((t - 1.1) * 5 * Math.PI);
  };
  
  static elasticOut: EasingFunction = (t: number) => {
    if (t === 0 || t === 1) return t;
    return Math.pow(2, -10 * t) * Math.sin((t - 0.1) * 5 * Math.PI) + 1;
  };
  
  static elasticInOut: EasingFunction = (t: number) => {
    if (t === 0 || t === 1) return t;
    t *= 2;
    if (t < 1) {
      return -0.5 * Math.pow(2, 10 * (t - 1)) * Math.sin((t - 1.1) * 5 * Math.PI);
    }
    return 0.5 * Math.pow(2, -10 * (t - 1)) * Math.sin((t - 1.1) * 5 * Math.PI) + 1;
  };
  
  // 循环缓动
  static circIn: EasingFunction = (t: number) => 1 - Math.sqrt(1 - t * t);
  static circOut: EasingFunction = (t: number) => Math.sqrt(1 - (--t) * t);
  static circInOut: EasingFunction = (t: number) => {
    if ((t *= 2) < 1) return -0.5 * (Math.sqrt(1 - t * t) - 1);
    return 0.5 * (Math.sqrt(1 - (t -= 2) * t) + 1);
  };
  
  // 获取缓动函数
  static get(easingName: string): EasingFunction {
    const easing = (Easing as any)[easingName];
    if (typeof easing === 'function') {
      return easing;
    }
    return Easing.linear;
  }
}