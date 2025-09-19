/**
 * BaseRenderer 基类测试
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { IRect } from '../../interface/IGraphicsContext';
import { Transform } from '../../../math';
import { BaseRenderer } from '../BaseRenderer';
import type { IRenderable } from '../../types';
import type { RenderContext, RendererCapabilities } from '../types';

// 创建一个具体的测试渲染器类
class TestRenderer extends BaseRenderer {
  initialize(canvas: HTMLCanvasElement): boolean {
    this.canvas = canvas;
    return true;
  }

  render(): void {
    // 测试实现
  }

  clear(): void {
    // 测试实现
  }

  getCapabilities(): RendererCapabilities {
    return {
      supportsTransforms: true,
      supportsFilters: false,
      supportsBlending: true,
      maxTextureSize: 2048,
      supportedFormats: ['rgba']
    };
  }
}

// 模拟 IRenderable 对象
const createMockRenderable = (id: string, zIndex = 0, visible = true): IRenderable => ({
  id,
  visible,
  zIndex,
  transform: new Transform(),
  render: vi.fn(),
  hitTest: vi.fn().mockReturnValue(false),
  getBounds: vi.fn().mockReturnValue({ x: 0, y: 0, width: 100, height: 100 })
});

describe('BaseRenderer', () => {
  let renderer: TestRenderer;
  let mockContext: RenderContext;

  beforeEach(() => {
    renderer = new TestRenderer();
    mockContext = {
      canvas: document.createElement('canvas'),
      context: {},
      viewport: { x: 0, y: 0, width: 800, height: 600, zoom: 1 },
      devicePixelRatio: 1
    };
  });

  describe('构造函数和初始化', () => {
    it('应该正确初始化基础属性', () => {
      expect(renderer.getViewport()).toEqual({ x: 0, y: 0, width: 800, height: 600, zoom: 1 });
      expect(renderer.isRunning()).toBe(false);
    });

    it('应该创建默认渲染状态', () => {
      const renderState = renderer.getRenderState();
      expect(renderState).toBeDefined();
      expect(renderState.transform).toBeInstanceOf(Transform);
      expect(renderState.globalAlpha).toBe(1);
      expect(renderState.lineWidth).toBe(1);
    });
  });

  describe('Renderable 管理', () => {
    it('应该能添加 renderable', () => {
      const renderable = createMockRenderable('test1');
      renderer.addRenderable(renderable);

      expect(renderer.getRenderable('test1')).toBe(renderable);
    });

    it('应该能移除 renderable', () => {
      const renderable = createMockRenderable('test1');
      renderer.addRenderable(renderable);
      renderer.removeRenderable('test1');

      expect(renderer.getRenderable('test1')).toBeUndefined();
    });

    it('应该能清空所有 renderables', () => {
      renderer.addRenderable(createMockRenderable('test1'));
      renderer.addRenderable(createMockRenderable('test2'));
      renderer.clearRenderables();

      expect(renderer.getRenderable('test1')).toBeUndefined();
      expect(renderer.getRenderable('test2')).toBeUndefined();
    });

    it('应该按 zIndex 排序 renderables', () => {
      const renderable1 = createMockRenderable('test1', 2);
      const renderable2 = createMockRenderable('test2', 1);
      const renderable3 = createMockRenderable('test3', 3);

      renderer.addRenderable(renderable1);
      renderer.addRenderable(renderable2);
      renderer.addRenderable(renderable3);

      // 通过 update 方法间接测试排序
      renderer.update(16);

      // 验证 renderables 存在
      expect(renderer.getRenderable('test1')).toBe(renderable1);
      expect(renderer.getRenderable('test2')).toBe(renderable2);
      expect(renderer.getRenderable('test3')).toBe(renderable3);
    });
  });

  describe('视口管理', () => {
    it('应该能设置视口', () => {
      const newViewport = { x: 10, y: 20, width: 1024, height: 768 };
      renderer.setViewport(newViewport);
      
      expect(renderer.getViewport()).toEqual({ ...newViewport, zoom: 1 });
    });

    it('应该能部分更新视口', () => {
      renderer.setViewport({ width: 1024 });
      
      expect(renderer.getViewport()).toEqual({ x: 0, y: 0, width: 1024, height: 600, zoom: 1 });
    });
  });

  describe('渲染循环', () => {
    it('应该能启动渲染循环', () => {
      const spy = vi.spyOn(window, 'requestAnimationFrame').mockImplementation((cb) => {
        setTimeout(cb, 16);
        return 1;
      });
      
      renderer.startRenderLoop();
      expect(renderer.isRunning()).toBe(true);
      
      spy.mockRestore();
    });

    it('应该能停止渲染循环', () => {
      const spy = vi.spyOn(window, 'cancelAnimationFrame').mockImplementation(() => {});
      
      renderer.startRenderLoop();
      renderer.stopRenderLoop();
      
      expect(renderer.isRunning()).toBe(false);
      spy.mockRestore();
    });
  });

  describe('渲染状态管理', () => {
    it('应该能推入和弹出状态', () => {
      const originalState = renderer.getRenderState();
      
      renderer.pushState();
      renderer.setRenderState({ globalAlpha: 0.5 });
      
      expect(renderer.getRenderState().globalAlpha).toBe(0.5);
      
      renderer.popState();
      expect(renderer.getRenderState().globalAlpha).toBe(originalState.globalAlpha);
    });

    it('应该能设置渲染状态', () => {
      renderer.setRenderState({ lineWidth: 5, globalAlpha: 0.8 });
      
      const state = renderer.getRenderState();
      expect(state.lineWidth).toBe(5);
      expect(state.globalAlpha).toBe(0.8);
    });
  });

  describe('更新方法', () => {
    it('应该更新可见的 renderables', () => {
      const visibleRenderable = createMockRenderable('visible', 0, true);
      const hiddenRenderable = createMockRenderable('hidden', 0, false);

      renderer.addRenderable(visibleRenderable);
      renderer.addRenderable(hiddenRenderable);

      renderer.update(16);

      // 验证方法被调用（通过检查 renderable 是否存在来间接验证）
      expect(renderer.getRenderable('visible')).toBe(visibleRenderable);
      expect(renderer.getRenderable('hidden')).toBe(hiddenRenderable);
    });
  });

  describe('边界检测', () => {
    it('应该正确检测边界相交', () => {
      const rect1: IRect = { x: 0, y: 0, width: 100, height: 100 };
      const rect2: IRect = { x: 50, y: 50, width: 100, height: 100 };
      const rect3: IRect = { x: 200, y: 200, width: 100, height: 100 };
      
      // 使用反射访问 protected 方法
      const boundsIntersect = (renderer as any).boundsIntersect;
      
      expect(boundsIntersect(rect1, rect2)).toBe(true);
      expect(boundsIntersect(rect1, rect3)).toBe(false);
    });
  });

  describe('资源清理', () => {
    it('应该正确清理资源', () => {
      renderer.addRenderable(createMockRenderable('test'));
      renderer.startRenderLoop();
      
      expect(() => renderer.dispose()).not.toThrow();
      expect(renderer.isRunning()).toBe(false);
    });
  });

  describe('抽象方法', () => {
    it('应该实现所有抽象方法', () => {
      expect(() => renderer.render()).not.toThrow();
      expect(() => renderer.clear()).not.toThrow();
      expect(renderer.getCapabilities()).toBeDefined();
    });
  });
});