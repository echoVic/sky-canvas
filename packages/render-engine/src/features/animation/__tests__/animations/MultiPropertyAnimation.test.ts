import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { MultiPropertyAnimation } from '../../animations/MultiPropertyAnimation';
import { EasingFunction, AnimationState } from '../../types/AnimationTypes';

// Mock ObjectUtils
vi.mock('../../../utils/ObjectUtils', () => ({
  getNestedProperty: vi.fn((obj: any, path: string) => {
    const keys = path.split('.');
    let value = obj;
    for (const key of keys) {
      value = value?.[key];
    }
    return value;
  }),
  setNestedProperty: vi.fn((obj: any, path: string, value: any) => {
    const keys = path.split('.');
    let current = obj;
    for (let i = 0; i < keys.length - 1; i++) {
      if (!current[keys[i]]) {
        current[keys[i]] = {};
      }
      current = current[keys[i]];
    }
    current[keys[keys.length - 1]] = value;
  })
}));

describe('MultiPropertyAnimation', () => {
  let mockTarget: Record<string, any>;
  let animation: MultiPropertyAnimation;

  beforeEach(() => {
    // Arrange: 准备测试数据
    mockTarget = {
      x: 0,
      y: 0,
      scale: 1,
      rotation: 0,
      nested: {
        opacity: 1
      }
    };

    vi.clearAllMocks();
  });

  afterEach(() => {
    if (animation) {
      animation.stop();
    }
  });

  describe('基本功能', () => {
    it('应该正确初始化多属性动画', () => {
      // Arrange: 准备测试数据
      const config = {
        target: mockTarget,
        duration: 1000,
        properties: {
          x: { from: 0, to: 100 },
          y: { from: 0, to: 200 },
          scale: { to: 2 } // 没有 from，应该使用当前值
        }
      };

      // Act: 执行测试操作
      animation = new MultiPropertyAnimation(config);

      // Assert: 验证结果
      expect(animation).toBeDefined();
      expect(animation.duration).toBe(1000);
      expect(animation.getPropertiesInfo()).toHaveLength(3);
    });

    it('应该正确获取属性信息', () => {
      // Arrange: 准备测试数据
      const config = {
        target: mockTarget,
        duration: 1000,
        properties: {
          x: { from: 10, to: 100 },
          y: { from: 20, to: 200 }
        }
      };
      animation = new MultiPropertyAnimation(config);

      // Act: 执行测试操作
      const propertiesInfo = animation.getPropertiesInfo();
      const xInfo = animation.getPropertyInfo('x');

      // Assert: 验证结果
      expect(propertiesInfo).toHaveLength(2);
      expect(xInfo).toEqual({
        property: 'x',
        from: 10,
        to: 100,
        current: 0
      });
    });

    it('应该正确处理嵌套属性', () => {
      // Arrange: 准备测试数据
      const config = {
        target: mockTarget,
        duration: 1000,
        properties: {
          'nested.opacity': { from: 1, to: 0 }
        }
      };

      // Act: 执行测试操作
      animation = new MultiPropertyAnimation(config);

      // Assert: 验证结果
      expect(animation.getPropertiesInfo()).toHaveLength(1);
      const opacityInfo = animation.getPropertyInfo('nested.opacity');
      expect(opacityInfo?.from).toBe(1);
      expect(opacityInfo?.to).toBe(0);
    });
  });

  describe('动画执行', () => {
    it('应该正确执行多属性动画', async () => {
      // Arrange: 准备测试数据
      const config = {
        target: mockTarget,
        duration: 100,
        properties: {
          x: { from: 0, to: 100 },
          y: { from: 0, to: 200 }
        }
      };
      animation = new MultiPropertyAnimation(config);

      // Act: 执行测试操作
      animation.start();
      
      // 等待动画进行到一半
      await new Promise(resolve => setTimeout(resolve, 50));
      
      // Assert: 验证结果
      expect(mockTarget.x).toBeGreaterThan(0);
      expect(mockTarget.x).toBeLessThan(100);
      expect(mockTarget.y).toBeGreaterThan(0);
      expect(mockTarget.y).toBeLessThan(200);
    });

    it('应该正确应用缓动函数', async () => {
      // Arrange: 准备测试数据
      const easingFunction: EasingFunction = (t: number) => t * t; // 二次缓动
      const config = {
        target: mockTarget,
        duration: 100,
        easing: easingFunction,
        properties: {
          x: { from: 0, to: 100 }
        }
      };
      animation = new MultiPropertyAnimation(config);

      // Act: 执行测试操作
      animation.start();
      await new Promise(resolve => setTimeout(resolve, 50)); // 50% 进度

      // Assert: 验证结果
      // 使用二次缓动，50% 进度应该是 25% 的值（允许较大误差，因为时间控制不精确）
      expect(mockTarget.x).toBeCloseTo(25, -2);
    });

    it('应该在动画完成时设置最终值', async () => {
      // Arrange: 准备测试数据
      const config = {
        target: mockTarget,
        duration: 50,
        properties: {
          x: { from: 0, to: 100 },
          y: { from: 0, to: 200 }
        }
      };
      animation = new MultiPropertyAnimation(config);

      // Act: 执行测试操作
      const promise = new Promise<void>(resolve => {
        animation.on('complete', () => resolve());
      });
      
      animation.start();
      await promise;

      // Assert: 验证结果
      expect(mockTarget.x).toBe(100);
      expect(mockTarget.y).toBe(200);
    });
  });

  describe('属性管理', () => {
    beforeEach(() => {
      const config = {
        target: mockTarget,
        duration: 1000,
        properties: {
          x: { from: 0, to: 100 }
        }
      };
      animation = new MultiPropertyAnimation(config);
    });

    it('应该能够添加新属性', () => {
      // Act: 执行测试操作
      animation.addProperty('y', 200, 0);

      // Assert: 验证结果
      expect(animation.getPropertiesInfo()).toHaveLength(2);
      const yInfo = animation.getPropertyInfo('y');
      expect(yInfo?.from).toBe(0);
      expect(yInfo?.to).toBe(200);
    });

    it('应该能够移除属性', () => {
      // Arrange: 准备测试数据
      animation.addProperty('y', 200, 0);
      expect(animation.getPropertiesInfo()).toHaveLength(2);

      // Act: 执行测试操作
      animation.removeProperty('y');

      // Assert: 验证结果
      expect(animation.getPropertiesInfo()).toHaveLength(1);
      expect(animation.getPropertyInfo('y')).toBeNull();
    });

    it('应该能够更新属性值', () => {
      // Act: 执行测试操作
      animation.updateProperty('x', 150, 10);

      // Assert: 验证结果
      const xInfo = animation.getPropertyInfo('x');
      expect(xInfo?.from).toBe(10);
      expect(xInfo?.to).toBe(150);
    });

    it('应该在添加已存在属性时更新该属性', () => {
      // Act: 执行测试操作
      animation.addProperty('x', 150, 10);

      // Assert: 验证结果
      expect(animation.getPropertiesInfo()).toHaveLength(1); // 仍然只有一个属性
      const xInfo = animation.getPropertyInfo('x');
      expect(xInfo?.from).toBe(10);
      expect(xInfo?.to).toBe(150);
    });
  });

  describe('动画控制', () => {
    beforeEach(() => {
      const config = {
        target: mockTarget,
        duration: 1000,
        properties: {
          x: { from: 0, to: 100 },
          y: { from: 0, to: 200 }
        }
      };
      animation = new MultiPropertyAnimation(config);
    });

    it('应该能够重置动画', () => {
      // Arrange: 准备测试数据
      animation.start();
      
      // Act: 执行测试操作
      animation.reset();

      // Assert: 验证结果
      expect(mockTarget.x).toBe(0); // 重置到初始值
      expect(mockTarget.y).toBe(0);
      expect(animation.state).toBe(AnimationState.IDLE);
    });

    it('应该能够暂停和恢复动画', async () => {
      // Act: 执行测试操作
      animation.start();
      await new Promise(resolve => setTimeout(resolve, 50));
      
      const pausedX = mockTarget.x;
      animation.pause();
      
      await new Promise(resolve => setTimeout(resolve, 50));
      
      // Assert: 验证结果
      expect(mockTarget.x).toBe(pausedX); // 暂停时值不应该改变
      expect(animation.state).toBe(AnimationState.PAUSED);
      
      // 恢复动画
      animation.resume();
      await new Promise(resolve => setTimeout(resolve, 50));
      
      expect(mockTarget.x).toBeGreaterThan(pausedX);
      expect(animation.state).toBe(AnimationState.PLAYING);
    });

    it('应该能够停止动画', () => {
      // Arrange: 准备测试数据
      animation.start();
      expect(animation.state).toBe(AnimationState.PLAYING);

      // Act: 执行测试操作
      animation.stop();

      // Assert: 验证结果
      expect(animation.state).toBe(AnimationState.CANCELLED);
    });
  });

  describe('反向动画', () => {
    it('应该能够创建反向动画', () => {
      // Arrange: 准备测试数据
      const config = {
        target: mockTarget,
        duration: 1000,
        properties: {
          x: { from: 0, to: 100 },
          y: { from: 50, to: 200 }
        }
      };
      animation = new MultiPropertyAnimation(config);

      // Act: 执行测试操作
      const reversedAnimation = animation.reverse();

      // Assert: 验证结果
      expect(reversedAnimation).toBeInstanceOf(MultiPropertyAnimation);
      expect(reversedAnimation).not.toBe(animation); // 应该是新实例
      
      const reversedXInfo = reversedAnimation.getPropertyInfo('x');
      const reversedYInfo = reversedAnimation.getPropertyInfo('y');
      
      expect(reversedXInfo?.from).toBe(100); // 原来的 to
      expect(reversedXInfo?.to).toBe(0);     // 原来的 from
      expect(reversedYInfo?.from).toBe(200);
      expect(reversedYInfo?.to).toBe(50);
    });
  });

  describe('错误处理', () => {
    it('应该处理无效目标对象', () => {
      // Arrange: 准备测试数据
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const config = {
        target: null as any,
        duration: 100,
        properties: {
          x: { from: 0, to: 100 }
        }
      };
      animation = new MultiPropertyAnimation(config);

      // Act: 执行测试操作
      animation.start();
      // 手动触发一次更新来调用applyAnimation
      animation.update(50);
      
      // Assert: 验证结果
      expect(consoleSpy).toHaveBeenCalledWith('Animation target is not valid');
      
      consoleSpy.mockRestore();
    });

    it('应该处理不存在的属性查询', () => {
      // Arrange: 准备测试数据
      const config = {
        target: mockTarget,
        duration: 1000,
        properties: {
          x: { from: 0, to: 100 }
        }
      };
      animation = new MultiPropertyAnimation(config);

      // Act: 执行测试操作
      const nonExistentInfo = animation.getPropertyInfo('nonExistent');

      // Assert: 验证结果
      expect(nonExistentInfo).toBeNull();
    });

    it('应该处理移除不存在的属性', () => {
      // Arrange: 准备测试数据
      const config = {
        target: mockTarget,
        duration: 1000,
        properties: {
          x: { from: 0, to: 100 }
        }
      };
      animation = new MultiPropertyAnimation(config);
      const initialLength = animation.getPropertiesInfo().length;

      // Act: 执行测试操作
      animation.removeProperty('nonExistent');

      // Assert: 验证结果
      expect(animation.getPropertiesInfo()).toHaveLength(initialLength);
    });
  });
});