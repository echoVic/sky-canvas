/**
 * 动画系统类型定义
 */

export enum EasingType {
  LINEAR = 'linear',
  EASE_IN = 'ease-in',
  EASE_OUT = 'ease-out',
  EASE_IN_OUT = 'ease-in-out',
  EASE_IN_QUAD = 'ease-in-quad',
  EASE_OUT_QUAD = 'ease-out-quad',
  EASE_IN_OUT_QUAD = 'ease-in-out-quad',
  EASE_IN_CUBIC = 'ease-in-cubic',
  EASE_OUT_CUBIC = 'ease-out-cubic',
  EASE_IN_OUT_CUBIC = 'ease-in-out-cubic',
  EASE_IN_QUART = 'ease-in-quart',
  EASE_OUT_QUART = 'ease-out-quart',
  EASE_IN_OUT_QUART = 'ease-in-out-quart',
  EASE_IN_BACK = 'ease-in-back',
  EASE_OUT_BACK = 'ease-out-back',
  EASE_IN_OUT_BACK = 'ease-in-out-back',
  EASE_IN_BOUNCE = 'ease-in-bounce',
  EASE_OUT_BOUNCE = 'ease-out-bounce',
  EASE_IN_OUT_BOUNCE = 'ease-in-out-bounce'
}

export type EasingFunction = (t: number) => number;

export enum AnimationState {
  IDLE = 'idle',
  PLAYING = 'playing',
  PAUSED = 'paused',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled'
}

export interface AnimationConfig {
  duration: number; // 毫秒
  delay?: number; // 毫秒
  easing?: EasingType | EasingFunction;
  loop?: boolean | number; // true 为无限循环，number 为循环次数
  yoyo?: boolean; // 是否反向播放
  autoStart?: boolean; // 是否自动开始
}

export interface PropertyAnimationConfig extends AnimationConfig {
  target: Record<string, any>;
  property: string;
  from?: number;
  to: number;
}

export interface MultiPropertyAnimationConfig extends AnimationConfig {
  target: Record<string, any>;
  properties: Record<string, { from?: number; to: number }>;
}

export interface AnimationEvents {
  start: (animation: IAnimation) => void;
  update: (animation: IAnimation, progress: number) => void;
  complete: (animation: IAnimation) => void;
  loop: (animation: IAnimation, loopCount: number) => void;
  pause: (animation: IAnimation) => void;
  resume: (animation: IAnimation) => void;
  cancel: (animation: IAnimation) => void;
  pathUpdate: (animation: IAnimation, motionInfo: any) => void;
}

export interface IAnimation {
  readonly id: string;
  readonly state: AnimationState;
  readonly duration: number;
  readonly currentTime: number;
  readonly progress: number;

  start(): this;
  pause(): this;
  resume(): this;
  stop(): this;
  seek(time: number): this;
  update(deltaTime: number): boolean;
  
  on<K extends keyof AnimationEvents>(
    event: K,
    listener: AnimationEvents[K]
  ): this;
  
  off<K extends keyof AnimationEvents>(
    event: K,
    listener: AnimationEvents[K]
  ): this;

  dispose(): void;
}

export interface IAnimationGroup extends IAnimation {
  add(animation: IAnimation): this;
  remove(animation: IAnimation): this;
  clear(): this;
  getAnimations(): IAnimation[];
}

export interface ITimeline extends IAnimationGroup {
  play(): this;
  pause(): this;
  restart(): this;
  reverse(): this;
  seek(time: number): this;
  getTotalDuration(): number;
}

export interface AnimationUpdateInfo {
  animation: IAnimation;
  deltaTime: number;
  currentTime: number;
  progress: number;
  isCompleted: boolean;
}