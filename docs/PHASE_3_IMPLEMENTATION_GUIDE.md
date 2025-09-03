# 第三阶段实施指南：动画系统

## 1. 补间动画引擎

### 1.1 创建缓动函数库

**文件**: `packages/canvas-sdk/src/animation/Easing.ts`

```typescript
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
```

### 1.2 创建动画类

**文件**: `packages/canvas-sdk/src/animation/Animation.ts`

```typescript
import { Easing, EasingFunction } from './Easing';
import { IShape } from '../scene/IShape';

/**
 * 动画配置接口
 */
export interface AnimationConfig {
  duration?: number;
  delay?: number;
  easing?: EasingFunction | string;
  repeat?: number;
  yoyo?: boolean;
  onStart?: () => void;
  onUpdate?: (progress: number) => void;
  onComplete?: () => void;
  onRepeat?: () => void;
}

/**
 * 动画属性接口
 */
export interface AnimatedProps {
  [key: string]: any;
}

/**
 * 动画类
 */
export class Animation {
  private target: IShape;
  private fromProps: AnimatedProps;
  private toProps: AnimatedProps;
  private config: Required<AnimationConfig>;
  private startTime: number = 0;
  private elapsed: number = 0;
  private isPlaying: boolean = false;
  private isPaused: boolean = false;
  private repeatCount: number = 0;
  private reversed: boolean = false;
  
  constructor(
    target: IShape,
    fromProps: AnimatedProps,
    toProps: AnimatedProps,
    config: AnimationConfig = {}
  ) {
    this.target = target;
    this.fromProps = fromProps;
    this.toProps = toProps;
    
    // 默认配置
    this.config = {
      duration: config.duration || 1000,
      delay: config.delay || 0,
      easing: typeof config.easing === 'string' 
        ? Easing.get(config.easing) 
        : config.easing || Easing.linear,
      repeat: config.repeat || 0,
      yoyo: config.yoyo || false,
      onStart: config.onStart || (() => {}),
      onUpdate: config.onUpdate || (() => {}),
      onComplete: config.onComplete || (() => {}),
      onRepeat: config.onRepeat || (() => {})
    };
  }
  
  /**
   * 播放动画
   */
  play(): void {
    if (this.isPlaying && !this.isPaused) return;
    
    this.isPlaying = true;
    this.isPaused = false;
    this.startTime = performance.now() - this.elapsed;
    
    if (this.elapsed === 0) {
      this.config.onStart();
    }
  }
  
  /**
   * 暂停动画
   */
  pause(): void {
    if (!this.isPlaying) return;
    
    this.isPaused = true;
    this.isPlaying = false;
  }
  
  /**
   * 停止动画
   */
  stop(): void {
    this.isPlaying = false;
    this.isPaused = false;
    this.elapsed = 0;
  }
  
  /**
   * 反向播放
   */
  reverse(): void {
    this.reversed = !this.reversed;
    if (this.isPlaying) {
      // 重新计算开始时间以保持平滑反向
      const progress = this.getProgress();
      this.startTime = performance.now() - (1 - progress) * this.config.duration;
    }
  }
  
  /**
   * 更新动画
   */
  update(deltaTime: number): boolean {
    if (!this.isPlaying || this.isPaused) return true;
    
    this.elapsed = performance.now() - this.startTime - this.config.delay;
    
    // 延迟处理
    if (this.elapsed < 0) return true;
    
    const progress = this.getProgress();
    const easedProgress = this.config.easing(progress);
    
    // 应用动画值
    this.applyValues(easedProgress);
    
    // 调用更新回调
    this.config.onUpdate(progress);
    
    // 检查是否完成
    if (progress >= 1) {
      if (this.config.repeat > 0 && this.repeatCount < this.config.repeat) {
        // 重复播放
        this.repeatCount++;
        this.config.onRepeat();
        
        if (this.config.yoyo) {
          this.reversed = !this.reversed;
        }
        
        this.startTime = performance.now();
        this.elapsed = 0;
        return true;
      } else {
        // 动画完成
        this.isPlaying = false;
        this.config.onComplete();
        return false;
      }
    }
    
    return true;
  }
  
  /**
   * 获取动画进度
   */
  private getProgress(): number {
    let progress = Math.min(1, this.elapsed / this.config.duration);
    
    if (this.reversed) {
      progress = 1 - progress;
    }
    
    return progress;
  }
  
  /**
   * 应用动画值
   */
  private applyValues(progress: number): void {
    for (const prop in this.toProps) {
      if (this.toProps.hasOwnProperty(prop)) {
        const fromValue = this.fromProps[prop];
        const toValue = this.toProps[prop];
        
        if (typeof fromValue === 'number' && typeof toValue === 'number') {
          const value = fromValue + (toValue - fromValue) * progress;
          this.setTargetProperty(prop, value);
        } else if (Array.isArray(fromValue) && Array.isArray(toValue)) {
          // 处理数组属性（如位置、大小等）
          const value = fromValue.map((from: number, index: number) => {
            const to = toValue[index];
            return from + (to - from) * progress;
          });
          this.setTargetProperty(prop, value);
        }
      }
    }
  }
  
  /**
   * 设置目标属性
   */
  private setTargetProperty(prop: string, value: any): void {
    // 根据属性名称调用相应的方法
    switch (prop) {
      case 'x':
        if (this.target.setPosition) {
          const currentPos = this.target.getPosition();
          this.target.setPosition({ x: value, y: currentPos.y });
        }
        break;
      case 'y':
        if (this.target.setPosition) {
          const currentPos = this.target.getPosition();
          this.target.setPosition({ x: currentPos.x, y: value });
        }
        break;
      case 'position':
        if (this.target.setPosition) {
          this.target.setPosition(value);
        }
        break;
      case 'width':
        if (this.target.setSize) {
          const currentSize = this.target.getSize();
          this.target.setSize({ width: value, height: currentSize.height });
        }
        break;
      case 'height':
        if (this.target.setSize) {
          const currentSize = this.target.getSize();
          this.target.setSize({ width: currentSize.width, height: value });
        }
        break;
      case 'size':
        if (this.target.setSize) {
          this.target.setSize(value);
        }
        break;
      case 'scale':
        if (this.target.setScale) {
          this.target.setScale(value);
        }
        break;
      case 'rotation':
        if (this.target.setRotation) {
          this.target.setRotation(value);
        }
        break;
      case 'opacity':
        if (this.target.setOpacity) {
          this.target.setOpacity(value);
        }
        break;
      case 'color':
        if (this.target.setColor) {
          this.target.setColor(value);
        }
        break;
      default:
        // 尝试直接设置属性
        if (this.target && (this.target as any)[prop]) {
          (this.target as any)[prop] = value;
        }
        break;
    }
  }
  
  /**
   * 检查动画是否正在播放
   */
  isPlayingAnimation(): boolean {
    return this.isPlaying && !this.isPaused;
  }
  
  /**
   * 获取目标对象
   */
  getTarget(): IShape {
    return this.target;
  }
  
  /**
   * 获取动画ID
   */
  getId(): string {
    return this.target.id + '_' + Date.now();
  }
}
```

