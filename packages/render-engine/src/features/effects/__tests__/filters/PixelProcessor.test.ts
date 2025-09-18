/**
 * PixelProcessor 单元测试
 */

import { beforeEach, describe, expect, it } from 'vitest';
import { PixelProcessor, PixelProcessorFunction, RGBProcessorFunction } from '../../filters/PixelProcessor';
import { FilterContext, BrightnessParameters, ContrastParameters, FilterType } from '../../types/FilterTypes';

// 创建具体的PixelProcessor实现用于测试
class TestPixelProcessor extends PixelProcessor<BrightnessParameters> {
  readonly type = FilterType.BRIGHTNESS;
  readonly name = 'Test Pixel Processor';
  readonly description = 'A test implementation of PixelProcessor';
  readonly supportedInputFormats = ['image/png'];
  readonly requiresWebGL = false;

  protected shouldSkipProcessing(parameters: BrightnessParameters): boolean {
    return !parameters.enabled;
  }

  protected getRGBProcessor(parameters: BrightnessParameters): RGBProcessorFunction {
    // 简单的亮度调整处理器
    const brightness = parameters.brightness || 0;
    return (r, g, b) => [
      this.clamp(r + brightness),
      this.clamp(g + brightness),
      this.clamp(b + brightness)
    ];
  }

  getDefaultParameters(): BrightnessParameters {
    return {
      type: FilterType.BRIGHTNESS,
      brightness: 0,
      enabled: true,
      opacity: 1.0
    };
  }

  protected validateSpecificParameters(parameters: BrightnessParameters): boolean {
    return typeof parameters.brightness === 'number' &&
           parameters.brightness >= -100 &&
           parameters.brightness <= 100;
  }

  protected getComplexityFactor(parameters: BrightnessParameters): number {
    return 1.2;
  }

  protected getBaseProcessingTimePerPixel(): number {
    return 0.0012;
  }
}

// 创建使用完整像素处理函数的测试类
class TestFullPixelProcessor extends PixelProcessor<ContrastParameters> {
  readonly type = FilterType.CONTRAST;
  readonly name = 'Test Full Pixel Processor';
  readonly description = 'A test implementation using full pixel processing';
  readonly supportedInputFormats = ['image/png'];
  readonly requiresWebGL = false;

  protected shouldSkipProcessing(parameters: ContrastParameters): boolean {
    return !parameters.enabled;
  }

  protected getPixelProcessor(parameters: ContrastParameters): PixelProcessorFunction {
    const contrast = parameters.contrast || 1;
    return (r, g, b, a, index) => [
      this.clamp((r - 128) * contrast + 128),
      this.clamp((g - 128) * contrast + 128),
      this.clamp((b - 128) * contrast + 128),
      a
    ];
  }

  // 不实现getRGBProcessor，强制使用getPixelProcessor
  protected getRGBProcessor(parameters: ContrastParameters): RGBProcessorFunction {
    throw new Error('Should not be called when getPixelProcessor is implemented');
  }

  getDefaultParameters(): ContrastParameters {
    return {
      type: FilterType.CONTRAST,
      contrast: 0,
      enabled: true
    };
  }

  protected validateSpecificParameters(parameters: ContrastParameters): boolean {
    return typeof parameters.contrast === 'number' &&
           parameters.contrast >= -100 &&
           parameters.contrast <= 100;
  }
}

