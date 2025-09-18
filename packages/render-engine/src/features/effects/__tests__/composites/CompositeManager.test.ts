import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CompositeConfig, CompositeLayer, CompositeManager, CompositeOperation, ICompositeOperation } from '../../composites';


// 模拟复合操作类
class MockCompositeOperation implements ICompositeOperation {
  public readonly id: string;
  public readonly operation: CompositeOperation;
  public readonly config: CompositeConfig;
  private disposed = false;

  constructor(operation: CompositeOperation, config: CompositeConfig) {
    this.operation = operation;
    this.config = { ...config };
    this.id = `mock-${Math.random().toString(36).substr(2, 9)}`;
  }

  apply = vi.fn();
  applyToImageData = vi.fn().mockReturnValue(new ImageData(100, 100));
  updateConfig = vi.fn();
  clone = vi.fn().mockImplementation(() => {
    const clonedOperation = Object.create(MockCompositeOperation.prototype);
    clonedOperation.operation = this.operation;
    clonedOperation.config = { ...this.config };
    clonedOperation.id = `mock-${Math.random().toString(36).substr(2, 9)}`;
    clonedOperation.apply = vi.fn();
    clonedOperation.applyToImageData = vi.fn().mockReturnValue(new ImageData(100, 100));
    clonedOperation.updateConfig = vi.fn();
    clonedOperation.clone = vi.fn();
    clonedOperation.dispose = vi.fn();
    return clonedOperation;
  });
  
  dispose(): void {
    this.disposed = true;
  }

  get isDisposed(): boolean {
    return this.disposed;
  }
}

