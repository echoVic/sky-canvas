import { beforeEach, describe, expect, it } from 'vitest';
import { Point2D, Vector2D } from '../../../animation/types/PathTypes';
import { DirectionalLight, DirectionalLightConfig, LightType, MaterialProperties } from '../../lighting';


describe('DirectionalLight', () => {
  let directionalLight: DirectionalLight;
  let defaultConfig: DirectionalLightConfig;
  let defaultMaterial: MaterialProperties;

  beforeEach(() => {
    defaultConfig = {
      type: LightType.DIRECTIONAL,
      enabled: true,
      color: '#ffffff',
      intensity: 1.0,
      direction: { x: 0, y: -1 },
      castShadows: false,
      shadowDistance: 100
    };

    defaultMaterial = {
      ambient: 0.2,
      diffuse: 0.8,
      specular: 0.5,
      shininess: 32,
      roughness: 0.1,
      metallic: 0.0,
      emissive: '#000000',
      emissiveIntensity: 0.0
    };

    directionalLight = new DirectionalLight(defaultConfig);
  });

  describe('构造函数和基本属性', () => {
    it('应该正确初始化方向光', () => {
      expect(directionalLight.id).toBeDefined();
      expect(directionalLight.id).toMatch(/^light_[a-z0-9]+$/);
      expect(directionalLight.type).toBe(LightType.DIRECTIONAL);
      expect(directionalLight.enabled).toBe(true);
    });

    it('应该正确设置方向光配置', () => {
      const config = directionalLight.config as DirectionalLightConfig;
      expect(config.type).toBe(LightType.DIRECTIONAL);
      expect(config.direction).toEqual({ x: 0, y: -1 });
      expect(config.intensity).toBe(1.0);
      expect(config.color).toBe('#ffffff');
      expect(config.castShadows).toBe(false);
      expect(config.shadowDistance).toBe(100);
    });

    it('应该使用默认方向', () => {
      const configWithoutDirection = {
        type: LightType.DIRECTIONAL,
        enabled: true,
        color: '#ffffff',
        intensity: 1.0,
        castShadows: false,
        shadowDistance: 100
      } as DirectionalLightConfig;
      
      const light = new DirectionalLight(configWithoutDirection);
      const position: Point2D = { x: 0, y: 0 };
      const direction = light.getDirectionAtPoint(position);
      
      // 应该有默认方向
      expect(direction.x).toBeDefined();
      expect(direction.y).toBeDefined();
    });
  });

  describe('光照计算', () => {
    it('应该正确计算光照结果', () => {
      const position: Point2D = { x: 0, y: 0 };
      const normal: Vector2D = { x: 0, y: 1 };
      const viewDirection: Vector2D = { x: 0, y: 1 };
      
      const result = directionalLight.calculateLighting(position, normal, viewDirection, defaultMaterial);
      
      expect(result.ambient).toBeDefined();
      expect(result.diffuse).toBeDefined();
      expect(result.specular).toBeDefined();
      expect(result.final).toBeDefined();
      expect(result.intensity).toBe(1.0);
      
      // 检查颜色值范围
      expect(result.ambient.r).toBeGreaterThanOrEqual(0);
      expect(result.ambient.g).toBeGreaterThanOrEqual(0);
      expect(result.ambient.b).toBeGreaterThanOrEqual(0);
      
      expect(result.final.r).toBeGreaterThanOrEqual(0);
      expect(result.final.g).toBeGreaterThanOrEqual(0);
      expect(result.final.b).toBeGreaterThanOrEqual(0);
    });

    it('应该根据法线方向调整漫反射强度', () => {
      const position: Point2D = { x: 0, y: 0 };
      const viewDirection: Vector2D = { x: 0, y: 1 };
      
      // 法线朝向光源（向下）
      const normalToLight: Vector2D = { x: 0, y: -1 };
      const resultToLight = directionalLight.calculateLighting(position, normalToLight, viewDirection, defaultMaterial);
      
      // 法线背离光源（向上）
      const normalAwayLight: Vector2D = { x: 0, y: 1 };
      const resultAwayLight = directionalLight.calculateLighting(position, normalAwayLight, viewDirection, defaultMaterial);
      
      // 朝向光源的表面应该有更强的漫反射
      const towardIntensity = resultToLight.diffuse.r + resultToLight.diffuse.g + resultToLight.diffuse.b;
      const awayIntensity = resultAwayLight.diffuse.r + resultAwayLight.diffuse.g + resultAwayLight.diffuse.b;
      
      expect(towardIntensity).toBeGreaterThan(awayIntensity);
    });

    it('应该根据视角方向调整镜面反射', () => {
      const position: Point2D = { x: 0, y: 0 };
      const normal: Vector2D = { x: 0, y: 1 };
      
      // 视角朝向反射方向
      const viewToReflection: Vector2D = { x: 0, y: -1 };
      const resultToReflection = directionalLight.calculateLighting(position, normal, viewToReflection, defaultMaterial);
      
      // 视角背离反射方向
      const viewAwayReflection: Vector2D = { x: 0, y: 1 };
      const resultAwayReflection = directionalLight.calculateLighting(position, normal, viewAwayReflection, defaultMaterial);
      
      // 朝向反射方向的视角应该有更强的镜面反射
      const towardSpecular = resultToReflection.specular.r + resultToReflection.specular.g + resultToReflection.specular.b;
      const awaySpecular = resultAwayReflection.specular.r + resultAwayReflection.specular.g + resultAwayReflection.specular.b;
      
      expect(towardSpecular).toBeGreaterThanOrEqual(awaySpecular);
    });

    it('禁用时应该返回零光照', () => {
      directionalLight.enabled = false;
      
      const position: Point2D = { x: 0, y: 0 };
      const normal: Vector2D = { x: 0, y: 1 };
      const viewDirection: Vector2D = { x: 0, y: 1 };
      
      const result = directionalLight.calculateLighting(position, normal, viewDirection, defaultMaterial);
      
      expect(result.ambient.r).toBe(0);
      expect(result.ambient.g).toBe(0);
      expect(result.ambient.b).toBe(0);
      expect(result.diffuse.r).toBe(0);
      expect(result.diffuse.g).toBe(0);
      expect(result.diffuse.b).toBe(0);
      expect(result.specular.r).toBe(0);
      expect(result.specular.g).toBe(0);
      expect(result.specular.b).toBe(0);
      expect(result.final.r).toBe(0);
      expect(result.final.g).toBe(0);
      expect(result.final.b).toBe(0);
      expect(result.intensity).toBe(0);
    });

    it('应该正确处理不同光照强度', () => {
      const position: Point2D = { x: 0, y: 0 };
      const normal: Vector2D = { x: 0, y: -1 }; // 朝向光源
      const viewDirection: Vector2D = { x: 0, y: 1 };
      
      // 测试不同强度
      const intensities = [0.1, 0.5, 1.0, 2.0];
      const results = intensities.map(intensity => {
        const config = { ...defaultConfig, intensity };
        const light = new DirectionalLight(config);
        return light.calculateLighting(position, normal, viewDirection, defaultMaterial);
      });
      
      // 强度越高，最终光照应该越强
      for (let i = 1; i < results.length; i++) {
        const prevTotal = results[i-1].final.r + results[i-1].final.g + results[i-1].final.b;
        const currTotal = results[i].final.r + results[i].final.g + results[i].final.b;
        expect(currTotal).toBeGreaterThanOrEqual(prevTotal);
      }
    });
  });

  describe('点光照检测', () => {
    it('启用时应该照亮所有点', () => {
      const positions: Point2D[] = [
        { x: 0, y: 0 },
        { x: 100, y: 100 },
        { x: -50, y: 50 },
        { x: 1000, y: -1000 }
      ];
      
      positions.forEach(position => {
        expect(directionalLight.isPointLit(position)).toBe(true);
      });
    });

    it('禁用时不应该照亮任何点', () => {
      directionalLight.enabled = false;
      
      const positions: Point2D[] = [
        { x: 0, y: 0 },
        { x: 100, y: 100 },
        { x: -50, y: 50 }
      ];
      
      positions.forEach(position => {
        expect(directionalLight.isPointLit(position)).toBe(false);
      });
    });
  });

  describe('强度和方向获取', () => {
    it('应该在所有点返回相同强度', () => {
      const positions: Point2D[] = [
        { x: 0, y: 0 },
        { x: 100, y: 100 },
        { x: -50, y: 50 },
        { x: 1000, y: -1000 }
      ];
      
      positions.forEach(position => {
        expect(directionalLight.getIntensityAtPoint(position)).toBe(1.0);
      });
    });

    it('应该在所有点返回相同方向', () => {
      const positions: Point2D[] = [
        { x: 0, y: 0 },
        { x: 100, y: 100 },
        { x: -50, y: 50 }
      ];
      
      const expectedDirection = { x: 0, y: -1 };
      
      positions.forEach(position => {
        const direction = directionalLight.getDirectionAtPoint(position);
        expect(direction.x).toBeCloseTo(expectedDirection.x, 5);
        expect(direction.y).toBeCloseTo(expectedDirection.y, 5);
      });
    });

    it('禁用时应该返回零强度', () => {
      directionalLight.enabled = false;
      
      const position: Point2D = { x: 0, y: 0 };
      expect(directionalLight.getIntensityAtPoint(position)).toBe(0);
    });
  });

  describe('阴影相关', () => {
    it('应该返回正确的阴影方向', () => {
      const shadowDirection = directionalLight.getShadowDirection();
      
      // 阴影方向应该与光照方向相反
      const lightDirection = directionalLight.getDirectionAtPoint({ x: 0, y: 0 });
      expect(shadowDirection.x).toBeCloseTo(-lightDirection.x, 5);
      expect(shadowDirection.y).toBeCloseTo(-lightDirection.y, 5);
    });

    it('应该返回正确的阴影距离', () => {
      const shadowDistance = directionalLight.getShadowDistance();
      expect(shadowDistance).toBe(100);
    });

    it('应该根据配置设置阴影投射', () => {
      const shadowConfig = { ...defaultConfig, castShadows: true };
      const shadowLight = new DirectionalLight(shadowConfig);
      
      const config = shadowLight.config as DirectionalLightConfig;
      expect(config.castShadows).toBe(true);
    });
  });

  describe('配置更新', () => {
    it('应该能够更新方向', () => {
      const newDirection = { x: 1, y: 0 };
      directionalLight.updateConfig({ direction: newDirection });
      
      const config = directionalLight.config as DirectionalLightConfig;
      expect(config.direction).toEqual(newDirection);
      
      const position: Point2D = { x: 0, y: 0 };
      const direction = directionalLight.getDirectionAtPoint(position);
      expect(direction.x).toBeCloseTo(1, 5);
      expect(direction.y).toBeCloseTo(0, 5);
    });

    it('应该能够更新阴影设置', () => {
      directionalLight.updateConfig({
        castShadows: true,
        shadowDistance: 200
      });
      
      const config = directionalLight.config as DirectionalLightConfig;
      expect(config.castShadows).toBe(true);
      expect(config.shadowDistance).toBe(200);
      expect(directionalLight.getShadowDistance()).toBe(200);
    });

    it('应该能够更新颜色和强度', () => {
      directionalLight.updateConfig({
        color: '#ff0000',
        intensity: 0.5
      });
      
      const config = directionalLight.config as DirectionalLightConfig;
      expect(config.color).toBe('#ff0000');
      expect(config.intensity).toBe(0.5);
      
      const position: Point2D = { x: 0, y: 0 };
      expect(directionalLight.getIntensityAtPoint(position)).toBe(0.5);
    });
  });

  describe('克隆', () => {
    it('应该能够克隆方向光', () => {
      const cloned = directionalLight.clone();
      
      expect(cloned).toBeInstanceOf(DirectionalLight);
      expect(cloned.id).not.toBe(directionalLight.id);
      expect(cloned.type).toBe(directionalLight.type);
      expect(cloned.config).toEqual(directionalLight.config);
    });

    it('克隆的光源应该独立工作', () => {
      const cloned = directionalLight.clone() as DirectionalLight;
      
      // 修改原光源
      directionalLight.updateConfig({ intensity: 0.5 });
      
      // 克隆的光源不应该受影响
      expect(cloned.config.intensity).toBe(1.0);
      expect(directionalLight.config.intensity).toBe(0.5);
    });
  });

  describe('边界值测试', () => {
    it('应该处理极端方向值', () => {
      const extremeDirections = [
        { x: 0, y: 0 },     // 零向量
        { x: 1000, y: 1000 }, // 大值
        { x: -1, y: -1 },   // 负值
        { x: 0.001, y: 0.001 } // 小值
      ];
      
      extremeDirections.forEach(direction => {
        const config = { ...defaultConfig, direction };
        const light = new DirectionalLight(config);
        
        const position: Point2D = { x: 0, y: 0 };
        expect(() => {
          light.getDirectionAtPoint(position);
        }).not.toThrow();
      });
    });

    it('应该处理极端强度值', () => {
      const extremeIntensities = [0, 0.001, 1000, -1];
      
      extremeIntensities.forEach(intensity => {
        const config = { ...defaultConfig, intensity };
        const light = new DirectionalLight(config);
        
        const position: Point2D = { x: 0, y: 0 };
        expect(light.getIntensityAtPoint(position)).toBe(Math.max(0, intensity));
      });
    });

    it('应该处理极端材质属性', () => {
      const extremeMaterial: MaterialProperties = {
        ambient: 0,
        diffuse: 0,
        specular: 0,
        shininess: 0,
        roughness: 1,
        metallic: 1,
        emissive: '#ffffff',
        emissiveIntensity: 1000
      };
      
      const position: Point2D = { x: 0, y: 0 };
      const normal: Vector2D = { x: 0, y: 1 };
      const viewDirection: Vector2D = { x: 0, y: 1 };
      
      expect(() => {
        directionalLight.calculateLighting(position, normal, viewDirection, extremeMaterial);
      }).not.toThrow();
    });
  });

  describe('性能测试', () => {
    it('光照计算应该高效执行', () => {
      const position: Point2D = { x: 0, y: 0 };
      const normal: Vector2D = { x: 0, y: 1 };
      const viewDirection: Vector2D = { x: 0, y: 1 };
      
      const startTime = performance.now();
      
      // 执行大量光照计算
      for (let i = 0; i < 1000; i++) {
        directionalLight.calculateLighting(position, normal, viewDirection, defaultMaterial);
      }
      
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      // 1000 次光照计算应该在 100ms 内完成
      expect(duration).toBeLessThan(100);
    });

    it('点光照检测应该高效执行', () => {
      const positions: Point2D[] = [];
      for (let i = 0; i < 1000; i++) {
        positions.push({ x: Math.random() * 1000, y: Math.random() * 1000 });
      }
      
      const startTime = performance.now();
      
      positions.forEach(position => {
        directionalLight.isPointLit(position);
        directionalLight.getIntensityAtPoint(position);
        directionalLight.getDirectionAtPoint(position);
      });
      
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      // 1000 次检测应该在 50ms 内完成
      expect(duration).toBeLessThan(50);
    });
  });
});