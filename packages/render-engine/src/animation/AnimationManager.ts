/**
 * 动画管理器
 * 统一管理所有动画实例和播放控制
 */

import { EventEmitter } from 'eventemitter3'
import { MultiPropertyAnimation } from './animations/MultiPropertyAnimation'
import { PropertyAnimation } from './animations/PropertyAnimation'
import { AnimationGroup, GroupPlayMode } from './groups/AnimationGroup'
import { Timeline } from './timeline/Timeline'
import {
  AnimationState,
  type AnimationUpdateInfo,
  type IAnimation,
  type MultiPropertyAnimationConfig,
  type PropertyAnimationConfig,
} from './types/AnimationTypes'

export interface AnimationManagerEvents {
  animationStart: (animation: IAnimation) => void
  animationComplete: (animation: IAnimation) => void
  animationUpdate: (info: AnimationUpdateInfo) => void
  tick: (deltaTime: number) => void
}

export class AnimationManager {
  private emitter = new EventEmitter()
  private animations = new Map<string, IAnimation>()
  private activeAnimations = new Set<IAnimation>()
  private lastUpdateTime: number = 0
  private animationFrameId: number | null = null
  private isRunning: boolean = false

  constructor() {
    // 不需要调用 super()
  }

  /**
   * 启动动画管理器
   */
  start(): this {
    if (this.isRunning) {
      return this
    }

    this.isRunning = true
    this.lastUpdateTime = performance.now()
    this.scheduleUpdate()

    return this
  }

