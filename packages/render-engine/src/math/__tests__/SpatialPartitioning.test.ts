/**
 * SpatialPartitioning 模块的单元测试
 * 测试空间分割系统的所有功能
 */
import { beforeEach, describe, expect, it } from 'vitest';
import { IPoint, IRect } from '../Geometry';
import {
  ISpatialObject,
  QuadTree,
  SpatialGrid,
  SpatialPartitionManager
} from '../SpatialPartitioning';

// 测试用的空间对象实现
class TestSpatialObject implements ISpatialObject {
  id: string;
  private _bounds: IRect;

  constructor(id: string, bounds: IRect) {
    this.id = id;
    this._bounds = bounds;
  }

  getBounds(): IRect {
    return this._bounds;
  }

  setBounds(bounds: IRect): void {
    this._bounds = bounds;
  }
}

describe('SpatialGrid', () => {
  let grid: SpatialGrid<TestSpatialObject>;
  let obj1: TestSpatialObject;
  let obj2: TestSpatialObject;
  let obj3: TestSpatialObject;

  beforeEach(() => {
    // Arrange
    grid = new SpatialGrid<TestSpatialObject>(100);
    obj1 = new TestSpatialObject('obj1', { x: 50, y: 50, width: 20, height: 20 });
    obj2 = new TestSpatialObject('obj2', { x: 150, y: 150, width: 30, height: 30 });
    obj3 = new TestSpatialObject('obj3', { x: 80, y: 80, width: 40, height: 40 }); // 跨网格
  });

  describe('基础功能', () => {
    it('应该正确创建空间网格', () => {
      // Arrange & Act & Assert
      expect(grid).toBeDefined();
    });

    it('应该正确插入对象', () => {
      // Arrange & Act
      grid.insert(obj1);
      grid.insert(obj2);
      grid.insert(obj3);

      // Assert
      const stats = grid.getStats();
      expect(stats.totalObjects).toBe(3);
    });

    it('应该正确移除对象', () => {
      // Arrange
      grid.insert(obj1);
      grid.insert(obj2);
      const initialStats = grid.getStats();

      // Act
      grid.remove(obj1);

      // Assert
      const finalStats = grid.getStats();
      expect(finalStats.totalObjects).toBe(initialStats.totalObjects - 1);
    });

    it('应该正确更新对象位置', () => {
      // Arrange
      grid.insert(obj1);
      const originalBounds = obj1.getBounds();

      // Act
      obj1.setBounds({ x: 200, y: 200, width: 20, height: 20 });
      grid.update(obj1);

      // Assert
      const oldQuery = grid.query(originalBounds);
      const newQuery = grid.query({ x: 200, y: 200, width: 20, height: 20 });
      expect(oldQuery.has(obj1)).toBe(false);
      expect(newQuery.has(obj1)).toBe(true);
    });

    it('应该正确清空网格', () => {
      // Arrange
      grid.insert(obj1);
      grid.insert(obj2);
      grid.insert(obj3);

      // Act
      grid.clear();

      // Assert
      const stats = grid.getStats();
      expect(stats.totalObjects).toBe(0);
      expect(stats.totalCells).toBe(0);
    });
  });

  describe('查询功能', () => {
    beforeEach(() => {
      grid.insert(obj1);
      grid.insert(obj2);
      grid.insert(obj3);
    });

    it('应该正确查询边界内的对象', () => {
      // Arrange
      const queryBounds: IRect = { x: 40, y: 40, width: 50, height: 50 };

      // Act
      const results = grid.query(queryBounds);

      // Assert
      expect(results.has(obj1)).toBe(true); // obj1在查询范围内
      expect(results.has(obj3)).toBe(true); // obj3跨越查询范围
      expect(results.has(obj2)).toBe(false); // obj2在查询范围外
    });

    it('应该正确查询点位置的对象', () => {
      // Arrange
      const queryPoint: IPoint = { x: 60, y: 60 };

      // Act
      const results = grid.queryPoint(queryPoint);

      // Assert
      expect(results.has(obj1)).toBe(true); // 点在obj1范围内
    });

    it('应该正确查询半径范围内的对象', () => {
      // Arrange
      const center: IPoint = { x: 100, y: 100 };
      const radius = 50;

      // Act
      const results = grid.queryRadius(center, radius);

      // Assert
      expect(results.has(obj1)).toBe(true); // obj1在半径范围内
      expect(results.has(obj3)).toBe(true); // obj3在半径范围内
    });

    it('应该正确处理空查询结果', () => {
      // Arrange
      const emptyBounds: IRect = { x: 1000, y: 1000, width: 10, height: 10 };

      // Act
      const results = grid.query(emptyBounds);

      // Assert
      expect(results.size).toBe(0);
    });

    it('应该正确处理大范围查询', () => {
      // Arrange
      const largeBounds: IRect = { x: 0, y: 0, width: 500, height: 500 };

      // Act
      const results = grid.query(largeBounds);

      // Assert
      expect(results.size).toBe(3); // 应该包含所有对象
    });
  });

  describe('统计信息', () => {
    it('应该正确提供统计信息', () => {
      // Arrange
      grid.insert(obj1);
      grid.insert(obj2);
      grid.insert(obj3);

      // Act
      const stats = grid.getStats();

      // Assert
      expect(stats.totalObjects).toBe(3);
      expect(stats.totalCells).toBeGreaterThan(0);
      expect(stats.averageObjectsPerCell).toBeGreaterThan(0);
      expect(stats.maxObjectsPerCell).toBeGreaterThan(0);
      expect(stats.emptyCells).toBeGreaterThanOrEqual(0);
    });

    it('应该正确提供调试信息', () => {
      // Arrange
      grid.insert(obj1);
      grid.insert(obj2);

      // Act
      const debugInfo = grid.getDebugInfo();

      // Assert
      expect(debugInfo).toBeDefined();
      expect(typeof debugInfo).toBe('object');
    });

    it('应该正确计算跨网格对象的统计', () => {
      // Arrange - 创建一个跨多个网格的大对象
      const largeObj = new TestSpatialObject('large', {
        x: 50, y: 50, width: 200, height: 200
      });
      grid.insert(largeObj);

      // Act
      const stats = grid.getStats();

      // Assert
      expect(stats.totalObjects).toBe(1);
      expect(stats.totalCells).toBeGreaterThan(1); // 应该跨越多个网格
    });
  });

  describe('边界情况', () => {
    it('应该正确处理零尺寸对象', () => {
      // Arrange
      const zeroObj = new TestSpatialObject('zero', {
        x: 100, y: 100, width: 0, height: 0
      });

      // Act & Assert
      expect(() => grid.insert(zeroObj)).not.toThrow();
      const results = grid.queryPoint({ x: 100, y: 100 });
      expect(results.has(zeroObj)).toBe(true);
    });

    it('应该正确处理负坐标对象', () => {
      // Arrange
      const negativeObj = new TestSpatialObject('negative', {
        x: -50, y: -50, width: 20, height: 20
      });

      // Act & Assert
      expect(() => grid.insert(negativeObj)).not.toThrow();
      const results = grid.query({ x: -60, y: -60, width: 40, height: 40 });
      expect(results.has(negativeObj)).toBe(true);
    });

    it('应该正确处理重复插入同一对象', () => {
      // Arrange & Act
      grid.insert(obj1);
      grid.insert(obj1); // 重复插入

      // Assert
      const stats = grid.getStats();
      expect(stats.totalObjects).toBe(1); // 应该只有一个对象
    });

    it('应该正确处理移除不存在的对象', () => {
      // Arrange
      const nonExistentObj = new TestSpatialObject('nonexistent', {
        x: 0, y: 0, width: 10, height: 10
      });

      // Act & Assert
      expect(() => grid.remove(nonExistentObj)).not.toThrow();
    });
  });
});

