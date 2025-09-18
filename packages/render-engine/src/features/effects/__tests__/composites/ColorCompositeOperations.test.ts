/**
 * ColorCompositeOperations 单元测试
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ColorComposite, CompositeConfig, CompositeOperation, HueComposite, LuminosityComposite, SaturationComposite } from '../../composites';


// Mock Canvas API
const mockCanvas = document.createElement('canvas');
const mockCtx = {
  save: vi.fn(),
  restore: vi.fn(),
  drawImage: vi.fn(),
  globalCompositeOperation: 'source-over',
  globalAlpha: 1.0
} as any;

Object.defineProperty(HTMLCanvasElement.prototype, 'getContext', {
  value: vi.fn().mockReturnValue(mockCtx),
  writable: true
});

describe('ColorCompositeOperations', () => {
  const mockConfig: CompositeConfig = {
    operation: CompositeOperation.SOURCE_OVER,
    enabled: true,
    globalAlpha: 1.0
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockCtx.save.mockClear();
    mockCtx.restore.mockClear();
    mockCtx.drawImage.mockClear();
  });

  describe('HueComposite', () => {
    let hueComposite: HueComposite;

    beforeEach(() => {
      hueComposite = new HueComposite(mockConfig);
    });

    it('应该正确初始化', () => {
      expect(hueComposite.operation).toBe(CompositeOperation.HUE);
      expect(hueComposite.config).toEqual(mockConfig);
      expect(hueComposite.id).toBeDefined();
    });

    it('应该正确应用色相复合', () => {
      const dest = { r: 0.5, g: 0.3, b: 0.8, a: 1.0 }; // 紫色调
      const src = { r: 1.0, g: 0.0, b: 0.0, a: 1.0 }; // 纯红色

      const result = (hueComposite as any).compositePixel(dest, src);

      // 应该保持目标的饱和度和亮度，使用源的色相
      expect(result.r).toBeGreaterThan(0);
      expect(result.g).toBeGreaterThan(0);
      expect(result.b).toBeGreaterThan(0);
      expect(result.a).toBeDefined();
    });

    it('应该正确处理RGB到HSL的转换', () => {
      const rgbToHsl = (hueComposite as any).rgbToHsl.bind(hueComposite);

      // 测试纯红色
      const redColor = { r: 1, g: 0, b: 0, a: 1 };
      const redHsl = rgbToHsl(redColor);
      expect(redHsl.h).toBe(0);
      expect(redHsl.s).toBe(1);
      expect(redHsl.l).toBe(0.5);

      // 测试纯绿色
      const greenColor = { r: 0, g: 1, b: 0, a: 1 };
      const greenHsl = rgbToHsl(greenColor);
      expect(greenHsl.h).toBeCloseTo(1/3, 2);
      expect(greenHsl.s).toBe(1);
      expect(greenHsl.l).toBe(0.5);

      // 测试纯蓝色
      const blueColor = { r: 0, g: 0, b: 1, a: 1 };
      const blueHsl = rgbToHsl(blueColor);
      expect(blueHsl.h).toBeCloseTo(2/3, 2);
      expect(blueHsl.s).toBe(1);
      expect(blueHsl.l).toBe(0.5);

      // 测试灰色
      const grayColor = { r: 0.5, g: 0.5, b: 0.5, a: 1 };
      const grayHsl = rgbToHsl(grayColor);
      expect(grayHsl.h).toBe(0);
      expect(grayHsl.s).toBe(0);
      expect(grayHsl.l).toBe(0.5);
    });

    it('应该正确处理HSL到RGB的转换', () => {
      const hslToRgb = (hueComposite as any).hslToRgb.bind(hueComposite);

      // 测试纯红色
      const redRgb = hslToRgb(0, 1, 0.5);
      expect(redRgb.r).toBe(255);
      expect(redRgb.g).toBe(0);
      expect(redRgb.b).toBe(0);

      // 测试纯绿色
      const greenRgb = hslToRgb(1/3, 1, 0.5);
      expect(greenRgb.r).toBeCloseTo(0, 0);
      expect(greenRgb.g).toBe(255);
      expect(greenRgb.b).toBeCloseTo(0, 0);

      // 测试灰色
      const grayRgb = hslToRgb(0, 0, 0.5);
      expect(grayRgb.r).toBeCloseTo(127, 0);
      expect(grayRgb.g).toBeCloseTo(127, 0);
      expect(grayRgb.b).toBeCloseTo(127, 0);
    });

    it('应该能正确克隆', () => {
      const cloned = hueComposite.clone();

      expect(cloned).not.toBe(hueComposite);
      expect(cloned.operation).toBe(hueComposite.operation);
      expect(cloned.config).toEqual(hueComposite.config);
      expect(cloned).toBeInstanceOf(HueComposite);
    });

    it('应该正确应用到Canvas', () => {
      hueComposite.apply(mockCtx, mockCanvas);

      expect(mockCtx.save).toHaveBeenCalled();
      expect(mockCtx.restore).toHaveBeenCalled();
      expect(mockCtx.globalCompositeOperation).toBe(CompositeOperation.HUE);
      expect(mockCtx.globalAlpha).toBe(1.0);
      expect(mockCtx.drawImage).toHaveBeenCalledWith(mockCanvas, 0, 0);
    });
  });

  describe('SaturationComposite', () => {
    let saturationComposite: SaturationComposite;

    beforeEach(() => {
      saturationComposite = new SaturationComposite(mockConfig);
    });

    it('应该正确初始化', () => {
      expect(saturationComposite.operation).toBe(CompositeOperation.SATURATION);
      expect(saturationComposite.config).toEqual(mockConfig);
      expect(saturationComposite.id).toBeDefined();
    });

    it('应该正确应用饱和度复合', () => {
      const dest = { r: 0.8, g: 0.2, b: 0.2, a: 1.0 }; // 红色调，高饱和度
      const src = { r: 0.9, g: 0.9, b: 0.9, a: 1.0 }; // 低饱和度灰色

      const result = (saturationComposite as any).compositePixel(dest, src);

      // 应该保持目标的色相和亮度，使用源的饱和度
      expect(result.r).toBeGreaterThan(0);
      expect(result.g).toBeGreaterThan(0);
      expect(result.b).toBeGreaterThan(0);
      expect(result.a).toBeDefined();
    });

    it('应该能正确克隆', () => {
      const cloned = saturationComposite.clone();

      expect(cloned).not.toBe(saturationComposite);
      expect(cloned.operation).toBe(saturationComposite.operation);
      expect(cloned.config).toEqual(saturationComposite.config);
      expect(cloned).toBeInstanceOf(SaturationComposite);
    });
  });

  describe('ColorComposite', () => {
    let colorComposite: ColorComposite;

    beforeEach(() => {
      colorComposite = new ColorComposite(mockConfig);
    });

    it('应该正确初始化', () => {
      expect(colorComposite.operation).toBe(CompositeOperation.COLOR);
      expect(colorComposite.config).toEqual(mockConfig);
      expect(colorComposite.id).toBeDefined();
    });

    it('应该正确应用颜色复合', () => {
      const dest = { r: 0.8, g: 0.8, b: 0.8, a: 1.0 }; // 高亮度灰色
      const src = { r: 1.0, g: 0.5, b: 0.0, a: 1.0 }; // 橙色

      const result = (colorComposite as any).compositePixel(dest, src);

      // 应该保持目标的亮度，使用源的色相和饱和度
      expect(result.r).toBeGreaterThan(0);
      expect(result.g).toBeGreaterThan(0);
      expect(result.b).toBeGreaterThan(0);
      expect(result.a).toBeDefined();
    });

    it('应该能正确克隆', () => {
      const cloned = colorComposite.clone();

      expect(cloned).not.toBe(colorComposite);
      expect(cloned.operation).toBe(colorComposite.operation);
      expect(cloned.config).toEqual(colorComposite.config);
      expect(cloned).toBeInstanceOf(ColorComposite);
    });
  });

  describe('LuminosityComposite', () => {
    let luminosityComposite: LuminosityComposite;

    beforeEach(() => {
      luminosityComposite = new LuminosityComposite(mockConfig);
    });

    it('应该正确初始化', () => {
      expect(luminosityComposite.operation).toBe(CompositeOperation.LUMINOSITY);
      expect(luminosityComposite.config).toEqual(mockConfig);
      expect(luminosityComposite.id).toBeDefined();
    });

    it('应该正确应用亮度复合', () => {
      const dest = { r: 1.0, g: 0.0, b: 0.0, a: 1.0 }; // 纯红色
      const src = { r: 0.9, g: 0.9, b: 0.9, a: 1.0 }; // 高亮度灰色

      const result = (luminosityComposite as any).compositePixel(dest, src);

      // 应该保持目标的色相和饱和度，使用源的亮度
      expect(result.r).toBeGreaterThan(0);
      expect(result.g).toBeGreaterThan(0);
      expect(result.b).toBeGreaterThan(0);
      expect(result.a).toBeDefined();
    });

    it('应该能正确克隆', () => {
      const cloned = luminosityComposite.clone();

      expect(cloned).not.toBe(luminosityComposite);
      expect(cloned.operation).toBe(luminosityComposite.operation);
      expect(cloned.config).toEqual(luminosityComposite.config);
      expect(cloned).toBeInstanceOf(LuminosityComposite);
    });
  });

  describe('共同功能测试', () => {
    const operations = [
      { name: 'HueComposite', class: HueComposite, operation: CompositeOperation.HUE },
      { name: 'SaturationComposite', class: SaturationComposite, operation: CompositeOperation.SATURATION },
      { name: 'ColorComposite', class: ColorComposite, operation: CompositeOperation.COLOR },
      { name: 'LuminosityComposite', class: LuminosityComposite, operation: CompositeOperation.LUMINOSITY }
    ];

    operations.forEach(({ name, class: OperationClass, operation }) => {
      describe(`${name} 共同功能`, () => {
        let composite: any;

        beforeEach(() => {
          composite = new OperationClass(mockConfig);
        });

        it('应该正确处理禁用状态', () => {
          const disabledConfig: CompositeConfig = {
            operation: CompositeOperation.SOURCE_OVER,
            enabled: false,
            globalAlpha: 0.5
          };

          composite.updateConfig(disabledConfig);
          composite.apply(mockCtx, mockCanvas);

          // 当禁用时，不应该修改上下文
          expect(mockCtx.save).not.toHaveBeenCalled();
        });

        it('应该正确处理透明度', () => {
          const alphaConfig: CompositeConfig = {
            operation: CompositeOperation.SOURCE_OVER,
            enabled: true,
            globalAlpha: 0.5
          };

          composite.updateConfig(alphaConfig);
          composite.apply(mockCtx, mockCanvas);

          expect(mockCtx.globalAlpha).toBe(0.5);
        });

        it('应该正确处理边界区域渲染', () => {
          const bounds = { x: 10, y: 20, width: 100, height: 200 };

          composite.apply(mockCtx, mockCanvas, bounds);

          expect(mockCtx.drawImage).toHaveBeenCalledWith(
            mockCanvas,
            bounds.x,
            bounds.y,
            bounds.width,
            bounds.height,
            bounds.x,
            bounds.y,
            bounds.width,
            bounds.height
          );
        });

        it('应该正确处理ImageData操作', () => {
          const sourceData = new ImageData(100, 100);
          const destData = new ImageData(100, 100);

          // 设置一些测试数据
          for (let i = 0; i < sourceData.data.length; i += 4) {
            sourceData.data[i] = 255;     // R
            sourceData.data[i + 1] = 128; // G
            sourceData.data[i + 2] = 64;  // B
            sourceData.data[i + 3] = 255; // A
          }

          for (let i = 0; i < destData.data.length; i += 4) {
            destData.data[i] = 128;     // R
            destData.data[i + 1] = 64;  // G
            destData.data[i + 2] = 255; // B
            destData.data[i + 3] = 255; // A
          }

          const result = composite.applyToImageData(destData, sourceData);

          expect(result).toBeDefined();
          expect(result.width).toBe(destData.width);
          expect(result.height).toBe(destData.height);
          expect(result.data.length).toBe(destData.data.length);
        });

        it('应该正确处理配置更新', () => {
          const newConfig: Partial<CompositeConfig> = {
            globalAlpha: 0.3
          };

          composite.updateConfig(newConfig);

          expect(composite.config.globalAlpha).toBe(0.3);
          expect(composite.config.enabled).toBe(mockConfig.enabled);
        });

        it('应该正确处理异常输入', () => {
          const invalidDest = { r: -1, g: 2, b: 0.5, a: 0.5 };
          const invalidSrc = { r: 0.5, g: 0.5, b: -1, a: 2 };

          expect(() => {
            composite.compositePixel(invalidDest, invalidSrc);
          }).not.toThrow();
        });

        it('应该具有唯一ID', () => {
          const composite1 = new OperationClass(mockConfig);
          const composite2 = new OperationClass(mockConfig);

          expect(composite1.id).not.toBe(composite2.id);
          expect(composite1.id).toContain('composite');
        });

        it('应该正确释放资源', () => {
          expect(() => {
            composite.dispose();
          }).not.toThrow();
        });
      });
    });
  });

  describe('性能测试', () => {
    it('应该在合理时间内处理大量像素', () => {
      const hueComposite = new HueComposite(mockConfig);
      const startTime = performance.now();

      // 测试10000次像素复合操作
      for (let i = 0; i < 10000; i++) {
        const dest = { r: Math.random(), g: Math.random(), b: Math.random(), a: 1.0 };
        const src = { r: Math.random(), g: Math.random(), b: Math.random(), a: 1.0 };
        (hueComposite as any).compositePixel(dest, src);
      }

      const endTime = performance.now();
      const duration = endTime - startTime;

      // 应该在200ms内完成
      expect(duration).toBeLessThan(200);
    });

    it('应该在合理时间内处理ImageData', () => {
      const colorComposite = new ColorComposite(mockConfig);
      const imageData1 = new ImageData(100, 100);
      const imageData2 = new ImageData(100, 100);

      // 初始化测试数据
      for (let i = 0; i < imageData1.data.length; i++) {
        imageData1.data[i] = Math.floor(Math.random() * 256);
        imageData2.data[i] = Math.floor(Math.random() * 256);
      }

      const startTime = performance.now();
      colorComposite.applyToImageData(imageData1, imageData2);
      const endTime = performance.now();
      const duration = endTime - startTime;

      // 处理100x100图像应该在100ms内完成
      expect(duration).toBeLessThan(100);
    });
  });

  describe('颜色空间转换精度测试', () => {
    it('RGB到HSL再到RGB应该保持一致性', () => {
      const hueComposite = new HueComposite(mockConfig);
      const rgbToHsl = (hueComposite as any).rgbToHsl.bind(hueComposite);
      const hslToRgb = (hueComposite as any).hslToRgb.bind(hueComposite);

      const testColors = [
        { r: 1, g: 0, b: 0, a: 1 },     // 纯红
        { r: 0, g: 1, b: 0, a: 1 },     // 纯绿
        { r: 0, g: 0, b: 1, a: 1 },     // 纯蓝
        { r: 1, g: 1, b: 0, a: 1 },     // 黄色
        { r: 1, g: 0, b: 1, a: 1 },     // 洋红
        { r: 0, g: 1, b: 1, a: 1 },     // 青色
        { r: 0.5, g: 0.5, b: 0.5, a: 1 }, // 灰色
      ];

      testColors.forEach(originalColor => {
        const hsl = rgbToHsl(originalColor);
        const convertedRgb = hslToRgb(hsl.h, hsl.s, hsl.l);

        expect(convertedRgb.r).toBeCloseTo(originalColor.r * 255, 0);
        expect(convertedRgb.g).toBeCloseTo(originalColor.g * 255, 0);
        expect(convertedRgb.b).toBeCloseTo(originalColor.b * 255, 0);
      });
    });
  });
});