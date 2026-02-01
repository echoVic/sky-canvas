/**
 * 动画系统导出文件
 */

// 动画管理器
export { AnimationManager } from './AnimationManager'
export { MultiPropertyAnimation } from './animations/MultiPropertyAnimation'
// 具体动画实现
export { PropertyAnimation } from './animations/PropertyAnimation'
// 核心动画类
export { BaseAnimation } from './core/BaseAnimation'
// 缓动函数
export { EasingFunctions } from './easing/EasingFunctions'

// 动画组和时间轴
export { AnimationGroup, GroupPlayMode } from './groups/AnimationGroup'
export { Timeline } from './timeline/Timeline'
// 类型定义
export * from './types/AnimationTypes'

// 导入 AnimationManager 用于工厂函数
import { AnimationManager } from './AnimationManager'

// 工厂函数和辅助方法
export class AnimationUtils {
  /**
   * 创建简单的属性动画
   */
  static to(
    target: Record<string, any>,
    duration: number,
    properties: Record<string, number>,
    options?: {
      easing?: any
      delay?: number
      onComplete?: () => void
    }
  ) {
    const manager = new AnimationManager()
    const animation = manager.createMultiPropertyAnimation({
      target,
      duration,
      properties: Object.fromEntries(
        Object.entries(properties).map(([key, value]) => [key, { to: value }])
      ),
      easing: options?.easing,
      delay: options?.delay,
      autoStart: true,
    })

    if (options?.onComplete) {
      animation.on('complete', options.onComplete)
    }

    manager.start()
    return animation
  }

  /**
   * 创建从指定值开始的属性动画
   */
  static fromTo(
    target: Record<string, any>,
    duration: number,
    from: Record<string, number>,
    to: Record<string, number>,
    options?: {
      easing?: any
      delay?: number
      onComplete?: () => void
    }
  ) {
    const manager = new AnimationManager()
    const properties: Record<string, { from: number; to: number }> = {}

    for (const [key, toValue] of Object.entries(to)) {
      properties[key] = {
        from: from[key] ?? 0,
        to: toValue,
      }
    }

    const animation = manager.createMultiPropertyAnimation({
      target,
      duration,
      properties,
      easing: options?.easing,
      delay: options?.delay,
      autoStart: true,
    })

    if (options?.onComplete) {
      animation.on('complete', options.onComplete)
    }

    manager.start()
    return animation
  }

  /**
   * 创建时间轴序列
   */
  static timeline() {
    const manager = new AnimationManager()
    const timeline = manager.createTimeline()

    const chainableObject = {
      timeline,
      manager,
      to: (target: any, duration: number, properties: Record<string, number>) => {
        const animation = manager.createMultiPropertyAnimation({
          target,
          duration,
          properties: Object.fromEntries(
            Object.entries(properties).map(([key, value]) => [key, { to: value }])
          ),
        })
        timeline.then(animation)
        return chainableObject
      },
      play: () => {
        manager.start()
        timeline.play()
        return chainableObject
      },
    }

    return chainableObject
  }

  /**
   * 等待指定时间的延迟动画
   */
  static delay(duration: number) {
    const manager = new AnimationManager()
    const dummyTarget = {}
    const animation = manager.createPropertyAnimation({
      target: dummyTarget,
      property: '_dummy',
      from: 0,
      to: 1,
      duration,
      autoStart: false,
    })

    return animation
  }

  /**
   * 循环动画
   */
  static repeat(animation: any, count: number | true = true) {
    animation._loop = count
    return animation
  }

  /**
   * 回弹动画
   */
  static yoyo(animation: any) {
    animation._yoyo = true
    return animation
  }
}
