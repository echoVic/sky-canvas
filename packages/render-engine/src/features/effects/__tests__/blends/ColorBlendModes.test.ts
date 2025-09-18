import { beforeEach, describe, expect, it } from 'vitest';
import { BlendColor, BlendMode, BlendModeConfig, ColorBlend, DarkerColorBlend, DivideBlend, HardMixBlend, HueBlend, LighterColorBlend, LuminosityBlend, SaturationBlend, SubtractBlend } from '../../blends';

describe('ColorBlendModes', () => {
  let defaultConfig: BlendModeConfig;
  let whiteColor: BlendColor;
  let blackColor: BlendColor;
  let redColor: BlendColor;
  let greenColor: BlendColor;
  let blueColor: BlendColor;
  let yellowColor: BlendColor;
  let cyanColor: BlendColor;
  let magentaColor: BlendColor;
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
    greenColor = { r: 0, g: 255, b: 0, a: 255 };
    blueColor = { r: 0, g: 0, b: 255, a: 255 };
    yellowColor = { r: 255, g: 255, b: 0, a: 255 };
    cyanColor = { r: 0, g: 255, b: 255, a: 255 };
    magentaColor = { r: 255, g: 0, b: 255, a: 255 };
    grayColor = { r: 128, g: 128, b: 128, a: 255 };
  });

  describe('HueBlend', () => {
    let hueBlend: HueBlend;

    beforeEach(() => {
      hueBlend = new HueBlend({ ...defaultConfig, mode: BlendMode.HUE });
    });

    it('应该正确初始化', () => {
      expect(hueBlend.mode).toBe(BlendMode.HUE);
      expect(hueBlend.config.mode).toBe(BlendMode.HUE);
    });

    it('应该使用叠加颜色的色相，保持基础颜色的饱和度和亮度', () => {
      // 红色基础，蓝色叠加 - 应该得到蓝色色相但保持红色的饱和度和亮度
      const result = hueBlend.apply(redColor, blueColor);
      expect(result.a).toBe(blueColor.a);
      
      // 结果应该不同于原始颜色
      expect(result.r !== redColor.r || result.g !== redColor.g || result.b !== redColor.b).toBe(true);
      expect(result.r !== blueColor.r || result.g !== blueColor.g || result.b !== blueColor.b).toBe(true);
    });

    it('相同颜色混合应该返回基础颜色', () => {
      const result = hueBlend.apply(redColor, redColor);
      expect(result.r).toBeCloseTo(redColor.r, 0);
      expect(result.g).toBeCloseTo(redColor.g, 0);
      expect(result.b).toBeCloseTo(redColor.b, 0);
    });

    it('clone 应该创建新实例', () => {
      const cloned = hueBlend.clone();
      expect(cloned).toBeInstanceOf(HueBlend);
      expect(cloned.mode).toBe(hueBlend.mode);
      expect(cloned.id).not.toBe(hueBlend.id);
    });
  });

  describe('SaturationBlend', () => {
    let saturationBlend: SaturationBlend;

    beforeEach(() => {
      saturationBlend = new SaturationBlend({ ...defaultConfig, mode: BlendMode.SATURATION });
    });

    it('应该正确初始化', () => {
      expect(saturationBlend.mode).toBe(BlendMode.SATURATION);
    });

    it('应该使用叠加颜色的饱和度，保持基础颜色的色相和亮度', () => {
      // 红色基础，灰色叠加 - 应该降低饱和度
      const result = saturationBlend.apply(redColor, grayColor);
      expect(result.a).toBe(grayColor.a);
      
      // 结果应该比原始红色更接近灰色（饱和度降低）
      const redSaturation = Math.max(redColor.r, redColor.g, redColor.b) - Math.min(redColor.r, redColor.g, redColor.b);
      const resultSaturation = Math.max(result.r, result.g, result.b) - Math.min(result.r, result.g, result.b);
      expect(resultSaturation).toBeLessThan(redSaturation);
    });

    it('clone 应该创建新实例', () => {
      const cloned = saturationBlend.clone();
      expect(cloned).toBeInstanceOf(SaturationBlend);
      expect(cloned.mode).toBe(saturationBlend.mode);
    });
  });

  describe('ColorBlend', () => {
    let colorBlend: ColorBlend;

    beforeEach(() => {
      colorBlend = new ColorBlend({ ...defaultConfig, mode: BlendMode.COLOR });
    });

    it('应该正确初始化', () => {
      expect(colorBlend.mode).toBe(BlendMode.COLOR);
    });

    it('应该使用叠加颜色的色相和饱和度，保持基础颜色的亮度', () => {
      const result = colorBlend.apply(grayColor, redColor);
      expect(result.a).toBe(redColor.a);
      
      // 结果应该具有红色的色相和饱和度，但保持灰色的亮度
      expect(result.r !== grayColor.r || result.g !== grayColor.g || result.b !== grayColor.b).toBe(true);
    });

    it('clone 应该创建新实例', () => {
      const cloned = colorBlend.clone();
      expect(cloned).toBeInstanceOf(ColorBlend);
      expect(cloned.mode).toBe(colorBlend.mode);
    });
  });

  describe('LuminosityBlend', () => {
    let luminosityBlend: LuminosityBlend;

    beforeEach(() => {
      luminosityBlend = new LuminosityBlend({ ...defaultConfig, mode: BlendMode.LUMINOSITY });
    });

    it('应该正确初始化', () => {
      expect(luminosityBlend.mode).toBe(BlendMode.LUMINOSITY);
    });

    it('应该使用叠加颜色的亮度，保持基础颜色的色相和饱和度', () => {
      // 红色基础，白色叠加 - 应该得到亮红色
      const result = luminosityBlend.apply(redColor, whiteColor);
      expect(result.a).toBe(whiteColor.a);
      
      // 结果应该比原始红色更亮
      const redLuminance = 0.299 * redColor.r + 0.587 * redColor.g + 0.114 * redColor.b;
      const resultLuminance = 0.299 * result.r + 0.587 * result.g + 0.114 * result.b;
      expect(resultLuminance).toBeGreaterThan(redLuminance);
    });

    it('clone 应该创建新实例', () => {
      const cloned = luminosityBlend.clone();
      expect(cloned).toBeInstanceOf(LuminosityBlend);
      expect(cloned.mode).toBe(luminosityBlend.mode);
    });
  });

  describe('DarkerColorBlend', () => {
    let darkerColorBlend: DarkerColorBlend;

    beforeEach(() => {
      darkerColorBlend = new DarkerColorBlend({ ...defaultConfig, mode: BlendMode.DARKER_COLOR });
    });

    it('应该正确初始化', () => {
      expect(darkerColorBlend.mode).toBe(BlendMode.DARKER_COLOR);
    });

    it('应该选择较暗的颜色', () => {
      // 白色 vs 黑色 - 应该选择黑色
      const result1 = darkerColorBlend.apply(whiteColor, blackColor);
      expect(result1.r).toBe(blackColor.r);
      expect(result1.g).toBe(blackColor.g);
      expect(result1.b).toBe(blackColor.b);
      expect(result1.a).toBe(blackColor.a);
      
      // 黑色 vs 白色 - 应该选择黑色（基础色）
      const result2 = darkerColorBlend.apply(blackColor, whiteColor);
      expect(result2.r).toBe(blackColor.r);
      expect(result2.g).toBe(blackColor.g);
      expect(result2.b).toBe(blackColor.b);
      expect(result2.a).toBe(whiteColor.a); // 透明度来自叠加色
    });

    it('相同颜色应该返回叠加颜色', () => {
      const result = darkerColorBlend.apply(redColor, redColor);
      expect(result.r).toBe(redColor.r);
      expect(result.g).toBe(redColor.g);
      expect(result.b).toBe(redColor.b);
      expect(result.a).toBe(redColor.a);
    });

    it('clone 应该创建新实例', () => {
      const cloned = darkerColorBlend.clone();
      expect(cloned).toBeInstanceOf(DarkerColorBlend);
      expect(cloned.mode).toBe(darkerColorBlend.mode);
    });
  });

  describe('LighterColorBlend', () => {
    let lighterColorBlend: LighterColorBlend;

    beforeEach(() => {
      lighterColorBlend = new LighterColorBlend({ ...defaultConfig, mode: BlendMode.LIGHTER_COLOR });
    });

    it('应该正确初始化', () => {
      expect(lighterColorBlend.mode).toBe(BlendMode.LIGHTER_COLOR);
    });

    it('应该选择较亮的颜色', () => {
      // 白色 vs 黑色 - 应该选择白色
      const result1 = lighterColorBlend.apply(whiteColor, blackColor);
      expect(result1.r).toBe(whiteColor.r);
      expect(result1.g).toBe(whiteColor.g);
      expect(result1.b).toBe(whiteColor.b);
      expect(result1.a).toBe(blackColor.a); // 透明度来自叠加色
      
      // 黑色 vs 白色 - 应该选择白色（叠加色）
      const result2 = lighterColorBlend.apply(blackColor, whiteColor);
      expect(result2.r).toBe(whiteColor.r);
      expect(result2.g).toBe(whiteColor.g);
      expect(result2.b).toBe(whiteColor.b);
      expect(result2.a).toBe(whiteColor.a);
    });

    it('clone 应该创建新实例', () => {
      const cloned = lighterColorBlend.clone();
      expect(cloned).toBeInstanceOf(LighterColorBlend);
      expect(cloned.mode).toBe(lighterColorBlend.mode);
    });
  });

  describe('SubtractBlend', () => {
    let subtractBlend: SubtractBlend;

    beforeEach(() => {
      subtractBlend = new SubtractBlend({ ...defaultConfig, mode: BlendMode.SUBTRACT });
    });

    it('应该正确初始化', () => {
      expect(subtractBlend.mode).toBe(BlendMode.SUBTRACT);
    });

    it('应该正确执行减法运算', () => {
      // 白色 - 红色 = 青色
      const result = subtractBlend.apply(whiteColor, redColor);
      expect(result.r).toBe(0); // 255 - 255 = 0
      expect(result.g).toBe(255); // 255 - 0 = 255
      expect(result.b).toBe(255); // 255 - 0 = 255
      expect(result.a).toBe(redColor.a);
    });

    it('应该处理负值（限制为0）', () => {
      // 黑色 - 红色 = 黑色（不能为负）
      const result = subtractBlend.apply(blackColor, redColor);
      expect(result.r).toBe(0);
      expect(result.g).toBe(0);
      expect(result.b).toBe(0);
      expect(result.a).toBe(redColor.a);
    });

    it('相同颜色相减应该得到黑色', () => {
      const result = subtractBlend.apply(redColor, redColor);
      expect(result.r).toBe(0);
      expect(result.g).toBe(0);
      expect(result.b).toBe(0);
    });

    it('clone 应该创建新实例', () => {
      const cloned = subtractBlend.clone();
      expect(cloned).toBeInstanceOf(SubtractBlend);
      expect(cloned.mode).toBe(subtractBlend.mode);
    });
  });

  describe('DivideBlend', () => {
    let divideBlend: DivideBlend;

    beforeEach(() => {
      divideBlend = new DivideBlend({ ...defaultConfig, mode: BlendMode.DIVIDE });
    });

    it('应该正确初始化', () => {
      expect(divideBlend.mode).toBe(BlendMode.DIVIDE);
    });

    it('应该正确执行除法运算', () => {
      // 灰色 / 灰色 = 白色
      const result = divideBlend.apply(grayColor, grayColor);
      expect(result.r).toBeCloseTo(255, 0);
      expect(result.g).toBeCloseTo(255, 0);
      expect(result.b).toBeCloseTo(255, 0);
    });

    it('应该处理除零情况', () => {
      // 任何颜色 / 黑色 = 白色
      const result = divideBlend.apply(redColor, blackColor);
      expect(result.r).toBe(255);
      expect(result.g).toBe(255);
      expect(result.b).toBe(255);
    });

    it('应该限制结果不超过255', () => {
      // 白色 / 灰色 应该被限制在255
      const result = divideBlend.apply(whiteColor, grayColor);
      expect(result.r).toBeLessThanOrEqual(255);
      expect(result.g).toBeLessThanOrEqual(255);
      expect(result.b).toBeLessThanOrEqual(255);
    });

    it('clone 应该创建新实例', () => {
      const cloned = divideBlend.clone();
      expect(cloned).toBeInstanceOf(DivideBlend);
      expect(cloned.mode).toBe(divideBlend.mode);
    });
  });

  describe('HardMixBlend', () => {
    let hardMixBlend: HardMixBlend;

    beforeEach(() => {
      hardMixBlend = new HardMixBlend({ ...defaultConfig, mode: BlendMode.HARD_MIX });
    });

    it('应该正确初始化', () => {
      expect(hardMixBlend.mode).toBe(BlendMode.HARD_MIX);
    });

    it('应该产生极端的黑白效果', () => {
      // 白色 + 黑色 = 白色（每个通道 >= 1）
      const result1 = hardMixBlend.apply(whiteColor, blackColor);
      expect(result1.r).toBe(255);
      expect(result1.g).toBe(255);
      expect(result1.b).toBe(255);
      
      // 黑色 + 黑色 = 黑色（每个通道 < 1）
      const result2 = hardMixBlend.apply(blackColor, blackColor);
      expect(result2.r).toBe(0);
      expect(result2.g).toBe(0);
      expect(result2.b).toBe(0);
    });

    it('应该根据通道和决定输出', () => {
      // 灰色 + 灰色 = 白色（0.5 + 0.5 = 1.0 >= 1）
      const result = hardMixBlend.apply(grayColor, grayColor);
      expect(result.r).toBe(255);
      expect(result.g).toBe(255);
      expect(result.b).toBe(255);
    });

    it('应该只产生纯黑或纯白', () => {
      const testColors = [redColor, greenColor, blueColor, yellowColor, cyanColor, magentaColor];
      
      testColors.forEach(color1 => {
        testColors.forEach(color2 => {
          const result = hardMixBlend.apply(color1, color2);
          
          // 每个通道应该是 0 或 255
          expect(result.r === 0 || result.r === 255).toBe(true);
          expect(result.g === 0 || result.g === 255).toBe(true);
          expect(result.b === 0 || result.b === 255).toBe(true);
        });
      });
    });

    it('clone 应该创建新实例', () => {
      const cloned = hardMixBlend.clone();
      expect(cloned).toBeInstanceOf(HardMixBlend);
      expect(cloned.mode).toBe(hardMixBlend.mode);
    });
  });

  describe('边界值测试', () => {
    it('所有颜色混合模式都应该处理极值', () => {
      const blends = [
        new HueBlend({ ...defaultConfig, mode: BlendMode.HUE }),
        new SaturationBlend({ ...defaultConfig, mode: BlendMode.SATURATION }),
        new ColorBlend({ ...defaultConfig, mode: BlendMode.COLOR }),
        new LuminosityBlend({ ...defaultConfig, mode: BlendMode.LUMINOSITY }),
        new DarkerColorBlend({ ...defaultConfig, mode: BlendMode.DARKER_COLOR }),
        new LighterColorBlend({ ...defaultConfig, mode: BlendMode.LIGHTER_COLOR }),
        new SubtractBlend({ ...defaultConfig, mode: BlendMode.SUBTRACT }),
        new DivideBlend({ ...defaultConfig, mode: BlendMode.DIVIDE }),
        new HardMixBlend({ ...defaultConfig, mode: BlendMode.HARD_MIX })
      ];

      blends.forEach(blend => {
        // 测试白色
        const whiteResult = blend.apply(whiteColor, whiteColor);
        expect(whiteResult.r).toBeGreaterThanOrEqual(0);
        expect(whiteResult.r).toBeLessThanOrEqual(255);
        expect(whiteResult.g).toBeGreaterThanOrEqual(0);
        expect(whiteResult.g).toBeLessThanOrEqual(255);
        expect(whiteResult.b).toBeGreaterThanOrEqual(0);
        expect(whiteResult.b).toBeLessThanOrEqual(255);
        
        // 测试黑色
        const blackResult = blend.apply(blackColor, blackColor);
        expect(blackResult.r).toBeGreaterThanOrEqual(0);
        expect(blackResult.r).toBeLessThanOrEqual(255);
        expect(blackResult.g).toBeGreaterThanOrEqual(0);
        expect(blackResult.g).toBeLessThanOrEqual(255);
        expect(blackResult.b).toBeGreaterThanOrEqual(0);
        expect(blackResult.b).toBeLessThanOrEqual(255);
        
        // 测试透明度
        const transparentColor = { r: 255, g: 0, b: 0, a: 0 };
        const transparentResult = blend.apply(whiteColor, transparentColor);
        expect(transparentResult.a).toBe(0);
      });
    });
  });

  describe('性能测试', () => {
    it('颜色混合操作应该在合理时间内完成', () => {
      const blend = new HueBlend({ ...defaultConfig, mode: BlendMode.HUE });
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