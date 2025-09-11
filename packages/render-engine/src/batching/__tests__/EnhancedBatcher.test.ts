/**
 * 增强批处理器测试
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { EnhancedBatcher, globalBatcher } from '../EnhancedBatcher';
import { TextureAtlas } from '../../textures/TextureAtlas';
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

describe('TextureAtlas', () => {
  let atlas: TextureAtlas;

  beforeEach(() => {
    atlas = new TextureAtlas();
  });

  it('应该能够添加纹理到图集', () => {
    const textureInfo = { id: 'texture1', width: 64, height: 64 };
    const entry = atlas.addTexture(textureInfo);
    
    expect(entry).not.toBeNull();
    expect(entry?.textureId).toBe('texture1');
    expect(entry?.width).toBe(64);
    expect(entry?.height).toBe(64);
  });

  it('应该能够获取纹理信息', () => {
    const textureInfo = { id: 'texture1', width: 64, height: 64 };
    atlas.addTexture(textureInfo);
    const info = atlas.getTexture('texture1');
    
    expect(info).not.toBeNull();
    expect(info?.textureId).toBe('texture1');
  });

  it('应该能够创建多个图集', () => {
    // 添加一个大纹理，应该创建新图集
    const texture1 = { id: 'texture1', width: 1500, height: 1500 };
    const texture2 = { id: 'texture2', width: 1500, height: 1500 };
    atlas.addTexture(texture1);
    atlas.addTexture(texture2);
    
    const stats = atlas.getStats();
    expect(stats.atlasCount).toBeGreaterThan(0);
  });

  it('应该能够复用图集空间', () => {
    const texture1 = { id: 'texture1', width: 32, height: 32 };
    const texture2 = { id: 'texture2', width: 32, height: 32 };
    atlas.addTexture(texture1);
    atlas.addTexture(texture2);
    
    const info1 = atlas.getTexture('texture1');
    const info2 = atlas.getTexture('texture2');
    
    // 两个小纹理应该在同一个图集中
    expect(info1?.atlasId).toBe(info2?.atlasId);
  });
});

describe('EnhancedBatcher', () => {
  let batcher: EnhancedBatcher;
  let mockContext: any;

  beforeEach(() => {
    batcher = new EnhancedBatcher();
    mockContext = {
      drawElements: vi.fn(),
      bindTexture: vi.fn(),
      useProgram: vi.fn()
    };
  });

  afterEach(() => {
    batcher.clear();
  });

  describe('基本批处理功能', () => {
    it('应该能够添加渲染对象到批处理', () => {
      const renderable = new MockRenderable('item1', {
        textureId: 'tex1',
        blendMode: 'normal'
      });

      batcher.addToBatch(renderable);
      
      const batches = batcher.getBatches();
      expect(batches).toHaveLength(1);
      expect(batches[0].items).toContain(renderable);
    });

    it('应该能够按属性分组渲染对象', () => {
      const renderable1 = new MockRenderable('item1', {
        textureId: 'tex1',
        blendMode: 'normal'
      });
      const renderable2 = new MockRenderable('item2', {
        textureId: 'tex1',
        blendMode: 'normal'
      });
      const renderable3 = new MockRenderable('item3', {
        textureId: 'tex2',
        blendMode: 'normal'
      });

      batcher.addToBatch(renderable1);
      batcher.addToBatch(renderable2);
      batcher.addToBatch(renderable3);
      
      const batches = batcher.getBatches();
      expect(batches).toHaveLength(2); // tex1 和 tex2 分别一个批次
    });

    it('应该能够清空所有批次', () => {
      const renderable = new MockRenderable('item1');
      batcher.addToBatch(renderable);
      
      expect(batcher.getBatches()).toHaveLength(1);
      
      batcher.clear();
      expect(batcher.getBatches()).toHaveLength(0);
    });
  });

  describe('实例化渲染', () => {
    it('应该能够检测可实例化的对象', () => {
      const renderables = Array.from({ length: 60 }, (_, i) => 
        new MockRenderable(`item${i}`, {
          textureId: 'tex1',
          blendMode: 'normal'
        })
      );

      renderables.forEach(r => batcher.addToBatch(r));
      
      const batches = batcher.getBatches();
      expect(batches).toHaveLength(1);
      expect(batches[0].canInstance).toBe(true);
    });

    it('应该能够渲染实例化批次', () => {
      const renderables = Array.from({ length: 60 }, (_, i) => 
        new MockRenderable(`item${i}`, {
          textureId: 'tex1',
          blendMode: 'normal'
        })
      );

      renderables.forEach(r => batcher.addToBatch(r));
      
      let instancedRenderExecuted = false;
      batcher.on('instancedRenderExecuted', () => {
        instancedRenderExecuted = true;
      });

      batcher.renderBatches(mockContext);
      expect(instancedRenderExecuted).toBe(true);
    });
  });

  describe('批处理优化', () => {
    it('应该能够优化批次', () => {
      const renderables = Array.from({ length: 10 }, (_, i) => 
        new MockRenderable(`item${i}`, {
          textureId: 'tex1',
          blendMode: 'normal',
          zIndex: i % 3
        })
      );

      renderables.forEach(r => batcher.addToBatch(r));
      
      let optimizationCompleted = false;
      batcher.on('batchOptimized', () => {
        optimizationCompleted = true;
      });

      batcher.optimizeBatches();
      expect(optimizationCompleted).toBe(true);
    });

    it('应该能够合并相似批次', () => {
      const renderables1 = Array.from({ length: 5 }, (_, i) => 
        new MockRenderable(`group1_${i}`, {
          textureId: 'tex1',
          blendMode: 'normal',
          zIndex: 1
        })
      );
      
      const renderables2 = Array.from({ length: 5 }, (_, i) => 
        new MockRenderable(`group2_${i}`, {
          textureId: 'tex1',
          blendMode: 'normal',
          zIndex: 1
        })
      );

      renderables1.forEach(r => batcher.addToBatch(r));
      renderables2.forEach(r => batcher.addToBatch(r));
      
      const batchesBefore = batcher.getBatches().length;
      batcher.optimizeBatches();
      const batchesAfter = batcher.getBatches().length;
      
      expect(batchesAfter).toBeLessThanOrEqual(batchesBefore);
    });
  });

  describe('纹理图集集成', () => {
    it('应该能够添加纹理到图集', () => {
      const textureInfo = { id: 'texture1', width: 64, height: 64 };
      const entry = batcher.getTextureAtlas().addTexture(textureInfo);
      
      expect(entry).not.toBeNull();
      expect(entry?.textureId).toBe('texture1');
    });

    it('应该在添加纹理时触发事件', () => {
      let textureAdded = false;
      batcher.getTextureAtlas().on('textureAdded', () => {
        textureAdded = true;
      });

      const textureInfo = { id: 'texture1', width: 64, height: 64 };
      batcher.getTextureAtlas().addTexture(textureInfo);
      expect(textureAdded).toBe(true);
    });

    it('应该能够获取纹理图集', () => {
      const atlas = batcher.getTextureAtlas();
      expect(atlas).toBeInstanceOf(TextureAtlas);
    });
  });

  describe('性能统计', () => {
    it('应该能够获取批处理统计', () => {
      const renderables = Array.from({ length: 10 }, (_, i) => 
        new MockRenderable(`item${i}`)
      );

      renderables.forEach(r => batcher.addToBatch(r));
      batcher.renderBatches(mockContext);
      
      const stats = batcher.getStats();
      expect(stats.totalItems).toBe(10);
      expect(stats.totalBatches).toBeGreaterThan(0);
    });

    it('应该能够跟踪绘制调用数量', () => {
      const renderables = Array.from({ length: 10 }, (_, i) => 
        new MockRenderable(`item${i}`, { textureId: `tex${i}` })
      );

      renderables.forEach(r => batcher.addToBatch(r));
      batcher.renderBatches(mockContext);
      
      const stats = batcher.getStats();
      expect(stats.drawCalls).toBeGreaterThan(0);
    });
  });

  describe('事件系统', () => {
    it('应该在创建批次时触发事件', () => {
      let batchCreated = false;
      batcher.on('batchCreated', () => {
        batchCreated = true;
      });

      const renderable = new MockRenderable('item1');
      batcher.addToBatch(renderable);
      
      expect(batchCreated).toBe(true);
    });

    it('应该在执行实例化渲染时触发事件', () => {
      const renderables = Array.from({ length: 60 }, (_, i) => 
        new MockRenderable(`item${i}`, {
          textureId: 'tex1',
          blendMode: 'normal'
        })
      );

      let instancedRenderData: any = null;
      batcher.on('instancedRenderExecuted', (data) => {
        instancedRenderData = data;
      });

      renderables.forEach(r => batcher.addToBatch(r));
      batcher.renderBatches(mockContext);
      
      expect(instancedRenderData).not.toBeNull();
      expect(instancedRenderData.instanceCount).toBe(60);
    });
  });

  describe('边界情况', () => {
    it('应该能够处理空批次渲染', () => {
      expect(() => {
        batcher.renderBatches(mockContext);
      }).not.toThrow();
      
      const stats = batcher.getStats();
      expect(stats.totalItems).toBe(0);
    });

    it('应该能够处理null上下文', () => {
      const renderable = new MockRenderable('item1');
      batcher.addToBatch(renderable);
      
      expect(() => {
        batcher.renderBatches(null);
      }).not.toThrow();
    });

    it('应该能够处理重复添加相同对象', () => {
      const renderable = new MockRenderable('item1');
      
      batcher.addToBatch(renderable);
      batcher.addToBatch(renderable);
      
      const batches = batcher.getBatches();
      expect(batches[0].items).toHaveLength(2);
    });
  });

  describe('大批次处理', () => {
    it('应该能够分割过大的批次', () => {
      const renderables = Array.from({ length: 15000 }, (_, i) => 
        new MockRenderable(`item${i}`, {
          textureId: 'tex1',
          blendMode: 'normal'
        })
      );

      renderables.forEach(r => batcher.addToBatch(r));
      
      const batches = batcher.getBatches();
      const maxBatchSize = Math.max(...batches.map(b => b.items.length));
      expect(maxBatchSize).toBeLessThanOrEqual(10000); // MAX_BATCH_SIZE
    });
  });
});

describe('globalBatcher', () => {
  it('应该提供全局批处理器实例', () => {
    expect(globalBatcher).toBeInstanceOf(EnhancedBatcher);
  });

  it('全局实例应该能够正常工作', () => {
    const renderable = new MockRenderable('global_item1');
    
    expect(() => {
      globalBatcher.addToBatch(renderable);
    }).not.toThrow();
    
    const batches = globalBatcher.getBatches();
    expect(batches).toHaveLength(1);
    
    globalBatcher.clear(); // 清理
  });
});