import { DirtyRegionManager } from '../DirtyRegionManager';

describe('DirtyRegionManager', () => {
  let dirtyRegionManager: DirtyRegionManager;

  beforeEach(() => {
    dirtyRegionManager = new DirtyRegionManager();
  });

  test('should mark region as dirty', () => {
    const region = { x: 0, y: 0, width: 100, height: 100 };
    dirtyRegionManager.markRegionDirty(region);
    
    const dirtyRegions = dirtyRegionManager.getDirtyRegions();
    expect(dirtyRegions).toHaveLength(1);
    expect(dirtyRegions[0]).toEqual(region);
  });

  test('should optimize dirty regions by merging adjacent ones', () => {
    // Add adjacent regions
    dirtyRegionManager.markRegionDirty({ x: 0, y: 0, width: 50, height: 50 });
    dirtyRegionManager.markRegionDirty({ x: 50, y: 0, width: 50, height: 50 });
    
    const optimized = dirtyRegionManager.optimizeDirtyRegions();
    expect(optimized).toHaveLength(1);
    expect(optimized[0]).toEqual({ x: 0, y: 0, width: 100, height: 50 });
  });

  test('should detect shape changes', () => {
    // Mock shape object
    const mockShape: any = {
      id: 'test-shape',
      getBounds: () => ({ x: 0, y: 0, width: 100, height: 100 }),
      visible: true,
      zIndex: 1
    };
    
    // First check should return true (new shape)
    expect(dirtyRegionManager.shouldRedrawShape(mockShape)).toBe(true);
    
    // Update current frame shape
    dirtyRegionManager.updateCurrentFrameShape(mockShape);
    dirtyRegionManager.prepareNextFrame();
    
    // Second check should return false (no changes)
    expect(dirtyRegionManager.shouldRedrawShape(mockShape)).toBe(false);
    
    // Modify shape properties and check again
    mockShape.getBounds = () => ({ x: 10, y: 10, width: 100, height: 100 });
    expect(dirtyRegionManager.shouldRedrawShape(mockShape)).toBe(true);
  });

  test('should prepare next frame', () => {
    const region = { x: 0, y: 0, width: 100, height: 100 };
    dirtyRegionManager.markRegionDirty(region);
    
    expect(dirtyRegionManager.getDirtyRegions()).toHaveLength(1);
    
    dirtyRegionManager.prepareNextFrame();
    expect(dirtyRegionManager.getDirtyRegions()).toHaveLength(0);
  });

  test('should clear dirty regions', () => {
    dirtyRegionManager.markRegionDirty({ x: 0, y: 0, width: 100, height: 100 });
    expect(dirtyRegionManager.getDirtyRegions()).toHaveLength(1);
    
    dirtyRegionManager.clearDirtyRegions();
    expect(dirtyRegionManager.getDirtyRegions()).toHaveLength(0);
  });
});