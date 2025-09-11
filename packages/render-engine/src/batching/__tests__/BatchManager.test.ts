/**
 * 批处理管理器测试
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { BatchManager, BatchStrategy, globalBatchManager } from '../BatchManager';
import { IRenderable } from '../../core/IRenderEngine';
import { IRect } from '../../graphics/IGraphicsContext';

// 创建模拟的渲染对象
class MockRenderable implements IRenderable {
  readonly id: string;
  readonly bounds: IRect;
  readonly visible: boolean = true;
  readonly zIndex: number = 0;
  
  textureId?: string;
  blendMode?: string;
  shaderId?: string;
  
  constructor(id: string, options?: Partial<MockRenderable>) {
    this.id = id;
    this.bounds = { x: 0, y: 0, width: 10, height: 10 };
    this.zIndex = options?.zIndex ?? 0;
    Object.assign(this, options);
  }
  
  getBounds(): IRect {
    return this.bounds;
  }
  
  render = vi.fn();
  
  hitTest(point: { x: number; y: number }): boolean {
    return point.x >= this.bounds.x && 
           point.x <= this.bounds.x + this.bounds.width &&
           point.y >= this.bounds.y && 
           point.y <= this.bounds.y + this.bounds.height;
  }
  
  dispose(): void {
    // Mock implementation
  }
}

describe('BatchManager', () => {
  let manager: BatchManager;
  let mockContext: any;

  beforeEach(() => {
    manager = new BatchManager({
      strategy: BatchStrategy.ENHANCED,
      enableAutoOptimization: false // 禁用自动优化以便测试
    });
    
    mockContext = {
      drawElements: vi.fn(),
      bindTexture: vi.fn(),
      useProgram: vi.fn()
    };
  });

  afterEach(() => {
    manager.dispose();
  });

  describe('基本功能', () => {
    it('应该能够创建批处理管理器', () => {
      expect(manager).toBeDefined();
      expect(manager.getCurrentStrategy()).toBe(BatchStrategy.ENHANCED);
    });

    it('应该能够添加渲染对象', () => {
      const renderable = new MockRenderable('item1');
      
      expect(() => {
        manager.addRenderable(renderable);
      }).not.toThrow();
    });

    it('应该能够渲染帧', () => {
      const renderable = new MockRenderable('item1');
      manager.addRenderable(renderable);
      
      manager.beginFrame();
      expect(() => {
        manager.renderFrame(mockContext);
      }).not.toThrow();
      manager.endFrame();
    });

    it('应该能够获取统计信息', () => {
      const renderable = new MockRenderable('item1');
      manager.addRenderable(renderable);
      
      manager.beginFrame();
      manager.renderFrame(mockContext);
      manager.endFrame();
      
      const stats = manager.getStats();
      expect(stats).toBeDefined();
      expect(typeof stats.totalItems).toBe('number');
    });
  });

  describe('策略管理', () => {
    it('应该能够设置批处理策略', () => {
      manager.setStrategy(BatchStrategy.ADVANCED);
      expect(manager.getCurrentStrategy()).toBe(BatchStrategy.ADVANCED);
    });

    it('应该在策略改变时触发事件', () => {
      let strategyChanged = false;
      let newStrategy: BatchStrategy | null = null;
      
      manager.on('strategyChanged', (strategy) => {
        strategyChanged = true;
        newStrategy = strategy;
      });

      manager.setStrategy(BatchStrategy.ADVANCED);
      
      expect(strategyChanged).toBe(true);
      expect(newStrategy).toBe(BatchStrategy.ADVANCED);
    });

    it('应该能够使用AUTO策略自动选择', () => {
      const autoManager = new BatchManager({
        strategy: BatchStrategy.AUTO,
        enableAutoOptimization: false
      });
      
      expect(autoManager.getCurrentStrategy()).toBe(BatchStrategy.AUTO);
      
      // 添加一些渲染对象来触发策略选择
      const renderable = new MockRenderable('item1');
      autoManager.addRenderable(renderable);
      
      autoManager.dispose();
    });
  });

  describe('配置管理', () => {
    it('应该能够获取配置', () => {
      const config = manager.getConfig();
      expect(config).toBeDefined();
      expect(config.strategy).toBe(BatchStrategy.ENHANCED);
    });

    it('应该能够更新配置', () => {
      manager.updateConfig({
        maxBatchSize: 5000,
        instancingThreshold: 100
      });
      
      const config = manager.getConfig();
      expect(config.maxBatchSize).toBe(5000);
      expect(config.instancingThreshold).toBe(100);
    });

    it('应该能够启用/禁用纹理图集', () => {
      manager.updateConfig({ enableTextureAtlas: false });
      expect(manager.getConfig().enableTextureAtlas).toBe(false);
      
      manager.updateConfig({ enableTextureAtlas: true });
      expect(manager.getConfig().enableTextureAtlas).toBe(true);
    });
  });

  describe('性能监控', () => {
    it('应该能够记录性能指标', () => {
      const renderable = new MockRenderable('item1');
      manager.addRenderable(renderable);
      
      manager.beginFrame();
      manager.renderFrame(mockContext);
      manager.endFrame();
      
      const history = manager.getPerformanceHistory();
      expect(history).toHaveLength(1);
      
      const metrics = history[0];
      expect(typeof metrics.frameTime).toBe('number');
      expect(typeof metrics.batchTime).toBe('number');
      expect(typeof metrics.renderTime).toBe('number');
    });

    it('应该在性能更新时触发事件', () => {
      let performanceUpdated = false;
      let metrics: any = null;
      
      manager.on('performanceUpdate', (data) => {
        performanceUpdated = true;
        metrics = data;
      });

      const renderable = new MockRenderable('item1');
      manager.addRenderable(renderable);
      
      manager.beginFrame();
      manager.renderFrame(mockContext);
      manager.endFrame();
      
      expect(performanceUpdated).toBe(true);
      expect(metrics).not.toBeNull();
    });

    it('应该能够检测性能阈值警告', () => {
      let warningTriggered = false;
      let warningData: any = null;
      
      manager.on('warningThreshold', (data) => {
        warningTriggered = true;
        warningData = data;
      });

      // 模拟长帧时间
      const originalNow = performance.now;
      let callCount = 0;
      performance.now = vi.fn(() => {
        callCount++;
        if (callCount === 1) return 0;
        if (callCount === 2) return 0; // beginFrame
        return 20; // 超过16.67ms阈值
      });

      const renderable = new MockRenderable('item1');
      manager.addRenderable(renderable);
      
      manager.beginFrame();
      manager.renderFrame(mockContext);
      manager.endFrame();
      
      performance.now = originalNow;
      
      expect(warningTriggered).toBe(true);
      expect(warningData.metric).toBe('frameTime');
    });
  });

  describe('纹理图集', () => {
    it('应该能够获取纹理图集', () => {
      const atlas = manager.getTextureAtlas();
      expect(atlas).toBeDefined();
    });
  });

  describe('清理功能', () => {
    it('应该能够清空所有批次', () => {
      const renderable = new MockRenderable('item1');
      manager.addRenderable(renderable);
      
      manager.clear();
      
      const stats = manager.getStats();
      expect(stats.totalItems).toBe(0);
    });

    it('应该能够正确销毁管理器', () => {
      expect(() => {
        manager.dispose();
      }).not.toThrow();
    });
  });

  describe('自动优化', () => {
    it('应该能够启用自动优化', () => {
      const optimizingManager = new BatchManager({
        enableAutoOptimization: true,
        optimizationInterval: 100
      });
      
      expect(optimizingManager.getConfig().enableAutoOptimization).toBe(true);
      
      optimizingManager.dispose();
    });

    it('应该在优化完成时触发事件', () => {
      return new Promise<void>((resolve) => {
        const optimizingManager = new BatchManager({
          enableAutoOptimization: true,
          optimizationInterval: 50
        });
        
        optimizingManager.on('optimizationComplete', (data) => {
          expect(data.before).toBeDefined();
          expect(data.after).toBeDefined();
          optimizingManager.dispose();
          resolve();
        });

        // 添加一些数据来触发优化
        Array.from({ length: 10 }, (_, i) => {
          const renderable = new MockRenderable(`item${i}`);
          optimizingManager.addRenderable(renderable);
        });
      });
    });
  });

  describe('不同策略的渲染', () => {
    it('应该能够使用ENHANCED策略渲染', () => {
      manager.setStrategy(BatchStrategy.ENHANCED);
      
      const renderable = new MockRenderable('item1');
      manager.addRenderable(renderable);
      
      manager.beginFrame();
      expect(() => {
        manager.renderFrame(mockContext);
      }).not.toThrow();
      manager.endFrame();
    });

    it('应该能够使用ADVANCED策略渲染', () => {
      manager.setStrategy(BatchStrategy.ADVANCED);
      
      const renderable = new MockRenderable('item1');
      manager.addRenderable(renderable);
      
      manager.beginFrame();
      expect(() => {
        manager.renderFrame(mockContext);
      }).not.toThrow();
      manager.endFrame();
    });

    it('应该能够使用LEGACY策略渲染', () => {
      manager.setStrategy(BatchStrategy.LEGACY);
      
      const renderable = new MockRenderable('item1');
      manager.addRenderable(renderable);
      
      manager.beginFrame();
      expect(() => {
        manager.renderFrame(mockContext);
      }).not.toThrow();
      manager.endFrame();
    });
  });

  describe('大量数据处理', () => {
    it('应该能够处理大量渲染对象', () => {
      const renderables = Array.from({ length: 1000 }, (_, i) => 
        new MockRenderable(`item${i}`, {
          textureId: `tex${i % 10}`, // 10种不同纹理
          blendMode: 'normal'
        })
      );

      renderables.forEach(r => manager.addRenderable(r));
      
      manager.beginFrame();
      expect(() => {
        manager.renderFrame(mockContext);
      }).not.toThrow();
      manager.endFrame();
      
      const stats = manager.getStats();
      expect(stats.totalItems).toBe(1000);
    });

    it('应该能够保持性能历史记录在合理范围内', () => {
      // 模拟101次渲染
      Array.from({ length: 101 }, (_, i) => {
        const renderable = new MockRenderable(`item${i}`);
        manager.addRenderable(renderable);
        
        manager.beginFrame();
        manager.renderFrame(mockContext);
        manager.endFrame();
      });
      
      const history = manager.getPerformanceHistory();
      expect(history.length).toBeLessThanOrEqual(100); // 应该保持在100条以内
    });
  });

  describe('边界情况', () => {
    it('应该能够处理无渲染对象的帧', () => {
      manager.beginFrame();
      expect(() => {
        manager.renderFrame(mockContext);
      }).not.toThrow();
      manager.endFrame();
    });

    it('应该能够处理null上下文', () => {
      const renderable = new MockRenderable('item1');
      manager.addRenderable(renderable);
      
      manager.beginFrame();
      expect(() => {
        manager.renderFrame(null);
      }).not.toThrow();
      manager.endFrame();
    });

    it('应该能够多次调用dispose', () => {
      expect(() => {
        manager.dispose();
        manager.dispose();
      }).not.toThrow();
    });
  });
});

describe('globalBatchManager', () => {
  afterEach(() => {
    globalBatchManager.clear();
  });

  it('应该提供全局批处理管理器实例', () => {
    expect(globalBatchManager).toBeInstanceOf(BatchManager);
  });

  it('全局实例应该能够正常工作', () => {
    const renderable = new MockRenderable('global_item1');
    
    expect(() => {
      globalBatchManager.addRenderable(renderable);
    }).not.toThrow();
    
    const stats = globalBatchManager.getStats();
    expect(stats).toBeDefined();
  });

  it('全局实例应该能够处理渲染', () => {
    const mockContext = { drawElements: vi.fn() };
    const renderable = new MockRenderable('global_item1');
    
    globalBatchManager.addRenderable(renderable);
    
    globalBatchManager.beginFrame();
    expect(() => {
      globalBatchManager.renderFrame(mockContext);
    }).not.toThrow();
    globalBatchManager.endFrame();
  });
});