### 1.3 创建补间动画引擎

**文件**: `packages/canvas-sdk/src/animation/TweenEngine.ts`

```typescript
import { Animation, AnimationConfig, AnimatedProps } from './Animation';
import { IShape } from '../scene/IShape';

/**
 * 补间动画引擎
 */
export class TweenEngine {
  private activeAnimations: Map<string, Animation> = new Map();
  private lastUpdateTime: number = 0;
  private isRunning: boolean = false;
  private animationFrameId: number = 0;
  
  /**
   * 创建补间动画（到目标值）
   */
  to(target: IShape, props: AnimatedProps, config: AnimationConfig = {}): Animation {
    const fromProps: AnimatedProps = {};
    
    // 获取当前属性值作为起始值
    for (const prop in props) {
      if (props.hasOwnProperty(prop)) {
        fromProps[prop] = this.getCurrentPropertyValue(target, prop);
      }
    }
    
    const animation = new Animation(target, fromProps, props, config);
    this.activeAnimations.set(animation.getId(), animation);
    
    if (!this.isRunning) {
      this.start();
    }
    
    return animation;
  }
  
  /**
   * 创建补间动画（从起始值）
   */
  from(target: IShape, props: AnimatedProps, config: AnimationConfig = {}): Animation {
    const toProps: AnimatedProps = {};
    
    // 获取当前属性值作为目标值
    for (const prop in props) {
      if (props.hasOwnProperty(prop)) {
        toProps[prop] = this.getCurrentPropertyValue(target, prop);
      }
    }
    
    const animation = new Animation(target, props, toProps, config);
    this.activeAnimations.set(animation.getId(), animation);
    
    if (!this.isRunning) {
      this.start();
    }
    
    return animation;
  }
  
  /**
   * 创建补间动画（从起始值到目标值）
   */
  fromTo(
    target: IShape, 
    fromProps: AnimatedProps, 
    toProps: AnimatedProps, 
    config: AnimationConfig = {}
  ): Animation {
    const animation = new Animation(target, fromProps, toProps, config);
    this.activeAnimations.set(animation.getId(), animation);
    
    if (!this.isRunning) {
      this.start();
    }
    
    return animation;
  }
  
  /**
   * 获取当前属性值
   */
  private getCurrentPropertyValue(target: IShape, prop: string): any {
    switch (prop) {
      case 'x':
        return target.getPosition().x;
      case 'y':
        return target.getPosition().y;
      case 'position':
        return target.getPosition();
      case 'width':
        return target.getSize().width;
      case 'height':
        return target.getSize().height;
      case 'size':
        return target.getSize();
      case 'scale':
        return target.getScale ? target.getScale() : 1;
      case 'rotation':
        return target.getRotation ? target.getRotation() : 0;
      case 'opacity':
        return target.getOpacity ? target.getOpacity() : 1;
      default:
        return (target as any)[prop];
    }
  }
  
  /**
   * 播放指定动画
   */
  play(animationId: string): void {
    const animation = this.activeAnimations.get(animationId);
    if (animation) {
      animation.play();
    }
    
    if (!this.isRunning) {
      this.start();
    }
  }
  
  /**
   * 暂停指定动画
   */
  pause(animationId: string): void {
    const animation = this.activeAnimations.get(animationId);
    if (animation) {
      animation.pause();
    }
  }
  
  /**
   * 停止指定动画
   */
  stop(animationId: string): void {
    const animation = this.activeAnimations.get(animationId);
    if (animation) {
      animation.stop();
      this.activeAnimations.delete(animationId);
    }
  }
  
  /**
   * 反向播放指定动画
   */
  reverse(animationId: string): void {
    const animation = this.activeAnimations.get(animationId);
    if (animation) {
      animation.reverse();
    }
  }
  
  /**
   * 更新所有动画
   */
  update(deltaTime: number): void {
    if (this.activeAnimations.size === 0) {
      this.stop();
      return;
    }
    
    // 更新所有活动动画
    for (const [id, animation] of this.activeAnimations.entries()) {
      const isStillActive = animation.update(deltaTime);
      if (!isStillActive) {
        // 动画完成，移除
        this.activeAnimations.delete(id);
      }
    }
  }
  
  /**
   * 开始动画引擎
   */
  start(): void {
    if (this.isRunning) return;
    
    this.isRunning = true;
    this.lastUpdateTime = performance.now();
    this.animationFrameId = requestAnimationFrame(this.animate.bind(this));
  }
  
  /**
   * 停止动画引擎
   */
  stop(): void {
    if (!this.isRunning) return;
    
    this.isRunning = false;
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
    }
  }
  
  /**
   * 动画循环
   */
  private animate(timestamp: number): void {
    if (!this.isRunning) return;
    
    const deltaTime = timestamp - this.lastUpdateTime;
    this.lastUpdateTime = timestamp;
    
    this.update(deltaTime);
    
    if (this.isRunning) {
      this.animationFrameId = requestAnimationFrame(this.animate.bind(this));
    }
  }
  
  /**
   * 检查动画引擎是否正在运行
   */
  isRunningAnimation(): boolean {
    return this.isRunning;
  }
  
  /**
   * 获取活动动画数量
   */
  getActiveAnimationCount(): number {
    return this.activeAnimations.size;
  }
  
  /**
   * 停止所有动画
   */
  stopAll(): void {
    for (const animation of this.activeAnimations.values()) {
      animation.stop();
    }
    this.activeAnimations.clear();
    this.stop();
  }
}
```

