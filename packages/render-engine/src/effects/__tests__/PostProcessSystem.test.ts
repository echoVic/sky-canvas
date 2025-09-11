/**
 * 后处理效果系统测试
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  PostProcessManager,
  PostProcessType,
  createPostProcessEffect,
  createDefaultPostProcessConfig,
  getSupportedPostProcessTypes,
  isPostProcessTypeSupported,
  getPostProcessEffectDescription,
  getPostProcessEffectCategory,
  getPostProcessEffectInfo,
  BrightnessEffect,
  ContrastEffect,
  SaturationEffect,
  SharpenEffect,
  NoiseEffect,
  BloomEffect,
  SepiaEffect,
  PixelateEffect,
  PostProcessCategory
} from '../postprocess';

// Mock Canvas APIs
Object.defineProperty(global, 'CanvasRenderingContext2D', {
  value: class MockCanvasRenderingContext2D {
    getImageData() {
      const width = 100;
      const height = 100;
      const data = new Uint8ClampedArray(width * height * 4);
      
      // 填充一些测试数据
      for (let i = 0; i < data.length; i += 4) {
        data[i] = 128;     // R
        data[i + 1] = 128; // G
        data[i + 2] = 128; // B
        data[i + 3] = 255; // A
      }
      
      return new (global as any).ImageData(data, width, height);
    }
    
    putImageData() {}
    save() {}
    restore() {}
    drawImage() {}
  },
  writable: true
});

Object.defineProperty(global, 'HTMLCanvasElement', {
  value: class MockHTMLCanvasElement {
    width = 100;
    height = 100;
    
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
    
    constructor(dataOrWidth: Uint8ClampedArray | number, widthOrHeight?: number, height?: number) {
      if (dataOrWidth instanceof Uint8ClampedArray) {
        this.data = dataOrWidth;
        this.width = widthOrHeight || 0;
        this.height = height || 0;
      } else {
        this.width = dataOrWidth;
        this.height = widthOrHeight || 0;
        this.data = new Uint8ClampedArray(this.width * this.height * 4);
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

describe('后处理效果系统', () => {
  let postProcessManager: PostProcessManager;

  beforeEach(() => {
    postProcessManager = new PostProcessManager();
  });

  describe('PostProcessManager', () => {
    it('应该能够创建管理器实例', () => {
      expect(postProcessManager).toBeDefined();
      expect(postProcessManager.getAllEffects()).toEqual([]);
    });

    it('应该能够添加后处理效果', () => {
      const config = createDefaultPostProcessConfig(PostProcessType.BRIGHTNESS);
      const effect = createPostProcessEffect(PostProcessType.BRIGHTNESS, config);
      
      postProcessManager.addEffect(effect);
      
      expect(postProcessManager.getAllEffects()).toHaveLength(1);
      expect(postProcessManager.getEffect(effect.id)).toBe(effect);
    });

    it('应该能够移除后处理效果', () => {
      const config = createDefaultPostProcessConfig(PostProcessType.CONTRAST);
      const effect = createPostProcessEffect(PostProcessType.CONTRAST, config);
      
      postProcessManager.addEffect(effect);
      
      const removed = postProcessManager.removeEffect(effect.id);
      expect(removed).toBe(true);
      expect(postProcessManager.getAllEffects()).toHaveLength(0);
    });

    it('应该能够处理画布', () => {
      const canvas = new (global as any).HTMLCanvasElement();
      
      const config = createDefaultPostProcessConfig(PostProcessType.BRIGHTNESS);
      const effect = createPostProcessEffect(PostProcessType.BRIGHTNESS, config);
      postProcessManager.addEffect(effect);
      
      const result = postProcessManager.process(canvas);
      expect(result).toBeInstanceOf((global as any).HTMLCanvasElement);
    });

    it('应该能够处理图像数据', () => {
      const imageData = new (global as any).ImageData(100, 100);
      
      const config = createDefaultPostProcessConfig(PostProcessType.SATURATION);
      const effect = createPostProcessEffect(PostProcessType.SATURATION, config);
      postProcessManager.addEffect(effect);
      
      const result = postProcessManager.processImageData(imageData);
      expect(result).toBeInstanceOf((global as any).ImageData);
    });

    it('应该能够获取统计信息', () => {
      const stats = postProcessManager.getStats();
      expect(stats).toHaveProperty('totalEffects');
      expect(stats).toHaveProperty('activeEffects');
      expect(stats).toHaveProperty('totalProcesses');
      expect(stats).toHaveProperty('averageProcessTime');
    });

    it('应该能够按类型获取效果', () => {
      const config1 = createDefaultPostProcessConfig(PostProcessType.BRIGHTNESS);
      const config2 = createDefaultPostProcessConfig(PostProcessType.BRIGHTNESS);
      const effect1 = createPostProcessEffect(PostProcessType.BRIGHTNESS, config1);
      const effect2 = createPostProcessEffect(PostProcessType.BRIGHTNESS, config2);
      
      postProcessManager.addEffect(effect1);
      postProcessManager.addEffect(effect2);
      
      const brightnessEffects = postProcessManager.getEffectsByType(PostProcessType.BRIGHTNESS);
      expect(brightnessEffects).toHaveLength(2);
    });

    it('应该能够启用/禁用效果', () => {
      const config = createDefaultPostProcessConfig(PostProcessType.CONTRAST);
      const effect = createPostProcessEffect(PostProcessType.CONTRAST, config);
      postProcessManager.addEffect(effect);
      
      const disabled = postProcessManager.disableEffect(effect.id);
      expect(disabled).toBe(true);
      expect(effect.config.enabled).toBe(false);
      
      const enabled = postProcessManager.enableEffect(effect.id);
      expect(enabled).toBe(true);
      expect(effect.config.enabled).toBe(true);
    });

    it('应该能够设置效果强度', () => {
      const config = createDefaultPostProcessConfig(PostProcessType.SATURATION);
      const effect = createPostProcessEffect(PostProcessType.SATURATION, config);
      postProcessManager.addEffect(effect);
      
      const intensitySet = postProcessManager.setEffectIntensity(effect.id, 0.5);
      expect(intensitySet).toBe(true);
      expect(effect.config.intensity).toBe(0.5);
    });
  });

  describe('颜色调整效果', () => {
    it('亮度效果应该调整像素亮度', () => {
      const config = {
        type: PostProcessType.BRIGHTNESS as const,
        enabled: true,
        intensity: 1.0,
        parameters: {
          amount: 50
        }
      };
      
      const effect = new BrightnessEffect(config);
      const imageData = new (global as any).ImageData(2, 2);
      
      // 设置测试数据
      imageData.data.set([
        100, 100, 100, 255,  // 像素1
        150, 150, 150, 255   // 像素2
      ]);
      
      const result = effect.apply(imageData);
      expect(result).toBeInstanceOf((global as any).ImageData);
      expect(result.data[0]).toBeGreaterThan(100); // 亮度增加
    });

    it('对比度效果应该调整像素对比度', () => {
      const config = {
        type: PostProcessType.CONTRAST as const,
        enabled: true,
        intensity: 1.0,
        parameters: {
          amount: 50
        }
      };
      
      const effect = new ContrastEffect(config);
      const imageData = new (global as any).ImageData(2, 2);
      
      imageData.data.set([
        100, 100, 100, 255,
        200, 200, 200, 255
      ]);
      
      const result = effect.apply(imageData);
      expect(result).toBeInstanceOf((global as any).ImageData);
    });

    it('饱和度效果应该调整颜色饱和度', () => {
      const config = {
        type: PostProcessType.SATURATION as const,
        enabled: true,
        intensity: 1.0,
        parameters: {
          amount: 1.5
        }
      };
      
      const effect = new SaturationEffect(config);
      const imageData = new (global as any).ImageData(1, 1);
      
      imageData.data.set([255, 128, 64, 255]); // 橙色像素
      
      const result = effect.apply(imageData);
      expect(result).toBeInstanceOf((global as any).ImageData);
    });
  });

  describe('图像增强效果', () => {
    it('锐化效果应该增强边缘', () => {
      const config = {
        type: PostProcessType.SHARPEN as const,
        enabled: true,
        intensity: 1.0,
        parameters: {
          strength: 1.0,
          radius: 1
        }
      };
      
      const effect = new SharpenEffect(config);
      const imageData = new (global as any).ImageData(3, 3);
      
      const result = effect.apply(imageData);
      expect(result).toBeInstanceOf((global as any).ImageData);
    });

    it('噪点效果应该添加随机噪点', () => {
      const config = {
        type: PostProcessType.NOISE as const,
        enabled: true,
        intensity: 1.0,
        parameters: {
          amount: 0.5,
          seed: 42,
          monochrome: 0
        }
      };
      
      const effect = new NoiseEffect(config);
      const imageData = new (global as any).ImageData(2, 2);
      
      imageData.data.set([128, 128, 128, 255]);
      
      const result = effect.apply(imageData);
      expect(result).toBeInstanceOf((global as any).ImageData);
    });
  });

  describe('特殊效果', () => {
    it('Bloom效果应该创建高光溢出', () => {
      const config = {
        type: PostProcessType.BLOOM as const,
        enabled: true,
        intensity: 1.0,
        parameters: {
          threshold: 0.8,
          intensity: 1.0,
          radius: 3,
          passes: 2
        }
      };
      
      const effect = new BloomEffect(config);
      const imageData = new (global as any).ImageData(5, 5);
      
      // 创建一个亮点
      const centerIndex = (2 * 5 + 2) * 4;
      imageData.data[centerIndex] = 255;
      imageData.data[centerIndex + 1] = 255;
      imageData.data[centerIndex + 2] = 255;
      imageData.data[centerIndex + 3] = 255;
      
      const result = effect.apply(imageData);
      expect(result).toBeInstanceOf((global as any).ImageData);
    });
  });

  describe('艺术效果', () => {
    it('复古效果应该应用复古色调', () => {
      const config = createDefaultPostProcessConfig(PostProcessType.SEPIA);
      config.type = PostProcessType.SEPIA as const;
      const effect = new SepiaEffect(config);
      const imageData = new (global as any).ImageData(1, 1);
      
      imageData.data.set([255, 0, 0, 255]); // 红色像素
      
      const result = effect.apply(imageData);
      expect(result).toBeInstanceOf((global as any).ImageData);
    });

    it('像素化效果应该降低分辨率', () => {
      const config = {
        type: PostProcessType.PIXELATE as const,
        enabled: true,
        intensity: 1.0,
        parameters: {
          pixelSize: 2
        }
      };
      
      const effect = new PixelateEffect(config);
      const imageData = new (global as any).ImageData(4, 4);
      
      const result = effect.apply(imageData);
      expect(result).toBeInstanceOf((global as any).ImageData);
    });
  });

  describe('工厂函数', () => {
    it('应该创建所有支持的后处理效果', () => {
      const supportedTypes = getSupportedPostProcessTypes();
      
      for (const type of supportedTypes) {
        const config = createDefaultPostProcessConfig(type);
        const effect = createPostProcessEffect(type, config);
        
        expect(effect).toBeDefined();
        expect(effect.type).toBe(type);
      }
    });

    it('应该对无效效果类型抛出错误', () => {
      const invalidType = 'invalid-effect' as PostProcessType;
      const config = createDefaultPostProcessConfig(PostProcessType.BRIGHTNESS);
      
      expect(() => createPostProcessEffect(invalidType, config)).toThrow();
    });
  });

  describe('工具函数', () => {
    it('应该正确识别支持的效果类型', () => {
      expect(isPostProcessTypeSupported(PostProcessType.BRIGHTNESS)).toBe(true);
      expect(isPostProcessTypeSupported(PostProcessType.BLOOM)).toBe(true);
      expect(isPostProcessTypeSupported('invalid' as PostProcessType)).toBe(false);
    });

    it('应该提供效果描述', () => {
      const description = getPostProcessEffectDescription(PostProcessType.BRIGHTNESS);
      expect(description).toBeTruthy();
      expect(description.length).toBeGreaterThan(0);
    });

    it('应该提供效果分类', () => {
      expect(getPostProcessEffectCategory(PostProcessType.BRIGHTNESS)).toBe(PostProcessCategory.COLOR_ADJUSTMENT);
      expect(getPostProcessEffectCategory(PostProcessType.SHARPEN)).toBe(PostProcessCategory.IMAGE_ENHANCEMENT);
      expect(getPostProcessEffectCategory(PostProcessType.BLOOM)).toBe(PostProcessCategory.SPECIAL_EFFECTS);
      expect(getPostProcessEffectCategory(PostProcessType.SEPIA)).toBe(PostProcessCategory.ARTISTIC);
    });

    it('应该提供完整的效果信息', () => {
      const info = getPostProcessEffectInfo(PostProcessType.BRIGHTNESS);
      expect(info).toHaveProperty('type');
      expect(info).toHaveProperty('name');
      expect(info).toHaveProperty('description');
      expect(info).toHaveProperty('category');
      expect(info).toHaveProperty('parameters');
    });
  });

  describe('配置管理', () => {
    it('应该创建默认配置', () => {
      const config = createDefaultPostProcessConfig(PostProcessType.BRIGHTNESS);
      expect(config.type).toBe(PostProcessType.BRIGHTNESS);
      expect(config.enabled).toBe(true);
      expect(config.intensity).toBe(1.0);
      expect(config.parameters).toBeDefined();
    });

    it('应该支持配置更新', () => {
      const config = createDefaultPostProcessConfig(PostProcessType.CONTRAST);
      const effect = createPostProcessEffect(PostProcessType.CONTRAST, config);
      
      effect.updateConfig({ intensity: 0.5, enabled: false });
      
      expect(effect.config.intensity).toBe(0.5);
      expect(effect.config.enabled).toBe(false);
    });

    it('应该支持效果克隆', () => {
      const config = createDefaultPostProcessConfig(PostProcessType.SATURATION);
      const effect = createPostProcessEffect(PostProcessType.SATURATION, config);
      const cloned = effect.clone();
      
      expect(cloned.type).toBe(effect.type);
      expect(cloned.config.intensity).toBe(effect.config.intensity);
      expect(cloned.config.enabled).toBe(effect.config.enabled);
      expect(cloned.id).not.toBe(effect.id);
    });
  });

  describe('错误处理', () => {
    it('应该处理禁用的效果', () => {
      const config = createDefaultPostProcessConfig(PostProcessType.BRIGHTNESS);
      config.enabled = false;
      
      const effect = createPostProcessEffect(PostProcessType.BRIGHTNESS, config);
      const imageData = new (global as any).ImageData(2, 2);
      const originalData = new Uint8ClampedArray(imageData.data);
      
      const result = effect.apply(imageData);
      
      // 禁用的效果应该返回原始数据
      expect(result.data).toEqual(originalData);
    });

    it('应该处理空的效果列表', () => {
      const canvas = new (global as any).HTMLCanvasElement();
      const result = postProcessManager.process(canvas);
      
      expect(result).toBeInstanceOf((global as any).HTMLCanvasElement);
    });
  });

  describe('性能监控', () => {
    it('应该提供性能报告', () => {
      const config1 = createDefaultPostProcessConfig(PostProcessType.BRIGHTNESS);
      const config2 = createDefaultPostProcessConfig(PostProcessType.CONTRAST);
      
      const effect1 = createPostProcessEffect(PostProcessType.BRIGHTNESS, config1);
      const effect2 = createPostProcessEffect(PostProcessType.CONTRAST, config2);
      
      postProcessManager.addEffect(effect1);
      postProcessManager.addEffect(effect2);
      
      const report = postProcessManager.getPerformanceReport();
      
      expect(report).toHaveProperty('totalEffects');
      expect(report).toHaveProperty('activeEffects');
      expect(report).toHaveProperty('averageProcessTime');
      expect(report).toHaveProperty('effectsPerformance');
      expect(report.totalEffects).toBe(2);
    });
  });

  afterEach(() => {
    postProcessManager.dispose();
  });
});