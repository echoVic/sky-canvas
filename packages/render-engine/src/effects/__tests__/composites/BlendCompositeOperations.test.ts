import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ColorBurnComposite, ColorDodgeComposite, CompositeConfig, CompositeOperation, DarkenComposite, DifferenceComposite, ExclusionComposite, HardLightComposite, LightenComposite, MultiplyComposite, OverlayComposite, ScreenComposite, SoftLightComposite } from '../../composites';


describe('BlendCompositeOperations', () => {
  let defaultConfig: CompositeConfig;
  let mockCanvas: HTMLCanvasElement;
  let mockContext: CanvasRenderingContext2D;

  beforeEach(() => {
    defaultConfig = {
      operation: CompositeOperation.MULTIPLY,
      globalAlpha: 1.0,
      enabled: true,
      preserveCanvas: false,
      clipToRegion: false
    };

    // 模拟 Canvas 和 Context
    mockContext = {
      save: vi.fn(),
      restore: vi.fn(),
      drawImage: vi.fn(),
      globalCompositeOperation: 'source-over',
      globalAlpha: 1.0,
      clearRect: vi.fn(),
      getImageData: vi.fn().mockReturnValue(new ImageData(100, 100)),
      putImageData: vi.fn(),
      createImageData: vi.fn().mockReturnValue(new ImageData(100, 100))
    } as unknown as CanvasRenderingContext2D;

    mockCanvas = {
      width: 100,
      height: 100,
      getContext: vi.fn().mockReturnValue(mockContext)
    } as unknown as HTMLCanvasElement;
  });

  describe('MultiplyComposite', () => {
    let multiplyComposite: MultiplyComposite;

    beforeEach(() => {
      multiplyComposite = new MultiplyComposite(defaultConfig);
    });

    it('应该正确初始化', () => {
      expect(multiplyComposite.operation).toBe(CompositeOperation.MULTIPLY);
      expect(multiplyComposite.config).toEqual(defaultConfig);
      expect(multiplyComposite.id).toBeDefined();
    });

    it('应该正确执行 multiply 混合', () => {
      const sourceCanvas = mockCanvas;
      
      expect(() => {
        multiplyComposite.apply(mockContext, sourceCanvas);
      }).not.toThrow();
      
      expect(mockContext.save).toHaveBeenCalled();
      expect(mockContext.restore).toHaveBeenCalled();
    });

    it('应该正确处理像素混合算法', () => {
      const imageData = new ImageData(2, 2);
      // 设置测试像素数据
      imageData.data[0] = 255; // R
      imageData.data[1] = 128; // G
      imageData.data[2] = 64;  // B
      imageData.data[3] = 255; // A
      
      const result = multiplyComposite.applyToImageData(imageData, imageData);
      
      expect(result).toBeInstanceOf(ImageData);
      expect(result.width).toBe(2);
      expect(result.height).toBe(2);
    });

    it('应该能够克隆', () => {
      const cloned = multiplyComposite.clone();
      
      expect(cloned).toBeInstanceOf(MultiplyComposite);
      expect(cloned.operation).toBe(multiplyComposite.operation);
      expect(cloned.config).toEqual(multiplyComposite.config);
      expect(cloned.id).not.toBe(multiplyComposite.id);
    });

    it('应该正确处理透明像素', () => {
      const dest = { r: 0.5, g: 0.5, b: 0.5, a: 1.0 };
      const src = { r: 0.8, g: 0.6, b: 0.4, a: 0.0 }; // 完全透明
      
      // 通过反射访问 protected 方法进行测试
      const compositePixel = (multiplyComposite as any).compositePixel;
      const result = compositePixel.call(multiplyComposite, dest, src);
      
      expect(result.a).toBe(1.0); // 应该保持目标透明度
    });
  });

  describe('ScreenComposite', () => {
    let screenComposite: ScreenComposite;

    beforeEach(() => {
      screenComposite = new ScreenComposite({
        ...defaultConfig,
        operation: CompositeOperation.SCREEN
      });
    });

    it('应该正确初始化', () => {
      expect(screenComposite.operation).toBe(CompositeOperation.SCREEN);
    });

    it('应该正确执行 screen 混合', () => {
      const dest = { r: 0.5, g: 0.5, b: 0.5, a: 1.0 };
      const src = { r: 0.5, g: 0.5, b: 0.5, a: 1.0 };
      
      const compositePixel = (screenComposite as any).compositePixel;
      const result = compositePixel.call(screenComposite, dest, src);
      
      // Screen 混合应该产生更亮的结果
      expect(result.r).toBeGreaterThan(0.5);
      expect(result.g).toBeGreaterThan(0.5);
      expect(result.b).toBeGreaterThan(0.5);
    });

    it('应该能够克隆', () => {
      const cloned = screenComposite.clone();
      expect(cloned).toBeInstanceOf(ScreenComposite);
    });
  });

  describe('OverlayComposite', () => {
    let overlayComposite: OverlayComposite;

    beforeEach(() => {
      overlayComposite = new OverlayComposite({
        ...defaultConfig,
        operation: CompositeOperation.OVERLAY
      });
    });

    it('应该正确初始化', () => {
      expect(overlayComposite.operation).toBe(CompositeOperation.OVERLAY);
    });

    it('应该正确执行 overlay 混合', () => {
      const dest = { r: 0.3, g: 0.7, b: 0.5, a: 1.0 };
      const src = { r: 0.6, g: 0.4, b: 0.8, a: 1.0 };
      
      const compositePixel = (overlayComposite as any).compositePixel;
      const result = compositePixel.call(overlayComposite, dest, src);
      
      expect(result.r).toBeGreaterThanOrEqual(0);
      expect(result.r).toBeLessThanOrEqual(1);
      expect(result.a).toBe(1.0);
    });

    it('应该能够克隆', () => {
      const cloned = overlayComposite.clone();
      expect(cloned).toBeInstanceOf(OverlayComposite);
    });
  });

  describe('DarkenComposite', () => {
    let darkenComposite: DarkenComposite;

    beforeEach(() => {
      darkenComposite = new DarkenComposite({
        ...defaultConfig,
        operation: CompositeOperation.DARKEN
      });
    });

    it('应该正确初始化', () => {
      expect(darkenComposite.operation).toBe(CompositeOperation.DARKEN);
    });

    it('应该选择较暗的颜色', () => {
      const dest = { r: 0.7, g: 0.3, b: 0.5, a: 1.0 };
      const src = { r: 0.4, g: 0.8, b: 0.6, a: 1.0 };
      
      const compositePixel = (darkenComposite as any).compositePixel;
      const result = compositePixel.call(darkenComposite, dest, src);
      
      // 应该选择较暗的值
      expect(result.r).toBeLessThanOrEqual(Math.min(dest.r, src.r));
      expect(result.g).toBeLessThanOrEqual(Math.min(dest.g, src.g));
    });

    it('应该能够克隆', () => {
      const cloned = darkenComposite.clone();
      expect(cloned).toBeInstanceOf(DarkenComposite);
    });
  });

  describe('LightenComposite', () => {
    let lightenComposite: LightenComposite;

    beforeEach(() => {
      lightenComposite = new LightenComposite({
        ...defaultConfig,
        operation: CompositeOperation.LIGHTEN
      });
    });

    it('应该正确初始化', () => {
      expect(lightenComposite.operation).toBe(CompositeOperation.LIGHTEN);
    });

    it('应该选择较亮的颜色', () => {
      const dest = { r: 0.3, g: 0.7, b: 0.5, a: 1.0 };
      const src = { r: 0.6, g: 0.4, b: 0.8, a: 1.0 };
      
      const compositePixel = (lightenComposite as any).compositePixel;
      const result = compositePixel.call(lightenComposite, dest, src);
      
      // 应该选择较亮的值
      expect(result.r).toBeGreaterThanOrEqual(Math.max(dest.r, src.r));
      expect(result.b).toBeGreaterThanOrEqual(Math.max(dest.b, src.b));
    });

    it('应该能够克隆', () => {
      const cloned = lightenComposite.clone();
      expect(cloned).toBeInstanceOf(LightenComposite);
    });
  });

  describe('ColorDodgeComposite', () => {
    let colorDodgeComposite: ColorDodgeComposite;

    beforeEach(() => {
      colorDodgeComposite = new ColorDodgeComposite({
        ...defaultConfig,
        operation: CompositeOperation.COLOR_DODGE
      });
    });

    it('应该正确初始化', () => {
      expect(colorDodgeComposite.operation).toBe(CompositeOperation.COLOR_DODGE);
    });

    it('应该正确执行 color dodge 混合', () => {
      const dest = { r: 0.5, g: 0.5, b: 0.5, a: 1.0 };
      const src = { r: 0.3, g: 0.7, b: 0.2, a: 1.0 };
      
      const compositePixel = (colorDodgeComposite as any).compositePixel;
      const result = compositePixel.call(colorDodgeComposite, dest, src);
      
      expect(result.r).toBeGreaterThanOrEqual(0);
      expect(result.r).toBeLessThanOrEqual(1);
      expect(result.a).toBe(1.0);
    });

    it('应该处理除零情况', () => {
      const dest = { r: 0.5, g: 0.5, b: 0.5, a: 1.0 };
      const src = { r: 1.0, g: 1.0, b: 1.0, a: 1.0 }; // 可能导致除零
      
      const compositePixel = (colorDodgeComposite as any).compositePixel;
      
      expect(() => {
        compositePixel.call(colorDodgeComposite, dest, src);
      }).not.toThrow();
    });

    it('应该能够克隆', () => {
      const cloned = colorDodgeComposite.clone();
      expect(cloned).toBeInstanceOf(ColorDodgeComposite);
    });
  });

  describe('ColorBurnComposite', () => {
    let colorBurnComposite: ColorBurnComposite;

    beforeEach(() => {
      colorBurnComposite = new ColorBurnComposite({
        ...defaultConfig,
        operation: CompositeOperation.COLOR_BURN
      });
    });

    it('应该正确初始化', () => {
      expect(colorBurnComposite.operation).toBe(CompositeOperation.COLOR_BURN);
    });

    it('应该正确执行 color burn 混合', () => {
      const dest = { r: 0.8, g: 0.6, b: 0.4, a: 1.0 };
      const src = { r: 0.3, g: 0.7, b: 0.9, a: 1.0 };
      
      const compositePixel = (colorBurnComposite as any).compositePixel;
      const result = compositePixel.call(colorBurnComposite, dest, src);
      
      expect(result.r).toBeGreaterThanOrEqual(0);
      expect(result.r).toBeLessThanOrEqual(1);
      expect(result.a).toBe(1.0);
    });

    it('应该处理除零情况', () => {
      const dest = { r: 0.5, g: 0.5, b: 0.5, a: 1.0 };
      const src = { r: 0.0, g: 0.0, b: 0.0, a: 1.0 }; // 可能导致除零
      
      const compositePixel = (colorBurnComposite as any).compositePixel;
      
      expect(() => {
        compositePixel.call(colorBurnComposite, dest, src);
      }).not.toThrow();
    });

    it('应该能够克隆', () => {
      const cloned = colorBurnComposite.clone();
      expect(cloned).toBeInstanceOf(ColorBurnComposite);
    });
  });

  describe('HardLightComposite', () => {
    let hardLightComposite: HardLightComposite;

    beforeEach(() => {
      hardLightComposite = new HardLightComposite({
        ...defaultConfig,
        operation: CompositeOperation.HARD_LIGHT
      });
    });

    it('应该正确初始化', () => {
      expect(hardLightComposite.operation).toBe(CompositeOperation.HARD_LIGHT);
    });

    it('应该正确执行 hard light 混合', () => {
      const dest = { r: 0.3, g: 0.7, b: 0.5, a: 1.0 };
      const src = { r: 0.6, g: 0.4, b: 0.8, a: 1.0 };
      
      const compositePixel = (hardLightComposite as any).compositePixel;
      const result = compositePixel.call(hardLightComposite, dest, src);
      
      expect(result.r).toBeGreaterThanOrEqual(0);
      expect(result.r).toBeLessThanOrEqual(1);
      expect(result.a).toBe(1.0);
    });

    it('应该能够克隆', () => {
      const cloned = hardLightComposite.clone();
      expect(cloned).toBeInstanceOf(HardLightComposite);
    });
  });

  describe('SoftLightComposite', () => {
    let softLightComposite: SoftLightComposite;

    beforeEach(() => {
      softLightComposite = new SoftLightComposite({
        ...defaultConfig,
        operation: CompositeOperation.SOFT_LIGHT
      });
    });

    it('应该正确初始化', () => {
      expect(softLightComposite.operation).toBe(CompositeOperation.SOFT_LIGHT);
    });

    it('应该正确执行 soft light 混合', () => {
      const dest = { r: 0.4, g: 0.6, b: 0.8, a: 1.0 };
      const src = { r: 0.7, g: 0.3, b: 0.5, a: 1.0 };
      
      const compositePixel = (softLightComposite as any).compositePixel;
      const result = compositePixel.call(softLightComposite, dest, src);
      
      expect(result.r).toBeGreaterThanOrEqual(0);
      expect(result.r).toBeLessThanOrEqual(1);
      expect(result.a).toBe(1.0);
    });

    it('应该能够克隆', () => {
      const cloned = softLightComposite.clone();
      expect(cloned).toBeInstanceOf(SoftLightComposite);
    });
  });

  describe('DifferenceComposite', () => {
    let differenceComposite: DifferenceComposite;

    beforeEach(() => {
      differenceComposite = new DifferenceComposite({
        ...defaultConfig,
        operation: CompositeOperation.DIFFERENCE
      });
    });

    it('应该正确初始化', () => {
      expect(differenceComposite.operation).toBe(CompositeOperation.DIFFERENCE);
    });

    it('应该正确计算颜色差值', () => {
      const dest = { r: 0.8, g: 0.3, b: 0.6, a: 1.0 };
      const src = { r: 0.2, g: 0.7, b: 0.4, a: 1.0 };
      
      const compositePixel = (differenceComposite as any).compositePixel;
      const result = compositePixel.call(differenceComposite, dest, src);
      
      // Difference 应该计算绝对差值
      expect(result.r).toBeCloseTo(Math.abs(dest.r - src.r), 2);
      expect(result.g).toBeCloseTo(Math.abs(dest.g - src.g), 2);
      expect(result.b).toBeCloseTo(Math.abs(dest.b - src.b), 2);
    });

    it('相同颜色应该产生黑色', () => {
      const color = { r: 0.5, g: 0.5, b: 0.5, a: 1.0 };
      
      const compositePixel = (differenceComposite as any).compositePixel;
      const result = compositePixel.call(differenceComposite, color, color);
      
      expect(result.r).toBeCloseTo(0, 2);
      expect(result.g).toBeCloseTo(0, 2);
      expect(result.b).toBeCloseTo(0, 2);
    });

    it('应该能够克隆', () => {
      const cloned = differenceComposite.clone();
      expect(cloned).toBeInstanceOf(DifferenceComposite);
    });
  });

  describe('ExclusionComposite', () => {
    let exclusionComposite: ExclusionComposite;

    beforeEach(() => {
      exclusionComposite = new ExclusionComposite({
        ...defaultConfig,
        operation: CompositeOperation.EXCLUSION
      });
    });

    it('应该正确初始化', () => {
      expect(exclusionComposite.operation).toBe(CompositeOperation.EXCLUSION);
    });

    it('应该正确执行 exclusion 混合', () => {
      const dest = { r: 0.6, g: 0.4, b: 0.8, a: 1.0 };
      const src = { r: 0.3, g: 0.7, b: 0.2, a: 1.0 };
      
      const compositePixel = (exclusionComposite as any).compositePixel;
      const result = compositePixel.call(exclusionComposite, dest, src);
      
      expect(result.r).toBeGreaterThanOrEqual(0);
      expect(result.r).toBeLessThanOrEqual(1);
      expect(result.a).toBe(1.0);
    });

    it('相同颜色应该产生中性灰', () => {
      const color = { r: 0.5, g: 0.5, b: 0.5, a: 1.0 };
      
      const compositePixel = (exclusionComposite as any).compositePixel;
      const result = compositePixel.call(exclusionComposite, color, color);
      
      // Exclusion 的相同颜色应该产生中性结果
      expect(result.r).toBeCloseTo(0.5, 1);
      expect(result.g).toBeCloseTo(0.5, 1);
      expect(result.b).toBeCloseTo(0.5, 1);
    });

    it('应该能够克隆', () => {
      const cloned = exclusionComposite.clone();
      expect(cloned).toBeInstanceOf(ExclusionComposite);
    });
  });

  describe('通用测试', () => {
    const compositeClasses = [
      { Class: MultiplyComposite, operation: CompositeOperation.MULTIPLY },
      { Class: ScreenComposite, operation: CompositeOperation.SCREEN },
      { Class: OverlayComposite, operation: CompositeOperation.OVERLAY },
      { Class: DarkenComposite, operation: CompositeOperation.DARKEN },
      { Class: LightenComposite, operation: CompositeOperation.LIGHTEN },
      { Class: ColorDodgeComposite, operation: CompositeOperation.COLOR_DODGE },
      { Class: ColorBurnComposite, operation: CompositeOperation.COLOR_BURN },
      { Class: HardLightComposite, operation: CompositeOperation.HARD_LIGHT },
      { Class: SoftLightComposite, operation: CompositeOperation.SOFT_LIGHT },
      { Class: DifferenceComposite, operation: CompositeOperation.DIFFERENCE },
      { Class: ExclusionComposite, operation: CompositeOperation.EXCLUSION }
    ];

    compositeClasses.forEach(({ Class, operation }) => {
      describe(`${Class.name}`, () => {
        it('应该正确处理边界值', () => {
          const config = { ...defaultConfig, operation };
          const composite = new Class(config);
          
          const blackPixel = { r: 0, g: 0, b: 0, a: 1 };
          const whitePixel = { r: 1, g: 1, b: 1, a: 1 };
          const transparentPixel = { r: 0.5, g: 0.5, b: 0.5, a: 0 };
          
          const compositePixel = (composite as any).compositePixel;
          
          expect(() => {
            compositePixel.call(composite, blackPixel, whitePixel);
            compositePixel.call(composite, whitePixel, blackPixel);
            compositePixel.call(composite, blackPixel, transparentPixel);
            compositePixel.call(composite, transparentPixel, whitePixel);
          }).not.toThrow();
        });

        it('应该正确处理配置更新', () => {
          const config = { ...defaultConfig, operation };
          const composite = new Class(config);
          
          const newConfig = { ...config, globalAlpha: 0.5 };
          composite.updateConfig(newConfig);
          
          expect(composite.config.globalAlpha).toBe(0.5);
        });

        it('应该正确清理资源', () => {
          const config = { ...defaultConfig, operation };
          const composite = new Class(config);
          
          expect(() => composite.dispose()).not.toThrow();
        });
      });
    });
  });

  describe('性能测试', () => {
    it('像素混合操作应该高效执行', () => {
      const multiplyComposite = new MultiplyComposite(defaultConfig);
      const compositePixel = (multiplyComposite as any).compositePixel;
      
      const dest = { r: 0.5, g: 0.5, b: 0.5, a: 1.0 };
      const src = { r: 0.8, g: 0.6, b: 0.4, a: 0.8 };
      
      const startTime = performance.now();
      
      // 执行大量像素混合操作
      for (let i = 0; i < 10000; i++) {
        compositePixel.call(multiplyComposite, dest, src);
      }
      
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      // 10000 次像素混合应该在 100ms 内完成
      expect(duration).toBeLessThan(100);
    });

    it('ImageData 处理应该高效执行', () => {
      const screenComposite = new ScreenComposite({
        ...defaultConfig,
        operation: CompositeOperation.SCREEN
      });
      
      const imageData = new ImageData(50, 50);
      
      const startTime = performance.now();
      
      for (let i = 0; i < 10; i++) {
        screenComposite.applyToImageData(imageData, imageData);
      }
      
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      // 10 次 ImageData 处理应该在 500ms 内完成
      expect(duration).toBeLessThan(500);
    });
  });
});