## 2. 时间线管理器

### 2.1 创建时间线轨道

**文件**: `packages/canvas-sdk/src/animation/TimelineTrack.ts`

```typescript
import { Animation } from './Animation';

/**
 * 时间线轨道接口
 */
export interface TimelineTrack {
  id: string;
  animations: TrackAnimation[];
  duration: number;
}

/**
 * 轨道动画接口
 */
export interface TrackAnimation {
  animation: Animation;
  startTime: number;
  duration: number;
  offset: number;
}

/**
 * 时间线轨道管理器
 */
export class TimelineTrackManager {
  private tracks: Map<string, TimelineTrack> = new Map();
  
  /**
   * 创建轨道
   */
  createTrack(trackId: string): TimelineTrack {
    const track: TimelineTrack = {
      id: trackId,
      animations: [],
      duration: 0
    };
    
    this.tracks.set(trackId, track);
    return track;
  }
  
  /**
   * 向轨道添加动画
   */
  addAnimationToTrack(
    trackId: string, 
    animation: Animation, 
    startTime: number = 0
  ): void {
    let track = this.tracks.get(trackId);
    if (!track) {
      track = this.createTrack(trackId);
    }
    
    const trackAnimation: TrackAnimation = {
      animation,
      startTime,
      duration: 1000, // 默认持续时间
      offset: 0
    };
    
    track.animations.push(trackAnimation);
    track.duration = Math.max(track.duration, startTime + trackAnimation.duration);
  }
  
  /**
   * 获取轨道
   */
  getTrack(trackId: string): TimelineTrack | undefined {
    return this.tracks.get(trackId);
  }
  
  /**
   * 获取所有轨道
   */
  getTracks(): TimelineTrack[] {
    return Array.from(this.tracks.values());
  }
  
  /**
   * 更新轨道上的动画
   */
  updateTrackAnimations(trackId: string, currentTime: number): void {
    const track = this.tracks.get(trackId);
    if (!track) return;
    
    track.animations.forEach(trackAnim => {
      const animationTime = currentTime - trackAnim.startTime;
      
      if (animationTime >= 0 && animationTime <= trackAnim.duration) {
        // 动画应该在播放中
        if (!trackAnim.animation.isPlayingAnimation()) {
          trackAnim.animation.play();
        }
      } else {
        // 动画应该暂停
        if (trackAnim.animation.isPlayingAnimation()) {
          trackAnim.animation.pause();
        }
      }
    });
  }
}
```

