/**
 * 动画组
 * 管理多个动画的集合，支持并行和顺序播放
 */

import { BaseAnimation } from '../core/BaseAnimation';
import {
  IAnimation,
  IAnimationGroup,
  AnimationState,
  AnimationConfig
} from '../types/AnimationTypes';

export enum GroupPlayMode {
  PARALLEL = 'parallel',    // 并行播放所有动画
  SEQUENCE = 'sequence'     // 顺序播放动画
}

export interface AnimationGroupConfig extends AnimationConfig {
  playMode?: GroupPlayMode;
}

export class AnimationGroup extends BaseAnimation implements IAnimationGroup {
  protected animations: IAnimation[] = [];
  private playMode: GroupPlayMode;
  private currentSequenceIndex: number = 0;

  constructor(config: AnimationGroupConfig) {
    // 动画组的持续时间会根据子动画自动计算
    super({ ...config, duration: 0 });
    
    this.playMode = config.playMode || GroupPlayMode.PARALLEL;
  }

  add(animation: IAnimation): this {
    this.animations.push(animation);
    this.updateDuration();
    
    // 设置动画事件监听
    animation.on('complete', () => this.onChildAnimationComplete(animation));
    
    return this;
  }

  remove(animation: IAnimation): this {
    const index = this.animations.indexOf(animation);
    if (index > -1) {
      this.animations.splice(index, 1);
      this.updateDuration();
      
      // 移除事件监听
      animation.off('complete', () => this.onChildAnimationComplete(animation));
    }
    return this;
  }

  clear(): this {
    // 停止所有子动画
    for (const animation of this.animations) {
      animation.stop();
    }
    this.animations = [];
    this.updateDuration();
    return this;
  }

  getAnimations(): IAnimation[] {
    return [...this.animations];
  }

  protected applyAnimation(progress: number): void {
    if (this.playMode === GroupPlayMode.PARALLEL) {
      this.updateParallelAnimations(progress);
    } else {
      this.updateSequentialAnimations(progress);
    }
  }

  start(): this {
    if (this.animations.length === 0) {
      console.warn('AnimationGroup has no animations to play');
      return this;
    }

    this.currentSequenceIndex = 0;
    super.start();
    
    if (this.playMode === GroupPlayMode.PARALLEL) {
      // 并行模式：启动所有动画
      for (const animation of this.animations) {
        animation.start();
      }
    } else {
      // 顺序模式：只启动第一个动画
      if (this.animations[0]) {
        this.animations[0].start();
      }
    }

    return this;
  }

  pause(): this {
    super.pause();
    
    // 暂停所有活动的子动画
    for (const animation of this.animations) {
      if (animation.state === AnimationState.PLAYING) {
        animation.pause();
      }
    }
    
    return this;
  }

  resume(): this {
    super.resume();
    
    // 恢复所有暂停的子动画
    for (const animation of this.animations) {
      if (animation.state === AnimationState.PAUSED) {
        animation.resume();
      }
    }
    
    return this;
  }

  stop(): this {
    super.stop();
    
    // 停止所有子动画
    for (const animation of this.animations) {
      animation.stop();
    }
    
    this.currentSequenceIndex = 0;
    return this;
  }

  seek(time: number): this {
    super.seek(time);
    
    if (this.playMode === GroupPlayMode.PARALLEL) {
      // 并行模式：所有动画都定位到相同时间点
      for (const animation of this.animations) {
        const animationTime = Math.min(time, animation.duration);
        animation.seek(animationTime);
      }
    } else {
      // 顺序模式：计算当前应该播放哪个动画
      this.seekSequential(time);
    }
    
    return this;
  }

  dispose(): void {
    this.clear();
    super.dispose();
  }

  /**
   * 设置播放模式
   */
  setPlayMode(mode: GroupPlayMode): this {
    if (this._state === AnimationState.PLAYING) {
      console.warn('Cannot change play mode while animation is playing');
      return this;
    }
    
    this.playMode = mode;
    this.updateDuration();
    return this;
  }

  /**
   * 获取播放模式
   */
  getPlayMode(): GroupPlayMode {
    return this.playMode;
  }

  private updateParallelAnimations(progress: number): void {
    const currentTime = progress * this._duration;
    
    for (const animation of this.animations) {
      const animationTime = Math.min(currentTime, animation.duration);
      const animationProgress = animation.duration > 0 ? animationTime / animation.duration : 1;
      
      if (animationProgress <= 1) {
        animation.seek(animationTime);
      }
    }
  }

  private updateSequentialAnimations(progress: number): void {
    const currentTime = progress * this._duration;
    this.seekSequential(currentTime);
  }

  private seekSequential(time: number): void {
    let accumulatedTime = 0;
    let targetIndex = -1;
    let targetTime = 0;

    // 找到当前时间对应的动画索引
    for (let i = 0; i < this.animations.length; i++) {
      const animation = this.animations[i];
      
      if (time <= accumulatedTime + animation.duration) {
        targetIndex = i;
        targetTime = time - accumulatedTime;
        break;
      }
      
      accumulatedTime += animation.duration;
    }

    if (targetIndex >= 0) {
      // 定位到目标动画
      const targetAnimation = this.animations[targetIndex];
      targetAnimation.seek(targetTime);
      
      // 确保之前的动画都已完成
      for (let i = 0; i < targetIndex; i++) {
        this.animations[i].seek(this.animations[i].duration);
      }
      
      // 确保之后的动画都处于初始状态
      for (let i = targetIndex + 1; i < this.animations.length; i++) {
        this.animations[i].seek(0);
      }
    }
  }

  protected onChildAnimationComplete(completedAnimation: IAnimation): void {
    if (this.playMode === GroupPlayMode.SEQUENCE) {
      this.currentSequenceIndex++;
      
      // 启动下一个动画
      if (this.currentSequenceIndex < this.animations.length) {
        this.animations[this.currentSequenceIndex].start();
      }
    }
  }

  private updateDuration(): void {
    if (this.animations.length === 0) {
      this._duration = 0;
      return;
    }

    if (this.playMode === GroupPlayMode.PARALLEL) {
      // 并行模式：持续时间是最长动画的持续时间
      this._duration = Math.max(...this.animations.map(a => a.duration));
    } else {
      // 顺序模式：持续时间是所有动画持续时间的总和
      this._duration = this.animations.reduce((sum, a) => sum + a.duration, 0);
    }
  }

  /**
   * 获取组内动画统计信息
   */
  getStats() {
    return {
      totalAnimations: this.animations.length,
      playMode: this.playMode,
      totalDuration: this._duration,
      currentSequenceIndex: this.currentSequenceIndex,
      animationStates: this.animations.map(a => ({
        id: a.id,
        state: a.state,
        progress: a.progress
      }))
    };
  }
}