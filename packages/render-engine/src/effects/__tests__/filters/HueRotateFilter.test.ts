/**
 * HueRotateFilter 单元测试
 */

import { beforeEach, describe, expect, it } from 'vitest';
import { HueRotateFilter } from '../../filters/HueRotateFilter';
import type { FilterContext, HueRotateParameters } from '../../types/FilterTypes';
import { FilterType } from '../../types/FilterTypes';

describe('HueRotateFilter', () => {
  let filter: HueRotateFilter;
  let mockContext: FilterContext;
  let mockParameters: HueRotateParameters;

  beforeEach(() => {
    filter = new HueRotateFilter();

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
      type: FilterType.HUE_ROTATE,
      angle: 90,
      enabled: true,
      opacity: 1.0
    };
  });

  describe('基本功能', () => {
    it('应该能够创建色相旋转滤镜实例', () => {
      expect(filter).toBeInstanceOf(HueRotateFilter);
      expect(filter.type).toBe(FilterType.HUE_ROTATE);
    });

    it('应该有正确的滤镜属性', () => {
      expect(filter.type).toBe(FilterType.HUE_ROTATE);
      expect(filter.name).toContain('Hue');
      expect(filter.description).toBeDefined();
      expect(filter.supportedInputFormats).toBeDefined();
      expect(typeof filter.requiresWebGL).toBe('boolean');
    });
  });

  describe('参数验证', () => {
    it('应该能够验证有效参数', () => {
      const validParams: HueRotateParameters = {
        type: FilterType.HUE_ROTATE,
        angle: 180,
        enabled: true,
        opacity: 1.0
      };

      expect(filter.validateParameters(validParams)).toBe(true);
    });

    it('应该拒绝无效参数', () => {
      const invalidParams = {
        type: FilterType.BRIGHTNESS,
        angle: 'invalid'
      } as any;

      expect(filter.validateParameters(invalidParams)).toBe(false);
    });

    it('应该提供默认参数', () => {
      const defaultParams = filter.getDefaultParameters();

      expect(defaultParams.type).toBe(FilterType.HUE_ROTATE);
      expect(typeof defaultParams.angle).toBe('number');
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

  describe('色相旋转', () => {
    it('应该能够处理不同的旋转角度', async () => {
      // 测试不同角度
      const angles = [0, 90, 180, 270, 360];

      for (const angle of angles) {
        const params: HueRotateParameters = {
          type: FilterType.HUE_ROTATE,
          angle: angle,
          enabled: true,
          opacity: 1.0
        };

        const result = await filter.apply(mockContext, params);
        expect(result.success).toBe(true);
      }
    });

    it('应该能够处理负角度', async () => {
      const negativeParams: HueRotateParameters = {
        type: FilterType.HUE_ROTATE,
        angle: -90,
        enabled: true,
        opacity: 1.0
      };

      const result = await filter.apply(mockContext, negativeParams);
      expect(result.success).toBe(true);
    });

    it('应该能够处理大于360度的角度', async () => {
      const largeAngleParams: HueRotateParameters = {
        type: FilterType.HUE_ROTATE,
        angle: 450,
        enabled: true,
        opacity: 1.0
      };

      const result = await filter.apply(mockContext, largeAngleParams);
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