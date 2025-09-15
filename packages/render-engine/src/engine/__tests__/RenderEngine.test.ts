/**
 * RenderEngine 单元测试
 * 基于 BDD (Behavior-Driven Development) 和 AAA (Arrange-Act-Assert) 模式
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { CanvasRenderer } from '../../renderers/CanvasRenderer';
import { WebGLRenderer } from '../../renderers/WebGLRenderer';
import { WebGPURenderer } from '../../renderers/WebGPURenderer';
import { RenderEngine } from '../RenderEngine';
import type { IRenderable, RenderEngineConfig } from '../types';

// Mock dependencies
vi.mock('../../renderers/CanvasRenderer');
vi.mock('../../renderers/WebGLRenderer');
vi.mock('../../renderers/WebGPURenderer');

describe('RenderEngine', () => {
  // Test fixtures and setup
  let canvas: HTMLCanvasElement;
  let mockContext: CanvasRenderingContext2D;
  let renderEngine: RenderEngine;
  let mockRenderer: any;

  beforeEach(() => {
    // Arrange: Setup test environment
    canvas = document.createElement('canvas');
    canvas.width = 800;
    canvas.height = 600;
    
    mockContext = {
      clearRect: vi.fn(),
      save: vi.fn(),
      restore: vi.fn(),
      translate: vi.fn(),
      scale: vi.fn(),
      rotate: vi.fn(),
      fillRect: vi.fn(),
      strokeRect: vi.fn(),
      beginPath: vi.fn(),
      closePath: vi.fn(),
      fill: vi.fn(),
      stroke: vi.fn(),
    } as any;
    
    const getContextSpy = vi.spyOn(canvas, 'getContext');
    getContextSpy.mockImplementation(((contextType: any) => {
      if (contextType === 'webgpu') {
        return {} as GPUCanvasContext;
      }
      return mockContext;
    }) as any);
    
    mockRenderer = {
      initialize: vi.fn().mockResolvedValue(undefined),
      render: vi.fn(),
      clear: vi.fn(),
      dispose: vi.fn(),
      getCapabilities: vi.fn().mockReturnValue({}),
      getStats: vi.fn().mockReturnValue({}),
      setViewport: vi.fn(),
      getViewport: vi.fn().mockReturnValue({ x: 0, y: 0, width: 800, height: 600 }),
    };
    
    (CanvasRenderer as any).mockImplementation(() => mockRenderer);
    (WebGLRenderer as any).mockImplementation(() => mockRenderer);
    (WebGPURenderer as any).mockImplementation(() => mockRenderer);
  });

  afterEach(() => {
    // Cleanup
    if (renderEngine) {
      renderEngine.dispose();
    }
    vi.clearAllMocks();
  });

  describe('Given a RenderEngine instance', () => {
    describe('When creating with default configuration', () => {
      it('Then it should initialize with Canvas2D renderer by default', () => {
        // Arrange
        const expectedConfig = {
          renderer: 'auto',
          antialias: true,
          alpha: true,
          preserveDrawingBuffer: false,
          enableBatching: true,
          targetFPS: 60,
          debug: false,
        };

        // Act
        renderEngine = new RenderEngine(canvas);

        // Assert
        expect(renderEngine).toBeDefined();
        expect(renderEngine.getConfig()).toMatchObject(expectedConfig);
        expect(renderEngine.getCanvas()).toBe(canvas);
      });
    });

    describe('When creating with custom configuration', () => {
      it('Then it should merge custom config with defaults', () => {
        // Arrange
        const customConfig: RenderEngineConfig = {
          renderer: 'webgl',
          targetFPS: 120,
          debug: true,
        };

        // Act
        renderEngine = new RenderEngine(canvas, customConfig);

        // Assert
        const config = renderEngine.getConfig();
        expect(config.renderer).toBe('webgl');
        expect(config.targetFPS).toBe(120);
        expect(config.debug).toBe(true);
        expect(config.antialias).toBe(true); // Should keep default
      });
    });
  });

  describe('Given a RenderEngine with renderables', () => {
    beforeEach(() => {
      renderEngine = new RenderEngine(canvas);
    });

    describe('When adding a renderable', () => {
      it('Then it should store the renderable with correct ID', () => {
        // Arrange
        const mockRenderable: IRenderable = {
          id: 'test-renderable',
          visible: true,
          zIndex: 0,
          render: vi.fn(),
          hitTest: vi.fn().mockReturnValue(false),
          getBounds: vi.fn().mockReturnValue({ x: 10, y: 20, width: 100, height: 50 }),
          dispose: vi.fn()
        };

        // Act
        renderEngine.addRenderable(mockRenderable);

        // Assert
        const retrievedRenderable = renderEngine.getRenderable('test-renderable');
        expect(retrievedRenderable).toBe(mockRenderable);
        expect(renderEngine.getRenderables()).toHaveLength(1);
      });

      it('Then it should replace existing renderable with same ID', () => {
        // Arrange
        const renderable1: IRenderable = {
          id: 'same-id',
          visible: true,
          zIndex: 0,
          render: vi.fn(),
          hitTest: vi.fn().mockReturnValue(false),
          getBounds: vi.fn().mockReturnValue({ x: 0, y: 0, width: 50, height: 50 }),
          dispose: vi.fn()
        };
        const renderable2: IRenderable = {
          id: 'same-id',
          visible: true,
          zIndex: 1,
          render: vi.fn(),
          hitTest: vi.fn().mockReturnValue(false),
          getBounds: vi.fn().mockReturnValue({ x: 10, y: 10, width: 100, height: 100 }),
          dispose: vi.fn()
        };

        // Act
        renderEngine.addRenderable(renderable1);
        renderEngine.addRenderable(renderable2);

        // Assert
        const retrieved = renderEngine.getRenderable('same-id');
        expect(retrieved).toBe(renderable2);
        expect(retrieved?.zIndex).toBe(1);
        expect(renderEngine.getRenderables()).toHaveLength(1);
      });
    });

    describe('When removing a renderable', () => {
      it('Then it should remove the renderable by ID', () => {
        // Arrange
        const mockRenderable: IRenderable = {
          id: 'to-remove',
          visible: true,
          zIndex: 0,
          render: vi.fn(),
          hitTest: vi.fn().mockReturnValue(false),
          getBounds: vi.fn().mockReturnValue({ x: 0, y: 0, width: 50, height: 50 }),
          dispose: vi.fn()
        };
        renderEngine.addRenderable(mockRenderable);

        // Act
        renderEngine.removeRenderable('to-remove');

        // Assert
        expect(renderEngine.getRenderable('to-remove')).toBeUndefined();
        expect(renderEngine.getRenderables()).toHaveLength(0);
      });

      it('Then it should handle removing non-existent renderable gracefully', () => {
        // Arrange
        // No renderables added

        // Act & Assert
        expect(() => {
          renderEngine.removeRenderable('non-existent');
        }).not.toThrow();
      });
    });

    describe('When clearing all renderables', () => {
      it('Then it should remove all renderables', () => {
        // Arrange
        const renderable1: IRenderable = {
          id: 'renderable-1',
          visible: true,
          zIndex: 0,
          render: vi.fn(),
          hitTest: vi.fn().mockReturnValue(false),
          getBounds: vi.fn().mockReturnValue({ x: 0, y: 0, width: 50, height: 50 }),
          dispose: vi.fn()
        };
        const renderable2: IRenderable = {
          id: 'renderable-2',
          visible: true,
          zIndex: 1,
          render: vi.fn(),
          hitTest: vi.fn().mockReturnValue(false),
          getBounds: vi.fn().mockReturnValue({ x: 10, y: 10, width: 30, height: 30 }),
          dispose: vi.fn()
        };
        renderEngine.addRenderable(renderable1);
        renderEngine.addRenderable(renderable2);

        // Act
        renderEngine.clearRenderables();

        // Assert
        expect(renderEngine.getRenderables()).toHaveLength(0);
        expect(renderEngine.getRenderable('renderable-1')).toBeUndefined();
        expect(renderEngine.getRenderable('renderable-2')).toBeUndefined();
      });
    });
  });

  describe('Given a RenderEngine lifecycle', () => {
    beforeEach(() => {
      renderEngine = new RenderEngine(canvas);
    });

    describe('When starting the render loop', () => {
      it('Then it should begin rendering', () => {
        // Arrange
        expect(renderEngine.isRunning()).toBe(false);

        // Act
        renderEngine.start();

        // Assert
        expect(renderEngine.isRunning()).toBe(true);
      });
    });

    describe('When stopping the render loop', () => {
      it('Then it should stop rendering', () => {
        // Arrange
        renderEngine.start();
        expect(renderEngine.isRunning()).toBe(true);

        // Act
        renderEngine.stop();

        // Assert
        expect(renderEngine.isRunning()).toBe(false);
      });
    });

    describe('When rendering a frame', () => {
      it('Then it should call renderer render method', () => {
        // Arrange
        const mockRenderable: IRenderable = {
          id: 'test-render',
          visible: true,
          zIndex: 0,
          render: vi.fn(),
          hitTest: vi.fn().mockReturnValue(false),
          getBounds: vi.fn().mockReturnValue({ x: 0, y: 0, width: 50, height: 50 }),
          dispose: vi.fn()
        };
        renderEngine.addRenderable(mockRenderable);

        // Act
        renderEngine.render();

        // Assert
        expect(mockRenderer.render).toHaveBeenCalled();
      });
    });

    describe('When disposing the engine', () => {
      it('Then it should cleanup resources and stop rendering', () => {
        // Arrange
        renderEngine.start();
        expect(renderEngine.isRunning()).toBe(true);

        // Act
        renderEngine.dispose();

        // Assert
        expect(renderEngine.isRunning()).toBe(false);
        expect(mockRenderer.dispose).toHaveBeenCalled();
        expect(renderEngine.getRenderables()).toHaveLength(0);
      });
    });
  });

  describe('Given viewport operations', () => {
    beforeEach(() => {
      renderEngine = new RenderEngine(canvas);
    });

    describe('When setting viewport', () => {
      it('Then it should update viewport dimensions', () => {
        // Arrange
        const newViewport = { x: 10, y: 20, width: 400, height: 300 };

        // Act
        renderEngine.setViewport(newViewport);

        // Assert
        expect(mockRenderer.setViewport).toHaveBeenCalledWith(newViewport);
      });
    });

    describe('When getting viewport', () => {
      it('Then it should return current viewport', () => {
        // Arrange
        const expectedViewport = { x: 0, y: 0, width: 800, height: 600 };

        // Act
        const viewport = renderEngine.getViewport();

        // Assert
        expect(viewport).toEqual(expectedViewport);
      });
    });
  });

  describe('Given renderer information queries', () => {
    beforeEach(() => {
      renderEngine = new RenderEngine(canvas);
    });

    describe('When getting renderer capabilities', () => {
      it('Then it should return renderer capabilities', () => {
        // Arrange
        const mockCapabilities = { maxTextureSize: 4096, supportsBatching: true };
        mockRenderer.getCapabilities.mockReturnValue(mockCapabilities);

        // Act
        const capabilities = renderEngine.getCapabilities();

        // Assert
        expect(capabilities).toEqual(mockCapabilities);
        expect(mockRenderer.getCapabilities).toHaveBeenCalled();
      });
    });

    describe('When getting renderer stats', () => {
      it('Then it should return performance statistics', () => {
        // Arrange
        const mockStats = { drawCalls: 10, triangles: 1000, fps: 60 };
        mockRenderer.getStats.mockReturnValue(mockStats);

        // Act
        const stats = renderEngine.getStats();

        // Assert
        expect(stats).toEqual(mockStats);
        expect(mockRenderer.getStats).toHaveBeenCalled();
      });
    });

    describe('When getting renderer type', () => {
      it('Then it should return the current renderer type', () => {
        // Arrange & Act
        const rendererType = renderEngine.getRendererType();

        // Assert
        expect(typeof rendererType).toBe('string');
        expect(rendererType.length).toBeGreaterThan(0);
      });
    });
  });
});