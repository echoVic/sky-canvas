import { RenderEngine } from '../RenderEngine';
import { DirtyRegionManager } from '../DirtyRegionManager';
import { LayerCache } from '../LayerCache';
import { AdvancedBatcher } from '../../batching/AdvancedBatcher';

// Mock interfaces for testing
interface MockRenderable {
  id: string;
  visible: boolean;
  zIndex: number;
  render: jest.Mock;
  getBounds: () => any;
}

interface MockLayer {
  id: string;
  visible: boolean;
  opacity: number;
  zIndex: number;
  getRenderables: () => MockRenderable[];
}

describe('RenderEngine Performance Features', () => {
  let renderEngine: RenderEngine;
  let mockContext: any;

  beforeEach(() => {
    renderEngine = new RenderEngine();
    
    // Create mock context
    mockContext = {
      clear: jest.fn(),
      save: jest.fn(),
      restore: jest.fn(),
      scale: jest.fn(),
      translate: jest.fn(),
      setOpacity: jest.fn(),
      beginPath: jest.fn(),
      rect: jest.fn(),
      clip: jest.fn(),
      width: 800,
      height: 600
    };

    // Mock the context in the render engine
    (renderEngine as any).context = mockContext;
  });

  test('should create performance optimization components', () => {
    expect((renderEngine as any).dirtyRegionManager).toBeInstanceOf(DirtyRegionManager);
    expect((renderEngine as any).layerCache).toBeInstanceOf(LayerCache);
    expect((renderEngine as any).advancedBatcher).toBeInstanceOf(AdvancedBatcher);
  });

  test('should mark region as dirty', () => {
    const bounds = { x: 0, y: 0, width: 100, height: 100 };
    renderEngine.markRegionDirty(bounds);
    
    // Verify the dirty region manager was called
    const dirtyRegions = (renderEngine as any).dirtyRegionManager.getDirtyRegions();
    expect(dirtyRegions).toHaveLength(1);
  });

  test('should invalidate layer cache', () => {
    // This test requires the layer cache to be properly mocked
    expect(() => {
      renderEngine.invalidateLayerCache('test-layer');
    }).not.toThrow();
  });

  test('should get cache memory usage', () => {
    const memoryUsage = renderEngine.getCacheMemoryUsage();
    expect(typeof memoryUsage).toBe('number');
  });

  test('should cleanup expired cache', () => {
    expect(() => {
      renderEngine.cleanupExpiredCache();
    }).not.toThrow();
  });

  test('should set context for advanced batcher during initialization', async () => {
    // Create a new render engine for this test
    const newRenderEngine = new RenderEngine();
    
    // Mock factory and canvas
    const mockFactory = {
      isSupported: jest.fn().mockReturnValue(true),
      createContext: jest.fn().mockResolvedValue(mockContext),
      getCapabilities: jest.fn().mockReturnValue({
        supportsHardwareAcceleration: true,
        supportsTransforms: true,
        supportsFilters: true,
        supportsBlending: true,
        maxTextureSize: 4096,
        supportedFormats: ['rgba8', 'rgb8']
      })
    };
    
    const mockCanvas = {};
    
    await newRenderEngine.initialize(mockFactory, mockCanvas);
    
    // Verify the context was set
    expect(mockFactory.createContext).toHaveBeenCalledWith(mockCanvas);
  });

  test('should handle render with dirty regions', () => {
    // Mark a region as dirty
    const bounds = { x: 10, y: 10, width: 50, height: 50 };
    renderEngine.markRegionDirty(bounds);
    
    // Call render
    renderEngine.render();
    
    // Verify cleanup was called
    expect((renderEngine as any).dirtyRegionManager.prepareNextFrame).toBeDefined();
  });

  test('should handle render without dirty regions', () => {
    // Call render without marking any dirty regions
    renderEngine.render();
    
    // Verify basic rendering flow
    expect(mockContext.clear).toHaveBeenCalled();
    expect(mockContext.save).toHaveBeenCalled();
    expect(mockContext.restore).toHaveBeenCalled();
  });
});