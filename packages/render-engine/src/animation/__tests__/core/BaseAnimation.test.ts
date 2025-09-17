import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { BaseAnimation } from '../../core/BaseAnimation';
import { AnimationState, AnimationConfig, EasingType } from '../../types/AnimationTypes';

// 创建一个具体的 BaseAnimation 实现用于测试
class TestAnimation extends BaseAnimation {
  public target: any;
  public appliedProgress: number = 0;

  constructor(target: any, config: AnimationConfig) {
    super(config);
    this.target = target;
  }

  protected applyAnimation(progress: number): void {
    this.appliedProgress = progress;
    // 简单的属性动画实现
    if (this.target && typeof this.target.x === 'number') {
      this.target.x = progress * 100; // 从 0 到 100
    }
  }
}

describe('BaseAnimation', () => {
  let mockTarget: { x: number };
  let animation: TestAnimation;
  let config: AnimationConfig;

  beforeEach(() => {
    // Arrange: 准备测试数据
    mockTarget = { x: 0 };
    config = {
      duration: 1000,
      delay: 0,
      easing: EasingType.LINEAR,
      loop: false,
      yoyo: false
    };
    animation = new TestAnimation(mockTarget, config);
    
    // Mock performance.now
    vi.spyOn(performance, 'now').mockReturnValue(0);
    
    // Mock requestAnimationFrame
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation((callback) => {
      setTimeout(callback, 16); // 模拟 60fps
      return 1;
    });
    
    // Mock cancelAnimationFrame
    vi.spyOn(window, 'cancelAnimationFrame').mockImplementation(() => {});
  });

  afterEach(() => {
    // Cleanup: 清理测试环境
    animation.dispose();
    vi.restoreAllMocks();
  });

  describe('基本功能', () => {
    it('应该正确初始化动画', () => {
      // Assert: 验证结果
      expect(animation.id).toBeDefined();
      expect(animation.state).toBe(AnimationState.IDLE);
      expect(animation.duration).toBe(1000);
      expect(animation.currentTime).toBe(0);
      expect(animation.progress).toBe(0);
    });

    it('应该生成唯一的 ID', () => {
      // Arrange: 准备测试数据
      const animation2 = new TestAnimation(mockTarget, config);
      
      // Assert: 验证结果
      expect(animation.id).not.toBe(animation2.id);
      
      // Cleanup
      animation2.dispose();
    });

    it('应该正确设置缓动函数', () => {
      // Arrange: 准备测试数据
      const easingConfig = { ...config, easing: EasingType.EASE_IN_OUT };
      const easingAnimation = new TestAnimation(mockTarget, easingConfig);
      
      // Assert: 验证结果
      expect(easingAnimation.duration).toBe(1000);
      
      // Cleanup
      easingAnimation.dispose();
    });
  });

  describe('动画控制', () => {
    it('应该能够启动动画', () => {
      // Act: 执行测试操作
      animation.start();
      
      // Assert: 验证结果
      expect(animation.state).toBe(AnimationState.PLAYING);
    });

    it('应该能够暂停动画', () => {
      // Arrange: 准备测试数据
      animation.start();
      
      // Act: 执行测试操作
      animation.pause();
      
      // Assert: 验证结果
      expect(animation.state).toBe(AnimationState.PAUSED);
    });

    it('应该能够恢复暂停的动画', () => {
      // Arrange: 准备测试数据
      animation.start();
      animation.pause();
      
      // Act: 执行测试操作
      animation.resume();
      
      // Assert: 验证结果
      expect(animation.state).toBe(AnimationState.PLAYING);
    });

    it('应该能够停止动画', () => {
      // Arrange: 准备测试数据
      animation.start();
      
      // Act: 执行测试操作
      animation.stop();
      
      // Assert: 验证结果
      expect(animation.state).toBe(AnimationState.CANCELLED);
    });

    it('应该能够跳转到指定时间', () => {
      // Act: 执行测试操作
      animation.seek(500); // 跳转到中间位置
      
      // Assert: 验证结果
      expect(animation.currentTime).toBe(500);
      expect(animation.progress).toBe(0.5);
    });

    it('应该限制跳转时间在有效范围内', () => {
      // Act: 执行测试操作
      animation.seek(-100); // 负数
      expect(animation.currentTime).toBe(0);
      
      animation.seek(2000); // 超过持续时间
      expect(animation.currentTime).toBe(1000);
    });
  });

  describe('事件系统', () => {
    it('应该在动画开始时触发 start 事件', () => {
      // Arrange: 准备测试数据
      const startHandler = vi.fn();
      animation.on('start', startHandler);
      
      // Act: 执行测试操作
      animation.start();
      
      // Assert: 验证结果
      expect(startHandler).toHaveBeenCalledWith(animation);
    });

    it('应该在动画暂停时触发 pause 事件', () => {
      // Arrange: 准备测试数据
      const pauseHandler = vi.fn();
      animation.on('pause', pauseHandler);
      animation.start();
      
      // Act: 执行测试操作
      animation.pause();
      
      // Assert: 验证结果
      expect(pauseHandler).toHaveBeenCalledWith(animation);
    });

    it('应该在动画恢复时触发 resume 事件', () => {
      // Arrange: 准备测试数据
      const resumeHandler = vi.fn();
      animation.on('resume', resumeHandler);
      animation.start();
      animation.pause();
      
      // Act: 执行测试操作
      animation.resume();
      
      // Assert: 验证结果
      expect(resumeHandler).toHaveBeenCalledWith(animation);
    });

    it('应该在动画停止时触发 cancel 事件', () => {
      // Arrange: 准备测试数据
      const cancelHandler = vi.fn();
      animation.on('cancel', cancelHandler);
      animation.start();
      
      // Act: 执行测试操作
      animation.stop();
      
      // Assert: 验证结果
      expect(cancelHandler).toHaveBeenCalledWith(animation);
    });

    it('应该能够移除事件监听器', () => {
      // Arrange: 准备测试数据
      const handler = vi.fn();
      animation.on('start', handler);
      animation.off('start', handler);
      
      // Act: 执行测试操作
      animation.start();
      
      // Assert: 验证结果
      expect(handler).not.toHaveBeenCalled();
    });
  });

  describe('动画更新', () => {
    it('应该在更新时应用动画', () => {
      // Arrange: 准备测试数据
      animation.start();
      
      // Act: 执行测试操作
      const shouldContinue = animation.update(16); // 16ms delta
      
      // Assert: 验证结果
      expect(shouldContinue).toBe(true);
      expect(animation.appliedProgress).toBeGreaterThan(0);
    });

    it('应该在动画完成时返回 false', () => {
      // Arrange: 准备测试数据
      animation.start();
      animation.seek(1000); // 跳转到结束
      
      // Act: 执行测试操作
      const shouldContinue = animation.update(16);
      
      // Assert: 验证结果
      expect(shouldContinue).toBe(false);
      expect(animation.state).toBe(AnimationState.COMPLETED);
    });

    it('应该在非播放状态时不更新', () => {
      // Arrange: 准备测试数据
      const initialProgress = animation.appliedProgress;
      
      // Act: 执行测试操作
      const shouldContinue = animation.update(16);
      
      // Assert: 验证结果
      expect(shouldContinue).toBe(false);
      expect(animation.appliedProgress).toBe(initialProgress);
    });
  });

  describe('循环动画', () => {
    it('应该支持无限循环', () => {
      // Arrange: 准备测试数据
      const loopConfig = { ...config, loop: true };
      const loopAnimation = new TestAnimation(mockTarget, loopConfig);
      loopAnimation.start();
      loopAnimation.seek(1000); // 跳转到结束
      
      // Act: 执行测试操作
      const shouldContinue = loopAnimation.update(16);
      
      // Assert: 验证结果
      expect(shouldContinue).toBe(true);
      expect(loopAnimation.state).toBe(AnimationState.PLAYING);
      
      // Cleanup
      loopAnimation.dispose();
    });

    it('应该支持指定次数的循环', () => {
      // Arrange: 准备测试数据
      const loopConfig = { ...config, loop: 2 };
      const loopAnimation = new TestAnimation(mockTarget, loopConfig);
      loopAnimation.start();
      
      // 模拟第一次循环完成
      loopAnimation.seek(1000);
      let shouldContinue = loopAnimation.update(16);
      expect(shouldContinue).toBe(true);
      
      // 模拟第二次循环完成
      loopAnimation.seek(1000);
      shouldContinue = loopAnimation.update(16);
      
      // Assert: 验证结果
      expect(shouldContinue).toBe(false);
      expect(loopAnimation.state).toBe(AnimationState.COMPLETED);
      
      // Cleanup
      loopAnimation.dispose();
    });
  });

  describe('延迟动画', () => {
    it('应该支持延迟启动', () => {
      // Arrange: 准备测试数据
      const delayConfig = { ...config, delay: 500 };
      const delayAnimation = new TestAnimation(mockTarget, delayConfig);
      
      // Act: 执行测试操作
      delayAnimation.start();
      
      // Assert: 验证结果
      expect(delayAnimation.state).toBe(AnimationState.IDLE);
      
      // Cleanup
      delayAnimation.dispose();
    });
  });

  describe('资源清理', () => {
    it('应该正确清理资源', () => {
      // Arrange: 准备测试数据
      animation.start();
      
      // Act: 执行测试操作
      animation.dispose();
      
      // Assert: 验证结果
      expect(animation.state).toBe(AnimationState.CANCELLED);
    });
  });

  describe('错误处理', () => {
    it('应该处理无效的状态转换', () => {
      // Act & Assert: 执行测试操作并验证结果
      expect(() => {
        animation.pause(); // 在 IDLE 状态下暂停
      }).not.toThrow();
      
      expect(() => {
        animation.resume(); // 在非 PAUSED 状态下恢复
      }).not.toThrow();
    });

    it('应该处理重复的操作', () => {
      // Act & Assert: 执行测试操作并验证结果
      animation.start();
      expect(() => {
        animation.start(); // 重复启动
      }).not.toThrow();
      
      animation.pause();
      expect(() => {
        animation.pause(); // 重复暂停
      }).not.toThrow();
    });
  });
});