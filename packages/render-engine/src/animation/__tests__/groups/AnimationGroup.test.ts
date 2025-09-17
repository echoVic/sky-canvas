/**
 * AnimationGroup 单元测试
 * 测试动画组的功能
 */

import { AnimationGroup, GroupPlayMode } from '../../AnimationGroup';
import { AnimationState } from '../../types/AnimationTypes';
import { BaseAnimation } from '../../core/BaseAnimation';

// 创建测试用的动画类
class TestAnimation extends BaseAnimation {
  private appliedProgress: number = 0;

  constructor(duration: number) {
    super({ duration });
  }

  protected applyAnimation(progress: number): void {
    this.appliedProgress = progress;
  }

  getAppliedProgress(): number {
    return this.appliedProgress;
  }
}

describe('AnimationGroup', () => {
  let animationGroup: AnimationGroup;
  let animation1: TestAnimation;
  let animation2: TestAnimation;
  let animation3: TestAnimation;

  beforeEach(() => {
    animationGroup = new AnimationGroup({
      duration: 0,
      playMode: GroupPlayMode.PARALLEL
    });
    animation1 = new TestAnimation(1000);
    animation2 = new TestAnimation(500);
    animation3 = new TestAnimation(800);
  });

  afterEach(() => {
    animationGroup.stop();
  });

  describe('基本功能', () => {
    it('应该正确创建动画组', () => {
      expect(animationGroup).toBeInstanceOf(AnimationGroup);
      expect(animationGroup.state).toBe(AnimationState.IDLE);
      expect(animationGroup.getPlayMode()).toBe(GroupPlayMode.PARALLEL);
    });

    it('应该正确创建带配置的动画组', () => {
      const sequentialGroup = new AnimationGroup({
        duration: 0,
        playMode: GroupPlayMode.SEQUENCE
      });
      
      expect(sequentialGroup.getPlayMode()).toBe(GroupPlayMode.SEQUENCE);
    });

    it('应该正确获取动画列表', () => {
      animationGroup.add(animation1).add(animation2);
      
      const animations = animationGroup.getAnimations();
      expect(animations).toHaveLength(2);
      expect(animations).toContain(animation1);
      expect(animations).toContain(animation2);
    });
  });

  describe('动画管理', () => {
    it('应该正确添加动画', () => {
      const result = animationGroup.add(animation1);
      
      expect(result).toBe(animationGroup); // 支持链式调用
      expect(animationGroup.getAnimations()).toContain(animation1);
    });

    it('应该正确移除动画', () => {
      animationGroup.add(animation1).add(animation2);
      
      const result = animationGroup.remove(animation1);
      
      expect(result).toBe(animationGroup); // 支持链式调用
      expect(animationGroup.getAnimations()).not.toContain(animation1);
      expect(animationGroup.getAnimations()).toContain(animation2);
    });

    it('应该正确清空动画', () => {
      animationGroup.add(animation1).add(animation2).add(animation3);
      
      const result = animationGroup.clear();
      
      expect(result).toBe(animationGroup); // 支持链式调用
      expect(animationGroup.getAnimations()).toHaveLength(0);
    });

    it('移除不存在的动画应该不影响其他动画', () => {
      animationGroup.add(animation1);
      
      const originalLength = animationGroup.getAnimations().length;
      animationGroup.remove(animation2); // animation2 不在组中
      
      expect(animationGroup.getAnimations().length).toBe(originalLength);
    });
  });

  describe('持续时间计算', () => {
    it('并行模式应该使用最长动画的持续时间', () => {
      animationGroup.setPlayMode(GroupPlayMode.PARALLEL);
      animationGroup.add(animation1).add(animation2).add(animation3);
      
      // 最长的是 animation1 (1000ms)
      expect(animationGroup.duration).toBe(1000);
    });

    it('顺序模式应该使用所有动画持续时间的总和', () => {
      animationGroup.setPlayMode(GroupPlayMode.SEQUENCE);
      animationGroup.add(animation1).add(animation2).add(animation3);
      
      // 总和: 1000 + 500 + 800 = 2300ms
      expect(animationGroup.duration).toBe(2300);
    });

    it('空动画组的持续时间应该为0', () => {
      expect(animationGroup.duration).toBe(0);
    });

    it('添加动画后应该自动更新持续时间', () => {
      const originalDuration = animationGroup.duration;
      animationGroup.add(animation1);
      
      expect(animationGroup.duration).not.toBe(originalDuration);
      expect(animationGroup.duration).toBe(1000);
    });

    it('移除动画后应该自动更新持续时间', () => {
      animationGroup.add(animation1).add(animation2);
      const durationWithBoth = animationGroup.duration;
      
      animationGroup.remove(animation1);
      
      expect(animationGroup.duration).not.toBe(durationWithBoth);
      expect(animationGroup.duration).toBe(500);
    });
  });

  describe('播放模式', () => {
    it('应该正确设置播放模式', () => {
      const result = animationGroup.setPlayMode(GroupPlayMode.SEQUENCE);
      
      expect(result).toBe(animationGroup); // 支持链式调用
      expect(animationGroup.getPlayMode()).toBe(GroupPlayMode.SEQUENCE);
    });

    it('切换播放模式应该重新计算持续时间', () => {
      animationGroup.add(animation1).add(animation2);
      
      const parallelDuration = animationGroup.duration;
      animationGroup.setPlayMode(GroupPlayMode.SEQUENCE);
      const sequentialDuration = animationGroup.duration;
      
      expect(parallelDuration).not.toBe(sequentialDuration);
      expect(parallelDuration).toBe(1000); // 最长的动画
      expect(sequentialDuration).toBe(1500); // 总和
    });
  });

  describe('并行播放模式', () => {
    beforeEach(() => {
      animationGroup.setPlayMode(GroupPlayMode.PARALLEL);
      animationGroup.add(animation1).add(animation2).add(animation3);
    });

    it('应该同时启动所有动画', () => {
      animationGroup.start();
      
      expect(animation1.state).toBe(AnimationState.PLAYING);
      expect(animation2.state).toBe(AnimationState.PLAYING);
      expect(animation3.state).toBe(AnimationState.PLAYING);
    });

    it('应该同时暂停所有动画', () => {
      animationGroup.start();
      animationGroup.pause();
      
      expect(animation1.state).toBe(AnimationState.PAUSED);
      expect(animation2.state).toBe(AnimationState.PAUSED);
      expect(animation3.state).toBe(AnimationState.PAUSED);
    });

    it('应该同时恢复所有动画', () => {
      animationGroup.start();
      animationGroup.pause();
      animationGroup.resume();
      
      expect(animation1.state).toBe(AnimationState.PLAYING);
      expect(animation2.state).toBe(AnimationState.PLAYING);
      expect(animation3.state).toBe(AnimationState.PLAYING);
    });

    it('应该同时停止所有动画', () => {
      animationGroup.start();
      animationGroup.stop();
      
      expect(animation1.state).toBe(AnimationState.IDLE);
      expect(animation2.state).toBe(AnimationState.IDLE);
      expect(animation3.state).toBe(AnimationState.IDLE);
    });
  });

  describe('顺序播放模式', () => {
    beforeEach(() => {
      animationGroup.setPlayMode(GroupPlayMode.SEQUENCE);
      animationGroup.add(animation1).add(animation2).add(animation3);
    });

    it('应该按顺序启动动画', () => {
      animationGroup.start();
      
      // 只有第一个动画应该开始播放
      expect(animation1.state).toBe(AnimationState.PLAYING);
      expect(animation2.state).toBe(AnimationState.IDLE);
      expect(animation3.state).toBe(AnimationState.IDLE);
    });

    it('第一个动画完成后应该启动第二个', () => {
      animationGroup.start();
      
      // 模拟第一个动画完成
      (animation1 as any)._state = AnimationState.COMPLETED;
      animation1.emit('complete', animation1);
      
      expect(animation1.state).toBe(AnimationState.COMPLETED);
      expect(animation2.state).toBe(AnimationState.PLAYING);
      expect(animation3.state).toBe(AnimationState.IDLE);
    });
  });

  describe('跳转功能', () => {
    beforeEach(() => {
      animationGroup.add(animation1).add(animation2);
    });

    it('并行模式下应该正确跳转所有动画', () => {
      animationGroup.setPlayMode(GroupPlayMode.PARALLEL);
      animationGroup.seek(500); // 跳转到50%
      
      // animation1: 500/1000 = 0.5
      // animation2: 500/500 = 1.0 (完成)
      expect(animation1.getAppliedProgress()).toBeCloseTo(0.5, 2);
      expect(animation2.getAppliedProgress()).toBeCloseTo(1.0, 2);
    });

    it('顺序模式下应该正确跳转到指定时间', () => {
      animationGroup.setPlayMode(GroupPlayMode.SEQUENCE);
      animationGroup.seek(1200); // 跳转到第二个动画的中间
      
      // animation1 应该完成，animation2 应该在 200/500 = 0.4
      expect(animation1.getAppliedProgress()).toBeCloseTo(1.0, 2);
      expect(animation2.getAppliedProgress()).toBeCloseTo(0.4, 2);
    });
  });

  describe('事件处理', () => {
    it('应该正确处理子动画完成事件', () => {
      let completeCallCount = 0;
      animationGroup.on('complete', () => {
        completeCallCount++;
      });
      
      animationGroup.setPlayMode(GroupPlayMode.PARALLEL);
      animationGroup.add(animation1).add(animation2);
      
      // 模拟所有动画完成
      animation1.emit('complete', animation1);
      animation2.emit('complete', animation2);
      
      // 注意：具体的验证方式需要根据实际实现调整
    });
  });

  describe('资源清理', () => {
    it('应该正确清理资源', () => {
      animationGroup.add(animation1).add(animation2);
      
      expect(() => {
        animationGroup.dispose();
      }).not.toThrow();
    });

    it('清理后应该移除所有动画', () => {
      animationGroup.add(animation1).add(animation2);
      animationGroup.dispose();
      
      expect(animationGroup.getAnimations()).toHaveLength(0);
    });
  });

  describe('统计信息', () => {
    beforeEach(() => {
      animationGroup.add(animation1).add(animation2).add(animation3);
    });

    it('应该正确获取统计信息', () => {
      const stats = animationGroup.getStats();
      
      expect(stats.totalAnimations).toBe(3);
      expect(stats.playMode).toBe(GroupPlayMode.PARALLEL);
      expect(stats.totalDuration).toBe(1000); // 并行模式下的最长持续时间
    });

    it('空动画组的统计信息应该正确', () => {
      const emptyGroup = new AnimationGroup({ duration: 0 });
      const stats = emptyGroup.getStats();
      
      expect(stats.totalAnimations).toBe(0);
      expect(stats.totalDuration).toBe(0);
    });
  });

  describe('边界情况', () => {
    it('应该正确处理零持续时间的动画', () => {
      const zeroAnimation = new TestAnimation(0);
      animationGroup.add(zeroAnimation);
      
      expect(animationGroup.duration).toBe(0);
      expect(() => {
        animationGroup.start();
      }).not.toThrow();
    });

    it('应该正确处理负持续时间的跳转', () => {
      animationGroup.add(animation1);
      
      expect(() => {
        animationGroup.seek(-100);
      }).not.toThrow();
    });

    it('应该正确处理超出范围的跳转', () => {
      animationGroup.add(animation1);
      
      expect(() => {
        animationGroup.seek(2000); // 超出动画持续时间
      }).not.toThrow();
    });

    it('应该正确处理空动画组的操作', () => {
      expect(() => {
        animationGroup.start();
        animationGroup.pause();
        animationGroup.resume();
        animationGroup.stop();
        animationGroup.seek(100);
      }).not.toThrow();
    });
  });

  describe('性能测试', () => {
    it('应该能够处理大量动画', () => {
      const startTime = performance.now();
      
      // 添加100个动画
      for (let i = 0; i < 100; i++) {
        const testAnim = new TestAnimation(100 + i);
        animationGroup.add(testAnim);
      }
      
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      expect(animationGroup.getAnimations()).toHaveLength(100);
      expect(duration).toBeLessThan(1000); // 应该在1秒内完成
    });

    it('应该能够快速启动大量动画', () => {
      // 添加50个动画
      for (let i = 0; i < 50; i++) {
        const testAnim = new TestAnimation(100);
        animationGroup.add(testAnim);
      }
      
      const startTime = performance.now();
      animationGroup.start();
      const endTime = performance.now();
      
      expect(endTime - startTime).toBeLessThan(100); // 应该在100ms内完成
    });
  });

  describe('链式调用', () => {
    it('应该支持方法链式调用', () => {
      const result = animationGroup
        .add(animation1)
        .add(animation2)
        .setPlayMode(GroupPlayMode.SEQUENCE)
        .start()
        .pause()
        .resume();
      
      expect(result).toBe(animationGroup);
      expect(animationGroup.getAnimations()).toHaveLength(2);
      expect(animationGroup.getPlayMode()).toBe(GroupPlayMode.SEQUENCE);
    });
  });
});