### 2.2 创建时间线管理器

**文件**: `packages/canvas-sdk/src/animation/Timeline.ts`

```typescript
import { Animation, AnimationConfig, AnimatedProps } from './Animation';
import { TimelineTrackManager } from './TimelineTrack';
import { TweenEngine } from './TweenEngine';

/**
 * 时间线回调接口
 */
export interface TimelineCallback {
  time: number;
  callback: () => void;
  id: string;
}

/**
 * 时间线类
 */
export class Timeline {
  private tracks: TimelineTrackManager = new TimelineTrackManager();
  private callbacks: TimelineCallback[] = [];
  private duration: number = 0;
  private currentTime: number = 0;
  private isPlaying: boolean = false;
  private isPaused: boolean = false;
  private startTime: number = 0;
  private tweenEngine: TweenEngine;
  
  constructor() {
    this.tweenEngine = new TweenEngine();
  }
  
  /**
   * 添加动画到时间线
   */
  add(animation: Animation, offset: number = 0): Timeline {
    // 创建默认轨道
    const trackId = 'default';
    this.tracks.addAnimationToTrack(trackId, animation, offset);
    
    // 更新时间线持续时间
    const animationDuration = 1000; // 简化处理
    this.duration = Math.max(this.duration, offset + animationDuration);
    
    return this;
  }
  
  /**
   * 添加动画（便捷方法）
   */
  to(
    target: any, 
    props: AnimatedProps, 
    config: AnimationConfig & { time?: number } = {}
  ): Timeline {
    const animation = new Animation(target, {}, props, config);
    const offset = config.time || 0;
    
    return this.add(animation, offset);
  }
  
  /**
   * 添加回调函数
   */
  addCallback(callback: () => void, time: number): Timeline {
    const callbackObj: TimelineCallback = {
      time,
      callback,
      id: 'cb_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9)
    };
    
    this.callbacks.push(callbackObj);
    this.duration = Math.max(this.duration, time);
    
    return this;
  }
  
  /**
   * 播放时间线
   */
  play(): void {
    if (this.isPlaying && !this.isPaused) return;
    
    this.isPlaying = true;
    this.isPaused = false;
    this.startTime = performance.now() - this.currentTime;
    
    this.animate();
  }
  
  /**
   * 暂停时间线
   */
  pause(): void {
    if (!this.isPlaying) return;
    
    this.isPaused = true;
    this.isPlaying = false;
  }
  
  /**
   * 停止时间线
   */
  stop(): void {
    this.isPlaying = false;
    this.isPaused = false;
    this.currentTime = 0;
    
    // 停止所有动画
    this.tweenEngine.stopAll();
  }
  
  /**
   * 跳转到指定时间
   */
  seek(time: number): void {
    this.currentTime = Math.max(0, Math.min(this.duration, time));
    
    // 更新所有轨道上的动画
    const trackIds = this.tracks.getTracks().map(track => track.id);
    trackIds.forEach(trackId => {
      this.tracks.updateTrackAnimations(trackId, this.currentTime);
    });
    
    // 执行到达时间点的回调
    this.executeCallbacksAtTime(this.currentTime);
  }
  
  /**
   * 反向播放
   */
  reverse(): void {
    // 简化实现：重新开始从当前进度的反向位置
    const reversedTime = this.duration - this.currentTime;
    this.seek(reversedTime);
    // 实际的反向播放需要更复杂的实现
  }
  
  /**
   * 动画循环
   */
  private animate(): void {
    if (!this.isPlaying || this.isPaused) return;
    
    const now = performance.now();
    const elapsed = now - this.startTime;
    
    this.currentTime = Math.min(this.duration, elapsed);
    
    // 更新所有轨道
    const trackIds = this.tracks.getTracks().map(track => track.id);
    trackIds.forEach(trackId => {
      this.tracks.updateTrackAnimations(trackId, this.currentTime);
    });
    
    // 执行回调
    this.executeCallbacks();
    
    // 检查是否完成
    if (this.currentTime >= this.duration) {
      this.isPlaying = false;
      return;
    }
    
    requestAnimationFrame(this.animate.bind(this));
  }
  
  /**
   * 执行回调函数
   */
  private executeCallbacks(): void {
    this.callbacks.forEach(callback => {
      if (Math.abs(this.currentTime - callback.time) < 16) { // 约1帧的时间
        try {
          callback.callback();
        } catch (error) {
          console.error('Timeline callback error:', error);
        }
      }
    });
  }
  
  /**
   * 执行指定时间点的回调
   */
  private executeCallbacksAtTime(time: number): void {
    this.callbacks.forEach(callback => {
      if (Math.abs(time - callback.time) < 16) {
        try {
          callback.callback();
        } catch (error) {
          console.error('Timeline callback error:', error);
        }
      }
    });
  }
  
  /**
   * 获取当前时间
   */
  getCurrentTime(): number {
    return this.currentTime;
  }
  
  /**
   * 获取持续时间
   */
  getDuration(): number {
    return this.duration;
  }
  
  /**
   * 检查是否正在播放
   */
  isPlayingTimeline(): boolean {
    return this.isPlaying && !this.isPaused;
  }
}
```

