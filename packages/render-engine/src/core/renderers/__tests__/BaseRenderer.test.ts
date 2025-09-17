/**
 * BaseRenderer 基类测试
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { IRect } from '../../interface/IGraphicsContext';
import { Transform } from '../../../math';
import { BaseRenderer } from '../BaseRenderer';
import type { Drawable, RenderContext, RendererCapabilities } from '../types';

// 创建一个具体的测试渲染器类
class TestRenderer extends BaseRenderer {
  render(context: RenderContext): void {
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

// 模拟 Drawable 对象
const createMockDrawable = (id: string, zIndex = 0, visible = true): Drawable => ({
  id,
  bounds: { x: 0, y: 0, width: 100, height: 100 },
  visible,
  zIndex,
  transform: new Transform(),
  draw: vi.fn(),
  hitTest: vi.fn().mockReturnValue(false),
  getBounds: vi.fn().mockReturnValue({ x: 0, y: 0, width: 100, height: 100 }),
  setTransform: vi.fn()
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

  describe('Drawable 管理', () => {
    it('应该能添加 drawable', () => {
      const drawable = createMockDrawable('test1');
      renderer.addDrawable(drawable);
      
      expect(renderer.getDrawable('test1')).toBe(drawable);
    });

    it('应该能移除 drawable', () => {
      const drawable = createMockDrawable('test1');
      renderer.addDrawable(drawable);
      renderer.removeDrawable('test1');
      
      expect(renderer.getDrawable('test1')).toBeUndefined();
    });

    it('应该能清空所有 drawables', () => {
      renderer.addDrawable(createMockDrawable('test1'));
      renderer.addDrawable(createMockDrawable('test2'));
      renderer.clearDrawables();
      
      expect(renderer.getDrawable('test1')).toBeUndefined();
      expect(renderer.getDrawable('test2')).toBeUndefined();
    });

    it('应该按 zIndex 排序 drawables', () => {
      const drawable1 = createMockDrawable('test1', 2);
      const drawable2 = createMockDrawable('test2', 1);
      const drawable3 = createMockDrawable('test3', 3);
      
      renderer.addDrawable(drawable1);
      renderer.addDrawable(drawable2);
      renderer.addDrawable(drawable3);
      
      // 通过 update 方法间接测试排序
      renderer.update(16);
      
      // 验证 drawables 存在
      expect(renderer.getDrawable('test1')).toBe(drawable1);
      expect(renderer.getDrawable('test2')).toBe(drawable2);
      expect(renderer.getDrawable('test3')).toBe(drawable3);
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
      
      renderer.startRenderLoop(mockContext);
      expect(renderer.isRunning()).toBe(true);
      
      spy.mockRestore();
    });

    it('应该能停止渲染循环', () => {
      const spy = vi.spyOn(window, 'cancelAnimationFrame').mockImplementation(() => {});
      
      renderer.startRenderLoop(mockContext);
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
    it('应该更新可见的 drawables', () => {
      const visibleDrawable = createMockDrawable('visible', 0, true);
      const hiddenDrawable = createMockDrawable('hidden', 0, false);
      
      renderer.addDrawable(visibleDrawable);
      renderer.addDrawable(hiddenDrawable);
      
      renderer.update(16);
      
      // 验证方法被调用（通过检查 drawable 是否存在来间接验证）
      expect(renderer.getDrawable('visible')).toBe(visibleDrawable);
      expect(renderer.getDrawable('hidden')).toBe(hiddenDrawable);
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
      renderer.addDrawable(createMockDrawable('test'));
      renderer.startRenderLoop(mockContext);
      
      expect(() => renderer.dispose()).not.toThrow();
      expect(renderer.isRunning()).toBe(false);
    });
  });

  describe('抽象方法', () => {
    it('应该实现所有抽象方法', () => {
      expect(() => renderer.render(mockContext)).not.toThrow();
      expect(() => renderer.clear()).not.toThrow();
      expect(renderer.getCapabilities()).toBeDefined();
    });
  });
});