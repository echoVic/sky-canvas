/**
 * 渲染器类型定义测试
 */
import { describe, it, expect } from 'vitest';
import {
  RendererType,
  type RenderStats,
  type RenderContext,
  type CanvasRenderContext,
  type WebGLRenderContext,
  type WebGPURenderContext,
  type RenderState,
  type RendererCapabilities,
  type Renderer
} from '../types';
import { Transform } from '../../../math';

describe('渲染器类型定义', () => {
  describe('RendererType 枚举', () => {
    it('应该包含所有渲染器类型', () => {
      expect(RendererType.CANVAS_2D).toBe('canvas2d');
      expect(RendererType.WEBGL).toBe('webgl');
      expect(RendererType.WEBGL2).toBe('webgl2');
      expect(RendererType.WEBGPU).toBe('webgpu');
    });

    it('应该能正确比较枚举值', () => {
      expect(RendererType.CANVAS_2D === 'canvas2d').toBe(true);
      expect(RendererType.WEBGL === 'webgl').toBe(true);
      expect(RendererType.WEBGL2 === 'webgl2').toBe(true);
      expect(RendererType.WEBGPU === 'webgpu').toBe(true);
    });
  });

  describe('RenderStats 接口', () => {
    it('应该具有正确的属性结构', () => {
      const stats: RenderStats = {
        drawCalls: 10,
        triangles: 1000,
        vertices: 3000,
        batches: 5,
        textureBinds: 8,
        shaderSwitches: 3,
        frameTime: 16.67
      };

      expect(typeof stats.drawCalls).toBe('number');
      expect(typeof stats.triangles).toBe('number');
      expect(typeof stats.vertices).toBe('number');
      expect(typeof stats.batches).toBe('number');
      expect(typeof stats.textureBinds).toBe('number');
      expect(typeof stats.shaderSwitches).toBe('number');
      expect(typeof stats.frameTime).toBe('number');
    });

    it('应该能创建空的统计对象', () => {
      const emptyStats: RenderStats = {
        drawCalls: 0,
        triangles: 0,
        vertices: 0,
        batches: 0,
        textureBinds: 0,
        shaderSwitches: 0,
        frameTime: 0
      };

      expect(emptyStats.drawCalls).toBe(0);
      expect(emptyStats.triangles).toBe(0);
      expect(emptyStats.vertices).toBe(0);
      expect(emptyStats.batches).toBe(0);
      expect(emptyStats.textureBinds).toBe(0);
      expect(emptyStats.shaderSwitches).toBe(0);
      expect(emptyStats.frameTime).toBe(0);
    });
  });

  describe('RenderContext 接口', () => {
    it('应该具有正确的基础属性结构', () => {
      const canvas = document.createElement('canvas');
      const context: RenderContext = {
        canvas,
        context: {},
        viewport: { x: 0, y: 0, width: 800, height: 600, zoom: 1 },
        devicePixelRatio: 1
      };

      expect(context.canvas).toBe(canvas);
      expect(typeof context.context).toBe('object');
      expect(context.viewport).toHaveProperty('x');
      expect(context.viewport).toHaveProperty('y');
      expect(context.viewport).toHaveProperty('width');
      expect(context.viewport).toHaveProperty('height');
      expect(context.viewport).toHaveProperty('zoom');
      expect(typeof context.devicePixelRatio).toBe('number');
    });
  });

  describe('特定渲染器上下文', () => {
    it('CanvasRenderContext 应该扩展基础上下文', () => {
      const canvas = document.createElement('canvas');
      const ctx2d = canvas.getContext('2d')!;
      
      const canvasContext: CanvasRenderContext = {
        canvas,
        context: ctx2d,
        viewport: { x: 0, y: 0, width: 800, height: 600, zoom: 1 },
        devicePixelRatio: 1
      };

      expect(canvasContext.context).toBe(ctx2d);
      expect(canvasContext.canvas).toBe(canvas);
    });

    it('WebGLRenderContext 应该支持 WebGL 上下文', () => {
      const canvas = document.createElement('canvas');
      const mockWebGLContext = {} as WebGLRenderingContext;
      
      const webglContext: WebGLRenderContext = {
        canvas,
        context: mockWebGLContext,
        viewport: { x: 0, y: 0, width: 800, height: 600, zoom: 1 },
        devicePixelRatio: 1
      };

      expect(webglContext.context).toBe(mockWebGLContext);
      expect(webglContext.canvas).toBe(canvas);
    });

    it('WebGPURenderContext 应该支持 WebGPU 上下文', () => {
      const canvas = document.createElement('canvas');
      const mockWebGPUContext = {} as GPUCanvasContext;
      
      const webgpuContext: WebGPURenderContext = {
        canvas,
        context: mockWebGPUContext,
        viewport: { x: 0, y: 0, width: 800, height: 600, zoom: 1 },
        devicePixelRatio: 1
      };

      expect(webgpuContext.context).toBe(mockWebGPUContext);
      expect(webgpuContext.canvas).toBe(canvas);
    });
  });

  describe('RenderState 接口', () => {
    it('应该具有正确的属性结构', () => {
      const renderState: RenderState = {
        transform: new Transform(),
        fillStyle: '#000000',
        strokeStyle: '#ffffff',
        lineWidth: 2,
        lineCap: 'round',
        lineJoin: 'round',
        globalAlpha: 0.8,
        globalCompositeOperation: 'source-over',
        shadowColor: 'rgba(0,0,0,0.5)',
        shadowBlur: 5,
        shadowOffsetX: 2,
        shadowOffsetY: 2
      };

      expect(renderState.transform).toBeInstanceOf(Transform);
      expect(typeof renderState.fillStyle).toBe('string');
      expect(typeof renderState.strokeStyle).toBe('string');
      expect(typeof renderState.lineWidth).toBe('number');
      expect(renderState.lineCap).toBe('round');
      expect(renderState.lineJoin).toBe('round');
      expect(typeof renderState.globalAlpha).toBe('number');
      expect(renderState.globalCompositeOperation).toBe('source-over');
      expect(typeof renderState.shadowColor).toBe('string');
      expect(typeof renderState.shadowBlur).toBe('number');
      expect(typeof renderState.shadowOffsetX).toBe('number');
      expect(typeof renderState.shadowOffsetY).toBe('number');
    });

    it('应该支持不同的样式类型', () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d')!;
      const gradient = ctx.createLinearGradient(0, 0, 100, 100);
      const pattern = ctx.createPattern(canvas, 'repeat')!;

      const gradientState: RenderState = {
        transform: new Transform(),
        fillStyle: gradient,
        strokeStyle: pattern,
        lineWidth: 1,
        lineCap: 'butt',
        lineJoin: 'miter',
        globalAlpha: 1,
        globalCompositeOperation: 'source-over',
        shadowColor: 'transparent',
        shadowBlur: 0,
        shadowOffsetX: 0,
        shadowOffsetY: 0
      };

      expect(gradientState.fillStyle).toBe(gradient);
      expect(gradientState.strokeStyle).toBe(pattern);
    });
  });


  describe('RendererCapabilities 接口', () => {
    it('应该具有正确的属性结构', () => {
      const capabilities: RendererCapabilities = {
        supportsTransforms: true,
        supportsFilters: false,
        supportsBlending: true,
        maxTextureSize: 4096,
        supportedFormats: ['rgba', 'rgb', 'alpha']
      };

      expect(typeof capabilities.supportsTransforms).toBe('boolean');
      expect(typeof capabilities.supportsFilters).toBe('boolean');
      expect(typeof capabilities.supportsBlending).toBe('boolean');
      expect(typeof capabilities.maxTextureSize).toBe('number');
      expect(Array.isArray(capabilities.supportedFormats)).toBe(true);
      expect(capabilities.supportedFormats.every(format => typeof format === 'string')).toBe(true);
    });

    it('应该能表示不同的能力组合', () => {
      const basicCapabilities: RendererCapabilities = {
        supportsTransforms: false,
        supportsFilters: false,
        supportsBlending: false,
        maxTextureSize: 0,
        supportedFormats: []
      };

      const advancedCapabilities: RendererCapabilities = {
        supportsTransforms: true,
        supportsFilters: true,
        supportsBlending: true,
        maxTextureSize: 16384,
        supportedFormats: ['rgba', 'rgb', 'alpha', 'luminance', 'depth']
      };

      expect(basicCapabilities.supportsTransforms).toBe(false);
      expect(basicCapabilities.supportedFormats.length).toBe(0);
      
      expect(advancedCapabilities.supportsTransforms).toBe(true);
      expect(advancedCapabilities.supportedFormats.length).toBe(5);
    });
  });

  describe('Renderer 接口', () => {
    it('应该定义所有必需的方法', () => {
      const mockRenderer: Renderer = {
        render: () => {},
        update: () => {},
        dispose: () => {},
        clear: () => {},
        setViewport: () => {},
        getViewport: () => ({ x: 0, y: 0, width: 800, height: 600, zoom: 1 }),
        getCapabilities: () => ({
          supportsTransforms: true,
          supportsFilters: false,
          supportsBlending: true,
          maxTextureSize: 2048,
          supportedFormats: ['rgba']
        })
      };

      expect(typeof mockRenderer.render).toBe('function');
      expect(typeof mockRenderer.update).toBe('function');
      expect(typeof mockRenderer.dispose).toBe('function');
      expect(typeof mockRenderer.clear).toBe('function');
      expect(typeof mockRenderer.setViewport).toBe('function');
      expect(typeof mockRenderer.getViewport).toBe('function');
      expect(typeof mockRenderer.getCapabilities).toBe('function');
    });

    it('应该能正确执行接口方法', () => {
      let renderCalled = false;
      let updateCalled = false;
      let disposeCalled = false;
      let clearCalled = false;
      let viewportSet = false;

      const mockRenderer: Renderer = {
        render: () => { renderCalled = true; },
        update: () => { updateCalled = true; },
        dispose: () => { disposeCalled = true; },
        clear: () => { clearCalled = true; },
        setViewport: () => { viewportSet = true; },
        getViewport: () => ({ x: 0, y: 0, width: 800, height: 600, zoom: 1 }),
        getCapabilities: () => ({
          supportsTransforms: true,
          supportsFilters: false,
          supportsBlending: true,
          maxTextureSize: 2048,
          supportedFormats: ['rgba']
        })
      };

      mockRenderer.render({} as RenderContext);
      expect(renderCalled).toBe(true);

      mockRenderer.update(16);
      expect(updateCalled).toBe(true);

      mockRenderer.dispose();
      expect(disposeCalled).toBe(true);

      mockRenderer.clear();
      expect(clearCalled).toBe(true);

      mockRenderer.setViewport({ width: 1024 });
      expect(viewportSet).toBe(true);

      const viewport = mockRenderer.getViewport();
      expect(viewport).toHaveProperty('x');
      expect(viewport).toHaveProperty('y');
      expect(viewport).toHaveProperty('width');
      expect(viewport).toHaveProperty('height');
      expect(viewport).toHaveProperty('zoom');

      const capabilities = mockRenderer.getCapabilities();
      expect(capabilities).toHaveProperty('supportsTransforms');
      expect(capabilities).toHaveProperty('supportsFilters');
      expect(capabilities).toHaveProperty('supportsBlending');
      expect(capabilities).toHaveProperty('maxTextureSize');
      expect(capabilities).toHaveProperty('supportedFormats');
    });
  });
});