## 3. 滤镜系统基础

### 3.1 创建滤镜接口

**文件**: `packages/render-engine/src/effects/Filter.ts`

```typescript
import { IPoint } from '../math/Vector2';

/**
 * 滤镜接口
 */
export interface IFilter {
  id: string;
  name: string;
  type: string;
  apply(context: CanvasRenderingContext2D, bounds: any): void;
  clone(): IFilter;
}

/**
 * 滤镜配置接口
 */
export interface FilterConfig {
  [key: string]: any;
}

/**
 * 基础滤镜类
 */
export abstract class BaseFilter implements IFilter {
  protected id: string;
  protected name: string;
  protected type: string;
  
  constructor(name: string, type: string) {
    this.id = `${type}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    this.name = name;
    this.type = type;
  }
  
  get id(): string {
    return this.id;
  }
  
  get name(): string {
    return this.name;
  }
  
  get type(): string {
    return this.type;
  }
  
  abstract apply(context: CanvasRenderingContext2D, bounds: any): void;
  abstract clone(): IFilter;
}
```

### 3.2 创建具体滤镜实现

**文件**: `packages/render-engine/src/effects/BlurFilter.ts`

```typescript
import { BaseFilter, FilterConfig } from './Filter';

/**
 * 模糊滤镜
 */
export class BlurFilter extends BaseFilter {
  private radius: number;
  
  constructor(radius: number = 5) {
    super('Blur Filter', 'blur');
    this.radius = Math.max(0, radius);
  }
  
  /**
   * 应用模糊滤镜
   */
  apply(context: CanvasRenderingContext2D, bounds: any): void {
    if (this.radius <= 0) return;
    
    // 使用Canvas的模糊滤镜（如果支持）
    if (context.filter !== undefined) {
      const currentFilter = context.filter;
      context.filter = `blur(${this.radius}px)`;
      
      // 滤镜会在后续的绘制操作中应用
      // 这里只是设置滤镜，实际应用需要在绘制时进行
      
      // 恢复原始滤镜
      context.filter = currentFilter;
    } else {
      // 降级实现：使用手动模糊算法
      this.applyManualBlur(context, bounds);
    }
  }
  
