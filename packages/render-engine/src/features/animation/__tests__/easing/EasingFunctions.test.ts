import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { EasingFunction, EasingType } from '../../types/AnimationTypes';
import { EasingFunctions } from '../../easing/EasingFunctions';

describe('EasingFunctions', () => {
  beforeEach(() => {
    // Arrange: 准备测试数据
    vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    // Cleanup: 清理测试环境
    vi.restoreAllMocks();
  });

  describe('基本功能', () => {
    it('应该能够获取线性缓动函数', () => {
      // Act: 执行测试操作
      const linearFunc = EasingFunctions.get(EasingType.LINEAR);
      
      // Assert: 验证结果
      expect(linearFunc).toBeDefined();
      expect(typeof linearFunc).toBe('function');
      expect(linearFunc(0)).toBe(0);
      expect(linearFunc(0.5)).toBe(0.5);
      expect(linearFunc(1)).toBe(1);
    });

    it('应该能够通过 linear 属性获取线性函数', () => {
      // Act: 执行测试操作
      const linearFunc = EasingFunctions.linear;
      
      // Assert: 验证结果
      expect(linearFunc).toBeDefined();
      expect(linearFunc(0.25)).toBe(0.25);
      expect(linearFunc(0.75)).toBe(0.75);
    });

    it('应该返回所有可用的缓动类型', () => {
      // Act: 执行测试操作
      const types = EasingFunctions.getAvailableTypes();
      
      // Assert: 验证结果
      expect(types).toContain(EasingType.LINEAR);
      expect(types).toContain(EasingType.EASE_IN);
      expect(types).toContain(EasingType.EASE_OUT);
      expect(types).toContain(EasingType.EASE_IN_OUT);
      expect(types.length).toBeGreaterThan(0);
    });
  });

  describe('缓动函数验证', () => {
    it('所有缓动函数应该在边界值处返回正确结果', () => {
      // Arrange: 准备测试数据
      const types = EasingFunctions.getAvailableTypes();
      
      types.forEach(type => {
        // Act: 执行测试操作
        const func = EasingFunctions.get(type);
        
        // Assert: 验证结果
        expect(func(0)).toBeCloseTo(0, 5); // t=0 时应该接近 0
        expect(func(1)).toBeCloseTo(1, 5); // t=1 时应该接近 1
      });
    });

    it('应该测试二次缓动函数的特性', () => {
      // Arrange: 准备测试数据
      const easeInQuad = EasingFunctions.get(EasingType.EASE_IN_QUAD);
      const easeOutQuad = EasingFunctions.get(EasingType.EASE_OUT_QUAD);
      const easeInOutQuad = EasingFunctions.get(EasingType.EASE_IN_OUT_QUAD);
      
      // Act & Assert: 执行测试操作并验证结果
      // ease-in-quad 在开始时变化缓慢
      expect(easeInQuad(0.5)).toBeLessThan(0.5);
      
      // ease-out-quad 在结束时变化缓慢
      expect(easeOutQuad(0.5)).toBeGreaterThan(0.5);
      
      // ease-in-out-quad 在中点应该是 0.5
      expect(easeInOutQuad(0.5)).toBeCloseTo(0.5, 1);
    });

    it('应该测试三次缓动函数的特性', () => {
      // Arrange: 准备测试数据
      const easeInCubic = EasingFunctions.get(EasingType.EASE_IN_CUBIC);
      const easeOutCubic = EasingFunctions.get(EasingType.EASE_OUT_CUBIC);
      const easeInOutCubic = EasingFunctions.get(EasingType.EASE_IN_OUT_CUBIC);
      const easeInQuad = EasingFunctions.get(EasingType.EASE_IN_QUAD);
      const easeOutQuad = EasingFunctions.get(EasingType.EASE_OUT_QUAD);
      
      // Act & Assert: 执行测试操作并验证结果
      // ease-in-cubic 在开始时变化更缓慢
      expect(easeInCubic(0.5)).toBeLessThan(easeInQuad(0.5));
      
      // ease-out-cubic 在结束时变化更缓慢
      expect(easeOutCubic(0.5)).toBeGreaterThan(easeOutQuad(0.5));
      
      // 边界值测试
      expect(easeInOutCubic(0)).toBe(0);
      expect(easeInOutCubic(1)).toBe(1);
    });

    it('应该测试四次缓动函数的特性', () => {
      // Arrange: 准备测试数据
      const easeInQuart = EasingFunctions.get(EasingType.EASE_IN_QUART);
      const easeOutQuart = EasingFunctions.get(EasingType.EASE_OUT_QUART);
      const easeInOutQuart = EasingFunctions.get(EasingType.EASE_IN_OUT_QUART);
      
      // Act & Assert: 执行测试操作并验证结果
      expect(easeInQuart(0.5)).toBeLessThan(0.5);
      expect(easeOutQuart(0.5)).toBeGreaterThan(0.5);
      expect(easeInOutQuart(0.5)).toBeCloseTo(0.5, 1);
    });

    it('应该测试回弹缓动函数的特性', () => {
      // Arrange: 准备测试数据
      const easeInBack = EasingFunctions.get(EasingType.EASE_IN_BACK);
      const easeOutBack = EasingFunctions.get(EasingType.EASE_OUT_BACK);
      const easeInOutBack = EasingFunctions.get(EasingType.EASE_IN_OUT_BACK);
      
      // Act & Assert: 执行测试操作并验证结果
      // back 缓动可能会超出 [0,1] 范围
      expect(easeInBack(0.3)).toBeLessThan(0); // 可能为负值
      expect(easeOutBack(0.8)).toBeGreaterThan(1); // 可能超过 1
      
      // 边界值仍然正确
      expect(easeInBack(0)).toBe(0);
      expect(easeInBack(1)).toBeCloseTo(1, 10);
      expect(easeOutBack(0)).toBeCloseTo(0, 10);
      expect(easeOutBack(1)).toBe(1);
    });

    it('应该测试弹跳缓动函数的特性', () => {
      // Arrange: 准备测试数据
      const easeInBounce = EasingFunctions.get(EasingType.EASE_IN_BOUNCE);
      const easeOutBounce = EasingFunctions.get(EasingType.EASE_OUT_BOUNCE);
      const easeInOutBounce = EasingFunctions.get(EasingType.EASE_IN_OUT_BOUNCE);
      
      // Act & Assert: 执行测试操作并验证结果
      // 弹跳效果应该在边界值处正确
      expect(easeInBounce(0)).toBe(0);
      expect(easeInBounce(1)).toBe(1);
      expect(easeOutBounce(0)).toBe(0);
      expect(easeOutBounce(1)).toBe(1);
      expect(easeInOutBounce(0)).toBe(0);
      expect(easeInOutBounce(1)).toBe(1);
    });
  });

  describe('自定义缓动函数', () => {
    it('应该能够注册自定义缓动函数', () => {
      // Arrange: 准备测试数据
      const customType = 'custom' as EasingType;
      const customFunc: EasingFunction = (t: number) => t * t * t;
      
      // Act: 执行测试操作
      EasingFunctions.register(customType, customFunc);
      const retrievedFunc = EasingFunctions.get(customType);
      
      // Assert: 验证结果
      expect(retrievedFunc).toBe(customFunc);
      expect(retrievedFunc(0.5)).toBe(0.125); // 0.5^3
    });

    it('应该能够覆盖现有的缓动函数', () => {
      // Arrange: 准备测试数据
      const originalLinear = EasingFunctions.get(EasingType.LINEAR);
      const customLinear: EasingFunction = (t: number) => t * 2; // 修改后的线性函数
      
      // Act: 执行测试操作
      EasingFunctions.register(EasingType.LINEAR, customLinear);
      const modifiedLinear = EasingFunctions.get(EasingType.LINEAR);
      
      // Assert: 验证结果
      expect(modifiedLinear).toBe(customLinear);
      expect(modifiedLinear(0.5)).toBe(1); // 0.5 * 2
      
      // Cleanup: 恢复原始函数
      EasingFunctions.register(EasingType.LINEAR, originalLinear);
    });
  });

  describe('贝塞尔曲线缓动', () => {
    it('应该能够创建自定义贝塞尔曲线缓动', () => {
      // Act: 执行测试操作
      const bezierFunc = EasingFunctions.createBezier(0.25, 0.1, 0.25, 1);
      
      // Assert: 验证结果
      expect(bezierFunc).toBeDefined();
      expect(typeof bezierFunc).toBe('function');
      expect(bezierFunc(0)).toBeCloseTo(0, 4);
      expect(bezierFunc(1)).toBeCloseTo(1, 4);
    });

    it('应该测试不同贝塞尔参数的效果', () => {
      // Arrange: 准备测试数据
      const easeIn = EasingFunctions.createBezier(0.42, 0, 1, 1);
      const easeOut = EasingFunctions.createBezier(0, 0, 0.58, 1);
      const easeInOut = EasingFunctions.createBezier(0.42, 0, 0.58, 1);
      
      // Act & Assert: 执行测试操作并验证结果
      expect(easeIn(0.5)).toBeLessThan(0.5); // ease-in 特性
      expect(easeOut(0.5)).toBeGreaterThan(0.5); // ease-out 特性
      expect(easeInOut(0.5)).toBeCloseTo(0.5, 1); // ease-in-out 特性
    });
  });

  describe('弹性缓动', () => {
    it('应该能够创建弹性缓动函数', () => {
      // Act: 执行测试操作
      const elastic = EasingFunctions.createElastic();
      
      // Assert: 验证结果
      expect(elastic.easeIn).toBeDefined();
      expect(elastic.easeOut).toBeDefined();
      expect(elastic.easeInOut).toBeDefined();
      
      // 边界值测试
      expect(elastic.easeIn(0)).toBeCloseTo(0, 5);
      expect(elastic.easeIn(1)).toBeCloseTo(1, 5);
      expect(elastic.easeOut(0)).toBeCloseTo(0, 5);
      expect(elastic.easeOut(1)).toBeCloseTo(1, 5);
    });

    it('应该能够使用自定义振幅和周期', () => {
      // Arrange: 准备测试数据
      const customElastic = EasingFunctions.createElastic(2, 0.5);
      const defaultElastic = EasingFunctions.createElastic();
      
      // Act: 执行测试操作
      const customValue = customElastic.easeOut(0.5);
      const defaultValue = defaultElastic.easeOut(0.5);
      
      // Assert: 验证结果
      expect(customValue).not.toBe(defaultValue); // 应该产生不同的结果
    });
  });

  describe('错误处理', () => {
    it('应该处理未知的缓动类型', () => {
      // Arrange: 准备测试数据
      const unknownType = 'unknown-easing' as EasingType;
      
      // Act: 执行测试操作
      const func = EasingFunctions.get(unknownType);
      
      // Assert: 验证结果
      expect(func).toBeDefined();
      expect(func).toBe(EasingFunctions.linear); // 应该回退到线性
      expect(console.warn).toHaveBeenCalledWith(
        `Unknown easing type: ${unknownType}, using linear`
      );
    });

    it('应该处理边界值之外的输入', () => {
      // Arrange: 准备测试数据
      const linearFunc = EasingFunctions.get(EasingType.LINEAR);
      
      // Act & Assert: 执行测试操作并验证结果
      expect(() => linearFunc(-0.5)).not.toThrow();
      expect(() => linearFunc(1.5)).not.toThrow();
      expect(linearFunc(-0.5)).toBe(-0.5); // 线性函数应该正确处理
      expect(linearFunc(1.5)).toBe(1.5);
    });
  });

  describe('性能测试', () => {
    it('应该能够快速执行缓动函数', () => {
      // Arrange: 准备测试数据
      const func = EasingFunctions.get(EasingType.EASE_IN_OUT_CUBIC);
      const iterations = 10000;
      
      // Act: 执行测试操作
      const startTime = performance.now();
      for (let i = 0; i < iterations; i++) {
        func(i / iterations);
      }
      const endTime = performance.now();
      
      // Assert: 验证结果
      const duration = endTime - startTime;
      expect(duration).toBeLessThan(100); // 应该在 100ms 内完成
    });
  });

  describe('数学属性验证', () => {
    it('应该验证缓动函数的单调性', () => {
      // Arrange: 准备测试数据
      const monotonicTypes = [
        EasingType.LINEAR,
        EasingType.EASE_IN,
        EasingType.EASE_OUT,
        EasingType.EASE_IN_OUT,
        EasingType.EASE_IN_QUAD,
        EasingType.EASE_OUT_QUAD,
        EasingType.EASE_IN_OUT_QUAD
      ];
      
      monotonicTypes.forEach(type => {
        const func = EasingFunctions.get(type);
        
        // Act & Assert: 执行测试操作并验证结果
        for (let i = 0; i < 10; i++) {
          const t1 = i / 10;
          const t2 = (i + 1) / 10;
          expect(func(t2)).toBeGreaterThanOrEqual(func(t1));
        }
      });
    });

    it('应该验证对称缓动函数的对称性', () => {
      // Arrange: 准备测试数据
      const symmetricTypes = [
        EasingType.EASE_IN_OUT,
        EasingType.EASE_IN_OUT_QUAD,
        EasingType.EASE_IN_OUT_CUBIC,
        EasingType.EASE_IN_OUT_QUART
      ];
      
      symmetricTypes.forEach(type => {
        const func = EasingFunctions.get(type);
        
        // Act & Assert: 执行测试操作并验证结果
        for (let i = 1; i < 10; i++) {
          const t = i / 10;
          const leftValue = func(t);
          const rightValue = 1 - func(1 - t);
          expect(leftValue).toBeCloseTo(rightValue, 2); // 允许小的数值误差
        }
      });
    });
  });
});