/**
 * PostProcessManager 单元测试
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PostProcessManager } from '../../postprocess/PostProcessManager';
import { IPostProcessEffect, PostProcessConfig, PostProcessLayer, PostProcessType } from '../../types/PostProcessTypes';


// Mock Effect实现
class MockEffect implements IPostProcessEffect {
  constructor(
    public id: string,
    public type: PostProcessType,
    public config: PostProcessConfig
  ) {}

  apply(imageData: ImageData, targetData?: ImageData): ImageData {
    const result = targetData || new ImageData(imageData.width, imageData.height);

    if (!this.config.enabled) {
      result.data.set(imageData.data);
      return result;
    }

    // 简单的处理：增加红色通道
    result.data.set(imageData.data);
    for (let i = 0; i < result.data.length; i += 4) {
      result.data[i] = Math.min(255, result.data[i] + 10);
    }

    return result;
  }

  applyToCanvas(canvas: HTMLCanvasElement, targetCanvas?: HTMLCanvasElement): HTMLCanvasElement {
    const target = targetCanvas || document.createElement('canvas');
    target.width = canvas.width;
    target.height = canvas.height;
    
    const ctx = canvas.getContext('2d')!;
    const targetCtx = target.getContext('2d')!;
    
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const processedData = this.apply(imageData);
    targetCtx.putImageData(processedData, 0, 0);
    
    return target;
  }

  updateConfig(config: Partial<PostProcessConfig>): void {
    this.config = { ...this.config, ...config };
  }

  clone(): IPostProcessEffect {
    return new MockEffect(this.id + '_clone', this.type, { ...this.config });
  }

  dispose(): void {
    // Mock cleanup
  }
}

// Mock Canvas
const mockCanvas = document.createElement('canvas');
mockCanvas.width = 100;
mockCanvas.height = 100;

const mockCtx = {
  getImageData: vi.fn(),
  putImageData: vi.fn(),
  drawImage: vi.fn(),
  save: vi.fn(),
  restore: vi.fn(),
  globalCompositeOperation: 'source-over' as GlobalCompositeOperation,
  globalAlpha: 1.0
} as any;

// 为CanvasRenderingContext2D原型添加drawImage方法
if (!CanvasRenderingContext2D.prototype.drawImage) {
  CanvasRenderingContext2D.prototype.drawImage = vi.fn().mockImplementation(() => {});
}

Object.defineProperty(mockCanvas, 'getContext', {
  value: vi.fn().mockReturnValue(mockCtx),
  writable: true
});

describe('PostProcessManager', () => {
  let manager: PostProcessManager;
  let mockEffect1: MockEffect;
  let mockEffect2: MockEffect;
  let testImageData: ImageData;

  beforeEach(() => {
    vi.clearAllMocks();
    manager = new PostProcessManager();

    mockEffect1 = new MockEffect('effect1', PostProcessType.BRIGHTNESS, {
      type: PostProcessType.BRIGHTNESS,
      enabled: true,
      intensity: 1.0,
      parameters: {}
    });

    mockEffect2 = new MockEffect('effect2', PostProcessType.CONTRAST, {
      type: PostProcessType.CONTRAST,
      enabled: true,
      intensity: 0.8,
      parameters: {}
    });

    // 创建测试图像数据
    testImageData = new ImageData(50, 50);
    for (let i = 0; i < testImageData.data.length; i += 4) {
      testImageData.data[i] = 100;     // R
      testImageData.data[i + 1] = 150; // G
      testImageData.data[i + 2] = 200; // B
      testImageData.data[i + 3] = 255; // A
    }

    mockCtx.getImageData.mockReturnValue(testImageData);
  });

  describe('基础管理功能', () => {
    it('应该正确初始化', () => {
      expect(manager).toBeDefined();
      expect(manager.getAllEffects()).toHaveLength(0);
      expect(manager.getStats().totalEffects).toBe(0);
    });

    it('应该能添加效果', () => {
      manager.addEffect(mockEffect1);

      expect(manager.getAllEffects()).toHaveLength(1);
      expect(manager.getEffect('effect1')).toBe(mockEffect1);
      expect(manager.getStats().totalEffects).toBe(1);
      expect(manager.getStats().activeEffects).toBe(1);
    });

    it('应该能移除效果', () => {
      manager.addEffect(mockEffect1);
      manager.addEffect(mockEffect2);

      const success = manager.removeEffect('effect1');

      expect(success).toBe(true);
      expect(manager.getAllEffects()).toHaveLength(1);
      expect(manager.getEffect('effect1')).toBeUndefined();
      expect(manager.getStats().activeEffects).toBe(1);
    });

    it('应该正确处理移除不存在的效果', () => {
      const success = manager.removeEffect('nonexistent');

      expect(success).toBe(false);
    });

    it('应该能获取所有效果', () => {
      manager.addEffect(mockEffect1);
      manager.addEffect(mockEffect2);

      const allEffects = manager.getAllEffects();

      expect(allEffects).toHaveLength(2);
      expect(allEffects).toContain(mockEffect1);
      expect(allEffects).toContain(mockEffect2);
    });
  });

  describe('Canvas处理', () => {
    it('应该处理Canvas并返回结果', () => {
      manager.addEffect(mockEffect1);

      const result = manager.process(mockCanvas);

      expect(result).toBeInstanceOf(HTMLCanvasElement);
      expect(result.width).toBe(mockCanvas.width);
      expect(result.height).toBe(mockCanvas.height);
      expect(mockCtx.getImageData).toHaveBeenCalledWith(0, 0, 100, 100);
    });

    it('应该触发processCompleted事件', async () => {
      manager.addEffect(mockEffect1);

      const promise = new Promise<void>((resolve) => {
        manager.on('processCompleted', (result) => {
          expect(result.canvas).toBeDefined();
          expect(result.processedEffects).toBe(1);
          expect(result.renderTime).toBeGreaterThan(0);
          resolve();
        });
      });

      manager.process(mockCanvas);
      await promise;
    });

    it('应该处理处理错误', () => {
      const errorEffect = new MockEffect('error', PostProcessType.BRIGHTNESS, { 
        type: PostProcessType.BRIGHTNESS,
        enabled: true, 
        intensity: 1.0,
        parameters: {}
      });
      errorEffect.apply = () => {
        throw new Error('Processing error');
      };

      manager.addEffect(errorEffect);

      expect(() => {
        manager.process(mockCanvas);
      }).toThrow('Processing error');
    });
  });

  describe('ImageData处理', () => {
    it('应该处理ImageData', () => {
      manager.addEffect(mockEffect1);

      const result = manager.processImageData(testImageData);

      expect(result).toBeInstanceOf(ImageData);
      expect(result.width).toBe(testImageData.width);
      expect(result.height).toBe(testImageData.height);
      expect(result.data[0]).toBeGreaterThan(100); // 效果应该增加红色值
    });

    it('应该在没有效果时返回原图', () => {
      const result = manager.processImageData(testImageData);

      expect(result).toBe(testImageData);
    });

    it('应该按顺序应用多个效果', () => {
      manager.addEffect(mockEffect1);
      manager.addEffect(mockEffect2);

      const result = manager.processImageData(testImageData);

      // 两个效果都增加红色值，所以应该增加20
      expect(result.data[0]).toBe(120); // 100 + 10 + 10
    });

    it('应该跳过禁用的效果', () => {
      mockEffect1.config.enabled = false;
      manager.addEffect(mockEffect1);
      manager.addEffect(mockEffect2);

      const result = manager.processImageData(testImageData);

      // 只有effect2生效
      expect(result.data[0]).toBe(110); // 100 + 10
    });

    it('应该处理单个效果失败', () => {
      const failingEffect = new MockEffect('failing', PostProcessType.BRIGHTNESS, { 
        type: PostProcessType.BRIGHTNESS,
        enabled: true, 
        intensity: 1.0,
        parameters: {}
      });
      failingEffect.apply = () => {
        throw new Error('Effect failed');
      };

      manager.addEffect(failingEffect);
      manager.addEffect(mockEffect1);

      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      const result = manager.processImageData(testImageData);

      expect(consoleSpy).toHaveBeenCalledWith('Effect brightness failed:', expect.any(Error));
      expect(result.data[0]).toBe(110); // 只有mockEffect1生效

      consoleSpy.mockRestore();
    });
  });

  describe('图层处理', () => {
    it('应该处理多图层', () => {
      const layer1: PostProcessLayer = {
        id: 'layer1',
        canvas: mockCanvas,
        effects: [mockEffect1],
        enabled: true
      };

      const layer2: PostProcessLayer = {
        id: 'layer2',
        canvas: mockCanvas,
        effects: [mockEffect2],
        enabled: true
      };

      const result = manager.processLayers([layer1, layer2]);

      expect(result).toBeInstanceOf(HTMLCanvasElement);
    });

    it('应该跳过禁用的图层', () => {
      const enabledLayer: PostProcessLayer = {
        id: 'enabled',
        canvas: mockCanvas,
        effects: [mockEffect1],
        enabled: true
      };

      const disabledLayer: PostProcessLayer = {
        id: 'disabled',
        canvas: mockCanvas,
        effects: [mockEffect2],
        enabled: false
      };

      const result = manager.processLayers([enabledLayer, disabledLayer]);

      expect(result).toBeInstanceOf(HTMLCanvasElement);
    });

    it('应该应用图层混合', () => {
      const mockDrawImage = vi.fn();
      const mockSave = vi.fn();
      const mockRestore = vi.fn();
      
      // 创建一个新的canvas用于结果
      const resultCanvas = document.createElement('canvas');
      resultCanvas.width = 100;
      resultCanvas.height = 100;
      
      const resultCtx = {
        drawImage: mockDrawImage,
        save: mockSave,
        restore: mockRestore,
        globalCompositeOperation: 'source-over' as GlobalCompositeOperation,
        globalAlpha: 1.0
      } as any;
      
      vi.spyOn(document, 'createElement').mockReturnValueOnce(resultCanvas);
      vi.spyOn(resultCanvas, 'getContext').mockReturnValue(resultCtx);

      const blendLayer: PostProcessLayer = {
        id: 'blend',
        canvas: mockCanvas,
        effects: [],
        enabled: true,
        blend: {
          mode: 'multiply',
          opacity: 0.5
        }
      };

      manager.processLayers([blendLayer]);

      expect(mockDrawImage).toHaveBeenCalled();
      expect(mockSave).toHaveBeenCalled();
      expect(mockRestore).toHaveBeenCalled();
    });

    it('应该处理没有启用图层的情况', () => {
      const disabledLayer: PostProcessLayer = {
        id: 'disabled',
        canvas: mockCanvas,
        effects: [],
        enabled: false
      };

      expect(() => {
        manager.processLayers([disabledLayer]);
      }).toThrow('No enabled layers to process');
    });
  });

  describe('便捷方法', () => {
    beforeEach(() => {
      manager.addEffect(mockEffect1);
      manager.addEffect(mockEffect2);
    });

    it('应该能启用效果', () => {
      mockEffect1.config.enabled = false;

      const success = manager.enableEffect('effect1');

      expect(success).toBe(true);
      expect(mockEffect1.config.enabled).toBe(true);
    });

    it('应该能禁用效果', () => {
      const success = manager.disableEffect('effect1');

      expect(success).toBe(true);
      expect(mockEffect1.config.enabled).toBe(false);
    });

    it('应该能设置效果强度', () => {
      const success = manager.setEffectIntensity('effect1', 0.5);

      expect(success).toBe(true);
      expect(mockEffect1.config.intensity).toBe(0.5);
    });

    it('应该钳制强度到有效范围', () => {
      manager.setEffectIntensity('effect1', 1.5);
      expect(mockEffect1.config.intensity).toBe(1.0);

      manager.setEffectIntensity('effect1', -0.5);
      expect(mockEffect1.config.intensity).toBe(0.0);
    });

    it('应该能按类型获取效果', () => {
      const brightnessEffects = manager.getEffectsByType(PostProcessType.BRIGHTNESS);
      const contrastEffects = manager.getEffectsByType(PostProcessType.CONTRAST);

      expect(brightnessEffects).toHaveLength(1);
      expect(brightnessEffects[0]).toBe(mockEffect1);
      expect(contrastEffects).toHaveLength(1);
      expect(contrastEffects[0]).toBe(mockEffect2);
    });

    it('应该能重置所有效果', () => {
      manager.resetAllEffects();

      manager.getAllEffects().forEach(effect => {
        expect(effect.config.enabled).toBe(false);
        expect(effect.config.intensity).toBe(0);
      });
    });
  });

  describe('性能统计', () => {
    it('应该跟踪统计信息', () => {
      manager.addEffect(mockEffect1);
      manager.process(mockCanvas);

      const stats = manager.getStats();

      expect(stats.totalProcesses).toBe(1);
      expect(stats.averageProcessTime).toBeGreaterThan(0);
    });

    it('应该生成性能报告', () => {
      manager.addEffect(mockEffect1);
      manager.addEffect(mockEffect2);

      const report = manager.getPerformanceReport();

      expect(report.totalEffects).toBe(2);
      expect(report.activeEffects).toBe(2);
      expect(report.effectsPerformance).toHaveLength(2);
      expect(report.effectsPerformance.some(p => p.type === PostProcessType.BRIGHTNESS)).toBe(true);
      expect(report.effectsPerformance.some(p => p.type === PostProcessType.CONTRAST)).toBe(true);
    });
  });

  describe('事件处理', () => {
    it('应该触发effectAdded事件', async () => {
      const promise = new Promise<void>((resolve) => {
        manager.on('effectAdded', (effect) => {
          expect(effect).toBe(mockEffect1);
          resolve();
        });
      });

      manager.addEffect(mockEffect1);
      await promise;
    });

    it('应该触发effectRemoved事件', async () => {
      manager.addEffect(mockEffect1);

      const promise = new Promise<void>((resolve) => {
        manager.on('effectRemoved', (effectId) => {
          expect(effectId).toBe('effect1');
          resolve();
        });
      });

      manager.removeEffect('effect1');
      await promise;
    });

    it('应该触发effectUpdated事件', async () => {
      manager.addEffect(mockEffect1);

      const promise = new Promise<void>((resolve) => {
        manager.on('effectUpdated', (effect) => {
          expect(effect).toBe(mockEffect1);
          resolve();
        });
      });

      manager.enableEffect('effect1');
      await promise;
    });

    it('应该触发processStarted事件', async () => {
      manager.addEffect(mockEffect1);

      const promise = new Promise<void>((resolve) => {
        manager.on('processStarted', (layers) => {
          expect(layers).toHaveLength(1);
          resolve();
        });
      });

      manager.processImageData(testImageData);
      await promise;
    });

    it('应该触发processError事件', async () => {
      const errorEffect = new MockEffect('error', PostProcessType.BRIGHTNESS, { 
        type: PostProcessType.BRIGHTNESS,
        enabled: true, 
        intensity: 1.0,
        parameters: {}
      });
      errorEffect.apply = () => {
        throw new Error('Test error');
      };

      manager.addEffect(errorEffect);

      const promise = new Promise<void>((resolve) => {
        manager.on('processError', (error) => {
          expect(error.message).toBe('Test error');
          resolve();
        });
      });

      expect(() => {
        manager.processImageData(testImageData);
      }).toThrow();
      await promise;
    });
  });

  describe('清理和销毁', () => {
    it('应该能清空所有效果', () => {
      manager.addEffect(mockEffect1);
      manager.addEffect(mockEffect2);

      manager.clear();

      expect(manager.getAllEffects()).toHaveLength(0);
      expect(manager.getStats().activeEffects).toBe(0);
    });

    it('应该能正确销毁', () => {
      manager.addEffect(mockEffect1);

      const removeAllListenersSpy = vi.spyOn(manager, 'removeAllListeners');

      manager.dispose();

      expect(manager.getAllEffects()).toHaveLength(0);
      expect(removeAllListenersSpy).toHaveBeenCalled();
    });
  });

  describe('性能测试', () => {
    it('应该在合理时间内处理大量效果', () => {
      // 添加多个效果
      for (let i = 0; i < 10; i++) {
        const effect = new MockEffect(`effect${i}`, PostProcessType.BRIGHTNESS, {
          type: PostProcessType.BRIGHTNESS,
          enabled: true,
          intensity: 1.0,
          parameters: {}
        });
        manager.addEffect(effect);
      }

      const startTime = performance.now();
      manager.processImageData(testImageData);
      const endTime = performance.now();

      expect(endTime - startTime).toBeLessThan(100); // 应该在100ms内完成
    });

    it('应该快速执行管理操作', () => {
      const iterations = 1000;

      const startTime = performance.now();

      for (let i = 0; i < iterations; i++) {
        manager.addEffect(new MockEffect(`temp${i}`, PostProcessType.BRIGHTNESS, { 
          type: PostProcessType.BRIGHTNESS,
          enabled: true, 
          intensity: 1.0,
          parameters: {}
        }));
        manager.removeEffect(`temp${i}`);
      }

      const endTime = performance.now();
      const duration = endTime - startTime;

      expect(duration).toBeLessThan(200); // 应该在200ms内完成
    });
  });

  describe('错误处理', () => {
    it('应该处理无效的effectId', () => {
      expect(manager.enableEffect('nonexistent')).toBe(false);
      expect(manager.disableEffect('nonexistent')).toBe(false);
      expect(manager.setEffectIntensity('nonexistent', 0.5)).toBe(false);
    });

    it('应该处理空的图层数组', () => {
      expect(() => {
        manager.processLayers([]);
      }).toThrow('No enabled layers to process');
    });
  });
});