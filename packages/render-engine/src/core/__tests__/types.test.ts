/**
 * Engine types 单元测试
 * 测试渲染引擎相关类型定义和接口
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import type {
  RenderEngineType,
  RenderEngineConfig,
  RenderEngineCapabilities,
  IRenderable,
  IViewport,
  IRenderStats
} from '../types';
import { IGraphicsContext, IPoint, IRect } from '../interface/IGraphicsContext';

describe('Engine Types', () => {
  describe('RenderEngineType', () => {
    it('should support all renderer types', () => {
      const types: RenderEngineType[] = ['webgl', 'canvas2d', 'webgpu'];
      expect(types).toHaveLength(3);
      expect(types).toContain('webgl');
      expect(types).toContain('canvas2d');
      expect(types).toContain('webgpu');
      expect(types).toContain('webgpu');
    });
  });

  describe('RenderEngineConfig', () => {
    it('should have all optional properties', () => {
      const config: RenderEngineConfig = {};
      expect(config).toBeDefined();
    });

    it('should support all configuration options', () => {
      const config: RenderEngineConfig = {
        renderer: 'webgl',
        debug: true,
        enableBatching: false,
        targetFPS: 120,
        antialias: true,
        alpha: false,
        premultipliedAlpha: true,
        preserveDrawingBuffer: false,
        colorSpace: 'display-p3'
      };

      expect(config.renderer).toBe('webgl');
      expect(config.debug).toBe(true);
      expect(config.enableBatching).toBe(false);
      expect(config.targetFPS).toBe(120);
      expect(config.antialias).toBe(true);
      expect(config.alpha).toBe(false);
      expect(config.premultipliedAlpha).toBe(true);
      expect(config.preserveDrawingBuffer).toBe(false);
      expect(config.colorSpace).toBe('display-p3');
    });

    it('should support srgb color space', () => {
      const config: RenderEngineConfig = {
        colorSpace: 'srgb'
      };
      expect(config.colorSpace).toBe('srgb');
    });

    it('should allow undefined values for all properties', () => {
      const config: RenderEngineConfig = {
        renderer: undefined,
        debug: undefined,
        enableBatching: undefined,
        targetFPS: undefined,
        antialias: undefined,
        alpha: undefined,
        premultipliedAlpha: undefined,
        preserveDrawingBuffer: undefined,
        colorSpace: undefined
      };
      expect(config).toBeDefined();
    });
  });

  describe('RenderEngineCapabilities', () => {
    it('should define all required properties', () => {
      const capabilities: RenderEngineCapabilities = {
        supportsHardwareAcceleration: true,
        supportsTransforms: true,
        supportsFilters: false,
        supportsBlending: true,
        maxTextureSize: 4096,
        supportedFormats: ['rgba', 'rgb']
      };

      expect(capabilities.supportsHardwareAcceleration).toBe(true);
      expect(capabilities.supportsTransforms).toBe(true);
      expect(capabilities.supportsFilters).toBe(false);
      expect(capabilities.supportsBlending).toBe(true);
      expect(capabilities.maxTextureSize).toBe(4096);
      expect(capabilities.supportedFormats).toEqual(['rgba', 'rgb']);
    });

    it('should support minimal capabilities', () => {
      const capabilities: RenderEngineCapabilities = {
        supportsHardwareAcceleration: false,
        supportsTransforms: false,
        supportsFilters: false,
        supportsBlending: false,
        maxTextureSize: 256,
        supportedFormats: []
      };

      expect(capabilities.supportsHardwareAcceleration).toBe(false);
      expect(capabilities.supportsTransforms).toBe(false);
      expect(capabilities.supportsFilters).toBe(false);
      expect(capabilities.supportsBlending).toBe(false);
      expect(capabilities.maxTextureSize).toBe(256);
      expect(capabilities.supportedFormats).toEqual([]);
    });

    it('should support multiple supported formats', () => {
      const capabilities: RenderEngineCapabilities = {
        supportsHardwareAcceleration: true,
        supportsTransforms: true,
        supportsFilters: true,
        supportsBlending: true,
        maxTextureSize: 8192,
        supportedFormats: ['rgba', 'rgb', 'luminance', 'alpha', 'depth', 'stencil']
      };

      expect(capabilities.supportedFormats).toHaveLength(6);
      expect(capabilities.supportedFormats).toContain('rgba');
      expect(capabilities.supportedFormats).toContain('depth');
      expect(capabilities.supportedFormats).toContain('stencil');
    });
  });

  describe('IRenderable', () => {
    let mockContext: IGraphicsContext;
    let mockRenderable: IRenderable;

    beforeEach(() => {
      mockContext = {
        save: vi.fn(),
        restore: vi.fn(),
        clearRect: vi.fn(),
        fillRect: vi.fn(),
        strokeRect: vi.fn(),
        beginPath: vi.fn(),
        moveTo: vi.fn(),
        lineTo: vi.fn(),
        closePath: vi.fn(),
        fill: vi.fn(),
        stroke: vi.fn(),
        arc: vi.fn(),
        setTransform: vi.fn(),
        scale: vi.fn(),
        rotate: vi.fn(),
        translate: vi.fn(),
        drawImage: vi.fn(),
        createImageData: vi.fn(),
        getImageData: vi.fn(),
        putImageData: vi.fn(),
        fillText: vi.fn(),
        strokeText: vi.fn(),
        measureText: vi.fn()
      } as unknown as IGraphicsContext;

      mockRenderable = {
        id: 'test-renderable',
        type: 'mock',
        visible: true,
        zIndex: 5,
        render: vi.fn(),
        hitTest: vi.fn().mockReturnValue(true),
        getBounds: vi.fn().mockReturnValue({ x: 10, y: 20, width: 100, height: 200 }),
        dispose: vi.fn()
      };
    });

    it('should have all required readonly properties', () => {
      expect(mockRenderable.id).toBe('test-renderable');
      expect(mockRenderable.visible).toBe(true);
      expect(mockRenderable.zIndex).toBe(5);
    });

    it('should implement render method', () => {
      mockRenderable.render(mockContext);
      expect(mockRenderable.render).toHaveBeenCalledWith(mockContext);
    });

    it('should implement hitTest method', () => {
      const point: IPoint = { x: 50, y: 100 };
      const result = mockRenderable.hitTest(point);
      expect(mockRenderable.hitTest).toHaveBeenCalledWith(point);
      expect(result).toBe(true);
    });

    it('should implement getBounds method', () => {
      const bounds = mockRenderable.getBounds();
      expect(mockRenderable.getBounds).toHaveBeenCalled();
      expect(bounds).toEqual({ x: 10, y: 20, width: 100, height: 200 });
    });

    it('should implement optional dispose method', () => {
      mockRenderable.dispose!();
      expect(mockRenderable.dispose).toHaveBeenCalled();
    });

    it('should work without optional dispose method', () => {
      const minimalRenderable: IRenderable = {
        id: 'minimal',
        type: 'mock',
        visible: false,
        zIndex: 0,
        render: vi.fn(),
        hitTest: vi.fn().mockReturnValue(false),
        getBounds: vi.fn().mockReturnValue({ x: 0, y: 0, width: 0, height: 0 })
      };

      expect(minimalRenderable.dispose).toBeUndefined();
      expect(minimalRenderable.id).toBe('minimal');
      expect(minimalRenderable.visible).toBe(false);
      expect(minimalRenderable.zIndex).toBe(0);
    });

    it('should handle negative zIndex values', () => {
      const negativeZRenderable: IRenderable = {
        id: 'negative-z',
        type: 'mock',
        visible: true,
        zIndex: -10,
        render: vi.fn(),
        hitTest: vi.fn().mockReturnValue(false),
        getBounds: vi.fn().mockReturnValue({ x: 0, y: 0, width: 50, height: 50 })
      };

      expect(negativeZRenderable.zIndex).toBe(-10);
    });

    it('should handle edge cases in hitTest', () => {
      const edgePoints: IPoint[] = [
        { x: 0, y: 0 },
        { x: -100, y: -100 },
        { x: Infinity, y: Infinity },
        { x: NaN, y: NaN }
      ];

      edgePoints.forEach(point => {
        mockRenderable.hitTest(point);
        expect(mockRenderable.hitTest).toHaveBeenCalledWith(point);
      });
    });

    it('should handle edge cases in getBounds', () => {
      const emptyBounds: IRect = { x: 0, y: 0, width: 0, height: 0 };
      const largeBounds: IRect = { x: -1000, y: -1000, width: 2000, height: 2000 };

      const emptyRenderable: IRenderable = {
        id: 'empty',
        type: 'mock',
        visible: true,
        zIndex: 0,
        render: vi.fn(),
        hitTest: vi.fn(),
        getBounds: vi.fn().mockReturnValue(emptyBounds)
      };

      const largeRenderable: IRenderable = {
        id: 'large',
        type: 'mock',
        visible: true,
        zIndex: 0,
        render: vi.fn(),
        hitTest: vi.fn(),
        getBounds: vi.fn().mockReturnValue(largeBounds)
      };

      expect(emptyRenderable.getBounds()).toEqual(emptyBounds);
      expect(largeRenderable.getBounds()).toEqual(largeBounds);
    });
  });

  describe('IViewport', () => {
    it('should define all required properties', () => {
      const viewport: IViewport = {
        x: 100,
        y: 200,
        width: 800,
        height: 600,
        zoom: 1.5
      };

      expect(viewport.x).toBe(100);
      expect(viewport.y).toBe(200);
      expect(viewport.width).toBe(800);
      expect(viewport.height).toBe(600);
      expect(viewport.zoom).toBe(1.5);
    });

    it('should support negative offsets', () => {
      const viewport: IViewport = {
        x: -50,
        y: -100,
        width: 800,
        height: 600,
        zoom: 1.0
      };

      expect(viewport.x).toBe(-50);
      expect(viewport.y).toBe(-100);
    });

    it('should support fractional zoom values', () => {
      const viewport: IViewport = {
        x: 0,
        y: 0,
        width: 800,
        height: 600,
        zoom: 0.5
      };

      expect(viewport.zoom).toBe(0.5);
    });

    it('should support large zoom values', () => {
      const viewport: IViewport = {
        x: 0,
        y: 0,
        width: 800,
        height: 600,
        zoom: 10.0
      };

      expect(viewport.zoom).toBe(10.0);
    });

    it('should handle zero dimensions', () => {
      const viewport: IViewport = {
        x: 0,
        y: 0,
        width: 0,
        height: 0,
        zoom: 1.0
      };

      expect(viewport.width).toBe(0);
      expect(viewport.height).toBe(0);
    });

    it('should handle extreme values', () => {
      const viewport: IViewport = {
        x: Number.MAX_SAFE_INTEGER,
        y: Number.MIN_SAFE_INTEGER,
        width: Number.MAX_SAFE_INTEGER,
        height: Number.MAX_SAFE_INTEGER,
        zoom: Number.MAX_VALUE
      };

      expect(viewport.x).toBe(Number.MAX_SAFE_INTEGER);
      expect(viewport.y).toBe(Number.MIN_SAFE_INTEGER);
      expect(viewport.width).toBe(Number.MAX_SAFE_INTEGER);
      expect(viewport.height).toBe(Number.MAX_SAFE_INTEGER);
      expect(viewport.zoom).toBe(Number.MAX_VALUE);
    });
  });

  describe('IRenderStats', () => {
    it('should define all required properties', () => {
      const stats: IRenderStats = {
        frameCount: 1000,
        fps: 60,
        renderTime: 16.67,
        objectsRendered: 50
      };

      expect(stats.frameCount).toBe(1000);
      expect(stats.fps).toBe(60);
      expect(stats.renderTime).toBe(16.67);
      expect(stats.objectsRendered).toBe(50);
    });

    it('should support zero values', () => {
      const stats: IRenderStats = {
        frameCount: 0,
        fps: 0,
        renderTime: 0,
        objectsRendered: 0
      };

      expect(stats.frameCount).toBe(0);
      expect(stats.fps).toBe(0);
      expect(stats.renderTime).toBe(0);
      expect(stats.objectsRendered).toBe(0);
    });

    it('should support high frame counts', () => {
      const stats: IRenderStats = {
        frameCount: 1000000,
        fps: 144,
        renderTime: 6.94,
        objectsRendered: 10000
      };

      expect(stats.frameCount).toBe(1000000);
      expect(stats.fps).toBe(144);
      expect(stats.renderTime).toBe(6.94);
      expect(stats.objectsRendered).toBe(10000);
    });

    it('should support fractional values', () => {
      const stats: IRenderStats = {
        frameCount: 500,
        fps: 59.97,
        renderTime: 16.68333,
        objectsRendered: 25
      };

      expect(stats.fps).toBe(59.97);
      expect(stats.renderTime).toBe(16.68333);
    });

    it('should handle performance edge cases', () => {
      const lowPerformanceStats: IRenderStats = {
        frameCount: 30,
        fps: 1,
        renderTime: 1000,
        objectsRendered: 1
      };

      const highPerformanceStats: IRenderStats = {
        frameCount: 10800,
        fps: 240,
        renderTime: 4.16,
        objectsRendered: 100000
      };

      expect(lowPerformanceStats.fps).toBe(1);
      expect(lowPerformanceStats.renderTime).toBe(1000);
      expect(highPerformanceStats.fps).toBe(240);
      expect(highPerformanceStats.renderTime).toBe(4.16);
    });

    it('should handle negative values gracefully', () => {
      // 虽然实际使用中不应该出现负值，但类型系统应该允许
      const negativeStats: IRenderStats = {
        frameCount: -1,
        fps: -1,
        renderTime: -1,
        objectsRendered: -1
      };

      expect(negativeStats.frameCount).toBe(-1);
      expect(negativeStats.fps).toBe(-1);
      expect(negativeStats.renderTime).toBe(-1);
      expect(negativeStats.objectsRendered).toBe(-1);
    });
  });

  describe('Type interactions and combinations', () => {
    it('should work with all renderer types in config', () => {
      const configs: RenderEngineConfig[] = [
        { renderer: 'webgl' },
        { renderer: 'canvas2d' },
        { renderer: 'webgpu' },
        { renderer: 'webgl' }
      ];

      configs.forEach(config => {
        expect(['webgl', 'canvas2d', 'webgpu']).toContain(config.renderer);
      });
    });

    it('should support complex configuration combinations', () => {
      const complexConfig: RenderEngineConfig = {
        renderer: 'webgl',
        debug: true,
        enableBatching: true,
        targetFPS: 144,
        antialias: true,
        alpha: true,
        premultipliedAlpha: false,
        preserveDrawingBuffer: true,
        colorSpace: 'display-p3'
      };

      expect(complexConfig).toBeDefined();
      expect(typeof complexConfig.renderer).toBe('string');
      expect(typeof complexConfig.debug).toBe('boolean');
      expect(typeof complexConfig.enableBatching).toBe('boolean');
      expect(typeof complexConfig.targetFPS).toBe('number');
      expect(typeof complexConfig.antialias).toBe('boolean');
      expect(typeof complexConfig.alpha).toBe('boolean');
      expect(typeof complexConfig.premultipliedAlpha).toBe('boolean');
      expect(typeof complexConfig.preserveDrawingBuffer).toBe('boolean');
      expect(typeof complexConfig.colorSpace).toBe('string');
    });

    it('should validate viewport bounds consistency', () => {
      const viewport: IViewport = {
        x: 0,
        y: 0,
        width: 1920,
        height: 1080,
        zoom: 1.0
      };

      // 模拟视口边界计算
      const actualWidth = viewport.width * viewport.zoom;
      const actualHeight = viewport.height * viewport.zoom;

      expect(actualWidth).toBe(1920);
      expect(actualHeight).toBe(1080);
    });

    it('should handle renderable visibility states', () => {
      const visibleRenderable: IRenderable = {
        id: 'visible',
        type: 'mock',
        visible: true,
        zIndex: 0,
        render: vi.fn(),
        hitTest: vi.fn(),
        getBounds: vi.fn().mockReturnValue({ x: 0, y: 0, width: 100, height: 100 })
      };

      const hiddenRenderable: IRenderable = {
        id: 'hidden',
        type: 'mock',
        visible: false,
        zIndex: 0,
        render: vi.fn(),
        hitTest: vi.fn(),
        getBounds: vi.fn().mockReturnValue({ x: 0, y: 0, width: 100, height: 100 })
      };

      expect(visibleRenderable.visible).toBe(true);
      expect(hiddenRenderable.visible).toBe(false);
    });

    it('should support stats performance calculations', () => {
      const stats: IRenderStats = {
        frameCount: 3600,
        fps: 60,
        renderTime: 16.67,
        objectsRendered: 100
      };

      // 计算总运行时间（秒）
      const totalTime = stats.frameCount / stats.fps;
      expect(totalTime).toBe(60); // 60秒

      // 计算平均每对象渲染时间
      const timePerObject = stats.renderTime / stats.objectsRendered;
      expect(timePerObject).toBeCloseTo(0.1667, 4);
    });
  });
});