  /**
   * 手动实现模糊效果
   */
  private applyManualBlur(context: CanvasRenderingContext2D, bounds: any): void {
    // 简化实现：使用多次绘制实现模糊效果
    const iterations = Math.min(3, Math.ceil(this.radius / 2));
    const offset = this.radius / iterations;
    
    context.save();
    context.globalAlpha = 1 / (iterations * 2);
    
    for (let x = -offset; x <= offset; x += offset) {
      for (let y = -offset; y <= offset; y += offset) {
        context.save();
        context.translate(x, y);
        // 这里需要重新绘制形状，实际应用中需要传入绘制函数
        context.restore();
      }
    }
    
    context.restore();
  }
  
  /**
   * 克隆滤镜
   */
  clone(): BlurFilter {
    return new BlurFilter(this.radius);
  }
  
  /**
   * 设置模糊半径
   */
  setRadius(radius: number): void {
    this.radius = Math.max(0, radius);
  }
  
  /**
   * 获取模糊半径
   */
  getRadius(): number {
    return this.radius;
  }
}
```

**文件**: `packages/render-engine/src/effects/ShadowFilter.ts`

```typescript
import { BaseFilter, FilterConfig } from './Filter';
import { IPoint } from '../math/Vector2';

/**
 * 阴影滤镜
 */
export class ShadowFilter extends BaseFilter {
  private offset: IPoint;
  private blur: number;
  private color: string;
  
  constructor(offset: IPoint = { x: 5, y: 5 }, blur: number = 5, color: string = 'rgba(0,0,0,0.5)') {
    super('Shadow Filter', 'shadow');
    this.offset = { ...offset };
    this.blur = Math.max(0, blur);
    this.color = color;
  }
  
  /**
   * 应用阴影滤镜
   */
  apply(context: CanvasRenderingContext2D, bounds: any): void {
    context.save();
    
    // 设置阴影属性
    context.shadowOffsetX = this.offset.x;
    context.shadowOffsetY = this.offset.y;
    context.shadowBlur = this.blur;
    context.shadowColor = this.color;
    
    // 阴影会在后续的绘制操作中应用
    // 这里只是设置阴影属性，实际应用需要在绘制时进行
    
    context.restore();
  }
  
  /**
   * 克隆滤镜
   */
  clone(): ShadowFilter {
    return new ShadowFilter(this.offset, this.blur, this.color);
  }
  
  /**
   * 设置阴影偏移
   */
  setOffset(offset: IPoint): void {
    this.offset = { ...offset };
  }
  
  /**
   * 获取阴影偏移
   */
  getOffset(): IPoint {
    return { ...this.offset };
  }
  
  /**
   * 设置阴影模糊
   */
  setBlur(blur: number): void {
    this.blur = Math.max(0, blur);
  }
  
  /**
   * 获取阴影模糊
   */
  getBlur(): number {
    return this.blur;
  }
  
  /**
   * 设置阴影颜色
   */
  setColor(color: string): void {
    this.color = color;
  }
  
  /**
   * 获取阴影颜色
   */
  getColor(): string {
    return this.color;
  }
}
```

### 3.3 创建滤镜系统

**文件**: `packages/render-engine/src/effects/FilterSystem.ts`

```typescript
import { IFilter } from './Filter';
import { BlurFilter } from './BlurFilter';
import { ShadowFilter } from './ShadowFilter';
import { IPoint } from '../math/Vector2';

/**
 * 滤镜系统
 */
export class FilterSystem {
  private filters: Map<string, IFilter> = new Map();
  private filterChain: IFilter[] = [];
  
  /**
   * 创建模糊滤镜
   */
  createBlurFilter(radius: number): BlurFilter {
    const filter = new BlurFilter(radius);
    this.filters.set(filter.id, filter);
    return filter;
  }
  
  /**
   * 创建阴影滤镜
   */
  createShadowFilter(offset: IPoint, blur: number, color: string): ShadowFilter {
    const filter = new ShadowFilter(offset, blur, color);
    this.filters.set(filter.id, filter);
    return filter;
  }
  
  /**
   * 创建颜色矩阵滤镜
   */
  createColorMatrixFilter(matrix: number[]): IFilter {
    // 简化实现：返回基础滤镜
    const filter = {
      id: `color_matrix_${Date.now()}`,
      name: 'Color Matrix Filter',
      type: 'color_matrix',
      matrix: [...matrix],
      apply: (context: CanvasRenderingContext2D, bounds: any) => {
        // 颜色矩阵滤镜实现
        if (context.filter !== undefined) {
          // 使用CSS滤镜实现
          const matrixString = matrix.join(' ');
          context.filter = `url(#color-matrix-${filter.id})`;
        }
      },
      clone: function() {
        return this.createColorMatrixFilter(this.matrix);
      }
    };
    
    this.filters.set(filter.id, filter);
    return filter;
  }
  
