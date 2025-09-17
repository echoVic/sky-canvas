/**
 * Utils 模块导出测试
 */

import * as UtilsModule from '../index';
import * as ObjectUtils from '../ObjectUtils';
import * as ColorUtils from '../ColorUtils';

describe('Utils Module Exports', () => {
  describe('ObjectUtils 导出', () => {
    it('应该正确导出所有 ObjectUtils 函数', () => {
      // Arrange
      const expectedObjectUtilsFunctions = [
        'getNestedProperty',
        'setNestedProperty',
        'getNestedPropertySafe',
        'hasNestedProperty',
        'deleteNestedProperty',
        'deepClone',
        'deepMerge',
        'getObjectPaths',
        'compareNestedProperty'
      ];

      // Act & Assert
      expectedObjectUtilsFunctions.forEach(funcName => {
        expect((UtilsModule as any)[funcName]).toBeDefined();
        expect(typeof (UtilsModule as any)[funcName]).toBe('function');
        expect((UtilsModule as any)[funcName]).toBe((ObjectUtils as any)[funcName]);
      });
    });
  });

  describe('ColorUtils 导出', () => {
    it('应该正确导出所有 ColorUtils 函数', () => {
      // Arrange
      const expectedColorUtilsFunctions = [
        'parseColor',
        'rgbToHsl',
        'hslToRgb',
        'rgbToHsv',
        'hsvToRgb',
        'getLuminance',
        'getContrast',
        'lerpColor',
        'blendColors',
        'normalizeColor',
        'denormalizeColor',
        'colorToArray',
        'colorToHex',
        'colorToCss'
      ];

      // Act & Assert
      expectedColorUtilsFunctions.forEach(funcName => {
        expect((UtilsModule as any)[funcName]).toBeDefined();
        expect(typeof (UtilsModule as any)[funcName]).toBe('function');
        expect((UtilsModule as any)[funcName]).toBe((ColorUtils as any)[funcName]);
      });
    });

    // Note: NAMED_COLORS is not exported from ColorUtils module
  });

  describe('模块完整性检查', () => {
    it('应该导出所有预期的函数和常量', () => {
      // Arrange
      const expectedExports = [
        // ObjectUtils functions
        'getNestedProperty',
        'setNestedProperty',
        'getNestedPropertySafe',
        'hasNestedProperty',
        'deleteNestedProperty',
        'deepClone',
        'deepMerge',
        'getObjectPaths',
        'compareNestedProperty',
        // ColorUtils functions
        'parseColor',
        'rgbToHsl',
        'hslToRgb',
        'rgbToHsv',
        'hsvToRgb',
        'getLuminance',
        'getContrast',
        'lerpColor',
        'blendColors',
        'normalizeColor',
        'denormalizeColor',
        'colorToArray',
        'colorToHex',
        'colorToCss',
        // Note: No constants are exported from ColorUtils
      ];

      // Act
      const actualExports = Object.keys(UtilsModule);

      // Assert
      expectedExports.forEach(exportName => {
        expect(actualExports).toContain(exportName);
      });
    });

    it('应该不包含意外的导出', () => {
      // Arrange
      const expectedExports = [
        // ObjectUtils functions
        'getNestedProperty',
        'setNestedProperty',
        'getNestedPropertySafe',
        'hasNestedProperty',
        'deleteNestedProperty',
        'deepClone',
        'deepMerge',
        'getObjectPaths',
        'compareNestedProperty',
        // ColorUtils functions
        'parseColor',
        'rgbToHsl',
        'hslToRgb',
        'rgbToHsv',
        'hsvToRgb',
        'getLuminance',
        'getContrast',
        'lerpColor',
        'blendColors',
        'normalizeColor',
        'denormalizeColor',
        'colorToArray',
        'colorToHex',
        'colorToCss',
        // Note: No constants are exported from ColorUtils
      ];

      // Act
      const actualExports = Object.keys(UtilsModule);

      // Assert
      actualExports.forEach(exportName => {
        expect(expectedExports).toContain(exportName);
      });
    });
  });

  describe('导出类型检查', () => {
    it('所有函数导出应该是函数类型', () => {
      // Arrange
      const functionExports = [
        'getNestedProperty',
        'setNestedProperty',
        'getNestedPropertySafe',
        'hasNestedProperty',
        'deleteNestedProperty',
        'deepClone',
        'deepMerge',
        'getObjectPaths',
        'compareNestedProperty',
        'parseColor',
        'rgbToHsl',
        'hslToRgb',
        'rgbToHsv',
        'hsvToRgb',
        'getLuminance',
        'getContrast',
        'lerpColor',
        'blendColors',
        'normalizeColor',
        'denormalizeColor',
        'colorToArray',
        'colorToHex',
        'colorToCss'
      ];

      // Act & Assert
      functionExports.forEach(funcName => {
        expect(typeof (UtilsModule as any)[funcName]).toBe('function');
      });
    });

    // Note: No constants are exported from utils modules
  });

  describe('重新导出验证', () => {
    it('ObjectUtils 重新导出应该与原模块一致', () => {
      // Arrange
      const objectUtilsKeys = Object.keys(ObjectUtils);

      // Act & Assert
      objectUtilsKeys.forEach(key => {
        expect((UtilsModule as any)[key]).toBe((ObjectUtils as any)[key]);
      });
    });

    it('ColorUtils 重新导出应该与原模块一致', () => {
      // Arrange
      const colorUtilsKeys = Object.keys(ColorUtils).filter(key => key !== 'default');

      // Act & Assert
      colorUtilsKeys.forEach(key => {
        expect((UtilsModule as any)[key]).toBe((ColorUtils as any)[key]);
      });
    });
  });
});