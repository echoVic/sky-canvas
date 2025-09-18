/**
 * GrayscaleFilter 单元测试
 */

import { beforeEach, describe, expect, it } from 'vitest';
import { GrayscaleFilter } from '../../filters/GrayscaleFilter';
import type { FilterContext, GrayscaleParameters } from '../../types/FilterTypes';
import { FilterType } from '../../types/FilterTypes';

describe('GrayscaleFilter', () => {
  let filter: GrayscaleFilter;
  let mockContext: FilterContext;
  let mockParameters: GrayscaleParameters;

  beforeEach(() => {
    filter = new GrayscaleFilter();

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
      type: FilterType.GRAYSCALE,
      amount: 1.0,
      enabled: true,
      opacity: 1.0
    };
  });

  describe('基本功能', () => {
    it('应该能够创建灰度滤镜实例', () => {
      expect(filter).toBeInstanceOf(GrayscaleFilter);
      expect(filter.type).toBe(FilterType.GRAYSCALE);
    });

    it('应该有正确的滤镜属性', () => {
      expect(filter.type).toBe(FilterType.GRAYSCALE);
      expect(filter.name).toContain('Grayscale');
      expect(filter.description).toBeDefined();
      expect(filter.supportedInputFormats).toBeDefined();
      expect(typeof filter.requiresWebGL).toBe('boolean');
    });
  });

  describe('参数验证', () => {
    it('应该能够验证有效参数', () => {
      const validParams: GrayscaleParameters = {
        type: FilterType.GRAYSCALE,
        amount: 0.8,
        enabled: true,
        opacity: 1.0
      };

      expect(filter.validateParameters(validParams)).toBe(true);
    });

    it('应该拒绝无效参数', () => {
      const invalidParams = {
        type: FilterType.BRIGHTNESS,
        amount: 'invalid'
      } as any;

      expect(filter.validateParameters(invalidParams)).toBe(false);
    });

    it('应该提供默认参数', () => {
      const defaultParams = filter.getDefaultParameters();

      expect(defaultParams.type).toBe(FilterType.GRAYSCALE);
      expect(typeof defaultParams.amount).toBe('number');
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
      const invalidContext = {} as FilterContext;

      const result = await filter.apply(invalidContext, mockParameters);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('灰度效果', () => {
    it('应该能够处理不同的灰度强度', async () => {
      // 测试部分灰度
      const partialParams: GrayscaleParameters = {
        type: FilterType.GRAYSCALE,
        amount: 0.5,
        enabled: true,
        opacity: 1.0
      };

      const partialResult = await filter.apply(mockContext, partialParams);
      expect(partialResult.success).toBe(true);

      // 测试完全灰度
      const fullParams: GrayscaleParameters = {
        type: FilterType.GRAYSCALE,
        amount: 1.0,
        enabled: true,
        opacity: 1.0
      };

      const fullResult = await filter.apply(mockContext, fullParams);
      expect(fullResult.success).toBe(true);
    });

    it('应该能够处理边界值', async () => {
      // 测试最小灰度
      const minParams: GrayscaleParameters = {
        type: FilterType.GRAYSCALE,
        amount: 0.0,
        enabled: true,
        opacity: 1.0
      };

      const minResult = await filter.apply(mockContext, minParams);
      expect(minResult.success).toBe(true);

      // 测试最大灰度
      const maxParams: GrayscaleParameters = {
        type: FilterType.GRAYSCALE,
        amount: 1.0,
        enabled: true,
        opacity: 1.0
      };

      const maxResult = await filter.apply(mockContext, maxParams);
      expect(maxResult.success).toBe(true);
    });
  });

  describe('性能估算', () => {
    it('应该能够估算处理时间', () => {
      const estimatedTime = filter.estimateProcessingTime(100, 100, mockParameters);

      expect(estimatedTime).toBeGreaterThan(0);
      expect(typeof estimatedTime).toBe('number');
    });

    it('处理时间应该随图像大小增加', () => {
      const smallTime = filter.estimateProcessingTime(10, 10, mockParameters);
      const largeTime = filter.estimateProcessingTime(100, 100, mockParameters);

      expect(largeTime).toBeGreaterThan(smallTime);
    });
  });

  describe('接口实现', () => {
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