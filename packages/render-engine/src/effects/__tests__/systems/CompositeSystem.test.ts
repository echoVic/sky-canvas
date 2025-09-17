/**
 * 复合操作系统测试
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  CompositeCategory,
  CompositeManager,
  CompositeOperation,
  createCompositeOperation,
  getCompositeOperationCategory,
  getCompositeOperationDescription,
  getCompositeOperationInfo,
  getSupportedCompositeOperations,
  isCompositeOperationSupported,
  MultiplyComposite,
  ScreenComposite,
  SourceOverComposite,
  XORComposite
} from '../../composites';

// Mock Canvas APIs
Object.defineProperty(global, 'CanvasRenderingContext2D', {
  value: class MockCanvasRenderingContext2D {
    globalAlpha = 1;
    globalCompositeOperation = 'source-over';
    
    save() {}
    restore() {}
    clearRect() {}
    drawImage() {}
    getImageData() {
      return new (global as any).ImageData(100, 100);
    }
    putImageData() {}
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
    
    constructor(dataOrWidth: Uint8ClampedArray | number, height?: number) {
      if (typeof dataOrWidth === 'number') {
        this.width = dataOrWidth;
        this.height = height || 0;
        this.data = new Uint8ClampedArray(dataOrWidth * (height || 0) * 4);
      } else {
        this.data = dataOrWidth;
        this.width = Math.sqrt(dataOrWidth.length / 4);
        this.height = this.width;
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

describe('复合操作系统', () => {
  let compositeManager: CompositeManager;

  beforeEach(() => {
    compositeManager = new CompositeManager();
  });

  describe('CompositeManager', () => {
    it('应该能够创建管理器实例', () => {
      expect(compositeManager).toBeDefined();
      expect(compositeManager.getAllCompositeOperations()).toEqual([]);
    });

    it('应该能够添加复合操作', () => {
      const config = {
        operation: CompositeOperation.MULTIPLY,
        globalAlpha: 0.8,
        enabled: true
      };

      const operation = createCompositeOperation(CompositeOperation.MULTIPLY, config);
      compositeManager.addCompositeOperation(operation);

      expect(compositeManager.getAllCompositeOperations()).toHaveLength(1);
      expect(compositeManager.getCompositeOperation(operation.id)).toBe(operation);
    });

    it('应该能够移除复合操作', () => {
      const config = {
        operation: CompositeOperation.SCREEN,
        globalAlpha: 1,
        enabled: true
      };

      const operation = createCompositeOperation(CompositeOperation.SCREEN, config);
      compositeManager.addCompositeOperation(operation);

      const removed = compositeManager.removeCompositeOperation(operation.id);
      expect(removed).toBe(true);
      expect(compositeManager.getAllCompositeOperations()).toHaveLength(0);
    });

    it('应该能够复合图层', () => {
      const canvas1 = new (global as any).HTMLCanvasElement();
      const canvas2 = new (global as any).HTMLCanvasElement();

      const layers = [
        {
          id: 'layer1',
          canvas: canvas1,
          operation: CompositeOperation.SOURCE_OVER,
          globalAlpha: 1,
          visible: true
        },
        {
          id: 'layer2',
          canvas: canvas2,
          operation: CompositeOperation.MULTIPLY,
          globalAlpha: 0.8,
          visible: true
        }
      ];

      const result = compositeManager.composite(layers);
      expect(result).toBeInstanceOf((global as any).HTMLCanvasElement);
    });

    it('应该能够获取统计信息', () => {
      const stats = compositeManager.getStats();
      expect(stats).toHaveProperty('totalOperations');
      expect(stats).toHaveProperty('activeOperations');
      expect(stats).toHaveProperty('totalComposites');
    });
  });

  describe('复合操作实现', () => {
    it('Source Over应该正确复合像素', () => {
      const config = { 
        operation: CompositeOperation.SOURCE_OVER, 
        globalAlpha: 1, 
        enabled: true 
      };
      const composite = new SourceOverComposite(config);

      const destData = new (global as any).ImageData(2, 2);
      const sourceData = new (global as any).ImageData(2, 2);

      // 设置一些测试数据
      destData.data.set([255, 0, 0, 255, 0, 255, 0, 255, 0, 0, 255, 255, 255, 255, 255, 255]);
      sourceData.data.set([0, 0, 0, 128, 255, 255, 255, 128, 128, 128, 128, 128, 0, 0, 0, 0]);

      const result = composite.applyToImageData(destData, sourceData);
      expect(result).toBeInstanceOf((global as any).ImageData);
    });

    it('Multiply应该使颜色变暗', () => {
      const config = { 
        operation: CompositeOperation.MULTIPLY, 
        globalAlpha: 1, 
        enabled: true 
      };
      const composite = new MultiplyComposite(config);

      const canvas = new (global as any).HTMLCanvasElement();
      const ctx = canvas.getContext('2d');

      composite.apply(ctx, canvas);
      expect(ctx.globalCompositeOperation).toBe('multiply');
    });

    it('Screen应该使颜色变亮', () => {
      const config = { 
        operation: CompositeOperation.SCREEN, 
        globalAlpha: 1, 
        enabled: true 
      };
      const composite = new ScreenComposite(config);

      const canvas = new (global as any).HTMLCanvasElement();
      const ctx = canvas.getContext('2d');

      composite.apply(ctx, canvas);
      expect(ctx.globalCompositeOperation).toBe('screen');
    });

    it('XOR应该只显示不重叠部分', () => {
      const config = { 
        operation: CompositeOperation.XOR, 
        globalAlpha: 1, 
        enabled: true 
      };
      const composite = new XORComposite(config);

      const canvas = new (global as any).HTMLCanvasElement();
      const ctx = canvas.getContext('2d');

      composite.apply(ctx, canvas);
      expect(ctx.globalCompositeOperation).toBe('xor');
    });
  });

  describe('工厂函数', () => {
    it('应该创建所有支持的复合操作', () => {
      const supportedOperations = getSupportedCompositeOperations();
      
      for (const operation of supportedOperations) {
        const config = { operation, globalAlpha: 1, enabled: true };
        const compositeOp = createCompositeOperation(operation, config);
        
        expect(compositeOp).toBeDefined();
        expect(compositeOp.operation).toBe(operation);
      }
    });

    it('应该对无效复合操作抛出错误', () => {
      const invalidOperation = 'invalid-operation' as CompositeOperation;
      const config = { operation: invalidOperation, globalAlpha: 1, enabled: true };
      
      expect(() => createCompositeOperation(invalidOperation, config)).toThrow();
    });
  });

  describe('工具函数', () => {
    it('应该正确识别支持的复合操作', () => {
      expect(isCompositeOperationSupported(CompositeOperation.SOURCE_OVER)).toBe(true);
      expect(isCompositeOperationSupported(CompositeOperation.MULTIPLY)).toBe(true);
      expect(isCompositeOperationSupported('invalid' as CompositeOperation)).toBe(false);
    });

    it('应该提供复合操作描述', () => {
      const description = getCompositeOperationDescription(CompositeOperation.MULTIPLY);
      expect(description).toBeTruthy();
      expect(description.length).toBeGreaterThan(0);
    });

    it('应该提供复合操作分类', () => {
      expect(getCompositeOperationCategory(CompositeOperation.SOURCE_OVER)).toBe(CompositeCategory.SOURCE);
      expect(getCompositeOperationCategory(CompositeOperation.DESTINATION_OVER)).toBe(CompositeCategory.DESTINATION);
      expect(getCompositeOperationCategory(CompositeOperation.LIGHTER)).toBe(CompositeCategory.SPECIAL);
      expect(getCompositeOperationCategory(CompositeOperation.MULTIPLY)).toBe(CompositeCategory.BLEND);
    });

    it('应该提供完整的操作信息', () => {
      const info = getCompositeOperationInfo(CompositeOperation.MULTIPLY);
      expect(info).toHaveProperty('name');
      expect(info).toHaveProperty('description');
      expect(info).toHaveProperty('category');
      expect(info).toHaveProperty('supported');
      expect(info.supported).toBe(true);
    });
  });

  describe('配置管理', () => {
    it('应该支持透明度配置', () => {
      const config = { 
        operation: CompositeOperation.SOURCE_OVER, 
        globalAlpha: 0.5, 
        enabled: true 
      };
      const operation = createCompositeOperation(CompositeOperation.SOURCE_OVER, config);

      expect(operation.config.globalAlpha).toBe(0.5);
    });

    it('应该支持启用禁用配置', () => {
      const config = { 
        operation: CompositeOperation.MULTIPLY, 
        globalAlpha: 1, 
        enabled: false 
      };
      const operation = createCompositeOperation(CompositeOperation.MULTIPLY, config);

      expect(operation.config.enabled).toBe(false);
    });

    it('应该支持配置更新', () => {
      const config = { 
        operation: CompositeOperation.SCREEN, 
        globalAlpha: 1, 
        enabled: true 
      };
      const operation = createCompositeOperation(CompositeOperation.SCREEN, config);

      operation.updateConfig({ globalAlpha: 0.7, enabled: false });
      
      expect(operation.config.globalAlpha).toBe(0.7);
      expect(operation.config.enabled).toBe(false);
    });

    it('应该支持操作克隆', () => {
      const config = { 
        operation: CompositeOperation.OVERLAY, 
        globalAlpha: 0.8, 
        enabled: true 
      };
      const operation = createCompositeOperation(CompositeOperation.OVERLAY, config);
      const cloned = operation.clone();

      expect(cloned.operation).toBe(operation.operation);
      expect(cloned.config.globalAlpha).toBe(operation.config.globalAlpha);
      expect(cloned.config.enabled).toBe(operation.config.enabled);
      expect(cloned.id).not.toBe(operation.id);
    });
  });

  describe('错误处理', () => {
    it('应该处理空图层数组', () => {
      expect(() => compositeManager.composite([])).toThrow('No layers to composite');
    });

    it('应该处理不可见图层', () => {
      const canvas = new (global as any).HTMLCanvasElement();
      const layers = [
        {
          id: 'layer1',
          canvas: canvas,
          operation: CompositeOperation.SOURCE_OVER,
          globalAlpha: 0,
          visible: false
        }
      ];

      expect(() => compositeManager.composite(layers)).toThrow('No visible layers to composite');
    });
  });

  afterEach(() => {
    compositeManager.dispose();
  });
});