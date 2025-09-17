/**
 * RenderEngine 单元测试
 * 基于 BDD (Behavior-Driven Development) 和 AAA (Arrange-Act-Assert) 模式
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { CanvasRenderer } from '../renderers/CanvasRenderer';
import { WebGLRenderer } from '../renderers/WebGLRenderer';
import { WebGPURenderer } from '../renderers/WebGPURenderer';
import { RenderEngine } from '../RenderEngine';
import type { IRenderable, RenderEngineConfig } from '../types';

// Mock dependencies
vi.mock('../renderers/CanvasRenderer');
vi.mock('../renderers/WebGLRenderer');
vi.mock('../renderers/WebGPURenderer');

describe('RenderEngine', () => {
  // Test fixtures and setup
  let canvas: HTMLCanvasElement;
  let mockContext: CanvasRenderingContext2D;
  let renderEngine: RenderEngine;
  let mockRenderer: any;

  beforeEach(() => {
    // Reset global mocks
    Object.defineProperty(navigator, 'gpu', {
      value: undefined,
      writable: true,
      configurable: true
    });

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
      if (contextType === 'webgl' || contextType === 'experimental-webgl') {
        return null; // No WebGL support by default
      }
      return mockContext;
    }) as any);

    mockRenderer = {
      initialize: vi.fn().mockResolvedValue(true),
      render: vi.fn(),
      clear: vi.fn(),
      dispose: vi.fn(),
      getCapabilities: vi.fn().mockReturnValue({}),
      getStats: vi.fn().mockReturnValue({}),
      setViewport: vi.fn(),
      getViewport: vi.fn().mockReturnValue({ x: 0, y: 0, width: 800, height: 600, zoom: 1 }),
      addDrawable: vi.fn(),
      removeDrawable: vi.fn(),
      clearDrawables: vi.fn(),
      startRenderLoop: vi.fn(),
      stopRenderLoop: vi.fn(),
      isRunning: vi.fn().mockReturnValue(false)
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
        mockRenderer.isRunning.mockReturnValue(true);
        renderEngine.start();

        // Assert
        expect(renderEngine.isRunning()).toBe(true);
        expect(mockRenderer.startRenderLoop).toHaveBeenCalled();
      });
    });

    describe('When stopping the render loop', () => {
      it('Then it should stop rendering', () => {
        // Arrange
        mockRenderer.isRunning.mockReturnValue(true);
        renderEngine.start();
        expect(renderEngine.isRunning()).toBe(true);

        // Act
        mockRenderer.isRunning.mockReturnValue(false);
        renderEngine.stop();

        // Assert
        expect(renderEngine.isRunning()).toBe(false);
        expect(mockRenderer.stopRenderLoop).toHaveBeenCalled();
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

  // Mock console methods to test debug logging
  const originalConsoleLog = console.log;
  const originalConsoleWarn = console.warn;
  const originalConsoleError = console.error;
  let consoleLogSpy: any;
  let consoleWarnSpy: any;
  let consoleErrorSpy: any;

  beforeEach(() => {
    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleLogSpy.mockRestore();
    consoleWarnSpy.mockRestore();
    consoleErrorSpy.mockRestore();
  });

  describe('Given renderer auto-selection', () => {
    beforeEach(() => {
      // Reset mocks for each test
      vi.clearAllMocks();
    });

    describe('When WebGPU is supported', () => {
      it('Then it should select WebGPU renderer in auto mode', () => {
        // Arrange
        Object.defineProperty(navigator, 'gpu', {
          value: {},
          writable: true,
          configurable: true
        });
        const config: RenderEngineConfig = {
          renderer: 'auto',
          debug: true
        };

        // Act
        renderEngine = new RenderEngine(canvas, config);

        // Assert
        expect(WebGPURenderer).toHaveBeenCalledWith(canvas);
        expect(consoleLogSpy).toHaveBeenCalledWith('[RenderEngine] Auto-selected WebGPU renderer');
      });
    });

    describe('When only WebGL is supported', () => {
      it('Then it should select WebGL renderer in auto mode', () => {
        // Arrange
        Object.defineProperty(navigator, 'gpu', {
          value: undefined,
          writable: true,
          configurable: true
        });
        const mockWebGLContext = {};
        canvas.getContext = vi.fn().mockImplementation((type) => {
          if (type === 'webgl' || type === 'experimental-webgl') {
            return mockWebGLContext;
          }
          if (type === '2d') {
            return mockContext;
          }
          return null;
        });
        const config: RenderEngineConfig = {
          renderer: 'auto',
          debug: true
        };

        // Act
        renderEngine = new RenderEngine(canvas, config);

        // Assert
        expect(WebGLRenderer).toHaveBeenCalled();
        expect(consoleLogSpy).toHaveBeenCalledWith('[RenderEngine] Auto-selected WebGL renderer');
      });
    });

    describe('When neither WebGPU nor WebGL is supported', () => {
      it('Then it should fallback to Canvas2D renderer', () => {
        // Arrange
        Object.defineProperty(navigator, 'gpu', {
          value: undefined,
          writable: true,
          configurable: true
        });
        canvas.getContext = vi.fn().mockImplementation((type) => {
          if (type === 'webgl' || type === 'experimental-webgl' || type === 'webgpu') {
            return null;
          }
          if (type === '2d') {
            return mockContext;
          }
          return null;
        });
        const config: RenderEngineConfig = {
          renderer: 'auto',
          debug: true
        };

        // Act
        renderEngine = new RenderEngine(canvas, config);

        // Assert
        expect(CanvasRenderer).toHaveBeenCalled();
        expect(consoleLogSpy).toHaveBeenCalledWith('[RenderEngine] Auto-selected Canvas2D renderer');
      });
    });
  });

  describe('Given specific renderer types', () => {
    describe('When creating with WebGL renderer', () => {
      it('Then it should create WebGL renderer', () => {
        // Act
        renderEngine = new RenderEngine(canvas, { renderer: 'webgl' });

        // Assert
        expect(WebGLRenderer).toHaveBeenCalled();
        expect(renderEngine.getRendererType()).toBe('webgl');
      });
    });

    describe('When creating with Canvas2D renderer', () => {
      it('Then it should create Canvas2D renderer', () => {
        // Act
        renderEngine = new RenderEngine(canvas, { renderer: 'canvas2d' });

        // Assert
        expect(CanvasRenderer).toHaveBeenCalled();
        expect(renderEngine.getRendererType()).toBe('canvas2d');
      });
    });

    describe('When creating with WebGPU renderer', () => {
      it('Then it should create WebGPU renderer', () => {
        // Act
        renderEngine = new RenderEngine(canvas, { renderer: 'webgpu' });

        // Assert
        expect(WebGPURenderer).toHaveBeenCalledWith(canvas);
        expect(renderEngine.getRendererType()).toBe('webgpu');
      });
    });

    describe('When creating with unknown renderer type', () => {
      it('Then it should throw an error', () => {
        // Act & Assert
        expect(() => {
          new RenderEngine(canvas, { renderer: 'unknown' as any });
        }).toThrow('Unknown renderer type: unknown');
      });
    });
  });

  describe('Given initialization scenarios', () => {
    describe('When renderer initialization fails', () => {
      it('Then it should handle synchronous initialization failure', async () => {
        // Arrange
        mockRenderer.initialize = vi.fn().mockReturnValue(false);
        (CanvasRenderer as any).mockImplementation(() => mockRenderer);

        // Act & Assert
        await expect(async () => {
          renderEngine = new RenderEngine(canvas);
          await new Promise(resolve => setTimeout(resolve, 10)); // Allow async initialization
        }).rejects.toThrow('Renderer initialization failed');
      });

      it('Then it should handle asynchronous initialization failure', async () => {
        // Arrange
        mockRenderer.initialize = vi.fn().mockResolvedValue(false);
        (CanvasRenderer as any).mockImplementation(() => mockRenderer);

        // Act & Assert
        await expect(async () => {
          renderEngine = new RenderEngine(canvas);
          await new Promise(resolve => setTimeout(resolve, 10)); // Allow async initialization
        }).rejects.toThrow('Renderer initialization failed');
      });

      it('Then it should handle initialization exception', async () => {
        // Arrange
        const initError = new Error('Init failed');
        mockRenderer.initialize = vi.fn().mockRejectedValue(initError);
        (CanvasRenderer as any).mockImplementation(() => mockRenderer);

        // Act & Assert
        await expect(async () => {
          renderEngine = new RenderEngine(canvas);
          await new Promise(resolve => setTimeout(resolve, 10)); // Allow async initialization
        }).rejects.toThrow('Init failed');
      });
    });

    describe('When renderer has no initialize method', () => {
      it('Then it should initialize without calling initialize', () => {
        // Arrange
        const rendererWithoutInit = {
          ...mockRenderer,
          initialize: undefined
        };
        (CanvasRenderer as any).mockImplementation(() => rendererWithoutInit);

        // Act
        renderEngine = new RenderEngine(canvas, { debug: true });

        // Assert
        expect(renderEngine).toBeDefined();
        expect(consoleLogSpy).toHaveBeenCalledWith('[RenderEngine] Initialized with canvas2d renderer');
      });
    });

    describe('When calling methods before initialization', () => {
      it('Then it should warn when starting before initialization', () => {
        // Arrange
        const uninitializedEngine = Object.create(RenderEngine.prototype);
        Object.assign(uninitializedEngine, {
          isInitialized: false,
          renderer: mockRenderer,
          config: { debug: false }
        });

        // Act
        uninitializedEngine.start();

        // Assert
        expect(consoleWarnSpy).toHaveBeenCalledWith('[RenderEngine] Engine not initialized, cannot start');
      });

      it('Then it should warn when rendering before initialization', () => {
        // Arrange
        const uninitializedEngine = Object.create(RenderEngine.prototype);
        Object.assign(uninitializedEngine, {
          isInitialized: false,
          renderer: mockRenderer,
          config: { debug: false }
        });

        // Act
        uninitializedEngine.render();

        // Assert
        expect(consoleWarnSpy).toHaveBeenCalledWith('[RenderEngine] Engine not initialized, cannot render');
      });
    });
  });

  describe('Given debug mode', () => {
    beforeEach(() => {
      renderEngine = new RenderEngine(canvas, { debug: true });
    });

    describe('When adding renderable in debug mode', () => {
      it('Then it should log the addition', () => {
        // Arrange
        const mockRenderable: IRenderable = {
          id: 'debug-test',
          visible: true,
          zIndex: 0,
          render: vi.fn(),
          hitTest: vi.fn(),
          getBounds: vi.fn().mockReturnValue({ x: 0, y: 0, width: 50, height: 50 })
        };

        // Act
        renderEngine.addRenderable(mockRenderable);

        // Assert
        expect(consoleLogSpy).toHaveBeenCalledWith('[RenderEngine] Added renderable: debug-test');
      });
    });

    describe('When removing renderable in debug mode', () => {
      it('Then it should log the removal', () => {
        // Arrange
        const mockRenderable: IRenderable = {
          id: 'debug-remove',
          visible: true,
          zIndex: 0,
          render: vi.fn(),
          hitTest: vi.fn(),
          getBounds: vi.fn().mockReturnValue({ x: 0, y: 0, width: 50, height: 50 })
        };
        renderEngine.addRenderable(mockRenderable);
        consoleLogSpy.mockClear();

        // Act
        renderEngine.removeRenderable('debug-remove');

        // Assert
        expect(consoleLogSpy).toHaveBeenCalledWith('[RenderEngine] Removed renderable: debug-remove');
      });
    });

    describe('When clearing renderables in debug mode', () => {
      it('Then it should log the count of cleared renderables', () => {
        // Arrange
        const renderable1: IRenderable = {
          id: 'clear-1',
          visible: true,
          zIndex: 0,
          render: vi.fn(),
          hitTest: vi.fn(),
          getBounds: vi.fn().mockReturnValue({ x: 0, y: 0, width: 50, height: 50 })
        };
        const renderable2: IRenderable = {
          id: 'clear-2',
          visible: true,
          zIndex: 0,
          render: vi.fn(),
          hitTest: vi.fn(),
          getBounds: vi.fn().mockReturnValue({ x: 0, y: 0, width: 50, height: 50 })
        };
        renderEngine.addRenderable(renderable1);
        renderEngine.addRenderable(renderable2);
        consoleLogSpy.mockClear();

        // Act
        renderEngine.clearRenderables();

        // Assert
        expect(consoleLogSpy).toHaveBeenCalledWith('[RenderEngine] Cleared 2 renderables');
      });
    });

    describe('When starting render loop in debug mode', () => {
      it('Then it should log the start', () => {
        // Act
        renderEngine.start();

        // Assert
        expect(consoleLogSpy).toHaveBeenCalledWith('[RenderEngine] Render loop started');
      });
    });

    describe('When stopping render loop in debug mode', () => {
      it('Then it should log the stop', () => {
        // Act
        renderEngine.stop();

        // Assert
        expect(consoleLogSpy).toHaveBeenCalledWith('[RenderEngine] Render loop stopped');
      });
    });

    describe('When disposing in debug mode', () => {
      it('Then it should log the disposal', () => {
        // Act
        renderEngine.dispose();

        // Assert
        expect(consoleLogSpy).toHaveBeenCalledWith('[RenderEngine] Disposed');
      });
    });
  });
});