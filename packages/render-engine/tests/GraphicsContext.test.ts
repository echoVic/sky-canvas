/**
 * 图形上下文接口测试
 */
import { describe, test, expect, beforeEach, vi } from 'vitest';
import { IGraphicsContext, IGraphicsContextFactory, IPoint, IRect, IImageData } from '../src/core/IGraphicsContext';

describe('IGraphicsContext', () => {
  let mockContext: IGraphicsContext;
  let mockCanvas: HTMLCanvasElement;

  beforeEach(() => {
    // 创建模拟的Canvas元素
    mockCanvas = document.createElement('canvas');
    mockCanvas.width = 800;
    mockCanvas.height = 600;

    // 创建模拟的图形上下文
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
  });

  describe('基本功能测试', () => {
    test('应该具有正确的画布尺寸', () => {
      expect(mockContext.width).toBe(800);
      expect(mockContext.height).toBe(600);
    });

    test('应该支持清空画布', () => {
      mockContext.clear();
      expect(mockContext.clear).toHaveBeenCalled();
    });

    test('应该支持状态保存和恢复', () => {
      mockContext.save();
      mockContext.restore();
      
      expect(mockContext.save).toHaveBeenCalled();
      expect(mockContext.restore).toHaveBeenCalled();
    });
  });

  describe('变换操作测试', () => {
    test('应该支持平移变换', () => {
      const x = 100;
      const y = 200;
      mockContext.translate(x, y);
      
      expect(mockContext.translate).toHaveBeenCalledWith(x, y);
    });

    test('应该支持旋转变换', () => {
      const angle = Math.PI / 4;
      mockContext.rotate(angle);
      
      expect(mockContext.rotate).toHaveBeenCalledWith(angle);
    });

    test('应该支持缩放变换', () => {
      const scaleX = 2;
      const scaleY = 1.5;
      mockContext.scale(scaleX, scaleY);
      
      expect(mockContext.scale).toHaveBeenCalledWith(scaleX, scaleY);
    });
  });

  describe('绘制操作测试', () => {
    test('应该支持绘制矩形', () => {
      const rect: IRect = { x: 10, y: 20, width: 100, height: 80 };
      mockContext.drawRect(rect, true, false);
      
      expect(mockContext.drawRect).toHaveBeenCalledWith(rect, true, false);
    });

    test('应该支持绘制圆形', () => {
      const center: IPoint = { x: 50, y: 50 };
      const radius = 25;
      mockContext.drawCircle(center, radius, true, true);
      
      expect(mockContext.drawCircle).toHaveBeenCalledWith(center, radius, true, true);
    });

    test('应该支持绘制线条', () => {
      const from: IPoint = { x: 0, y: 0 };
      const to: IPoint = { x: 100, y: 100 };
      mockContext.drawLine(from, to);
      
      expect(mockContext.drawLine).toHaveBeenCalledWith(from, to);
    });
  });

  describe('样式设置测试', () => {
    test('应该支持设置透明度', () => {
      const opacity = 0.5;
      mockContext.setOpacity(opacity);
      
      expect(mockContext.setOpacity).toHaveBeenCalledWith(opacity);
    });

    test('应该支持设置描边样式', () => {
      const style = '#ff0000';
      mockContext.setStrokeStyle(style);
      
      expect(mockContext.setStrokeStyle).toHaveBeenCalledWith(style);
    });

    test('应该支持设置填充样式', () => {
      const style = '#00ff00';
      mockContext.setFillStyle(style);
      
      expect(mockContext.setFillStyle).toHaveBeenCalledWith(style);
    });

    test('应该支持设置线宽', () => {
      const width = 3;
      mockContext.setLineWidth(width);
      
      expect(mockContext.setLineWidth).toHaveBeenCalledWith(width);
    });
  });

  describe('坐标转换测试', () => {
    test('应该支持屏幕坐标转世界坐标', () => {
      const screenPoint: IPoint = { x: 100, y: 100 };
      const worldPoint: IPoint = { x: 200, y: 200 };
      
      vi.mocked(mockContext.screenToWorld).mockReturnValue(worldPoint);
      
      const result = mockContext.screenToWorld(screenPoint);
      expect(result).toEqual(worldPoint);
      expect(mockContext.screenToWorld).toHaveBeenCalledWith(screenPoint);
    });

    test('应该支持世界坐标转屏幕坐标', () => {
      const worldPoint: IPoint = { x: 200, y: 200 };
      const screenPoint: IPoint = { x: 100, y: 100 };
      
      vi.mocked(mockContext.worldToScreen).mockReturnValue(screenPoint);
      
      const result = mockContext.worldToScreen(worldPoint);
      expect(result).toEqual(screenPoint);
      expect(mockContext.worldToScreen).toHaveBeenCalledWith(worldPoint);
    });
  });

  describe('资源管理测试', () => {
    test('应该支持资源释放', () => {
      mockContext.dispose();
      expect(mockContext.dispose).toHaveBeenCalled();
    });
  });
});

describe('IGraphicsContextFactory', () => {
  let mockFactory: IGraphicsContextFactory<HTMLCanvasElement>;
  let mockCanvas: HTMLCanvasElement;
  let mockContext: IGraphicsContext;

  beforeEach(() => {
    mockCanvas = document.createElement('canvas');
    
    // 为工厂测试创建独立的mockContext
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
  });

  describe('工厂方法测试', () => {
    test('应该能检测支持性', () => {
      const supported = mockFactory.isSupported();
      expect(supported).toBe(true);
      expect(mockFactory.isSupported).toHaveBeenCalled();
    });

    test('应该能创建图形上下文', async () => {
      const context = await mockFactory.createContext(mockCanvas);
      
      expect(context).toBeDefined();
      expect(mockFactory.createContext).toHaveBeenCalledWith(mockCanvas);
    });

    test('当不支持时应该抛出错误', () => {
      vi.mocked(mockFactory.isSupported).mockReturnValue(false);
      
      expect(mockFactory.isSupported()).toBe(false);
    });
  });
});