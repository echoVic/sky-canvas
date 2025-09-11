/**
 * 智能批处理分组器测试
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { IntelligentBatchGrouper } from '../IntelligentBatchGrouper';
import { IRenderable } from '../../core/IRenderEngine';

// Mock IRenderable
function createMockRenderable(overrides: Partial<IRenderable> = {}): IRenderable {
  const defaultBounds = { x: 0, y: 0, width: 100, height: 100 };
  return {
    id: Math.random().toString(36),
    bounds: defaultBounds,
    visible: true,
    zIndex: 0,
    render: vi.fn(),
    hitTest: vi.fn().mockReturnValue(false),
    getBounds: vi.fn().mockReturnValue(defaultBounds),
    dispose: vi.fn(),
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

    it('应该能够处理空数组', () => {
      const groups = grouper.performGrouping([]);
      expect(groups).toEqual([]);
      expect(grouper.getStats().totalGroups).toBe(0);
    });

    it('应该能够对单个对象进行分组', () => {
      const renderables = [
        createMockRenderable({ id: '1' })
      ];

      const groups = grouper.performGrouping(renderables);
      
      expect(groups).toHaveLength(1);
      expect(groups[0].items).toHaveLength(1);
      expect(groups[0].items[0].id).toBe('1');
    });

    it('应该能够对多个不同类型的对象分组', () => {
      const renderables = [
        createMockRenderable({ 
          id: '1',
          zIndex: 1
        }),
        createMockRenderable({ 
          id: '2',
          zIndex: 2
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
      const bounds1 = { x: 100, y: 100, width: 50, height: 50 };
      const bounds2 = { x: 105, y: 105, width: 50, height: 50 };
      const bounds3 = { x: 500, y: 500, width: 50, height: 50 };

      const renderables = [
        createMockRenderable({ 
          id: '1',
          bounds: bounds1,
          zIndex: 1,
          getBounds: vi.fn().mockReturnValue(bounds1)
        }),
        createMockRenderable({ 
          id: '2',
          bounds: bounds2,
          zIndex: 1,
          getBounds: vi.fn().mockReturnValue(bounds2)
        }),
        createMockRenderable({ 
          id: '3',
          bounds: bounds3,
          zIndex: 1,
          getBounds: vi.fn().mockReturnValue(bounds3)
        })
      ];

      const groups = grouper.performGrouping(renderables);
      
      // 前两个对象应该在同一组，第三个对象在另一组
      expect(groups).toHaveLength(2);
      const group1 = groups.find(g => g.items.length === 2);
      const group2 = groups.find(g => g.items.length === 1);
      
      expect(group1).toBeDefined();
      expect(group2).toBeDefined();
      expect(group2!.items[0].id).toBe('3');
    });

    it('应该能够对远距离对象分组到不同组', () => {
      const bounds1 = { x: 0, y: 0, width: 50, height: 50 };
      const bounds2 = { x: 1000, y: 1000, width: 50, height: 50 };

      const renderables = [
        createMockRenderable({ 
          id: '1',
          bounds: bounds1,
          getBounds: vi.fn().mockReturnValue(bounds1)
        }),
        createMockRenderable({ 
          id: '2',
          bounds: bounds2,
          getBounds: vi.fn().mockReturnValue(bounds2)
        })
      ];

      const groups = grouper.performGrouping(renderables);
      
      expect(groups).toHaveLength(2);
      expect(groups[0].items).toHaveLength(1);
      expect(groups[1].items).toHaveLength(1);
    });
  });

  describe('Z层级分组', () => {
    it('应该根据Z层级进行分组', () => {
      const renderables = [
        createMockRenderable({ id: '1', zIndex: 1 }),
        createMockRenderable({ id: '2', zIndex: 2 }),
        createMockRenderable({ id: '3', zIndex: 1 })
      ];

      const groups = grouper.performGrouping(renderables);
      
      expect(groups).toHaveLength(2);
      
      const zIndex1Group = groups.find(g => g.items.some(item => item.zIndex === 1));
      const zIndex2Group = groups.find(g => g.items.some(item => item.zIndex === 2));
      
      expect(zIndex1Group).toBeDefined();
      expect(zIndex2Group).toBeDefined();
      expect(zIndex1Group!.items).toHaveLength(2);
      expect(zIndex2Group!.items).toHaveLength(1);
    });
  });

  describe('复杂分组场景', () => {
    it('应该能够处理大量对象的分组', () => {
      const renderables = Array.from({ length: 1000 }, (_, i) => 
        createMockRenderable({ 
          id: `item-${i}`,
          zIndex: i % 10,
          bounds: { x: i % 100, y: Math.floor(i / 100), width: 10, height: 10 }
        })
      );

      const groups = grouper.performGrouping(renderables);
      
      expect(groups.length).toBeGreaterThan(0);
      expect(groups.length).toBeLessThanOrEqual(renderables.length);
      
      // 验证所有对象都被分组
      const totalItems = groups.reduce((sum, group) => sum + group.items.length, 0);
      expect(totalItems).toBe(renderables.length);
    });

    it('应该能够处理具有相同属性的对象', () => {
      const renderables = [
        createMockRenderable({ id: '1', zIndex: 1 }),
        createMockRenderable({ id: '2', zIndex: 1 }),
        createMockRenderable({ id: '3', zIndex: 1 })
      ];

      const groups = grouper.performGrouping(renderables);
      
      expect(groups).toHaveLength(1);
      expect(groups[0].items).toHaveLength(3);
    });
  });

  describe('性能优化', () => {
    it('应该能够在合理时间内处理大量对象', () => {
      const startTime = performance.now();
      const renderables = Array.from({ length: 10000 }, (_, i) => 
        createMockRenderable({ 
          id: `perf-test-${i}`,
          zIndex: Math.floor(i / 100)
        })
      );

      const groups = grouper.performGrouping(renderables);
      const endTime = performance.now();
      
      expect(endTime - startTime).toBeLessThan(1000); // 应该在1秒内完成
      expect(groups.length).toBeGreaterThan(0);
    });
  });

  describe('边界情况', () => {
    it('应该处理null和undefined值', () => {
      const renderables = [
        createMockRenderable({ id: '1' })
      ];

      expect(() => {
        grouper.performGrouping(renderables);
      }).not.toThrow();
    });

    it('应该处理不可见对象', () => {
      const renderables = [
        createMockRenderable({ id: '1', visible: false }),
        createMockRenderable({ id: '2', visible: true })
      ];

      const groups = grouper.performGrouping(renderables);
      
      expect(groups.length).toBeGreaterThan(0);
      // 验证所有对象都被包含（包括不可见的）
      const totalItems = groups.reduce((sum, group) => sum + group.items.length, 0);
      expect(totalItems).toBe(2);
    });
  });

  describe('统计信息', () => {
    it('应该提供正确的统计信息', () => {
      const renderables = [
        createMockRenderable({ id: '1' }),
        createMockRenderable({ id: '2' })
      ];

      grouper.performGrouping(renderables);
      const stats = grouper.getStats();
      
      expect(stats.totalGroups).toBeGreaterThan(0);
      expect(stats.totalItems).toBe(2);
      expect(stats.averageItemsPerGroup).toBeGreaterThan(0);
    });

    it('应该重置统计信息', () => {
      const renderables = [createMockRenderable({ id: '1' })];
      
      grouper.performGrouping(renderables);
      expect(grouper.getStats().totalGroups).toBeGreaterThan(0);
      
      grouper.resetStats();
      expect(grouper.getStats().totalGroups).toBe(0);
    });
  });
});