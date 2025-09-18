/**
 * BasePostProcessEffect 单元测试
 */

import { beforeEach, describe, expect, it } from 'vitest';
import { BasePostProcessEffect } from '../../postprocess/BasePostProcessEffect';
import { PostProcessType, PostProcessConfig, IPostProcessEffect } from '../../types/PostProcessTypes';


class TestPostProcessEffect extends BasePostProcessEffect {
  constructor() {
    super(PostProcessType.BRIGHTNESS, {
      type: PostProcessType.BRIGHTNESS,
      enabled: true,
      intensity: 1.0,
      parameters: { amount: 0 }
    });
  }

  apply(imageData: ImageData, targetData?: ImageData): ImageData {
    const result = targetData || new ImageData(imageData.width, imageData.height);
    result.data.set(imageData.data);
    return result;
  }

  clone(): IPostProcessEffect {
    return new TestPostProcessEffect();
  }
}

describe('BasePostProcessEffect', () => {
  let effect: TestPostProcessEffect;
  let mockCanvas: HTMLCanvasElement;
  let mockImageData: ImageData;
  let mockConfig: PostProcessConfig;

  beforeEach(() => {
    effect = new TestPostProcessEffect();

    mockCanvas = document.createElement('canvas');
    mockCanvas.width = 100;
    mockCanvas.height = 100;

    mockImageData = new ImageData(100, 100);

    mockConfig = {
      type: PostProcessType.BRIGHTNESS,
      enabled: true,
      intensity: 1.0,
      parameters: { amount: 0 }
    };
  });

  describe('基本功能', () => {
    it('应该能够创建后处理效果实例', () => {
      expect(effect).toBeDefined();
      expect(effect.type).toBe(PostProcessType.BRIGHTNESS);
      expect(effect.id).toBeDefined();
    });

    it('应该有正确的效果属性', () => {
      expect(effect.type).toBe(PostProcessType.BRIGHTNESS);
      expect(effect.config).toBeDefined();
      expect(effect.config.type).toBe(PostProcessType.BRIGHTNESS);
      expect(effect.config.enabled).toBe(true);
    });
  });

  describe('配置管理', () => {
    it('应该能够更新配置', () => {
      const newConfig = {
        enabled: false,
        intensity: 0.5
      };

      effect.updateConfig(newConfig);
      expect(effect.config.enabled).toBe(false);
      expect(effect.config.intensity).toBe(0.5);
    });

    it('应该保持原有配置不变', () => {
      const originalConfig = effect.config;
      effect.updateConfig({ intensity: 0.8 });
      
      expect(effect.config.type).toBe(originalConfig.type);
      expect(effect.config.parameters).toEqual(originalConfig.parameters);
    });
  });

  describe('效果应用', () => {
    it('应该能够应用效果到ImageData', () => {
      const result = effect.apply(mockImageData);

      expect(result).toBeDefined();
      expect(result.width).toBe(mockImageData.width);
      expect(result.height).toBe(mockImageData.height);
      expect(result.data.length).toBe(mockImageData.data.length);
    });

    it('应该能够应用效果到Canvas', () => {
      const ctx = mockCanvas.getContext('2d')!;
      ctx.fillStyle = 'red';
      ctx.fillRect(0, 0, 50, 50);
      
      const resultCanvas = effect.applyToCanvas(mockCanvas);

      expect(resultCanvas).toBeDefined();
      expect(resultCanvas.width).toBe(mockCanvas.width);
      expect(resultCanvas.height).toBe(mockCanvas.height);
    });

    it('应该能够处理目标数据', () => {
      const targetData = new ImageData(100, 100);
      const result = effect.apply(mockImageData, targetData);

      expect(result).toBe(targetData);
      expect(result.width).toBe(mockImageData.width);
      expect(result.height).toBe(mockImageData.height);
    });
  });

  describe('克隆功能', () => {
    it('应该能够克隆效果实例', () => {
      const cloned = effect.clone();

      expect(cloned).toBeDefined();
      expect(cloned).not.toBe(effect);
      expect(cloned.type).toBe(effect.type);
    });
  });

  describe('清理功能', () => {
    it('应该能够清理资源', () => {
      expect(() => effect.dispose()).not.toThrow();
    });
  });
});