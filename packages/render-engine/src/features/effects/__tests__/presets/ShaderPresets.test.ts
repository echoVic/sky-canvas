/**
 * ShaderPresets 单元测试
 */

import { ShaderPreset, ShaderPresets } from '../../presets/ShaderPresets';
import { FilterType } from '../../types/FilterTypes';

describe('ShaderPresets', () => {
  beforeEach(() => {
    // 清空预设并重新初始化
    ShaderPresets.clear();
    ShaderPresets.initialize();
  });
  
  describe('initialize', () => {
    it('应该初始化默认预设', () => {
      const allPresets = ShaderPresets.getAllPresets();
      
      expect(allPresets.length).toBeGreaterThan(0);
      
      // 检查是否包含基础预设
      const identityPreset = ShaderPresets.getPreset('identity');
      expect(identityPreset).toBeDefined();
      expect(identityPreset?.name).toBe('原图');
      expect(identityPreset?.category).toBe('基础');
      
      const invertPreset = ShaderPresets.getPreset('invert');
      expect(invertPreset).toBeDefined();
      expect(invertPreset?.name).toBe('颜色反转');
    });
  });
  
  describe('registerPreset', () => {
    it('应该能够注册新的预设', () => {
      const testPreset: ShaderPreset = {
        id: 'test-preset',
        name: '测试预设',
        description: '这是一个测试预设',
        category: '测试',
        parameters: {
          type: FilterType.CUSTOM_SHADER,
          vertexShader: 'test vertex shader',
          fragmentShader: 'test fragment shader',
          uniforms: {},
          enabled: true,
          opacity: 1
        }
      };
      
      ShaderPresets.registerPreset(testPreset);
      
      const retrievedPreset = ShaderPresets.getPreset('test-preset');
      expect(retrievedPreset).toBeDefined();
      expect(retrievedPreset?.name).toBe('测试预设');
      expect(retrievedPreset?.category).toBe('测试');
    });
    
    it('应该覆盖已存在的预设', () => {
      const preset1: ShaderPreset = {
        id: 'duplicate',
        name: '预设1',
        description: '第一个预设',
        category: '测试',
        parameters: {
          type: FilterType.CUSTOM_SHADER,
          vertexShader: 'shader1',
          fragmentShader: 'shader1',
          uniforms: {},
          enabled: true,
          opacity: 1
        }
      };
      
      const preset2: ShaderPreset = {
        id: 'duplicate',
        name: '预设2',
        description: '第二个预设',
        category: '测试',
        parameters: {
          type: FilterType.CUSTOM_SHADER,
          vertexShader: 'shader2',
          fragmentShader: 'shader2',
          uniforms: {},
          enabled: true,
          opacity: 1
        }
      };
      
      ShaderPresets.registerPreset(preset1);
      ShaderPresets.registerPreset(preset2);
      
      const retrievedPreset = ShaderPresets.getPreset('duplicate');
      expect(retrievedPreset?.name).toBe('预设2');
      expect(retrievedPreset?.description).toBe('第二个预设');
    });
  });
  
  describe('getPreset', () => {
    it('应该返回存在的预设', () => {
      const preset = ShaderPresets.getPreset('identity');
      
      expect(preset).toBeDefined();
      expect(preset?.id).toBe('identity');
      expect(preset?.parameters.type).toBe(FilterType.CUSTOM_SHADER);
      expect(preset?.parameters.vertexShader).toBeDefined();
      expect(preset?.parameters.fragmentShader).toBeDefined();
    });
    
    it('应该对不存在的预设返回undefined', () => {
      const preset = ShaderPresets.getPreset('non-existent');
      
      expect(preset).toBeUndefined();
    });
  });
  
  describe('getAllPresets', () => {
    it('应该返回所有预设的数组', () => {
      const allPresets = ShaderPresets.getAllPresets();
      
      expect(Array.isArray(allPresets)).toBe(true);
      expect(allPresets.length).toBeGreaterThan(0);
      
      // 检查每个预设都有必需的属性
      allPresets.forEach(preset => {
        expect(preset.id).toBeDefined();
        expect(preset.name).toBeDefined();
        expect(preset.description).toBeDefined();
        expect(preset.category).toBeDefined();
        expect(preset.parameters).toBeDefined();
        expect(preset.parameters.type).toBe(FilterType.CUSTOM_SHADER);
      });
    });
  });
  
  describe('getPresetsByCategory', () => {
    it('应该返回指定类别的预设', () => {
      const basicPresets = ShaderPresets.getPresetsByCategory('基础');
      
      expect(Array.isArray(basicPresets)).toBe(true);
      expect(basicPresets.length).toBeGreaterThan(0);
      
      // 检查所有预设都属于指定类别
      basicPresets.forEach(preset => {
        expect(preset.category).toBe('基础');
      });
    });
    
    it('应该对不存在的类别返回空数组', () => {
      const nonExistentPresets = ShaderPresets.getPresetsByCategory('不存在的类别');
      
      expect(Array.isArray(nonExistentPresets)).toBe(true);
      expect(nonExistentPresets.length).toBe(0);
    });
  });
  
  describe('getCategories', () => {
    it('应该返回所有类别的数组', () => {
      const categories = ShaderPresets.getCategories();
      
      expect(Array.isArray(categories)).toBe(true);
      expect(categories.length).toBeGreaterThan(0);
      expect(categories).toContain('基础');
      
      // 检查类别数组不包含重复项
      const uniqueCategories = [...new Set(categories)];
      expect(categories.length).toBe(uniqueCategories.length);
    });
  });
  
  describe('searchPresets', () => {
    it('应该能够按名称搜索预设', () => {
      const results = ShaderPresets.searchPresets('原图');
      
      expect(Array.isArray(results)).toBe(true);
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].name).toContain('原图');
    });
    
    it('应该能够按描述搜索预设', () => {
      const results = ShaderPresets.searchPresets('反转');
      
      expect(Array.isArray(results)).toBe(true);
      // 应该找到包含"反转"相关描述的预设
    });
    
    it('应该对空查询返回所有预设', () => {
      const results = ShaderPresets.searchPresets('');
      const allPresets = ShaderPresets.getAllPresets();
      
      expect(Array.isArray(results)).toBe(true);
      expect(results.length).toBe(allPresets.length);
    });
    
    it('应该对不匹配的查询返回空数组', () => {
      const results = ShaderPresets.searchPresets('不存在的预设名称');
      
      expect(Array.isArray(results)).toBe(true);
      expect(results.length).toBe(0);
    });
  });
  
  describe('removePreset', () => {
    it('应该能够删除存在的预设', () => {
      // 先添加一个测试预设
      const testPreset: ShaderPreset = {
        id: 'to-be-removed',
        name: '待删除预设',
        description: '这个预设将被删除',
        category: '测试',
        parameters: {
          type: FilterType.CUSTOM_SHADER,
          vertexShader: 'test',
          fragmentShader: 'test',
          uniforms: {},
          enabled: true,
          opacity: 1
        }
      };
      
      ShaderPresets.registerPreset(testPreset);
      expect(ShaderPresets.getPreset('to-be-removed')).toBeDefined();
      
      // 删除预设
      const removed = ShaderPresets.removePreset('to-be-removed');
      expect(removed).toBe(true);
      expect(ShaderPresets.getPreset('to-be-removed')).toBeUndefined();
    });
    
    it('应该对不存在的预设返回false', () => {
      const removed = ShaderPresets.removePreset('non-existent');
      
      expect(removed).toBe(false);
    });
  });
  
  describe('clear', () => {
    it('应该清空所有预设', () => {
      // 确保有预设存在
      expect(ShaderPresets.getAllPresets().length).toBeGreaterThan(0);
      
      // 清空预设
      ShaderPresets.clear();
      
      // 验证已清空
      expect(ShaderPresets.getAllPresets().length).toBe(0);
      expect(ShaderPresets.getCategories().length).toBe(0);
    });
  });
  
  describe('预设数据完整性', () => {
    it('所有预设都应该有有效的着色器代码', () => {
      const allPresets = ShaderPresets.getAllPresets();
      
      allPresets.forEach(preset => {
        expect(preset.parameters.vertexShader).toBeDefined();
        expect(preset.parameters.fragmentShader).toBeDefined();
        expect(typeof preset.parameters.vertexShader).toBe('string');
        expect(typeof preset.parameters.fragmentShader).toBe('string');
        expect(preset.parameters.vertexShader.length).toBeGreaterThan(0);
        expect(preset.parameters.fragmentShader.length).toBeGreaterThan(0);
      });
    });
    
    it('所有预设都应该有有效的基础属性', () => {
      const allPresets = ShaderPresets.getAllPresets();
      
      allPresets.forEach(preset => {
        expect(preset.id).toBeDefined();
        expect(preset.name).toBeDefined();
        expect(preset.description).toBeDefined();
        expect(preset.category).toBeDefined();
        expect(typeof preset.id).toBe('string');
        expect(typeof preset.name).toBe('string');
        expect(typeof preset.description).toBe('string');
        expect(typeof preset.category).toBe('string');
        expect(preset.id.length).toBeGreaterThan(0);
        expect(preset.name.length).toBeGreaterThan(0);
      });
    });
    
    it('所有预设的参数都应该有正确的类型', () => {
      const allPresets = ShaderPresets.getAllPresets();
      
      allPresets.forEach(preset => {
        expect(preset.parameters.type).toBe(FilterType.CUSTOM_SHADER);
        expect(preset.parameters.enabled).toBeDefined();
        expect(preset.parameters.opacity).toBeDefined();
        expect(typeof preset.parameters.enabled).toBe('boolean');
        expect(typeof preset.parameters.opacity).toBe('number');
        expect(preset.parameters.opacity).toBeGreaterThanOrEqual(0);
        expect(preset.parameters.opacity).toBeLessThanOrEqual(1);
      });
    });
  });
});