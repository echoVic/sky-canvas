/**
 * 时间轴
 * 提供动画序列的时间管理和控制
 */

import { AnimationGroup } from '../groups/AnimationGroup'
import {
  type AnimationConfig,
  AnimationState,
  type IAnimation,
  type ITimeline,
} from '../types/AnimationTypes'

export interface TimelineItem {
  animation: IAnimation
  startTime: number
  endTime: number
}

export interface TimelineConfig extends AnimationConfig {
  totalDuration?: number
}

export class Timeline extends AnimationGroup implements ITimeline {
  private timelineItems: TimelineItem[] = []
  private totalDuration: number
  private isReversed: boolean = false

  constructor(config: TimelineConfig = { duration: 0 }) {
    super(config)
    this.totalDuration = config.totalDuration || 0
  }

  /**
   * 在指定时间点添加动画
   */
  at(time: number, animation: IAnimation): this {
    const startTime = Math.max(0, time)
    const endTime = startTime + animation.duration

    const timelineItem: TimelineItem = {
      animation,
      startTime,
      endTime,
    }

    this.timelineItems.push(timelineItem)
    this.animations.push(animation)

    // 更新总持续时间
    this.totalDuration = Math.max(this.totalDuration, endTime)
    this._duration = this.totalDuration

    // 设置事件监听
    animation.on('complete', () => this.onChildAnimationComplete(animation))

    return this
  }

  /**
   * 在当前时间轴末尾添加动画
   */
  append(animation: IAnimation): this {
    return this.at(this.totalDuration, animation)
  }

  /**
   * 与上一个动画同时开始
   */
  with(animation: IAnimation): this {
    const lastItem = this.timelineItems[this.timelineItems.length - 1]
    const startTime = lastItem ? lastItem.startTime : 0
    return this.at(startTime, animation)
  }

  /**
   * 在上一个动画结束前指定时间开始
   */
  overlap(animation: IAnimation, overlapDuration: number): this {
    const startTime = Math.max(0, this.totalDuration - overlapDuration)
    return this.at(startTime, animation)
  }

  /**
   * 在指定时间间隔后添加动画
   */
  delay(duration: number): this {
    this.totalDuration += duration
    this._duration = this.totalDuration
    return this
  }

  protected applyAnimation(progress: number): void {
    const currentTime = this.isReversed
      ? this.totalDuration * (1 - progress)
      : this.totalDuration * progress

    this.seekToTime(currentTime)
  }

  play(): this {
    this._isReversed = false
    return this.start()
  }

  pause(): this {
    return super.pause()
  }

  restart(): this {
    this.stop()
    return this.play()
  }

  reverse(): this {
    this._isReversed = !this._isReversed

    if (this._state === AnimationState.PLAYING) {
      // 如果正在播放，需要重新计算当前进度
      const currentProgress = this.progress
      this.seek((1 - currentProgress) * this._duration)
    }

    return this
  }

  seek(time: number): this {
    const clampedTime = Math.max(0, Math.min(this.totalDuration, time))
    this._currentTime = clampedTime
    this.seekToTime(clampedTime)
    return this
  }

  getTotalDuration(): number {
    return this.totalDuration
  }

  /**
   * 清除所有动画
   */
  clear(): this {
    for (const item of this.timelineItems) {
      item.animation.stop()
      item.animation.off('complete', () => this.onChildAnimationComplete(item.animation))
    }

    this.timelineItems = []
    this.animations = []
    this.totalDuration = 0
    this._duration = 0

    return this
  }

  /**
   * 移除指定动画
   */
  remove(animation: IAnimation): this {
    const itemIndex = this.timelineItems.findIndex((item) => item.animation === animation)
    if (itemIndex > -1) {
      const item = this.timelineItems[itemIndex]
      item.animation.stop()
      item.animation.off('complete', () => this.onChildAnimationComplete(item.animation))

      this.timelineItems.splice(itemIndex, 1)

      const animationIndex = this.animations.indexOf(animation)
      if (animationIndex > -1) {
        this.animations.splice(animationIndex, 1)
      }

      // 重新计算总持续时间
      this.recalculateDuration()
    }

    return this
  }

  /**
   * 获取指定时间点的所有活动动画
   */
  getActiveAnimationsAt(time: number): TimelineItem[] {
    return this.timelineItems.filter((item) => time >= item.startTime && time <= item.endTime)
  }

  /**
   * 获取时间轴的所有项目
   */
  getTimelineItems(): TimelineItem[] {
    return [...this.timelineItems]
  }

  /**
   * 设置循环播放
   */
  repeat(count?: number): this {
    this._loop = count || true
    return this
  }

  /**
   * 设置回弹播放
   */
  yoyo(enable = true): this {
    this._yoyo = enable
    return this
  }

  private seekToTime(currentTime: number): void {
    for (const item of this.timelineItems) {
      const { animation, startTime, endTime } = item

      if (currentTime >= startTime && currentTime <= endTime) {
        // 动画应该在播放状态
        const animationTime = currentTime - startTime
        animation.seek(animationTime)

        if (
          animation.state !== AnimationState.PLAYING &&
          animation.state !== AnimationState.COMPLETED
        ) {
          // 如果动画未在播放状态，需要启动它
          animation.start()
          animation.seek(animationTime)
        }
      } else if (currentTime < startTime) {
        // 动画还未开始
        animation.seek(0)
        if (animation.state === AnimationState.PLAYING) {
          animation.pause()
        }
      } else if (currentTime > endTime) {
        // 动画已结束
        animation.seek(animation.duration)
        if (animation.state === AnimationState.PLAYING) {
          animation.pause()
        }
      }
    }
  }

  private recalculateDuration(): void {
    this.totalDuration = this.timelineItems.reduce((max, item) => Math.max(max, item.endTime), 0)
    this._duration = this.totalDuration
  }

  protected onChildAnimationComplete(_completedAnimation: IAnimation): void {
    // 检查是否所有动画都已完成
    const allCompleted = this.timelineItems.every(
      (item) =>
        item.animation.state === AnimationState.COMPLETED ||
        item.animation.currentTime >= item.animation.duration
    )

    if (allCompleted && this._state === AnimationState.PLAYING) {
      // 时间轴完成
      this._state = AnimationState.COMPLETED
      this.emit('complete', this)
    }
  }

  /**
   * 获取时间轴统计信息
   */
  getTimelineStats() {
    return {
      totalItems: this.timelineItems.length,
      totalDuration: this.totalDuration,
      isReversed: this._isReversed,
      currentTime: this._currentTime,
      progress: this.progress,
      activeAnimations: this.getActiveAnimationsAt(this._currentTime).length,
      items: this.timelineItems.map((item) => ({
        animationId: item.animation.id,
        startTime: item.startTime,
        endTime: item.endTime,
        duration: item.animation.duration,
        state: item.animation.state,
        progress: item.animation.progress,
      })),
    }
  }

  /**
   * 导出时间轴配置
   */
  exportConfig() {
    return {
      totalDuration: this.totalDuration,
      items: this.timelineItems.map((item) => ({
        startTime: item.startTime,
        endTime: item.endTime,
        animationConfig: {
          id: item.animation.id,
          duration: item.animation.duration,
          // 注意：这里只导出基本配置，具体的动画参数需要由子类实现
        },
      })),
    }
  }
}