  /**
   * 应用滤镜到形状
   */
  applyFilters(shape: any, filters: IFilter[]): void {
    // 将滤镜添加到滤镜链
    this.filterChain.push(...filters);
  }
  
  /**
   * 使用滤镜渲染形状
   */
  renderWithFilters(shape: any, context: CanvasRenderingContext2D): void {
    if (this.filterChain.length === 0) {
      // 无滤镜，直接渲染
      if (shape.render) {
        shape.render(context);
      }
      return;
    }
    
    // 创建离屏缓存
    const bounds = shape.getBounds();
    const canvas = document.createElement('canvas');
    canvas.width = bounds.width + 20; // 添加边距
    canvas.height = bounds.height + 20;
    
    const offscreenContext = canvas.getContext('2d');
    if (!offscreenContext) return;
    
    // 在离屏缓存中渲染形状
    offscreenContext.save();
    offscreenContext.translate(-bounds.x + 10, -bounds.y + 10); // 添加偏移
    
    // 应用滤镜
    this.filterChain.forEach(filter => {
      filter.apply(offscreenContext, bounds);
    });
    
    // 渲染形状
    if (shape.render) {
      shape.render(offscreenContext);
    }
    
    offscreenContext.restore();
    
    // 将离屏缓存绘制到主画布
    context.drawImage(canvas, bounds.x - 10, bounds.y - 10);
    
    // 清空滤镜链
    this.filterChain = [];
  }
  
  /**
   * 获取滤镜
   */
  getFilter(filterId: string): IFilter | undefined {
    return this.filters.get(filterId);
  }
  
  /**
   * 移除滤镜
   */
  removeFilter(filterId: string): boolean {
    return this.filters.delete(filterId);
  }
  
  /**
   * 清空所有滤镜
   */
  clearFilters(): void {
    this.filters.clear();
    this.filterChain = [];
  }
  
  /**
   * 获取滤镜数量
   */
  getFilterCount(): number {
    return this.filters.size;
  }
}
```

## 4. 集成到CanvasSDK

### 4.1 更新CanvasSDK

**文件**: `packages/canvas-sdk/src/core/CanvasSDK.ts`

```typescript
// 添加导入
import { TweenEngine } from '../animation/TweenEngine';
import { Timeline } from '../animation/Timeline';
import { FilterSystem } from '@sky-canvas/render-engine/dist/effects/FilterSystem';

// 在类中添加属性
export class CanvasSDK extends EventEmitter<ICanvasSDKEvents> {
  private tweenEngine: TweenEngine = new TweenEngine();
  private filterSystem: FilterSystem = new FilterSystem();
  
  // 动画API
  /**
   * 创建补间动画
   */
  animate(target: IShape, props: any, config: any = {}): any {
    return this.tweenEngine.to(target, props, config);
  }
  
  /**
   * 创建时间线
   */
  createTimeline(): Timeline {
    return new Timeline();
  }
  
  /**
   * 获取补间引擎
   */
  getTweenEngine(): TweenEngine {
    return this.tweenEngine;
  }
  
  // 滤镜API
  /**
   * 创建模糊滤镜
   */
  createBlurFilter(radius: number): any {
    return this.filterSystem.createBlurFilter(radius);
  }
  
  /**
   * 创建阴影滤镜
   */
  createShadowFilter(offset: IPoint, blur: number, color: string): any {
    return this.filterSystem.createShadowFilter(offset, blur, color);
  }
  
  /**
   * 应用滤镜到形状
   */
  applyFilters(shape: IShape, filters: any[]): void {
    this.filterSystem.applyFilters(shape, filters);
  }
  
  /**
   * 使用滤镜渲染形状
   */
  renderWithFilters(shape: IShape, context: CanvasRenderingContext2D): void {
    this.filterSystem.renderWithFilters(shape, context);
  }
}
```

## 5. 测试验证

### 5.1 动画系统测试

**文件**: `packages/canvas-sdk/src/animation/__tests__/TweenEngine.test.ts`

```typescript
import { TweenEngine } from '../TweenEngine';
import { Easing } from '../Easing';

