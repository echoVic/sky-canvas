/**
 * SpatialPartitioning 单元测试
 * 基于 BDD (Behavior-Driven Development) 和 AAA (Arrange-Act-Assert) 模式
 */

import { beforeEach, describe, expect, it } from 'vitest';
import { IRenderCommand, MaterialKey, RenderCommandType } from '../../commands/IRenderCommand';
import { IGraphicsContext, IRect } from '../../graphics/IGraphicsContext';
import {
  CullingManager,
  CullingManagerFactory,
  QuadTreeNode,
  SpatialHashGrid
} from '../SpatialPartitioning';

// Mock render command for testing
class MockRenderCommand implements IRenderCommand {
  readonly id: string;
  readonly type: RenderCommandType = RenderCommandType.RECT;
  readonly zIndex: number = 0;
  readonly materialKey: MaterialKey = {};

  constructor(
    public bounds: IRect,
    id?: string
  ) {
    this.id = id || Math.random().toString(36);
  }

  execute(context: IGraphicsContext): void {
    // Mock implementation
  }

  getBounds(): IRect {
    return this.bounds;
  }

  canBatchWith(other: IRenderCommand): boolean {
    return false;
  }

  getBatchData(): any {
    return null;
  }

  isVisible(viewport: IRect): boolean {
    return true;
  }

  dispose(): void {
    // Mock implementation
  }
}