  /**
   * 停止动画管理器
   */
  stop(): this {
    if (!this.isRunning) {
      return this
    }

    this.isRunning = false

    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId)
      this.animationFrameId = null
    }

    // 停止所有动画
    for (const animation of this.activeAnimations) {
      animation.stop()
    }
    this.activeAnimations.clear()

    return this
  }

  /**
   * 创建属性动画
   */
  createPropertyAnimation(config: PropertyAnimationConfig): PropertyAnimation {
    const animation = new PropertyAnimation(config)
    this.registerAnimation(animation)
    return animation
  }

  /**
   * 创建多属性动画
   */
  createMultiPropertyAnimation(config: MultiPropertyAnimationConfig): MultiPropertyAnimation {
    const animation = new MultiPropertyAnimation(config)
    this.registerAnimation(animation)
    return animation
  }

  /**
   * 创建动画组
   */
  createAnimationGroup(playMode: GroupPlayMode = GroupPlayMode.PARALLEL): AnimationGroup {
    const group = new AnimationGroup({
      duration: 0,
      playMode,
    })
    this.registerAnimation(group)
    return group
  }

  /**
   * 创建时间轴
   */
  createTimeline(): Timeline {
    const timeline = new Timeline()
    this.registerAnimation(timeline)
    return timeline
  }

  /**
   * 注册动画到管理器
   */
  registerAnimation(animation: IAnimation): this {
    this.animations.set(animation.id, animation)

    // 监听动画事件
    animation.on('start', () => {
      this.activeAnimations.add(animation)
      this.emitter.emit('animationStart', animation)

      // 如果管理器未运行，自动启动
      if (!this.isRunning) {
        this.start()
      }
    })

    animation.on('complete', () => {
      this.activeAnimations.delete(animation)
      this.emitter.emit('animationComplete', animation)
    })

    animation.on('cancel', () => {
      this.activeAnimations.delete(animation)
    })

    return this
  }

  /**
   * 注销动画
   */
  unregisterAnimation(animationId: string): this {
    const animation = this.animations.get(animationId)
    if (animation) {
      animation.stop()
      this.animations.delete(animationId)
      this.activeAnimations.delete(animation)
    }
    return this
  }

  /**
   * 获取动画实例
   */
  getAnimation(animationId: string): IAnimation | undefined {
    return this.animations.get(animationId)
  }

  /**
   * 获取所有动画
   */
  getAllAnimations(): IAnimation[] {
    return Array.from(this.animations.values())
  }

  /**
   * 获取活动的动画
   */
  getActiveAnimations(): IAnimation[] {
    return Array.from(this.activeAnimations)
  }

  /**
   * 暂停所有动画
   */
  pauseAll(): this {
    for (const animation of this.activeAnimations) {
      if (animation.state === AnimationState.PLAYING) {
        animation.pause()
      }
    }
    return this
  }

  /**
   * 恢复所有动画
   */
  resumeAll(): this {
    for (const animation of this.activeAnimations) {
      if (animation.state === AnimationState.PAUSED) {
        animation.resume()
      }
    }
    return this
  }

  /**
   * 停止所有动画
   */
  stopAll(): this {
    for (const animation of this.activeAnimations) {
      animation.stop()
    }
    this.activeAnimations.clear()
    return this
  }

  /**
   * 清理已完成的动画
   */
  cleanup(): this {
    const completedAnimations: string[] = []

    for (const [id, animation] of this.animations) {
      if (
        animation.state === AnimationState.COMPLETED ||
        animation.state === AnimationState.CANCELLED
      ) {
        completedAnimations.push(id)
      }
    }

    for (const id of completedAnimations) {
      this.unregisterAnimation(id)
    }

    return this
  }

  /**
   * 获取管理器统计信息
   */
  getStats() {
    const stateCount = {
      idle: 0,
      playing: 0,
      paused: 0,
      completed: 0,
      cancelled: 0,
    }

    for (const animation of this.animations.values()) {
      stateCount[animation.state]++
    }

    return {
      totalAnimations: this.animations.size,
      activeAnimations: this.activeAnimations.size,
      isRunning: this.isRunning,
      stateCount,
    }
  }

  /**
   * 销毁管理器
   */
  dispose(): void {
    this.stop()

    // 销毁所有动画
    for (const animation of this.animations.values()) {
      animation.dispose()
    }

    this.animations.clear()
    this.activeAnimations.clear()
    this.emitter.removeAllListeners()
  }

  private scheduleUpdate(): void {
    if (!this.isRunning) {
      return
    }

    this.animationFrameId = requestAnimationFrame((currentTime) => {
      this.update(currentTime)
      this.scheduleUpdate()
    })
  }

  private update(currentTime: number): void {
    const deltaTime = currentTime - this.lastUpdateTime
    this.lastUpdateTime = currentTime

    // 发射tick事件
    this.emitter.emit('tick', deltaTime)

    // 更新所有活动动画
    const completedAnimations: IAnimation[] = []

    for (const animation of this.activeAnimations) {
      if (animation.state === AnimationState.PLAYING) {
        const isStillActive = animation.update(deltaTime)

        // 发射更新事件
        this.emitter.emit('animationUpdate', {
          animation,
          deltaTime,
          currentTime: animation.currentTime,
          progress: animation.progress,
          isCompleted: !isStillActive,
        })

        if (!isStillActive) {
          completedAnimations.push(animation)
        }
      }
    }

    // 从活动列表中移除已完成的动画
    for (const animation of completedAnimations) {
      this.activeAnimations.delete(animation)
    }

    // 如果没有活动动画，可以考虑暂停更新循环
    if (this.activeAnimations.size === 0) {
      // 可以选择停止更新循环，或者继续运行以备新动画添加
      // this.isRunning = false;
    }
  }

  // 强类型事件方法
  on<K extends keyof AnimationManagerEvents>(event: K, listener: AnimationManagerEvents[K]): this {
    this.emitter.on(event, listener as any)
    return this
  }

  off<K extends keyof AnimationManagerEvents>(event: K, listener: AnimationManagerEvents[K]): this {
    this.emitter.off(event, listener as any)
    return this
  }

  emit<K extends keyof AnimationManagerEvents>(
    event: K,
    ...args: Parameters<AnimationManagerEvents[K]>
  ): boolean {
    return this.emitter.emit(event, ...args)
  }
}