describe('QuadTree', () => {
  let quadTree: QuadTree<TestSpatialObject>;
  let obj1: TestSpatialObject;
  let obj2: TestSpatialObject;
  let obj3: TestSpatialObject;

  beforeEach(() => {
    // Arrange
    const bounds: IRect = { x: 0, y: 0, width: 1000, height: 1000 };
    quadTree = new QuadTree<TestSpatialObject>(bounds, 4, 5);
    obj1 = new TestSpatialObject('obj1', { x: 100, y: 100, width: 50, height: 50 });
    obj2 = new TestSpatialObject('obj2', { x: 600, y: 600, width: 50, height: 50 });
    obj3 = new TestSpatialObject('obj3', { x: 200, y: 200, width: 50, height: 50 });
  });

  describe('基础功能', () => {
    it('应该正确创建四叉树', () => {
      // Arrange & Act & Assert
      expect(quadTree).toBeDefined();
    });

    it('应该正确插入对象', () => {
      // Arrange & Act
      quadTree.insert(obj1);
      quadTree.insert(obj2);
      quadTree.insert(obj3);

      // Assert
      const debugInfo = quadTree.getDebugInfo();
      expect(debugInfo).toBeDefined();
    });

    it('应该正确清空四叉树', () => {
      // Arrange
      quadTree.insert(obj1);
      quadTree.insert(obj2);

      // Act
      quadTree.clear();

      // Assert
      const results = quadTree.query({ x: 0, y: 0, width: 1000, height: 1000 });
      expect(results).toHaveLength(0);
    });
  });

  describe('查询功能', () => {
    beforeEach(() => {
      quadTree.insert(obj1);
      quadTree.insert(obj2);
      quadTree.insert(obj3);
    });

    it('应该正确查询边界内的对象', () => {
      // Arrange
      const queryBounds: IRect = { x: 50, y: 50, width: 200, height: 200 };

      // Act
      const results = quadTree.query(queryBounds);

      // Assert
      expect(results).toContain(obj1);
      expect(results).toContain(obj3);
      expect(results).not.toContain(obj2);
    });

    it('应该正确查询点位置的对象', () => {
      // Arrange
      const queryPoint: IPoint = { x: 125, y: 125 };

      // Act
      const results = quadTree.queryPoint(queryPoint);

      // Assert
      expect(results).toContain(obj1);
      expect(results).not.toContain(obj2);
      expect(results).not.toContain(obj3);
    });

    it('应该正确处理空查询结果', () => {
      // Arrange
      const emptyBounds: IRect = { x: 800, y: 800, width: 50, height: 50 };

      // Act
      const results = quadTree.query(emptyBounds);

      // Assert
      expect(results).toHaveLength(0);
    });

    it('应该正确处理大范围查询', () => {
      // Arrange
      const largeBounds: IRect = { x: 0, y: 0, width: 1000, height: 1000 };

      // Act
      const results = quadTree.query(largeBounds);

      // Assert
      expect(results).toHaveLength(3);
    });
  });

  describe('分割行为', () => {
    it('应该在对象数量超过阈值时正确分割', () => {
      // Arrange - 插入超过maxObjects数量的对象
      const objects: TestSpatialObject[] = [];
      for (let i = 0; i < 10; i++) {
        const obj = new TestSpatialObject(`obj_${i}`, {
          x: 100 + i * 10,
          y: 100 + i * 10,
          width: 20,
          height: 20
        });
        objects.push(obj);
        quadTree.insert(obj);
      }

      // Act
      const debugInfo = quadTree.getDebugInfo();

      // Assert
      expect(debugInfo).toBeDefined();
      // 查询应该仍然正常工作
      const results = quadTree.query({ x: 90, y: 90, width: 200, height: 200 });
      expect(results.length).toBeGreaterThan(0);
    });

    it('应该正确处理跨象限的对象', () => {
      // Arrange - 创建一个跨越多个象限的大对象
      const largeObj = new TestSpatialObject('large', {
        x: 400, y: 400, width: 200, height: 200
      });

      // Act
      quadTree.insert(largeObj);

      // Assert
      const results = quadTree.query({ x: 450, y: 450, width: 100, height: 100 });
      expect(results).toContain(largeObj);
    });
  });

  describe('调试信息', () => {
    it('应该提供有用的调试信息', () => {
      // Arrange
      quadTree.insert(obj1);
      quadTree.insert(obj2);
      quadTree.insert(obj3);

      // Act
      const debugInfo = quadTree.getDebugInfo();

      // Assert
      expect(debugInfo).toBeDefined();
      expect(typeof debugInfo).toBe('object');
    });
  });

  describe('边界情况', () => {
    it('应该正确处理边界外的对象', () => {
      // Arrange
      const outsideObj = new TestSpatialObject('outside', {
        x: 1500, y: 1500, width: 50, height: 50
      });

      // Act & Assert
      expect(() => quadTree.insert(outsideObj)).not.toThrow();
    });

    it('应该正确处理零尺寸查询', () => {
      // Arrange
      quadTree.insert(obj1);
      const zeroQuery: IRect = { x: 125, y: 125, width: 0, height: 0 };

      // Act
      const results = quadTree.query(zeroQuery);

      // Assert
      expect(results).toBeDefined();
    });
  });
});

