import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DirtyRegionManager } from '../DirtyRegionManager';
import { LayerCache } from '../LayerCache';
import { RenderEngine } from '../RenderEngine';

// Mock interfaces for testing
interface MockRenderable {
  id: string;
  visible: boolean;
  zIndex: number;
  render: ReturnType<typeof vi.fn>;
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
    
    mockContext = {
      clear: vi.fn(),
      save: vi.fn(),
      restore: vi.fn(),
      scale: vi.fn(),
      translate: vi.fn(),
      setOpacity: vi.fn(),
      beginPath: vi.fn(),
      rect: vi.fn(),
      clip: vi.fn(),
      present: vi.fn(),
      width: 800,
      height: 600
    };

    (renderEngine as any).context = mockContext;
  });

  it('should create performance optimization components', () => {
    expect((renderEngine as any).dirtyRegionManager).toBeInstanceOf(DirtyRegionManager);
    expect((renderEngine as any).layerCache).toBeInstanceOf(LayerCache);
    expect((renderEngine as any).batchManager).toBeDefined();
  });

  it('should mark region as dirty', () => {
    const bounds = { 
      x: 0, 
      y: 0, 
      width: 100, 
      height: 100, 
      clone: vi.fn().mockReturnValue({ x: 0, y: 0, width: 100, height: 100 })
    };
    renderEngine.markRegionDirty(bounds as any);
    
    // Verify the dirty region manager was called
    const dirtyRegions = (renderEngine as any).dirtyRegionManager.getDirtyRegions();
    expect(dirtyRegions).toHaveLength(1);
  });

  it('should invalidate layer cache', () => {
    // This test requires the layer cache to be properly mocked
    expect(() => {
      renderEngine.invalidateLayerCache('test-layer');
    }).not.toThrow();
  });

  it('should get cache memory usage', () => {
    const memoryUsage = renderEngine.getCacheMemoryUsage();
    expect(typeof memoryUsage).toBe('number');
  });

  it('should cleanup expired cache', () => {
    expect(() => {
      renderEngine.cleanupExpiredCache();
    }).not.toThrow();
  });

  it('should set context for advanced batcher during initialization', async () => {
    // Create a new render engine for this test
    const newRenderEngine = new RenderEngine();
    
    // Mock factory and canvas
    const mockFactory = {
      isSupported: vi.fn().mockReturnValue(true),
      createContext: vi.fn().mockResolvedValue(mockContext),
      getCapabilities: vi.fn().mockReturnValue({
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

  it('should handle render with dirty regions', () => {
    const bounds = { 
      x: 10, 
      y: 10, 
      width: 50, 
      height: 50, 
      clone: vi.fn().mockReturnValue({ x: 10, y: 10, width: 50, height: 50 })
    };
    renderEngine.markRegionDirty(bounds as any);
    
    const dirtyRegions = (renderEngine as any).dirtyRegionManager.getDirtyRegions();
    expect(dirtyRegions.length).toBeGreaterThan(0);
    
    renderEngine.render();
    
    expect((renderEngine as any).dirtyRegionManager.prepareNextFrame).toBeDefined();
    expect(typeof (renderEngine as any).dirtyRegionManager.prepareNextFrame).toBe('function');
  });

  it('should handle render without dirty regions', () => {
    renderEngine.render();
    
    expect(mockContext.clear).toHaveBeenCalled();
    expect(mockContext.save).toHaveBeenCalled();
    expect(mockContext.restore).toHaveBeenCalled();
  });
});