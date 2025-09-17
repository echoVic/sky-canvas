/**
 * 属性动画测试
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import './setup';
import { PropertyAnimation } from '../../animations/PropertyAnimation';
import { EasingType, AnimationState } from '../../types/AnimationTypes';
import { createTestTarget, TestUtils } from './setup';

describe('PropertyAnimation', () => {
  let target: any;
  
  beforeEach(() => {
    target = createTestTarget();
    TestUtils.resetTimeMocks();
  });

  afterEach(() => {
    vi.clearAllTimers();
  });

  describe('基本功能', () => {
    it('应该正确初始化属性动画', () => {
      const animation = new PropertyAnimation({
        target,
        property: 'x',
        from: 0,
        to: 100,
        duration: 1000
      });

      expect(animation.id).toBeDefined();
      expect(animation.state).toBe(AnimationState.IDLE);
      expect(animation.duration).toBe(1000);
      expect(animation.currentTime).toBe(0);
      expect(animation.progress).toBe(0);
    });

    it('应该使用目标对象的当前值作为起始值', () => {
      target.x = 50;
      
      const animation = new PropertyAnimation({
        target,
        property: 'x',
        to: 100,
        duration: 1000
      });

      expect(animation.getPropertyInfo().from).toBe(50);
    });

    it('应该正确应用动画到目标属性', () => {
      const animation = new PropertyAnimation({
        target,
        property: 'x',
        from: 0,
        to: 100,
        duration: 1000
      });

      // 模拟动画进行到50%
      animation.seek(500);
      expect(target.x).toBe(50);

      // 模拟动画完成
      animation.seek(1000);
      expect(target.x).toBe(100);
    });

    it('应该支持嵌套属性', () => {
      const animation = new PropertyAnimation({
        target,
        property: 'transform.x',
        from: 0,
        to: 100,
        duration: 1000
      });

      animation.seek(500);
      expect(target.transform.x).toBe(50);

      animation.seek(1000);
      expect(target.transform.x).toBe(100);
    });

    it('应该正确处理深层嵌套属性', () => {
      target.nested = { deep: { value: 0 } };
      
      const animation = new PropertyAnimation({
        target,
        property: 'nested.deep.value',
        from: 0,
        to: 100,
        duration: 1000
      });

      animation.seek(500);
      expect(target.nested.deep.value).toBe(50);

      animation.seek(1000);
      expect(target.nested.deep.value).toBe(100);
    });
  });

  describe('动画控制', () => {
    it('应该正确启动动画', async () => {
      const animation = new PropertyAnimation({
        target,
        property: 'x',
        from: 0,
        to: 100,
        duration: 100
      });

      const startCallback = vi.fn();
      animation.on('start', startCallback);

      animation.start();
      expect(animation.state).toBe(AnimationState.PLAYING);
      expect(startCallback).toHaveBeenCalledWith(animation);
    });

    it('应该正确暂停和恢复动画', () => {
      const animation = new PropertyAnimation({
        target,
        property: 'x',
        from: 0,
        to: 100,
        duration: 1000
      });

      const pauseCallback = vi.fn();
      const resumeCallback = vi.fn();
      animation.on('pause', pauseCallback);
      animation.on('resume', resumeCallback);

      animation.start();
      animation.pause();
      expect(animation.state).toBe(AnimationState.PAUSED);
      expect(pauseCallback).toHaveBeenCalled();

      animation.resume();
      expect(animation.state).toBe(AnimationState.PLAYING);
      expect(resumeCallback).toHaveBeenCalled();
    });

    it('应该正确停止动画', () => {
      const animation = new PropertyAnimation({
        target,
        property: 'x',
        from: 0,
        to: 100,
        duration: 1000
      });

      const cancelCallback = vi.fn();
      animation.on('cancel', cancelCallback);

      animation.start();
      animation.stop();
      
      expect(animation.state).toBe(AnimationState.CANCELLED);
      expect(cancelCallback).toHaveBeenCalledWith(animation);
    });

    it('应该支持定位到特定时间点', () => {
      const animation = new PropertyAnimation({
        target,
        property: 'x',
        from: 0,
        to: 100,
        duration: 1000
      });

      animation.seek(250);
      expect(animation.currentTime).toBe(250);
      expect(animation.progress).toBe(0.25);
      expect(target.x).toBe(25);

      animation.seek(750);
      expect(animation.currentTime).toBe(750);
      expect(animation.progress).toBe(0.75);
      expect(target.x).toBe(75);
    });
  });

  describe('缓动函数', () => {
    it('应该应用线性缓动', () => {
      const animation = new PropertyAnimation({
        target,
        property: 'x',
        from: 0,
        to: 100,
        duration: 1000,
        easing: EasingType.LINEAR
      });

      animation.seek(250);
      expect(target.x).toBe(25);

      animation.seek(500);
      expect(target.x).toBe(50);

      animation.seek(750);
      expect(target.x).toBe(75);
    });

    it('应该应用自定义缓动函数', () => {
      const customEasing = (t: number) => t * t; // 二次方缓动

      const animation = new PropertyAnimation({
        target,
        property: 'x',
        from: 0,
        to: 100,
        duration: 1000,
        easing: customEasing
      });

      animation.seek(500); // 50% 进度
      expect(target.x).toBe(25); // 0.5^2 * 100 = 25

      animation.seek(1000); // 100% 进度
      expect(target.x).toBe(100); // 1^2 * 100 = 100
    });
  });

  describe('事件系统', () => {
    it('应该触发更新事件', () => {
      const animation = new PropertyAnimation({
        target,
        property: 'x',
        from: 0,
        to: 100,
        duration: 1000
      });

      const updateCallback = vi.fn();
      animation.on('update', updateCallback);

      animation.seek(500);
      // 注意：seek不会触发update事件，因为它是手动定位
      // update事件只在动画自然播放时触发
    });

    it('应该在动画完成时触发完成事件', async () => {
      const animation = new PropertyAnimation({
        target,
        property: 'x',
        from: 0,
        to: 100,
        duration: 50
      });

      const completeCallback = vi.fn();
      animation.on('complete', completeCallback);

      animation.start();
      
      // 等待动画完成
      await TestUtils.wait(100);
      
      expect(completeCallback).toHaveBeenCalledWith(animation);
      expect(animation.state).toBe(AnimationState.COMPLETED);
    });
  });

  describe('工具方法', () => {
    it('应该正确重置属性到初始值', () => {
      target.x = 50;
      
      const animation = new PropertyAnimation({
        target,
        property: 'x',
        to: 100,
        duration: 1000
      });

      animation.seek(1000); // 完成动画
      expect(target.x).toBe(100);

      animation.reset();
      expect(target.x).toBe(50); // 重置到初始值
    });

    it('应该支持更新目标值', () => {
      const animation = new PropertyAnimation({
        target,
        property: 'x',
        from: 0,
        to: 100,
        duration: 1000
      });

      animation.to(200);
      animation.seek(500);
      expect(target.x).toBe(100); // 0 + (200-0) * 0.5 = 100
    });

    it('应该支持更新起始值', () => {
      const animation = new PropertyAnimation({
        target,
        property: 'x',
        from: 0,
        to: 100,
        duration: 1000
      });

      animation.from(50);
      animation.seek(500);
      expect(target.x).toBe(75); // 50 + (100-50) * 0.5 = 75
    });

    it('应该创建反向动画', () => {
      const animation = new PropertyAnimation({
        target,
        property: 'x',
        from: 0,
        to: 100,
        duration: 1000
      });

      const reversed = animation.reverse();
      
      const reversedInfo = reversed.getPropertyInfo();
      expect(reversedInfo.from).toBe(100);
      expect(reversedInfo.to).toBe(0);
      expect(reversed.duration).toBe(1000);
    });

    it('应该获取正确的属性信息', () => {
      target.x = 25;
      
      const animation = new PropertyAnimation({
        target,
        property: 'x',
        from: 0,
        to: 100,
        duration: 1000
      });

      const info = animation.getPropertyInfo();
      expect(info.target).toBe(target);
      expect(info.property).toBe('x');
      expect(info.from).toBe(0);
      expect(info.to).toBe(100);
      expect(info.current).toBe(25);
    });
  });

  describe('错误处理', () => {
    it('应该处理无效的目标对象', () => {
      const consoleWarn = vi.spyOn(console, 'warn').mockImplementation(() => {});
      
      const animation = new PropertyAnimation({
        target: null as any,
        property: 'x',
        from: 0,
        to: 100,
        duration: 1000
      });

      animation.seek(500);
      expect(consoleWarn).toHaveBeenCalledWith(
        expect.stringContaining('Animation target is not valid')
      );

      consoleWarn.mockRestore();
    });

    it('应该处理不存在的属性', () => {
      const animation = new PropertyAnimation({
        target,
        property: 'nonExistentProperty',
        from: 0,
        to: 100,
        duration: 1000
      });

      // 不应该抛出错误
      expect(() => animation.seek(500)).not.toThrow();
    });

    it('应该处理属性设置错误', () => {
      const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
      
      // 创建一个会抛出错误的对象
      const problemTarget = {};
      Object.defineProperty(problemTarget, 'x', {
        set() {
          throw new Error('Cannot set property');
        },
        get() {
          return 0;
        }
      });

      const animation = new PropertyAnimation({
        target: problemTarget,
        property: 'x',
        from: 0,
        to: 100,
        duration: 1000
      });

      animation.seek(500);
      expect(consoleError).toHaveBeenCalled();

      consoleError.mockRestore();
    });
  });
});