describe('PixelProcessor', () => {
  let processor: TestPixelProcessor;
  let mockContext: FilterContext;
  let mockImageData: ImageData;

  beforeEach(() => {
    processor = new TestPixelProcessor();

    // 创建测试图像数据
    mockImageData = new ImageData(50, 50);
    for (let i = 0; i < mockImageData.data.length; i += 4) {
      mockImageData.data[i] = 128;     // R
      mockImageData.data[i + 1] = 64;  // G
      mockImageData.data[i + 2] = 192; // B
      mockImageData.data[i + 3] = 255; // A
    }

    mockContext = {
      sourceImageData: mockImageData,
      width: mockImageData.width,
      height: mockImageData.height,
      timestamp: Date.now()
    };
  });

  describe('基础功能', () => {
    it('应该正确初始化', () => {
      expect(processor.type).toBe(FilterType.BRIGHTNESS);
      expect(processor.name).toBe('Test Pixel Processor');
      expect(processor.description).toBeDefined();
      expect(processor.supportedInputFormats).toContain('image/png');
      expect(processor.requiresWebGL).toBe(false);
    });

    it('应该返回默认参数', () => {
      const params = processor.getDefaultParameters();
      expect(params.type).toBe(FilterType.BRIGHTNESS);
      expect(params.enabled).toBe(true);
    });

    it('应该验证参数', () => {
      const validParams: BrightnessParameters = { type: FilterType.BRIGHTNESS, enabled: true, brightness: 50 };
      const invalidParams = { type: FilterType.BRIGHTNESS as const, enabled: true, brightness: 'invalid' } as any;

      expect(processor.validateParameters(validParams)).toBe(true);
      expect(processor.validateParameters(invalidParams)).toBe(false);
    });
  });

  describe('processFilter', () => {
    it('应该应用亮度调整', async () => {
      const params: BrightnessParameters = {
        type: FilterType.BRIGHTNESS,
        enabled: true,
        brightness: 50
      };

      const result = await processor.apply(mockContext, params);

      expect(result.success).toBe(true);
      expect(result.processedImageData).toBeDefined();
      expect(result.processedImageData!.width).toBe(mockImageData.width);
      expect(result.processedImageData!.height).toBe(mockImageData.height);

      // 验证亮度确实增加了
      const originalR = mockImageData.data[0];
      const processedR = result.processedImageData!.data[0];
      expect(processedR).toBe(Math.min(255, originalR + 50));
    });

    it('当enabled为false时应该跳过处理', async () => {
      const params: BrightnessParameters = {
        type: FilterType.BRIGHTNESS,
        enabled: false,
        brightness: 50
      };

      const result = await processor.apply(mockContext, params);

      expect(result.success).toBe(true);
      expect(result.processedImageData).toBeDefined();

      // 应该与原图相同
      const originalData = mockImageData.data;
      const processedData = result.processedImageData!.data;

      for (let i = 0; i < originalData.length; i++) {
        expect(processedData[i]).toBe(originalData[i]);
      }
    });

    it('应该正确应用不透明度', async () => {
      const params: BrightnessParameters = {
        type: FilterType.BRIGHTNESS,
        enabled: true,
        brightness: 50,
        opacity: 0.5
      };

      const result = await processor.apply(mockContext, params);

      expect(result.success).toBe(true);
      expect(result.processedImageData).toBeDefined();

      // 检查alpha通道是否被修改（不透明度应用）
      const processedData = result.processedImageData!.data;
      for (let i = 3; i < processedData.length; i += 4) {
        expect(processedData[i]).toBeLessThanOrEqual(mockImageData.data[i]);
      }
    });
  });

  describe('processPixels方法', () => {
    it('应该使用自定义像素处理器', async () => {
      const customProcessor: PixelProcessorFunction = (r, g, b, a, index) => [
        255 - r, // 反转红色
        g,       // 保持绿色
        255 - b, // 反转蓝色
        a        // 保持alpha
      ];

      const params: BrightnessParameters = {
        type: FilterType.BRIGHTNESS,
        enabled: true,
        brightness: 0
      };

      // 使用反射访问protected方法进行测试
      const clonedData = processor['cloneImageData'](mockImageData);
      processor['processPixels'](clonedData.data, params, customProcessor);

      // 验证红色和蓝色被反转
      expect(clonedData.data[0]).toBe(255 - 128); // R inverted
      expect(clonedData.data[1]).toBe(64);        // G unchanged
      expect(clonedData.data[2]).toBe(255 - 192); // B inverted
      expect(clonedData.data[3]).toBe(255);       // A unchanged
    });

    it('应该正确钳制值到有效范围', async () => {
      const extremeProcessor: PixelProcessorFunction = (r, g, b, a, index) => [
        r + 500,  // 超过255
        g - 500,  // 小于0
        b,
        a
      ];

      const params: BrightnessParameters = {
        type: FilterType.BRIGHTNESS,
        enabled: true,
        brightness: 0
      };

      const clonedData = processor['cloneImageData'](mockImageData);
      processor['processPixels'](clonedData.data, params, extremeProcessor);

      expect(clonedData.data[0]).toBe(255); // 钳制到255
      expect(clonedData.data[1]).toBe(0);   // 钳制到0
    });
  });

  describe('processRGBPixels方法', () => {
    it('应该使用RGB处理器处理像素', async () => {
      const rgbProcessor: RGBProcessorFunction = (r, g, b) => [
        Math.min(255, r * 1.5),
        Math.min(255, g * 1.5),
        Math.min(255, b * 1.5)
      ];

      const params: BrightnessParameters = {
        type: FilterType.BRIGHTNESS,
        enabled: true,
        brightness: 0
      };

      const clonedData = processor['cloneImageData'](mockImageData);
      processor['processRGBPixels'](clonedData.data, params, rgbProcessor);

      // 验证RGB值被修改，alpha保持不变
      expect(clonedData.data[0]).toBe(Math.min(255, 128 * 1.5)); // R modified
      expect(clonedData.data[1]).toBe(Math.min(255, 64 * 1.5));  // G modified
      expect(clonedData.data[2]).toBe(Math.min(255, 192 * 1.5)); // B modified
      expect(clonedData.data[3]).toBe(255);                      // A unchanged
    });
  });

  describe('静态工厂方法', () => {
    it('createAdjustmentProcessor应该创建调整处理器', () => {
      const addProcessor = (PixelProcessor as any).createAdjustmentProcessor(50);
      const result = addProcessor(100, 150, 200);

      expect(result[0]).toBe(150); // 100 + 50
      expect(result[1]).toBe(200); // 150 + 50
      expect(result[2]).toBe(250); // 200 + 50
    });

    it('createAdjustmentProcessor应该支持函数调整', () => {
      const doubleProcessor = (PixelProcessor as any).createAdjustmentProcessor((value: number) => value * 2);
      const result = doubleProcessor(50, 75, 100);

      expect(result[0]).toBe(100); // 50 * 2
      expect(result[1]).toBe(150); // 75 * 2
      expect(result[2]).toBe(200); // 100 * 2
    });

    it('createFactorProcessor应该创建因子处理器', () => {
      const halfProcessor = (PixelProcessor as any).createFactorProcessor(0.5, 128);
      const result = halfProcessor(200, 100, 50);

      expect(result[0]).toBe(164); // (200 - 128) * 0.5 + 128
      expect(result[1]).toBe(114); // (100 - 128) * 0.5 + 128
      expect(result[2]).toBe(89);  // (50 - 128) * 0.5 + 128
    });

    it('createLuminanceProcessor应该计算亮度', () => {
      const luminanceProcessor = (PixelProcessor as any).createLuminanceProcessor();
      const luminance = luminanceProcessor(255, 128, 64);

      // 使用标准亮度权重计算
      const expected = 255 * 0.2126 + 128 * 0.7152 + 64 * 0.0722;
      expect(luminance).toBeCloseTo(expected, 2);
    });

    it('createLuminanceProcessor应该支持自定义权重', () => {
      const customLuminanceProcessor = (PixelProcessor as any).createLuminanceProcessor(0.3, 0.6, 0.1);
      const luminance = customLuminanceProcessor(100, 150, 200);

      const expected = 100 * 0.3 + 150 * 0.6 + 200 * 0.1;
      expect(luminance).toBeCloseTo(expected, 2);
    });
  });

  describe('完整像素处理器测试', () => {
    let fullProcessor: TestFullPixelProcessor;

    beforeEach(() => {
      fullProcessor = new TestFullPixelProcessor();
    });

    it('应该使用完整像素处理器', async () => {
      const params: ContrastParameters = {
        type: FilterType.CONTRAST,
        enabled: true,
        contrast: 1.5
      };

      const result = await fullProcessor.apply(mockContext, params);

      expect(result.success).toBe(true);
      expect(result.processedImageData).toBeDefined();

      // 验证对比度调整
      const originalR = mockImageData.data[0];
      const expectedR = Math.max(0, Math.min(255, (originalR - 128) * 1.5 + 128));
      expect(result.processedImageData!.data[0]).toBe(expectedR);
    });
  });

  describe('性能测试', () => {
    it('应该在合理时间内处理大量像素', async () => {
      const largeImageData = new ImageData(200, 200);
      // 填充随机数据
      for (let i = 0; i < largeImageData.data.length; i++) {
        largeImageData.data[i] = Math.floor(Math.random() * 256);
      }

      const largeContext = {
        ...mockContext,
        sourceImageData: largeImageData,
        width: 200,
        height: 200
      };

      const params: BrightnessParameters = {
        type: FilterType.BRIGHTNESS,
        enabled: true,
        brightness: 25
      };

      const startTime = performance.now();
      const result = await processor.apply(largeContext, params);
      const endTime = performance.now();

      expect(result.success).toBe(true);
      expect(endTime - startTime).toBeLessThan(500); // 应该在500ms内完成
    });

    it('应该正确计算复杂度因子', () => {
      const params: BrightnessParameters = { type: FilterType.BRIGHTNESS, enabled: true, brightness: 0 };
      const complexity = processor['getComplexityFactor'](params);

      expect(complexity).toBe(1.2);
      expect(typeof complexity).toBe('number');
    });

    it('应该正确计算基础处理时间', () => {
      const baseTime = processor['getBaseProcessingTimePerPixel']();

      expect(baseTime).toBe(0.0012);
      expect(typeof baseTime).toBe('number');
    });
  });

  describe('错误处理', () => {
    it('应该处理无效上下文', async () => {
      const invalidContext = {
        ...mockContext,
        sourceImageData: null as any
      };

      const params = processor.getDefaultParameters();
      const result = await processor.apply(invalidContext, params);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('应该处理无效参数', async () => {
      const invalidParams = {
        type: FilterType.BRIGHTNESS as const,
        enabled: true,
        brightness: 'invalid'
      } as any;

      const result = await processor.apply(mockContext, invalidParams);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('应该处理处理过程中的错误', async () => {
      // 创建一个会抛出错误的处理器
      class ErrorProcessor extends TestPixelProcessor {
        protected getRGBProcessor(parameters: BrightnessParameters): RGBProcessorFunction {
          return (r, g, b) => {
            throw new Error('Processing error');
          };
        }
      }

      const errorProcessor = new ErrorProcessor();
      const params: BrightnessParameters = {
        type: FilterType.BRIGHTNESS,
        enabled: true,
        brightness: 0
      };

      const result = await errorProcessor.apply(mockContext, params);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Processing error');
    });
  });

  describe('边界值测试', () => {
    it('应该正确处理零尺寸图像', async () => {
      const emptyImageData = new ImageData(1, 1);
      const emptyContext = {
        ...mockContext,
        sourceImageData: emptyImageData,
        width: 1,
        height: 1
      };

      const params: BrightnessParameters = {
        type: FilterType.BRIGHTNESS,
        enabled: true,
        brightness: 100
      };

      const result = await processor.apply(emptyContext, params);

      expect(result.success).toBe(true);
      expect(result.processedImageData).toBeDefined();
    });

    it('应该处理极端亮度值', async () => {
      const extremeParams: BrightnessParameters = {
        type: FilterType.BRIGHTNESS,
        enabled: true,
        brightness: 100 // 最大有效值
      };

      const result = await processor.apply(mockContext, extremeParams);

      expect(result.success).toBe(true);
      expect(result.processedImageData).toBeDefined();

      // 所有像素应该被钳制到255
      const data = result.processedImageData!.data;
      for (let i = 0; i < data.length; i += 4) {
        expect(data[i]).toBeLessThanOrEqual(255);     // R
        expect(data[i + 1]).toBeLessThanOrEqual(255); // G
        expect(data[i + 2]).toBeLessThanOrEqual(255); // B
      }
    });

    it('应该处理负亮度值', async () => {
      const negativeParams: BrightnessParameters = {
        type: FilterType.BRIGHTNESS,
        enabled: true,
        brightness: -100 // 最小有效值
      };

      const result = await processor.apply(mockContext, negativeParams);

      expect(result.success).toBe(true);
      expect(result.processedImageData).toBeDefined();

      // 所有像素应该被钳制到0
      const data = result.processedImageData!.data;
      for (let i = 0; i < data.length; i += 4) {
        expect(data[i]).toBeGreaterThanOrEqual(0);     // R
        expect(data[i + 1]).toBeGreaterThanOrEqual(0); // G
        expect(data[i + 2]).toBeGreaterThanOrEqual(0); // B
      }
    });
  });
});