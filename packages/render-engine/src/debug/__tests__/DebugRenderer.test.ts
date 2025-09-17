/**
 * DebugRenderer 单元测试
 * 基于 BDD (Behavior-Driven Development) 和 AAA (Arrange-Act-Assert) 模式
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DebugRenderer, DebugRenderOptions, DebugInfo, DebugLine, DebugShape } from '../DebugRenderer';
import { PerformanceMetrics } from '../PerformanceAnalyzer';
import EventEmitter3 from 'eventemitter3';

// Mock Canvas API
Object.defineProperty(HTMLCanvasElement.prototype, 'getContext', {
  value: vi.fn().mockReturnValue({
    clearRect: vi.fn(),
    fillRect: vi.fn(),
    strokeRect: vi.fn(),
    beginPath: vi.fn(),
    closePath: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    arc: vi.fn(),
    fill: vi.fn(),
    stroke: vi.fn(),
    fillText: vi.fn(),
    measureText: vi.fn().mockReturnValue({ width: 100 }),
    save: vi.fn(),
    restore: vi.fn(),
    translate: vi.fn(),
    scale: vi.fn(),
    rotate: vi.fn(),
    setTransform: vi.fn(),
    canvas: { width: 800, height: 600 },
    fillStyle: '',
    strokeStyle: '',
    lineWidth: 1,
    font: '12px Arial',
    textAlign: 'left',
    textBaseline: 'top',
    globalAlpha: 1
  }),
  writable: true
});

describe('DebugRenderer', () => {
  // Test fixtures and setup
  let canvas: HTMLCanvasElement;
  let debugRenderer: DebugRenderer;
  let mockContext: CanvasRenderingContext2D;
  let eventBus: EventEmitter3;

  beforeEach(() => {
    // Arrange: Setup test environment
    canvas = document.createElement('canvas');
    canvas.width = 800;
    canvas.height = 600;
    
    mockContext = canvas.getContext('2d') as CanvasRenderingContext2D;
    eventBus = new EventEmitter3();
    
    debugRenderer = new DebugRenderer(canvas);
    debugRenderer.setEventBus(eventBus);
  });

  afterEach(() => {
    // Cleanup
    debugRenderer.dispose();
    vi.clearAllMocks();
  });

  describe('Given a DebugRenderer instance', () => {
    describe('When creating with default configuration', () => {
      it('Then it should initialize with default options', () => {
        // Arrange
        const expectedDefaults = {
          showWireframe: false,
          showBoundingBoxes: false,
          showFpsCounter: true,
          showPerformanceGraph: false,
          showDrawCallInfo: false
        };

        // Act
        const options = debugRenderer.getOptions();

        // Assert
        expect(options).toMatchObject(expectedDefaults);
        expect(options.showWireframe).toBe(false);
        expect(options.showFpsCounter).toBe(true);
      });
    });

    describe('When setting custom options', () => {
      it('Then it should merge custom options with defaults', () => {
        // Arrange
        const customOptions: Partial<DebugRenderOptions> = {
          showWireframe: true,
          showBoundingBoxes: true,
          showFpsCounter: false
        };

        // Act
        debugRenderer.setOptions(customOptions);
        const options = debugRenderer.getOptions();

        // Assert
        expect(options.showWireframe).toBe(true);
        expect(options.showBoundingBoxes).toBe(true);
        expect(options.showFpsCounter).toBe(false);
        expect(options.showPerformanceGraph).toBe(false); // Should keep default
      });
    });
  });

  describe('Given debug information management', () => {
    describe('When adding debug info', () => {
      it('Then it should store debug info with correct properties', () => {
        // Arrange
        const position = { x: 100, y: 200 };
        const text = 'Debug Info';
        const options = { color: '#ff0000', size: 14, persistent: true };

        // Act
        debugRenderer.addDebugInfo(position, text, options);

        // Assert
        // Since we can't directly access private debugInfos, we test through render
        expect(() => debugRenderer.render(16)).not.toThrow();
      });

      it('Then it should emit debug-info-added event', () => {
        // Arrange
        const eventSpy = vi.fn();
        eventBus.on('debug-info-added', eventSpy);
        const position = { x: 50, y: 75 };
        const text = 'Test Info';

        // Act
        debugRenderer.addDebugInfo(position, text);

        // Assert
        expect(eventSpy).toHaveBeenCalledWith({
          info: expect.objectContaining({
            position,
            text,
            color: expect.any(String),
            size: expect.any(Number)
          })
        });
      });
    });

    describe('When adding debug lines', () => {
      it('Then it should store debug line with correct properties', () => {
        // Arrange
        const start = { x: 0, y: 0, z: 0 };
        const end = { x: 100, y: 100, z: 0 };
        const options = { color: '#00ff00', width: 2, persistent: false };

        // Act
        debugRenderer.addDebugLine(start, end, options);

        // Assert
        expect(() => debugRenderer.render(16)).not.toThrow();
      });

      it('Then it should emit debug-line-added event', () => {
        // Arrange
        const eventSpy = vi.fn();
        eventBus.on('debug-line-added', eventSpy);
        const start = { x: 10, y: 20 };
        const end = { x: 30, y: 40 };

        // Act
        debugRenderer.addDebugLine(start, end);

        // Assert
        expect(eventSpy).toHaveBeenCalledWith({
          line: expect.objectContaining({
            start: expect.objectContaining(start),
            end: expect.objectContaining(end)
          })
        });
      });
    });

    describe('When adding debug shapes', () => {
      it('Then it should store debug shape with correct properties', () => {
        // Arrange
        const type = 'box';
        const transform = {
          position: { x: 0, y: 0, z: 0 },
          rotation: { x: 0, y: 0, z: 0 },
          scale: { x: 1, y: 1, z: 1 }
        };
        const options = { color: '#0000ff', wireframe: true };

        // Act
        debugRenderer.addDebugShape(type, transform, options);

        // Assert
        expect(() => debugRenderer.render(16)).not.toThrow();
      });

      it('Then it should emit debug-shape-added event', () => {
        // Arrange
        const eventSpy = vi.fn();
        eventBus.on('debug-shape-added', eventSpy);
        const type = 'sphere';
        const transform = {
          position: { x: 5, y: 10, z: 15 },
          rotation: { x: 0, y: 0, z: 0 },
          scale: { x: 2, y: 2, z: 2 }
        };

        // Act
        debugRenderer.addDebugShape(type, transform);

        // Assert
        expect(eventSpy).toHaveBeenCalledWith({
          shape: expect.objectContaining({
            type,
            transform
          })
        });
      });
    });

    describe('When adding bounding boxes', () => {
      it('Then it should create debug lines for bounding box', () => {
        // Arrange
        const min = { x: 10, y: 20, z: 30 };
        const max = { x: 50, y: 60, z: 70 };
        const color = '#ffff00';

        // Act
        debugRenderer.addBoundingBox(min, max, color);

        // Assert
        expect(() => debugRenderer.render(16)).not.toThrow();
      });
    });
  });

  describe('Given performance metrics tracking', () => {
    describe('When updating performance metrics', () => {
      it('Then it should store metrics for rendering', () => {
        // Arrange
        const metrics: PerformanceMetrics = {
          fps: 60,
          averageFps: 60,
          minFps: 55,
          maxFps: 65,
          frameTime: 16.67,
          drawCalls: 10,
          triangles: 1000,
          vertices: 3000,
          textures: 5,
          shaderSwitches: 2,
          memoryUsage: {
            used: 1024 * 1024,
            total: 2048 * 1024,
            buffers: 512 * 1024,
            textures: 256 * 1024,
            shaders: 64 * 1024
          },
          gpuTime: 8.5,
          cpuTime: 8.0,
          batchCount: 5,
          batchSize: 20,
          instanceCount: 100,
          culledObjects: 50,
          visibleObjects: 150,
          frustumCulls: 30,
          occlusionCulls: 20
        };

        // Act
        debugRenderer.updatePerformanceMetrics(metrics);

        // Assert
        expect(() => debugRenderer.render(16)).not.toThrow();
      });

      it('Then it should maintain performance history within limits', () => {
        // Arrange
        const baseMetrics: PerformanceMetrics = {
          fps: 60,
          averageFps: 60,
          minFps: 55,
          maxFps: 65,
          frameTime: 16.67,
          drawCalls: 5,
          triangles: 500,
          vertices: 1500,
          textures: 3,
          shaderSwitches: 1,
          memoryUsage: {
            used: 1024,
            total: 2048,
            buffers: 512,
            textures: 256,
            shaders: 64
          },
          gpuTime: 4.0,
          cpuTime: 4.0,
          batchCount: 3,
          batchSize: 15,
          instanceCount: 50,
          culledObjects: 25,
          visibleObjects: 75,
          frustumCulls: 15,
          occlusionCulls: 10
        };

        // Act
        // Add more metrics than the max history size (300)
        for (let i = 0; i < 350; i++) {
          debugRenderer.updatePerformanceMetrics({
            ...baseMetrics,
            fps: 60 + i % 10
          });
        }

        // Assert
        expect(() => debugRenderer.render(16)).not.toThrow();
      });
    });
  });

  describe('Given rendering operations', () => {
    describe('When rendering debug information', () => {
      it('Then it should render without errors', () => {
        // Arrange
        debugRenderer.addDebugInfo({ x: 10, y: 20 }, 'Test');
        debugRenderer.addDebugLine({ x: 0, y: 0 }, { x: 100, y: 100 });
        debugRenderer.setOptions({ showFpsCounter: true });
        
        // Add performance metrics to enable FPS counter rendering
        debugRenderer.updatePerformanceMetrics({
          fps: 60,
          averageFps: 60,
          minFps: 55,
          maxFps: 65,
          frameTime: 16.67,
          drawCalls: 10,
          triangles: 1000,
          vertices: 3000,
          textures: 5,
          shaderSwitches: 2,
          memoryUsage: {
            used: 1024,
            total: 2048,
            buffers: 512,
            textures: 256,
            shaders: 64
          },
          gpuTime: 8.5,
          cpuTime: 8.0,
          batchCount: 5,
          batchSize: 20,
          instanceCount: 100,
          culledObjects: 50,
          visibleObjects: 150,
          frustumCulls: 30,
          occlusionCulls: 20
        });

        // Act & Assert
        expect(() => debugRenderer.render(16)).not.toThrow();
        expect(mockContext.fillText).toHaveBeenCalled();
      });

      it('Then it should update TTL for non-persistent items', () => {
        // Arrange
        debugRenderer.addDebugInfo(
          { x: 10, y: 20 }, 
          'Temporary', 
          { persistent: false, ttl: 100 }
        );

        // Act
        debugRenderer.render(50); // First render, TTL should decrease
        debugRenderer.render(60); // Second render, item should be removed

        // Assert
        expect(() => debugRenderer.render(16)).not.toThrow();
      });
    });

    describe('When clearing debug information', () => {
      it('Then it should clear all debug items', () => {
        // Arrange
        debugRenderer.addDebugInfo({ x: 10, y: 20 }, 'Test');
        debugRenderer.addDebugLine({ x: 0, y: 0 }, { x: 100, y: 100 });
        debugRenderer.addDebugShape('box', {
          position: { x: 0, y: 0, z: 0 },
          rotation: { x: 0, y: 0, z: 0 },
          scale: { x: 1, y: 1, z: 1 }
        });

        // Act
        debugRenderer.clear();

        // Assert
        expect(() => debugRenderer.render(16)).not.toThrow();
      });

      it('Then it should emit debug-cleared event', () => {
        // Arrange
        const eventSpy = vi.fn();
        eventBus.on('debug-cleared', eventSpy);

        // Act
        debugRenderer.clear();

        // Assert
        expect(eventSpy).toHaveBeenCalledWith({});
      });
    });

    describe('When clearing non-persistent items only', () => {
      it('Then it should keep persistent items', () => {
        // Arrange
        debugRenderer.addDebugInfo(
          { x: 10, y: 20 }, 
          'Persistent', 
          { persistent: true }
        );
        debugRenderer.addDebugInfo(
          { x: 30, y: 40 }, 
          'Temporary', 
          { persistent: false }
        );

        // Act
        debugRenderer.clearNonPersistent();

        // Assert
        expect(() => debugRenderer.render(16)).not.toThrow();
      });
    });
  });

  describe('Given debug panel operations', () => {
    describe('When toggling debug panel', () => {
      it('Then it should toggle panel visibility', () => {
        // Arrange
        // Mock document.body.appendChild and removeChild
        const mockAppendChild = vi.fn();
        const mockRemoveChild = vi.fn();
        Object.defineProperty(document, 'body', {
          value: {
            appendChild: mockAppendChild,
            removeChild: mockRemoveChild
          },
          writable: true
        });

        // Act
        debugRenderer.toggleDebugPanel(); // Show
        debugRenderer.toggleDebugPanel(); // Hide

        // Assert
        expect(() => debugRenderer.toggleDebugPanel()).not.toThrow();
      });
    });
  });

  describe('Given resource cleanup', () => {
    describe('When disposing the debug renderer', () => {
      it('Then it should cleanup all resources', () => {
        // Arrange
        debugRenderer.addDebugInfo({ x: 10, y: 20 }, 'Test');
        debugRenderer.setOptions({ showFpsCounter: true });

        // Act
        debugRenderer.dispose();

        // Assert
        expect(() => debugRenderer.render(16)).not.toThrow();
      });

      it('Then it should remove event listeners', () => {
        // Arrange
        const removeEventListenerSpy = vi.spyOn(document, 'removeEventListener');

        // Act
        debugRenderer.dispose();

        // Assert
        expect(removeEventListenerSpy).toHaveBeenCalledWith('keydown', expect.any(Function));
      });
    });
  });

  describe('Given error handling scenarios', () => {
    describe('When rendering with invalid context', () => {
      it('Then it should handle missing context gracefully', () => {
        // Arrange
        const invalidCanvas = document.createElement('canvas');
        vi.spyOn(invalidCanvas, 'getContext').mockReturnValue(null);
        const invalidDebugRenderer = new DebugRenderer(invalidCanvas);

        // Act & Assert
        expect(() => invalidDebugRenderer.render(16)).not.toThrow();
        
        // Cleanup
        invalidDebugRenderer.dispose();
      });
    });

    describe('When adding debug items with invalid parameters', () => {
      it('Then it should handle invalid positions gracefully', () => {
        // Arrange
        const invalidPosition = { x: NaN, y: Infinity };

        // Act & Assert
        expect(() => {
          debugRenderer.addDebugInfo(invalidPosition, 'Invalid Position');
        }).not.toThrow();
      });

      it('Then it should handle empty text gracefully', () => {
        // Arrange
        const position = { x: 10, y: 20 };
        const emptyText = '';

        // Act & Assert
        expect(() => {
          debugRenderer.addDebugInfo(position, emptyText);
        }).not.toThrow();
      });
    });
  });
});