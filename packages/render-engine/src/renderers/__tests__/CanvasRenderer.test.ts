/**
 * CanvasRenderer 测试
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { IPoint } from '../../graphics/IGraphicsContext';
import { Transform } from '../../math';
import { CanvasRenderer } from '../CanvasRenderer';
import type { CanvasRenderContext, Drawable } from '../types';

// 模拟 Canvas 2D Context
const createMockCanvas2DContext = () => ({
  save: vi.fn(),
  restore: vi.fn(),
  scale: vi.fn(),
  translate: vi.fn(),
  clearRect: vi.fn(),
  beginPath: vi.fn(),
  moveTo: vi.fn(),
  lineTo: vi.fn(),
  stroke: vi.fn(),
  fill: vi.fn(),
  rect: vi.fn(),
  arc: vi.fn(),
  fillText: vi.fn(),
  strokeText: vi.fn(),
  setTransform: vi.fn(),
  transform: vi.fn(),
  // 样式属性
  fillStyle: '#000000',
  strokeStyle: '#000000',
  lineWidth: 1,
  lineCap: 'butt' as CanvasLineCap,
  lineJoin: 'miter' as CanvasLineJoin,
  globalAlpha: 1,
  globalCompositeOperation: 'source-over' as GlobalCompositeOperation,
  shadowColor: 'rgba(0,0,0,0)',
  shadowBlur: 0,
  shadowOffsetX: 0,
  shadowOffsetY: 0,
  font: '10px sans-serif',
  textAlign: 'start' as CanvasTextAlign,
  textBaseline: 'alphabetic' as CanvasTextBaseline
});

// 模拟 Drawable 对象
const createMockDrawable = (id: string, visible = true): Drawable => ({
  id,
  bounds: { x: 10, y: 10, width: 100, height: 100 },
  visible,
  zIndex: 0,
  transform: new Transform(),
  draw: vi.fn(),
  hitTest: vi.fn().mockReturnValue(false),
  getBounds: vi.fn().mockReturnValue({ x: 10, y: 10, width: 100, height: 100 }),
  setTransform: vi.fn()
});

describe('CanvasRenderer', () => {
  let renderer: CanvasRenderer;
  let mockCanvas: HTMLCanvasElement;
  let mockContext2D: ReturnType<typeof createMockCanvas2DContext>;
  let renderContext: CanvasRenderContext;

  beforeEach(() => {
    renderer = new CanvasRenderer();
    mockCanvas = document.createElement('canvas');
    mockCanvas.width = 800;
    mockCanvas.height = 600;
    
    mockContext2D = createMockCanvas2DContext();
    
    renderContext = {
      canvas: mockCanvas,
      context: mockContext2D as any,
      viewport: { x: 0, y: 0, width: 800, height: 600, zoom: 1 },
      devicePixelRatio: 1
    };
  });

  describe('基础功能', () => {
    it('应该正确创建 CanvasRenderer 实例', () => {
      expect(renderer).toBeInstanceOf(CanvasRenderer);
    });

    it('应该返回正确的能力信息', () => {
      const capabilities = renderer.getCapabilities();
      
      expect(capabilities.supportsTransforms).toBe(true);
      expect(capabilities.supportsFilters).toBe(false);
      expect(capabilities.supportsBlending).toBe(true);
      expect(capabilities.maxTextureSize).toBe(0);
      expect(capabilities.supportedFormats).toEqual(['rgba']);
    });

    it('应该能获取当前上下文', () => {
      expect(renderer.getContext()).toBeNull();
      
      renderer.render(renderContext);
      expect(renderer.getContext()).toBe(renderContext);
    });
  });

  describe('渲染功能', () => {
    it('应该正确处理渲染流程', () => {
      const drawable = createMockDrawable('test1');
      renderer.addDrawable(drawable);
      
      renderer.render(renderContext);
      
      // 验证上下文操作
      expect(mockContext2D.save).toHaveBeenCalled();
      expect(mockContext2D.restore).toHaveBeenCalled();
      expect(mockContext2D.scale).toHaveBeenCalledWith(1, 1);
      expect(mockContext2D.translate).toHaveBeenCalledWith(0, 0);
      
      // 验证 drawable 的 draw 方法被调用
      expect(drawable.draw).toHaveBeenCalledWith(renderContext);
    });

    it('应该跳过不可见的 drawable', () => {
      const visibleDrawable = createMockDrawable('visible', true);
      const hiddenDrawable = createMockDrawable('hidden', false);
      
      renderer.addDrawable(visibleDrawable);
      renderer.addDrawable(hiddenDrawable);
      
      renderer.render(renderContext);
      
      expect(visibleDrawable.draw).toHaveBeenCalled();
      expect(hiddenDrawable.draw).not.toHaveBeenCalled();
    });

    it('应该处理无效上下文', () => {
      const invalidContext = {
        ...renderContext,
        context: null as any
      };
      
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      
      expect(() => renderer.render(invalidContext)).not.toThrow();
      expect(consoleSpy).toHaveBeenCalledWith('CanvasRenderer requires CanvasRenderingContext2D');
      
      consoleSpy.mockRestore();
    });

    it('应该应用视口变换', () => {
      const viewportContext = {
        ...renderContext,
        viewport: { x: 100, y: 50, width: 800, height: 600, zoom: 1 },
        devicePixelRatio: 2
      };
      
      renderer.render(viewportContext);
      
      expect(mockContext2D.scale).toHaveBeenCalledWith(2, 2);
      expect(mockContext2D.translate).toHaveBeenCalledWith(-100, -50);
    });
  });

  describe('清空功能', () => {
    it('应该正确清空画布', () => {
      renderer.render(renderContext);
      renderer.clear();
      
      expect(mockContext2D.save).toHaveBeenCalled();
      expect(mockContext2D.clearRect).toHaveBeenCalledWith(0, 0, 800, 600);
      expect(mockContext2D.restore).toHaveBeenCalled();
    });

    it('应该处理无上下文的清空', () => {
      expect(() => renderer.clear()).not.toThrow();
    });
  });

  describe('更新功能', () => {
    it('应该调用父类的更新方法', () => {
      const drawable = createMockDrawable('test');
      renderer.addDrawable(drawable);
      
      expect(() => renderer.update(16)).not.toThrow();
    });
  });

  describe('绘制基础图形', () => {
    beforeEach(() => {
      renderer.render(renderContext);
    });

    it('应该能绘制线段', () => {
      const start: IPoint = { x: 10, y: 10 };
      const end: IPoint = { x: 100, y: 100 };
      
      renderer.drawLine(start, end);
      
      expect(mockContext2D.save).toHaveBeenCalled();
      expect(mockContext2D.beginPath).toHaveBeenCalled();
      expect(mockContext2D.moveTo).toHaveBeenCalledWith(10, 10);
      expect(mockContext2D.lineTo).toHaveBeenCalledWith(100, 100);
      expect(mockContext2D.stroke).toHaveBeenCalled();
      expect(mockContext2D.restore).toHaveBeenCalled();
    });

    it('应该能绘制线段并应用样式', () => {
      const start: IPoint = { x: 10, y: 10 };
      const end: IPoint = { x: 100, y: 100 };
      const style = { strokeStyle: '#ff0000', lineWidth: 3 };
      
      renderer.drawLine(start, end, style);
      
      expect(mockContext2D.strokeStyle).toBe('#ff0000');
      expect(mockContext2D.lineWidth).toBe(3);
    });

    it('应该能绘制矩形（描边）', () => {
      renderer.drawRect(10, 20, 100, 50, false);
      
      expect(mockContext2D.save).toHaveBeenCalled();
      expect(mockContext2D.rect).toHaveBeenCalledWith(10, 20, 100, 50);
      expect(mockContext2D.stroke).toHaveBeenCalled();
      expect(mockContext2D.restore).toHaveBeenCalled();
    });

    it('应该能绘制矩形（填充）', () => {
      renderer.drawRect(10, 20, 100, 50, true);
      
      expect(mockContext2D.save).toHaveBeenCalled();
      expect(mockContext2D.rect).toHaveBeenCalledWith(10, 20, 100, 50);
      expect(mockContext2D.fill).toHaveBeenCalled();
      expect(mockContext2D.restore).toHaveBeenCalled();
    });

    it('应该能绘制圆形（描边）', () => {
      const center: IPoint = { x: 50, y: 50 };
      const radius = 25;
      
      renderer.drawCircle(center, radius, false);
      
      expect(mockContext2D.save).toHaveBeenCalled();
      expect(mockContext2D.beginPath).toHaveBeenCalled();
      expect(mockContext2D.arc).toHaveBeenCalledWith(50, 50, 25, 0, 2 * Math.PI);
      expect(mockContext2D.stroke).toHaveBeenCalled();
      expect(mockContext2D.restore).toHaveBeenCalled();
    });

    it('应该能绘制圆形（填充）', () => {
      const center: IPoint = { x: 50, y: 50 };
      const radius = 25;
      
      renderer.drawCircle(center, radius, true);
      
      expect(mockContext2D.save).toHaveBeenCalled();
      expect(mockContext2D.beginPath).toHaveBeenCalled();
      expect(mockContext2D.arc).toHaveBeenCalledWith(50, 50, 25, 0, 2 * Math.PI);
      expect(mockContext2D.fill).toHaveBeenCalled();
      expect(mockContext2D.restore).toHaveBeenCalled();
    });

    it('应该能绘制文本', () => {
      const position: IPoint = { x: 100, y: 100 };
      const text = 'Hello World';
      
      renderer.drawText(text, position);
      
      expect(mockContext2D.save).toHaveBeenCalled();
      expect(mockContext2D.fillText).toHaveBeenCalledWith('Hello World', 100, 100);
      expect(mockContext2D.restore).toHaveBeenCalled();
    });

    it('应该能绘制文本并应用样式', () => {
      const position: IPoint = { x: 100, y: 100 };
      const text = 'Hello World';
      const style = {
        fillStyle: '#0000ff',
        font: '16px Arial',
        textAlign: 'center' as CanvasTextAlign,
        textBaseline: 'middle' as CanvasTextBaseline
      };
      
      renderer.drawText(text, position, style);
      
      expect(mockContext2D.fillStyle).toBe('#000000');
      expect(mockContext2D.font).toBe('10px sans-serif');
      expect(mockContext2D.textAlign).toBe('start');
      expect(mockContext2D.textBaseline).toBe('alphabetic');
    });
  });

  describe('错误处理', () => {
    it('应该处理绘制方法在无上下文时的调用', () => {
      const start: IPoint = { x: 10, y: 10 };
      const end: IPoint = { x: 100, y: 100 };
      
      expect(() => renderer.drawLine(start, end)).not.toThrow();
      expect(() => renderer.drawRect(10, 20, 100, 50)).not.toThrow();
      expect(() => renderer.drawCircle({ x: 50, y: 50 }, 25)).not.toThrow();
      expect(() => renderer.drawText('test', { x: 100, y: 100 })).not.toThrow();
    });
  });

  describe('资源清理', () => {
    it('应该正确清理资源', () => {
      renderer.render(renderContext);
      
      expect(() => renderer.dispose()).not.toThrow();
      expect(renderer.getContext()).toBeNull();
    });
  });
});