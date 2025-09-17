/**
 * ContrastFilter 单元测试
 */

import { beforeEach, describe, expect, it } from 'vitest';
import { ContrastFilter } from '../../filters/ContrastFilter';
import type { ContrastParameters, FilterContext } from '../../types/FilterTypes';
import { FilterType } from '../../types/FilterTypes';

describe('ContrastFilter', () => {
  let filter: ContrastFilter;
  let mockContext: FilterContext;
  let mockParameters: ContrastParameters;

  beforeEach(() => {
    filter = new ContrastFilter();

    const canvas = document.createElement('canvas');
    canvas.width = 100;
    canvas.height = 100;

    mockContext = {
      sourceImageData: new ImageData(100, 100),
      canvas: canvas,
      context: canvas.getContext('2d') || undefined,
      webglContext: undefined,
      width: 100,
      height: 100,
      timestamp: Date.now()
    };

    mockParameters = {
      type: FilterType.CONTRAST,
      contrast: 10,
      enabled: true,
      opacity: 1.0
    };
  });

  describe('基本功能', () => {
    it('应该能够创建对比度滤镜实例', () => {
      expect(filter).toBeInstanceOf(ContrastFilter);
      expect(filter.type).toBe(FilterType.CONTRAST);
    });

    it('应该有正确的滤镜属性', () => {
      expect(filter.type).toBe(FilterType.CONTRAST);
      expect(filter.name).toContain('Contrast');
      expect(filter.description).toBeDefined();
      expect(filter.supportedInputFormats).toBeDefined();
      expect(typeof filter.requiresWebGL).toBe('boolean');
    });
  });

  describe('参数验证', () => {
    it('应该能够验证有效参数', () => {
      const validParams: ContrastParameters = {
        type: FilterType.CONTRAST,
        contrast: 50,
        enabled: true,
        opacity: 1.0
      };

      expect(filter.validateParameters(validParams)).toBe(true);
    });

    it('应该拒绝无效参数', () => {
      const invalidParams = {
        type: FilterType.BRIGHTNESS,
        contrast: 'invalid'
      } as any;

      expect(filter.validateParameters(invalidParams)).toBe(false);
    });

    it('应该提供默认参数', () => {
      const defaultParams = filter.getDefaultParameters();

      expect(defaultParams.type).toBe(FilterType.CONTRAST);
      expect(typeof defaultParams.contrast).toBe('number');
      expect(defaultParams.enabled).toBe(true);
      expect(defaultParams.opacity).toBe(1.0);
    });
  });

  describe('滤镜应用', () => {
    it('应该能够成功应用滤镜', async () => {
      const result = await filter.apply(mockContext, mockParameters);

      expect(result.success).toBe(true);
      expect(result.processedImageData).toBeDefined();
      expect(result.error).toBeUndefined();
    });

    it('应该能够处理应用错误', async () => {
      // 模拟错误条件
      const invalidContext = {} as FilterContext;

      const result = await filter.apply(invalidContext, mockParameters);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('性能估算', () => {
    it('应该能够估算处理时间', () => {
      const width = 100;
      const height = 100;

      const estimatedTime = filter.estimateProcessingTime(width, height, mockParameters);

      expect(estimatedTime).toBeGreaterThan(0);
      expect(typeof estimatedTime).toBe('number');
    });

    it('处理时间应该随图像大小增加', () => {
      const smallTime = filter.estimateProcessingTime(10, 10, mockParameters);
      const largeTime = filter.estimateProcessingTime(100, 100, mockParameters);

      expect(largeTime).toBeGreaterThan(smallTime);
    });
  });

  describe('对比度调整', () => {
    it('应该能够处理不同的对比度值', async () => {
      // 测试低对比度
      const lowContrastParams: ContrastParameters = {
        type: FilterType.CONTRAST,
        contrast: -50,
        enabled: true,
        opacity: 1.0
      };

      const lowResult = await filter.apply(mockContext, lowContrastParams);
      expect(lowResult.success).toBe(true);

      // 测试高对比度
      const highContrastParams: ContrastParameters = {
        type: FilterType.CONTRAST,
        contrast: 100,
        enabled: true,
        opacity: 1.0
      };

      const highResult = await filter.apply(mockContext, highContrastParams);
      expect(highResult.success).toBe(true);
    });

    it('应该能够处理边界对比度值', async () => {
      // 测试极端对比度
      const extremeContrastParams: ContrastParameters = {
        type: FilterType.CONTRAST,
        contrast: -100,
        enabled: true,
        opacity: 1.0
      };

      const result = await filter.apply(mockContext, extremeContrastParams);
      expect(result.success).toBe(true);
    });
  });

  describe('抽象类特性', () => {
    it('应该实现BaseFilter接口', () => {
      expect(filter.type).toBeDefined();
      expect(filter.name).toBeDefined();
      expect(filter.description).toBeDefined();
      expect(filter.supportedInputFormats).toBeDefined();
      expect(typeof filter.requiresWebGL).toBe('boolean');
    });

    it('应该实现IFilter接口', () => {
      expect(typeof filter.apply).toBe('function');
      expect(typeof filter.validateParameters).toBe('function');
      expect(typeof filter.getDefaultParameters).toBe('function');
      expect(typeof filter.estimateProcessingTime).toBe('function');
    });
  });
});