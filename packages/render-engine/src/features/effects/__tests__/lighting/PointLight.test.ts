import { beforeEach, describe, expect, it } from 'vitest';
import { Point2D, Vector2D } from '../../../animation/types/PathTypes';
import { LightType, MaterialProperties, PointLight, PointLightConfig } from '../../lighting';


describe('PointLight', () => {
  let pointLight: PointLight;
  let defaultConfig: PointLightConfig;
  let defaultMaterial: MaterialProperties;

  beforeEach(() => {
    defaultConfig = {
      type: LightType.POINT,
      enabled: true,
      color: '#ffffff',
      intensity: 1.0,
      position: { x: 0, y: 0 },
      radius: 100,
      falloff: 1,
      castShadows: false
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

    pointLight = new PointLight(defaultConfig);
  });

  describe('构造函数和基本属性', () => {
    it('应该正确初始化点光源', () => {
      expect(pointLight.id).toBeDefined();
      expect(pointLight.id).toMatch(/^light_[a-z0-9]+$/);
      expect(pointLight.type).toBe(LightType.POINT);
      expect(pointLight.enabled).toBe(true);
    });

    it('应该正确设置点光源配置', () => {
      const config = pointLight.config as PointLightConfig;
      expect(config.type).toBe(LightType.POINT);
      expect(config.position).toEqual({ x: 0, y: 0 });
      expect(config.radius).toBe(100);
      expect(config.falloff).toBe(1);
      expect(config.intensity).toBe(1.0);
      expect(config.color).toBe('#ffffff');
      expect(config.castShadows).toBe(false);
    });

    it('应该使用默认值', () => {
      const minimalConfig = {
        type: LightType.POINT,
        enabled: true,
        color: '#ffffff',
        intensity: 1.0,
        position: { x: 0, y: 0 },
        radius: 50,
        falloff: 2
      } as PointLightConfig;
      
      const light = new PointLight(minimalConfig);
      const config = light.config as PointLightConfig;
      
      expect(config.radius).toBe(50);
      expect(config.falloff).toBe(2);
    });
  });

  describe('位置和几何属性', () => {
    it('应该能够获取和设置位置', () => {
      const newPosition = { x: 50, y: 100 };
      
      expect(pointLight.getPosition()).toEqual({ x: 0, y: 0 });
      
      pointLight.setPosition(newPosition);
      expect(pointLight.getPosition()).toEqual(newPosition);
      
      const config = pointLight.config as PointLightConfig;
      expect(config.position).toEqual(newPosition);
    });

    it('应该能够获取和设置半径', () => {
      expect(pointLight.getRadius()).toBe(100);
      
      pointLight.setRadius(200);
      expect(pointLight.getRadius()).toBe(200);
      
      const config = pointLight.config as PointLightConfig;
      expect(config.radius).toBe(200);
    });

    it('应该能够获取和设置衰减系数', () => {
      expect(pointLight.getFalloff()).toBe(1);
      
      pointLight.setFalloff(2);
      expect(pointLight.getFalloff()).toBe(2);
      
      const config = pointLight.config as PointLightConfig;
      expect(config.falloff).toBe(2);
    });
  });

  describe('光照范围检测', () => {
    it('应该正确检测光照范围内的点', () => {
      // 光源中心
      expect(pointLight.isPointLit({ x: 0, y: 0 })).toBe(true);
      
      // 半径内的点
      expect(pointLight.isPointLit({ x: 50, y: 0 })).toBe(true);
      expect(pointLight.isPointLit({ x: 0, y: 50 })).toBe(true);
      expect(pointLight.isPointLit({ x: 60, y: 80 })).toBe(true); // 距离 = 100
      
      // 半径边界
      expect(pointLight.isPointLit({ x: 100, y: 0 })).toBe(true);
      expect(pointLight.isPointLit({ x: 0, y: 100 })).toBe(true);
    });

    it('应该正确检测光照范围外的点', () => {
      // 超出半径的点
      expect(pointLight.isPointLit({ x: 150, y: 0 })).toBe(false);
      expect(pointLight.isPointLit({ x: 0, y: 150 })).toBe(false);
      expect(pointLight.isPointLit({ x: 100, y: 100 })).toBe(false); // 距离 ≈ 141
    });

    it('禁用时不应该照亮任何点', () => {
      pointLight.enabled = false;
      
      expect(pointLight.isPointLit({ x: 0, y: 0 })).toBe(false);
      expect(pointLight.isPointLit({ x: 50, y: 0 })).toBe(false);
    });
  });

  describe('强度计算', () => {
    it('应该在光源中心返回最大强度', () => {
      const intensity = pointLight.getIntensityAtPoint({ x: 0, y: 0 });
      expect(intensity).toBe(1.0);
    });

    it('应该根据距离衰减强度', () => {
      const centerIntensity = pointLight.getIntensityAtPoint({ x: 0, y: 0 });
      const halfwayIntensity = pointLight.getIntensityAtPoint({ x: 50, y: 0 });
      const edgeIntensity = pointLight.getIntensityAtPoint({ x: 100, y: 0 });
      
      expect(centerIntensity).toBeGreaterThan(halfwayIntensity);
      expect(halfwayIntensity).toBeGreaterThan(edgeIntensity);
      expect(edgeIntensity).toBeGreaterThanOrEqual(0);
    });

    it('应该在光照范围外返回零强度', () => {
      const intensity = pointLight.getIntensityAtPoint({ x: 150, y: 0 });
      expect(intensity).toBe(0);
    });

    it('禁用时应该返回零强度', () => {
      pointLight.enabled = false;
      
      const intensity = pointLight.getIntensityAtPoint({ x: 0, y: 0 });
      expect(intensity).toBe(0);
    });

    it('应该根据衰减系数调整强度', () => {
      const position = { x: 50, y: 0 };
      
      // 线性衰减
      pointLight.setFalloff(1);
      const linearIntensity = pointLight.getIntensityAtPoint(position);
      
      // 二次衰减
      pointLight.setFalloff(2);
      const quadraticIntensity = pointLight.getIntensityAtPoint(position);
      
      // 二次衰减应该比线性衰减更快
      expect(quadraticIntensity).toBeLessThan(linearIntensity);
    });
  });

  describe('方向计算', () => {
    it('应该正确计算从光源到点的方向', () => {
      // 右侧点 - 从(100,0)指向光源(0,0)
      const rightDirection = pointLight.getDirectionAtPoint({ x: 100, y: 0 });
      expect(rightDirection.x).toBeCloseTo(-1, 5);
      expect(rightDirection.y).toBeCloseTo(0, 5);
      
      // 左侧点 - 从(-100,0)指向光源(0,0)
      const leftDirection = pointLight.getDirectionAtPoint({ x: -100, y: 0 });
      expect(leftDirection.x).toBeCloseTo(1, 5);
      expect(leftDirection.y).toBeCloseTo(0, 5);
      
      // 上方点 - 从(0,100)指向光源(0,0)
      const upDirection = pointLight.getDirectionAtPoint({ x: 0, y: 100 });
      expect(upDirection.x).toBeCloseTo(0, 5);
      expect(upDirection.y).toBeCloseTo(-1, 5);
      
      // 下方点 - 从(0,-100)指向光源(0,0)
      const downDirection = pointLight.getDirectionAtPoint({ x: 0, y: -100 });
      expect(downDirection.x).toBeCloseTo(0, 5);
      expect(downDirection.y).toBeCloseTo(1, 5);
      
      // 对角线点 - 从(100,100)指向光源(0,0)
      const diagonalDirection = pointLight.getDirectionAtPoint({ x: 100, y: 100 });
      expect(diagonalDirection.x).toBeCloseTo(-0.707, 2);
      expect(diagonalDirection.y).toBeCloseTo(-0.707, 2);
    });

    it('应该处理光源中心的方向计算', () => {
      const direction = pointLight.getDirectionAtPoint({ x: 0, y: 0 });
      
      // 在光源中心，方向应该是零向量或默认方向
      expect(direction.x).toBeDefined();
      expect(direction.y).toBeDefined();
    });

    it('移动光源后应该更新方向', () => {
      pointLight.setPosition({ x: 150, y: 50 });
      
      const direction = pointLight.getDirectionAtPoint({ x: 100, y: 50 });
      // 方向是从目标点(100,50)指向光源(150,50)，所以x分量为正
      expect(direction.x).toBeCloseTo(1, 5);
      expect(direction.y).toBeCloseTo(0, 5);
    });
  });

  describe('光照计算', () => {
    it('应该正确计算光照结果', () => {
      const position: Point2D = { x: 50, y: 0 };
      const normal: Vector2D = { x: -1, y: 0 }; // 朝向光源
      const viewDirection: Vector2D = { x: 0, y: 1 };
      
      const result = pointLight.calculateLighting(position, normal, viewDirection, defaultMaterial);
      
      expect(result.ambient).toBeDefined();
      expect(result.diffuse).toBeDefined();
      expect(result.specular).toBeDefined();
      expect(result.final).toBeDefined();
      expect(result.intensity).toBeGreaterThan(0);
      
      // 检查颜色值范围
      expect(result.ambient.r).toBeGreaterThanOrEqual(0);
      expect(result.diffuse.r).toBeGreaterThanOrEqual(0);
      expect(result.specular.r).toBeGreaterThanOrEqual(0);
      expect(result.final.r).toBeGreaterThanOrEqual(0);
    });

    it('应该根据距离衰减光照强度', () => {
      const normal: Vector2D = { x: -1, y: 0 };
      const viewDirection: Vector2D = { x: 0, y: 1 };
      
      // 近距离点
      const nearResult = pointLight.calculateLighting(
        { x: 25, y: 0 },
        normal,
        viewDirection,
        defaultMaterial
      );
      
      // 远距离点
      const farResult = pointLight.calculateLighting(
        { x: 75, y: 0 },
        normal,
        viewDirection,
        defaultMaterial
      );
      
      // 近距离应该有更强的光照
      const nearTotal = nearResult.final.r + nearResult.final.g + nearResult.final.b;
      const farTotal = farResult.final.r + farResult.final.g + farResult.final.b;
      
      expect(nearTotal).toBeGreaterThan(farTotal);
    });

    it('应该根据法线方向调整漫反射', () => {
      const position: Point2D = { x: 50, y: 0 };
      const viewDirection: Vector2D = { x: 0, y: 1 };
      
      // 法线朝向光源
      const normalToLight: Vector2D = { x: -1, y: 0 };
      const resultToLight = pointLight.calculateLighting(position, normalToLight, viewDirection, defaultMaterial);
      
      // 法线背离光源
      const normalAwayLight: Vector2D = { x: 1, y: 0 };
      const resultAwayLight = pointLight.calculateLighting(position, normalAwayLight, viewDirection, defaultMaterial);
      
      // 朝向光源的表面应该有更强的漫反射
      const towardDiffuse = resultToLight.diffuse.r + resultToLight.diffuse.g + resultToLight.diffuse.b;
      const awayDiffuse = resultAwayLight.diffuse.r + resultAwayLight.diffuse.g + resultAwayLight.diffuse.b;
      
      expect(towardDiffuse).toBeGreaterThan(awayDiffuse);
    });

    it('超出光照范围时应该返回零光照', () => {
      const position: Point2D = { x: 150, y: 0 }; // 超出半径
      const normal: Vector2D = { x: -1, y: 0 };
      const viewDirection: Vector2D = { x: 0, y: 1 };
      
      const result = pointLight.calculateLighting(position, normal, viewDirection, defaultMaterial);
      
      expect(result.ambient.r).toBe(0);
      expect(result.diffuse.r).toBe(0);
      expect(result.specular.r).toBe(0);
      expect(result.final.r).toBe(0);
      expect(result.intensity).toBe(0);
    });

    it('禁用时应该返回零光照', () => {
      pointLight.enabled = false;
      
      const position: Point2D = { x: 0, y: 0 };
      const normal: Vector2D = { x: 0, y: 1 };
      const viewDirection: Vector2D = { x: 0, y: 1 };
      
      const result = pointLight.calculateLighting(position, normal, viewDirection, defaultMaterial);
      
      expect(result.ambient.r).toBe(0);
      expect(result.diffuse.r).toBe(0);
      expect(result.specular.r).toBe(0);
      expect(result.final.r).toBe(0);
      expect(result.intensity).toBe(0);
    });
  });

  describe('配置更新', () => {
    it('应该能够更新位置配置', () => {
      const newPosition = { x: 100, y: 200 };
      pointLight.updateConfig({ position: newPosition });
      
      const config = pointLight.config as PointLightConfig;
      expect(config.position).toEqual(newPosition);
      expect(pointLight.getPosition()).toEqual(newPosition);
    });

    it('应该能够更新半径配置', () => {
      pointLight.updateConfig({ radius: 200 });
      
      const config = pointLight.config as PointLightConfig;
      expect(config.radius).toBe(200);
      expect(pointLight.getRadius()).toBe(200);
      
      // 检查光照范围是否更新
      expect(pointLight.isPointLit({ x: 150, y: 0 })).toBe(true);
      expect(pointLight.isPointLit({ x: 250, y: 0 })).toBe(false);
    });

    it('应该能够更新衰减配置', () => {
      pointLight.updateConfig({ falloff: 2 });
      
      const config = pointLight.config as PointLightConfig;
      expect(config.falloff).toBe(2);
      expect(pointLight.getFalloff()).toBe(2);
    });

    it('应该能够更新颜色和强度', () => {
      pointLight.updateConfig({
        color: '#ff0000',
        intensity: 0.5
      });
      
      const config = pointLight.config as PointLightConfig;
      expect(config.color).toBe('#ff0000');
      expect(config.intensity).toBe(0.5);
    });
  });

  describe('克隆', () => {
    it('应该能够克隆点光源', () => {
      const cloned = pointLight.clone();
      
      expect(cloned).toBeInstanceOf(PointLight);
      expect(cloned.id).not.toBe(pointLight.id);
      expect(cloned.type).toBe(pointLight.type);
      expect(cloned.config).toEqual(pointLight.config);
    });

    it('克隆的光源应该独立工作', () => {
      const cloned = pointLight.clone() as PointLight;
      
      // 修改原光源
      pointLight.setPosition({ x: 100, y: 100 });
      pointLight.setRadius(200);
      
      // 克隆的光源不应该受影响
      expect(cloned.getPosition()).toEqual({ x: 0, y: 0 });
      expect(cloned.getRadius()).toBe(100);
    });
  });

  describe('边界值测试', () => {
    it('应该处理极端位置值', () => {
      const extremePositions = [
        { x: 0, y: 0 },
        { x: -1000, y: -1000 },
        { x: 1000, y: 1000 },
        { x: 0.001, y: 0.001 }
      ];
      
      extremePositions.forEach(position => {
        pointLight.setPosition(position);
        expect(pointLight.getPosition()).toEqual(position);
        
        // 测试基本功能仍然工作
        expect(() => {
          pointLight.isPointLit({ x: position.x + 50, y: position.y });
          pointLight.getIntensityAtPoint({ x: position.x + 50, y: position.y });
          pointLight.getDirectionAtPoint({ x: position.x + 50, y: position.y });
        }).not.toThrow();
      });
    });

    it('应该处理极端半径值', () => {
      const extremeRadii = [0.1, 1, 1000, 10000];
      
      extremeRadii.forEach(radius => {
        pointLight.setRadius(radius);
        expect(pointLight.getRadius()).toBe(radius);
        
        // 测试光照范围
        const testPoint = { x: radius * 0.5, y: 0 };
        expect(pointLight.isPointLit(testPoint)).toBe(true);
        
        const outsidePoint = { x: radius * 1.5, y: 0 };
        expect(pointLight.isPointLit(outsidePoint)).toBe(false);
      });
    });

    it('应该处理极端衰减值', () => {
      const extremeFalloffs = [0.1, 1, 2, 5, 10];
      const testPosition = { x: 50, y: 0 };
      
      const intensities = extremeFalloffs.map(falloff => {
        pointLight.setFalloff(falloff);
        return pointLight.getIntensityAtPoint(testPosition);
      });
      
      // 衰减系数越大，强度应该越小
      for (let i = 1; i < intensities.length; i++) {
        expect(intensities[i]).toBeLessThanOrEqual(intensities[i-1]);
      }
    });

    it('应该处理零半径', () => {
      pointLight.setRadius(0);
      
      // 零半径时，只有光源中心应该被照亮
      expect(pointLight.isPointLit({ x: 0, y: 0 })).toBe(true);
      expect(pointLight.isPointLit({ x: 1, y: 0 })).toBe(false);
      expect(pointLight.isPointLit({ x: 0, y: 1 })).toBe(false);
    });
  });

  describe('性能测试', () => {
    it('光照计算应该高效执行', () => {
      const position: Point2D = { x: 50, y: 0 };
      const normal: Vector2D = { x: -1, y: 0 };
      const viewDirection: Vector2D = { x: 0, y: 1 };
      
      const startTime = performance.now();
      
      // 执行大量光照计算
      for (let i = 0; i < 1000; i++) {
        pointLight.calculateLighting(position, normal, viewDirection, defaultMaterial);
      }
      
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      // 1000 次光照计算应该在 100ms 内完成
      expect(duration).toBeLessThan(100);
    });

    it('点光照检测应该高效执行', () => {
      const positions: Point2D[] = [];
      for (let i = 0; i < 1000; i++) {
        positions.push({
          x: (Math.random() - 0.5) * 200,
          y: (Math.random() - 0.5) * 200
        });
      }
      
      const startTime = performance.now();
      
      positions.forEach(position => {
        pointLight.isPointLit(position);
        pointLight.getIntensityAtPoint(position);
        pointLight.getDirectionAtPoint(position);
      });
      
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      // 1000 次检测应该在 50ms 内完成
      expect(duration).toBeLessThan(50);
    });

    it('大量点光源应该高效处理', () => {
      const lights: PointLight[] = [];
      
      // 创建多个点光源
      for (let i = 0; i < 100; i++) {
        const config = {
          ...defaultConfig,
          position: { x: i * 10, y: i * 10 }
        };
        lights.push(new PointLight(config));
      }
      
      const testPosition: Point2D = { x: 500, y: 500 };
      const normal: Vector2D = { x: 0, y: 1 };
      const viewDirection: Vector2D = { x: 0, y: 1 };
      
      const startTime = performance.now();
      
      // 计算所有光源的光照贡献
      lights.forEach(light => {
        light.calculateLighting(testPosition, normal, viewDirection, defaultMaterial);
      });
      
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      // 100 个光源的计算应该在 50ms 内完成
      expect(duration).toBeLessThan(50);
    });
  });

  describe('实际使用场景', () => {
    it('应该模拟手电筒效果', () => {
      // 配置一个小半径、高强度的点光源
      const flashlightConfig = {
        ...defaultConfig,
        radius: 50,
        intensity: 2.0,
        falloff: 2
      };
      
      const flashlight = new PointLight(flashlightConfig);
      
      // 中心应该很亮
      const centerIntensity = flashlight.getIntensityAtPoint({ x: 0, y: 0 });
      expect(centerIntensity).toBe(2.0);
      
      // 边缘应该快速衰减
      const edgeIntensity = flashlight.getIntensityAtPoint({ x: 45, y: 0 });
      expect(edgeIntensity).toBeLessThan(0.5);
      
      // 超出范围应该没有光照
      expect(flashlight.isPointLit({ x: 60, y: 0 })).toBe(false);
    });

    it('应该模拟环境光效果', () => {
      // 配置一个大半径、低强度的点光源
      const ambientConfig = {
        ...defaultConfig,
        radius: 500,
        intensity: 0.3,
        falloff: 0.5
      };
      
      const ambientLight = new PointLight(ambientConfig);
      
      // 大范围内都应该有光照
      expect(ambientLight.isPointLit({ x: 200, y: 200 })).toBe(true);
      expect(ambientLight.isPointLit({ x: 400, y: 0 })).toBe(true);
      
      // 衰减应该很缓慢
      const nearIntensity = ambientLight.getIntensityAtPoint({ x: 100, y: 0 });
      const farIntensity = ambientLight.getIntensityAtPoint({ x: 300, y: 0 });
      
      expect(farIntensity).toBeGreaterThan(nearIntensity * 0.5);
    });

    it('应该支持动态光源移动', () => {
      const movingLight = new PointLight(defaultConfig);
      const testPoint = { x: 50, y: 0 };
      
      // 初始位置
      expect(movingLight.isPointLit(testPoint)).toBe(true);
      
      // 移动光源远离测试点
      movingLight.setPosition({ x: 200, y: 0 });
      expect(movingLight.isPointLit(testPoint)).toBe(false);
      
      // 移动光源靠近测试点
      movingLight.setPosition({ x: 30, y: 0 });
      expect(movingLight.isPointLit(testPoint)).toBe(true);
      
      // 检查方向是否正确更新
      const direction = movingLight.getDirectionAtPoint(testPoint);
      expect(direction.x).toBeCloseTo(-1, 1); // 从 (50,0) 指向 (30,0)
    });
  });
});