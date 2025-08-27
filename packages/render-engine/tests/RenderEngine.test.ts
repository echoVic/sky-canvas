/**
 * 渲染引擎核心测试
 */
import { describe, test, expect, beforeEach, vi } from 'vitest';
import { RenderEngine } from '../src/core/RenderEngine';
import { IGraphicsContext, IGraphicsContextFactory, IPoint, IRect } from '../src/core/IGraphicsContext';

describe('RenderEngine', () => {
  let engine: RenderEngine;
  let mockContext: IGraphicsContext;
  let mockFactory: IGraphicsContextFactory<HTMLCanvasElement>;
  let mockCanvas: HTMLCanvasElement;

  beforeEach(() => {
    mockCanvas = document.createElement('canvas');
    mockCanvas.width = 800;
    mockCanvas.height = 600;

    mockContext = {
      width: 800,
      height: 600,
      clear: vi.fn(),
      save: vi.fn(),
      restore: vi.fn(),
      translate: vi.fn(),
      rotate: vi.fn(),
      scale: vi.fn(),
      setOpacity: vi.fn(),
      drawRect: vi.fn(),
      drawCircle: vi.fn(),
      drawLine: vi.fn(),
      drawImage: vi.fn(),
      setStrokeStyle: vi.fn(),
      setFillStyle: vi.fn(),
      setLineWidth: vi.fn(),
      setLineDash: vi.fn(),
      screenToWorld: vi.fn(),
      worldToScreen: vi.fn(),
      dispose: vi.fn()
    };

    mockFactory = {
      isSupported: vi.fn().mockReturnValue(true),
      createContext: vi.fn().mockResolvedValue(mockContext)
    };

    engine = new RenderEngine();
  });

  describe('初始化测试', () => {
    test('应该能成功创建渲染引擎实例', () => {
      expect(engine).toBeDefined();
      expect(engine).toBeInstanceOf(RenderEngine);
    });

    test('应该能初始化图形上下文', async () => {
      await engine.initialize(mockFactory, mockCanvas);
      
      expect(mockFactory.isSupported).toHaveBeenCalled();
      expect(mockFactory.createContext).toHaveBeenCalledWith(mockCanvas);
      expect(engine.getContext()).toBe(mockContext);
    });

    test('当图形上下文不支持时应该抛出错误', async () => {
      vi.mocked(mockFactory.isSupported).mockReturnValue(false);
      
      await expect(engine.initialize(mockFactory, mockCanvas))
        .rejects.toThrow('Graphics context not supported');
    });

    test('重复初始化应该抛出错误', async () => {
      await engine.initialize(mockFactory, mockCanvas);
      
      await expect(engine.initialize(mockFactory, mockCanvas))
        .rejects.toThrow('Render engine already initialized');
    });
  });

  describe('渲染循环测试', () => {
    beforeEach(async () => {
      await engine.initialize(mockFactory, mockCanvas);
    });

    test('应该能启动渲染循环', () => {
      const startSpy = vi.spyOn(engine, 'start');
      engine.start();
      
      expect(startSpy).toHaveBeenCalled();
      expect(engine.isRunning()).toBe(true);
    });

    test('应该能停止渲染循环', () => {
      engine.start();
      engine.stop();
      
      expect(engine.isRunning()).toBe(false);
    });

    test('应该能手动渲染一帧', () => {
      engine.render();
      
      expect(mockContext.clear).toHaveBeenCalled();
      expect(mockContext.save).toHaveBeenCalled();
      expect(mockContext.restore).toHaveBeenCalled();
    });

    test('重复启动应该无效', () => {
      engine.start();
      const isRunning1 = engine.isRunning();
      
      engine.start(); // 应该无效
      const isRunning2 = engine.isRunning();
      
      expect(isRunning1).toBe(true);
      expect(isRunning2).toBe(true);
    });

    test('停止未启动的引擎应该无效', () => {
      expect(() => engine.stop()).not.toThrow();
      expect(engine.isRunning()).toBe(false);
    });
  });

  describe('视口管理测试', () => {
    beforeEach(async () => {
      await engine.initialize(mockFactory, mockCanvas);
    });

    test('应该有默认视口', () => {
      const viewport = engine.getViewport();
      
      expect(viewport.x).toBe(0);
      expect(viewport.y).toBe(0);
      expect(viewport.width).toBe(800);
      expect(viewport.height).toBe(600);
      expect(viewport.zoom).toBe(1);
    });

    test('应该能设置视口', () => {
      const newViewport = {
        x: 100,
        y: 50,
        width: 1000,
        height: 800,
        zoom: 1.5
      };
      
      engine.setViewport(newViewport);
      const viewport = engine.getViewport();
      
      expect(viewport).toEqual(newViewport);
    });

    test('应该能部分更新视口', () => {
      engine.setViewport({ zoom: 2.0 });
      const viewport = engine.getViewport();
      
      expect(viewport.zoom).toBe(2.0);
      expect(viewport.x).toBe(0); // 其他值保持默认
      expect(viewport.y).toBe(0);
      expect(viewport.width).toBe(800);
      expect(viewport.height).toBe(600);
    });
  });

  describe('层管理测试', () => {
    beforeEach(async () => {
      await engine.initialize(mockFactory, mockCanvas);
    });

    test('应该能创建渲染层', () => {
      const layer = engine.createLayer('test-layer', 1);
      
      expect(layer).toBeDefined();
      expect(layer.id).toBe('test-layer');
      expect(layer.zIndex).toBe(1);
    });

    test('应该能获取渲染层', () => {
      const layer = engine.createLayer('test-layer', 1);
      const retrievedLayer = engine.getLayer('test-layer');
      
      expect(retrievedLayer).toBe(layer);
    });

    test('应该能移除渲染层', () => {
      engine.createLayer('test-layer', 1);
      engine.removeLayer('test-layer');
      
      const retrievedLayer = engine.getLayer('test-layer');
      expect(retrievedLayer).toBeUndefined();
    });

    test('获取不存在的层应该返回undefined', () => {
      const layer = engine.getLayer('nonexistent-layer');
      expect(layer).toBeUndefined();
    });
  });

  describe('坐标转换测试', () => {
    beforeEach(async () => {
      await engine.initialize(mockFactory, mockCanvas);
    });

    test('应该能进行屏幕坐标转世界坐标', () => {
      const screenPoint: IPoint = { x: 100, y: 100 };
      const expectedWorldPoint: IPoint = { x: 100, y: 100 };
      
      vi.mocked(mockContext.screenToWorld).mockReturnValue(expectedWorldPoint);
      
      const worldPoint = engine.screenToWorld(screenPoint);
      
      expect(worldPoint).toEqual(expectedWorldPoint);
      expect(mockContext.screenToWorld).toHaveBeenCalledWith(screenPoint);
    });

    test('应该能进行世界坐标转屏幕坐标', () => {
      const worldPoint: IPoint = { x: 200, y: 200 };
      const expectedScreenPoint: IPoint = { x: 200, y: 200 };
      
      vi.mocked(mockContext.worldToScreen).mockReturnValue(expectedScreenPoint);
      
      const screenPoint = engine.worldToScreen(worldPoint);
      
      expect(screenPoint).toEqual(expectedScreenPoint);
      expect(mockContext.worldToScreen).toHaveBeenCalledWith(worldPoint);
    });

    test('未初始化时坐标转换应该返回原坐标', () => {
      const uninitializedEngine = new RenderEngine();
      const point: IPoint = { x: 100, y: 100 };
      
      const worldPoint = uninitializedEngine.screenToWorld(point);
      const screenPoint = uninitializedEngine.worldToScreen(point);
      
      expect(worldPoint).toEqual(point);
      expect(screenPoint).toEqual(point);
    });
  });

  describe('渲染统计测试', () => {
    beforeEach(async () => {
      await engine.initialize(mockFactory, mockCanvas);
    });

    test('应该能获取渲染统计信息', () => {
      const stats = engine.getStats();
      
      expect(stats).toBeDefined();
      expect(stats.frameCount).toBe(0);
      expect(stats.fps).toBe(0);
      expect(stats.renderTime).toBe(0);
      expect(stats.objectsRendered).toBe(0);
    });

    test('渲染后应该更新统计信息', () => {
      engine.render();
      const stats = engine.getStats();
      
      expect(stats.frameCount).toBe(1);
      expect(stats.renderTime).toBeGreaterThan(0);
    });
  });

  describe('资源管理测试', () => {
    beforeEach(async () => {
      await engine.initialize(mockFactory, mockCanvas);
    });

    test('应该能销毁引擎', () => {
      engine.start();
      engine.dispose();
      
      expect(engine.isRunning()).toBe(false);
      expect(mockContext.dispose).toHaveBeenCalled();
      expect(engine.getContext()).toBeNull();
    });

    test('销毁未初始化的引擎应该不抛出错误', () => {
      const uninitializedEngine = new RenderEngine();
      expect(() => uninitializedEngine.dispose()).not.toThrow();
    });

    test('重复销毁应该无害', () => {
      engine.dispose();
      expect(() => engine.dispose()).not.toThrow();
    });
  });
});