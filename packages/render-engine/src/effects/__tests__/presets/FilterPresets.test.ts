/**
 * FilterPresets 单元测试
 */

import { FilterPresets } from '../../presets/FilterPresets';
import { FilterType } from '../../types/FilterTypes';


describe('FilterPresets', () => {
  describe('getBrightnessPresets', () => {
    it('应该返回正确的亮度预设', () => {
      const presets = FilterPresets.getBrightnessPresets();
      
      expect(presets).toBeDefined();
      expect(typeof presets).toBe('object');
      
      // 检查预设名称
      expect(presets.subtle).toBeDefined();
      expect(presets.moderate).toBeDefined();
      expect(presets.strong).toBeDefined();
      expect(presets.dark).toBeDefined();
      
      // 检查subtle预设
      expect(presets.subtle.type).toBe(FilterType.BRIGHTNESS);
      expect((presets.subtle as any).brightness).toBe(10);
      expect(presets.subtle.enabled).toBe(true);
      expect(presets.subtle.opacity).toBe(1);
      
      // 检查dark预设
      expect((presets.dark as any).brightness).toBe(-30);
    });
    
    it('应该返回不可变的预设对象', () => {
      const presets1 = FilterPresets.getBrightnessPresets();
      const presets2 = FilterPresets.getBrightnessPresets();
      
      expect(presets1).not.toBe(presets2);
      expect(presets1).toEqual(presets2);
    });
  });
  
  describe('getContrastPresets', () => {
    it('应该返回正确的对比度预设', () => {
      const presets = FilterPresets.getContrastPresets();
      
      expect(presets).toBeDefined();
      expect(presets.subtle).toBeDefined();
      expect(presets.moderate).toBeDefined();
      expect(presets.strong).toBeDefined();
      
      // 检查类型
      expect(presets.subtle.type).toBe(FilterType.CONTRAST);
      expect((presets.subtle as any).contrast).toBeDefined();
      expect(typeof (presets.subtle as any).contrast).toBe('number');
    });
  });
  
  describe('getSaturationPresets', () => {
    it('应该返回正确的饱和度预设', () => {
      const presets = FilterPresets.getSaturationPresets();
      
      expect(presets).toBeDefined();
      expect(presets.subtle).toBeDefined();
      expect(presets.moderate).toBeDefined();
      expect(presets.strong).toBeDefined();
      expect(presets.desaturated).toBeDefined();
      
      // 检查类型
      expect(presets.subtle.type).toBe(FilterType.SATURATION);
      expect((presets.subtle as any).saturation).toBeDefined();
      expect(typeof (presets.subtle as any).saturation).toBe('number');
    });
  });
  
  describe('getBlurPresets', () => {
    it('应该返回正确的模糊预设', () => {
      const presets = FilterPresets.getBlurPresets();
      
      expect(presets.subtle).toBeDefined();
      expect(presets.moderate).toBeDefined();
      expect(presets.strong).toBeDefined();
      expect(presets.heavy).toBeDefined();
      
      // 检查类型
      expect(presets.subtle.type).toBe(FilterType.GAUSSIAN_BLUR);
      expect((presets.subtle as any).radius).toBeDefined();
      expect(typeof (presets.subtle as any).radius).toBe('number');
      expect((presets.subtle as any).radius).toBeGreaterThan(0);
    });
  });
  
  describe('getGlowPresets', () => {
    it('应该返回正确的发光预设', () => {
      const presets = FilterPresets.getGlowPresets();
      
      expect(presets).toBeDefined();
      expect(presets.subtle).toBeDefined();
      expect(presets.moderate).toBeDefined();
      expect(presets.strong).toBeDefined();
      expect(presets.colored).toBeDefined();
      
      // 检查类型
      expect(presets.subtle.type).toBe(FilterType.GLOW);
      expect((presets.subtle as any).color).toBeDefined();
      expect((presets.subtle as any).blur).toBeDefined();
      expect((presets.subtle as any).strength).toBeDefined();
      expect(typeof (presets.subtle as any).color).toBe('string');
    });
  });
  
  describe('getDropShadowPresets', () => {
    it('应该返回正确的阴影预设', () => {
      const presets = FilterPresets.getDropShadowPresets();
      
      expect(presets).toBeDefined();
      expect(presets.subtle).toBeDefined();
      expect(presets.moderate).toBeDefined();
      expect(presets.strong).toBeDefined();
      
      // 检查类型
      expect(presets.subtle.type).toBe(FilterType.DROP_SHADOW);
      expect((presets.subtle as any).offsetX).toBeDefined();
      expect((presets.subtle as any).offsetY).toBeDefined();
      expect((presets.subtle as any).blur).toBeDefined();
      expect((presets.subtle as any).color).toBeDefined();
    });
  });
  
  describe('getArtisticPresets', () => {
    it('应该返回正确的艺术效果预设', () => {
      const presets = FilterPresets.getArtisticPresets();
      
      expect(presets).toBeDefined();
      expect(presets.vintage).toBeDefined();
      expect(presets.sepia).toBeDefined();
      expect(presets.grayscale).toBeDefined();
      expect(presets.invert).toBeDefined();
      
      // 检查vintage预设
      expect((presets.vintage as any).type).toBe(FilterType.SEPIA);
      expect((presets.vintage as any).amount).toBeDefined();
      expect(typeof (presets.vintage as any).amount).toBe('number');
    });
  });
  
  describe('getAllPresets', () => {
    it('应该返回所有预设类别', () => {
      const allPresets = FilterPresets.getAllPresets();
      
      expect(allPresets).toBeDefined();
      expect(typeof allPresets).toBe('object');
      
      // 检查是否包含所有类别
      expect(allPresets.brightness).toBeDefined();
      expect(allPresets.contrast).toBeDefined();
      expect(allPresets.saturation).toBeDefined();
      expect(allPresets.blur).toBeDefined();
      expect(allPresets.glow).toBeDefined();
      expect(allPresets.dropShadow).toBeDefined();
      expect(allPresets.artistic).toBeDefined();
    });
    
    it('每个类别都应该包含预设', () => {
      const allPresets = FilterPresets.getAllPresets();
      
      Object.values(allPresets).forEach(categoryPresets => {
        expect(typeof categoryPresets).toBe('object');
        expect(Object.keys(categoryPresets).length).toBeGreaterThan(0);
      });
    });
  });
  
  describe('getPresetsByType', () => {
    it('应该返回指定类型的预设', () => {
      const brightnessPresets = FilterPresets.getPresetsByType('brightness');
      
      expect(brightnessPresets).toBeDefined();
      expect(brightnessPresets).toEqual(FilterPresets.getBrightnessPresets());
    });
    
    it('应该对不存在的类型返回undefined', () => {
      const invalidPresets = FilterPresets.getPresetsByType('invalid');
      
      expect(invalidPresets).toBeUndefined();
    });
  });
  
  describe('getPreset', () => {
    it('应该返回指定的预设', () => {
      const preset = FilterPresets.getPreset('brightness', 'subtle');
      
      expect(preset).toBeDefined();
      expect(preset?.type).toBe(FilterType.BRIGHTNESS);
      expect((preset as any)?.brightness).toBe(10);
    });
    
    it('应该对不存在的预设返回undefined', () => {
      const invalidPreset = FilterPresets.getPreset('brightness', 'invalid');
      const invalidType = FilterPresets.getPreset('invalid', 'subtle');
      
      expect(invalidPreset).toBeUndefined();
      expect(invalidType).toBeUndefined();
    });
  });
  
  describe('预设数据完整性', () => {
    it('所有预设都应该有必需的属性', () => {
      const allPresets = FilterPresets.getAllPresets();
      
      Object.values(allPresets).forEach(categoryPresets => {
        Object.values(categoryPresets).forEach(preset => {
          expect(preset.type).toBeDefined();
          expect(preset.enabled).toBeDefined();
          expect(preset.opacity).toBeDefined();
          expect(typeof preset.enabled).toBe('boolean');
          expect(typeof preset.opacity).toBe('number');
          expect(preset.opacity).toBeGreaterThanOrEqual(0);
          expect(preset.opacity).toBeLessThanOrEqual(1);
        });
      });
    });
    
    it('所有预设的类型应该与其类别匹配', () => {
      const brightnessPresets = FilterPresets.getBrightnessPresets();
      Object.values(brightnessPresets).forEach(preset => {
        expect(preset.type).toBe(FilterType.BRIGHTNESS);
      });
      
      const contrastPresets = FilterPresets.getContrastPresets();
      Object.values(contrastPresets).forEach(preset => {
        expect(preset.type).toBe(FilterType.CONTRAST);
      });
    });
  });
});