describe('TweenEngine', () => {
  let tweenEngine: TweenEngine;
  let mockShape: any;

  beforeEach(() => {
    tweenEngine = new TweenEngine();
    mockShape = {
      id: 'test-shape',
      getPosition: () => ({ x: 0, y: 0 }),
      setPosition: jest.fn(),
      getSize: () => ({ width: 100, height: 100 }),
      setSize: jest.fn()
    };
  });

  test('should create tween animation', () => {
    const animation = tweenEngine.to(mockShape, { x: 100, y: 100 }, { duration: 1000 });
    expect(animation).toBeDefined();
    expect(tweenEngine.getActiveAnimationCount()).toBe(1);
  });

  test('should play and stop animation', () => {
    const animation = tweenEngine.to(mockShape, { x: 100 }, { duration: 100 });
    
    animation.play();
    expect(animation.isPlayingAnimation()).toBe(true);
    
    animation.stop();
    expect(animation.isPlayingAnimation()).toBe(false);
  });

  test('should use easing functions', () => {
    const animation = tweenEngine.to(
      mockShape, 
      { x: 100 }, 
      { duration: 1000, easing: Easing.quadIn }
    );
    
    expect(animation).toBeDefined();
  });
});
```

### 5.2 滤镜系统测试

**文件**: `packages/render-engine/src/effects/__tests__/FilterSystem.test.ts`

```typescript
import { FilterSystem } from '../FilterSystem';

describe('FilterSystem', () => {
  let filterSystem: FilterSystem;

  beforeEach(() => {
    filterSystem = new FilterSystem();
  });

  test('should create blur filter', () => {
    const filter = filterSystem.createBlurFilter(5);
    expect(filter).toBeDefined();
    expect(filter.getRadius()).toBe(5);
  });

  test('should create shadow filter', () => {
    const filter = filterSystem.createShadowFilter({ x: 10, y: 10 }, 5, 'rgba(0,0,0,0.5)');
    expect(filter).toBeDefined();
    expect(filter.getOffset()).toEqual({ x: 10, y: 10 });
  });

  test('should manage filters', () => {
    const filter1 = filterSystem.createBlurFilter(5);
    const filter2 = filterSystem.createShadowFilter({ x: 5, y: 5 }, 3, '#000');
    
    expect(filterSystem.getFilterCount()).toBe(2);
    
    filterSystem.removeFilter(filter1.id);
    expect(filterSystem.getFilterCount()).toBe(1);
  });
});
```

## 实施计划

### 第一周任务

1. **创建基础文件结构**
   - 创建`Easing.ts`
   - 创建`Animation.ts`
   - 创建`TweenEngine.ts`

2. **实现补间动画引擎**
   - 完成缓动函数库
   - 实现动画类基础功能
   - 实现补间引擎核心功能

3. **创建测试用例**
   - 为动画系统编写单元测试
   - 验证缓动函数正确性

### 第二周任务

1. **实现时间线管理器**
   - 创建时间线轨道管理
   - 实现时间线核心功能
   - 添加回调系统

2. **实现滤镜系统**
   - 创建滤镜接口和基础类
   - 实现具体滤镜（模糊、阴影等）
   - 创建滤镜系统管理器

3. **集成到CanvasSDK**
   - 添加动画API到CanvasSDK
   - 添加滤镜API到CanvasSDK
   - 验证集成效果

### 第三周任务

1. **功能完善**
   - 优化动画性能
   - 完善滤镜效果
   - 添加更多缓动函数

2. **测试和调试**
   - 完整的单元测试覆盖
   - 性能基准测试
   - 兼容性测试

3. **文档编写**
   - 编写API文档
   - 创建使用示例
   - 更新README

### 第四周任务

1. **性能优化**
   - 优化动画更新频率
   - 优化滤镜渲染性能
   - 内存泄漏检测和修复

2. **功能验证**
   - 复杂动画场景测试
   - 滤镜组合效果测试
   - 长时间运行稳定性测试

3. **最终测试**
   - 全面回归测试
   - 用户体验优化
   - 准备发布版本

## 验收标准

### 补间动画引擎
- [ ] 基础属性补间（位置、大小、旋转、透明度）
- [ ] 多种缓动函数支持（至少15种）
- [ ] 动画链式调用
- [ ] 动画事件回调（开始、更新、完成、重复）
- [ ] 性能：100个同时动画对象保持60fps

### 时间线管理器
- [ ] 多动画同步播放
- [ ] 时间线搜索功能
- [ ] 循环播放支持
- [ ] 回调函数系统
- [ ] 正向/反向播放

### 滤镜系统
- [ ] 基础滤镜效果（模糊、阴影、色彩调整）
- [ ] 滤镜链式组合
- [ ] 实时滤镜预览
- [ ] 滤镜性能优化（内存使用 < 50MB）
- [ ] 至少5种内置滤镜

这个第三阶段实施指南详细说明了如何实现动画系统功能。按照这个指南逐步实施，可以为Sky Canvas添加完整的动画和滤镜支持。