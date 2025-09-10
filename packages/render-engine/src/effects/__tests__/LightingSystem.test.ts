/**
 * 光照系统测试
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  LightingManager,
  DirectionalLight,
  PointLight,
  DropShadow,
  createLight,
  createShadow,
  LightType,
  ShadowType,
  ShadowQuality
} from '../lighting';

// Mock Canvas APIs
Object.defineProperty(global, 'CanvasRenderingContext2D', {
  value: class MockCanvasRenderingContext2D {
    shadowColor = '';
    shadowBlur = 0;
    shadowOffsetX = 0;
    shadowOffsetY = 0;
    filter = 'none';

    save() {}
    restore() {}
    createImageData(width: number, height: number) {
      return {
        width,
        height,
        data: new Uint8ClampedArray(width * height * 4)
      };
    }
    getImageData(x: number, y: number, width: number, height: number) {
      return this.createImageData(width, height);
    }
    putImageData() {}
    drawImage() {}
  },
  writable: true
});

Object.defineProperty(global, 'HTMLCanvasElement', {
  value: class MockHTMLCanvasElement {
    width = 0;
    height = 0;
    getContext() {
      return new (global as any).CanvasRenderingContext2D();
    }
  },
  writable: true
});

Object.defineProperty(global, 'ImageData', {
  value: class MockImageData {
    width: number;
    height: number;
    data: Uint8ClampedArray;
    
    constructor(dataOrWidth: Uint8ClampedArray | number, height?: number) {
      if (typeof dataOrWidth === 'number') {
        this.width = dataOrWidth;
        this.height = height || 0;
        this.data = new Uint8ClampedArray(dataOrWidth * (height || 0) * 4);
      } else {
        this.data = dataOrWidth;
        this.width = 0;
        this.height = 0;
      }
    }
  },
  writable: true
});

Object.defineProperty(global, 'document', {
  value: {
    createElement: vi.fn(() => new (global as any).HTMLCanvasElement())
  },
  writable: true
});

Object.defineProperty(global, 'performance', {
  value: {
    now: vi.fn(() => Date.now())
  },
  writable: true
});

Object.defineProperty(global, 'requestAnimationFrame', {
  value: vi.fn((callback: FrameRequestCallback) => {
    setTimeout(callback, 16);
    return 1;
  }),
  writable: true
});

Object.defineProperty(global, 'cancelAnimationFrame', {
  value: vi.fn(),
  writable: true
});

describe('光照系统', () => {
  let lightingManager: LightingManager;

  beforeEach(() => {
    lightingManager = new LightingManager();
  });

  describe('LightingManager', () => {
    it('应该正确初始化', () => {
      expect(lightingManager).toBeDefined();
      expect(lightingManager.getAllLights()).toEqual([]);
      expect(lightingManager.getAllShadows()).toEqual([]);
    });

    it('应该能添加光源', () => {
      const lightConfig = {
        type: LightType.DIRECTIONAL as const,
        direction: { x: 1, y: 1 },
        intensity: 1,
        color: '#ffffff',
        enabled: true,
        castShadows: false,
        shadowDistance: 10
      };

      const light = new DirectionalLight(lightConfig);
      lightingManager.addLight(light);

      expect(lightingManager.getAllLights()).toHaveLength(1);
      expect(lightingManager.getLight(light.id)).toBe(light);
    });

    it('应该能移除光源', () => {
      const lightConfig = {
        type: LightType.DIRECTIONAL as const,
        direction: { x: 1, y: 1 },
        intensity: 1,
        color: '#ffffff',
        enabled: true,
        castShadows: false,
        shadowDistance: 10
      };

      const light = new DirectionalLight(lightConfig);
      lightingManager.addLight(light);

      const removed = lightingManager.removeLight(light.id);
      expect(removed).toBe(true);
      expect(lightingManager.getAllLights()).toHaveLength(0);
    });

    it('应该能添加阴影', () => {
      const shadowConfig = {
        type: ShadowType.DROP_SHADOW as const,
        offsetX: 5,
        offsetY: 5,
        blur: 3,
        color: '#000000',
        opacity: 0.5,
        enabled: true,
        quality: ShadowQuality.MEDIUM,
        spread: 0
      };

      const shadow = new DropShadow(shadowConfig);
      lightingManager.addShadow(shadow);

      expect(lightingManager.getAllShadows()).toHaveLength(1);
      expect(lightingManager.getShadow(shadow.id)).toBe(shadow);
    });

    it('应该能计算场景光照', () => {
      const lightConfig = {
        type: LightType.DIRECTIONAL as const,
        direction: { x: 0, y: -1 },
        intensity: 1,
        color: '#ffffff',
        enabled: true,
        castShadows: false,
        shadowDistance: 10
      };

      const light = new DirectionalLight(lightConfig);
      lightingManager.addLight(light);

      const result = lightingManager.calculateSceneLighting(
        { x: 0, y: 0 },
        { x: 0, y: -1 },
        { x: 0, y: 1 },
        {
          ambient: 0.1,
          diffuse: 0.8,
          specular: 0.5,
          shininess: 32,
          roughness: 0.5,
          metallic: 0.0,
          emissive: '#000000',
          emissiveIntensity: 0
        }
      );

      expect(result).toBeDefined();
      expect(result.intensity).toBeGreaterThan(0);
      expect(result.final).toBeDefined();
    });

    it('应该能更新光源位置', () => {
      const lightConfig = {
        type: LightType.POINT as const,
        position: { x: 0, y: 0 },
        radius: 100,
        falloff: 1,
        intensity: 1,
        color: '#ffffff',
        enabled: true,
        castShadows: false
      };

      const light = new PointLight(lightConfig);
      lightingManager.addLight(light);

      lightingManager.updateLightPositions({
        [light.id]: { x: 10, y: 20 }
      });

      const updatedLight = lightingManager.getLight(light.id) as PointLight;
      expect(updatedLight.getPosition()).toEqual({ x: 10, y: 20 });
    });

    it('应该能获取统计信息', () => {
      const lightConfig = {
        type: LightType.DIRECTIONAL as const,
        direction: { x: 1, y: 1 },
        intensity: 1,
        color: '#ffffff',
        enabled: true,
        castShadows: false,
        shadowDistance: 10
      };

      const light = new DirectionalLight(lightConfig);
      lightingManager.addLight(light);

      const stats = lightingManager.getStats();
      expect(stats.totalLights).toBe(1);
      expect(stats.activeLights).toBe(1);
    });
  });

  describe('DirectionalLight', () => {
    it('应该正确创建', () => {
      const lightConfig = {
        type: LightType.DIRECTIONAL as const,
        direction: { x: 1, y: 1 },
        intensity: 1,
        color: '#ffffff',
        enabled: true,
        castShadows: false,
        shadowDistance: 10
      };

      const light = new DirectionalLight(lightConfig);
      expect(light.type).toBe(LightType.DIRECTIONAL);
      expect(light.enabled).toBe(true);
    });

    it('应该能计算光照', () => {
      const lightConfig = {
        type: LightType.DIRECTIONAL as const,
        direction: { x: 0, y: -1 },
        intensity: 1,
        color: '#ffffff',
        enabled: true,
        castShadows: false,
        shadowDistance: 10
      };

      const light = new DirectionalLight(lightConfig);
      const result = light.calculateLighting(
        { x: 0, y: 0 },
        { x: 0, y: -1 },
        { x: 0, y: 1 },
        {
          ambient: 0.1,
          diffuse: 0.8,
          specular: 0.5,
          shininess: 32,
          roughness: 0.5,
          metallic: 0.0,
          emissive: '#000000',
          emissiveIntensity: 0
        }
      );

      expect(result.intensity).toBe(1);
      expect(result.ambient).toBeDefined();
      expect(result.diffuse).toBeDefined();
      expect(result.specular).toBeDefined();
    });

    it('应该照亮所有点', () => {
      const lightConfig = {
        type: LightType.DIRECTIONAL as const,
        direction: { x: 1, y: 1 },
        intensity: 1,
        color: '#ffffff',
        enabled: true,
        castShadows: false,
        shadowDistance: 10
      };

      const light = new DirectionalLight(lightConfig);
      expect(light.isPointLit({ x: 0, y: 0 })).toBe(true);
      expect(light.isPointLit({ x: 100, y: 100 })).toBe(true);
    });
  });

  describe('PointLight', () => {
    it('应该正确创建', () => {
      const lightConfig = {
        type: LightType.POINT as const,
        position: { x: 0, y: 0 },
        radius: 100,
        falloff: 1,
        intensity: 1,
        color: '#ffffff',
        enabled: true,
        castShadows: false
      };

      const light = new PointLight(lightConfig);
      expect(light.type).toBe(LightType.POINT);
      expect(light.getPosition()).toEqual({ x: 0, y: 0 });
    });

    it('应该根据距离衰减光照强度', () => {
      const lightConfig = {
        type: LightType.POINT as const,
        position: { x: 0, y: 0 },
        radius: 100,
        falloff: 1,
        intensity: 1,
        color: '#ffffff',
        enabled: true,
        castShadows: false
      };

      const light = new PointLight(lightConfig);
      
      const nearIntensity = light.getIntensityAtPoint({ x: 10, y: 0 });
      const farIntensity = light.getIntensityAtPoint({ x: 90, y: 0 });
      
      expect(nearIntensity).toBeGreaterThan(farIntensity);
    });

    it('应该照亮范围内的点', () => {
      const config = {
        type: LightType.POINT as const,
        position: { x: 0, y: 0 },
        radius: 50,
        falloff: 1,
        intensity: 1,
        color: '#ffffff',
        enabled: true,
        castShadows: false
      };

      const light = new PointLight(config);
      
      expect(light.isPointLit({ x: 25, y: 0 })).toBe(true);
      expect(light.isPointLit({ x: 75, y: 0 })).toBe(false);
    });

    it('应该能更新位置和半径', () => {
      const config = {
        type: LightType.POINT as const,
        position: { x: 0, y: 0 },
        radius: 50,
        falloff: 1,
        intensity: 1,
        color: '#ffffff',
        enabled: true,
        castShadows: false
      };

      const light = new PointLight(config);
      
      light.setPosition({ x: 10, y: 20 });
      expect(light.getPosition()).toEqual({ x: 10, y: 20 });
      
      light.setRadius(100);
      expect(light.getRadius()).toBe(100);
    });
  });

  describe('DropShadow', () => {
    it('应该正确创建阴影', () => {
      const config = {
        type: ShadowType.DROP_SHADOW as const,
        offsetX: 5,
        offsetY: 5,
        blur: 3,
        color: '#000000',
        opacity: 0.5,
        enabled: true,
        quality: ShadowQuality.MEDIUM,
        spread: 0
      };

      const shadow = new DropShadow(config);
      expect(shadow.type).toBe(ShadowType.DROP_SHADOW);
      expect(shadow.enabled).toBe(true);
    });

    it('应该能更新偏移量', () => {
      const config = {
        type: ShadowType.DROP_SHADOW as const,
        offsetX: 5,
        offsetY: 5,
        blur: 3,
        color: '#000000',
        opacity: 0.5,
        enabled: true,
        quality: ShadowQuality.MEDIUM,
        spread: 0
      };

      const shadow = new DropShadow(config);
      
      expect(shadow.getOffset()).toEqual({ x: 5, y: 5 });
      
      shadow.setOffset(10, 15);
      expect(shadow.getOffset()).toEqual({ x: 10, y: 15 });
    });

    it('应该能计算阴影边界', () => {
      const config = {
        type: ShadowType.DROP_SHADOW as const,
        offsetX: 5,
        offsetY: 5,
        blur: 3,
        color: '#000000',
        opacity: 0.5,
        enabled: true,
        quality: ShadowQuality.MEDIUM,
        spread: 2
      };

      const shadow = new DropShadow(config);
      const originalBounds = { x: 0, y: 0, width: 100, height: 100 };
      const shadowBounds = shadow.getShadowBounds(originalBounds);

      expect(shadowBounds.x).toBe(0); // originalBounds.x + offsetX - blur - spread = 0 + 5 - 3 - 2 = 0
      expect(shadowBounds.y).toBe(0); // originalBounds.y + offsetY - blur - spread = 0 + 5 - 3 - 2 = 0
      expect(shadowBounds.width).toBe(110); // original + 2 * (blur + spread)
      expect(shadowBounds.height).toBe(110);
    });

    it('应该能渲染阴影', () => {
      const config = {
        type: ShadowType.DROP_SHADOW as const,
        offsetX: 5,
        offsetY: 5,
        blur: 3,
        color: '#000000',
        opacity: 0.5,
        enabled: true,
        quality: ShadowQuality.MEDIUM,
        spread: 0
      };

      const shadow = new DropShadow(config);
      const ctx = new (global as any).CanvasRenderingContext2D();
      const canvas = new (global as any).HTMLCanvasElement();
      canvas.width = 100;
      canvas.height = 100;

      expect(() => {
        shadow.render(ctx, canvas);
      }).not.toThrow();
    });
  });

  describe('工厂函数', () => {
    it('应该能通过工厂创建光源', () => {
      const directionalConfig = {
        type: 'directional',
        direction: { x: 1, y: 1 },
        intensity: 1,
        color: '#ffffff',
        enabled: true,
        castShadows: false,
        shadowDistance: 10
      };

      const pointConfig = {
        type: 'point',
        position: { x: 0, y: 0 },
        radius: 100,
        falloff: 1,
        intensity: 1,
        color: '#ffffff',
        enabled: true,
        castShadows: false
      };

      const directionalLight = createLight(directionalConfig);
      const pointLight = createLight(pointConfig);

      expect(directionalLight).toBeInstanceOf(DirectionalLight);
      expect(pointLight).toBeInstanceOf(PointLight);
    });

    it('应该能通过工厂创建阴影', () => {
      const dropShadowConfig = {
        type: 'drop-shadow',
        offsetX: 5,
        offsetY: 5,
        blur: 3,
        color: '#000000',
        opacity: 0.5,
        enabled: true,
        quality: 'medium' as const,
        spread: 0
      };

      const dropShadow = createShadow(dropShadowConfig);
      expect(dropShadow).toBeInstanceOf(DropShadow);
    });

    it('应该处理无效类型', () => {
      expect(() => createLight({ type: 'invalid' })).toThrow('Unsupported light type: invalid');
      expect(() => createShadow({ type: 'invalid' })).toThrow('Unsupported shadow type: invalid');
    });
  });
});