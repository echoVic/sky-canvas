import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { BaseBlendOperation, BlendColor, BlendLayer, BlendManager, BlendMode, BlendModeConfig } from '../../blends';

// 创建测试用的混合操作类
class MockBlendOperation extends BaseBlendOperation {
  constructor(mode: BlendMode, config: Omit<BlendModeConfig, 'mode'>) {
    super(mode, { ...config, mode });
  }

  apply(baseColor: BlendColor, overlayColor: BlendColor): BlendColor {
    return {
      r: Math.min(255, baseColor.r + overlayColor.r),
      g: Math.min(255, baseColor.g + overlayColor.g),
      b: Math.min(255, baseColor.b + overlayColor.b),
      a: overlayColor.a
    };
  }

  clone(): MockBlendOperation {
    return new MockBlendOperation(this.mode, this.config);
  }
}

describe('BlendManager', () => {
  let blendManager: BlendManager;
  let mockOperation: MockBlendOperation;
  let mockCanvas: HTMLCanvasElement;
  let mockContext: CanvasRenderingContext2D;

  beforeEach(() => {
    blendManager = new BlendManager();
    mockOperation = new MockBlendOperation(BlendMode.NORMAL, {
      enabled: true,
      opacity: 1.0,
      preserveAlpha: false
    });

    // 模拟 Canvas 和 Context
    mockContext = {
      canvas: { width: 100, height: 100 },
      globalCompositeOperation: 'source-over',
      globalAlpha: 1,
      drawImage: vi.fn(),
      getImageData: vi.fn(() => new ImageData(100, 100)),
      putImageData: vi.fn(),
      clearRect: vi.fn(),
      save: vi.fn(),
      restore: vi.fn()
    } as any;

    mockCanvas = {
      width: 100,
      height: 100,
      getContext: vi.fn(() => mockContext)
    } as any;

    // 模拟 document.createElement
    global.document = {
      createElement: vi.fn(() => mockCanvas)
    } as any;

    // 模拟 performance.now
    global.performance = {
      now: vi.fn(() => Date.now())
    } as any;
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('混合操作管理', () => {
    it('应该能够添加混合操作', () => {
      const addedSpy = vi.fn();
      blendManager.on('blendOperationAdded', addedSpy);

      blendManager.addBlendOperation(mockOperation);

      expect(blendManager.getBlendOperation(mockOperation.id)).toBe(mockOperation);
      expect(blendManager.getStats().totalOperations).toBe(1);
      expect(blendManager.getStats().activeOperations).toBe(1);
      expect(addedSpy).toHaveBeenCalledWith(mockOperation);
    });

    it('应该能够移除混合操作', () => {
      const removedSpy = vi.fn();
      const disposeSpy = vi.spyOn(mockOperation, 'dispose');
      blendManager.on('blendOperationRemoved', removedSpy);

      blendManager.addBlendOperation(mockOperation);
      const removed = blendManager.removeBlendOperation(mockOperation.id);

      expect(removed).toBe(true);
      expect(blendManager.getBlendOperation(mockOperation.id)).toBeUndefined();
      expect(blendManager.getStats().activeOperations).toBe(0);
      expect(disposeSpy).toHaveBeenCalled();
      expect(removedSpy).toHaveBeenCalledWith(mockOperation.id);
    });

    it('移除不存在的操作应该返回 false', () => {
      const removed = blendManager.removeBlendOperation('non-existent');
      expect(removed).toBe(false);
    });

    it('应该能够获取所有混合操作', () => {
      const operation1 = new MockBlendOperation(BlendMode.MULTIPLY, { enabled: true, opacity: 1, preserveAlpha: false });
      const operation2 = new MockBlendOperation(BlendMode.SCREEN, { enabled: true, opacity: 1, preserveAlpha: false });

      blendManager.addBlendOperation(operation1);
      blendManager.addBlendOperation(operation2);

      const operations = blendManager.getAllBlendOperations();
      expect(operations).toHaveLength(2);
      expect(operations).toContain(operation1);
      expect(operations).toContain(operation2);
    });
  });

  describe('图层混合', () => {
    let mockLayers: BlendLayer[];

    beforeEach(() => {
      mockLayers = [
        {
          id: 'layer1',
          canvas: mockCanvas,
          blendMode: BlendMode.NORMAL,
          opacity: 1.0,
          visible: true
        },
        {
          id: 'layer2',
          canvas: mockCanvas,
          blendMode: BlendMode.MULTIPLY,
          opacity: 0.8,
          visible: true
        }
      ];
    });

    it('应该能够混合图层', () => {
      const startedSpy = vi.fn();
      const completedSpy = vi.fn();
      blendManager.on('blendStarted', startedSpy);
      blendManager.on('blendCompleted', completedSpy);

      const result = blendManager.blend(mockLayers);

      expect(result).toBeDefined();
      expect(startedSpy).toHaveBeenCalledWith(mockLayers);
      expect(completedSpy).toHaveBeenCalled();
    });

    it('空图层数组应该抛出错误', () => {
      expect(() => blendManager.blend([])).toThrow('No layers to blend');
    });

    it('没有可见图层应该抛出错误', () => {
      const invisibleLayers = mockLayers.map(layer => ({ ...layer, visible: false }));
      expect(() => blendManager.blend(invisibleLayers)).toThrow('No visible layers to blend');
    });

    it('应该过滤不可见和透明图层', () => {
      const layersWithInvisible = [
        ...mockLayers,
        {
          id: 'layer3',
          canvas: mockCanvas,
          blendMode: BlendMode.NORMAL,
          opacity: 0,
          visible: true
        },
        {
          id: 'layer4',
          canvas: mockCanvas,
          blendMode: BlendMode.NORMAL,
          opacity: 1,
          visible: false
        }
      ];

      const result = blendManager.blend(layersWithInvisible);
      expect(result).toBeDefined();
      // 应该只处理前两个可见图层
    });
  });

  describe('颜色混合', () => {
    it('应该能够混合颜色数组', () => {
      const colors = [
        { color: { r: 255, g: 0, b: 0, a: 255 }, blendMode: BlendMode.NORMAL, opacity: 1.0 },
        { color: { r: 0, g: 255, b: 0, a: 255 }, blendMode: BlendMode.MULTIPLY, opacity: 1.0 },
        { color: { r: 0, g: 0, b: 255, a: 255 }, blendMode: BlendMode.SCREEN, opacity: 1.0 }
      ];

      const result = blendManager.blendColors(colors);
      expect(result).toBeDefined();
      expect(result.r).toBeGreaterThanOrEqual(0);
      expect(result.r).toBeLessThanOrEqual(255);
      expect(result.g).toBeGreaterThanOrEqual(0);
      expect(result.g).toBeLessThanOrEqual(255);
      expect(result.b).toBeGreaterThanOrEqual(0);
      expect(result.b).toBeLessThanOrEqual(255);
      expect(result.a).toBeGreaterThanOrEqual(0);
      expect(result.a).toBeLessThanOrEqual(255);
    });

    it('空颜色数组应该返回透明黑色', () => {
      const result = blendManager.blendColors([]);
      expect(result).toEqual({ r: 0, g: 0, b: 0, a: 0 });
    });

    it('单个颜色应该直接返回', () => {
      const color = { r: 128, g: 64, b: 192, a: 255 };
      const colors = [{ color, blendMode: BlendMode.NORMAL, opacity: 1.0 }];
      const result = blendManager.blendColors(colors);
      expect(result).toEqual(color);
    });
  });

  describe('统计信息', () => {
    it('应该正确跟踪统计信息', () => {
      const initialStats = blendManager.getStats();
      expect(initialStats.totalOperations).toBe(0);
      expect(initialStats.activeOperations).toBe(0);

      blendManager.addBlendOperation(mockOperation);
      const afterAddStats = blendManager.getStats();
      expect(afterAddStats.totalOperations).toBe(1);
      expect(afterAddStats.activeOperations).toBe(1);

      blendManager.removeBlendOperation(mockOperation.id);
      const afterRemoveStats = blendManager.getStats();
      expect(afterRemoveStats.totalOperations).toBe(1);
      expect(afterRemoveStats.activeOperations).toBe(0);
    });

    it('应该更新混合统计', () => {
      const mockLayers: BlendLayer[] = [
        {
          id: 'layer1',
          canvas: mockCanvas,
          blendMode: BlendMode.NORMAL,
          opacity: 1.0,
          visible: true
        }
      ];

      blendManager.blend(mockLayers);
      const stats = blendManager.getStats();
      expect(stats.totalBlends).toBe(1);
      expect(stats.averageBlendTime).toBeGreaterThan(0);
    });
  });

  describe('资源管理', () => {
    it('clear 应该移除所有操作', () => {
      const operation1 = new MockBlendOperation(BlendMode.MULTIPLY, { enabled: true, opacity: 1, preserveAlpha: false });
      const operation2 = new MockBlendOperation(BlendMode.SCREEN, { enabled: true, opacity: 1, preserveAlpha: false });
      const disposeSpy1 = vi.spyOn(operation1, 'dispose');
      const disposeSpy2 = vi.spyOn(operation2, 'dispose');

      blendManager.addBlendOperation(operation1);
      blendManager.addBlendOperation(operation2);
      
      blendManager.clear();
      
      expect(blendManager.getAllBlendOperations()).toHaveLength(0);
      expect(blendManager.getStats().activeOperations).toBe(0);
      expect(disposeSpy1).toHaveBeenCalled();
      expect(disposeSpy2).toHaveBeenCalled();
    });

    it('dispose 应该清理所有资源', () => {
      const operation1 = new MockBlendOperation(BlendMode.MULTIPLY, { enabled: true, opacity: 1, preserveAlpha: false });
      const disposeSpy = vi.spyOn(operation1, 'dispose');
      const removeAllListenersSpy = vi.spyOn(blendManager, 'removeAllListeners');

      blendManager.addBlendOperation(operation1);
      blendManager.dispose();

      expect(disposeSpy).toHaveBeenCalled();
      expect(removeAllListenersSpy).toHaveBeenCalled();
      expect(blendManager.getAllBlendOperations()).toHaveLength(0);
    });
  });

  describe('错误处理', () => {
    it('应该处理混合过程中的错误', () => {
      const errorSpy = vi.fn();
      blendManager.on('blendError', errorSpy);

      // 创建会导致错误的图层
      const invalidLayers: BlendLayer[] = [
        {
          id: 'layer1',
          canvas: null as any, // 无效的 canvas
          blendMode: BlendMode.NORMAL,
          opacity: 1.0,
          visible: true
        }
      ];

      expect(() => blendManager.blend(invalidLayers)).toThrow();
    });

    it('应该处理无效的混合模式', () => {
      const layers: BlendLayer[] = [
        {
          id: 'layer1',
          canvas: mockCanvas,
          blendMode: 'invalid-mode' as any,
          opacity: 1.0,
          visible: true
        }
      ];

      // 应该能够处理无效的混合模式而不崩溃
      expect(() => blendManager.blend(layers)).not.toThrow();
    });
  });

  describe('事件系统', () => {
    it('应该正确触发事件', () => {
      const addedSpy = vi.fn();
      const removedSpy = vi.fn();
      const startedSpy = vi.fn();
      const completedSpy = vi.fn();

      blendManager.on('blendOperationAdded', addedSpy);
      blendManager.on('blendOperationRemoved', removedSpy);
      blendManager.on('blendStarted', startedSpy);
      blendManager.on('blendCompleted', completedSpy);

      // 测试添加操作事件
      blendManager.addBlendOperation(mockOperation);
      expect(addedSpy).toHaveBeenCalledWith(mockOperation);

      // 测试混合事件
      const mockLayers: BlendLayer[] = [
        {
          id: 'layer1',
          canvas: mockCanvas,
          blendMode: BlendMode.NORMAL,
          opacity: 1.0,
          visible: true
        }
      ];
      blendManager.blend(mockLayers);
      expect(startedSpy).toHaveBeenCalledWith(mockLayers);
      expect(completedSpy).toHaveBeenCalled();

      // 测试移除操作事件
      blendManager.removeBlendOperation(mockOperation.id);
      expect(removedSpy).toHaveBeenCalledWith(mockOperation.id);
    });
  });
});