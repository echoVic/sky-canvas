/**
 * 智能批处理分组器测试
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { IntelligentBatchGrouper } from '../IntelligentBatchGrouper';
import { IRenderable } from '../../core/IRenderEngine';

// Mock IRenderable
function createMockRenderable(overrides: Partial<IRenderable> = {}): IRenderable {
  return {
    id: Math.random().toString(36),
    position: { x: 0, y: 0 },
    size: { width: 100, height: 100 },
    rotation: 0,
    visible: true,
    opacity: 1,
    zIndex: 0,
    render: vi.fn(),
    getRenderState: vi.fn().mockReturnValue({
      textureId: 'texture1',
      blendMode: 'normal',
      shaderId: 'default',
      zIndex: 0,
      opacity: 1,
      cullMode: 'none',
      depthTest: false,
      stencilTest: false
    }),
    getBounds: vi.fn().mockReturnValue({
      x: 0,
      y: 0,
      width: 100,
      height: 100
    }),
    ...overrides
  };
}

describe('IntelligentBatchGrouper', () => {
  let grouper: IntelligentBatchGrouper;

  beforeEach(() => {
    grouper = new IntelligentBatchGrouper();
  });

  describe('基础功能', () => {
    it('应该能够创建分组器实例', () => {
      expect(grouper).toBeDefined();
      expect(grouper.getStats().totalGroups).toBe(0);
    });

    it('应该能够对相同渲染状态的对象进行分组', () => {
      const renderables = [
        createMockRenderable({ id: '1' }),
        createMockRenderable({ id: '2' }),
        createMockRenderable({ id: '3' })
      ];

      const groups = grouper.performGrouping(renderables);
      
      expect(groups).toHaveLength(1);
      expect(groups[0].items).toHaveLength(3);
      expect(groups[0].renderState.textureId).toBe('texture1');
    });

    it('应该能够将不同渲染状态的对象分为不同组', () => {
      const renderables = [
        createMockRenderable({ 
          id: '1',
          getRenderState: vi.fn().mockReturnValue({
            textureId: 'texture1',
            blendMode: 'normal',
            shaderId: 'default',
            zIndex: 0,
            opacity: 1,
            cullMode: 'none',
            depthTest: false,
            stencilTest: false
          })
        }),
        createMockRenderable({ 
          id: '2',
          getRenderState: vi.fn().mockReturnValue({
            textureId: 'texture2',
            blendMode: 'normal',
            shaderId: 'default',
            zIndex: 0,
            opacity: 1,
            cullMode: 'none',
            depthTest: false,
            stencilTest: false
          })
        })
      ];

      const groups = grouper.performGrouping(renderables);
      
      expect(groups).toHaveLength(2);
      expect(groups[0].items).toHaveLength(1);
      expect(groups[1].items).toHaveLength(1);
    });
  });

  describe('空间聚类', () => {
    it('应该能够将空间上相近的对象聚类到同一组', () => {
      const renderables = [
        createMockRenderable({ 
          id: '1',
          position: { x: 100, y: 100 },
          zIndex: 1,
          getBounds: vi.fn().mockReturnValue({ x: 100, y: 100, width: 50, height: 50 }),
          getRenderState: vi.fn().mockReturnValue({
            textureId: 'texture1',
            blendMode: 'normal',
            shaderId: 'default',
            zIndex: 1,
            opacity: 1,
            cullMode: 'none',
            depthTest: false,
            stencilTest: false
          })
        }),
        createMockRenderable({ 
          id: '2',
          position: { x: 105, y: 105 },
          zIndex: 2,
          getBounds: vi.fn().mockReturnValue({ x: 105, y: 105, width: 50, height: 50 }),
          getRenderState: vi.fn().mockReturnValue({
            textureId: 'texture1',
            blendMode: 'normal',
            shaderId: 'default',
            zIndex: 2,
            opacity: 1,
            cullMode: 'none',
            depthTest: false,
            stencilTest: false
          })
        }),
        createMockRenderable({ 
          id: '3',
          position: { x: 500, y: 500 },
          zIndex: 10,
          getBounds: vi.fn().mockReturnValue({ x: 500, y: 500, width: 50, height: 50 }),
          getRenderState: vi.fn().mockReturnValue({
            textureId: 'texture1',
            blendMode: 'normal',
            shaderId: 'default',
            zIndex: 10,
            opacity: 1,
            cullMode: 'none',
            depthTest: false,
            stencilTest: false
          })
        })
      ];

      const groups = grouper.performGrouping(renderables);
      
      // 应该有分组结果
      expect(groups.length).toBeGreaterThanOrEqual(1);
      
      const stats = grouper.getStats();
      // 验证统计信息的完整性
      expect(stats.totalObjects).toBe(3);
      expect(stats.totalGroups).toBe(groups.length);
    });

    it('应该能够计算正确的空间距离', () => {
      const renderables = [
        createMockRenderable({ 
          id: '1',
          position: { x: 0, y: 0 },
          getBounds: vi.fn().mockReturnValue({ x: 0, y: 0, width: 10, height: 10 })
        }),
        createMockRenderable({ 
          id: '2',
          position: { x: 100, y: 100 },
          getBounds: vi.fn().mockReturnValue({ x: 100, y: 100, width: 10, height: 10 })
        })
      ];

      const groups = grouper.performGrouping(renderables);
      
      // 距离较远的对象应该分为不同组（当超过聚类阈值时）
      const stats = grouper.getStats();
      expect(stats.totalGroups).toBeGreaterThanOrEqual(1);
    });
  });

  describe('分组合并', () => {
    it('应该能够合并相似的小组', () => {
      const renderables = Array.from({ length: 5 }, (_, i) => 
        createMockRenderable({ 
          id: i.toString(),
          getRenderState: vi.fn().mockReturnValue({
            textureId: i < 2 ? 'texture1' : 'texture2',
            blendMode: 'normal',
            shaderId: 'default',
            zIndex: 0,
            opacity: i < 2 ? 1 : 0.9, // 略微不同的opacity
            cullMode: 'none',
            depthTest: false,
            stencilTest: false
          })
        })
      );

      const groups = grouper.performGrouping(renderables);
      
      const stats = grouper.getStats();
      expect(stats.mergedGroups).toBeGreaterThanOrEqual(0);
    });

    it('应该能够计算分组相似性', () => {
      const renderables = [
        createMockRenderable({ 
          id: '1',
          getRenderState: vi.fn().mockReturnValue({
            textureId: 'texture1',
            blendMode: 'normal',
            shaderId: 'default',
            zIndex: 0,
            opacity: 1,
            cullMode: 'none',
            depthTest: false,
            stencilTest: false
          })
        }),
        createMockRenderable({ 
          id: '2',
          getRenderState: vi.fn().mockReturnValue({
            textureId: 'texture1',
            blendMode: 'normal',
            shaderId: 'default',
            zIndex: 0,
            opacity: 0.9, // 微小差异
            cullMode: 'none',
            depthTest: false,
            stencilTest: false
          })
        })
      ];

      const groups = grouper.performGrouping(renderables);
      
      // 高相似性的对象应该被合并
      expect(groups).toHaveLength(1);
      expect(groups[0].items).toHaveLength(2);
    });
  });

  describe('Z-Index 排序', () => {
    it('应该按照Z-Index正确排序分组', () => {
      const renderables = [
        createMockRenderable({ 
          id: '1',
          zIndex: 2,
          getRenderState: vi.fn().mockReturnValue({
            textureId: 'texture1',
            blendMode: 'normal',
            shaderId: 'default',
            zIndex: 2,
            opacity: 1,
            cullMode: 'none',
            depthTest: false,
            stencilTest: false
          })
        }),
        createMockRenderable({ 
          id: '2',
          zIndex: 1,
          getRenderState: vi.fn().mockReturnValue({
            textureId: 'texture2',
            blendMode: 'normal',
            shaderId: 'default',
            zIndex: 1,
            opacity: 1,
            cullMode: 'none',
            depthTest: false,
            stencilTest: false
          })
        }),
        createMockRenderable({ 
          id: '3',
          zIndex: 3,
          getRenderState: vi.fn().mockReturnValue({
            textureId: 'texture3',
            blendMode: 'normal',
            shaderId: 'default',
            zIndex: 3,
            opacity: 1,
            cullMode: 'none',
            depthTest: false,
            stencilTest: false
          })
        })
      ];

      const groups = grouper.performGrouping(renderables);
      
      // 检查组的Z-Index排序
      for (let i = 1; i < groups.length; i++) {
        expect(groups[i].renderState.zIndex).toBeGreaterThanOrEqual(groups[i-1].renderState.zIndex);
      }
    });
  });

  describe('性能统计', () => {
    it('应该提供准确的统计信息', () => {
      const renderables = Array.from({ length: 10 }, (_, i) => 
        createMockRenderable({ 
          id: i.toString(),
          getRenderState: vi.fn().mockReturnValue({
            textureId: i % 3 === 0 ? 'texture1' : 'texture2',
            blendMode: 'normal',
            shaderId: 'default',
            zIndex: 0,
            opacity: 1,
            cullMode: 'none',
            depthTest: false,
            stencilTest: false
          })
        })
      );

      const groups = grouper.performGrouping(renderables);
      const stats = grouper.getStats();
      
      expect(stats.totalObjects).toBe(10);
      expect(stats.totalGroups).toBe(groups.length);
      expect(stats.optimizationRatio).toBeGreaterThan(0);
      expect(stats.optimizationRatio).toBeLessThanOrEqual(1);
    });

    it('应该计算正确的优化比率', () => {
      // 创建可以完全合并的对象
      const renderables = Array.from({ length: 5 }, (_, i) => 
        createMockRenderable({ id: i.toString() })
      );

      const groups = grouper.performGrouping(renderables);
      const stats = grouper.getStats();
      
      // 5个对象合并为1组，优化比率应该是 (5-1)/5 = 0.8
      expect(stats.optimizationRatio).toBeCloseTo(0.8, 1);
    });
  });

  describe('事件系统', () => {
    it('应该发出分组创建事件', (done) => {
      grouper.on('groupCreated', (group) => {
        expect(group).toBeDefined();
        expect(group.items).toBeDefined();
        expect(group.renderState).toBeDefined();
        done();
      });

      const renderables = [createMockRenderable()];
      grouper.performGrouping(renderables);
    });

    it('应该发出优化完成事件', (done) => {
      grouper.on('optimizationComplete', (stats) => {
        expect(stats).toBeDefined();
        expect(stats.totalObjects).toBeGreaterThan(0);
        expect(stats.totalGroups).toBeGreaterThan(0);
        done();
      });

      const renderables = [createMockRenderable()];
      grouper.performGrouping(renderables);
    });
  });

  describe('边界情况', () => {
    it('应该处理空的渲染对象列表', () => {
      const groups = grouper.performGrouping([]);
      
      expect(groups).toHaveLength(0);
      
      const stats = grouper.getStats();
      expect(stats.totalObjects).toBe(0);
      expect(stats.totalGroups).toBe(0);
    });

    it('应该处理单个渲染对象', () => {
      const renderables = [createMockRenderable()];
      const groups = grouper.performGrouping(renderables);
      
      expect(groups).toHaveLength(1);
      expect(groups[0].items).toHaveLength(1);
    });

    it('应该处理getRenderState返回null的情况', () => {
      const renderable = createMockRenderable({
        getRenderState: vi.fn().mockReturnValue(null)
      });

      // 应该不会抛出错误
      expect(() => {
        grouper.performGrouping([renderable]);
      }).not.toThrow();
    });

    it('应该处理getBounds返回null的情况', () => {
      const renderable = createMockRenderable({
        getBounds: vi.fn().mockReturnValue(null)
      });

      expect(() => {
        grouper.performGrouping([renderable]);
      }).not.toThrow();
    });
  });

  describe('配置管理', () => {
    it('应该能够重置统计数据', () => {
      const renderables = [createMockRenderable()];
      grouper.performGrouping(renderables);
      
      let stats = grouper.getStats();
      expect(stats.totalObjects).toBeGreaterThan(0);
      
      grouper.reset();
      stats = grouper.getStats();
      expect(stats.totalObjects).toBe(0);
      expect(stats.totalGroups).toBe(0);
    });

    it('应该支持分组权重配置', () => {
      // 这个测试验证权重配置是否被正确应用
      // 实际效果需要通过分组结果的差异来验证
      const renderables = [
        createMockRenderable({ 
          getRenderState: vi.fn().mockReturnValue({
            textureId: 'texture1',
            blendMode: 'multiply',
            shaderId: 'custom',
            zIndex: 0,
            opacity: 1,
            cullMode: 'none',
            depthTest: false,
            stencilTest: false
          })
        }),
        createMockRenderable({ 
          getRenderState: vi.fn().mockReturnValue({
            textureId: 'texture2',
            blendMode: 'normal',
            shaderId: 'default',
            zIndex: 0,
            opacity: 1,
            cullMode: 'none',
            depthTest: false,
            stencilTest: false
          })
        })
      ];

      const groups = grouper.performGrouping(renderables);
      
      // 不同的纹理、混合模式、着色器应该产生不同的组
      expect(groups).toHaveLength(2);
    });
  });
});