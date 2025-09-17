/**
 * Timeline 单元测试
 * 测试时间轴的功能
 */

import { Timeline } from '../../timeline/Timeline';
import { AnimationState } from '../../types/AnimationTypes';
import { BaseAnimation } from '../../core/BaseAnimation';

// 创建测试用的动画类
class TestAnimation extends BaseAnimation {
  constructor(duration: number) {
    super({ duration });
  }

  protected applyAnimation(progress: number): void {
    // 测试实现
  }
}

describe('Timeline', () => {
  let timeline: Timeline;
  let animation1: TestAnimation;
  let animation2: TestAnimation;
  let animation3: TestAnimation;

  beforeEach(() => {
    timeline = new Timeline();
    animation1 = new TestAnimation(1000);
    animation2 = new TestAnimation(500);
    animation3 = new TestAnimation(800);
  });

  afterEach(() => {
    timeline.stop();
  });

  describe('基本功能', () => {
    it('应该正确创建时间轴', () => {
      expect(timeline).toBeInstanceOf(Timeline);
      expect(timeline.state).toBe(AnimationState.IDLE);
      expect(timeline.getTotalDuration()).toBe(0);
    });

    it('应该正确创建带配置的时间轴', () => {
      const configTimeline = new Timeline({
        duration: 2000,
        totalDuration: 3000
      });
      
      expect(configTimeline.duration).toBe(2000);
      expect(configTimeline.getTotalDuration()).toBe(3000);
    });

    it('应该正确获取时间轴项目', () => {
      timeline.at(0, animation1);
      timeline.at(500, animation2);
      
      const items = timeline.getTimelineItems();
      expect(items).toHaveLength(2);
      expect(items[0].animation).toBe(animation1);
      expect(items[0].startTime).toBe(0);
      expect(items[0].endTime).toBe(1000);
    });
  });

  describe('动画添加', () => {
    it('应该正确在指定时间添加动画', () => {
      timeline.at(100, animation1);
      
      const items = timeline.getTimelineItems();
      expect(items).toHaveLength(1);
      expect(items[0].startTime).toBe(100);
      expect(items[0].endTime).toBe(1100);
      expect(timeline.getTotalDuration()).toBe(1100);
    });

    it('应该正确处理负时间值', () => {
      timeline.at(-50, animation1);
      
      const items = timeline.getTimelineItems();
      expect(items[0].startTime).toBe(0);
      expect(items[0].endTime).toBe(1000);
    });

    it('应该正确顺序添加动画', () => {
      timeline.at(0, animation1).then(animation2);
      
      const items = timeline.getTimelineItems();
      expect(items).toHaveLength(2);
      expect(items[1].startTime).toBe(1000);
      expect(items[1].endTime).toBe(1500);
      expect(timeline.getTotalDuration()).toBe(1500);
    });

    it('应该正确并行添加动画', () => {
      timeline.at(0, animation1).with(animation2);
      
      const items = timeline.getTimelineItems();
      expect(items).toHaveLength(2);
      expect(items[1].startTime).toBe(0);
      expect(items[1].endTime).toBe(500);
      expect(timeline.getTotalDuration()).toBe(1000);
    });

    it('应该正确重叠添加动画', () => {
      timeline.at(0, animation1).overlap(animation2, 200);
      
      const items = timeline.getTimelineItems();
      expect(items).toHaveLength(2);
      expect(items[1].startTime).toBe(800); // 1000 - 200
      expect(items[1].endTime).toBe(1300);
    });

    it('应该正确添加延迟', () => {
      timeline.at(0, animation1).delay(300).then(animation2);
      
      const items = timeline.getTimelineItems();
      expect(items).toHaveLength(2);
      expect(items[1].startTime).toBe(1300); // 1000 + 300
      expect(items[1].endTime).toBe(1800);
    });
  });

  describe('时间轴控制', () => {
    beforeEach(() => {
      timeline.at(0, animation1).at(500, animation2).at(1200, animation3);
    });

    it('应该正确播放时间轴', () => {
      timeline.play();
      expect(timeline.state).toBe(AnimationState.PLAYING);
    });

    it('应该正确暂停时间轴', () => {
      timeline.play();
      timeline.pause();
      expect(timeline.state).toBe(AnimationState.PAUSED);
    });

    it('应该正确重启时间轴', () => {
      timeline.play();
      timeline.restart();
      expect(timeline.state).toBe(AnimationState.PLAYING);
    });

    it('应该正确停止时间轴', () => {
      timeline.play();
      timeline.stop();
      expect(timeline.state).toBe(AnimationState.IDLE);
    });

    it('应该正确反向播放', () => {
      timeline.reverse();
      expect(timeline.state).toBe(AnimationState.PLAYING);
    });

    it('应该正确跳转到指定时间', () => {
      timeline.seek(600);
      
      // 在时间600ms时，animation1应该在播放，animation2应该刚开始
      const activeAnimations = timeline.getActiveAnimationsAt(600);
      expect(activeAnimations).toHaveLength(2);
    });
  });

  describe('时间计算', () => {
    it('应该正确计算总持续时间', () => {
      timeline.at(0, animation1); // 0-1000
      timeline.at(500, animation2); // 500-1000
      timeline.at(1200, animation3); // 1200-2000
      
      expect(timeline.getTotalDuration()).toBe(2000);
    });

    it('应该正确获取指定时间的活跃动画', () => {
      timeline.at(0, animation1); // 0-1000
      timeline.at(500, animation2); // 500-1000
      timeline.at(1200, animation3); // 1200-2000
      
      // 时间750ms
      const activeAt750 = timeline.getActiveAnimationsAt(750);
      expect(activeAt750).toHaveLength(2);
      expect(activeAt750.map(item => item.animation)).toContain(animation1);
      expect(activeAt750.map(item => item.animation)).toContain(animation2);
      
      // 时间1500ms
      const activeAt1500 = timeline.getActiveAnimationsAt(1500);
      expect(activeAt1500).toHaveLength(1);
      expect(activeAt1500[0].animation).toBe(animation3);
      
      // 时间2500ms（超出范围）
      const activeAt2500 = timeline.getActiveAnimationsAt(2500);
      expect(activeAt2500).toHaveLength(0);
    });

    it('应该正确处理边界时间', () => {
      timeline.at(100, animation1); // 100-1100
      
      // 起始时间
      const activeAtStart = timeline.getActiveAnimationsAt(100);
      expect(activeAtStart).toHaveLength(1);
      
      // 结束时间
      const activeAtEnd = timeline.getActiveAnimationsAt(1100);
      expect(activeAtEnd).toHaveLength(0);
    });
  });

  describe('动画管理', () => {
    beforeEach(() => {
      timeline.at(0, animation1).at(500, animation2).at(1000, animation3);
    });

    it('应该正确移除动画', () => {
      timeline.remove(animation2);
      
      const items = timeline.getTimelineItems();
      expect(items).toHaveLength(2);
      expect(items.map(item => item.animation)).not.toContain(animation2);
    });

    it('应该正确清空时间轴', () => {
      timeline.clear();
      
      expect(timeline.getTimelineItems()).toHaveLength(0);
      expect(timeline.getTotalDuration()).toBe(0);
    });

    it('移除动画后应该重新计算持续时间', () => {
      const originalDuration = timeline.getTotalDuration();
      timeline.remove(animation3); // 移除最后一个动画
      
      expect(timeline.getTotalDuration()).toBeLessThan(originalDuration);
    });
  });

  describe('循环和往返', () => {
    beforeEach(() => {
      timeline.at(0, animation1).at(500, animation2);
    });

    it('应该正确设置循环', () => {
      const result = timeline.repeat(3);
      expect(result).toBe(timeline); // 应该返回自身以支持链式调用
    });

    it('应该正确设置往返', () => {
      const result = timeline.yoyo(true);
      expect(result).toBe(timeline); // 应该返回自身以支持链式调用
    });

    it('应该正确设置无限循环', () => {
      const result = timeline.repeat();
      expect(result).toBe(timeline);
    });
  });

  describe('时间轴统计', () => {
    beforeEach(() => {
      timeline.at(0, animation1).at(500, animation2).at(1200, animation3);
    });

    it('应该正确获取时间轴统计信息', () => {
      const stats = timeline.getTimelineStats();
      
      expect(stats.totalItems).toBe(3);
      expect(stats.totalDuration).toBe(2000);
      expect(stats.items).toHaveLength(3);
      expect(stats.items[0].duration).toBe(1000);
      expect(stats.items[1].duration).toBe(500);
    });

    it('应该正确处理空时间轴的统计', () => {
      const emptyTimeline = new Timeline();
      const stats = emptyTimeline.getTimelineStats();
      
      expect(stats.totalItems).toBe(0);
      expect(stats.totalDuration).toBe(0);
      expect(stats.items).toHaveLength(0);
    });
  });

  describe('配置导出', () => {
    it('应该正确导出时间轴配置', () => {
      timeline.at(0, animation1).at(500, animation2);
      
      const config = timeline.exportConfig();
      
      expect(config.totalDuration).toBe(timeline.getTotalDuration());
      expect(config.items).toHaveLength(2);
      expect(config.items[0].startTime).toBe(0);
      expect(config.items[0].endTime).toBe(1000);
    });

    it('应该正确导出空时间轴配置', () => {
      const config = timeline.exportConfig();
      
      expect(config.totalDuration).toBe(0);
      expect(config.items).toHaveLength(0);
    });
  });

  describe('边界情况', () => {
    it('应该正确处理零持续时间的动画', () => {
      const zeroAnimation = new TestAnimation(0);
      timeline.at(100, zeroAnimation);
      
      const items = timeline.getTimelineItems();
      expect(items[0].startTime).toBe(100);
      expect(items[0].endTime).toBe(100);
    });

    it('应该正确处理相同时间点的多个动画', () => {
      timeline.at(100, animation1).at(100, animation2);
      
      const activeAnimations = timeline.getActiveAnimationsAt(100);
      expect(activeAnimations).toHaveLength(2);
    });

    it('应该正确处理极大的时间值', () => {
      const largeTime = 1000000;
      timeline.at(largeTime, animation1);
      
      const items = timeline.getTimelineItems();
      expect(items[0].startTime).toBe(largeTime);
      expect(items[0].endTime).toBe(largeTime + 1000);
    });

    it('应该正确处理移除不存在的动画', () => {
      timeline.at(0, animation1);
      
      const originalLength = timeline.getTimelineItems().length;
      timeline.remove(animation2); // animation2 不在时间轴中
      
      expect(timeline.getTimelineItems().length).toBe(originalLength);
    });
  });

  describe('事件处理', () => {
    it('应该正确处理子动画完成事件', () => {
      let completeCallCount = 0;
      timeline.on('complete', () => {
        completeCallCount++;
      });
      
      timeline.at(0, animation1);
      
      // 模拟动画完成
      animation1.emit('complete', animation1);
      
      // 注意：这里需要根据实际的事件处理逻辑来验证
      // 具体的验证方式可能需要根据 Timeline 的实现来调整
    });
  });

  describe('性能测试', () => {
    it('应该能够处理大量动画', () => {
      const startTime = performance.now();
      
      // 添加100个动画
      for (let i = 0; i < 100; i++) {
        const testAnim = new TestAnimation(100);
        timeline.at(i * 50, testAnim);
      }
      
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      expect(timeline.getTimelineItems()).toHaveLength(100);
      expect(duration).toBeLessThan(1000); // 应该在1秒内完成
    });

    it('应该能够快速查找活跃动画', () => {
      // 添加多个动画
      for (let i = 0; i < 50; i++) {
        const testAnim = new TestAnimation(200);
        timeline.at(i * 100, testAnim);
      }
      
      const startTime = performance.now();
      const activeAnimations = timeline.getActiveAnimationsAt(2500);
      const endTime = performance.now();
      
      expect(endTime - startTime).toBeLessThan(10); // 应该在10ms内完成
      expect(activeAnimations.length).toBeGreaterThan(0);
    });
  });
});