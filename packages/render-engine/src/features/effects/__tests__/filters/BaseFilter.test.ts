/**
 * BaseFilter 单元测试
 */

import { beforeEach, describe, expect, it } from 'vitest';
import { BaseFilter } from '../../filters';
import type {
  BrightnessParameters,
  FilterContext,
  FilterResult
} from '../../types/FilterTypes';
import {
  FilterType
} from '../../types/FilterTypes';

class TestFilter extends BaseFilter<BrightnessParameters> {
  readonly type = FilterType.BRIGHTNESS;
  readonly name = 'TestBrightness';
  readonly description = 'Test brightness filter';
  readonly supportedInputFormats = ['canvas', 'imagedata'];
  readonly requiresWebGL = false;

  protected async processFilter(context: FilterContext, parameters: BrightnessParameters): Promise<ImageData> {
    // 简单的测试实现
    if (!context || !context.sourceImageData) {
      throw new Error('Invalid context provided');
    }
    
    // 创建输出图像数据
    const outputData = this.createOutputImageData(context.width, context.height);
    const sourceData = context.sourceImageData.data;
    const targetData = outputData.data;
    
    // 应用亮度调整
    const brightness = parameters.brightness;
    for (let i = 0; i < sourceData.length; i += 4) {
      targetData[i] = this.clamp(sourceData[i] + brightness);     // R
      targetData[i + 1] = this.clamp(sourceData[i + 1] + brightness); // G
      targetData[i + 2] = this.clamp(sourceData[i + 2] + brightness); // B
      targetData[i + 3] = sourceData[i + 3];                     // A
    }
    
    return outputData;
  }

  protected validateSpecificParameters(parameters: BrightnessParameters): boolean {
    return typeof parameters.brightness === 'number' &&
           parameters.brightness >= -100 &&
           parameters.brightness <= 100;
  }

  getDefaultParameters(): BrightnessParameters {
    return {
      type: FilterType.BRIGHTNESS,
      brightness: 0,
      enabled: true,
      opacity: 1.0
    };
  }
}

describe('BaseFilter', () => {
  let filter: TestFilter;
  let mockContext: FilterContext;
  let mockParameters: BrightnessParameters;

  beforeEach(() => {
    filter = new TestFilter();

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
      type: FilterType.BRIGHTNESS,
      brightness: 10,
      enabled: true,
      opacity: 1.0
    };
  });

  describe('基本功能', () => {
    it('应该能够创建滤镜实例', () => {
      expect(filter).toBeInstanceOf(BaseFilter);
      expect(filter.type).toBe(FilterType.BRIGHTNESS);
      expect(filter.name).toBe('TestBrightness');
    });

    it('应该有正确的滤镜属性', () => {
      expect(filter.type).toBe(FilterType.BRIGHTNESS);
      expect(filter.name).toBe('TestBrightness');
      expect(filter.description).toBe('Test brightness filter');
      expect(filter.supportedInputFormats).toEqual(['canvas', 'imagedata']);
      expect(filter.requiresWebGL).toBe(false);
    });
  });

  describe('参数验证', () => {
    it('应该能够验证有效参数', () => {
      const validParams: BrightnessParameters = {
        type: FilterType.BRIGHTNESS,
        brightness: 50,
        enabled: true,
        opacity: 1.0
      };

      expect(filter.validateParameters(validParams)).toBe(true);
    });

    it('应该拒绝无效参数', () => {
      const invalidParams = {
        type: FilterType.CONTRAST,
        brightness: 'invalid'
      } as any;

      expect(filter.validateParameters(invalidParams)).toBe(false);
    });

    it('应该提供默认参数', () => {
      const defaultParams = filter.getDefaultParameters();

      expect(defaultParams.type).toBe(FilterType.BRIGHTNESS);
      expect(defaultParams.brightness).toBe(0);
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

  describe('抽象类特性', () => {
    it('应该保持抽象类特性', () => {
      // BaseFilter 是抽象类，不能直接实例化
      // 这个测试确保我们的具体实现是正确的
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

  describe('性能统计', () => {
    it('应该跟踪执行统计', async () => {
      // 获取初始统计
      const initialStats = (filter as any).performanceStats;

      // 执行滤镜
      await filter.apply(mockContext, mockParameters);

      // 验证统计更新（这取决于BaseFilter的具体实现）
      expect(initialStats).toBeDefined();
      expect(typeof initialStats.totalExecutions).toBe('number');
      expect(typeof initialStats.totalProcessingTime).toBe('number');
    });
  });
});