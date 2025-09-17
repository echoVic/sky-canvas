/**
 * ColorAdjustmentEffects 单元测试
 */

import { beforeEach, describe, expect, it } from 'vitest';
import { BrightnessEffect, ColorAdjustmentConfig, ColorBalanceConfig, ColorBalanceEffect, ContrastEffect, ExposureEffect, GammaEffect, HueShiftEffect, PostProcessType, SaturationEffect } from '../../postprocess';


describe('ColorAdjustmentEffects', () => {
  let testImageData: ImageData;

  beforeEach(() => {
    // 创建测试图像数据
    testImageData = new ImageData(10, 10);
    for (let i = 0; i < testImageData.data.length; i += 4) {
      testImageData.data[i] = 128;     // R
      testImageData.data[i + 1] = 64;  // G
      testImageData.data[i + 2] = 192; // B
      testImageData.data[i + 3] = 255; // A
    }
  });

  describe('BrightnessEffect', () => {
    let effect: BrightnessEffect;
    let config: ColorAdjustmentConfig;

    beforeEach(() => {
      config = {
        type: PostProcessType.BRIGHTNESS,
        enabled: true,
        intensity: 1.0,
        parameters: { amount: 50 }
      };
      effect = new BrightnessEffect(config);
    });

    it('应该正确初始化', () => {
      expect(effect.type).toBe(PostProcessType.BRIGHTNESS);
      expect(effect.config).toEqual(config);
    });

    it('应该增加亮度', () => {
      const result = effect.apply(testImageData);

      expect(result.data[0]).toBe(178); // 128 + 50
      expect(result.data[1]).toBe(114); // 64 + 50
      expect(result.data[2]).toBe(242); // 192 + 50
      expect(result.data[3]).toBe(255); // Alpha不变
    });

    it('应该处理禁用状态', () => {
      config.enabled = false;
      effect.updateConfig(config);

      const result = effect.apply(testImageData);

      expect(result.data[0]).toBe(128); // 原值不变
      expect(result.data[1]).toBe(64);
      expect(result.data[2]).toBe(192);
    });

    it('应该正确克隆', () => {
      const cloned = effect.clone();

      expect(cloned).not.toBe(effect);
      expect(cloned.type).toBe(effect.type);
      expect(cloned.config).toEqual(effect.config);
    });
  });

  describe('ContrastEffect', () => {
    let effect: ContrastEffect;
    let config: ColorAdjustmentConfig;

    beforeEach(() => {
      config = {
        type: PostProcessType.CONTRAST,
        enabled: true,
        intensity: 1.0,
        parameters: { amount: 20 }
      };
      effect = new ContrastEffect(config);
    });

    it('应该调整对比度', () => {
      const result = effect.apply(testImageData);

      // 对比度公式会改变像素值
      expect(result.data[0]).not.toBe(128);
      expect(result.data[1]).not.toBe(64);
      expect(result.data[2]).not.toBe(192);
      expect(result.data[3]).toBe(255); // Alpha不变
    });

    it('应该钳制极值', () => {
      config.parameters.amount = 200; // 极大对比度
      effect.updateConfig(config);

      const result = effect.apply(testImageData);

      // 所有值应该在0-255范围内
      for (let i = 0; i < result.data.length; i += 4) {
        expect(result.data[i]).toBeGreaterThanOrEqual(0);
        expect(result.data[i]).toBeLessThanOrEqual(255);
        expect(result.data[i + 1]).toBeGreaterThanOrEqual(0);
        expect(result.data[i + 1]).toBeLessThanOrEqual(255);
        expect(result.data[i + 2]).toBeGreaterThanOrEqual(0);
        expect(result.data[i + 2]).toBeLessThanOrEqual(255);
      }
    });
  });

  describe('SaturationEffect', () => {
    let effect: SaturationEffect;
    let config: ColorAdjustmentConfig;

    beforeEach(() => {
      config = {
        type: PostProcessType.SATURATION,
        enabled: true,
        intensity: 1.0,
        parameters: { amount: 1.5 }
      };
      effect = new SaturationEffect(config);
    });

    it('应该调整饱和度', () => {
      const result = effect.apply(testImageData);

      // 饱和度调整会改变颜色值
      expect(result.data[0]).not.toBe(128);
      expect(result.data[1]).not.toBe(64);
      expect(result.data[2]).not.toBe(192);
      expect(result.data[3]).toBe(255); // Alpha不变
    });

    it('应该创建灰度图像当饱和度为0时', () => {
      config.parameters.amount = 0;
      effect.updateConfig(config);

      const result = effect.apply(testImageData);

      // 计算预期的灰度值
      const expectedGray = Math.round(0.299 * 128 + 0.587 * 64 + 0.114 * 192);

      expect(result.data[0]).toBeCloseTo(expectedGray, 0);
      expect(result.data[1]).toBeCloseTo(expectedGray, 0);
      expect(result.data[2]).toBeCloseTo(expectedGray, 0);
    });
  });

  describe('HueShiftEffect', () => {
    let effect: HueShiftEffect;
    let config: ColorAdjustmentConfig;

    beforeEach(() => {
      config = {
        type: PostProcessType.HUE_SHIFT,
        enabled: true,
        intensity: 1.0,
        parameters: { amount: 180 } // 180度色相偏移
      };
      effect = new HueShiftEffect(config);
    });

    it('应该偏移色相', () => {
      const result = effect.apply(testImageData);

      // 色相偏移会显著改变颜色
      expect(result.data[0]).not.toBe(128);
      expect(result.data[1]).not.toBe(64);
      expect(result.data[2]).not.toBe(192);
      expect(result.data[3]).toBe(255); // Alpha不变
    });

    it('应该处理360度偏移为无变化', () => {
      config.parameters.amount = 360;
      effect.updateConfig(config);

      const result = effect.apply(testImageData);

      // 360度偏移应该回到原始颜色
      expect(result.data[0]).toBeCloseTo(128, 1);
      expect(result.data[1]).toBeCloseTo(64, 1);
      expect(result.data[2]).toBeCloseTo(192, 1);
    });
  });

  describe('GammaEffect', () => {
    let effect: GammaEffect;
    let config: ColorAdjustmentConfig;

    beforeEach(() => {
      config = {
        type: PostProcessType.GAMMA,
        enabled: true,
        intensity: 1.0,
        parameters: { amount: 0.8 }
      };
      effect = new GammaEffect(config);
    });

    it('应该应用伽马校正', () => {
      const result = effect.apply(testImageData);

      // 伽马校正会改变亮度曲线
      expect(result.data[0]).not.toBe(128);
      expect(result.data[1]).not.toBe(64);
      expect(result.data[2]).not.toBe(192);
      expect(result.data[3]).toBe(255); // Alpha不变
    });

    it('应该处理极小伽马值', () => {
      config.parameters.amount = 0.01;
      effect.updateConfig(config);

      const result = effect.apply(testImageData);

      // 极小伽马值应该使图像变亮
      expect(result.data[0]).toBeGreaterThan(128);
      expect(result.data[1]).toBeGreaterThan(64);
      expect(result.data[2]).toBeGreaterThan(192);
    });
  });

  describe('ExposureEffect', () => {
    let effect: ExposureEffect;
    let config: ColorAdjustmentConfig;

    beforeEach(() => {
      config = {
        type: PostProcessType.EXPOSURE,
        enabled: true,
        intensity: 1.0,
        parameters: { amount: 1.0 } // 增加1档曝光
      };
      effect = new ExposureEffect(config);
    });

    it('应该调整曝光', () => {
      const result = effect.apply(testImageData);

      // 曝光调整应该使图像变亮（2的1次方 = 2倍）
      expect(result.data[0]).toBe(255); // 128 * 2 = 256, 钳制到255
      expect(result.data[1]).toBe(128); // 64 * 2 = 128
      expect(result.data[2]).toBe(255); // 192 * 2 = 384, 钳制到255
      expect(result.data[3]).toBe(255); // Alpha不变
    });

    it('应该处理负曝光值', () => {
      config.parameters.amount = -1.0;
      effect.updateConfig(config);

      const result = effect.apply(testImageData);

      // 负曝光应该使图像变暗（2的-1次方 = 0.5倍）
      expect(result.data[0]).toBe(64);  // 128 * 0.5 = 64
      expect(result.data[1]).toBe(32);  // 64 * 0.5 = 32
      expect(result.data[2]).toBe(96);  // 192 * 0.5 = 96
    });
  });

  describe('ColorBalanceEffect', () => {
    let effect: ColorBalanceEffect;
    let config: ColorBalanceConfig;

    beforeEach(() => {
      config = {
        type: PostProcessType.COLOR_BALANCE,
        enabled: true,
        intensity: 1.0,
        parameters: {
          shadowsRed: 10,
          shadowsGreen: -5,
          shadowsBlue: 5,
          midtonesRed: 5,
          midtonesGreen: 0,
          midtonesBlue: -10,
          highlightsRed: -5,
          highlightsGreen: 10,
          highlightsBlue: 5
        }
      };
      effect = new ColorBalanceEffect(config);
    });

    it('应该调整色彩平衡', () => {
      const result = effect.apply(testImageData);

      // 色彩平衡会改变各个通道
      expect(result.data[0]).not.toBe(128);
      expect(result.data[1]).not.toBe(64);
      expect(result.data[2]).not.toBe(192);
      expect(result.data[3]).toBe(255); // Alpha不变
    });

    it('应该根据亮度应用不同权重', () => {
      // 创建不同亮度的测试数据
      const darkImageData = new ImageData(5, 5);
      const brightImageData = new ImageData(5, 5);

      // 填充暗色像素
      for (let i = 0; i < darkImageData.data.length; i += 4) {
        darkImageData.data[i] = 30;     // R
        darkImageData.data[i + 1] = 30; // G
        darkImageData.data[i + 2] = 30; // B
        darkImageData.data[i + 3] = 255; // A
      }

      // 填充亮色像素
      for (let i = 0; i < brightImageData.data.length; i += 4) {
        brightImageData.data[i] = 220;   // R
        brightImageData.data[i + 1] = 220; // G
        brightImageData.data[i + 2] = 220; // B
        brightImageData.data[i + 3] = 255;  // A
      }

      const darkResult = effect.apply(darkImageData);
      const brightResult = effect.apply(brightImageData);

      // 暗部和亮部应该有不同的调整效果
      expect(darkResult.data[0]).not.toBe(brightResult.data[0]);
    });
  });

  describe('通用功能测试', () => {
    const effects = [
      () => new BrightnessEffect({
        type: PostProcessType.BRIGHTNESS,
        enabled: true,
        intensity: 1.0,
        parameters: { amount: 25 }
      }),
      () => new ContrastEffect({
        type: PostProcessType.CONTRAST,
        enabled: true,
        intensity: 1.0,
        parameters: { amount: 20 }
      }),
      () => new SaturationEffect({
        type: PostProcessType.SATURATION,
        enabled: true,
        intensity: 1.0,
        parameters: { amount: 1.2 }
      }),
      () => new ExposureEffect({
        type: PostProcessType.EXPOSURE,
        enabled: true,
        intensity: 1.0,
        parameters: { amount: 0.5 }
      })
    ];

    effects.forEach((createEffect, index) => {
      it(`效果 ${index + 1} 应该保持Alpha通道不变`, () => {
        const effect = createEffect();
        const result = effect.apply(testImageData);

        for (let i = 3; i < result.data.length; i += 4) {
          expect(result.data[i]).toBe(255);
        }
      });

      it(`效果 ${index + 1} 应该处理目标ImageData`, () => {
        const effect = createEffect();
        const targetData = new ImageData(10, 10);

        const result = effect.apply(testImageData, targetData);

        expect(result).toBe(targetData);
        expect(result.width).toBe(10);
        expect(result.height).toBe(10);
      });

      it(`效果 ${index + 1} 应该正确更新配置`, () => {
        const effect = createEffect();
        const newConfig = { intensity: 0.5 };

        effect.updateConfig(newConfig);

        expect(effect.config.intensity).toBe(0.5);
      });
    });
  });

  describe('性能测试', () => {
    it('应该在合理时间内处理大图像', () => {
      const largeImageData = new ImageData(200, 200);

      // 填充随机数据
      for (let i = 0; i < largeImageData.data.length; i++) {
        largeImageData.data[i] = Math.floor(Math.random() * 256);
      }

      const effect = new BrightnessEffect({
        type: PostProcessType.BRIGHTNESS,
        enabled: true,
        intensity: 1.0,
        parameters: { amount: 30 }
      });

      const startTime = performance.now();
      effect.apply(largeImageData);
      const endTime = performance.now();

      expect(endTime - startTime).toBeLessThan(100); // 应该在100ms内完成
    });
  });

  describe('边界值测试', () => {
    it('应该正确钳制超出范围的值', () => {
      // 创建包含边界值的图像数据
      const boundaryImageData = new ImageData(2, 2);
      boundaryImageData.data[0] = 0;   // 最小值
      boundaryImageData.data[1] = 0;
      boundaryImageData.data[2] = 0;
      boundaryImageData.data[3] = 255;

      boundaryImageData.data[4] = 255; // 最大值
      boundaryImageData.data[5] = 255;
      boundaryImageData.data[6] = 255;
      boundaryImageData.data[7] = 255;

      const effect = new BrightnessEffect({
        type: PostProcessType.BRIGHTNESS,
        enabled: true,
        intensity: 1.0,
        parameters: { amount: 100 } // 大亮度调整
      });

      const result = effect.apply(boundaryImageData);

      // 检查所有值都在有效范围内
      for (let i = 0; i < result.data.length; i += 4) {
        expect(result.data[i]).toBeGreaterThanOrEqual(0);
        expect(result.data[i]).toBeLessThanOrEqual(255);
        expect(result.data[i + 1]).toBeGreaterThanOrEqual(0);
        expect(result.data[i + 1]).toBeLessThanOrEqual(255);
        expect(result.data[i + 2]).toBeGreaterThanOrEqual(0);
        expect(result.data[i + 2]).toBeLessThanOrEqual(255);
        expect(result.data[i + 3]).toBe(255);
      }
    });
  });
});