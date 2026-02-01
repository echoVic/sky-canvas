import { Rectangle } from '../../math/Rectangle'
import { DirtyRegionManager } from '../DirtyRegionManager'

describe('DirtyRegionManager', () => {
  let dirtyRegionManager: DirtyRegionManager

  beforeEach(() => {
    dirtyRegionManager = new DirtyRegionManager()
  })

  test('should mark region as dirty', () => {
    const region = new Rectangle(0, 0, 100, 100)
    dirtyRegionManager.markRegionDirty(region)

    const dirtyRegions = dirtyRegionManager.getDirtyRegions()
    expect(dirtyRegions).toHaveLength(1)
    expect(dirtyRegions[0].x).toBe(region.x)
    expect(dirtyRegions[0].y).toBe(region.y)
    expect(dirtyRegions[0].width).toBe(region.width)
    expect(dirtyRegions[0].height).toBe(region.height)
  })

  test('should optimize dirty regions by merging adjacent ones', () => {
    // Add adjacent regions
    dirtyRegionManager.markRegionDirty(new Rectangle(0, 0, 50, 50))
    dirtyRegionManager.markRegionDirty(new Rectangle(50, 0, 50, 50))

    const optimized = dirtyRegionManager.optimizeDirtyRegions()
    expect(optimized).toHaveLength(1)
    const expected = new Rectangle(0, 0, 100, 50)
    expect(optimized[0].x).toBe(expected.x)
    expect(optimized[0].y).toBe(expected.y)
    expect(optimized[0].width).toBe(expected.width)
    expect(optimized[0].height).toBe(expected.height)
  })

  test('should detect shape changes', () => {
    // Mock shape object
    const mockShape: any = {
      id: 'test-shape',
      getBounds: () => ({ x: 0, y: 0, width: 100, height: 100 }),
      visible: true,
      zIndex: 1,
    }

    // First check should return true (new shape)
    expect(dirtyRegionManager.shouldRedrawShape(mockShape)).toBe(true)

    // Update current frame shape
    dirtyRegionManager.updateCurrentFrameShape(mockShape)
    dirtyRegionManager.prepareNextFrame()

    // Second check should return false (no changes)
    expect(dirtyRegionManager.shouldRedrawShape(mockShape)).toBe(false)

    // Modify shape properties and check again
    mockShape.getBounds = () => new Rectangle(10, 10, 100, 100)
    expect(dirtyRegionManager.shouldRedrawShape(mockShape)).toBe(true)
  })

  test('should prepare next frame', () => {
    const region = new Rectangle(0, 0, 100, 100)
    dirtyRegionManager.markRegionDirty(region)

    expect(dirtyRegionManager.getDirtyRegions()).toHaveLength(1)

    dirtyRegionManager.prepareNextFrame()
    expect(dirtyRegionManager.getDirtyRegions()).toHaveLength(0)
  })

  test('should clear dirty regions', () => {
    dirtyRegionManager.markRegionDirty(new Rectangle(0, 0, 100, 100))
    expect(dirtyRegionManager.getDirtyRegions()).toHaveLength(1)

    dirtyRegionManager.clearDirtyRegions()
    expect(dirtyRegionManager.getDirtyRegions()).toHaveLength(0)
  })
})
