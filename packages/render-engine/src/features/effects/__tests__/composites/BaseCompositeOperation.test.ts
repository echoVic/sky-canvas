import { beforeEach, describe, expect, it, vi } from 'vitest';
import { BaseCompositeOperation, CompositeConfig, CompositeOperation, ICompositeOperation } from '../../composites';


// 创建测试用的具体实现类
class TestCompositeOperation extends BaseCompositeOperation {
  constructor(operation: CompositeOperation, config: CompositeConfig) {
    super(operation, config);
  }

  clone(): ICompositeOperation {
    return new TestCompositeOperation(this.operation, this.config);
  }
}

describe('BaseCompositeOperation', () => {
  let defaultConfig: CompositeConfig;
  let mockCanvas: HTMLCanvasElement;
  let mockContext: CanvasRenderingContext2D;
  let testOperation: TestCompositeOperation;

  beforeEach(() => {
    defaultConfig = {
      operation: CompositeOperation.SOURCE_OVER,
      globalAlpha: 1.0,
      enabled: true,
      preserveCanvas: false,
      clipToRegion: false
    };

    // 模拟 Canvas 和 Context
    mockCanvas = {
      width: 100,
      height: 100,
      getContext: vi.fn()
    } as unknown as HTMLCanvasElement;

    mockContext = {
      save: vi.fn(),
      restore: vi.fn(),
      drawImage: vi.fn(),
      globalCompositeOperation: 'source-over',
      globalAlpha: 1.0
    } as unknown as CanvasRenderingContext2D;

    testOperation = new TestCompositeOperation(CompositeOperation.SOURCE_OVER, defaultConfig);
  });

  describe('构造函数和基本属性', () => {
    it('应该正确初始化', () => {
      expect(testOperation.operation).toBe(CompositeOperation.SOURCE_OVER);
      expect(testOperation.config.operation).toBe(CompositeOperation.SOURCE_OVER);
      expect(testOperation.config.globalAlpha).toBe(1.0);
      expect(testOperation.config.enabled).toBe(true);
      expect(testOperation.id).toBeDefined();
      expect(typeof testOperation.id).toBe('string');
    });

    it('应该生成唯一的 ID', () => {
      const operation1 = new TestCompositeOperation(CompositeOperation.SOURCE_OVER, defaultConfig);
      const operation2 = new TestCompositeOperation(CompositeOperation.SOURCE_OVER, defaultConfig);
      
      expect(operation1.id).not.toBe(operation2.id);
    });

    it('应该复制配置对象', () => {
      const config = testOperation.config;
      config.globalAlpha = 0.5;
      
      // 原始配置不应该被修改
      expect(testOperation.config.globalAlpha).toBe(1.0);
    });
  });

  describe('apply 方法', () => {
    it('应该正确应用复合操作到 Canvas', () => {
      testOperation.apply(mockContext, mockCanvas);
      
      expect(mockContext.save).toHaveBeenCalled();
      expect(mockContext.restore).toHaveBeenCalled();
      expect(mockContext.drawImage).toHaveBeenCalledWith(mockCanvas, 0, 0);
    });

    it('应该设置正确的复合操作模式', () => {
      testOperation.apply(mockContext, mockCanvas);
      
      expect(mockContext.globalCompositeOperation).toBe('source-over');
    });

    it('应该设置正确的全局透明度', () => {
      const config = { ...defaultConfig, globalAlpha: 0.5 };
      const operation = new TestCompositeOperation(CompositeOperation.SOURCE_OVER, config);
      
      operation.apply(mockContext, mockCanvas);
      
      expect(mockContext.globalAlpha).toBe(0.5);
    });

    it('应该支持指定边界的绘制', () => {
      const bounds = { x: 10, y: 20, width: 50, height: 60 };
      
      testOperation.apply(mockContext, mockCanvas, bounds);
      
      expect(mockContext.drawImage).toHaveBeenCalledWith(
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

    it('禁用时不应该执行任何操作', () => {
      const config = { ...defaultConfig, enabled: false };
      const operation = new TestCompositeOperation(CompositeOperation.SOURCE_OVER, config);
      
      operation.apply(mockContext, mockCanvas);
      
      expect(mockContext.save).not.toHaveBeenCalled();
      expect(mockContext.drawImage).not.toHaveBeenCalled();
    });
  });

  describe('applyToImageData 方法', () => {
    let sourceImageData: ImageData;
    let destImageData: ImageData;

    beforeEach(() => {
      sourceImageData = new ImageData(2, 2);
      destImageData = new ImageData(2, 2);
      
      // 设置测试数据
      for (let i = 0; i < sourceImageData.data.length; i += 4) {
        sourceImageData.data[i] = 255;     // R
        sourceImageData.data[i + 1] = 0;   // G
        sourceImageData.data[i + 2] = 0;   // B
        sourceImageData.data[i + 3] = 255; // A
        
        destImageData.data[i] = 0;         // R
        destImageData.data[i + 1] = 255;   // G
        destImageData.data[i + 2] = 0;     // B
        destImageData.data[i + 3] = 255;   // A
      }
    });

    it('应该返回正确尺寸的 ImageData', () => {
      const result = testOperation.applyToImageData(destImageData, sourceImageData);
      
      expect(result.width).toBe(destImageData.width);
      expect(result.height).toBe(destImageData.height);
      expect(result.data.length).toBe(destImageData.data.length);
    });

    it('禁用时应该返回目标数据的副本', () => {
      const config = { ...defaultConfig, enabled: false };
      const operation = new TestCompositeOperation(CompositeOperation.SOURCE_OVER, config);
      
      const result = operation.applyToImageData(destImageData, sourceImageData);
      
      // 应该与目标数据相同
      for (let i = 0; i < destImageData.data.length; i++) {
        expect(result.data[i]).toBe(destImageData.data[i]);
      }
    });

    it('应该支持提供目标 ImageData', () => {
      const targetImageData = new ImageData(2, 2);
      
      const result = testOperation.applyToImageData(destImageData, sourceImageData, targetImageData);
      
      expect(result).toBe(targetImageData);
    });

    it('应该正确处理不同的复合操作', () => {
      const operations = [
        CompositeOperation.SOURCE_OVER,
        CompositeOperation.SOURCE_ATOP,
        CompositeOperation.SOURCE_IN,
        CompositeOperation.SOURCE_OUT,
        CompositeOperation.DESTINATION_OVER,
        CompositeOperation.DESTINATION_ATOP,
        CompositeOperation.DESTINATION_IN,
        CompositeOperation.DESTINATION_OUT,
        CompositeOperation.LIGHTER,
        CompositeOperation.COPY,
        CompositeOperation.XOR
      ];

      operations.forEach(op => {
        const operation = new TestCompositeOperation(op, { ...defaultConfig, operation: op });
        const result = operation.applyToImageData(destImageData, sourceImageData);
        
        expect(result.width).toBe(2);
        expect(result.height).toBe(2);
        
        // 检查结果值在有效范围内
        for (let i = 0; i < result.data.length; i++) {
          expect(result.data[i]).toBeGreaterThanOrEqual(0);
          expect(result.data[i]).toBeLessThanOrEqual(255);
        }
      });
    });
  });

  describe('updateConfig 方法', () => {
    it('应该正确更新配置', () => {
      const newConfig = {
        globalAlpha: 0.7,
        enabled: false
      };
      
      testOperation.updateConfig(newConfig);
      
      expect(testOperation.config.globalAlpha).toBe(0.7);
      expect(testOperation.config.enabled).toBe(false);
      expect(testOperation.config.operation).toBe(CompositeOperation.SOURCE_OVER); // 未更新的属性保持不变
    });

    it('应该只更新提供的属性', () => {
      const originalConfig = testOperation.config;
      
      testOperation.updateConfig({ globalAlpha: 0.3 });
      
      expect(testOperation.config.globalAlpha).toBe(0.3);
      expect(testOperation.config.enabled).toBe(originalConfig.enabled);
      expect(testOperation.config.operation).toBe(originalConfig.operation);
    });
  });

  describe('clone 方法', () => {
    it('应该创建新的实例', () => {
      const cloned = testOperation.clone();
      
      expect(cloned).toBeInstanceOf(TestCompositeOperation);
      expect(cloned.id).not.toBe(testOperation.id);
      expect(cloned.operation).toBe(testOperation.operation);
    });

    it('应该复制配置', () => {
      testOperation.updateConfig({ globalAlpha: 0.6 });
      
      const cloned = testOperation.clone();
      
      expect(cloned.config.globalAlpha).toBe(0.6);
      expect(cloned.config.enabled).toBe(testOperation.config.enabled);
    });

    it('克隆的实例应该独立', () => {
      const cloned = testOperation.clone();
      
      cloned.updateConfig({ globalAlpha: 0.2 });
      
      expect(testOperation.config.globalAlpha).toBe(1.0);
      expect(cloned.config.globalAlpha).toBe(0.2);
    });
  });

  describe('dispose 方法', () => {
    it('应该清理资源', () => {
      expect(() => testOperation.dispose()).not.toThrow();
    });
  });

  describe('复合像素算法测试', () => {
    it('SOURCE_OVER 应该正确混合像素', () => {
      const sourceData = new ImageData(1, 1);
      const destData = new ImageData(1, 1);
      
      // 半透明红色覆盖绿色
      sourceData.data[0] = 255; // R
      sourceData.data[1] = 0;   // G
      sourceData.data[2] = 0;   // B
      sourceData.data[3] = 128; // A (50%)
      
      destData.data[0] = 0;     // R
      destData.data[1] = 255;   // G
      destData.data[2] = 0;     // B
      destData.data[3] = 255;   // A
      
      const result = testOperation.applyToImageData(destData, sourceData);
      
      // 结果应该是红绿混合
      expect(result.data[0]).toBeGreaterThan(0);   // 有红色分量
      expect(result.data[1]).toBeGreaterThan(0);   // 有绿色分量
      expect(result.data[2]).toBe(0);              // 无蓝色分量
      expect(result.data[3]).toBeGreaterThan(128); // 透明度增加
    });

    it('COPY 应该完全替换像素', () => {
      const copyOperation = new TestCompositeOperation(
        CompositeOperation.COPY,
        { ...defaultConfig, operation: CompositeOperation.COPY }
      );
      
      const sourceData = new ImageData(1, 1);
      const destData = new ImageData(1, 1);
      
      sourceData.data[0] = 255; // R
      sourceData.data[1] = 0;   // G
      sourceData.data[2] = 0;   // B
      sourceData.data[3] = 255; // A
      
      destData.data[0] = 0;     // R
      destData.data[1] = 255;   // G
      destData.data[2] = 0;     // B
      destData.data[3] = 255;   // A
      
      const result = copyOperation.applyToImageData(destData, sourceData);
      
      // 结果应该完全是源像素
      expect(result.data[0]).toBe(255);
      expect(result.data[1]).toBe(0);
      expect(result.data[2]).toBe(0);
      expect(result.data[3]).toBe(255);
    });

    it('LIGHTER 应该增加亮度', () => {
      const lighterOperation = new TestCompositeOperation(
        CompositeOperation.LIGHTER,
        { ...defaultConfig, operation: CompositeOperation.LIGHTER }
      );
      
      const sourceData = new ImageData(1, 1);
      const destData = new ImageData(1, 1);
      
      sourceData.data[0] = 100; // R
      sourceData.data[1] = 100; // G
      sourceData.data[2] = 100; // B
      sourceData.data[3] = 255; // A
      
      destData.data[0] = 100;   // R
      destData.data[1] = 100;   // G
      destData.data[2] = 100;   // B
      destData.data[3] = 255;   // A
      
      const result = lighterOperation.applyToImageData(destData, sourceData);
      
      // 结果应该更亮
      expect(result.data[0]).toBe(200); // 100 + 100
      expect(result.data[1]).toBe(200);
      expect(result.data[2]).toBe(200);
    });
  });

  describe('边界值测试', () => {
    it('应该处理极值', () => {
      const sourceData = new ImageData(1, 1);
      const destData = new ImageData(1, 1);
      
      // 测试最大值
      sourceData.data.fill(255);
      destData.data.fill(255);
      
      const result1 = testOperation.applyToImageData(destData, sourceData);
      
      for (let i = 0; i < result1.data.length; i++) {
        expect(result1.data[i]).toBeGreaterThanOrEqual(0);
        expect(result1.data[i]).toBeLessThanOrEqual(255);
      }
      
      // 测试最小值
      sourceData.data.fill(0);
      destData.data.fill(0);
      
      const result2 = testOperation.applyToImageData(destData, sourceData);
      
      for (let i = 0; i < result2.data.length; i++) {
        expect(result2.data[i]).toBeGreaterThanOrEqual(0);
        expect(result2.data[i]).toBeLessThanOrEqual(255);
      }
    });

    it('应该处理零透明度', () => {
      const sourceData = new ImageData(1, 1);
      const destData = new ImageData(1, 1);
      
      sourceData.data[0] = 255;
      sourceData.data[1] = 0;
      sourceData.data[2] = 0;
      sourceData.data[3] = 0; // 完全透明
      
      destData.data[0] = 0;
      destData.data[1] = 255;
      destData.data[2] = 0;
      destData.data[3] = 255;
      
      const result = testOperation.applyToImageData(destData, sourceData);
      
      // 透明源不应该影响目标
      expect(result.data[0]).toBe(0);
      expect(result.data[1]).toBe(255);
      expect(result.data[2]).toBe(0);
      expect(result.data[3]).toBe(255);
    });
  });

  describe('性能测试', () => {
    it('复合操作应该在合理时间内完成', () => {
      const sourceData = new ImageData(100, 100);
      const destData = new ImageData(100, 100);
      
      const startTime = performance.now();
      
      for (let i = 0; i < 10; i++) {
        testOperation.applyToImageData(destData, sourceData);
      }
      
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      // 10 次 100x100 的复合操作应该在 1000ms 内完成
      expect(duration).toBeLessThan(1000);
    });
  });
});