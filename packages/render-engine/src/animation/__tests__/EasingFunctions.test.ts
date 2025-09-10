/**
 * 缓动函数测试
 */

import { describe, it, expect } from 'vitest';
import { EasingFunctions } from '../easing/EasingFunctions';
import { EasingType } from '../types/AnimationTypes';

describe('EasingFunctions', () => {
  describe('基础缓动函数', () => {
    it('应该正确实现线性缓动', () => {
      const linear = EasingFunctions.get(EasingType.LINEAR);
      
      expect(linear(0)).toBe(0);
      expect(linear(0.25)).toBe(0.25);
      expect(linear(0.5)).toBe(0.5);
      expect(linear(0.75)).toBe(0.75);
      expect(linear(1)).toBe(1);
    });

    it('应该正确实现ease-in缓动', () => {
      const easeIn = EasingFunctions.get(EasingType.EASE_IN);
      
      expect(easeIn(0)).toBe(0);
      expect(easeIn(0.5)).toBe(0.25); // 0.5^2
      expect(easeIn(1)).toBe(1);
      
      // ease-in应该开始慢，结束快
      expect(easeIn(0.25)).toBeLessThan(0.25);
      expect(easeIn(0.75)).toBeLessThan(0.75);
    });

    it('应该正确实现ease-out缓动', () => {
      const easeOut = EasingFunctions.get(EasingType.EASE_OUT);
      
      expect(easeOut(0)).toBe(0);
      expect(easeOut(1)).toBe(1);
      
      // ease-out应该开始快，结束慢
      expect(easeOut(0.25)).toBeGreaterThan(0.25);
      expect(easeOut(0.75)).toBeGreaterThan(0.75);
    });

    it('应该正确实现ease-in-out缓动', () => {
      const easeInOut = EasingFunctions.get(EasingType.EASE_IN_OUT);
      
      expect(easeInOut(0)).toBe(0);
      expect(easeInOut(0.5)).toBe(0.5);
      expect(easeInOut(1)).toBe(1);
      
      // 前半段应该像ease-in，后半段应该像ease-out
      expect(easeInOut(0.25)).toBeLessThan(0.25);
      expect(easeInOut(0.75)).toBeGreaterThan(0.75);
    });
  });

  describe('高级缓动函数', () => {
    it('应该正确实现二次方缓动', () => {
      const easeInQuad = EasingFunctions.get(EasingType.EASE_IN_QUAD);
      const easeOutQuad = EasingFunctions.get(EasingType.EASE_OUT_QUAD);
      
      expect(easeInQuad(0.5)).toBe(0.25);
      expect(easeOutQuad(0.5)).toBe(0.75);
    });

    it('应该正确实现三次方缓动', () => {
      const easeInCubic = EasingFunctions.get(EasingType.EASE_IN_CUBIC);
      
      expect(easeInCubic(0)).toBe(0);
      expect(easeInCubic(0.5)).toBe(0.125); // 0.5^3
      expect(easeInCubic(1)).toBe(1);
    });

    it('应该正确实现四次方缓动', () => {
      const easeInQuart = EasingFunctions.get(EasingType.EASE_IN_QUART);
      
      expect(easeInQuart(0)).toBe(0);
      expect(easeInQuart(0.5)).toBe(0.0625); // 0.5^4
      expect(easeInQuart(1)).toBe(1);
    });
  });

  describe('回弹缓动函数', () => {
    it('应该正确实现back缓动', () => {
      const easeInBack = EasingFunctions.get(EasingType.EASE_IN_BACK);
      const easeOutBack = EasingFunctions.get(EasingType.EASE_OUT_BACK);
      
      // back缓动应该在开始或结束时超出范围
      expect(easeInBack(0)).toBeCloseTo(0, 10);
      expect(easeInBack(1)).toBeCloseTo(1, 10);
      
      expect(easeOutBack(0)).toBeCloseTo(0, 10);
      expect(easeOutBack(1)).toBeCloseTo(1, 10);
      
      // 回弹效果：应该有负值或超过1的值
      expect(easeInBack(0.1)).toBeLessThan(0);
      expect(easeOutBack(0.9)).toBeGreaterThan(1);
    });

    it('应该正确实现bounce缓动', () => {
      const easeOutBounce = EasingFunctions.get(EasingType.EASE_OUT_BOUNCE);
      
      expect(easeOutBounce(0)).toBeCloseTo(0, 10);
      expect(easeOutBounce(1)).toBeCloseTo(1, 10);
      
      // bounce效果应该有弹跳特征
      // 检查一些特定点的bounce效果
      const midValue = easeOutBounce(0.5);
      expect(midValue).toBeGreaterThan(0);
      expect(midValue).toBeLessThan(1);
      
      // Bounce应该在结束前有小的回弹
      const nearEnd = easeOutBounce(0.95);
      const veryNearEnd = easeOutBounce(0.98);
      
      // 验证bounce函数的基本属性
      expect(typeof easeOutBounce(0.3)).toBe('number');
      expect(easeOutBounce(0.3)).toBeGreaterThanOrEqual(0);
    });
  });

  describe('工具方法', () => {
    it('应该返回所有可用的缓动类型', () => {
      const types = EasingFunctions.getAvailableTypes();
      
      expect(types).toContain(EasingType.LINEAR);
      expect(types).toContain(EasingType.EASE_IN);
      expect(types).toContain(EasingType.EASE_OUT);
      expect(types).toContain(EasingType.EASE_IN_OUT);
      expect(types.length).toBeGreaterThan(10);
    });

    it('应该支持注册自定义缓动函数', () => {
      const customType = 'custom-test' as EasingType;
      const customFunction = (t: number) => t * t * t;
      
      EasingFunctions.register(customType, customFunction);
      
      const retrieved = EasingFunctions.get(customType);
      expect(retrieved(0.5)).toBe(0.125); // 0.5^3
      
      expect(EasingFunctions.getAvailableTypes()).toContain(customType);
    });

    it('应该处理未知的缓动类型', () => {
      const consoleWarn = vi.spyOn(console, 'warn').mockImplementation(() => {});
      
      const unknownType = 'unknown-type' as EasingType;
      const func = EasingFunctions.get(unknownType);
      
      // 应该返回线性缓动作为默认值
      expect(func(0.5)).toBe(0.5);
      expect(consoleWarn).toHaveBeenCalledWith(
        expect.stringContaining('Unknown easing type')
      );
      
      consoleWarn.mockRestore();
    });

    it('应该创建贝塞尔曲线缓动', () => {
      // 创建 CSS ease-in-out 等价的贝塞尔曲线 (0.42, 0, 0.58, 1)
      const bezierEasing = EasingFunctions.createBezier(0.42, 0, 0.58, 1);
      
      expect(bezierEasing(0)).toBeCloseTo(0, 2);
      expect(bezierEasing(1)).toBeCloseTo(1, 2);
      expect(bezierEasing(0.5)).toBeCloseTo(0.5, 1);
    });

    it('应该创建弹性缓动函数', () => {
      const elastic = EasingFunctions.createElastic(1, 0.3);
      
      expect(elastic.easeIn(0)).toBe(0);
      expect(elastic.easeIn(1)).toBe(1);
      expect(elastic.easeOut(0)).toBe(0);
      expect(elastic.easeOut(1)).toBe(1);
      
      // 弹性缓动应该有超出范围的值
      const midValue = elastic.easeOut(0.5);
      expect(Math.abs(midValue)).toBeGreaterThan(0);
    });
  });

  describe('数学属性', () => {
    it('所有缓动函数应该在0处返回0', () => {
      const types = EasingFunctions.getAvailableTypes();
      
      for (const type of types) {
        const func = EasingFunctions.get(type);
        expect(func(0)).toBeCloseTo(0, 10);
      }
    });

    it('所有缓动函数应该在1处返回1', () => {
      const types = EasingFunctions.getAvailableTypes();
      
      for (const type of types) {
        const func = EasingFunctions.get(type);
        expect(func(1)).toBeCloseTo(1, 10);
      }
    });

    it('缓动函数应该是连续的', () => {
      const func = EasingFunctions.get(EasingType.EASE_IN_OUT_CUBIC);
      
      // 测试连续性：在相近的点值应该相近
      const t1 = 0.5;
      const t2 = 0.5001;
      const v1 = func(t1);
      const v2 = func(t2);
      
      expect(Math.abs(v2 - v1)).toBeLessThan(0.01);
    });
  });

  describe('性能测试', () => {
    it('应该快速计算缓动值', () => {
      const func = EasingFunctions.get(EasingType.EASE_IN_OUT_CUBIC);
      
      const startTime = performance.now();
      
      // 计算1000次
      for (let i = 0; i < 1000; i++) {
        func(i / 1000);
      }
      
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      // 应该在合理时间内完成（这个阈值可能需要根据环境调整）
      expect(duration).toBeLessThan(100); // 100ms
    });

    it('贝塞尔缓动应该有合理的性能', () => {
      const bezier = EasingFunctions.createBezier(0.25, 0.1, 0.25, 1);
      
      const startTime = performance.now();
      
      // 计算100次（贝塞尔计算更复杂）
      for (let i = 0; i < 100; i++) {
        bezier(i / 100);
      }
      
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      expect(duration).toBeLessThan(50); // 50ms
    });
  });
});