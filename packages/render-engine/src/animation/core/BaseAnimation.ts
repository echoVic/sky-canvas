/**
 * 动画基类
 * 提供动画生命周期管理和事件系统
 */

import { EventEmitter } from 'eventemitter3'
import { EasingFunctions } from '../easing/EasingFunctions'
import {
  type AnimationConfig,
  type AnimationEvents,
  AnimationState,
  type EasingFunction,
  EasingType,
  type IAnimation,
} from '../types/AnimationTypes'

export abstract class BaseAnimation implements IAnimation {
  private static nextId = 1

  private emitter = new EventEmitter()
  protected _id: string
  protected _state: AnimationState = AnimationState.IDLE
  protected _duration: number
  protected _delay: number
  protected _currentTime: number = 0
  protected _startTime: number = 0
  protected _pausedTime: number = 0
  protected _loop: boolean | number
  protected _yoyo: boolean
  protected _currentLoopCount: number = 0
  protected _isReversed: boolean = false
  protected _easingFunction: EasingFunction

  protected _delayTimer: number | null = null
  protected _animationFrameId: number | null = null

  constructor(config: AnimationConfig) {
    // 不需要调用 super()

    this._id = `animation_${BaseAnimation.nextId++}`
    this._duration = Math.max(0, config.duration)
    this._delay = config.delay || 0
    this._loop = config.loop || false
    this._yoyo = config.yoyo || false

    // 设置缓动函数
    if (typeof config.easing === 'function') {
      this._easingFunction = config.easing
    } else {
      this._easingFunction = EasingFunctions.get(config.easing || EasingType.LINEAR)
    }

    if (config.autoStart) {
      this.start()
    }
  }

  get id(): string {
    return this._id
  }

  get state(): AnimationState {
    return this._state
  }

  get duration(): number {
    return this._duration
  }

  get currentTime(): number {
    return this._currentTime
  }

  get progress(): number {
    if (this._duration === 0) return 1
    return Math.min(1, Math.max(0, this._currentTime / this._duration))
  }

  start(): this {
    if (this._state === AnimationState.PLAYING) {
      return this
    }

    this._state = AnimationState.PLAYING
    this._startTime = performance.now()
    this._currentTime = 0
    this._currentLoopCount = 0
    this._isReversed = false

    if (this._delay > 0) {
      this._delayTimer = window.setTimeout(() => {
        this._delayTimer = null
        this.startAnimation()
      }, this._delay)
    } else {
      this.startAnimation()
    }

    this.emitter.emit('start', this)
    return this
  }

  pause(): this {
    if (this._state !== AnimationState.PLAYING) {
      return this
    }

    this._state = AnimationState.PAUSED
    this._pausedTime = performance.now()

    if (this._delayTimer) {
      clearTimeout(this._delayTimer)
      this._delayTimer = null
    }

    if (this._animationFrameId) {
      cancelAnimationFrame(this._animationFrameId)
      this._animationFrameId = null
    }

    this.emitter.emit('pause', this)
    return this
  }

  resume(): this {
    if (this._state !== AnimationState.PAUSED) {
      return this
    }

    this._state = AnimationState.PLAYING

    // 调整开始时间以补偿暂停的时间
    const pausedDuration = performance.now() - this._pausedTime
    this._startTime += pausedDuration

    this.startAnimation()
    this.emitter.emit('resume', this)
    return this
  }

  stop(): this {
    this._state = AnimationState.CANCELLED
    this.cleanup()
    this.emitter.emit('cancel', this)
    return this
  }

  seek(time: number): this {
    const clampedTime = Math.max(0, Math.min(this._duration, time))
    this._currentTime = clampedTime

    const progress = this.calculateProgress()
    this.applyAnimation(progress)

    return this
  }

  update(deltaTime: number): boolean {
    if (this._state !== AnimationState.PLAYING) {
      return false
    }

    this._currentTime += deltaTime

    if (this._currentTime >= this._duration) {
      return this.handleAnimationEnd()
    }

    const progress = this.calculateProgress()
    this.applyAnimation(progress)
    this.emitter.emit('update', this, progress)

    return true
  }

  dispose(): void {
    this.stop()
    this.emitter.removeAllListeners()
  }

  protected abstract applyAnimation(progress: number): void

  private startAnimation(): void {
    const animate = () => {
      if (this._state !== AnimationState.PLAYING) {
        return
      }

      const now = performance.now()
      const elapsed = now - this._startTime
      this._currentTime = elapsed

      if (this._currentTime >= this._duration) {
        if (!this.handleAnimationEnd()) {
          return
        }
      } else {
        const progress = this.calculateProgress()
        this.applyAnimation(progress)
        this.emitter.emit('update', this, progress)
      }

      this._animationFrameId = requestAnimationFrame(animate)
    }

    this._animationFrameId = requestAnimationFrame(animate)
  }

  private handleAnimationEnd(): boolean {
    if (this._loop === false) {
      this._state = AnimationState.COMPLETED
      this.cleanup()
      this.emitter.emit('complete', this)
      return false
    }

    // 处理循环
    if (typeof this._loop === 'number' && this._currentLoopCount >= this._loop - 1) {
      this._state = AnimationState.COMPLETED
      this.cleanup()
      this.emitter.emit('complete', this)
      return false
    }

    // 开始下一次循环
    this._currentLoopCount++
    this._currentTime = this._currentTime - this._duration

    if (this._yoyo) {
      this._isReversed = !this._isReversed
    }

    this.emitter.emit('loop', this, this._currentLoopCount)
    return true
  }

  private calculateProgress(): number {
    let progress = this.progress

    // 应用缓动函数
    progress = this._easingFunction(progress)

    // 处理 yoyo 反向播放
    if (this._isReversed) {
      progress = 1 - progress
    }

    return progress
  }

  private cleanup(): void {
    if (this._delayTimer) {
      clearTimeout(this._delayTimer)
      this._delayTimer = null
    }

    if (this._animationFrameId) {
      cancelAnimationFrame(this._animationFrameId)
      this._animationFrameId = null
    }
  }

  // 强类型事件方法
  on<K extends keyof AnimationEvents>(event: K, listener: AnimationEvents[K]): this {
    this.emitter.on(event, listener as any)
    return this
  }

  off<K extends keyof AnimationEvents>(event: K, listener: AnimationEvents[K]): this {
    this.emitter.off(event, listener as any)
    return this
  }

  emit<K extends keyof AnimationEvents>(
    event: K,
    ...args: Parameters<AnimationEvents[K]>
  ): boolean {
    return this.emitter.emit(event, ...args)
  }
}
