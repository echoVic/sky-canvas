import { beforeEach, describe, expect, it } from 'vitest';
import { Point2D, Vector2D } from '../../../animation/types/PathTypes';
import { AnyLightConfig, BaseLight, DirectionalLightConfig, LightingResult, LightType, MaterialProperties } from '../../lighting';


// 创建具体的测试光源类
class TestLight extends BaseLight {
  constructor(config: AnyLightConfig) {
    super(LightType.DIRECTIONAL, config);
  }

  calculateLighting(
    position: Point2D,
    normal: Vector2D,
    viewDirection: Vector2D,
    material: MaterialProperties
  ): LightingResult {
    const intensity = this.getIntensityAtPoint(position);
    const lightDirection = this.getDirectionAtPoint(position);
    
    // 简单的 Lambert 漫反射计算
    const lambertian = Math.max(0, this.dot(normal, lightDirection));
    const diffuseIntensity = lambertian * intensity * material.diffuse;
    
    // 简单的 Phong 镜面反射计算
    const reflectDirection = this.reflect(lightDirection, normal);
    const specularIntensity = Math.pow(
      Math.max(0, this.dot(viewDirection, reflectDirection)),
      material.shininess
    ) * intensity * material.specular;
    
    const lightColor = this.parseColor(this._config.color);
    
    return {
      ambient: {
        r: lightColor.r * material.ambient * 0.1,
        g: lightColor.g * material.ambient * 0.1,
        b: lightColor.b * material.ambient * 0.1
      },
      diffuse: {
        r: lightColor.r * diffuseIntensity,
        g: lightColor.g * diffuseIntensity,
        b: lightColor.b * diffuseIntensity
      },
      specular: {
        r: lightColor.r * specularIntensity,
        g: lightColor.g * specularIntensity,
        b: lightColor.b * specularIntensity
      },
      final: {
        r: lightColor.r * (material.ambient * 0.1 + diffuseIntensity + specularIntensity),
        g: lightColor.g * (material.ambient * 0.1 + diffuseIntensity + specularIntensity),
        b: lightColor.b * (material.ambient * 0.1 + diffuseIntensity + specularIntensity)
      },
      intensity: intensity
    };
  }

  isPointLit(position: Point2D): boolean {
    return this._enabled && this.getIntensityAtPoint(position) > 0;
  }

  getIntensityAtPoint(position: Point2D): number {
    if (!this._enabled) return 0;
    return this._config.intensity;
  }

  getDirectionAtPoint(position: Point2D): Vector2D {
    const config = this._config as DirectionalLightConfig;
    return this.normalize(config.direction || { x: 0, y: -1 });
  }

  clone(): TestLight {
    return new TestLight({ ...this._config });
  }
}