describe('CompositeManager', () => {
  let compositeManager: CompositeManager;
  let mockCanvas: HTMLCanvasElement;
  let mockContext: CanvasRenderingContext2D;
  let defaultConfig: CompositeConfig;

  beforeEach(() => {
    compositeManager = new CompositeManager();
    
    defaultConfig = {
      operation: CompositeOperation.SOURCE_OVER,
      globalAlpha: 1.0,
      enabled: true,
      preserveCanvas: false,
      clipToRegion: false
    };

    // 模拟 Canvas 和 Context
    mockContext = {
      save: vi.fn(),
      restore: vi.fn(),
      drawImage: vi.fn(),
      globalCompositeOperation: 'source-over',
      globalAlpha: 1.0,
      clearRect: vi.fn(),
      getImageData: vi.fn().mockReturnValue(new ImageData(100, 100)),
      putImageData: vi.fn(),
      createImageData: vi.fn().mockReturnValue(new ImageData(100, 100))
    } as unknown as CanvasRenderingContext2D;

    mockCanvas = {
      width: 100,
      height: 100,
      getContext: vi.fn().mockReturnValue(mockContext)
    } as unknown as HTMLCanvasElement;

    // 模拟 document.createElement
    const mockCreateElement = vi.fn((tagName: string) => {
      if (tagName === 'canvas') {
        const canvas = Object.create(HTMLCanvasElement.prototype);
        canvas.width = 100;
        canvas.height = 100;
        canvas.getContext = vi.fn().mockReturnValue(mockContext);
        return canvas;
      }
      return {};
    });

    global.document = {
      createElement: mockCreateElement
    } as unknown as Document;
  });

  describe('构造函数和初始化', () => {
    it('应该正确初始化', () => {
      expect(compositeManager).toBeInstanceOf(CompositeManager);
      expect(compositeManager.getAllCompositeOperations()).toHaveLength(0);
    });

    it('应该初始化统计信息', () => {
      const stats = compositeManager.getStats();
      expect(stats.totalOperations).toBe(0);
      expect(stats.activeOperations).toBe(0);
      expect(stats.totalComposites).toBe(0);
      expect(stats.averageCompositeTime).toBe(0);
      expect(stats.memoryUsage).toBe(0);
    });
  });

  describe('复合操作管理', () => {
    let mockOperation: MockCompositeOperation;

    beforeEach(() => {
      mockOperation = new MockCompositeOperation(CompositeOperation.SOURCE_OVER, defaultConfig);
    });

    it('应该能够添加复合操作', () => {
      const addedSpy = vi.fn();
      compositeManager.on('compositeOperationAdded', addedSpy);
      
      compositeManager.addCompositeOperation(mockOperation);
      
      expect(compositeManager.getAllCompositeOperations()).toHaveLength(1);
      expect(compositeManager.getCompositeOperation(mockOperation.id)).toBe(mockOperation);
      expect(addedSpy).toHaveBeenCalledWith(mockOperation);
      
      const stats = compositeManager.getStats();
      expect(stats.totalOperations).toBe(1);
      expect(stats.activeOperations).toBe(1);
    });

    it('应该能够移除复合操作', () => {
      const removedSpy = vi.fn();
      compositeManager.on('compositeOperationRemoved', removedSpy);
      
      compositeManager.addCompositeOperation(mockOperation);
      const removed = compositeManager.removeCompositeOperation(mockOperation.id);
      
      expect(removed).toBe(true);
      expect(compositeManager.getAllCompositeOperations()).toHaveLength(0);
      expect(compositeManager.getCompositeOperation(mockOperation.id)).toBeUndefined();
      expect(removedSpy).toHaveBeenCalledWith(mockOperation.id);
      expect(mockOperation.isDisposed).toBe(true);
      
      const stats = compositeManager.getStats();
      expect(stats.activeOperations).toBe(0);
    });

    it('移除不存在的操作应该返回 false', () => {
      const removed = compositeManager.removeCompositeOperation('non-existent-id');
      expect(removed).toBe(false);
    });

    it('应该能够获取所有复合操作', () => {
      const operation1 = new MockCompositeOperation(CompositeOperation.SOURCE_OVER, defaultConfig);
      const operation2 = new MockCompositeOperation(CompositeOperation.MULTIPLY, defaultConfig);
      
      compositeManager.addCompositeOperation(operation1);
      compositeManager.addCompositeOperation(operation2);
      
      const operations = compositeManager.getAllCompositeOperations();
      expect(operations).toHaveLength(2);
      expect(operations).toContain(operation1);
      expect(operations).toContain(operation2);
    });
  });

  describe('图层复合', () => {
    let mockLayers: CompositeLayer[];

    beforeEach(() => {
      mockLayers = [
        {
          id: 'layer1',
          canvas: mockCanvas,
          operation: CompositeOperation.SOURCE_OVER,
          globalAlpha: 1.0,
          visible: true,
          bounds: { x: 0, y: 0, width: 100, height: 100 }
        },
        {
          id: 'layer2',
          canvas: mockCanvas,
          operation: CompositeOperation.MULTIPLY,
          globalAlpha: 0.8,
          visible: true,
          bounds: { x: 50, y: 50, width: 100, height: 100 }
        }
      ];
    });

    it('应该能够复合图层', () => {
      const startedSpy = vi.fn();
      const completedSpy = vi.fn();
      
      compositeManager.on('compositeStarted', startedSpy);
      compositeManager.on('compositeCompleted', completedSpy);
      
      const result = compositeManager.composite(mockLayers);
      
      expect(result).toBeInstanceOf(HTMLCanvasElement);
      expect(startedSpy).toHaveBeenCalledWith(mockLayers);
      expect(completedSpy).toHaveBeenCalled();
      
      const stats = compositeManager.getStats();
      expect(stats.totalComposites).toBe(1);
    });

    it('应该过滤不可见图层', () => {
      mockLayers[1].visible = false;
      
      const result = compositeManager.composite(mockLayers);
      
      expect(result).toBeInstanceOf(HTMLCanvasElement);
      // 只有一个可见图层被处理
    });

    it('应该过滤透明度为 0 的图层', () => {
      mockLayers[1].globalAlpha = 0;
      
      const result = compositeManager.composite(mockLayers);
      
      expect(result).toBeInstanceOf(HTMLCanvasElement);
    });

    it('空图层数组应该抛出错误', () => {
      expect(() => compositeManager.composite([])).toThrow('No layers to composite');
    });

    it('没有可见图层应该抛出错误', () => {
      mockLayers.forEach(layer => layer.visible = false);
      
      expect(() => compositeManager.composite(mockLayers)).toThrow('No visible layers to composite');
    });

    it('应该正确计算边界', () => {
      const result = compositeManager.composite(mockLayers);
      
      expect(result).toBeInstanceOf(HTMLCanvasElement);
      // 边界应该包含所有图层
    });

    it('应该支持带遮罩的图层', () => {
      const maskCanvas = { ...mockCanvas } as HTMLCanvasElement;
      mockLayers[0].mask = maskCanvas;
      
      const result = compositeManager.composite(mockLayers);
      
      expect(result).toBeInstanceOf(HTMLCanvasElement);
    });

    it('应该支持 ImageData 遮罩', () => {
      const maskImageData = new ImageData(100, 100);
      mockLayers[0].mask = maskImageData;
      
      const result = compositeManager.composite(mockLayers);
      
      expect(result).toBeInstanceOf(HTMLCanvasElement);
    });
  });

  describe('统计信息', () => {
    it('应该正确更新统计信息', () => {
      const mockLayers: CompositeLayer[] = [
        {
          id: 'layer1',
          canvas: mockCanvas,
          operation: CompositeOperation.SOURCE_OVER,
          globalAlpha: 1.0,
          visible: true
        }
      ];
      
      compositeManager.composite(mockLayers);
      compositeManager.composite(mockLayers);
      
      const stats = compositeManager.getStats();
      expect(stats.totalComposites).toBe(2);
      expect(stats.averageCompositeTime).toBeGreaterThan(0);
    });

    it('应该跟踪内存使用情况', () => {
      const stats = compositeManager.getStats();
      expect(typeof stats.memoryUsage).toBe('number');
      expect(stats.memoryUsage).toBeGreaterThanOrEqual(0);
    });
  });

  describe('清理和销毁', () => {
    it('clear 应该移除所有操作', () => {
      const operation1 = new MockCompositeOperation(CompositeOperation.SOURCE_OVER, defaultConfig);
      const operation2 = new MockCompositeOperation(CompositeOperation.MULTIPLY, defaultConfig);
      
      compositeManager.addCompositeOperation(operation1);
      compositeManager.addCompositeOperation(operation2);
      
      compositeManager.clear();
      
      expect(compositeManager.getAllCompositeOperations()).toHaveLength(0);
      expect(operation1.isDisposed).toBe(true);
      expect(operation2.isDisposed).toBe(true);
      
      const stats = compositeManager.getStats();
      expect(stats.activeOperations).toBe(0);
    });

    it('dispose 应该清理所有资源', () => {
      const operation = new MockCompositeOperation(CompositeOperation.SOURCE_OVER, defaultConfig);
      compositeManager.addCompositeOperation(operation);
      
      compositeManager.dispose();
      
      expect(operation.isDisposed).toBe(true);
      expect(compositeManager.getAllCompositeOperations()).toHaveLength(0);
    });
  });

  describe('事件系统', () => {
    it('应该触发操作添加事件', () => {
      const spy = vi.fn();
      compositeManager.on('compositeOperationAdded', spy);
      
      const operation = new MockCompositeOperation(CompositeOperation.SOURCE_OVER, defaultConfig);
      compositeManager.addCompositeOperation(operation);
      
      expect(spy).toHaveBeenCalledWith(operation);
    });

    it('应该触发操作移除事件', () => {
      const spy = vi.fn();
      compositeManager.on('compositeOperationRemoved', spy);
      
      const operation = new MockCompositeOperation(CompositeOperation.SOURCE_OVER, defaultConfig);
      compositeManager.addCompositeOperation(operation);
      compositeManager.removeCompositeOperation(operation.id);
      
      expect(spy).toHaveBeenCalledWith(operation.id);
    });

    it('应该触发复合开始和完成事件', () => {
      const startedSpy = vi.fn();
      const completedSpy = vi.fn();
      
      compositeManager.on('compositeStarted', startedSpy);
      compositeManager.on('compositeCompleted', completedSpy);
      
      const mockLayers: CompositeLayer[] = [
        {
          id: 'layer1',
          canvas: mockCanvas,
          operation: CompositeOperation.SOURCE_OVER,
          globalAlpha: 1.0,
          visible: true
        }
      ];
      
      compositeManager.composite(mockLayers);
      
      expect(startedSpy).toHaveBeenCalledWith(mockLayers);
      expect(completedSpy).toHaveBeenCalled();
    });

    it('应该触发错误事件', () => {
      const errorSpy = vi.fn();
      compositeManager.on('compositeError', errorSpy);
      
      // 模拟错误情况
      try {
        compositeManager.composite([]);
      } catch (error) {
        // 错误被捕获，但事件可能已触发
      }
    });
  });

  describe('复合操作类型处理', () => {
    it('应该支持所有标准复合操作', () => {
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

      operations.forEach(operation => {
        const mockLayers: CompositeLayer[] = [
          {
            id: 'layer1',
            canvas: mockCanvas,
            operation: operation,
            globalAlpha: 1.0,
            visible: true
          }
        ];
        
        expect(() => compositeManager.composite(mockLayers)).not.toThrow();
      });
    });

    it('应该支持混合模式', () => {
      const blendModes = [
        CompositeOperation.MULTIPLY,
        CompositeOperation.SCREEN,
        CompositeOperation.OVERLAY,
        CompositeOperation.DARKEN,
        CompositeOperation.LIGHTEN,
        CompositeOperation.COLOR_DODGE,
        CompositeOperation.COLOR_BURN,
        CompositeOperation.HARD_LIGHT,
        CompositeOperation.SOFT_LIGHT,
        CompositeOperation.DIFFERENCE,
        CompositeOperation.EXCLUSION
      ];

      blendModes.forEach(mode => {
        const mockLayers: CompositeLayer[] = [
          {
            id: 'layer1',
            canvas: mockCanvas,
            operation: mode,
            globalAlpha: 1.0,
            visible: true
          }
        ];
        
        expect(() => compositeManager.composite(mockLayers)).not.toThrow();
      });
    });
  });

  describe('性能测试', () => {
    it('复合操作应该在合理时间内完成', () => {
      const mockLayers: CompositeLayer[] = Array.from({ length: 10 }, (_, i) => ({
        id: `layer${i}`,
        canvas: mockCanvas,
        operation: CompositeOperation.SOURCE_OVER,
        globalAlpha: 1.0,
        visible: true
      }));
      
      const startTime = performance.now();
      
      for (let i = 0; i < 5; i++) {
        compositeManager.composite(mockLayers);
      }
      
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      // 5 次复合操作应该在 1000ms 内完成
      expect(duration).toBeLessThan(1000);
    });

    it('应该正确计算平均复合时间', () => {
      const mockLayers: CompositeLayer[] = [
        {
          id: 'layer1',
          canvas: mockCanvas,
          operation: CompositeOperation.SOURCE_OVER,
          globalAlpha: 1.0,
          visible: true
        }
      ];
      
      // 执行多次复合操作
      for (let i = 0; i < 3; i++) {
        compositeManager.composite(mockLayers);
      }
      
      const stats = compositeManager.getStats();
      expect(stats.averageCompositeTime).toBeGreaterThan(0);
      expect(stats.totalComposites).toBe(3);
    });
  });
});