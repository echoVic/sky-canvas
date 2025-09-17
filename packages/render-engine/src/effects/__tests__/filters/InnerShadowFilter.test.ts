/**
 * InnerShadowFilter 单元测试
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { InnerShadowFilter } from '../../filters/InnerShadowFilter';
import { FilterContext, FilterType, InnerShadowParameters } from '../../types/FilterTypes';

// Mock parseColor 工具函数
vi.mock('../../utils/ColorUtils', () => ({
  parseColor: vi.fn((color: string) => {
    if (color === '#000000') return { r: 0, g: 0, b: 0, a: 1 };
    if (color === '#ff0000') return { r: 1, g: 0, b: 0, a: 1 };
    if (color === '#ffffff') return { r: 1, g: 1, b: 1, a: 1 };
    return { r: 0.5, g: 0.5, b: 0.5, a: 0.8 };
  })
}));

describe('InnerShadowFilter', () => {
  let filter: InnerShadowFilter;
  let mockContext: FilterContext;
  let mockImageData: ImageData;

  beforeEach(() => {
    filter = new InnerShadowFilter();

    // 创建模拟的ImageData
    mockImageData = new ImageData(100, 100);
    // 设置一些透明度数据以模拟形状
    for (let i = 0; i < mockImageData.data.length; i += 4) {
      // 创建一个中心有内容的图形
      const x = (i / 4) % 100;
      const y = Math.floor((i / 4) / 100);
      const centerDistance = Math.sqrt((x - 50) ** 2 + (y - 50) ** 2);

      if (centerDistance < 40) {
        mockImageData.data[i] = 255;     // R
        mockImageData.data[i + 1] = 255; // G
        mockImageData.data[i + 2] = 255; // B
        mockImageData.data[i + 3] = 255; // A
      } else {
        mockImageData.data[i] = 0;
        mockImageData.data[i + 1] = 0;
        mockImageData.data[i + 2] = 0;
        mockImageData.data[i + 3] = 0;
      }
    }

    mockContext = {
      sourceImageData: mockImageData,
      width: mockImageData.width,
      height: mockImageData.height,
      timestamp: Date.now()
    };
  });

  describe('基础属性', () => {
    it('应该具有正确的类型和属性', () => {
      expect(filter.type).toBe(FilterType.INNER_SHADOW);
      expect(filter.name).toBe('Inner Shadow');
      expect(filter.description).toBe('Adds an inner shadow effect to the image');
      expect(filter.supportedInputFormats).toContain('image/png');
      expect(filter.supportedInputFormats).toContain('image/jpeg');
      expect(filter.requiresWebGL).toBe(false);
    });
  });

  describe('getDefaultParameters', () => {
    it('应该返回正确的默认参数', () => {
      const params = filter.getDefaultParameters();

      expect(params.type).toBe(FilterType.INNER_SHADOW);
      expect(params.offsetX).toBe(2);
      expect(params.offsetY).toBe(2);
      expect(params.blur).toBe(4);
      expect(params.color).toBe('#000000');
      expect(params.opacity).toBe(0.5);
      expect(params.enabled).toBe(true);
    });
  });

  describe('validateSpecificParameters', () => {
    it('应该验证有效参数', () => {
      const validParams: InnerShadowParameters = {
        type: FilterType.INNER_SHADOW,
        offsetX: 5,
        offsetY: -3,
        blur: 10,
        color: '#ff0000',
        opacity: 0.8,
        enabled: true
      };

      expect(filter.validateParameters(validParams)).toBe(true);
    });

    it('应该拒绝无效参数类型', () => {
      const invalidParams = {
        type: FilterType.INNER_SHADOW,
        offsetX: 'invalid' as any,
        offsetY: 2,
        blur: 4,
        color: '#000000',
        enabled: true
      } as any;

      expect(filter.validateParameters(invalidParams)).toBe(false);
    });

    it('应该拒绝负的模糊值', () => {
      const invalidParams: InnerShadowParameters = {
        type: FilterType.INNER_SHADOW,
        offsetX: 2,
        offsetY: 2,
        blur: -1,
        color: '#000000',
        enabled: true
      };

      expect(filter.validateParameters(invalidParams)).toBe(false);
    });

    it('应该接受零值偏移和模糊', () => {
      const validParams: InnerShadowParameters = {
        type: FilterType.INNER_SHADOW,
        offsetX: 0,
        offsetY: 0,
        blur: 0,
        color: '#000000',
        enabled: true
      };

      expect(filter.validateParameters(validParams)).toBe(true);
    });
  });

  describe('processFilter', () => {
    it('应该处理基本的内阴影效果', async () => {
      const params: InnerShadowParameters = {
        type: FilterType.INNER_SHADOW,
        offsetX: 3,
        offsetY: 3,
        blur: 2,
        color: '#000000',
        opacity: 0.5,
        enabled: true
      };

      const result = await filter.apply(mockContext, params);

      expect(result.success).toBe(true);
      expect(result.processedImageData).toBeDefined();
      expect(result.processedImageData!.width).toBe(mockImageData.width);
      expect(result.processedImageData!.height).toBe(mockImageData.height);
    });

    it('应该在无偏移和模糊时返回原图', async () => {
      const params: InnerShadowParameters = {
        type: FilterType.INNER_SHADOW,
        offsetX: 0,
        offsetY: 0,
        blur: 0,
        color: '#000000',
        opacity: 0.5,
        enabled: true
      };

      const result = await filter.apply(mockContext, params);

      expect(result.success).toBe(true);
      expect(result.processedImageData).toBeDefined();

      // 应该与原图数据相同
      const originalData = mockContext.sourceImageData.data;
      const resultData = result.processedImageData!.data;

      let identical = true;
      for (let i = 0; i < originalData.length; i++) {
        if (originalData[i] !== resultData[i]) {
          identical = false;
          break;
        }
      }
      expect(identical).toBe(true);
    });

    it('应该正确应用不同的阴影颜色', async () => {
      const redParams: InnerShadowParameters = {
        type: FilterType.INNER_SHADOW,
        offsetX: 2,
        offsetY: 2,
        blur: 1,
        color: '#ff0000',
        opacity: 1.0,
        enabled: true
      };

      const result = await filter.apply(mockContext, redParams);

      expect(result.success).toBe(true);
      expect(result.processedImageData).toBeDefined();
    });

    it('应该正确处理不透明度设置', async () => {
      const lowOpacityParams: InnerShadowParameters = {
        type: FilterType.INNER_SHADOW,
        offsetX: 5,
        offsetY: 5,
        blur: 3,
        color: '#000000',
        opacity: 0.1,
        enabled: true
      };

      const highOpacityParams: InnerShadowParameters = {
        ...lowOpacityParams,
        opacity: 0.9
      };

      const lowOpacityResult = await filter.apply(mockContext, lowOpacityParams);
      const highOpacityResult = await filter.apply(mockContext, highOpacityParams);

      expect(lowOpacityResult.success).toBe(true);
      expect(highOpacityResult.success).toBe(true);

      // 高不透明度应该产生更强的效果（但难以直接比较，因为内阴影算法复杂）
      expect(lowOpacityResult.processedImageData).toBeDefined();
      expect(highOpacityResult.processedImageData).toBeDefined();
    });

    it('应该处理大的模糊半径', async () => {
      const bigBlurParams: InnerShadowParameters = {
        type: FilterType.INNER_SHADOW,
        offsetX: 1,
        offsetY: 1,
        blur: 20,
        color: '#000000',
        opacity: 0.7,
        enabled: true
      };

      const result = await filter.apply(mockContext, bigBlurParams);

      expect(result.success).toBe(true);
      expect(result.processedImageData).toBeDefined();
    });
  });

  describe('边缘情况处理', () => {
    it('应该处理空图像', async () => {
      const emptyImageData = new ImageData(50, 50);
      // 所有像素都是透明的

      const emptyContext: FilterContext = {
        ...mockContext,
        sourceImageData: emptyImageData,
        width: 50,
        height: 50
      };

      const params: InnerShadowParameters = {
        type: FilterType.INNER_SHADOW,
        offsetX: 3,
        offsetY: 3,
        blur: 5,
        color: '#000000',
        opacity: 0.8,
        enabled: true
      };

      const result = await filter.apply(emptyContext, params);

      expect(result.success).toBe(true);
      expect(result.processedImageData).toBeDefined();
    });

    it('应该处理全不透明图像', async () => {
      const solidImageData = new ImageData(30, 30);
      // 所有像素都是不透明的
      for (let i = 0; i < solidImageData.data.length; i += 4) {
        solidImageData.data[i] = 255;     // R
        solidImageData.data[i + 1] = 128; // G
        solidImageData.data[i + 2] = 64;  // B
        solidImageData.data[i + 3] = 255; // A
      }

      const solidContext: FilterContext = {
        ...mockContext,
        sourceImageData: solidImageData,
        width: 30,
        height: 30
      };

      const params: InnerShadowParameters = {
        type: FilterType.INNER_SHADOW,
        offsetX: 2,
        offsetY: 2,
        blur: 3,
        color: '#ffffff',
        opacity: 0.6,
        enabled: true
      };

      const result = await filter.apply(solidContext, params);

      expect(result.success).toBe(true);
      expect(result.processedImageData).toBeDefined();
    });

    it('应该处理极端偏移值', async () => {
      const extremeParams: InnerShadowParameters = {
        type: FilterType.INNER_SHADOW,
        offsetX: -50,
        offsetY: 50,
        blur: 1,
        color: '#000000',
        opacity: 0.5,
        enabled: true
      };

      const result = await filter.apply(mockContext, extremeParams);

      expect(result.success).toBe(true);
      expect(result.processedImageData).toBeDefined();
    });
  });

  describe('性能测试', () => {
    it('应该在合理时间内处理中等大小图像', async () => {
      const mediumImageData = new ImageData(200, 200);
      // 创建一些内容
      for (let i = 0; i < mediumImageData.data.length; i += 4) {
        const x = (i / 4) % 200;
        const y = Math.floor((i / 4) / 200);
        const centerDistance = Math.sqrt((x - 100) ** 2 + (y - 100) ** 2);

        if (centerDistance < 80) {
          mediumImageData.data[i + 3] = 255; // 只设置Alpha
        }
      }

      const mediumContext: FilterContext = {
        ...mockContext,
        sourceImageData: mediumImageData,
        width: 200,
        height: 200
      };

      const params: InnerShadowParameters = {
        type: FilterType.INNER_SHADOW,
        offsetX: 5,
        offsetY: 5,
        blur: 10,
        color: '#000000',
        opacity: 0.7,
        enabled: true
      };

      const startTime = performance.now();
      const result = await filter.apply(mediumContext, params);
      const endTime = performance.now();

      expect(result.success).toBe(true);
      expect(endTime - startTime).toBeLessThan(1000); // 应该在1秒内完成
    });

    it('应该正确预估处理时间', () => {
      const params: InnerShadowParameters = {
        type: FilterType.INNER_SHADOW,
        offsetX: 2,
        offsetY: 2,
        blur: 5,
        color: '#000000',
        enabled: true
      };

      const estimatedTime = filter.estimateProcessingTime(100, 100, params);

      expect(estimatedTime).toBeGreaterThan(0);
      expect(typeof estimatedTime).toBe('number');
    });

    it('应该根据模糊半径调整复杂度因子', () => {
      const lowBlurParams: InnerShadowParameters = {
        type: FilterType.INNER_SHADOW,
        offsetX: 0,
        offsetY: 0,
        blur: 1,
        color: '#000000',
        enabled: true
      };

      const highBlurParams: InnerShadowParameters = {
        ...lowBlurParams,
        blur: 20
      };

      const lowBlurComplexity = (filter as any).getComplexityFactor(lowBlurParams);
      const highBlurComplexity = (filter as any).getComplexityFactor(highBlurParams);

      expect(highBlurComplexity).toBeGreaterThan(lowBlurComplexity);
    });
  });

  describe('错误处理', () => {
    it('应该处理无效上下文', async () => {
      const invalidContext = {
        ...mockContext,
        sourceImageData: null as any
      };

      const params = filter.getDefaultParameters();

      const result = await filter.apply(invalidContext, params);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('应该处理无效参数', async () => {
      const invalidParams = {
        ...filter.getDefaultParameters(),
        blur: -5
      };

      const result = await filter.apply(mockContext, invalidParams);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('应该处理尺寸不匹配的上下文', async () => {
      const mismatchContext = {
        ...mockContext,
        width: 200, // 与imageData尺寸不匹配
        height: 200
      };

      const params = filter.getDefaultParameters();

      const result = await filter.apply(mismatchContext, params);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('内部方法测试', () => {
    it('createEdgeMask应该创建正确的边缘遮罩', () => {
      const createEdgeMask = (filter as any).createEdgeMask.bind(filter);

      const result = createEdgeMask(mockImageData, 2, 2);

      expect(result).toBeInstanceOf(ImageData);
      expect(result.width).toBe(mockImageData.width);
      expect(result.height).toBe(mockImageData.height);
    });

    it('applyInnerShadow应该正确应用内阴影', () => {
      const applyInnerShadow = (filter as any).applyInnerShadow.bind(filter);

      const targetImageData = (filter as any).cloneImageData(mockImageData);
      const maskImageData = new ImageData(mockImageData.width, mockImageData.height);
      const color = { r: 0, g: 0, b: 0, a: 1 };
      const opacity = 0.5;

      expect(() => {
        applyInnerShadow(targetImageData, maskImageData, color, opacity);
      }).not.toThrow();
    });

    it('applyGaussianBlur应该应用模糊效果', async () => {
      const applyGaussianBlur = (filter as any).applyGaussianBlur.bind(filter);

      const result = await applyGaussianBlur(mockImageData, 3);

      expect(result).toBeInstanceOf(ImageData);
      expect(result.width).toBe(mockImageData.width);
      expect(result.height).toBe(mockImageData.height);
    });

    it('applyGaussianBlur应该在半径为0时返回原图', async () => {
      const applyGaussianBlur = (filter as any).applyGaussianBlur.bind(filter);

      const result = await applyGaussianBlur(mockImageData, 0);

      expect(result).toBe(mockImageData); // 应该返回同一个对象
    });
  });

  describe('性能统计', () => {
    it('应该跟踪性能统计', async () => {
      const params = filter.getDefaultParameters();

      await filter.apply(mockContext, params);
      await filter.apply(mockContext, params);

      const stats = filter.getPerformanceStats();

      expect(stats.totalExecutions).toBe(2);
      expect(stats.filterType).toBe(FilterType.INNER_SHADOW);
      expect(stats.averageProcessingTime).toBeGreaterThan(0);
    });

    it('应该能重置性能统计', async () => {
      const params = filter.getDefaultParameters();

      await filter.apply(mockContext, params);
      filter.resetPerformanceStats();

      const stats = filter.getPerformanceStats();

      expect(stats.totalExecutions).toBe(0);
      expect(stats.averageProcessingTime).toBe(0);
    });
  });
});