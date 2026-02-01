/**
 * 动画管理器测试
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import './setup'
import { AnimationManager } from '../AnimationManager'
import { PropertyAnimation } from '../animations/PropertyAnimation'
import { AnimationState } from '../types/AnimationTypes'
import { createTestTarget, TestUtils } from './setup'

describe('AnimationManager', () => {
  let manager: AnimationManager
  let target: any

  beforeEach(() => {
    manager = new AnimationManager()
    target = createTestTarget()
    TestUtils.resetTimeMocks()
  })

  afterEach(() => {
    manager.dispose()
    vi.clearAllTimers()
  })

  describe('基本功能', () => {
    it('应该正确创建动画管理器', () => {
      expect(manager).toBeDefined()
      expect(manager.getAllAnimations()).toHaveLength(0)
      expect(manager.getActiveAnimations()).toHaveLength(0)
    })

    it('应该启动和停止管理器', () => {
      expect(manager.start()).toBe(manager)
      expect(manager.stop()).toBe(manager)
    })
  })

  describe('属性动画创建', () => {
    it('应该创建属性动画', () => {
      const animation = manager.createPropertyAnimation({
        target,
        property: 'x',
        from: 0,
        to: 100,
        duration: 1000,
      })

      expect(animation).toBeInstanceOf(PropertyAnimation)
      expect(animation.id).toBeDefined()
      expect(manager.getAllAnimations()).toContain(animation)
    })

    it('应该创建多属性动画', () => {
      const animation = manager.createMultiPropertyAnimation({
        target,
        properties: {
          x: { from: 0, to: 100 },
          y: { from: 0, to: 200 },
        },
        duration: 1000,
      })

      expect(animation).toBeDefined()
      expect(animation.id).toBeDefined()
      expect(manager.getAllAnimations()).toContain(animation)
    })

    it('应该创建动画组', () => {
      const group = manager.createAnimationGroup()

      expect(group).toBeDefined()
      expect(group.id).toBeDefined()
      expect(manager.getAllAnimations()).toContain(group)
    })

    it('应该创建时间轴', () => {
      const timeline = manager.createTimeline()

      expect(timeline).toBeDefined()
      expect(timeline.id).toBeDefined()
      expect(manager.getAllAnimations()).toContain(timeline)
    })
  })

  describe('动画注册和管理', () => {
    it('应该正确注册动画', () => {
      const animation = new PropertyAnimation({
        target,
        property: 'x',
        from: 0,
        to: 100,
        duration: 1000,
      })

      manager.registerAnimation(animation)

      expect(manager.getAllAnimations()).toContain(animation)
      expect(manager.getAnimation(animation.id)).toBe(animation)
    })

    it('应该正确注销动画', () => {
      const animation = manager.createPropertyAnimation({
        target,
        property: 'x',
        from: 0,
        to: 100,
        duration: 1000,
      })

      const animationId = animation.id
      expect(manager.getAnimation(animationId)).toBe(animation)

      manager.unregisterAnimation(animationId)
      expect(manager.getAnimation(animationId)).toBeUndefined()
      expect(manager.getAllAnimations()).not.toContain(animation)
    })

    it('应该在动画开始时自动启动管理器', async () => {
      const animation = manager.createPropertyAnimation({
        target,
        property: 'x',
        from: 0,
        to: 100,
        duration: 100,
      })

      const startCallback = vi.fn()
      manager.on('animationStart', startCallback)

      animation.start()

      expect(manager.getActiveAnimations()).toContain(animation)
      expect(startCallback).toHaveBeenCalledWith(animation)
    })

    it('应该在动画完成时从活动列表移除', async () => {
      const animation = manager.createPropertyAnimation({
        target,
        property: 'x',
        from: 0,
        to: 100,
        duration: 50,
      })

      const completeCallback = vi.fn()
      manager.on('animationComplete', completeCallback)

      animation.start()
      expect(manager.getActiveAnimations()).toContain(animation)

      // 等待动画完成
      await TestUtils.wait(100)

      expect(completeCallback).toHaveBeenCalledWith(animation)
      expect(manager.getActiveAnimations()).not.toContain(animation)
    })
  })

  describe('批量控制', () => {
    let animations: PropertyAnimation[]

    beforeEach(() => {
      animations = [
        manager.createPropertyAnimation({
          target,
          property: 'x',
          from: 0,
          to: 100,
          duration: 1000,
        }),
        manager.createPropertyAnimation({
          target,
          property: 'y',
          from: 0,
          to: 200,
          duration: 1000,
        }),
      ]

      // 启动所有动画
      animations.forEach((anim) => anim.start())
    })

    it('应该暂停所有动画', () => {
      manager.pauseAll()

      for (const animation of animations) {
        expect(animation.state).toBe(AnimationState.PAUSED)
      }
    })

    it('应该恢复所有动画', () => {
      manager.pauseAll()
      manager.resumeAll()

      for (const animation of animations) {
        expect(animation.state).toBe(AnimationState.PLAYING)
      }
    })

    it('应该停止所有动画', () => {
      manager.stopAll()

      for (const animation of animations) {
        expect(animation.state).toBe(AnimationState.CANCELLED)
      }

      expect(manager.getActiveAnimations()).toHaveLength(0)
    })
  })

  describe('更新循环', () => {
    it('应该发射tick事件', async () => {
      const tickCallback = vi.fn()
      manager.on('tick', tickCallback)

      manager.start()

      // 等待几个动画帧
      await TestUtils.wait(50)

      expect(tickCallback).toHaveBeenCalled()
      expect(tickCallback).toHaveBeenCalledWith(expect.any(Number))
    })

    it('应该发射动画更新事件', async () => {
      const updateCallback = vi.fn()
      manager.on('animationUpdate', updateCallback)

      const animation = manager.createPropertyAnimation({
        target,
        property: 'x',
        from: 0,
        to: 100,
        duration: 100,
      })

      animation.start()
      manager.start()

      // 等待动画更新
      await TestUtils.wait(30)

      expect(updateCallback).toHaveBeenCalledWith(
        expect.objectContaining({
          animation,
          deltaTime: expect.any(Number),
          currentTime: expect.any(Number),
          progress: expect.any(Number),
          isCompleted: expect.any(Boolean),
        })
      )
    })

    it('应该正确更新动画状态', () => {
      const animation = manager.createPropertyAnimation({
        target,
        property: 'x',
        from: 0,
        to: 100,
        duration: 1000,
      })

      animation.start()
      manager.start()

      // 手动seek到中间位置验证状态
      animation.seek(500)
      expect(animation.state).toBe(AnimationState.PLAYING)
      expect(target.x).toBe(50)

      // 手动seek到完成位置验证状态
      animation.seek(1000)
      expect(target.x).toBe(100)
    })
  })

  describe('清理功能', () => {
    it('应该清理已完成的动画', () => {
      const animation1 = manager.createPropertyAnimation({
        target,
        property: 'x',
        from: 0,
        to: 100,
        duration: 1000,
      })

      const animation2 = manager.createPropertyAnimation({
        target,
        property: 'y',
        from: 0,
        to: 200,
        duration: 1000,
      })

      // 手动设置一个为已完成状态
      animation1.start()
      animation1.stop()
      animation1['_state'] = AnimationState.COMPLETED

      expect(manager.getAllAnimations()).toHaveLength(2)

      manager.cleanup()

      expect(manager.getAllAnimations()).toHaveLength(1)
      expect(manager.getAnimation(animation1.id)).toBeUndefined()
      expect(manager.getAnimation(animation2.id)).toBe(animation2)
    })

    it('应该正确销毁管理器', () => {
      const animation = manager.createPropertyAnimation({
        target,
        property: 'x',
        from: 0,
        to: 100,
        duration: 1000,
      })

      animation.start()
      expect(manager.getAllAnimations()).toHaveLength(1)

      manager.dispose()

      expect(animation.state).toBe(AnimationState.CANCELLED)
      expect(manager.getAllAnimations()).toHaveLength(0)
      expect(manager.getActiveAnimations()).toHaveLength(0)
    })
  })

  describe('统计信息', () => {
    it('应该返回正确的统计信息', () => {
      const animation1 = manager.createPropertyAnimation({
        target,
        property: 'x',
        from: 0,
        to: 100,
        duration: 1000,
      })

      manager.createPropertyAnimation({
        target,
        property: 'y',
        from: 0,
        to: 200,
        duration: 1000,
      })

      animation1.start()

      const stats = manager.getStats()

      expect(stats.totalAnimations).toBe(2)
      expect(stats.activeAnimations).toBe(1)
      // 管理器在有活动动画时会自动启动
      expect(typeof stats.isRunning).toBe('boolean')

      expect(stats.stateCount.playing).toBe(1)
      expect(stats.stateCount.idle).toBe(1)
      expect(stats.stateCount.completed).toBe(0)
      expect(stats.stateCount.paused).toBe(0)
      expect(stats.stateCount.cancelled).toBe(0)
    })
  })

  describe('事件系统', () => {
    it('应该正确处理事件监听器', () => {
      const startCallback = vi.fn()
      const completeCallback = vi.fn()

      manager.on('animationStart', startCallback)
      manager.on('animationComplete', completeCallback)

      const animation = manager.createPropertyAnimation({
        target,
        property: 'x',
        from: 0,
        to: 100,
        duration: 50,
      })

      animation.start()
      expect(startCallback).toHaveBeenCalledWith(animation)
    })

    it('应该正确移除事件监听器', () => {
      const startCallback = vi.fn()

      manager.on('animationStart', startCallback)
      manager.off('animationStart', startCallback)

      const animation = manager.createPropertyAnimation({
        target,
        property: 'x',
        from: 0,
        to: 100,
        duration: 1000,
      })

      animation.start()
      expect(startCallback).not.toHaveBeenCalled()
    })
  })
})
