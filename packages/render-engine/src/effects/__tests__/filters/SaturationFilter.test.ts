/**
 * SaturationFilter 单元测试
 */

import { beforeEach, describe, expect, it } from 'vitest';
import { SaturationFilter } from '../../filters/SaturationFilter';
import type { FilterContext, SaturationParameters } from '../../types/FilterTypes';
import { FilterType } from '../../types/FilterTypes';

describe('SaturationFilter', () => {
  let filter: SaturationFilter;
  let mockContext: FilterContext;
  let mockParameters: SaturationParameters;

  beforeEach(() => {
    filter = new SaturationFilter();

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
      type: FilterType.SATURATION,
      saturation: 50,
      enabled: true,
      opacity: 1.0
    };
  });

  describe('基本功能', () => {
    it('应该能够创建饱和度滤镜实例', () => {
      expect(filter).toBeInstanceOf(SaturationFilter);
      expect(filter.type).toBe(FilterType.SATURATION);
    });

    it('应该有正确的滤镜属性', () => {
      expect(filter.type).toBe(FilterType.SATURATION);
      expect(filter.name).toContain('Saturation');
      expect(filter.description).toBeDefined();
      expect(filter.supportedInputFormats).toBeDefined();
      expect(typeof filter.requiresWebGL).toBe('boolean');
    });
  });

  describe('参数验证', () => {
    it('应该能够验证有效参数', () => {
      const validParams: SaturationParameters = {
        type: FilterType.SATURATION,
        saturation: 75,
        enabled: true,
        opacity: 1.0
      };

      expect(filter.validateParameters(validParams)).toBe(true);
    });

    it('应该拒绝无效参数', () => {
      const invalidParams = {
        type: FilterType.BRIGHTNESS,
        saturation: 'invalid'
      } as any;

      expect(filter.validateParameters(invalidParams)).toBe(false);
    });

    it('应该提供默认参数', () => {
      const defaultParams = filter.getDefaultParameters();

      expect(defaultParams.type).toBe(FilterType.SATURATION);
      expect(typeof defaultParams.saturation).toBe('number');
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

  describe('饱和度调整', () => {
    it('应该能够处理不同的饱和度值', async () => {
      // 测试降低饱和度
      const lowParams: SaturationParameters = {
        type: FilterType.SATURATION,
        saturation: -50,
        enabled: true,
        opacity: 1.0
      };

      const lowResult = await filter.apply(mockContext, lowParams);
      expect(lowResult.success).toBe(true);

      // 测试增加饱和度
      const highParams: SaturationParameters = {
        type: FilterType.SATURATION,
        saturation: 100,
        enabled: true,
        opacity: 1.0
      };

      const highResult = await filter.apply(mockContext, highParams);
      expect(highResult.success).toBe(true);
    });

    it('应该能够处理边界值', async () => {
      // 测试极低饱和度（去饱和）
      const desaturateParams: SaturationParameters = {
        type: FilterType.SATURATION,
        saturation: -100,
        enabled: true,
        opacity: 1.0
      };

      const desaturateResult = await filter.apply(mockContext, desaturateParams);
      expect(desaturateResult.success).toBe(true);

      // 测试极高饱和度（最大有效值）
      const oversaturateParams: SaturationParameters = {
        type: FilterType.SATURATION,
        saturation: 100,
        enabled: true,
        opacity: 1.0
      };

      const oversaturateResult = await filter.apply(mockContext, oversaturateParams);
      expect(oversaturateResult.success).toBe(true);
    });

    it('应该能够处理零饱和度', async () => {
      const zeroParams: SaturationParameters = {
        type: FilterType.SATURATION,
        saturation: 0,
        enabled: true,
        opacity: 1.0
      };

      const result = await filter.apply(mockContext, zeroParams);
      expect(result.success).toBe(true);
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