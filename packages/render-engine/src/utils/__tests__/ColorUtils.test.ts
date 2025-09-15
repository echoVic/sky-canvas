/**
 * ColorUtils 单元测试
 * 基于 BDD (Behavior-Driven Development) 和 AAA (Arrange-Act-Assert) 模式
 */

import { describe, expect, it } from 'vitest';
import {
  blendColors,
  colorToArray,
  colorToCss,
  colorToHex,
  denormalizeColor,
  getContrast,
  getLuminance,
  hslToRgb,
  hsvToRgb,
  lerpColor,
  normalizeColor,
  parseColor,
  rgbToHsl,
  rgbToHsv,
  type HSLColor,
  type HSVColor,
  type NormalizedRGBAColor,
  type RGBAColor
} from '../ColorUtils';

describe('ColorUtils', () => {
  describe('parseColor', () => {
    describe('Given hex color strings', () => {
      describe('When parsing 3-digit hex colors', () => {
        it('Then should parse #RGB format correctly', () => {
          // Arrange: 准备3位十六进制颜色
          const hexColor = '#f0a';

          // Act: 解析颜色
          const result = parseColor(hexColor);

          // Assert: 验证解析结果
          expect(result).toEqual({ r: 255, g: 0, b: 170, a: 255 });
        });

        it('Then should parse uppercase hex colors', () => {
          // Arrange: 准备大写十六进制颜色
          const hexColor = '#F0A';

          // Act: 解析颜色
          const result = parseColor(hexColor);

          // Assert: 验证解析结果
          expect(result).toEqual({ r: 255, g: 0, b: 170, a: 255 });
        });
      });

      describe('When parsing 6-digit hex colors', () => {
        it('Then should parse #RRGGBB format correctly', () => {
          // Arrange: 准备6位十六进制颜色
          const hexColor = '#ff5500';

          // Act: 解析颜色
          const result = parseColor(hexColor);

          // Assert: 验证解析结果
          expect(result).toEqual({ r: 255, g: 85, b: 0, a: 255 });
        });

        it('Then should handle black color', () => {
          // Arrange: 准备黑色
          const hexColor = '#000000';

          // Act: 解析颜色
          const result = parseColor(hexColor);

          // Assert: 验证解析结果
          expect(result).toEqual({ r: 0, g: 0, b: 0, a: 255 });
        });

        it('Then should handle white color', () => {
          // Arrange: 准备白色
          const hexColor = '#ffffff';

          // Act: 解析颜色
          const result = parseColor(hexColor);

          // Assert: 验证解析结果
          expect(result).toEqual({ r: 255, g: 255, b: 255, a: 255 });
        });
      });

      describe('When parsing 8-digit hex colors with alpha', () => {
        it('Then should parse #RRGGBBAA format correctly', () => {
          // Arrange: 准备8位十六进制颜色（含透明度）
          const hexColor = '#ff550080';

          // Act: 解析颜色
          const result = parseColor(hexColor);

          // Assert: 验证解析结果
          expect(result).toEqual({ r: 255, g: 85, b: 0, a: 128 });
        });

        it('Then should handle fully transparent color', () => {
          // Arrange: 准备完全透明颜色
          const hexColor = '#ff000000';

          // Act: 解析颜色
          const result = parseColor(hexColor);

          // Assert: 验证解析结果
          expect(result).toEqual({ r: 255, g: 0, b: 0, a: 0 });
        });
      });
    });

    describe('Given RGB/RGBA color strings', () => {
      describe('When parsing rgb() format', () => {
        it('Then should parse rgb(r, g, b) correctly', () => {
          // Arrange: 准备RGB颜色字符串
          const rgbColor = 'rgb(255, 128, 64)';

          // Act: 解析颜色
          const result = parseColor(rgbColor);

          // Assert: 验证解析结果
          expect(result).toEqual({ r: 255, g: 128, b: 64, a: 255 });
        });

        it('Then should handle spaces in rgb format', () => {
          // Arrange: 准备带空格的RGB颜色字符串
          const rgbColor = 'rgb( 255 , 128 , 64 )';

          // Act: 解析颜色
          const result = parseColor(rgbColor);

          // Assert: 验证解析结果
          expect(result).toEqual({ r: 255, g: 128, b: 64, a: 255 });
        });
      });

      describe('When parsing rgba() format', () => {
        it('Then should parse rgba(r, g, b, a) correctly', () => {
          // Arrange: 准备RGBA颜色字符串
          const rgbaColor = 'rgba(255, 128, 64, 0.5)';

          // Act: 解析颜色
          const result = parseColor(rgbaColor);

          // Assert: 验证解析结果
          expect(result).toEqual({ r: 255, g: 128, b: 64, a: 128 });
        });

        it('Then should handle alpha value 0', () => {
          // Arrange: 准备透明度为0的RGBA颜色
          const rgbaColor = 'rgba(255, 0, 0, 0)';

          // Act: 解析颜色
          const result = parseColor(rgbaColor);

          // Assert: 验证解析结果
          expect(result).toEqual({ r: 255, g: 0, b: 0, a: 0 });
        });

        it('Then should handle alpha value 1', () => {
          // Arrange: 准备透明度为1的RGBA颜色
          const rgbaColor = 'rgba(0, 255, 0, 1)';

          // Act: 解析颜色
          const result = parseColor(rgbaColor);

          // Assert: 验证解析结果
          expect(result).toEqual({ r: 0, g: 255, b: 0, a: 255 });
        });
      });
    });

    describe('Given HSL/HSLA color strings', () => {
      describe('When parsing hsl() format', () => {
        it('Then should parse hsl(h, s%, l%) correctly', () => {
          // Arrange: 准备HSL颜色字符串
          const hslColor = 'hsl(120, 100%, 50%)';

          // Act: 解析颜色
          const result = parseColor(hslColor);

          // Assert: 验证解析结果（绿色）
          expect(result).toEqual({ r: 0, g: 255, b: 0, a: 255 });
        });

        it('Then should parse red hue correctly', () => {
          // Arrange: 准备红色HSL
          const hslColor = 'hsl(0, 100%, 50%)';

          // Act: 解析颜色
          const result = parseColor(hslColor);

          // Assert: 验证解析结果
          expect(result).toEqual({ r: 255, g: 0, b: 0, a: 255 });
        });
      });

      describe('When parsing hsla() format', () => {
        it('Then should parse hsla(h, s%, l%, a) correctly', () => {
          // Arrange: 准备HSLA颜色字符串
          const hslaColor = 'hsla(240, 100%, 50%, 0.5)';

          // Act: 解析颜色
          const result = parseColor(hslaColor);

          // Assert: 验证解析结果（蓝色，50%透明度）
          expect(result).toEqual({ r: 0, g: 0, b: 255, a: 128 });
        });
      });
    });

    describe('Given named colors', () => {
      describe('When parsing standard color names', () => {
        it('Then should parse basic color names correctly', () => {
          // Arrange & Act & Assert: 测试基本颜色名称
          expect(parseColor('red')).toEqual({ r: 255, g: 0, b: 0, a: 255 });
          expect(parseColor('green')).toEqual({ r: 0, g: 128, b: 0, a: 255 });
          expect(parseColor('blue')).toEqual({ r: 0, g: 0, b: 255, a: 255 });
          expect(parseColor('white')).toEqual({ r: 255, g: 255, b: 255, a: 255 });
          expect(parseColor('black')).toEqual({ r: 0, g: 0, b: 0, a: 255 });
        });

        it('Then should handle case insensitive color names', () => {
          // Arrange & Act & Assert: 测试大小写不敏感
          expect(parseColor('RED')).toEqual({ r: 255, g: 0, b: 0, a: 255 });
          expect(parseColor('Green')).toEqual({ r: 0, g: 128, b: 0, a: 255 });
          expect(parseColor('BLUE')).toEqual({ r: 0, g: 0, b: 255, a: 255 });
        });

        it('Then should parse transparent color', () => {
          // Arrange: 准备透明颜色名称
          const colorName = 'transparent';

          // Act: 解析颜色
          const result = parseColor(colorName);

          // Assert: 验证解析结果
          expect(result).toEqual({ r: 0, g: 0, b: 0, a: 0 });
        });
      });

      describe('When parsing unknown color names', () => {
        it('Then should return black for unknown color names', () => {
          // Arrange: 准备未知颜色名称
          const unknownColor = 'unknowncolor';

          // Act: 解析颜色
          const result = parseColor(unknownColor);

          // Assert: 验证返回黑色
          expect(result).toEqual({ r: 0, g: 0, b: 0, a: 255 });
        });
      });
    });
  });

  describe('Color Space Conversions', () => {
    describe('rgbToHsl', () => {
      describe('Given RGB color values', () => {
        describe('When converting primary colors', () => {
          it('Then should convert red correctly', () => {
            // Arrange: 准备红色RGB值
            const red: RGBAColor = { r: 255, g: 0, b: 0, a: 255 };

            // Act: 转换为HSL
            const result = rgbToHsl(red);

            // Assert: 验证转换结果
            expect(result).toEqual({ h: 0, s: 100, l: 50 });
          });

          it('Then should convert green correctly', () => {
            // Arrange: 准备绿色RGB值
            const green: RGBAColor = { r: 0, g: 255, b: 0, a: 255 };

            // Act: 转换为HSL
            const result = rgbToHsl(green);

            // Assert: 验证转换结果
            expect(result).toEqual({ h: 120, s: 100, l: 50 });
          });

          it('Then should convert blue correctly', () => {
            // Arrange: 准备蓝色RGB值
            const blue: RGBAColor = { r: 0, g: 0, b: 255, a: 255 };

            // Act: 转换为HSL
            const result = rgbToHsl(blue);

            // Assert: 验证转换结果
            expect(result).toEqual({ h: 240, s: 100, l: 50 });
          });
        });

        describe('When converting grayscale colors', () => {
          it('Then should convert white correctly', () => {
            // Arrange: 准备白色RGB值
            const white: RGBAColor = { r: 255, g: 255, b: 255, a: 255 };

            // Act: 转换为HSL
            const result = rgbToHsl(white);

            // Assert: 验证转换结果
            expect(result).toEqual({ h: 0, s: 0, l: 100 });
          });

          it('Then should convert black correctly', () => {
            // Arrange: 准备黑色RGB值
            const black: RGBAColor = { r: 0, g: 0, b: 0, a: 255 };

            // Act: 转换为HSL
            const result = rgbToHsl(black);

            // Assert: 验证转换结果
            expect(result).toEqual({ h: 0, s: 0, l: 0 });
          });

          it('Then should convert gray correctly', () => {
            // Arrange: 准备灰色RGB值
            const gray: RGBAColor = { r: 128, g: 128, b: 128, a: 255 };

            // Act: 转换为HSL
            const result = rgbToHsl(gray);

            // Assert: 验证转换结果
            expect(result.h).toBe(0);
            expect(result.s).toBe(0);
            expect(Math.round(result.l)).toBe(50);
          });
        });

        describe('When using separate RGB parameters', () => {
          it('Then should convert using individual r, g, b values', () => {
            // Arrange: 准备分离的RGB值
            const r = 255, g = 128, b = 0;

            // Act: 转换为HSL
            const result = rgbToHsl(r, g, b);

            // Assert: 验证转换结果
            expect(Math.round(result.h)).toBe(30); // 橙色色调
            expect(result.s).toBe(100);
            expect(result.l).toBe(50);
          });
        });
      });
    });

    describe('hslToRgb', () => {
      describe('Given HSL color values', () => {
        describe('When converting primary hues', () => {
          it('Then should convert red hue correctly', () => {
            // Arrange: 准备红色HSL值
            const hsl: HSLColor = { h: 0, s: 100, l: 50 };

            // Act: 转换为RGB
            const result = hslToRgb(hsl);

            // Assert: 验证转换结果
            expect(result).toEqual({ r: 255, g: 0, b: 0, a: 255 });
          });

          it('Then should convert green hue correctly', () => {
            // Arrange: 准备绿色HSL值
            const hsl: HSLColor = { h: 120, s: 100, l: 50 };

            // Act: 转换为RGB
            const result = hslToRgb(hsl);

            // Assert: 验证转换结果
            expect(result).toEqual({ r: 0, g: 255, b: 0, a: 255 });
          });

          it('Then should convert blue hue correctly', () => {
            // Arrange: 准备蓝色HSL值
            const hsl: HSLColor = { h: 240, s: 100, l: 50 };

            // Act: 转换为RGB
            const result = hslToRgb(hsl);

            // Assert: 验证转换结果
            expect(result).toEqual({ r: 0, g: 0, b: 255, a: 255 });
          });
        });

        describe('When converting with different saturation and lightness', () => {
          it('Then should convert desaturated color correctly', () => {
            // Arrange: 准备低饱和度HSL值
            const hsl: HSLColor = { h: 0, s: 0, l: 50 };

            // Act: 转换为RGB
            const result = hslToRgb(hsl);

            // Assert: 验证转换结果（灰色）
            expect(result.r).toBe(result.g);
            expect(result.g).toBe(result.b);
            expect(Math.round(result.r)).toBe(128);
          });

          it('Then should convert dark color correctly', () => {
            // Arrange: 准备低亮度HSL值
            const hsl: HSLColor = { h: 0, s: 100, l: 25 };

            // Act: 转换为RGB
            const result = hslToRgb(hsl);

            // Assert: 验证转换结果（深红色）
            expect(result.r).toBe(128);
            expect(result.g).toBe(0);
            expect(result.b).toBe(0);
          });
        });

        describe('When using separate HSL parameters', () => {
          it('Then should convert using individual h, s, l values', () => {
            // Arrange: 准备分离的HSL值
            const h = 60, s = 100, l = 50;

            // Act: 转换为RGB
            const result = hslToRgb(h, s, l);

            // Assert: 验证转换结果（黄色）
            expect(result).toEqual({ r: 255, g: 255, b: 0, a: 255 });
          });
        });
      });
    });

    describe('rgbToHsv', () => {
      describe('Given RGB color values', () => {
        describe('When converting primary colors', () => {
          it('Then should convert red correctly', () => {
            // Arrange: 准备红色RGB值
            const red: RGBAColor = { r: 255, g: 0, b: 0, a: 255 };

            // Act: 转换为HSV
            const result = rgbToHsv(red);

            // Assert: 验证转换结果
            expect(result).toEqual({ h: 0, s: 100, v: 100 });
          });

          it('Then should convert green correctly', () => {
            // Arrange: 准备绿色RGB值
            const green: RGBAColor = { r: 0, g: 255, b: 0, a: 255 };

            // Act: 转换为HSV
            const result = rgbToHsv(green);

            // Assert: 验证转换结果
            expect(result).toEqual({ h: 120, s: 100, v: 100 });
          });

          it('Then should convert blue correctly', () => {
            // Arrange: 准备蓝色RGB值
            const blue: RGBAColor = { r: 0, g: 0, b: 255, a: 255 };

            // Act: 转换为HSV
            const result = rgbToHsv(blue);

            // Assert: 验证转换结果
            expect(result).toEqual({ h: 240, s: 100, v: 100 });
          });
        });

        describe('When converting grayscale colors', () => {
          it('Then should convert white correctly', () => {
            // Arrange: 准备白色RGB值
            const white: RGBAColor = { r: 255, g: 255, b: 255, a: 255 };

            // Act: 转换为HSV
            const result = rgbToHsv(white);

            // Assert: 验证转换结果
            expect(result).toEqual({ h: 0, s: 0, v: 100 });
          });

          it('Then should convert black correctly', () => {
            // Arrange: 准备黑色RGB值
            const black: RGBAColor = { r: 0, g: 0, b: 0, a: 255 };

            // Act: 转换为HSV
            const result = rgbToHsv(black);

            // Assert: 验证转换结果
            expect(result).toEqual({ h: 0, s: 0, v: 0 });
          });
        });
      });
    });

    describe('hsvToRgb', () => {
      describe('Given HSV color values', () => {
        describe('When converting primary hues', () => {
          it('Then should convert red hue correctly', () => {
            // Arrange: 准备红色HSV值
            const hsv: HSVColor = { h: 0, s: 100, v: 100 };

            // Act: 转换为RGB
            const result = hsvToRgb(hsv);

            // Assert: 验证转换结果
            expect(result).toEqual({ r: 255, g: 0, b: 0, a: 255 });
          });

          it('Then should convert green hue correctly', () => {
            // Arrange: 准备绿色HSV值
            const hsv: HSVColor = { h: 120, s: 100, v: 100 };

            // Act: 转换为RGB
            const result = hsvToRgb(hsv);

            // Assert: 验证转换结果
            expect(result).toEqual({ r: 0, g: 255, b: 0, a: 255 });
          });

          it('Then should convert blue hue correctly', () => {
            // Arrange: 准备蓝色HSV值
            const hsv: HSVColor = { h: 240, s: 100, v: 100 };

            // Act: 转换为RGB
            const result = hsvToRgb(hsv);

            // Assert: 验证转换结果
            expect(result).toEqual({ r: 0, g: 0, b: 255, a: 255 });
          });
        });

        describe('When converting with different saturation and value', () => {
          it('Then should convert desaturated color correctly', () => {
            // Arrange: 准备低饱和度HSV值
            const hsv: HSVColor = { h: 0, s: 0, v: 50 };

            // Act: 转换为RGB
            const result = hsvToRgb(hsv);

            // Assert: 验证转换结果（灰色）
            expect(result.r).toBe(result.g);
            expect(result.g).toBe(result.b);
            expect(Math.round(result.r)).toBe(128);
          });

          it('Then should convert low value color correctly', () => {
            // Arrange: 准备低明度HSV值
            const hsv: HSVColor = { h: 0, s: 100, v: 50 };

            // Act: 转换为RGB
            const result = hsvToRgb(hsv);

            // Assert: 验证转换结果（深红色）
            expect(result.r).toBe(128);
            expect(result.g).toBe(0);
            expect(result.b).toBe(0);
          });
        });
      });
    });
  });

  describe('Color Analysis', () => {
    describe('getLuminance', () => {
      describe('Given different colors', () => {
        describe('When calculating luminance', () => {
          it('Then should return 1 for white', () => {
            // Arrange: 准备白色
            const white: RGBAColor = { r: 255, g: 255, b: 255, a: 255 };

            // Act: 计算亮度
            const result = getLuminance(white);

            // Assert: 验证亮度值
            expect(result).toBeCloseTo(1, 2);
          });

          it('Then should return 0 for black', () => {
            // Arrange: 准备黑色
            const black: RGBAColor = { r: 0, g: 0, b: 0, a: 255 };

            // Act: 计算亮度
            const result = getLuminance(black);

            // Assert: 验证亮度值
            expect(result).toBeCloseTo(0, 2);
          });

          it('Then should return intermediate value for gray', () => {
            // Arrange: 准备灰色
            const gray: RGBAColor = { r: 128, g: 128, b: 128, a: 255 };

            // Act: 计算亮度
            const result = getLuminance(gray);

            // Assert: 验证亮度值在0和1之间
            expect(result).toBeGreaterThan(0);
            expect(result).toBeLessThan(1);
            expect(result).toBeCloseTo(0.22, 1);
          });

          it('Then should handle red color correctly', () => {
            // Arrange: 准备红色
            const red: RGBAColor = { r: 255, g: 0, b: 0, a: 255 };

            // Act: 计算亮度
            const result = getLuminance(red);

            // Assert: 验证红色亮度
            expect(result).toBeCloseTo(0.21, 1);
          });
        });
      });
    });

    describe('getContrast', () => {
      describe('Given two colors', () => {
        describe('When calculating contrast ratio', () => {
          it('Then should return maximum contrast for black and white', () => {
            // Arrange: 准备黑色和白色
            const black: RGBAColor = { r: 0, g: 0, b: 0, a: 255 };
            const white: RGBAColor = { r: 255, g: 255, b: 255, a: 255 };

            // Act: 计算对比度
            const result = getContrast(black, white);

            // Assert: 验证最大对比度
            expect(result).toBeCloseTo(21, 0);
          });

          it('Then should return 1 for identical colors', () => {
            // Arrange: 准备相同颜色
            const color: RGBAColor = { r: 128, g: 128, b: 128, a: 255 };

            // Act: 计算对比度
            const result = getContrast(color, color);

            // Assert: 验证对比度为1
            expect(result).toBeCloseTo(1, 2);
          });

          it('Then should be symmetric', () => {
            // Arrange: 准备两种不同颜色
            const red: RGBAColor = { r: 255, g: 0, b: 0, a: 255 };
            const blue: RGBAColor = { r: 0, g: 0, b: 255, a: 255 };

            // Act: 计算双向对比度
            const contrast1 = getContrast(red, blue);
            const contrast2 = getContrast(blue, red);

            // Assert: 验证对称性
            expect(contrast1).toBeCloseTo(contrast2, 2);
          });
        });
      });
    });
  });

  describe('Color Operations', () => {
    describe('lerpColor', () => {
      describe('Given two colors and interpolation factor', () => {
        describe('When interpolating colors', () => {
          it('Then should return first color when t=0', () => {
            // Arrange: 准备两种颜色和插值因子
            const color1: RGBAColor = { r: 255, g: 0, b: 0, a: 255 };
            const color2: RGBAColor = { r: 0, g: 255, b: 0, a: 255 };
            const t = 0;

            // Act: 插值颜色
            const result = lerpColor(color1, color2, t);

            // Assert: 验证返回第一种颜色
            expect(result).toEqual(color1);
          });

          it('Then should return second color when t=1', () => {
            // Arrange: 准备两种颜色和插值因子
            const color1: RGBAColor = { r: 255, g: 0, b: 0, a: 255 };
            const color2: RGBAColor = { r: 0, g: 255, b: 0, a: 255 };
            const t = 1;

            // Act: 插值颜色
            const result = lerpColor(color1, color2, t);

            // Assert: 验证返回第二种颜色
            expect(result).toEqual(color2);
          });

          it('Then should return interpolated color when t=0.5', () => {
            // Arrange: 准备两种颜色和插值因子
            const color1: RGBAColor = { r: 255, g: 0, b: 0, a: 255 };
            const color2: RGBAColor = { r: 0, g: 255, b: 0, a: 255 };
            const t = 0.5;

            // Act: 插值颜色
            const result = lerpColor(color1, color2, t);

            // Assert: 验证插值结果
            expect(result).toEqual({ r: 128, g: 128, b: 0, a: 255 });
          });

          it('Then should interpolate alpha channel correctly', () => {
            // Arrange: 准备带透明度的颜色
            const color1: RGBAColor = { r: 255, g: 0, b: 0, a: 0 };
            const color2: RGBAColor = { r: 0, g: 255, b: 0, a: 255 };
            const t = 0.5;

            // Act: 插值颜色
            const result = lerpColor(color1, color2, t);

            // Assert: 验证透明度插值
            expect(result.a).toBe(128);
          });
        });
      });
    });

    describe('blendColors', () => {
      describe('Given base and overlay colors', () => {
        describe('When blending in normal mode', () => {
          it('Then should blend colors with alpha correctly', () => {
            // Arrange: 准备基色和覆盖色
            const baseColor: RGBAColor = { r: 255, g: 0, b: 0, a: 255 };
            const overlayColor: RGBAColor = { r: 0, g: 255, b: 0, a: 128 };

            // Act: 混合颜色
            const result = blendColors(baseColor, overlayColor, 'normal');

            // Assert: 验证混合结果
            expect(result.r).toBe(128);
            expect(result.g).toBe(128);
            expect(result.b).toBe(0);
            expect(result.a).toBe(255);
          });

          it('Then should handle fully opaque overlay', () => {
            // Arrange: 准备基色和不透明覆盖色
            const baseColor: RGBAColor = { r: 255, g: 0, b: 0, a: 255 };
            const overlayColor: RGBAColor = { r: 0, g: 255, b: 0, a: 255 };

            // Act: 混合颜色
            const result = blendColors(baseColor, overlayColor, 'normal');

            // Assert: 验证返回覆盖色
            expect(result).toEqual(overlayColor);
          });

          it('Then should handle fully transparent overlay', () => {
            // Arrange: 准备基色和透明覆盖色
            const baseColor: RGBAColor = { r: 255, g: 0, b: 0, a: 255 };
            const overlayColor: RGBAColor = { r: 0, g: 255, b: 0, a: 0 };

            // Act: 混合颜色
            const result = blendColors(baseColor, overlayColor, 'normal');

            // Assert: 验证返回基色
            expect(result).toEqual(baseColor);
          });
        });

        describe('When blending in multiply mode', () => {
          it('Then should multiply color channels correctly', () => {
            // Arrange: 准备基色和覆盖色
            const baseColor: RGBAColor = { r: 255, g: 128, b: 64, a: 255 };
            const overlayColor: RGBAColor = { r: 128, g: 255, b: 192, a: 255 };

            // Act: 正片叠底混合
            const result = blendColors(baseColor, overlayColor, 'multiply');

            // Assert: 验证正片叠底结果
            expect(result.r).toBe(128); // 255 * 128 / 255
            expect(result.g).toBe(128); // 128 * 255 / 255
            expect(result.b).toBe(48);  // 64 * 192 / 255
          });
        });

        describe('When blending in screen mode', () => {
          it('Then should screen color channels correctly', () => {
            // Arrange: 准备基色和覆盖色
            const baseColor: RGBAColor = { r: 128, g: 64, b: 32, a: 255 };
            const overlayColor: RGBAColor = { r: 64, g: 128, b: 192, a: 255 };

            // Act: 滤色混合
            const result = blendColors(baseColor, overlayColor, 'screen');

            // Assert: 验证滤色结果
            expect(result.r).toBe(160); // 255 - (255-128)*(255-64)/255
            expect(result.g).toBe(160); // 255 - (255-64)*(255-128)/255
            expect(result.b).toBe(207); // 255 - (255-32)*(255-192)/255
          });
        });

        describe('When blending in overlay mode', () => {
          it('Then should overlay color channels correctly', () => {
            // Arrange: 准备基色和覆盖色
            const baseColor: RGBAColor = { r: 100, g: 200, b: 150, a: 255 };
            const overlayColor: RGBAColor = { r: 50, g: 100, b: 200, a: 255 };

            // Act: 叠加混合
            const result = blendColors(baseColor, overlayColor, 'overlay');

            // Assert: 验证叠加结果（基于基色亮度选择正片叠底或滤色）
            expect(result.r).toBeGreaterThanOrEqual(0);
            expect(result.r).toBeLessThanOrEqual(255);
            expect(result.g).toBeGreaterThanOrEqual(0);
            expect(result.g).toBeLessThanOrEqual(255);
            expect(result.b).toBeGreaterThanOrEqual(0);
            expect(result.b).toBeLessThanOrEqual(255);
          });
        });
      });
    });
  });

  describe('Color Format Conversions', () => {
    describe('normalizeColor', () => {
      describe('Given RGBA color', () => {
        describe('When normalizing to 0-1 range', () => {
          it('Then should normalize color values correctly', () => {
            // Arrange: 准备RGBA颜色
            const color: RGBAColor = { r: 255, g: 128, b: 64, a: 192 };

            // Act: 归一化颜色
            const result = normalizeColor(color);

            // Assert: 验证归一化结果
            expect(result).toEqual({
              r: 1.0,
              g: 128 / 255,
              b: 64 / 255,
              a: 192 / 255
            });
          });

          it('Then should handle edge values correctly', () => {
            // Arrange: 准备边界值颜色
            const color: RGBAColor = { r: 0, g: 255, b: 0, a: 255 };

            // Act: 归一化颜色
            const result = normalizeColor(color);

            // Assert: 验证边界值归一化
            expect(result).toEqual({ r: 0, g: 1, b: 0, a: 1 });
          });
        });
      });
    });

    describe('denormalizeColor', () => {
      describe('Given normalized RGBA color', () => {
        describe('When denormalizing to 0-255 range', () => {
          it('Then should denormalize color values correctly', () => {
            // Arrange: 准备归一化颜色
            const color: NormalizedRGBAColor = { r: 1.0, g: 0.5, b: 0.25, a: 0.75 };

            // Act: 反归一化颜色
            const result = denormalizeColor(color);

            // Assert: 验证反归一化结果
            expect(result).toEqual({
              r: 255,
              g: 128,
              b: 64,
              a: 192
            });
          });

          it('Then should handle edge values correctly', () => {
            // Arrange: 准备边界值归一化颜色
            const color: NormalizedRGBAColor = { r: 0, g: 1, b: 0, a: 1 };

            // Act: 反归一化颜色
            const result = denormalizeColor(color);

            // Assert: 验证边界值反归一化
            expect(result).toEqual({ r: 0, g: 255, b: 0, a: 255 });
          });
        });
      });
    });

    describe('colorToArray', () => {
      describe('Given RGBA color', () => {
        describe('When converting to array format', () => {
          it('Then should return correct array format', () => {
            // Arrange: 准备RGBA颜色
            const color: RGBAColor = { r: 255, g: 128, b: 64, a: 192 };

            // Act: 转换为数组
            const result = colorToArray(color);

            // Assert: 验证数组格式
            expect(result).toEqual([255, 128, 64, 192]);
            expect(Array.isArray(result)).toBe(true);
            expect(result.length).toBe(4);
          });
        });
      });
    });

    describe('colorToHex', () => {
      describe('Given RGBA color', () => {
        describe('When converting to hex format', () => {
          it('Then should convert to hex without alpha by default', () => {
            // Arrange: 准备RGBA颜色
            const color: RGBAColor = { r: 255, g: 128, b: 64, a: 192 };

            // Act: 转换为十六进制
            const result = colorToHex(color);

            // Assert: 验证十六进制格式
            expect(result).toBe('#ff8040');
          });

          it('Then should include alpha when requested', () => {
            // Arrange: 准备RGBA颜色
            const color: RGBAColor = { r: 255, g: 128, b: 64, a: 192 };

            // Act: 转换为包含透明度的十六进制
            const result = colorToHex(color, true);

            // Assert: 验证包含透明度的十六进制格式
            expect(result).toBe('#ff8040c0');
          });

          it('Then should handle edge values correctly', () => {
            // Arrange: 准备边界值颜色
            const black: RGBAColor = { r: 0, g: 0, b: 0, a: 0 };
            const white: RGBAColor = { r: 255, g: 255, b: 255, a: 255 };

            // Act: 转换边界值
            const blackHex = colorToHex(black);
            const whiteHex = colorToHex(white);
            const blackHexAlpha = colorToHex(black, true);
            const whiteHexAlpha = colorToHex(white, true);

            // Assert: 验证边界值转换
            expect(blackHex).toBe('#000000');
            expect(whiteHex).toBe('#ffffff');
            expect(blackHexAlpha).toBe('#00000000');
            expect(whiteHexAlpha).toBe('#ffffffff');
          });
        });
      });
    });

    describe('colorToCss', () => {
      describe('Given RGBA color', () => {
        describe('When converting to CSS format', () => {
          it('Then should convert to rgba format by default', () => {
            // Arrange: 准备RGBA颜色
            const color: RGBAColor = { r: 255, g: 128, b: 64, a: 192 };

            // Act: 转换为CSS格式
            const result = colorToCss(color);

            // Assert: 验证RGBA CSS格式
            expect(result).toBe('rgba(255, 128, 64, 0.75)');
          });

          it('Then should convert to rgb format when specified', () => {
            // Arrange: 准备RGBA颜色
            const color: RGBAColor = { r: 255, g: 128, b: 64, a: 255 };

            // Act: 转换为RGB CSS格式
            const result = colorToCss(color, 'rgb');

            // Assert: 验证RGB CSS格式
            expect(result).toBe('rgb(255, 128, 64)');
          });

          it('Then should convert to hex format when specified', () => {
            // Arrange: 准备RGBA颜色
            const color: RGBAColor = { r: 255, g: 128, b: 64, a: 255 };

            // Act: 转换为十六进制CSS格式
            const result = colorToCss(color, 'hex');

            // Assert: 验证十六进制CSS格式
            expect(result).toBe('#ff8040');
          });

          it('Then should convert to hsl format when specified', () => {
            // Arrange: 准备RGBA颜色
            const color: RGBAColor = { r: 255, g: 128, b: 64, a: 255 };

            // Act: 转换为HSL CSS格式
            const result = colorToCss(color, 'hsl');

            // Assert: 验证HSL CSS格式
            expect(result).toMatch(/^hsl\(\d+, \d+%, \d+%\)$/);
          });
        });
      });
    });
  });
});