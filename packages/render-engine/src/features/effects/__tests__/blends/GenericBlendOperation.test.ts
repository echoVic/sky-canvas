/**
 * GenericBlendOperation 单元测试
 */

import { beforeEach, describe, expect, it } from 'vitest';
import { BlendColor, BlendMode, BlendModeConfig } from '../../blends';
import { BlendFunction, BlendModeFactory, GenericBlendOperation, RGBBlendFunction } from '../../blends/GenericBlendOperation';


describe('GenericBlendOperation', () => {
  const mockBlendFunction: RGBBlendFunction = (base: BlendColor, overlay: BlendColor) => ({
    r: Math.min(255, base.r + overlay.r),
    g: Math.min(255, base.g + overlay.g),
    b: Math.min(255, base.b + overlay.b),
    a: overlay.a
  });

  const mockConfig: BlendModeConfig = {
    mode: BlendMode.MULTIPLY,
    opacity: 1.0,
    enabled: true
  };

  let operation: GenericBlendOperation;

  beforeEach(() => {
    operation = new GenericBlendOperation(BlendMode.MULTIPLY, mockBlendFunction, mockConfig);
  });

  describe('构造函数', () => {
    it('应该正确初始化', () => {
      expect(operation.mode).toBe(BlendMode.MULTIPLY);
      expect(operation.config).toEqual(mockConfig);
      expect(operation.id).toBeDefined();
    });

    it('应该使用默认配置当未提供时', () => {
      const op = new GenericBlendOperation(BlendMode.SCREEN, mockBlendFunction);

      expect(op.config.mode).toBe(BlendMode.SCREEN);
      expect(op.config.opacity).toBe(1);
      expect(op.config.enabled).toBe(true);
    });
  });

  describe('apply', () => {
    it('应该应用混合函数', () => {
      const baseColor: BlendColor = { r: 100, g: 150, b: 200, a: 255 };
      const overlayColor: BlendColor = { r: 50, g: 75, b: 25, a: 128 };

      const result = operation.apply(baseColor, overlayColor);

      expect(result.r).toBe(150); // 100 + 50
      expect(result.g).toBe(225); // 150 + 75
      expect(result.b).toBe(225); // 200 + 25
      expect(result.a).toBe(128); // overlay alpha
    });

    it('应该处理边界值', () => {
      const maxColor: BlendColor = { r: 255, g: 255, b: 255, a: 255 };
      const minColor: BlendColor = { r: 0, g: 0, b: 0, a: 0 };

      expect(() => operation.apply(maxColor, minColor)).not.toThrow();
      expect(() => operation.apply(minColor, maxColor)).not.toThrow();
    });
  });

  describe('clone', () => {
    it('应该创建相同的副本', () => {
      const cloned = operation.clone();

      expect(cloned).not.toBe(operation);
      expect(cloned.mode).toBe(operation.mode);
      expect(cloned.config).toEqual(operation.config);
    });

    it('克隆应该独立工作', () => {
      const cloned = operation.clone() as GenericBlendOperation;

      const baseColor: BlendColor = { r: 100, g: 100, b: 100, a: 255 };
      const overlayColor: BlendColor = { r: 50, g: 50, b: 50, a: 255 };

      const originalResult = operation.apply(baseColor, overlayColor);
      const clonedResult = cloned.apply(baseColor, overlayColor);

      expect(originalResult).toEqual(clonedResult);
    });
  });
});

