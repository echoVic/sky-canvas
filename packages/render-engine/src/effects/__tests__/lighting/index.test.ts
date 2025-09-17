import { describe, expect, it } from 'vitest';
import {
  // 类导出
  BaseLight,
  BaseShadow,
  DirectionalLight,
  DropShadow,
  // 类型导出
  LightType,
  LightingManager,
  PointLight,
  ShadowQuality,
  ShadowType,
  // 工厂函数
  createLight,
  createShadow
} from '../../index';

describe('Lighting Module Index', () => {
  describe('类型导出', () => {
    it('应该导出 LightType 枚举', () => {
      expect(LightType).toBeDefined();
      expect(LightType.DIRECTIONAL).toBeDefined();
      expect(LightType.POINT).toBeDefined();
    });

    it('应该导出 ShadowType 枚举', () => {
      expect(ShadowType).toBeDefined();
      expect(ShadowType.DROP_SHADOW).toBeDefined();
    });

    it('应该导出 ShadowQuality 枚举', () => {
      expect(ShadowQuality).toBeDefined();
      expect(ShadowQuality.LOW).toBeDefined();
      expect(ShadowQuality.MEDIUM).toBeDefined();
      expect(ShadowQuality.HIGH).toBeDefined();
    });
  });

  describe('类导出', () => {
    it('应该导出 BaseLight 类', () => {
      expect(BaseLight).toBeDefined();
      expect(typeof BaseLight).toBe('function');
    });

    it('应该导出 DirectionalLight 类', () => {
      expect(DirectionalLight).toBeDefined();
      expect(typeof DirectionalLight).toBe('function');
    });

    it('应该导出 PointLight 类', () => {
      expect(PointLight).toBeDefined();
      expect(typeof PointLight).toBe('function');
    });

    it('应该导出 BaseShadow 类', () => {
      expect(BaseShadow).toBeDefined();
      expect(typeof BaseShadow).toBe('function');
    });

    it('应该导出 DropShadow 类', () => {
      expect(DropShadow).toBeDefined();
      expect(typeof DropShadow).toBe('function');
    });

    it('应该导出 LightingManager 类', () => {
      expect(LightingManager).toBeDefined();
      expect(typeof LightingManager).toBe('function');
    });
  });

  describe('createLight 工厂函数', () => {
    it('应该创建方向光', () => {
      const config = {
        type: 'directional',
        enabled: true,
        color: '#ffffff',
        intensity: 1.0,
        direction: { x: 0, y: 0, z: -1 },
        shadowDistance: 100
      };

      const light = createLight(config);
      
      expect(light).toBeInstanceOf(DirectionalLight);
      expect(light.enabled).toBe(true);
    });

    it('应该创建点光源', () => {
      const config = {
        type: 'point',
        enabled: true,
        color: '#ffffff',
        intensity: 1.0,
        position: { x: 0, y: 0, z: 0 },
        radius: 100,
        constantAttenuation: 1.0,
        linearAttenuation: 0.1,
        quadraticAttenuation: 0.01
      };

      const light = createLight(config);
      
      expect(light).toBeInstanceOf(PointLight);
      expect(light.enabled).toBe(true);
    });

    it('应该抛出不支持的光源类型错误', () => {
      const config = {
        type: 'unsupported',
        enabled: true
      };

      expect(() => createLight(config)).toThrow('Unsupported light type: unsupported');
    });

    it('应该处理空配置', () => {
      expect(() => createLight({})).toThrow();
    });

    it('应该处理 null 配置', () => {
      expect(() => createLight(null)).toThrow();
    });
  });

  describe('createShadow 工厂函数', () => {
    it('应该创建投影阴影', () => {
      const config = {
        type: 'drop-shadow',
        enabled: true,
        color: '#000000',
        opacity: 0.5,
        blur: 5,
        spread: 0,
        quality: ShadowQuality.MEDIUM,
        offsetX: 2,
        offsetY: 2
      };

      const shadow = createShadow(config);
      
      expect(shadow).toBeInstanceOf(DropShadow);
      expect(shadow.enabled).toBe(true);
    });

    it('应该抛出不支持的阴影类型错误', () => {
      const config = {
        type: 'unsupported',
        enabled: true
      };

      expect(() => createShadow(config)).toThrow('Unsupported shadow type: unsupported');
    });

    it('应该处理空配置', () => {
      expect(() => createShadow({})).toThrow();
    });

    it('应该处理 null 配置', () => {
      expect(() => createShadow(null)).toThrow();
    });
  });

  describe('工厂函数集成测试', () => {
    it('应该能创建完整的光照场景', () => {
      // 创建多个光源
      const directionalLight = createLight({
        type: 'directional',
        enabled: true,
        color: '#ffffff',
        intensity: 0.8,
        direction: { x: 0, y: 0, z: -1 },
        shadowDistance: 100
      });

      const pointLight = createLight({
        type: 'point',
        enabled: true,
        color: '#ffff00',
        intensity: 1.2,
        position: { x: 10, y: 10, z: 5 },
        radius: 50,
        constantAttenuation: 1.0,
        linearAttenuation: 0.1,
        quadraticAttenuation: 0.01
      });

      // 创建阴影
      const dropShadow = createShadow({
        type: 'drop-shadow',
        enabled: true,
        color: '#000000',
        opacity: 0.3,
        blur: 8,
        spread: 0,
        quality: ShadowQuality.HIGH,
        offsetX: 3,
        offsetY: 3
      });

      expect(directionalLight).toBeInstanceOf(DirectionalLight);
      expect(pointLight).toBeInstanceOf(PointLight);
      expect(dropShadow).toBeInstanceOf(DropShadow);

      // 验证它们都是启用状态
      expect(directionalLight.enabled).toBe(true);
      expect(pointLight.enabled).toBe(true);
      expect(dropShadow.enabled).toBe(true);
    });

    it('应该能与 LightingManager 集成', () => {
      const manager = new LightingManager();

      // 使用工厂函数创建光源和阴影
      const light = createLight({
        type: 'directional',
        enabled: true,
        color: '#ffffff',
        intensity: 1.0,
        direction: { x: 0, y: 0, z: -1 },
        shadowDistance: 100
      });

      const shadow = createShadow({
        type: 'drop-shadow',
        enabled: true,
        color: '#000000',
        opacity: 0.5,
        blur: 5,
        spread: 0,
        quality: ShadowQuality.MEDIUM,
        offsetX: 2,
        offsetY: 2
      });

      // 添加到管理器
      manager.addLight(light);
      manager.addShadow(shadow);

      expect(manager.getLight(light.id)).toBe(light);
      expect(manager.getShadow(shadow.id)).toBe(shadow);
    });
  });

  describe('类型兼容性', () => {
    it('创建的光源应该符合基类接口', () => {
      const directionalLight = createLight({
        type: 'directional',
        enabled: true,
        color: '#ffffff',
        intensity: 1.0,
        direction: { x: 0, y: 0, z: -1 },
        shadowDistance: 100
      });

      // 应该有基类的所有属性和方法
      expect(directionalLight.id).toBeDefined();
      expect(directionalLight.enabled).toBeDefined();
      expect(directionalLight.config).toBeDefined();
      expect(typeof directionalLight.calculateLighting).toBe('function');
      expect(typeof directionalLight.clone).toBe('function');
      expect(typeof directionalLight.dispose).toBe('function');
    });

    it('创建的阴影应该符合基类接口', () => {
      const dropShadow = createShadow({
        type: 'drop-shadow',
        enabled: true,
        color: '#000000',
        opacity: 0.5,
        blur: 5,
        spread: 0,
        quality: ShadowQuality.MEDIUM,
        offsetX: 2,
        offsetY: 2
      });

      // 应该有基类的所有属性和方法
      expect(dropShadow.id).toBeDefined();
      expect(dropShadow.enabled).toBeDefined();
      expect(dropShadow.config).toBeDefined();
      expect(typeof dropShadow.render).toBe('function');
      expect(typeof dropShadow.clone).toBe('function');
      expect(typeof dropShadow.dispose).toBe('function');
    });
  });

  describe('错误处理', () => {
    it('应该处理不支持的光源类型', () => {
      const invalidTypeConfigs = [
        { type: 'unsupported' },
        { type: 'spot' },
        { type: 'area' }
      ];

      invalidTypeConfigs.forEach(config => {
        expect(() => createLight(config)).toThrow(`Unsupported light type: ${config.type}`);
      });
    });

    it('应该处理缺少类型的光源配置', () => {
      const noTypeConfigs = [
        { enabled: true },
        {},
        undefined,
        null
      ];

      noTypeConfigs.forEach(config => {
        expect(() => createLight(config)).toThrow();
      });
    });

    it('应该处理不支持的阴影类型', () => {
      const invalidTypeConfigs = [
        { type: 'inner-shadow' },
        { type: 'glow' },
        { type: 'unsupported' }
      ];

      invalidTypeConfigs.forEach(config => {
        expect(() => createShadow(config)).toThrow(`Unsupported shadow type: ${config.type}`);
      });
    });

    it('应该处理缺少类型的阴影配置', () => {
      const noTypeConfigs = [
        { enabled: true },
        {},
        undefined,
        null
      ];

      noTypeConfigs.forEach(config => {
        expect(() => createShadow(config)).toThrow();
      });
    });
  });

  describe('性能测试', () => {
    it('工厂函数应该快速创建对象', () => {
      const lightConfig = {
        type: 'directional',
        enabled: true,
        color: '#ffffff',
        intensity: 1.0,
        direction: { x: 0, y: 0, z: -1 },
        shadowDistance: 100
      };

      const shadowConfig = {
        type: 'drop-shadow',
        enabled: true,
        color: '#000000',
        opacity: 0.5,
        blur: 5,
        spread: 0,
        quality: ShadowQuality.MEDIUM,
        offsetX: 2,
        offsetY: 2
      };

      const startTime = performance.now();

      // 创建多个对象
      for (let i = 0; i < 100; i++) {
        createLight(lightConfig);
        createShadow(shadowConfig);
      }

      const endTime = performance.now();
      expect(endTime - startTime).toBeLessThan(100); // 应该在100ms内完成
    });
  });
});