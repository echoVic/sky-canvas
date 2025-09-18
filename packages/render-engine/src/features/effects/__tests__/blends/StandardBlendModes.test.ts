import { beforeEach, describe, expect, it } from 'vitest';
import { BlendColor, BlendMode, BlendModeConfig, HardLightBlend, MultiplyBlend, NormalBlend, OverlayBlend, ScreenBlend, SoftLightBlend } from '../../blends';

describe('StandardBlendModes', () => {
  let defaultConfig: BlendModeConfig;
  let whiteColor: BlendColor;
  let blackColor: BlendColor;
  let redColor: BlendColor;
  let blueColor: BlendColor;
  let grayColor: BlendColor;

  beforeEach(() => {
    defaultConfig = {
      mode: BlendMode.NORMAL,
      enabled: true,
      opacity: 1.0,
      preserveAlpha: false
    };

    whiteColor = { r: 255, g: 255, b: 255, a: 255 };
    blackColor = { r: 0, g: 0, b: 0, a: 255 };
    redColor = { r: 255, g: 0, b: 0, a: 255 };
    blueColor = { r: 0, g: 0, b: 255, a: 255 };
    grayColor = { r: 128, g: 128, b: 128, a: 255 };
  });

  describe('NormalBlend', () => {
    let normalBlend: NormalBlend;

    beforeEach(() => {
      normalBlend = new NormalBlend({ ...defaultConfig, mode: BlendMode.NORMAL });
    });

    it('应该正确初始化', () => {
      expect(normalBlend.mode).toBe(BlendMode.NORMAL);
      expect(normalBlend.config.mode).toBe(BlendMode.NORMAL);
    });

    it('应该返回叠加颜色', () => {
      const result = normalBlend.apply(redColor, blueColor);
      expect(result).toEqual(blueColor);
    });

    it('应该正确处理透明度', () => {
      const transparentBlue = { ...blueColor, a: 128 };
      const result = normalBlend.apply(redColor, transparentBlue);
      expect(result).toEqual(transparentBlue);
    });

    it('clone 应该创建新实例', () => {
      const cloned = normalBlend.clone();
      expect(cloned).toBeInstanceOf(NormalBlend);
      expect(cloned.mode).toBe(normalBlend.mode);
      expect(cloned.id).not.toBe(normalBlend.id);
    });
  });

  describe('MultiplyBlend', () => {
    let multiplyBlend: MultiplyBlend;

    beforeEach(() => {
      multiplyBlend = new MultiplyBlend({ ...defaultConfig, mode: BlendMode.MULTIPLY });
    });

    it('应该正确初始化', () => {
      expect(multiplyBlend.mode).toBe(BlendMode.MULTIPLY);
    });

    it('白色与任何颜色相乘应该返回该颜色', () => {
      const result = multiplyBlend.apply(whiteColor, redColor);
      expect(result.r).toBe(redColor.r);
      expect(result.g).toBe(redColor.g);
      expect(result.b).toBe(redColor.b);
    });

    it('黑色与任何颜色相乘应该返回黑色', () => {
      const result = multiplyBlend.apply(blackColor, redColor);
      expect(result.r).toBe(0);
      expect(result.g).toBe(0);
      expect(result.b).toBe(0);
    });

    it('灰色与自身相乘应该变暗', () => {
      const result = multiplyBlend.apply(grayColor, grayColor);
      expect(result.r).toBeLessThan(grayColor.r);
      expect(result.g).toBeLessThan(grayColor.g);
      expect(result.b).toBeLessThan(grayColor.b);
    });

    it('应该保持叠加颜色的透明度', () => {
      const result = multiplyBlend.apply(redColor, blueColor);
      expect(result.a).toBe(blueColor.a);
    });

    it('clone 应该创建新实例', () => {
      const cloned = multiplyBlend.clone();
      expect(cloned).toBeInstanceOf(MultiplyBlend);
      expect(cloned.mode).toBe(multiplyBlend.mode);
    });
  });

  describe('ScreenBlend', () => {
    let screenBlend: ScreenBlend;

    beforeEach(() => {
      screenBlend = new ScreenBlend({ ...defaultConfig, mode: BlendMode.SCREEN });
    });

    it('应该正确初始化', () => {
      expect(screenBlend.mode).toBe(BlendMode.SCREEN);
    });

    it('黑色与任何颜色 screen 应该返回该颜色', () => {
      const result = screenBlend.apply(blackColor, redColor);
      expect(result.r).toBe(redColor.r);
      expect(result.g).toBe(redColor.g);
      expect(result.b).toBe(redColor.b);
    });

    it('白色与任何颜色 screen 应该返回白色', () => {
      const result = screenBlend.apply(whiteColor, redColor);
      expect(result.r).toBe(255);
      expect(result.g).toBe(255);
      expect(result.b).toBe(255);
    });

    it('灰色与自身 screen 应该变亮', () => {
      const result = screenBlend.apply(grayColor, grayColor);
      expect(result.r).toBeGreaterThan(grayColor.r);
      expect(result.g).toBeGreaterThan(grayColor.g);
      expect(result.b).toBeGreaterThan(grayColor.b);
    });

    it('应该保持叠加颜色的透明度', () => {
      const result = screenBlend.apply(redColor, blueColor);
      expect(result.a).toBe(blueColor.a);
    });

    it('clone 应该创建新实例', () => {
      const cloned = screenBlend.clone();
      expect(cloned).toBeInstanceOf(ScreenBlend);
      expect(cloned.mode).toBe(screenBlend.mode);
    });
  });

  describe('OverlayBlend', () => {
    let overlayBlend: OverlayBlend;

    beforeEach(() => {
      overlayBlend = new OverlayBlend({ ...defaultConfig, mode: BlendMode.OVERLAY });
    });

    it('应该正确初始化', () => {
      expect(overlayBlend.mode).toBe(BlendMode.OVERLAY);
    });

    it('50% 灰色与任何颜色 overlay 应该返回该颜色', () => {
      const midGray = { r: 128, g: 128, b: 128, a: 255 };
      const result = overlayBlend.apply(redColor, midGray);
      // Overlay 在 50% 灰色时应该接近原色
      expect(result.r).toBeCloseTo(redColor.r, -1);
    });

    it('应该正确处理亮色和暗色', () => {
      // 亮色基础应该使用 screen 模式
      const lightResult = overlayBlend.apply(whiteColor, grayColor);
      expect(lightResult.r).toBeGreaterThan(grayColor.r);
      
      // 暗色基础应该使用 multiply 模式
      const darkResult = overlayBlend.apply(blackColor, grayColor);
      expect(darkResult.r).toBeLessThan(grayColor.r);
    });

    it('clone 应该创建新实例', () => {
      const cloned = overlayBlend.clone();
      expect(cloned).toBeInstanceOf(OverlayBlend);
      expect(cloned.mode).toBe(overlayBlend.mode);
    });
  });

  describe('SoftLightBlend', () => {
    let softLightBlend: SoftLightBlend;

    beforeEach(() => {
      softLightBlend = new SoftLightBlend({ ...defaultConfig, mode: BlendMode.SOFT_LIGHT });
    });

    it('应该正确初始化', () => {
      expect(softLightBlend.mode).toBe(BlendMode.SOFT_LIGHT);
    });

    it('应该产生比 overlay 更柔和的效果', () => {
      const overlayBlend = new OverlayBlend({ ...defaultConfig, mode: BlendMode.OVERLAY });
      
      const softResult = softLightBlend.apply(grayColor, whiteColor);
      const overlayResult = overlayBlend.apply(grayColor, whiteColor);
      
      // Soft light 应该产生更柔和的效果
      expect(Math.abs(softResult.r - grayColor.r)).toBeLessThan(Math.abs(overlayResult.r - grayColor.r));
    });

    it('50% 灰色叠加应该保持基础颜色', () => {
      const midGray = { r: 128, g: 128, b: 128, a: 255 };
      const result = softLightBlend.apply(redColor, midGray);
      // 应该接近原始颜色
      expect(Math.abs(result.r - redColor.r)).toBeLessThan(50);
    });

    it('clone 应该创建新实例', () => {
      const cloned = softLightBlend.clone();
      expect(cloned).toBeInstanceOf(SoftLightBlend);
      expect(cloned.mode).toBe(softLightBlend.mode);
    });
  });

  describe('HardLightBlend', () => {
    let hardLightBlend: HardLightBlend;

    beforeEach(() => {
      hardLightBlend = new HardLightBlend({ ...defaultConfig, mode: BlendMode.HARD_LIGHT });
    });

    it('应该正确初始化', () => {
      expect(hardLightBlend.mode).toBe(BlendMode.HARD_LIGHT);
    });

    it('应该根据叠加颜色选择 multiply 或 screen', () => {
      // 暗色叠加应该使用 multiply
      const darkResult = hardLightBlend.apply(grayColor, blackColor);
      expect(darkResult.r).toBeLessThan(grayColor.r);
      
      // 亮色叠加应该使用 screen
      const lightResult = hardLightBlend.apply(grayColor, whiteColor);
      expect(lightResult.r).toBeGreaterThan(grayColor.r);
    });

    it('50% 灰色叠加应该保持基础颜色', () => {
      const midGray = { r: 128, g: 128, b: 128, a: 255 };
      const result = hardLightBlend.apply(redColor, midGray);
      // Hard light 在 50% 灰色时应该接近原色
      expect(Math.abs(result.r - redColor.r)).toBeLessThan(30);
    });

    it('clone 应该创建新实例', () => {
      const cloned = hardLightBlend.clone();
      expect(cloned).toBeInstanceOf(HardLightBlend);
      expect(cloned.mode).toBe(hardLightBlend.mode);
    });
  });

  describe('边界值测试', () => {
    it('所有混合模式都应该处理极值', () => {
      const blends = [
        new NormalBlend({ ...defaultConfig, mode: BlendMode.NORMAL }),
        new MultiplyBlend({ ...defaultConfig, mode: BlendMode.MULTIPLY }),
        new ScreenBlend({ ...defaultConfig, mode: BlendMode.SCREEN }),
        new OverlayBlend({ ...defaultConfig, mode: BlendMode.OVERLAY }),
        new SoftLightBlend({ ...defaultConfig, mode: BlendMode.SOFT_LIGHT }),
        new HardLightBlend({ ...defaultConfig, mode: BlendMode.HARD_LIGHT })
      ];

      blends.forEach(blend => {
        // 测试白色
        const whiteResult = blend.apply(whiteColor, whiteColor);
        expect(whiteResult.r).toBeGreaterThanOrEqual(0);
        expect(whiteResult.r).toBeLessThanOrEqual(255);
        
        // 测试黑色
        const blackResult = blend.apply(blackColor, blackColor);
        expect(blackResult.r).toBeGreaterThanOrEqual(0);
        expect(blackResult.r).toBeLessThanOrEqual(255);
        
        // 测试透明度
        const transparentColor = { r: 255, g: 0, b: 0, a: 0 };
        const transparentResult = blend.apply(whiteColor, transparentColor);
        expect(transparentResult.a).toBe(0);
      });
    });

    it('所有混合模式都应该正确处理 ImageData', () => {
      const blends = [
        new NormalBlend({ ...defaultConfig, mode: BlendMode.NORMAL }),
        new MultiplyBlend({ ...defaultConfig, mode: BlendMode.MULTIPLY }),
        new ScreenBlend({ ...defaultConfig, mode: BlendMode.SCREEN })
      ];

      const baseImageData = new ImageData(2, 2);
      const overlayImageData = new ImageData(2, 2);
      
      // 设置测试数据
      for (let i = 0; i < baseImageData.data.length; i += 4) {
        baseImageData.data[i] = 255;     // R
        baseImageData.data[i + 1] = 0;   // G
        baseImageData.data[i + 2] = 0;   // B
        baseImageData.data[i + 3] = 255; // A
        
        overlayImageData.data[i] = 0;     // R
        overlayImageData.data[i + 1] = 0; // G
        overlayImageData.data[i + 2] = 255; // B
        overlayImageData.data[i + 3] = 255; // A
      }

      blends.forEach(blend => {
        const result = blend.applyToImageData(baseImageData, overlayImageData);
        expect(result.width).toBe(2);
        expect(result.height).toBe(2);
        expect(result.data.length).toBe(16);
        
        // 检查结果值在有效范围内
        for (let i = 0; i < result.data.length; i++) {
          expect(result.data[i]).toBeGreaterThanOrEqual(0);
          expect(result.data[i]).toBeLessThanOrEqual(255);
        }
      });
    });
  });

  describe('性能测试', () => {
    it('混合操作应该在合理时间内完成', () => {
      const blend = new MultiplyBlend({ ...defaultConfig, mode: BlendMode.MULTIPLY });
      const iterations = 1000;
      
      const startTime = performance.now();
      
      for (let i = 0; i < iterations; i++) {
        blend.apply(redColor, blueColor);
      }
      
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      // 1000 次操作应该在 100ms 内完成
      expect(duration).toBeLessThan(100);
    });
  });
});