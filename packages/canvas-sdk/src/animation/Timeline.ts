import { Animation, AnimationConfig, AnimatedProps } from './Animation';
import { TweenEngine } from './TweenEngine';

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
 * 时间线回调接口
 */
export interface TimelineCallback {
  time: number;
  callback: () => void;
  id: string;
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
      duration: animation.getConfig().duration || 1000,
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
  
  /**
   * 清空所有轨道
   */
  clearTracks(): void {
    this.tracks.clear();
  }
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
    const animationDuration = animation.getConfig().duration || 1000;
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
  
  /**
   * 重置时间线
   */
  reset(): void {
    this.stop();
    this.tracks.clearTracks();
    this.callbacks = [];
    this.duration = 0;
    this.currentTime = 0;
  }
}