describe('BlendModeFactory', () => {
  describe('createComponentBlend', () => {
    const simpleAdd: BlendFunction = (base, overlay) => base + overlay;

    it('应该创建组件级混合操作', () => {
      const operation = BlendModeFactory.createComponentBlend(
        BlendMode.MULTIPLY,
        simpleAdd
      );

      const baseColor: BlendColor = { r: 100, g: 150, b: 200, a: 255 };
      const overlayColor: BlendColor = { r: 50, g: 25, b: 75, a: 128 };

      const result = operation.apply(baseColor, overlayColor);

      expect(result.r).toBe(150); // 100 + 50
      expect(result.g).toBe(175); // 150 + 25
      expect(result.b).toBe(275); // 200 + 75 (会被钳制到255)
      expect(result.a).toBe(128); // 保持overlay的alpha
    });

    it('应该使用自定义配置', () => {
      const customConfig: BlendModeConfig = {
        mode: BlendMode.SCREEN,
        opacity: 0.5,
        enabled: false
      };

      const operation = BlendModeFactory.createComponentBlend(
        BlendMode.SCREEN,
        simpleAdd,
        customConfig
      );

      expect(operation.config).toEqual(customConfig);
    });
  });

  describe('createNormalizedBlend', () => {
    const normalizedMultiply: BlendFunction = (base, overlay) => base * overlay;

    it('应该创建归一化混合操作', () => {
      const operation = BlendModeFactory.createNormalizedBlend(
        BlendMode.MULTIPLY,
        normalizedMultiply
      );

      const baseColor: BlendColor = { r: 255, g: 128, b: 64, a: 255 };
      const overlayColor: BlendColor = { r: 128, g: 255, b: 192, a: 255 };

      const result = operation.apply(baseColor, overlayColor);

      // 归一化后相乘再反归一化
      expect(result.r).toBeCloseTo(128, 0); // (255/255) * (128/255) * 255 ≈ 128
      expect(result.g).toBeCloseTo(128, 0); // (128/255) * (255/255) * 255 ≈ 128
      expect(result.b).toBeCloseTo(48, 0);  // (64/255) * (192/255) * 255 ≈ 48
    });

    it('应该正确处理0和255值', () => {
      const operation = BlendModeFactory.createNormalizedBlend(
        BlendMode.MULTIPLY,
        normalizedMultiply
      );

      const blackColor: BlendColor = { r: 0, g: 0, b: 0, a: 255 };
      const whiteColor: BlendColor = { r: 255, g: 255, b: 255, a: 255 };

      const result1 = operation.apply(blackColor, whiteColor);
      const result2 = operation.apply(whiteColor, blackColor);

      expect(result1.r).toBe(0);
      expect(result1.g).toBe(0);
      expect(result1.b).toBe(0);

      expect(result2.r).toBe(0);
      expect(result2.g).toBe(0);
      expect(result2.b).toBe(0);
    });
  });

  describe('createConditionalBlend', () => {
    const condition = (overlay: number) => overlay < 0.5;
    const trueFn: BlendFunction = (base, overlay) => base * 2 * overlay;
    const falseFn: BlendFunction = (base, overlay) => 1 - 2 * (1 - base) * (1 - overlay);

    it('应该创建条件混合操作', () => {
      const operation = BlendModeFactory.createConditionalBlend(
        BlendMode.OVERLAY,
        condition,
        trueFn,
        falseFn
      );

      expect(operation.mode).toBe(BlendMode.OVERLAY);
    });

    it('应该根据条件选择不同的混合函数', () => {
      const operation = BlendModeFactory.createConditionalBlend(
        BlendMode.OVERLAY,
        condition,
        trueFn,
        falseFn
      );

      // overlay < 0.5 的情况
      const darkOverlay: BlendColor = { r: 64, g: 64, b: 64, a: 255 }; // ~0.25 normalized
      const baseColor: BlendColor = { r: 128, g: 128, b: 128, a: 255 };

      const result1 = operation.apply(baseColor, darkOverlay);
      expect(result1).toBeDefined();

      // overlay >= 0.5 的情况
      const brightOverlay: BlendColor = { r: 192, g: 192, b: 192, a: 255 }; // ~0.75 normalized

      const result2 = operation.apply(baseColor, brightOverlay);
      expect(result2).toBeDefined();

      // 结果应该不同
      expect(result1.r).not.toBe(result2.r);
    });
  });

  describe('预定义混合函数', () => {
    it('multiply函数应该正确工作', () => {
      const result = BlendModeFactory.blendFunctions.multiply(0.5, 0.8);
      expect(result).toBe(0.4);
    });

    it('screen函数应该正确工作', () => {
      const result = BlendModeFactory.blendFunctions.screen(0.5, 0.8);
      expect(result).toBe(0.9); // 1 - (1-0.5) * (1-0.8) = 1 - 0.5 * 0.2 = 0.9
    });

    it('overlay函数应该正确处理条件', () => {
      // base < 0.5
      const result1 = BlendModeFactory.blendFunctions.overlay(0.3, 0.6);
      expect(result1).toBe(0.36); // 2 * 0.3 * 0.6

      // base >= 0.5
      const result2 = BlendModeFactory.blendFunctions.overlay(0.7, 0.6);
      expect(result2).toBe(0.76); // 1 - 2 * (1-0.7) * (1-0.6)
    });

    it('colorBurn函数应该处理边界情况', () => {
      // overlay = 0
      const result1 = BlendModeFactory.blendFunctions.colorBurn(0.5, 0);
      expect(result1).toBe(0);

      // 正常情况
      const result2 = BlendModeFactory.blendFunctions.colorBurn(0.8, 0.5);
      expect(result2).toBe(0.6); // max(0, 1 - (1-0.8)/0.5)
    });

    it('colorDodge函数应该处理边界情况', () => {
      // overlay = 1
      const result1 = BlendModeFactory.blendFunctions.colorDodge(0.5, 1);
      expect(result1).toBe(1);

      // 正常情况
      const result2 = BlendModeFactory.blendFunctions.colorDodge(0.3, 0.4);
      expect(result2).toBe(0.5); // min(1, 0.3/(1-0.4))
    });

    it('darken和lighten函数应该返回正确值', () => {
      expect(BlendModeFactory.blendFunctions.darken(0.3, 0.7)).toBe(0.3);
      expect(BlendModeFactory.blendFunctions.darken(0.7, 0.3)).toBe(0.3);

      expect(BlendModeFactory.blendFunctions.lighten(0.3, 0.7)).toBe(0.7);
      expect(BlendModeFactory.blendFunctions.lighten(0.7, 0.3)).toBe(0.7);
    });

    it('difference和exclusion函数应该正确工作', () => {
      const result1 = BlendModeFactory.blendFunctions.difference(0.3, 0.7);
      expect(result1).toBe(0.4); // abs(0.3 - 0.7)

      const result2 = BlendModeFactory.blendFunctions.exclusion(0.3, 0.7);
      expect(result2).toBe(0.58); // 0.3 + 0.7 - 2 * 0.3 * 0.7
    });
  });

  describe('工厂方法', () => {
    const testCases = [
      { method: 'multiply', mode: BlendMode.MULTIPLY },
      { method: 'screen', mode: BlendMode.SCREEN },
      { method: 'overlay', mode: BlendMode.OVERLAY },
      { method: 'softLight', mode: BlendMode.SOFT_LIGHT },
      { method: 'hardLight', mode: BlendMode.HARD_LIGHT },
      { method: 'colorBurn', mode: BlendMode.COLOR_BURN },
      { method: 'colorDodge', mode: BlendMode.COLOR_DODGE },
      { method: 'darken', mode: BlendMode.DARKEN },
      { method: 'lighten', mode: BlendMode.LIGHTEN },
      { method: 'difference', mode: BlendMode.DIFFERENCE },
      { method: 'exclusion', mode: BlendMode.EXCLUSION }
    ];

    testCases.forEach(({ method, mode }) => {
      it(`${method}工厂方法应该创建正确的混合操作`, () => {
        const operation = (BlendModeFactory as any)[method]();

        expect(operation).toBeInstanceOf(GenericBlendOperation);
        expect(operation.mode).toBe(mode);
        expect(operation.config.enabled).toBe(true);
      });
    });

    it('工厂方法应该接受自定义配置', () => {
      const customConfig: BlendModeConfig = {
        mode: BlendMode.MULTIPLY,
        opacity: 0.7,
        enabled: false
      };

      const operation = BlendModeFactory.multiply(customConfig);

      expect(operation.config).toEqual(customConfig);
    });
  });

  describe('性能测试', () => {
    it('应该在合理时间内处理大量混合操作', () => {
      const operation = BlendModeFactory.multiply();
      const baseColor: BlendColor = { r: 128, g: 128, b: 128, a: 255 };
      const overlayColor: BlendColor = { r: 64, g: 96, b: 192, a: 255 };

      const startTime = performance.now();

      for (let i = 0; i < 10000; i++) {
        operation.apply(baseColor, overlayColor);
      }

      const endTime = performance.now();
      const duration = endTime - startTime;

      // 应该在100ms内完成
      expect(duration).toBeLessThan(100);
    });
  });

  describe('错误处理', () => {
    it('应该处理无效的颜色值', () => {
      const operation = BlendModeFactory.multiply();

      const invalidColors = [
        { r: -1, g: 128, b: 128, a: 255 },
        { r: 128, g: 256, b: 128, a: 255 },
        { r: 128, g: 128, b: 128, a: -1 },
      ];

      invalidColors.forEach(invalidColor => {
        const validColor: BlendColor = { r: 128, g: 128, b: 128, a: 255 };

        expect(() => {
          operation.apply(validColor, invalidColor);
        }).not.toThrow();
      });
    });
  });
});