describe('SpatialPartitionManager', () => {
  let manager: SpatialPartitionManager<TestSpatialObject>;
  let obj1: TestSpatialObject;
  let obj2: TestSpatialObject;
  let obj3: TestSpatialObject;

  beforeEach(() => {
    // Arrange
    const bounds: IRect = { x: 0, y: 0, width: 1000, height: 1000 };
    manager = new SpatialPartitionManager<TestSpatialObject>(100, bounds);
    obj1 = new TestSpatialObject('obj1', { x: 50, y: 50, width: 20, height: 20 });
    obj2 = new TestSpatialObject('obj2', { x: 150, y: 150, width: 30, height: 30 });
    obj3 = new TestSpatialObject('obj3', { x: 250, y: 250, width: 40, height: 40 });
  });

  describe('基础功能', () => {
    it('应该正确创建空间分割管理器', () => {
      // Arrange & Act & Assert
      expect(manager).toBeDefined();
    });

    it('应该正确切换空间分割策略', () => {
      // Arrange & Act & Assert
      expect(() => manager.setUseQuadTree(true)).not.toThrow();
      expect(() => manager.setUseQuadTree(false)).not.toThrow();
    });

    it('应该正确管理对象', () => {
      // Arrange & Act
      manager.insert(obj1);
      manager.insert(obj2);
      manager.insert(obj3);

      // Assert
      const results = manager.query({ x: 0, y: 0, width: 300, height: 300 });
      expect(results).toHaveLength(3);
    });

    it('应该正确移除对象', () => {
      // Arrange
      manager.insert(obj1);
      manager.insert(obj2);
      const initialResults = manager.query({ x: 0, y: 0, width: 300, height: 300 });

      // Act
      manager.remove(obj1);

      // Assert
      const finalResults = manager.query({ x: 0, y: 0, width: 300, height: 300 });
      expect(finalResults.length).toBe(initialResults.length - 1);
      expect(finalResults).not.toContain(obj1);
    });

    it('应该正确更新对象', () => {
      // Arrange
      manager.insert(obj1);
      const originalBounds = obj1.getBounds();

      // Act
      obj1.setBounds({ x: 300, y: 300, width: 20, height: 20 });
      manager.update(obj1);

      // Assert
      const oldResults = manager.query(originalBounds);
      const newResults = manager.query({ x: 290, y: 290, width: 40, height: 40 });
      expect(oldResults).not.toContain(obj1);
      expect(newResults).toContain(obj1);
    });

    it('应该正确清空管理器', () => {
      // Arrange
      manager.insert(obj1);
      manager.insert(obj2);
      manager.insert(obj3);

      // Act
      manager.clear();

      // Assert
      const results = manager.query({ x: 0, y: 0, width: 1000, height: 1000 });
      expect(results).toHaveLength(0);
    });
  });

  describe('查询功能', () => {
    beforeEach(() => {
      manager.insert(obj1);
      manager.insert(obj2);
      manager.insert(obj3);
    });

    it('应该正确查询边界内的对象', () => {
      // Arrange
      const queryBounds: IRect = { x: 40, y: 40, width: 150, height: 150 };

      // Act
      const results = manager.query(queryBounds);

      // Assert
      expect(results).toContain(obj1);
      expect(results).toContain(obj2);
      expect(results).not.toContain(obj3);
    });

    it('应该正确查询点位置的对象', () => {
      // Arrange
      const queryPoint: IPoint = { x: 60, y: 60 };

      // Act
      const results = manager.queryPoint(queryPoint);

      // Assert
      expect(results).toContain(obj1);
      expect(results).not.toContain(obj2);
      expect(results).not.toContain(obj3);
    });

    it('应该正确查询半径范围内的对象', () => {
      // Arrange
      const center: IPoint = { x: 100, y: 100 };
      const radius = 80;

      // Act
      const results = manager.queryRadius(center, radius);

      // Assert
      expect(results).toContain(obj1);
      expect(results).toContain(obj2);
      expect(results).not.toContain(obj3);
    });
  });

  describe('四叉树模式', () => {
    beforeEach(() => {
      manager.setUseQuadTree(true);
      manager.insert(obj1);
      manager.insert(obj2);
      manager.insert(obj3);
    });

    it('应该在四叉树模式下正确工作', () => {
      // Arrange
      const queryBounds: IRect = { x: 40, y: 40, width: 150, height: 150 };

      // Act
      const results = manager.query(queryBounds);

      // Assert
      expect(results).toContain(obj1);
      expect(results).toContain(obj2);
      expect(results).not.toContain(obj3);
    });

    it('应该正确重建四叉树', () => {
      // Arrange
      const objects = [obj1, obj2, obj3];

      // Act & Assert
      expect(() => manager.rebuildQuadTree(objects)).not.toThrow();
      
      // 重建后查询应该仍然正常工作
      const results = manager.query({ x: 0, y: 0, width: 300, height: 300 });
      expect(results).toHaveLength(3);
    });
  });

  describe('性能测试', () => {
    it('应该高效处理大量对象的插入和查询', () => {
      // Arrange
      const objects: TestSpatialObject[] = [];
      for (let i = 0; i < 1000; i++) {
        const obj = new TestSpatialObject(`obj_${i}`, {
          x: Math.random() * 800,
          y: Math.random() * 800,
          width: 10,
          height: 10
        });
        objects.push(obj);
      }

      // Act - 插入
      const insertStart = performance.now();
      objects.forEach(obj => manager.insert(obj));
      const insertEnd = performance.now();

      // Act - 查询
      const queryStart = performance.now();
      for (let i = 0; i < 100; i++) {
        manager.query({
          x: Math.random() * 700,
          y: Math.random() * 700,
          width: 100,
          height: 100
        });
      }
      const queryEnd = performance.now();

      // Assert
      expect(insertEnd - insertStart).toBeLessThan(100); // 插入应该在100ms内完成
      expect(queryEnd - queryStart).toBeLessThan(50); // 查询应该在50ms内完成
    });

    it('应该在四叉树模式下保持良好性能', () => {
      // Arrange
      manager.setUseQuadTree(true);
      const objects: TestSpatialObject[] = [];
      for (let i = 0; i < 500; i++) {
        const obj = new TestSpatialObject(`obj_${i}`, {
          x: Math.random() * 800,
          y: Math.random() * 800,
          width: 15,
          height: 15
        });
        objects.push(obj);
        manager.insert(obj);
      }

      // Act
      const start = performance.now();
      for (let i = 0; i < 100; i++) {
        manager.query({
          x: Math.random() * 700,
          y: Math.random() * 700,
          width: 100,
          height: 100
        });
      }
      const end = performance.now();

      // Assert
      expect(end - start).toBeLessThan(100); // 应该在100ms内完成
    });
  });

  describe('边界情况测试', () => {
    it('应该处理半径查询', () => {
      // Arrange
      manager.insert(obj1);
      manager.insert(obj2);
      const center = { x: 50, y: 50 };
      const radius = 100;

      // Act
      const results = manager.queryRadius(center, radius);

      // Assert
      expect(Array.isArray(results)).toBe(true);
    });

    it('应该获取调试信息', () => {
      // Arrange
      manager.insert(obj1);
      manager.insert(obj2);

      // Act
      const debugInfo = manager.getDebugInfo();

      // Assert
      expect(debugInfo).toBeDefined();
      expect(typeof debugInfo).toBe('object');
    });

    it('应该处理空间网格的统计信息', () => {
      // Arrange
      const grid = new SpatialGrid<TestSpatialObject>(50);
      grid.insert(obj1);
      grid.insert(obj2);

      // Act
      const stats = grid.getStats();

      // Assert
      expect(stats.totalCells).toBeGreaterThan(0);
      expect(stats.totalObjects).toBe(2);
      expect(stats.averageObjectsPerCell).toBeGreaterThan(0);
    });

    it('应该处理四叉树的调试信息', () => {
      // Arrange
      const quadTree = new QuadTree<TestSpatialObject>({ x: 0, y: 0, width: 1000, height: 1000 });
      quadTree.insert(obj1);
      quadTree.insert(obj2);

      // Act
      const debugInfo = quadTree.getDebugInfo();

      // Assert
      expect(debugInfo).toBeDefined();
      expect(typeof debugInfo).toBe('object');
    });

    it('应该处理空间网格的半径查询', () => {
      // Arrange
      const grid = new SpatialGrid<TestSpatialObject>(50);
      grid.insert(obj1);
      grid.insert(obj2);
      const center = { x: 50, y: 50 };
      const radius = 100;

      // Act
      const results = grid.queryRadius(center, radius);

      // Assert
      expect(results instanceof Set).toBe(true);
    });

    it('应该处理空间网格的点查询', () => {
      // Arrange
      const grid = new SpatialGrid<TestSpatialObject>(50);
      grid.insert(obj1);
      const point = { x: 10, y: 10 };

      // Act
      const results = grid.queryPoint(point);

      // Assert
      expect(results instanceof Set).toBe(true);
    });

    it('应该处理四叉树的点查询', () => {
      // Arrange
      const quadTree = new QuadTree<TestSpatialObject>({ x: 0, y: 0, width: 1000, height: 1000 });
      quadTree.insert(obj1);
      const point = { x: 10, y: 10 };

      // Act
      const results = quadTree.queryPoint(point);

      // Assert
      expect(Array.isArray(results)).toBe(true);
    });
  });

  describe('调试和统计', () => {
    it('应该提供调试信息', () => {
      // Arrange
      manager.insert(obj1);
      manager.insert(obj2);

      // Act
      const debugInfo = manager.getDebugInfo();

      // Assert
      expect(debugInfo).toBeDefined();
      expect(typeof debugInfo).toBe('object');
    });

    it('应该在四叉树模式下提供调试信息', () => {
      // Arrange
      manager.setUseQuadTree(true);
      manager.insert(obj1);
      manager.insert(obj2);

      // Act
      const debugInfo = manager.getDebugInfo();

      // Assert
      expect(debugInfo).toBeDefined();
      expect(typeof debugInfo).toBe('object');
    });
  });

  describe('边界情况', () => {
    it('应该正确处理空管理器的查询', () => {
      // Arrange
      const queryBounds: IRect = { x: 0, y: 0, width: 100, height: 100 };

      // Act
      const results = manager.query(queryBounds);

      // Assert
      expect(results).toHaveLength(0);
    });

    it('应该正确处理重复操作', () => {
      // Arrange & Act
      manager.insert(obj1);
      manager.insert(obj1); // 重复插入
      manager.remove(obj1);
      manager.remove(obj1); // 重复移除

      // Assert
      const results = manager.query({ x: 0, y: 0, width: 100, height: 100 });
      expect(results).not.toContain(obj1);
    });

    it('应该正确处理模式切换', () => {
      // Arrange - 先切换到四叉树模式再插入对象
      manager.setUseQuadTree(true);
      manager.insert(obj1);
      manager.insert(obj2);
      const quadTreeResults = manager.query({ x: 0, y: 0, width: 200, height: 200 });

      // Act - 切换回网格模式并重新插入对象
      manager.clear();
      manager.setUseQuadTree(false);
      manager.insert(obj1);
      manager.insert(obj2);
      const gridResults = manager.query({ x: 0, y: 0, width: 200, height: 200 });

      // Assert
      // 两种模式应该能找到相同数量的对象
      expect(quadTreeResults).toHaveLength(2);
      expect(gridResults).toHaveLength(2);
      expect(quadTreeResults).toHaveLength(gridResults.length);
    });
  });
});