describe('BaseLight', () => {
  let testLight: TestLight;
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

    testLight = new TestLight(defaultConfig);
  });

  describe('构造函数和基本属性', () => {
    it('应该正确初始化', () => {
      expect(testLight.id).toBeDefined();
      expect(testLight.id).toMatch(/^light_[a-z0-9]+$/);
      expect(testLight.type).toBe(LightType.DIRECTIONAL);
      expect(testLight.enabled).toBe(true);
    });

    it('应该正确设置配置', () => {
      const config = testLight.config;
      expect(config.type).toBe(LightType.DIRECTIONAL);
      expect(config.enabled).toBe(true);
      expect(config.color).toBe('#ffffff');
      expect(config.intensity).toBe(1.0);
    });

    it('应该从配置中设置启用状态', () => {
      const disabledConfig = { ...defaultConfig, enabled: false };
      const disabledLight = new TestLight(disabledConfig);
      
      expect(disabledLight.enabled).toBe(false);
    });
  });

  describe('配置管理', () => {
    it('应该能够获取配置副本', () => {
      const config = testLight.config;
      
      expect(config).toEqual(defaultConfig);
      expect(config).not.toBe(testLight['_config']); // 应该是副本
    });

    it('应该能够更新配置', () => {
      const newConfig = {
        intensity: 0.5,
        color: '#ff0000'
      };
      
      testLight.updateConfig(newConfig);
      
      expect(testLight.config.intensity).toBe(0.5);
      expect(testLight.config.color).toBe('#ff0000');
      expect(testLight.config.type).toBe(LightType.DIRECTIONAL); // 其他属性保持不变
    });

    it('应该能够设置启用状态', () => {
      testLight.enabled = false;
      expect(testLight.enabled).toBe(false);
      
      testLight.enabled = true;
      expect(testLight.enabled).toBe(true);
    });
  });

  describe('颜色解析', () => {
    it('应该正确解析6位十六进制颜色', () => {
      const parseColor = (testLight as any).parseColor.bind(testLight);
      
      const white = parseColor('#ffffff');
      expect(white).toEqual({ r: 255, g: 255, b: 255 });
      
      const red = parseColor('#ff0000');
      expect(red).toEqual({ r: 255, g: 0, b: 0 });
      
      const blue = parseColor('#0000ff');
      expect(blue).toEqual({ r: 0, g: 0, b: 255 });
    });

    it('应该正确解析3位十六进制颜色', () => {
      const parseColor = (testLight as any).parseColor.bind(testLight);
      
      const white = parseColor('#fff');
      expect(white).toEqual({ r: 255, g: 255, b: 255 });
      
      const red = parseColor('#f00');
      expect(red).toEqual({ r: 255, g: 0, b: 0 });
      
      const gray = parseColor('#888');
      expect(gray).toEqual({ r: 136, g: 136, b: 136 });
    });

    it('应该处理无效颜色格式', () => {
      const parseColor = (testLight as any).parseColor.bind(testLight);
      
      const result = parseColor('invalid');
      expect(result).toEqual({ r: 0, g: 0, b: 0 }); // 默认返回黑色
    });
  });

  describe('向量数学工具', () => {
    it('应该正确归一化向量', () => {
      const normalize = (testLight as any).normalize.bind(testLight);
      
      const vector = { x: 3, y: 4 };
      const normalized = normalize(vector);
      
      expect(normalized.x).toBeCloseTo(0.6, 5);
      expect(normalized.y).toBeCloseTo(0.8, 5);
      
      // 归一化向量的长度应该为1
      const length = Math.sqrt(normalized.x * normalized.x + normalized.y * normalized.y);
      expect(length).toBeCloseTo(1, 5);
    });

    it('应该处理零向量归一化', () => {
      const normalize = (testLight as any).normalize.bind(testLight);
      
      const zeroVector = { x: 0, y: 0 };
      const normalized = normalize(zeroVector);
      
      expect(normalized.x).toBe(0);
      expect(normalized.y).toBe(0);
    });

    it('应该正确计算距离', () => {
      const distance = (testLight as any).distance.bind(testLight);
      
      const p1: Point2D = { x: 0, y: 0 };
      const p2: Point2D = { x: 3, y: 4 };
      
      expect(distance(p1, p2)).toBe(5);
    });

    it('应该正确计算点积', () => {
      const dot = (testLight as any).dot.bind(testLight);
      
      const v1: Vector2D = { x: 1, y: 0 };
      const v2: Vector2D = { x: 0, y: 1 };
      
      expect(dot(v1, v2)).toBe(0); // 垂直向量点积为0
      
      const v3: Vector2D = { x: 1, y: 1 };
      expect(dot(v1, v3)).toBe(1);
    });

    it('应该正确计算反射向量', () => {
      const reflect = (testLight as any).reflect.bind(testLight);
      
      const incident: Vector2D = { x: 1, y: -1 }; // 45度入射
      const normal: Vector2D = { x: 0, y: 1 };     // 向上法线
      
      const reflected = reflect(incident, normal);
      
      expect(reflected.x).toBeCloseTo(1, 5);
      expect(reflected.y).toBeCloseTo(1, 5); // 应该反射为45度向上
    });

    it('应该正确限制数值范围', () => {
      const clamp = (testLight as any).clamp.bind(testLight);
      
      expect(clamp(-0.5)).toBe(0);
      expect(clamp(0.5)).toBe(0.5);
      expect(clamp(1.5)).toBe(1);
      expect(clamp(0.8, 0.2, 0.9)).toBe(0.8);
      expect(clamp(0.1, 0.2, 0.9)).toBe(0.2);
      expect(clamp(1.0, 0.2, 0.9)).toBe(0.9);
    });
  });

  describe('衰减计算', () => {
    it('应该正确计算距离衰减', () => {
      const calculateAttenuation = (testLight as any).calculateAttenuation.bind(testLight);
      
      // 在光源中心，衰减应该为1
      expect(calculateAttenuation(0, 100, 1)).toBe(1);
      
      // 在光源边界，衰减应该接近0
      expect(calculateAttenuation(100, 100, 1)).toBeCloseTo(0, 2);
      
      // 中间距离应该有适当的衰减
      const midAttenuation = calculateAttenuation(50, 100, 1);
      expect(midAttenuation).toBeGreaterThan(0);
      expect(midAttenuation).toBeLessThan(1);
    });

    it('应该处理不同的衰减系数', () => {
      const calculateAttenuation = (testLight as any).calculateAttenuation.bind(testLight);
      
      const distance = 50;
      const radius = 100;
      
      const linearAttenuation = calculateAttenuation(distance, radius, 1);
      const quadraticAttenuation = calculateAttenuation(distance, radius, 2);
      
      // 二次衰减应该比线性衰减更快
      expect(quadraticAttenuation).toBeLessThan(linearAttenuation);
    });
  });

  describe('光照计算', () => {
    it('应该正确计算光照结果', () => {
      const position: Point2D = { x: 0, y: 0 };
      const normal: Vector2D = { x: 0, y: 1 };
      const viewDirection: Vector2D = { x: 0, y: 1 };
      
      const result = testLight.calculateLighting(position, normal, viewDirection, defaultMaterial);
      
      expect(result.ambient).toBeDefined();
      expect(result.diffuse).toBeDefined();
      expect(result.specular).toBeDefined();
      expect(result.final).toBeDefined();
      expect(result.intensity).toBeDefined();
      
      // 检查颜色值范围
      expect(result.ambient.r).toBeGreaterThanOrEqual(0);
      expect(result.diffuse.g).toBeGreaterThanOrEqual(0);
      expect(result.specular.b).toBeGreaterThanOrEqual(0);
    });

    it('应该根据法线方向调整漫反射', () => {
      const position: Point2D = { x: 0, y: 0 };
      const viewDirection: Vector2D = { x: 0, y: 1 };
      
      // 法线朝向光源
      const normalToLight: Vector2D = { x: 0, y: 1 };
      const resultToLight = testLight.calculateLighting(position, normalToLight, viewDirection, defaultMaterial);
      
      // 法线背离光源
      const normalAwayLight: Vector2D = { x: 0, y: -1 };
      const resultAwayLight = testLight.calculateLighting(position, normalAwayLight, viewDirection, defaultMaterial);
      
      // 朝向光源的表面应该有更强的漫反射
      expect(resultToLight.diffuse.r).toBeGreaterThan(resultAwayLight.diffuse.r);
    });

    it('禁用时应该返回零强度', () => {
      testLight.enabled = false;
      
      const position: Point2D = { x: 0, y: 0 };
      expect(testLight.getIntensityAtPoint(position)).toBe(0);
      expect(testLight.isPointLit(position)).toBe(false);
    });
  });

  describe('光照模型算法', () => {
    it('应该正确计算 Lambert 漫反射', () => {
      const calculateLambert = (testLight as any).calculateLambert.bind(testLight);
      
      const lightDirection: Vector2D = { x: 0, y: 1 };
      const normal: Vector2D = { x: 0, y: 1 };
      
      const lambert = calculateLambert(lightDirection, normal, defaultMaterial);
      
      expect(lambert).toBeCloseTo(defaultMaterial.diffuse, 5);
    });

    it('应该正确计算 Phong 镜面反射', () => {
      const calculatePhong = (testLight as any).calculatePhong.bind(testLight);
      
      const lightDirection: Vector2D = { x: 0, y: 1 };
      const normal: Vector2D = { x: 0, y: 1 };
      const viewDirection: Vector2D = { x: 0, y: 1 };
      
      const phong = calculatePhong(lightDirection, normal, viewDirection, defaultMaterial);
      
      expect(phong).toBeGreaterThanOrEqual(0);
      expect(phong).toBeLessThanOrEqual(defaultMaterial.specular);
    });

    it('应该正确计算 Blinn-Phong 镜面反射', () => {
      const calculateBlinnPhong = (testLight as any).calculateBlinnPhong.bind(testLight);
      
      const lightDirection: Vector2D = { x: 0, y: 1 };
      const normal: Vector2D = { x: 0, y: 1 };
      const viewDirection: Vector2D = { x: 0, y: 1 };
      
      const blinnPhong = calculateBlinnPhong(lightDirection, normal, viewDirection, defaultMaterial);
      
      expect(blinnPhong).toBeGreaterThanOrEqual(0);
      expect(blinnPhong).toBeLessThanOrEqual(defaultMaterial.specular);
    });
  });

  describe('克隆和清理', () => {
    it('应该能够克隆光源', () => {
      const cloned = testLight.clone();
      
      expect(cloned).toBeInstanceOf(TestLight);
      expect(cloned.id).not.toBe(testLight.id); // ID应该不同
      expect(cloned.type).toBe(testLight.type);
      expect(cloned.config).toEqual(testLight.config);
    });

    it('应该能够清理资源', () => {
      expect(() => testLight.dispose()).not.toThrow();
    });
  });

  describe('边界值测试', () => {
    it('应该处理极端强度值', () => {
      const extremeConfig = { ...defaultConfig, intensity: 0 };
      const zeroLight = new TestLight(extremeConfig);
      
      const position: Point2D = { x: 0, y: 0 };
      expect(zeroLight.getIntensityAtPoint(position)).toBe(0);
      expect(zeroLight.isPointLit(position)).toBe(false);
      
      const maxConfig = { ...defaultConfig, intensity: 1000 };
      const maxLight = new TestLight(maxConfig);
      expect(maxLight.getIntensityAtPoint(position)).toBe(1000);
    });

    it('应该处理极端材质属性', () => {
      const extremeMaterial: MaterialProperties = {
        ambient: 0,
        diffuse: 0,
        specular: 0,
        shininess: 0,
        roughness: 1,
        metallic: 1,
        emissive: '#000000',
        emissiveIntensity: 0
      };
      
      const position: Point2D = { x: 0, y: 0 };
      const normal: Vector2D = { x: 0, y: 1 };
      const viewDirection: Vector2D = { x: 0, y: 1 };
      
      expect(() => {
        testLight.calculateLighting(position, normal, viewDirection, extremeMaterial);
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
        testLight.calculateLighting(position, normal, viewDirection, defaultMaterial);
      }
      
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      // 1000 次光照计算应该在 100ms 内完成
      expect(duration).toBeLessThan(100);
    });

    it('向量运算应该高效执行', () => {
      const normalize = (testLight as any).normalize.bind(testLight);
      const dot = (testLight as any).dot.bind(testLight);
      
      const v1: Vector2D = { x: 1, y: 1 };
      const v2: Vector2D = { x: -1, y: 1 };
      
      const startTime = performance.now();
      
      for (let i = 0; i < 10000; i++) {
        normalize(v1);
        dot(v1, v2);
      }
      
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      // 10000 次向量运算应该在 50ms 内完成
      expect(duration).toBeLessThan(50);
    });
  });
});