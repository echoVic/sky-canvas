/**
 * 渲染器模块导出测试
 */
import { describe, expect, it } from 'vitest';
import {
  BaseRenderer,
  CanvasRenderer,
  WebGLRenderer,
  WebGPURenderer,
  type CanvasRenderContext,
  type RenderContext,
  type RenderStats,
  type WebGLRenderContext,
  type WebGPURenderContext
} from '../index';
import { RendererType } from '../types';

describe('渲染器模块导出', () => {
  describe('渲染器类导出', () => {
    it('应该正确导出 BaseRenderer', () => {
      expect(BaseRenderer).toBeDefined();
      expect(typeof BaseRenderer).toBe('function');
      expect(BaseRenderer.name).toBe('BaseRenderer');
    });

    it('应该正确导出 CanvasRenderer', () => {
      expect(CanvasRenderer).toBeDefined();
      expect(typeof CanvasRenderer).toBe('function');
      expect(CanvasRenderer.name).toBe('CanvasRenderer');
    });

    it('应该正确导出 WebGLRenderer', () => {
      expect(WebGLRenderer).toBeDefined();
      expect(typeof WebGLRenderer).toBe('function');
      expect(WebGLRenderer.name).toBe('WebGLRenderer');
    });

    it('应该正确导出 WebGPURenderer', () => {
      expect(WebGPURenderer).toBeDefined();
      expect(typeof WebGPURenderer).toBe('function');
      expect(WebGPURenderer.name).toBe('WebGPURenderer');
    });
  });

  describe('类型和枚举导出', () => {
    it('应该正确导出 RendererType 枚举', () => {
      expect(RendererType).toBeDefined();
      expect(RendererType.CANVAS_2D).toBe('canvas2d');
      expect(RendererType.WEBGL).toBe('webgl');
      expect(RendererType.WEBGL2).toBe('webgl2');
      expect(RendererType.WEBGPU).toBe('webgpu');
    });

    it('应该能够使用导出的类型', () => {
      // 测试类型是否正确导出（编译时检查）
      const stats: RenderStats = {
        drawCalls: 0,
        triangles: 0,
        vertices: 0,
        batches: 0,
        textureBinds: 0,
        shaderSwitches: 0,
        frameTime: 0
      };
      expect(stats).toBeDefined();

      const canvas = document.createElement('canvas');
      const context: RenderContext = {
        canvas,
        context: {},
        viewport: { x: 0, y: 0, width: 800, height: 600, zoom: 1 },
        devicePixelRatio: 1
      };
      expect(context).toBeDefined();

      const canvasContext: CanvasRenderContext = {
        canvas,
        context: canvas.getContext('2d')!,
        viewport: { x: 0, y: 0, width: 800, height: 600, zoom: 1 },
        devicePixelRatio: 1
      };
      expect(canvasContext).toBeDefined();

      const webglContext: WebGLRenderContext = {
        canvas,
        context: {} as WebGLRenderingContext,
        viewport: { x: 0, y: 0, width: 800, height: 600, zoom: 1 },
        devicePixelRatio: 1
      };
      expect(webglContext).toBeDefined();

      const webgpuContext: WebGPURenderContext = {
        canvas,
        context: {} as GPUCanvasContext,
        viewport: { x: 0, y: 0, width: 800, height: 600, zoom: 1 },
        devicePixelRatio: 1
      };
      expect(webgpuContext).toBeDefined();
    });
  });

  describe('渲染器实例化', () => {
    it('应该能够实例化 CanvasRenderer', () => {
      const renderer = new CanvasRenderer();
      expect(renderer).toBeInstanceOf(CanvasRenderer);
      expect(renderer).toBeInstanceOf(BaseRenderer);
    });

    it('应该能够实例化 WebGLRenderer', () => {
      const renderer = new WebGLRenderer();
      expect(renderer).toBeInstanceOf(WebGLRenderer);
      expect(renderer).toBeInstanceOf(BaseRenderer);
    });

    it('应该能够实例化 WebGPURenderer', () => {
      const canvas = document.createElement('canvas');
      const renderer = new WebGPURenderer(canvas);
      expect(renderer).toBeInstanceOf(WebGPURenderer);
      expect(renderer).toBeInstanceOf(BaseRenderer);
    });
  });

  describe('继承关系验证', () => {
    it('所有渲染器都应该继承自 BaseRenderer', () => {
      const canvas = document.createElement('canvas');
      const canvasRenderer = new CanvasRenderer();
      const webglRenderer = new WebGLRenderer();
      const webgpuRenderer = new WebGPURenderer(canvas);

      expect(canvasRenderer).toBeInstanceOf(BaseRenderer);
      expect(webglRenderer).toBeInstanceOf(BaseRenderer);
      expect(webgpuRenderer).toBeInstanceOf(BaseRenderer);
    });

    it('所有渲染器都应该实现 Renderer 接口', () => {
      const canvas = document.createElement('canvas');
      const renderers = [
        new CanvasRenderer(),
        new WebGLRenderer(),
        new WebGPURenderer(canvas)
      ];

      renderers.forEach(renderer => {
        expect(typeof renderer.render).toBe('function');
        expect(typeof renderer.update).toBe('function');
        expect(typeof renderer.dispose).toBe('function');
        expect(typeof renderer.clear).toBe('function');
        expect(typeof renderer.setViewport).toBe('function');
        expect(typeof renderer.getViewport).toBe('function');
        expect(typeof renderer.getCapabilities).toBe('function');
      });
    });
  });

  describe('模块完整性检查', () => {
    it('应该导出所有必需的渲染器类', () => {
      const expectedClasses = [
        'BaseRenderer',
        'CanvasRenderer', 
        'WebGLRenderer',
        'WebGPURenderer'
      ];

      const exportedClasses = [
        BaseRenderer,
        CanvasRenderer,
        WebGLRenderer,
        WebGPURenderer
      ];

      expectedClasses.forEach((className, index) => {
        expect(exportedClasses[index]).toBeDefined();
        expect(exportedClasses[index].name).toBe(className);
      });
    });

    it('应该导出所有必需的类型和枚举', () => {
      // 检查枚举
      expect(RendererType).toBeDefined();
      expect(typeof RendererType).toBe('object');
      
      // 检查枚举值
      const expectedTypes = ['canvas2d', 'webgl', 'webgl2', 'webgpu'];
      const actualTypes = Object.values(RendererType);
      
      expectedTypes.forEach(type => {
        expect(actualTypes).toContain(type);
      });
    });

    it('应该能够创建不同类型的渲染器实例', () => {
      const canvas = document.createElement('canvas');
      const rendererFactories = {
        [RendererType.CANVAS_2D]: () => new CanvasRenderer(),
        [RendererType.WEBGL]: () => new WebGLRenderer(),
        [RendererType.WEBGL2]: () => new WebGLRenderer(),
        [RendererType.WEBGPU]: () => new WebGPURenderer(canvas)
      };

      Object.entries(rendererFactories).forEach(([type, factory]) => {
        const renderer = factory();
        expect(renderer).toBeInstanceOf(BaseRenderer);
        expect(typeof renderer.render).toBe('function');
        expect(typeof renderer.getCapabilities).toBe('function');
      });
    });
  });

  describe('API 一致性检查', () => {
    it('所有渲染器应该有一致的公共 API', () => {
      const canvas = document.createElement('canvas');
      const renderers = [
        new CanvasRenderer(),
        new WebGLRenderer(),
        new WebGPURenderer(canvas)
      ];

      const expectedMethods = [
        'render',
        'update', 
        'dispose',
        'clear',
        'setViewport',
        'getViewport',
        'getCapabilities',
        'addRenderable',
        'removeRenderable',
        'clearRenderables',
        'pushState',
        'popState'
      ];

      renderers.forEach(renderer => {
        expectedMethods.forEach(method => {
          expect(typeof renderer[method as keyof typeof renderer]).toBe('function');
        });
      });
    });

    it('所有渲染器应该返回有效的能力信息', () => {
      const canvas = document.createElement('canvas');
      const renderers = [
        new CanvasRenderer(),
        new WebGLRenderer(),
        new WebGPURenderer(canvas)
      ];

      renderers.forEach(renderer => {
        const capabilities = renderer.getCapabilities();
        expect(capabilities).toBeDefined();
        expect(typeof capabilities.supportsTransforms).toBe('boolean');
        expect(typeof capabilities.supportsFilters).toBe('boolean');
        expect(typeof capabilities.supportsBlending).toBe('boolean');
        expect(typeof capabilities.maxTextureSize).toBe('number');
        expect(Array.isArray(capabilities.supportedFormats)).toBe(true);
      });
    });

    it('所有渲染器应该返回有效的视口信息', () => {
      const canvas = document.createElement('canvas');
      const renderers = [
        new CanvasRenderer(),
        new WebGLRenderer(),
        new WebGPURenderer(canvas)
      ];

      renderers.forEach(renderer => {
        const viewport = renderer.getViewport();
        expect(viewport).toBeDefined();
        expect(typeof viewport.x).toBe('number');
        expect(typeof viewport.y).toBe('number');
        expect(typeof viewport.width).toBe('number');
        expect(typeof viewport.height).toBe('number');
        expect(typeof viewport.zoom).toBe('number');
      });
    });
  });
});