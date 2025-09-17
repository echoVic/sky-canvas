/**
 * StandardCompositeOperations 单元测试
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CompositeConfig, CompositeOperation, CopyComposite, DestinationAtopComposite, DestinationInComposite, DestinationOutComposite, DestinationOverComposite, LighterComposite, SourceAtopComposite, SourceInComposite, SourceOutComposite, SourceOverComposite, XORComposite } from '../../composites';


// Mock Canvas API
const mockCanvas = document.createElement('canvas');
const mockCtx = {
  save: vi.fn(),
  restore: vi.fn(),
  drawImage: vi.fn(),
  globalCompositeOperation: 'source-over',
  globalAlpha: 1.0
} as any;

Object.defineProperty(HTMLCanvasElement.prototype, 'getContext', {
  value: vi.fn().mockReturnValue(mockCtx),
  writable: true
});

describe('StandardCompositeOperations', () => {
  const mockConfig: CompositeConfig = {
    operation: CompositeOperation.SOURCE_OVER,
    enabled: true,
    globalAlpha: 1.0
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockCtx.save.mockClear();
    mockCtx.restore.mockClear();
    mockCtx.drawImage.mockClear();
  });

  describe('SourceOverComposite', () => {
    let composite: SourceOverComposite;

    beforeEach(() => {
      composite = new SourceOverComposite(mockConfig);
    });

    it('应该正确初始化', () => {
      expect(composite.operation).toBe(CompositeOperation.SOURCE_OVER);
      expect(composite.config).toEqual(mockConfig);
      expect(composite.id).toBeDefined();
    });

    it('应该能正确克隆', () => {
      const cloned = composite.clone();

      expect(cloned).not.toBe(composite);
      expect(cloned.operation).toBe(composite.operation);
      expect(cloned.config).toEqual(composite.config);
      expect(cloned).toBeInstanceOf(SourceOverComposite);
    });

    it('应该正确应用到Canvas', () => {
      composite.apply(mockCtx, mockCanvas);

      expect(mockCtx.save).toHaveBeenCalled();
      expect(mockCtx.restore).toHaveBeenCalled();
      expect(mockCtx.globalCompositeOperation).toBe(CompositeOperation.SOURCE_OVER);
      expect(mockCtx.drawImage).toHaveBeenCalledWith(mockCanvas, 0, 0);
    });
  });

  describe('SourceAtopComposite', () => {
    let composite: SourceAtopComposite;

    beforeEach(() => {
      composite = new SourceAtopComposite(mockConfig);
    });

    it('应该正确初始化', () => {
      expect(composite.operation).toBe(CompositeOperation.SOURCE_ATOP);
      expect(composite.config).toEqual(mockConfig);
    });

    it('应该能正确克隆', () => {
      const cloned = composite.clone();
      expect(cloned).toBeInstanceOf(SourceAtopComposite);
      expect(cloned.operation).toBe(CompositeOperation.SOURCE_ATOP);
    });
  });

  describe('SourceInComposite', () => {
    let composite: SourceInComposite;

    beforeEach(() => {
      composite = new SourceInComposite(mockConfig);
    });

    it('应该正确初始化', () => {
      expect(composite.operation).toBe(CompositeOperation.SOURCE_IN);
      expect(composite.config).toEqual(mockConfig);
    });

    it('应该能正确克隆', () => {
      const cloned = composite.clone();
      expect(cloned).toBeInstanceOf(SourceInComposite);
      expect(cloned.operation).toBe(CompositeOperation.SOURCE_IN);
    });
  });

  describe('SourceOutComposite', () => {
    let composite: SourceOutComposite;

    beforeEach(() => {
      composite = new SourceOutComposite(mockConfig);
    });

    it('应该正确初始化', () => {
      expect(composite.operation).toBe(CompositeOperation.SOURCE_OUT);
      expect(composite.config).toEqual(mockConfig);
    });

    it('应该能正确克隆', () => {
      const cloned = composite.clone();
      expect(cloned).toBeInstanceOf(SourceOutComposite);
      expect(cloned.operation).toBe(CompositeOperation.SOURCE_OUT);
    });
  });

  describe('DestinationOverComposite', () => {
    let composite: DestinationOverComposite;

    beforeEach(() => {
      composite = new DestinationOverComposite(mockConfig);
    });

    it('应该正确初始化', () => {
      expect(composite.operation).toBe(CompositeOperation.DESTINATION_OVER);
      expect(composite.config).toEqual(mockConfig);
    });

    it('应该能正确克隆', () => {
      const cloned = composite.clone();
      expect(cloned).toBeInstanceOf(DestinationOverComposite);
      expect(cloned.operation).toBe(CompositeOperation.DESTINATION_OVER);
    });
  });

  describe('DestinationAtopComposite', () => {
    let composite: DestinationAtopComposite;

    beforeEach(() => {
      composite = new DestinationAtopComposite(mockConfig);
    });

    it('应该正确初始化', () => {
      expect(composite.operation).toBe(CompositeOperation.DESTINATION_ATOP);
      expect(composite.config).toEqual(mockConfig);
    });

    it('应该能正确克隆', () => {
      const cloned = composite.clone();
      expect(cloned).toBeInstanceOf(DestinationAtopComposite);
      expect(cloned.operation).toBe(CompositeOperation.DESTINATION_ATOP);
    });
  });

  describe('DestinationInComposite', () => {
    let composite: DestinationInComposite;

    beforeEach(() => {
      composite = new DestinationInComposite(mockConfig);
    });

    it('应该正确初始化', () => {
      expect(composite.operation).toBe(CompositeOperation.DESTINATION_IN);
      expect(composite.config).toEqual(mockConfig);
    });

    it('应该能正确克隆', () => {
      const cloned = composite.clone();
      expect(cloned).toBeInstanceOf(DestinationInComposite);
      expect(cloned.operation).toBe(CompositeOperation.DESTINATION_IN);
    });
  });

  describe('DestinationOutComposite', () => {
    let composite: DestinationOutComposite;

    beforeEach(() => {
      composite = new DestinationOutComposite(mockConfig);
    });

    it('应该正确初始化', () => {
      expect(composite.operation).toBe(CompositeOperation.DESTINATION_OUT);
      expect(composite.config).toEqual(mockConfig);
    });

    it('应该能正确克隆', () => {
      const cloned = composite.clone();
      expect(cloned).toBeInstanceOf(DestinationOutComposite);
      expect(cloned.operation).toBe(CompositeOperation.DESTINATION_OUT);
    });
  });

  describe('LighterComposite', () => {
    let composite: LighterComposite;

    beforeEach(() => {
      composite = new LighterComposite(mockConfig);
    });

    it('应该正确初始化', () => {
      expect(composite.operation).toBe(CompositeOperation.LIGHTER);
      expect(composite.config).toEqual(mockConfig);
    });

    it('应该能正确克隆', () => {
      const cloned = composite.clone();
      expect(cloned).toBeInstanceOf(LighterComposite);
      expect(cloned.operation).toBe(CompositeOperation.LIGHTER);
    });
  });

  describe('CopyComposite', () => {
    let composite: CopyComposite;

    beforeEach(() => {
      composite = new CopyComposite(mockConfig);
    });

    it('应该正确初始化', () => {
      expect(composite.operation).toBe(CompositeOperation.COPY);
      expect(composite.config).toEqual(mockConfig);
    });

    it('应该能正确克隆', () => {
      const cloned = composite.clone();
      expect(cloned).toBeInstanceOf(CopyComposite);
      expect(cloned.operation).toBe(CompositeOperation.COPY);
    });
  });

  describe('XORComposite', () => {
    let composite: XORComposite;

    beforeEach(() => {
      composite = new XORComposite(mockConfig);
    });

    it('应该正确初始化', () => {
      expect(composite.operation).toBe(CompositeOperation.XOR);
      expect(composite.config).toEqual(mockConfig);
    });

    it('应该能正确克隆', () => {
      const cloned = composite.clone();
      expect(cloned).toBeInstanceOf(XORComposite);
      expect(cloned.operation).toBe(CompositeOperation.XOR);
    });
  });

  describe('共同功能测试', () => {
    const operations = [
      { name: 'SourceOverComposite', class: SourceOverComposite, operation: CompositeOperation.SOURCE_OVER },
      { name: 'SourceAtopComposite', class: SourceAtopComposite, operation: CompositeOperation.SOURCE_ATOP },
      { name: 'SourceInComposite', class: SourceInComposite, operation: CompositeOperation.SOURCE_IN },
      { name: 'SourceOutComposite', class: SourceOutComposite, operation: CompositeOperation.SOURCE_OUT },
      { name: 'DestinationOverComposite', class: DestinationOverComposite, operation: CompositeOperation.DESTINATION_OVER },
      { name: 'DestinationAtopComposite', class: DestinationAtopComposite, operation: CompositeOperation.DESTINATION_ATOP },
      { name: 'DestinationInComposite', class: DestinationInComposite, operation: CompositeOperation.DESTINATION_IN },
      { name: 'DestinationOutComposite', class: DestinationOutComposite, operation: CompositeOperation.DESTINATION_OUT },
      { name: 'LighterComposite', class: LighterComposite, operation: CompositeOperation.LIGHTER },
      { name: 'CopyComposite', class: CopyComposite, operation: CompositeOperation.COPY },
      { name: 'XORComposite', class: XORComposite, operation: CompositeOperation.XOR }
    ];

    operations.forEach(({ name, class: OperationClass, operation }) => {
      describe(`${name} 共同功能`, () => {
        let composite: any;

        beforeEach(() => {
          composite = new OperationClass(mockConfig);
        });

        it('应该正确处理禁用状态', () => {
          const disabledConfig: CompositeConfig = {
            operation: CompositeOperation.SOURCE_OVER,
            enabled: false,
            globalAlpha: 0.5
          };

          composite.updateConfig(disabledConfig);
          composite.apply(mockCtx, mockCanvas);

          // 当禁用时，不应该调用save/restore
          expect(mockCtx.save).not.toHaveBeenCalled();
          expect(mockCtx.restore).not.toHaveBeenCalled();
        });

        it('应该正确处理透明度', () => {
          const alphaConfig: CompositeConfig = {
            operation: CompositeOperation.SOURCE_OVER,
            enabled: true,
            globalAlpha: 0.7
          };

          composite.updateConfig(alphaConfig);
          composite.apply(mockCtx, mockCanvas);

          expect(mockCtx.globalAlpha).toBe(0.7);
        });

        it('应该正确处理边界区域渲染', () => {
          const bounds = { x: 5, y: 10, width: 50, height: 100 };

          composite.apply(mockCtx, mockCanvas, bounds);

          expect(mockCtx.drawImage).toHaveBeenCalledWith(
            mockCanvas,
            bounds.x,
            bounds.y,
            bounds.width,
            bounds.height,
            bounds.x,
            bounds.y,
            bounds.width,
            bounds.height
          );
        });

        it('应该正确设置复合操作', () => {
          composite.apply(mockCtx, mockCanvas);

          expect(mockCtx.globalCompositeOperation).toBe(operation);
        });

        it('应该正确处理ImageData操作', () => {
          const sourceData = new ImageData(50, 50);
          const destData = new ImageData(50, 50);

          // 设置一些测试数据
          for (let i = 0; i < sourceData.data.length; i += 4) {
            sourceData.data[i] = 255;     // R
            sourceData.data[i + 1] = 128; // G
            sourceData.data[i + 2] = 64;  // B
            sourceData.data[i + 3] = 255; // A
          }

          for (let i = 0; i < destData.data.length; i += 4) {
            destData.data[i] = 64;      // R
            destData.data[i + 1] = 128; // G
            destData.data[i + 2] = 255; // B
            destData.data[i + 3] = 128; // A
          }

          const result = composite.applyToImageData(destData, sourceData);

          expect(result).toBeDefined();
          expect(result.width).toBe(destData.width);
          expect(result.height).toBe(destData.height);
          expect(result.data.length).toBe(destData.data.length);

          // 验证结果不全为0（说明有处理）
          let hasNonZeroValues = false;
          for (let i = 0; i < result.data.length; i++) {
            if (result.data[i] !== 0) {
              hasNonZeroValues = true;
              break;
            }
          }
          expect(hasNonZeroValues).toBe(true);
        });

        it('应该正确处理配置更新', () => {
          const originalAlpha = composite.config.globalAlpha;
          const newConfig: Partial<CompositeConfig> = {
            globalAlpha: 0.4
          };

          composite.updateConfig(newConfig);

          expect(composite.config.globalAlpha).toBe(0.4);
          expect(composite.config.enabled).toBe(mockConfig.enabled);

          // 验证原配置没有被修改
          expect(originalAlpha).toBe(mockConfig.globalAlpha);
        });

        it('应该具有唯一ID', () => {
          const composite1 = new OperationClass(mockConfig);
          const composite2 = new OperationClass(mockConfig);

          expect(composite1.id).not.toBe(composite2.id);
          expect(composite1.id).toContain('composite');
        });

        it('应该正确释放资源', () => {
          expect(() => {
            composite.dispose();
          }).not.toThrow();
        });
      });
    });
  });

  describe('复合算法数学测试', () => {
    let composite: SourceOverComposite;

    beforeEach(() => {
      composite = new SourceOverComposite(mockConfig);
    });

    it('Source Over算法应该正确实现', () => {
      // 测试标准的source-over复合算法
      const dest = { r: 0.2, g: 0.4, b: 0.6, a: 0.8 };
      const src = { r: 0.8, g: 0.6, b: 0.4, a: 0.6 };

      const result = (composite as any).sourceOver(dest, src);

      // 验证alpha混合公式: alpha_out = src.a + dest.a * (1 - src.a)
      const expectedAlpha = src.a + dest.a * (1 - src.a);
      expect(result.a).toBeCloseTo(expectedAlpha, 5);

      // 验证颜色混合公式
      if (result.a > 0) {
        const expectedR = (src.r * src.a + dest.r * dest.a * (1 - src.a)) / result.a;
        const expectedG = (src.g * src.a + dest.g * dest.a * (1 - src.a)) / result.a;
        const expectedB = (src.b * src.a + dest.b * dest.a * (1 - src.a)) / result.a;

        expect(result.r).toBeCloseTo(expectedR, 5);
        expect(result.g).toBeCloseTo(expectedG, 5);
        expect(result.b).toBeCloseTo(expectedB, 5);
      }
    });

    it('应该正确处理完全透明的源', () => {
      const dest = { r: 0.5, g: 0.5, b: 0.5, a: 1.0 };
      const src = { r: 1.0, g: 0.0, b: 0.0, a: 0.0 };

      const result = (composite as any).sourceOver(dest, src);

      // 完全透明的源不应该改变目标
      expect(result.r).toBeCloseTo(dest.r, 5);
      expect(result.g).toBeCloseTo(dest.g, 5);
      expect(result.b).toBeCloseTo(dest.b, 5);
      expect(result.a).toBeCloseTo(dest.a, 5);
    });

    it('应该正确处理完全不透明的源', () => {
      const dest = { r: 0.2, g: 0.4, b: 0.6, a: 0.5 };
      const src = { r: 0.8, g: 0.6, b: 0.4, a: 1.0 };

      const result = (composite as any).sourceOver(dest, src);

      // 完全不透明的源应该完全覆盖目标（除了透明度会叠加）
      expect(result.r).toBeCloseTo(src.r, 5);
      expect(result.g).toBeCloseTo(src.g, 5);
      expect(result.b).toBeCloseTo(src.b, 5);
      expect(result.a).toBeCloseTo(1.0, 5); // src.a + dest.a * (1 - src.a) = 1 + 0.5 * 0 = 1
    });

    it('应该正确处理零透明度结果', () => {
      const dest = { r: 0.5, g: 0.5, b: 0.5, a: 0.0 };
      const src = { r: 1.0, g: 0.0, b: 0.0, a: 0.0 };

      const result = (composite as any).sourceOver(dest, src);

      // 当结果透明度为0时，颜色应该为0
      expect(result.r).toBe(0);
      expect(result.g).toBe(0);
      expect(result.b).toBe(0);
      expect(result.a).toBe(0);
    });
  });

  describe('性能测试', () => {
    it('应该在合理时间内处理大量Canvas操作', () => {
      const composite = new SourceOverComposite(mockConfig);
      const startTime = performance.now();

      for (let i = 0; i < 1000; i++) {
        composite.apply(mockCtx, mockCanvas);
      }

      const endTime = performance.now();
      const duration = endTime - startTime;

      // 应该在100ms内完成
      expect(duration).toBeLessThan(100);
    });

    it('应该在合理时间内处理ImageData', () => {
      const composite = new LighterComposite(mockConfig);
      const imageData1 = new ImageData(100, 100);
      const imageData2 = new ImageData(100, 100);

      // 初始化测试数据
      for (let i = 0; i < imageData1.data.length; i++) {
        imageData1.data[i] = Math.floor(Math.random() * 256);
        imageData2.data[i] = Math.floor(Math.random() * 256);
      }

      const startTime = performance.now();
      composite.applyToImageData(imageData1, imageData2);
      const endTime = performance.now();
      const duration = endTime - startTime;

      // 处理100x100图像应该在50ms内完成
      expect(duration).toBeLessThan(50);
    });
  });

  describe('错误处理测试', () => {
    it('应该处理无效的Canvas上下文', () => {
      const composite = new CopyComposite(mockConfig);

      expect(() => {
        composite.apply(null as any, mockCanvas);
      }).not.toThrow();

      expect(() => {
        composite.apply(undefined as any, mockCanvas);
      }).not.toThrow();
    });

    it('应该处理无效的Canvas', () => {
      const composite = new XORComposite(mockConfig);

      expect(() => {
        composite.apply(mockCtx, null as any);
      }).not.toThrow();

      expect(() => {
        composite.apply(mockCtx, undefined as any);
      }).not.toThrow();
    });

    it('应该处理无效的ImageData', () => {
      const composite = new DestinationOverComposite(mockConfig);
      const validImageData = new ImageData(10, 10);

      expect(() => {
        composite.applyToImageData(null as any, validImageData);
      }).not.toThrow();

      expect(() => {
        composite.applyToImageData(validImageData, null as any);
      }).not.toThrow();
    });
  });

  describe('边界值测试', () => {
    it('应该正确处理极端透明度值', () => {
      const composite = new SourceOverComposite(mockConfig);

      const extremeConfigs = [
        { enabled: true, globalAlpha: 0.0 },
        { enabled: true, globalAlpha: 1.0 },
        { enabled: true, globalAlpha: -1.0 }, // 边界外值
        { enabled: true, globalAlpha: 2.0 }   // 边界外值
      ];

      extremeConfigs.forEach(config => {
        expect(() => {
          composite.updateConfig(config);
          composite.apply(mockCtx, mockCanvas);
        }).not.toThrow();
      });
    });

    it('应该正确处理极端颜色值', () => {
      const composite = new LighterComposite(mockConfig);

      const extremePixels = [
        { dest: { r: 0, g: 0, b: 0, a: 0 }, src: { r: 1, g: 1, b: 1, a: 1 } },
        { dest: { r: 1, g: 1, b: 1, a: 1 }, src: { r: 0, g: 0, b: 0, a: 0 } },
        { dest: { r: -1, g: 2, b: 0.5, a: 0.5 }, src: { r: 0.5, g: 0.5, b: -1, a: 2 } }
      ];

      extremePixels.forEach(({ dest, src }) => {
        expect(() => {
          (composite as any).lighter(dest, src);
        }).not.toThrow();
      });
    });
  });
});