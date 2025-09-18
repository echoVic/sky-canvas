import { beforeEach, describe, expect, it, vi } from 'vitest';
import { BaseBlendOperation, BlendColor, BlendMode, BlendModeConfig } from '../../blends';
import { BlendMode as BlendModeEnum } from '../../types/BlendTypes';

// 创建一个具体的测试实现类
class TestBlendOperation extends BaseBlendOperation {
  constructor(mode: BlendMode, config: BlendModeConfig) {
    super(mode, config);
  }

  apply(baseColor: BlendColor, overlayColor: BlendColor): BlendColor {
    // 简单的测试实现：返回叠加颜色
    return overlayColor;
  }

  clone(): TestBlendOperation {
    return new TestBlendOperation(this.mode, this.config);
  }
}

describe('BaseBlendOperation', () => {
  let blendOperation: TestBlendOperation;
  let defaultConfig: BlendModeConfig;

  beforeEach(() => {
    defaultConfig = {
      mode: BlendModeEnum.NORMAL,
      enabled: true,
      opacity: 1.0,
      preserveAlpha: false
    };
    blendOperation = new TestBlendOperation(BlendModeEnum.NORMAL, defaultConfig);
  });

  describe('构造函数', () => {
    it('应该正确初始化属性', () => {
      expect(blendOperation.mode).toBe(BlendModeEnum.NORMAL);
      expect(blendOperation.id).toMatch(/^blend_[a-z0-9]{9}$/);
      expect(blendOperation.config).toEqual(defaultConfig);
    });

    it('应该生成唯一的ID', () => {
      const operation1 = new TestBlendOperation(BlendModeEnum.NORMAL, defaultConfig);
      const operation2 = new TestBlendOperation(BlendModeEnum.NORMAL, defaultConfig);
      expect(operation1.id).not.toBe(operation2.id);
    });
  });

  describe('配置管理', () => {
    it('应该返回配置的副本', () => {
      const config = blendOperation.config;
      config.opacity = 0.5;
      expect(blendOperation.config.opacity).toBe(1.0);
    });

    it('应该正确更新配置', () => {
      blendOperation.updateConfig({ opacity: 0.5, preserveAlpha: true });
      expect(blendOperation.config.opacity).toBe(0.5);
      expect(blendOperation.config.preserveAlpha).toBe(true);
      expect(blendOperation.config.enabled).toBe(true);
    });
  });

  describe('ImageData 处理', () => {
    let baseImageData: ImageData;
    let overlayImageData: ImageData;

    beforeEach(() => {
      // 创建 2x2 的测试图像数据
      baseImageData = new ImageData(2, 2);
      overlayImageData = new ImageData(2, 2);
      
      // 设置基础图像为红色
      for (let i = 0; i < baseImageData.data.length; i += 4) {
        baseImageData.data[i] = 255;     // R
        baseImageData.data[i + 1] = 0;   // G
        baseImageData.data[i + 2] = 0;   // B
        baseImageData.data[i + 3] = 255; // A
      }
      
      // 设置叠加图像为蓝色
      for (let i = 0; i < overlayImageData.data.length; i += 4) {
        overlayImageData.data[i] = 0;     // R
        overlayImageData.data[i + 1] = 0; // G
        overlayImageData.data[i + 2] = 255; // B
        overlayImageData.data[i + 3] = 255; // A
      }
    });

    it('应该正确处理 ImageData', () => {
      const result = blendOperation.applyToImageData(baseImageData, overlayImageData);
      
      expect(result.width).toBe(2);
      expect(result.height).toBe(2);
      
      // 由于测试实现返回叠加颜色，结果应该是蓝色
      for (let i = 0; i < result.data.length; i += 4) {
        expect(result.data[i]).toBe(0);     // R
        expect(result.data[i + 1]).toBe(0); // G
        expect(result.data[i + 2]).toBe(255); // B
        expect(result.data[i + 3]).toBe(255); // A
      }
    });

    it('当禁用时应该返回基础图像', () => {
      blendOperation.updateConfig({ enabled: false });
      const result = blendOperation.applyToImageData(baseImageData, overlayImageData);
      expect(result).toBe(baseImageData);
    });

    it('应该处理透明叠加像素', () => {
      // 设置叠加图像为透明
      for (let i = 3; i < overlayImageData.data.length; i += 4) {
        overlayImageData.data[i] = 0; // A = 0
      }
      
      const result = blendOperation.applyToImageData(baseImageData, overlayImageData);
      
      // 透明像素应该保持基础颜色
      for (let i = 0; i < result.data.length; i += 4) {
        expect(result.data[i]).toBe(255);   // R
        expect(result.data[i + 1]).toBe(0); // G
        expect(result.data[i + 2]).toBe(0); // B
        expect(result.data[i + 3]).toBe(255); // A
      }
    });

    it('应该应用不透明度', () => {
      blendOperation.updateConfig({ opacity: 0.5 });
      const result = blendOperation.applyToImageData(baseImageData, overlayImageData);
      
      // 50% 不透明度应该混合颜色
      for (let i = 0; i < result.data.length; i += 4) {
        expect(result.data[i]).toBe(128);   // Math.round(255 + (0-255) * 0.5) = 128
        expect(result.data[i + 1]).toBe(0); // (0 + 0) / 2
        expect(result.data[i + 2]).toBe(128); // Math.round(0 + (255-0) * 0.5) = 128
      }
    });
  });

  describe('Canvas 处理', () => {
    let baseCanvas: HTMLCanvasElement;
    let overlayCanvas: HTMLCanvasElement;

    beforeEach(() => {
      // 模拟 DOM 环境
      global.document = {
        createElement: vi.fn(() => ({
          width: 0,
          height: 0,
          getContext: vi.fn(() => ({
            getImageData: vi.fn(() => new ImageData(2, 2)),
            putImageData: vi.fn()
          }))
        }))
      } as any;

      baseCanvas = {
        width: 2,
        height: 2,
        getContext: vi.fn(() => ({
          getImageData: vi.fn(() => new ImageData(2, 2))
        }))
      } as any;

      overlayCanvas = {
        width: 2,
        height: 2,
        getContext: vi.fn(() => ({
          getImageData: vi.fn(() => new ImageData(2, 2))
        }))
      } as any;
    });

    it('应该正确处理 Canvas', () => {
      const result = blendOperation.applyToCanvas(baseCanvas, overlayCanvas);
      expect(result).toBeDefined();
      expect(result.width).toBe(2);
      expect(result.height).toBe(2);
    });

    it('当禁用时应该返回基础 Canvas', () => {
      blendOperation.updateConfig({ enabled: false });
      const result = blendOperation.applyToCanvas(baseCanvas, overlayCanvas);
      expect(result).toBe(baseCanvas);
    });
  });

  describe('工具方法', () => {
    it('clamp 应该限制数值范围', () => {
      expect((blendOperation as any).clamp(-10)).toBe(0);
      expect((blendOperation as any).clamp(300)).toBe(255);
      expect((blendOperation as any).clamp(128)).toBe(128);
      expect((blendOperation as any).clamp(50, 10, 100)).toBe(50);
      expect((blendOperation as any).clamp(5, 10, 100)).toBe(10);
      expect((blendOperation as any).clamp(150, 10, 100)).toBe(100);
    });

    it('lerp 应该正确插值', () => {
      expect((blendOperation as any).lerp(0, 100, 0)).toBe(0);
      expect((blendOperation as any).lerp(0, 100, 1)).toBe(100);
      expect((blendOperation as any).lerp(0, 100, 0.5)).toBe(50);
      expect((blendOperation as any).lerp(50, 150, 0.25)).toBe(75);
    });

    it('normalize 应该将颜色值转换为 0-1 范围', () => {
      const color: BlendColor = { r: 255, g: 128, b: 0, a: 255 };
      const normalized = (blendOperation as any).normalize(color);
      
      expect(normalized.r).toBe(1);
      expect(normalized.g).toBeCloseTo(0.502, 3);
      expect(normalized.b).toBe(0);
      expect(normalized.a).toBe(1);
    });

    it('denormalize 应该将颜色值转换为 0-255 范围', () => {
      const color = { r: 1, g: 0.5, b: 0, a: 1 };
      const denormalized = (blendOperation as any).denormalize(color);
      
      expect(denormalized.r).toBe(255);
      expect(denormalized.g).toBe(Math.round(127.5));
      expect(denormalized.b).toBe(0);
      expect(denormalized.a).toBe(255);
    });

    it('getLuminance 应该计算正确的亮度值', () => {
      const white: BlendColor = { r: 255, g: 255, b: 255, a: 255 };
      const black: BlendColor = { r: 0, g: 0, b: 0, a: 255 };
      const red: BlendColor = { r: 255, g: 0, b: 0, a: 255 };
      
      expect((blendOperation as any).getLuminance(white)).toBeCloseTo(1, 3);
      expect((blendOperation as any).getLuminance(black)).toBe(0);
      expect((blendOperation as any).getLuminance(red)).toBeCloseTo(0.299, 3);
    });

    it('rgbToHsl 和 hslToRgb 应该正确转换', () => {
      const red: BlendColor = { r: 255, g: 0, b: 0, a: 255 };
      const hsl = (blendOperation as any).rgbToHsl(red);
      
      expect(hsl.h).toBe(0);
      expect(hsl.s).toBe(1);
      expect(hsl.l).toBe(0.5);
      
      const rgb = (blendOperation as any).hslToRgb(hsl.h, hsl.s, hsl.l);
      expect(rgb.r).toBe(255);
      expect(rgb.g).toBe(0);
      expect(rgb.b).toBe(0);
    });
  });

  describe('混合算法', () => {
    it('screen 应该正确计算', () => {
      expect((blendOperation as any).screen(0.5, 0.5)).toBe(0.75);
      expect((blendOperation as any).screen(0, 1)).toBe(1);
      expect((blendOperation as any).screen(1, 0)).toBe(1);
    });

    it('multiply 应该正确计算', () => {
      expect((blendOperation as any).multiply(0.5, 0.5)).toBe(0.25);
      expect((blendOperation as any).multiply(0, 1)).toBe(0);
      expect((blendOperation as any).multiply(1, 1)).toBe(1);
    });

    it('overlay 应该正确计算', () => {
      expect((blendOperation as any).overlay(0.25, 0.5)).toBe(0.25);
      expect((blendOperation as any).overlay(0.75, 0.5)).toBe(0.75);
    });

    it('colorDodge 应该正确计算', () => {
      expect((blendOperation as any).colorDodge(0.5, 1)).toBe(1);
      expect((blendOperation as any).colorDodge(0.5, 0.5)).toBe(1);
      expect((blendOperation as any).colorDodge(0.25, 0.5)).toBe(0.5);
    });

    it('colorBurn 应该正确计算', () => {
      expect((blendOperation as any).colorBurn(0.5, 0)).toBe(0);
      expect((blendOperation as any).colorBurn(0.5, 0.5)).toBe(0);
      expect((blendOperation as any).colorBurn(0.75, 0.5)).toBe(0.5);
    });
  });

  describe('资源管理', () => {
    it('dispose 应该正确清理资源', () => {
      expect(() => blendOperation.dispose()).not.toThrow();
    });

    it('clone 应该创建正确的副本', () => {
      const cloned = blendOperation.clone();
      expect(cloned).toBeInstanceOf(TestBlendOperation);
      expect(cloned.mode).toBe(blendOperation.mode);
      expect(cloned.config).toEqual(blendOperation.config);
      expect(cloned.id).not.toBe(blendOperation.id);
    });
  });
});