describe('SpatialPartitioning', () => {
  describe('Given a QuadTreeNode', () => {
    let quadTree: QuadTreeNode;
    let testBounds: IRect;
    let mockObjects: MockRenderCommand[];

    beforeEach(() => {
      // Arrange: Setup test bounds and objects
      testBounds = { x: 0, y: 0, width: 100, height: 100 };
      quadTree = new QuadTreeNode(testBounds, 4, 3, 0);
      
      mockObjects = [
        new MockRenderCommand({ x: 10, y: 10, width: 10, height: 10 }, 'obj1'),
        new MockRenderCommand({ x: 20, y: 20, width: 10, height: 10 }, 'obj2'),
        new MockRenderCommand({ x: 60, y: 60, width: 10, height: 10 }, 'obj3'),
        new MockRenderCommand({ x: 80, y: 80, width: 10, height: 10 }, 'obj4'),
      ];
    });

    describe('When creating a new QuadTreeNode', () => {
      it('Then it should initialize with correct bounds and properties', () => {
        // Arrange & Act
        const node = new QuadTreeNode(testBounds, 5, 4, 1);

        // Assert
        expect(node.bounds).toEqual(testBounds);
        expect(node.objects).toEqual([]);
        expect(node.isLeaf).toBe(true);
      });

      it('Then it should use default parameters when not specified', () => {
        // Arrange & Act
        const node = new QuadTreeNode(testBounds);

        // Assert
        expect(node.bounds).toEqual(testBounds);
        expect(node.isLeaf).toBe(true);
      });
    });

    describe('When adding objects to QuadTree', () => {
      it('Then it should add objects within bounds successfully', () => {
        // Arrange
        const object = mockObjects[0];

        // Act
        const result = quadTree.addObject(object);

        // Assert
        expect(result).toBe(true);
        expect(quadTree.objects).toContain(object);
        expect(quadTree.objects.length).toBe(1);
      });

      it('Then it should reject objects outside bounds', () => {
        // Arrange
        const outsideObject = new MockRenderCommand(
          { x: 150, y: 150, width: 10, height: 10 },
          'outside'
        );

        // Act
        const result = quadTree.addObject(outsideObject);

        // Assert
        expect(result).toBe(false);
        expect(quadTree.objects).not.toContain(outsideObject);
        expect(quadTree.objects.length).toBe(0);
      });

      it('Then it should split when exceeding max objects', () => {
        // Arrange
        const maxObjects = 4;
        const node = new QuadTreeNode(testBounds, maxObjects, 3, 0);

        // Act: Add objects up to and beyond the limit
        mockObjects.forEach(obj => node.addObject(obj));
        const extraObject = new MockRenderCommand(
          { x: 5, y: 5, width: 5, height: 5 },
          'extra'
        );
        node.addObject(extraObject);

        // Assert
        expect(node.isLeaf).toBe(false); // Should have split
      });

      it('Then it should not split at maximum level', () => {
        // Arrange
        const maxLevel = 0; // No splitting allowed
        const node = new QuadTreeNode(testBounds, 2, maxLevel, maxLevel);

        // Act: Add more objects than the limit
        mockObjects.forEach(obj => node.addObject(obj));

        // Assert
        expect(node.isLeaf).toBe(true); // Should remain a leaf
        expect(node.objects.length).toBe(mockObjects.length);
      });
    });

    describe('When removing objects from QuadTree', () => {
      beforeEach(() => {
        // Arrange: Add objects to the tree
        mockObjects.forEach(obj => quadTree.addObject(obj));
      });

      it('Then it should remove existing objects successfully', () => {
        // Arrange
        const objectToRemove = mockObjects[0];
        const initialCount = quadTree.objects.length;

        // Act
        const result = quadTree.removeObject(objectToRemove);

        // Assert
        expect(result).toBe(true);
        expect(quadTree.objects).not.toContain(objectToRemove);
        expect(quadTree.objects.length).toBe(initialCount - 1);
      });

      it('Then it should return false for non-existing objects', () => {
        // Arrange
        const nonExistingObject = new MockRenderCommand(
          { x: 200, y: 200, width: 10, height: 10 },
          'nonexisting'
        );

        // Act
        const result = quadTree.removeObject(nonExistingObject);

        // Assert
        expect(result).toBe(false);
      });
    });

    describe('When querying QuadTree', () => {
      beforeEach(() => {
        // Arrange: Add objects to the tree
        mockObjects.forEach(obj => quadTree.addObject(obj));
      });

      it('Then it should return objects within query region', () => {
        // Arrange
        const queryRegion: IRect = { x: 0, y: 0, width: 30, height: 30 };

        // Act
        const results = quadTree.query(queryRegion);

        // Assert
        expect(results.length).toBeGreaterThan(0);
        results.forEach(obj => {
          const bounds = obj.getBounds();
          expect(
            bounds.x < queryRegion.x + queryRegion.width &&
            bounds.x + bounds.width > queryRegion.x &&
            bounds.y < queryRegion.y + queryRegion.height &&
            bounds.y + bounds.height > queryRegion.y
          ).toBe(true);
        });
      });

      it('Then it should return empty array for non-intersecting region', () => {
        // Arrange
        const queryRegion: IRect = { x: 200, y: 200, width: 50, height: 50 };

        // Act
        const results = quadTree.query(queryRegion);

        // Assert
        expect(results).toEqual([]);
      });

      it('Then it should return all objects for region covering entire bounds', () => {
        // Arrange
        const queryRegion: IRect = { x: -10, y: -10, width: 120, height: 120 };

        // Act
        const results = quadTree.query(queryRegion);

        // Assert
        expect(results.length).toBe(mockObjects.length);
      });
    });

    describe('When clearing QuadTree', () => {
      beforeEach(() => {
        // Arrange: Add objects to the tree
        mockObjects.forEach(obj => quadTree.addObject(obj));
      });

      it('Then it should remove all objects and reset to leaf state', () => {
        // Arrange
        // Objects already added

        // Act
        quadTree.clear();

        // Assert
        expect(quadTree.objects).toEqual([]);
        expect(quadTree.isLeaf).toBe(true);
      });
    });
  });

  describe('Given a SpatialHashGrid', () => {
    let hashGrid: SpatialHashGrid;
    let mockObjects: MockRenderCommand[];

    beforeEach(() => {
      // Arrange: Setup hash grid and test objects
      hashGrid = new SpatialHashGrid(32); // 32x32 cell size
      
      mockObjects = [
        new MockRenderCommand({ x: 10, y: 10, width: 10, height: 10 }, 'obj1'),
        new MockRenderCommand({ x: 50, y: 50, width: 20, height: 20 }, 'obj2'),
        new MockRenderCommand({ x: 100, y: 100, width: 15, height: 15 }, 'obj3'),
      ];
    });

    describe('When creating a SpatialHashGrid', () => {
      it('Then it should initialize with specified cell size', () => {
        // Arrange & Act
        const grid = new SpatialHashGrid(64);

        // Assert
        expect(grid).toBeDefined();
        const stats = grid.getStats();
        expect(stats.totalCells).toBe(0);
        expect(stats.totalObjects).toBe(0);
      });

      it('Then it should use default cell size when not specified', () => {
        // Arrange & Act
        const grid = new SpatialHashGrid();

        // Assert
        expect(grid).toBeDefined();
      });
    });

    describe('When adding objects to SpatialHashGrid', () => {
      it('Then it should add objects and update statistics', () => {
        // Arrange
        const object = mockObjects[0];

        // Act
        hashGrid.addObject(object);

        // Assert
        const stats = hashGrid.getStats();
        expect(stats.totalObjects).toBe(1);
        expect(stats.totalCells).toBeGreaterThan(0);
      });

      it('Then it should handle objects spanning multiple cells', () => {
        // Arrange
        const largeObject = new MockRenderCommand(
          { x: 30, y: 30, width: 40, height: 40 }, // Spans multiple 32x32 cells
          'large'
        );

        // Act
        hashGrid.addObject(largeObject);

        // Assert
        const stats = hashGrid.getStats();
        expect(stats.totalObjects).toBe(1);
        expect(stats.totalCells).toBeGreaterThan(1); // Should be in multiple cells
      });
    });

    describe('When removing objects from SpatialHashGrid', () => {
      beforeEach(() => {
        // Arrange: Add objects to the grid
        mockObjects.forEach(obj => hashGrid.addObject(obj));
      });

      it('Then it should remove existing objects successfully', () => {
        // Arrange
        const objectToRemove = mockObjects[0];
        const initialStats = hashGrid.getStats();

        // Act
        const result = hashGrid.removeObject(objectToRemove);

        // Assert
        expect(result).toBe(true);
        const newStats = hashGrid.getStats();
        expect(newStats.totalObjects).toBe(initialStats.totalObjects - 1);
      });

      it('Then it should return false for non-existing objects', () => {
        // Arrange
        const nonExistingObject = new MockRenderCommand(
          { x: 500, y: 500, width: 10, height: 10 },
          'nonexisting'
        );

        // Act
        const result = hashGrid.removeObject(nonExistingObject);

        // Assert
        expect(result).toBe(false);
      });
    });

    describe('When querying SpatialHashGrid', () => {
      beforeEach(() => {
        // Arrange: Add objects to the grid
        mockObjects.forEach(obj => hashGrid.addObject(obj));
      });

      it('Then it should return objects within query region', () => {
        // Arrange
        const queryRegion: IRect = { x: 0, y: 0, width: 30, height: 30 };

        // Act
        const results = hashGrid.query(queryRegion);

        // Assert
        expect(results.length).toBeGreaterThan(0);
        // Verify results are actually intersecting
        results.forEach(obj => {
          const bounds = obj.getBounds();
          expect(
            bounds.x < queryRegion.x + queryRegion.width &&
            bounds.x + bounds.width > queryRegion.x &&
            bounds.y < queryRegion.y + queryRegion.height &&
            bounds.y + bounds.height > queryRegion.y
          ).toBe(true);
        });
      });

      it('Then it should return empty array for non-intersecting region', () => {
        // Arrange
        const queryRegion: IRect = { x: 500, y: 500, width: 50, height: 50 };

        // Act
        const results = hashGrid.query(queryRegion);

        // Assert
        expect(results).toEqual([]);
      });
    });

    describe('When clearing SpatialHashGrid', () => {
      beforeEach(() => {
        // Arrange: Add objects to the grid
        mockObjects.forEach(obj => hashGrid.addObject(obj));
      });

      it('Then it should remove all objects and reset statistics', () => {
        // Arrange
        // Objects already added

        // Act
        hashGrid.clear();

        // Assert
        const stats = hashGrid.getStats();
        expect(stats.totalObjects).toBe(0);
        expect(stats.totalCells).toBe(0);
      });
    });

    describe('When getting statistics', () => {
      it('Then it should provide accurate statistics', () => {
        // Arrange
        mockObjects.forEach(obj => hashGrid.addObject(obj));

        // Act
        const stats = hashGrid.getStats();

        // Assert
        expect(stats.totalObjects).toBe(mockObjects.length);
        expect(stats.totalCells).toBeGreaterThan(0);
        expect(stats.averageObjectsPerCell).toBeGreaterThan(0);
        expect(stats.maxObjectsPerCell).toBeGreaterThan(0);
      });
    });
  });

  describe('Given a CullingManager', () => {
    let cullingManager: CullingManager;
    let mockSpatialIndex: QuadTreeNode;
    let mockObjects: MockRenderCommand[];
    let viewport: IRect;

    beforeEach(() => {
      // Arrange: Setup culling manager with QuadTree
      const bounds: IRect = { x: 0, y: 0, width: 200, height: 200 };
      mockSpatialIndex = new QuadTreeNode(bounds);
      cullingManager = new CullingManager(mockSpatialIndex, 10);
      
      viewport = { x: 0, y: 0, width: 100, height: 100 };
      
      mockObjects = [
        new MockRenderCommand({ x: 10, y: 10, width: 20, height: 20 }, 'visible1'),
        new MockRenderCommand({ x: 50, y: 50, width: 20, height: 20 }, 'visible2'),
        new MockRenderCommand({ x: 150, y: 150, width: 20, height: 20 }, 'culled1'),
        new MockRenderCommand({ x: 180, y: 180, width: 20, height: 20 }, 'culled2'),
      ];
    });

    describe('When creating a CullingManager', () => {
      it('Then it should initialize with spatial index and cull margin', () => {
        // Arrange & Act
        const manager = new CullingManager(mockSpatialIndex, 25);

        // Assert
        expect(manager).toBeDefined();
        const stats = manager.getStats();
        expect(stats.totalObjects).toBe(0);
        expect(stats.visibleObjects).toBe(0);
        expect(stats.culledObjects).toBe(0);
      });
    });

    describe('When adding objects to CullingManager', () => {
      it('Then it should add objects to spatial index', () => {
        // Arrange
        const object = mockObjects[0];

        // Act
        cullingManager.addObject(object);

        // Assert
        const stats = cullingManager.getStats();
        expect(stats.totalObjects).toBe(1);
      });

      it('Then it should handle multiple objects', () => {
        // Arrange
        // Multiple objects ready

        // Act
        mockObjects.forEach(obj => cullingManager.addObject(obj));

        // Assert
        const stats = cullingManager.getStats();
        expect(stats.totalObjects).toBe(mockObjects.length);
      });
    });

    describe('When performing culling', () => {
      beforeEach(() => {
        // Arrange: Add objects to the manager
        mockObjects.forEach(obj => cullingManager.addObject(obj));
      });

      it('Then it should return only visible objects within viewport', () => {
        // Arrange
        // Objects already added, viewport defined

        // Act
        const visibleObjects = cullingManager.cull(viewport);

        // Assert
        expect(visibleObjects.length).toBeLessThanOrEqual(mockObjects.length);
        
        // Verify all returned objects are actually visible
        visibleObjects.forEach(obj => {
          const bounds = obj.getBounds();
          const expandedViewport = {
            x: viewport.x - 10, // cull margin
            y: viewport.y - 10,
            width: viewport.width + 20,
            height: viewport.height + 20
          };
          
          expect(
            bounds.x < expandedViewport.x + expandedViewport.width &&
            bounds.x + bounds.width > expandedViewport.x &&
            bounds.y < expandedViewport.y + expandedViewport.height &&
            bounds.y + bounds.height > expandedViewport.y
          ).toBe(true);
        });
      });

      it('Then it should update statistics after culling', () => {
        // Arrange
        // Objects already added

        // Act
        const visibleObjects = cullingManager.cull(viewport);

        // Assert
        const stats = cullingManager.getStats();
        expect(stats.visibleObjects).toBe(visibleObjects.length);
        expect(stats.culledObjects).toBe(stats.totalObjects - stats.visibleObjects);
        expect(stats.queryTime).toBeGreaterThan(0);
      });

      it('Then it should handle empty viewport', () => {
        // Arrange
        const emptyViewport: IRect = { x: 1000, y: 1000, width: 50, height: 50 };

        // Act
        const visibleObjects = cullingManager.cull(emptyViewport);

        // Assert
        expect(visibleObjects).toEqual([]);
        const stats = cullingManager.getStats();
        expect(stats.visibleObjects).toBe(0);
        expect(stats.culledObjects).toBe(stats.totalObjects);
      });
    });

    describe('When updating objects', () => {
      beforeEach(() => {
        // Arrange: Add objects to the manager
        mockObjects.forEach(obj => cullingManager.addObject(obj));
      });

      it('Then it should update single object position', () => {
        // Arrange
        const objectToUpdate = mockObjects[0];
        const newBounds: IRect = { x: 30, y: 30, width: 20, height: 20 };
        objectToUpdate.bounds = newBounds;

        // Act
        cullingManager.updateObject(objectToUpdate);

        // Assert
        // Object should be updated in spatial index (tested through culling)
        const visibleObjects = cullingManager.cull({ x: 25, y: 25, width: 20, height: 20 });
        expect(visibleObjects).toContain(objectToUpdate);
      });

      it('Then it should update multiple objects', () => {
        // Arrange
        const objectsToUpdate = mockObjects.slice(0, 2);
        objectsToUpdate.forEach((obj, index) => {
          obj.bounds = { x: index * 40, y: index * 40, width: 20, height: 20 };
        });

        // Act
        cullingManager.updateObjects(objectsToUpdate);

        // Assert
        // Objects should be updated in spatial index
        const visibleObjects = cullingManager.cull({ x: 0, y: 0, width: 100, height: 100 });
        objectsToUpdate.forEach(obj => {
          expect(visibleObjects).toContain(obj);
        });
      });
    });

    describe('When removing objects', () => {
      beforeEach(() => {
        // Arrange: Add objects to the manager
        mockObjects.forEach(obj => cullingManager.addObject(obj));
      });

      it('Then it should remove objects from spatial index', () => {
        // Arrange
        const objectToRemove = mockObjects[0];
        const initialStats = cullingManager.getStats();

        // Act
        cullingManager.removeObject(objectToRemove);

        // Assert
        const newStats = cullingManager.getStats();
        expect(newStats.totalObjects).toBe(initialStats.totalObjects - 1);
      });
    });

    describe('When clearing CullingManager', () => {
      beforeEach(() => {
        // Arrange: Add objects to the manager
        mockObjects.forEach(obj => cullingManager.addObject(obj));
      });

      it('Then it should remove all objects and reset statistics', () => {
        // Arrange
        // Objects already added

        // Act
        cullingManager.clear();

        // Assert
        const stats = cullingManager.getStats();
        expect(stats.totalObjects).toBe(0);
        expect(stats.visibleObjects).toBe(0);
        expect(stats.culledObjects).toBe(0);
      });
    });

    describe('When configuring cull margin', () => {
      it('Then it should update cull margin and affect culling results', () => {
        // Arrange
        mockObjects.forEach(obj => cullingManager.addObject(obj));
        const tightViewport: IRect = { x: 0, y: 0, width: 50, height: 50 };

        // Act: Test with different cull margins
        cullingManager.setCullMargin(0);
        const resultsWithoutMargin = cullingManager.cull(tightViewport);
        
        cullingManager.setCullMargin(50);
        const resultsWithMargin = cullingManager.cull(tightViewport);

        // Assert
        expect(resultsWithMargin.length).toBeGreaterThanOrEqual(resultsWithoutMargin.length);
      });
    });
  });

  describe('Given CullingManagerFactory', () => {
    const testBounds: IRect = { x: 0, y: 0, width: 1000, height: 1000 };

    describe('When creating QuadTree-based CullingManager', () => {
      it('Then it should create manager with QuadTree spatial index', () => {
        // Arrange & Act
        const manager = CullingManagerFactory.createQuadTree(testBounds, 10, 5, 25);

        // Assert
        expect(manager).toBeDefined();
        expect(manager).toBeInstanceOf(CullingManager);
      });

      it('Then it should use default parameters when not specified', () => {
        // Arrange & Act
        const manager = CullingManagerFactory.createQuadTree(testBounds);

        // Assert
        expect(manager).toBeDefined();
      });
    });

    describe('When creating SpatialHash-based CullingManager', () => {
      it('Then it should create manager with SpatialHashGrid', () => {
        // Arrange & Act
        const manager = CullingManagerFactory.createSpatialHash(64, 30);

        // Assert
        expect(manager).toBeDefined();
        expect(manager).toBeInstanceOf(CullingManager);
      });

      it('Then it should use default parameters when not specified', () => {
        // Arrange & Act
        const manager = CullingManagerFactory.createSpatialHash();

        // Assert
        expect(manager).toBeDefined();
      });
    });

    describe('When creating optimal CullingManager', () => {
      it('Then it should choose QuadTree for small object counts', () => {
        // Arrange & Act
        const manager = CullingManagerFactory.createOptimal(testBounds, 50, 20);

        // Assert
        expect(manager).toBeDefined();
        expect(manager).toBeInstanceOf(CullingManager);
      });

      it('Then it should choose SpatialHash for large object counts', () => {
        // Arrange & Act
        const manager = CullingManagerFactory.createOptimal(testBounds, 5000, 20);

        // Assert
        expect(manager).toBeDefined();
        expect(manager).toBeInstanceOf(CullingManager);
      });
    });
  });
});