/**
 * IGraphicsContext 接口和类型单元测试
 * 测试图形上下文相关的所有接口定义和类型
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import type {
  IPoint,
  ISize,
  IRect,
  IColor,
  ITransform,
  IGraphicsStyle,
  ITextStyle,
  IGraphicsState,
  IPath,
  IImageData,
  IGraphicsContext,
  IGraphicsContextFactory,
  IGraphicsCapabilities
} from '../IGraphicsContext';

describe('IGraphicsContext Types', () => {
  describe('IPoint', () => {
    it('should define point coordinates', () => {
      const point: IPoint = { x: 10, y: 20 };
      expect(point.x).toBe(10);
      expect(point.y).toBe(20);
    });

    it('should support negative coordinates', () => {
      const point: IPoint = { x: -5, y: -15 };
      expect(point.x).toBe(-5);
      expect(point.y).toBe(-15);
    });

    it('should support fractional coordinates', () => {
      const point: IPoint = { x: 1.5, y: 2.7 };
      expect(point.x).toBe(1.5);
      expect(point.y).toBe(2.7);
    });

    it('should support extreme values', () => {
      const point: IPoint = { x: Number.MAX_VALUE, y: Number.MIN_VALUE };
      expect(point.x).toBe(Number.MAX_VALUE);
      expect(point.y).toBe(Number.MIN_VALUE);
    });
  });

  describe('ISize', () => {
    it('should define size dimensions', () => {
      const size: ISize = { width: 100, height: 200 };
      expect(size.width).toBe(100);
      expect(size.height).toBe(200);
    });

    it('should support zero dimensions', () => {
      const size: ISize = { width: 0, height: 0 };
      expect(size.width).toBe(0);
      expect(size.height).toBe(0);
    });

    it('should support fractional dimensions', () => {
      const size: ISize = { width: 10.5, height: 20.7 };
      expect(size.width).toBe(10.5);
      expect(size.height).toBe(20.7);
    });
  });

  describe('IRect', () => {
    it('should extend both IPoint and ISize', () => {
      const rect: IRect = { x: 10, y: 20, width: 100, height: 200 };
      expect(rect.x).toBe(10);
      expect(rect.y).toBe(20);
      expect(rect.width).toBe(100);
      expect(rect.height).toBe(200);
    });

    it('should support empty rectangle', () => {
      const rect: IRect = { x: 0, y: 0, width: 0, height: 0 };
      expect(rect.x).toBe(0);
      expect(rect.y).toBe(0);
      expect(rect.width).toBe(0);
      expect(rect.height).toBe(0);
    });

    it('should support negative position', () => {
      const rect: IRect = { x: -10, y: -20, width: 100, height: 200 };
      expect(rect.x).toBe(-10);
      expect(rect.y).toBe(-20);
    });
  });

  describe('IColor', () => {
    it('should define RGB color', () => {
      const color: IColor = { r: 255, g: 128, b: 64 };
      expect(color.r).toBe(255);
      expect(color.g).toBe(128);
      expect(color.b).toBe(64);
      expect(color.a).toBeUndefined();
    });

    it('should define RGBA color', () => {
      const color: IColor = { r: 255, g: 128, b: 64, a: 0.5 };
      expect(color.r).toBe(255);
      expect(color.g).toBe(128);
      expect(color.b).toBe(64);
      expect(color.a).toBe(0.5);
    });

    it('should support all zero color (black)', () => {
      const color: IColor = { r: 0, g: 0, b: 0, a: 0 };
      expect(color.r).toBe(0);
      expect(color.g).toBe(0);
      expect(color.b).toBe(0);
      expect(color.a).toBe(0);
    });

    it('should support full intensity color (white)', () => {
      const color: IColor = { r: 255, g: 255, b: 255, a: 1.0 };
      expect(color.r).toBe(255);
      expect(color.g).toBe(255);
      expect(color.b).toBe(255);
      expect(color.a).toBe(1.0);
    });

    it('should support fractional alpha', () => {
      const color: IColor = { r: 100, g: 150, b: 200, a: 0.75 };
      expect(color.a).toBe(0.75);
    });
  });

  describe('ITransform', () => {
    it('should define 2D transformation matrix', () => {
      const transform: ITransform = {
        a: 1, // scaleX
        b: 0, // skewY
        c: 0, // skewX
        d: 1, // scaleY
        e: 0, // translateX
        f: 0  // translateY
      };
      expect(transform.a).toBe(1);
      expect(transform.b).toBe(0);
      expect(transform.c).toBe(0);
      expect(transform.d).toBe(1);
      expect(transform.e).toBe(0);
      expect(transform.f).toBe(0);
    });

    it('should support scale transformation', () => {
      const transform: ITransform = {
        a: 2,   // 2x scale on X
        b: 0,
        c: 0,
        d: 1.5, // 1.5x scale on Y
        e: 0,
        f: 0
      };
      expect(transform.a).toBe(2);
      expect(transform.d).toBe(1.5);
    });

    it('should support translation', () => {
      const transform: ITransform = {
        a: 1, b: 0, c: 0, d: 1,
        e: 100, // translateX
        f: 200  // translateY
      };
      expect(transform.e).toBe(100);
      expect(transform.f).toBe(200);
    });

    it('should support rotation (skew)', () => {
      const angle = Math.PI / 4; // 45 degrees
      const cos = Math.cos(angle);
      const sin = Math.sin(angle);
      const transform: ITransform = {
        a: cos,
        b: sin,
        c: -sin,
        d: cos,
        e: 0,
        f: 0
      };
      expect(transform.a).toBeCloseTo(cos, 5);
      expect(transform.b).toBeCloseTo(sin, 5);
      expect(transform.c).toBeCloseTo(-sin, 5);
      expect(transform.d).toBeCloseTo(cos, 5);
    });
  });

  describe('IGraphicsStyle', () => {
    it('should support all style properties', () => {
      const style: IGraphicsStyle = {
        fillColor: { r: 255, g: 0, b: 0 },
        strokeColor: 'blue',
        lineWidth: 2,
        lineCap: 'round',
        lineJoin: 'bevel',
        opacity: 0.8,
        shadowColor: 'black',
        shadowBlur: 10,
        shadowOffsetX: 5,
        shadowOffsetY: 3
      };

      expect(style.fillColor).toEqual({ r: 255, g: 0, b: 0 });
      expect(style.strokeColor).toBe('blue');
      expect(style.lineWidth).toBe(2);
      expect(style.lineCap).toBe('round');
      expect(style.lineJoin).toBe('bevel');
      expect(style.opacity).toBe(0.8);
      expect(style.shadowColor).toBe('black');
      expect(style.shadowBlur).toBe(10);
      expect(style.shadowOffsetX).toBe(5);
      expect(style.shadowOffsetY).toBe(3);
    });

    it('should support minimal style', () => {
      const style: IGraphicsStyle = {};
      expect(Object.keys(style)).toHaveLength(0);
    });

    it('should support different line cap styles', () => {
      const styles: IGraphicsStyle[] = [
        { lineCap: 'butt' },
        { lineCap: 'round' },
        { lineCap: 'square' }
      ];
      expect(styles[0].lineCap).toBe('butt');
      expect(styles[1].lineCap).toBe('round');
      expect(styles[2].lineCap).toBe('square');
    });

    it('should support different line join styles', () => {
      const styles: IGraphicsStyle[] = [
        { lineJoin: 'miter' },
        { lineJoin: 'round' },
        { lineJoin: 'bevel' }
      ];
      expect(styles[0].lineJoin).toBe('miter');
      expect(styles[1].lineJoin).toBe('round');
      expect(styles[2].lineJoin).toBe('bevel');
    });

    it('should support color as string or IColor', () => {
      const styleWithString: IGraphicsStyle = {
        fillColor: '#ff0000',
        strokeColor: 'rgba(0, 255, 0, 0.5)'
      };
      const styleWithColor: IGraphicsStyle = {
        fillColor: { r: 255, g: 0, b: 0, a: 1 },
        strokeColor: { r: 0, g: 255, b: 0, a: 0.5 }
      };

      expect(typeof styleWithString.fillColor).toBe('string');
      expect(typeof styleWithColor.fillColor).toBe('object');
    });
  });

  describe('ITextStyle', () => {
    it('should extend IGraphicsStyle and add text-specific properties', () => {
      const textStyle: ITextStyle = {
        // From IGraphicsStyle
        fillColor: 'black',
        strokeColor: 'white',
        lineWidth: 1,
        opacity: 1,
        // Text-specific
        fontFamily: 'Arial',
        fontSize: 16,
        fontWeight: 'bold',
        fontStyle: 'italic',
        textAlign: 'center',
        textBaseline: 'middle'
      };

      expect(textStyle.fillColor).toBe('black');
      expect(textStyle.strokeColor).toBe('white');
      expect(textStyle.fontFamily).toBe('Arial');
      expect(textStyle.fontSize).toBe(16);
      expect(textStyle.fontWeight).toBe('bold');
      expect(textStyle.fontStyle).toBe('italic');
      expect(textStyle.textAlign).toBe('center');
      expect(textStyle.textBaseline).toBe('middle');
    });

    it('should support different font weights', () => {
      const styles: ITextStyle[] = [
        { fontWeight: 'normal' },
        { fontWeight: 'bold' },
        { fontWeight: 'lighter' },
        { fontWeight: 'bolder' },
        { fontWeight: 400 },
        { fontWeight: 700 }
      ];
      expect(styles[0].fontWeight).toBe('normal');
      expect(styles[1].fontWeight).toBe('bold');
      expect(styles[2].fontWeight).toBe('lighter');
      expect(styles[3].fontWeight).toBe('bolder');
      expect(styles[4].fontWeight).toBe(400);
      expect(styles[5].fontWeight).toBe(700);
    });

    it('should support different font styles', () => {
      const styles: ITextStyle[] = [
        { fontStyle: 'normal' },
        { fontStyle: 'italic' },
        { fontStyle: 'oblique' }
      ];
      expect(styles[0].fontStyle).toBe('normal');
      expect(styles[1].fontStyle).toBe('italic');
      expect(styles[2].fontStyle).toBe('oblique');
    });

    it('should support different text alignments', () => {
      const alignments: ITextStyle[] = [
        { textAlign: 'left' },
        { textAlign: 'center' },
        { textAlign: 'right' },
        { textAlign: 'start' },
        { textAlign: 'end' }
      ];
      alignments.forEach((style, index) => {
        expect(style.textAlign).toBeTruthy();
      });
    });

    it('should support different text baselines', () => {
      const baselines: ITextStyle[] = [
        { textBaseline: 'top' },
        { textBaseline: 'middle' },
        { textBaseline: 'bottom' },
        { textBaseline: 'alphabetic' },
        { textBaseline: 'hanging' }
      ];
      baselines.forEach((style, index) => {
        expect(style.textBaseline).toBeTruthy();
      });
    });
  });

  describe('IGraphicsState', () => {
    it('should include transform and style', () => {
      const state: IGraphicsState = {
        transform: { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 },
        style: { fillColor: 'red', strokeColor: 'blue' }
      };
      expect(state.transform).toBeDefined();
      expect(state.style).toBeDefined();
      expect(state.clipPath).toBeUndefined();
    });

    it('should support optional clip path', () => {
      const mockPath: IPath = {
        moveTo: vi.fn(),
        lineTo: vi.fn(),
        quadraticCurveTo: vi.fn(),
        bezierCurveTo: vi.fn(),
        arc: vi.fn(),
        rect: vi.fn(),
        closePath: vi.fn(),
        getBounds: vi.fn().mockReturnValue({ x: 0, y: 0, width: 100, height: 100 })
      };

      const state: IGraphicsState = {
        transform: { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 },
        style: {},
        clipPath: mockPath
      };

      expect(state.clipPath).toBe(mockPath);
    });
  });

  describe('IPath', () => {
    let mockPath: IPath;

    beforeEach(() => {
      mockPath = {
        moveTo: vi.fn(),
        lineTo: vi.fn(),
        quadraticCurveTo: vi.fn(),
        bezierCurveTo: vi.fn(),
        arc: vi.fn(),
        rect: vi.fn(),
        closePath: vi.fn(),
        getBounds: vi.fn().mockReturnValue({ x: 0, y: 0, width: 100, height: 100 })
      };
    });

    it('should implement all path methods', () => {
      mockPath.moveTo(10, 20);
      expect(mockPath.moveTo).toHaveBeenCalledWith(10, 20);

      mockPath.lineTo(30, 40);
      expect(mockPath.lineTo).toHaveBeenCalledWith(30, 40);

      mockPath.quadraticCurveTo(50, 60, 70, 80);
      expect(mockPath.quadraticCurveTo).toHaveBeenCalledWith(50, 60, 70, 80);

      mockPath.bezierCurveTo(10, 20, 30, 40, 50, 60);
      expect(mockPath.bezierCurveTo).toHaveBeenCalledWith(10, 20, 30, 40, 50, 60);

      mockPath.arc(100, 100, 50, 0, Math.PI * 2);
      expect(mockPath.arc).toHaveBeenCalledWith(100, 100, 50, 0, Math.PI * 2);

      mockPath.arc(100, 100, 50, 0, Math.PI, true);
      expect(mockPath.arc).toHaveBeenCalledWith(100, 100, 50, 0, Math.PI, true);

      mockPath.rect(10, 20, 100, 200);
      expect(mockPath.rect).toHaveBeenCalledWith(10, 20, 100, 200);

      mockPath.closePath();
      expect(mockPath.closePath).toHaveBeenCalled();

      const bounds = mockPath.getBounds();
      expect(bounds).toEqual({ x: 0, y: 0, width: 100, height: 100 });
    });
  });

  describe('IImageData', () => {
    it('should define image data properties', () => {
      const imageData: IImageData = {
        width: 100,
        height: 200,
        data: new Uint8ClampedArray(100 * 200 * 4) // RGBA
      };

      expect(imageData.width).toBe(100);
      expect(imageData.height).toBe(200);
      expect(imageData.data).toBeInstanceOf(Uint8ClampedArray);
      expect(imageData.data.length).toBe(100 * 200 * 4);
    });

    it('should support empty image data', () => {
      const imageData: IImageData = {
        width: 0,
        height: 0,
        data: new Uint8ClampedArray(0)
      };

      expect(imageData.width).toBe(0);
      expect(imageData.height).toBe(0);
      expect(imageData.data.length).toBe(0);
    });

    it('should support small image data', () => {
      const imageData: IImageData = {
        width: 1,
        height: 1,
        data: new Uint8ClampedArray([255, 0, 0, 255]) // Red pixel
      };

      expect(imageData.width).toBe(1);
      expect(imageData.height).toBe(1);
      expect(imageData.data).toEqual(new Uint8ClampedArray([255, 0, 0, 255]));
    });
  });

  describe('IGraphicsContext', () => {
    let mockContext: IGraphicsContext;

    beforeEach(() => {
      mockContext = {
        // Basic properties
        width: 800,
        height: 600,
        devicePixelRatio: 2,

        // State management
        save: vi.fn(),
        restore: vi.fn(),
        getState: vi.fn().mockReturnValue({
          transform: { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 },
          style: {}
        }),
        setState: vi.fn(),

        // Transform operations
        setTransform: vi.fn(),
        transform: vi.fn(),
        translate: vi.fn(),
        rotate: vi.fn(),
        scale: vi.fn(),
        resetTransform: vi.fn(),

        // Style setting
        setStyle: vi.fn(),
        setFillColor: vi.fn(),
        setStrokeColor: vi.fn(),
        setFillStyle: vi.fn(),
        setStrokeStyle: vi.fn(),
        setLineWidth: vi.fn(),
        setOpacity: vi.fn(),
        setGlobalAlpha: vi.fn(),
        setLineDash: vi.fn(),
        setTextAlign: vi.fn(),
        setTextBaseline: vi.fn(),
        setFont: vi.fn(),

        // Clear and render
        clear: vi.fn(),
        clearRect: vi.fn(),
        present: vi.fn(),

        // Path drawing
        beginPath: vi.fn(),
        closePath: vi.fn(),
        moveTo: vi.fn(),
        lineTo: vi.fn(),
        quadraticCurveTo: vi.fn(),
        bezierCurveTo: vi.fn(),
        arc: vi.fn(),
        rect: vi.fn(),

        // Draw methods
        fill: vi.fn(),
        stroke: vi.fn(),
        fillRect: vi.fn(),
        strokeRect: vi.fn(),
        drawLine: vi.fn(),
        drawRect: vi.fn(),

        // Circle drawing
        fillCircle: vi.fn(),
        strokeCircle: vi.fn(),
        drawCircle: vi.fn(),

        // Text drawing
        fillText: vi.fn(),
        strokeText: vi.fn(),
        measureText: vi.fn().mockReturnValue({ width: 100, height: 16 }),

        // Image operations
        drawImage: vi.fn() as unknown as {
          (imageData: IImageData, dx: number, dy: number): void;
          (imageData: IImageData, dx: number, dy: number, dw: number, dh: number): void;
        },
        getImageData: vi.fn().mockReturnValue({
          width: 10,
          height: 10,
          data: new Uint8ClampedArray(400)
        }),
        putImageData: vi.fn(),

        // Clipping
        clip: vi.fn(),
        clipRect: vi.fn(),

        // Coordinate transformation
        screenToWorld: vi.fn().mockImplementation((p: IPoint) => p),
        worldToScreen: vi.fn().mockImplementation((p: IPoint) => p),

        // Resource management
        dispose: vi.fn()
      };
    });

    it('should have readonly basic properties', () => {
      expect(mockContext.width).toBe(800);
      expect(mockContext.height).toBe(600);
      expect(mockContext.devicePixelRatio).toBe(2);
    });

    it('should implement state management methods', () => {
      mockContext.save();
      expect(mockContext.save).toHaveBeenCalled();

      mockContext.restore();
      expect(mockContext.restore).toHaveBeenCalled();

      const state = mockContext.getState();
      expect(state.transform).toBeDefined();
      expect(state.style).toBeDefined();

      const newState = { style: { fillColor: 'red' } };
      mockContext.setState(newState);
      expect(mockContext.setState).toHaveBeenCalledWith(newState);
    });

    it('should implement transform operations', () => {
      const transform: ITransform = { a: 1, b: 0, c: 0, d: 1, e: 10, f: 20 };
      mockContext.setTransform(transform);
      expect(mockContext.setTransform).toHaveBeenCalledWith(transform);

      mockContext.transform(1, 0, 0, 1, 5, 10);
      expect(mockContext.transform).toHaveBeenCalledWith(1, 0, 0, 1, 5, 10);

      mockContext.translate(50, 100);
      expect(mockContext.translate).toHaveBeenCalledWith(50, 100);

      mockContext.rotate(Math.PI / 4);
      expect(mockContext.rotate).toHaveBeenCalledWith(Math.PI / 4);

      mockContext.scale(2, 1.5);
      expect(mockContext.scale).toHaveBeenCalledWith(2, 1.5);

      mockContext.resetTransform();
      expect(mockContext.resetTransform).toHaveBeenCalled();
    });

    it('should implement style setting methods', () => {
      const style: IGraphicsStyle = { fillColor: 'red', strokeColor: 'blue' };
      mockContext.setStyle(style);
      expect(mockContext.setStyle).toHaveBeenCalledWith(style);

      mockContext.setFillColor('green');
      expect(mockContext.setFillColor).toHaveBeenCalledWith('green');

      mockContext.setStrokeColor({ r: 255, g: 0, b: 0 });
      expect(mockContext.setStrokeColor).toHaveBeenCalledWith({ r: 255, g: 0, b: 0 });

      mockContext.setLineWidth(3);
      expect(mockContext.setLineWidth).toHaveBeenCalledWith(3);

      mockContext.setOpacity(0.7);
      expect(mockContext.setOpacity).toHaveBeenCalledWith(0.7);

      mockContext.setLineDash([5, 10, 5]);
      expect(mockContext.setLineDash).toHaveBeenCalledWith([5, 10, 5]);

      mockContext.setTextAlign('center');
      expect(mockContext.setTextAlign).toHaveBeenCalledWith('center');

      mockContext.setTextBaseline('middle');
      expect(mockContext.setTextBaseline).toHaveBeenCalledWith('middle');

      mockContext.setFont('16px Arial');
      expect(mockContext.setFont).toHaveBeenCalledWith('16px Arial');
    });

    it('should implement drawing methods', () => {
      mockContext.clear();
      expect(mockContext.clear).toHaveBeenCalled();

      mockContext.clearRect(10, 20, 100, 200);
      expect(mockContext.clearRect).toHaveBeenCalledWith(10, 20, 100, 200);

      mockContext.fillRect(5, 10, 50, 75);
      expect(mockContext.fillRect).toHaveBeenCalledWith(5, 10, 50, 75);

      mockContext.strokeRect(15, 25, 60, 85);
      expect(mockContext.strokeRect).toHaveBeenCalledWith(15, 25, 60, 85);

      mockContext.fillCircle(100, 100, 50);
      expect(mockContext.fillCircle).toHaveBeenCalledWith(100, 100, 50);

      mockContext.strokeCircle(200, 200, 75);
      expect(mockContext.strokeCircle).toHaveBeenCalledWith(200, 200, 75);
    });

    it('should implement text methods', () => {
      const textStyle: ITextStyle = { fontSize: 16, fontFamily: 'Arial' };
      mockContext.fillText('Hello', 10, 20, textStyle);
      expect(mockContext.fillText).toHaveBeenCalledWith('Hello', 10, 20, textStyle);

      mockContext.strokeText('World', 30, 40, textStyle);
      expect(mockContext.strokeText).toHaveBeenCalledWith('World', 30, 40, textStyle);

      const measurements = mockContext.measureText('Test', textStyle);
      expect(measurements).toEqual({ width: 100, height: 16 });
    });

    it('should implement image methods', () => {
      const imageData: IImageData = {
        width: 10,
        height: 10,
        data: new Uint8ClampedArray(400)
      };

      // Test two-parameter drawImage
      (mockContext.drawImage as any)(imageData, 50, 100);
      expect(mockContext.drawImage).toHaveBeenCalledWith(imageData, 50, 100);

      // Test four-parameter drawImage
      (mockContext.drawImage as any)(imageData, 50, 100, 20, 30);
      expect(mockContext.drawImage).toHaveBeenCalledWith(imageData, 50, 100, 20, 30);

      const retrievedImageData = mockContext.getImageData(0, 0, 10, 10);
      expect(retrievedImageData.width).toBe(10);
      expect(retrievedImageData.height).toBe(10);

      mockContext.putImageData(imageData, 100, 200);
      expect(mockContext.putImageData).toHaveBeenCalledWith(imageData, 100, 200);
    });

    it('should implement coordinate transformation methods', () => {
      const screenPoint: IPoint = { x: 100, y: 200 };
      const worldPoint = mockContext.screenToWorld(screenPoint);
      expect(mockContext.screenToWorld).toHaveBeenCalledWith(screenPoint);
      expect(worldPoint).toEqual(screenPoint);

      const convertedScreenPoint = mockContext.worldToScreen(worldPoint);
      expect(mockContext.worldToScreen).toHaveBeenCalledWith(worldPoint);
      expect(convertedScreenPoint).toEqual(worldPoint);
    });

    it('should implement disposal', () => {
      mockContext.dispose();
      expect(mockContext.dispose).toHaveBeenCalled();
    });
  });

  describe('IGraphicsContextFactory', () => {
    let mockFactory: IGraphicsContextFactory<HTMLCanvasElement>;

    beforeEach(() => {
      mockFactory = {
        createContext: vi.fn().mockResolvedValue({} as IGraphicsContext),
        isSupported: vi.fn().mockReturnValue(true),
        getCapabilities: vi.fn().mockReturnValue({
          supportsHardwareAcceleration: true,
          supportsTransforms: true,
          supportsFilters: true,
          supportsBlending: true,
          maxTextureSize: 4096,
          supportedFormats: ['rgba', 'rgb']
        })
      };
    });

    it('should implement factory methods', async () => {
      const canvas = document.createElement('canvas');

      const context = await mockFactory.createContext(canvas);
      expect(mockFactory.createContext).toHaveBeenCalledWith(canvas);
      expect(context).toBeDefined();

      const isSupported = mockFactory.isSupported();
      expect(mockFactory.isSupported).toHaveBeenCalled();
      expect(isSupported).toBe(true);

      const capabilities = mockFactory.getCapabilities();
      expect(mockFactory.getCapabilities).toHaveBeenCalled();
      expect(capabilities).toBeDefined();
    });

    it('should handle unsupported factory', () => {
      mockFactory.isSupported = vi.fn().mockReturnValue(false);
      const isSupported = mockFactory.isSupported();
      expect(isSupported).toBe(false);
    });

    it('should handle factory creation failure', async () => {
      mockFactory.createContext = vi.fn().mockRejectedValue(new Error('Creation failed'));
      const canvas = document.createElement('canvas');

      await expect(mockFactory.createContext(canvas)).rejects.toThrow('Creation failed');
    });
  });

  describe('IGraphicsCapabilities', () => {
    it('should define all capability properties', () => {
      const capabilities: IGraphicsCapabilities = {
        supportsHardwareAcceleration: true,
        supportsTransforms: true,
        supportsFilters: false,
        supportsBlending: true,
        maxTextureSize: 8192,
        supportedFormats: ['rgba', 'rgb', 'alpha', 'luminance']
      };

      expect(capabilities.supportsHardwareAcceleration).toBe(true);
      expect(capabilities.supportsTransforms).toBe(true);
      expect(capabilities.supportsFilters).toBe(false);
      expect(capabilities.supportsBlending).toBe(true);
      expect(capabilities.maxTextureSize).toBe(8192);
      expect(capabilities.supportedFormats).toHaveLength(4);
    });

    it('should support minimal capabilities', () => {
      const capabilities: IGraphicsCapabilities = {
        supportsHardwareAcceleration: false,
        supportsTransforms: false,
        supportsFilters: false,
        supportsBlending: false,
        maxTextureSize: 256,
        supportedFormats: []
      };

      expect(capabilities.supportsHardwareAcceleration).toBe(false);
      expect(capabilities.maxTextureSize).toBe(256);
      expect(capabilities.supportedFormats).toHaveLength(0);
    });

    it('should support extensive capabilities', () => {
      const capabilities: IGraphicsCapabilities = {
        supportsHardwareAcceleration: true,
        supportsTransforms: true,
        supportsFilters: true,
        supportsBlending: true,
        maxTextureSize: 16384,
        supportedFormats: [
          'rgba', 'rgb', 'alpha', 'luminance', 'luminance-alpha',
          'depth', 'depth-stencil', 'rgb565', 'rgba4444', 'rgba5551'
        ]
      };

      expect(capabilities.maxTextureSize).toBe(16384);
      expect(capabilities.supportedFormats).toHaveLength(10);
      expect(capabilities.supportedFormats).toContain('depth');
      expect(capabilities.supportedFormats).toContain('rgba5551');
    });
  });

  describe('Type combinations and edge cases', () => {
    it('should handle complex graphics state', () => {
      const complexState: IGraphicsState = {
        transform: {
          a: 2,     // 2x scale X
          b: 0.5,   // skew Y
          c: -0.3,  // skew X
          d: 1.5,   // 1.5x scale Y
          e: 100,   // translate X
          f: 200    // translate Y
        },
        style: {
          fillColor: { r: 255, g: 128, b: 64, a: 0.8 },
          strokeColor: 'hsla(240, 100%, 50%, 0.6)',
          lineWidth: 3.5,
          lineCap: 'round',
          lineJoin: 'bevel',
          opacity: 0.9,
          shadowColor: { r: 0, g: 0, b: 0, a: 0.3 },
          shadowBlur: 15,
          shadowOffsetX: 5,
          shadowOffsetY: -5
        }
      };

      expect(complexState.transform.a).toBe(2);
      expect(complexState.transform.b).toBe(0.5);
      expect(complexState.style.fillColor).toEqual({ r: 255, g: 128, b: 64, a: 0.8 });
      expect(complexState.style.strokeColor).toBe('hsla(240, 100%, 50%, 0.6)');
    });

    it('should handle complex text style with inheritance', () => {
      const complexTextStyle: ITextStyle = {
        // Graphics style properties
        fillColor: 'linear-gradient(to right, red, blue)',
        strokeColor: { r: 0, g: 0, b: 0, a: 1 },
        lineWidth: 0.5,
        opacity: 0.95,
        shadowColor: 'rgba(255, 255, 255, 0.5)',
        shadowBlur: 2,
        shadowOffsetX: 1,
        shadowOffsetY: 1,
        // Text-specific properties
        fontFamily: 'Helvetica Neue, Arial, sans-serif',
        fontSize: 24,
        fontWeight: 600,
        fontStyle: 'italic',
        textAlign: 'center',
        textBaseline: 'hanging'
      };

      // Test graphics properties
      expect(typeof complexTextStyle.fillColor).toBe('string');
      expect(complexTextStyle.strokeColor).toEqual({ r: 0, g: 0, b: 0, a: 1 });
      expect(complexTextStyle.opacity).toBe(0.95);

      // Test text properties
      expect(complexTextStyle.fontFamily).toBe('Helvetica Neue, Arial, sans-serif');
      expect(complexTextStyle.fontSize).toBe(24);
      expect(complexTextStyle.fontWeight).toBe(600);
    });

    it('should handle empty and null cases', () => {
      const emptyRect: IRect = { x: 0, y: 0, width: 0, height: 0 };
      const emptyImageData: IImageData = {
        width: 0,
        height: 0,
        data: new Uint8ClampedArray(0)
      };
      const identityTransform: ITransform = { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 };

      expect(emptyRect.width * emptyRect.height).toBe(0);
      expect(emptyImageData.data.length).toBe(0);
      expect(identityTransform.a * identityTransform.d).toBe(1);
    });

    it('should handle extreme coordinate values', () => {
      const extremePoint: IPoint = {
        x: Number.MAX_SAFE_INTEGER,
        y: Number.MIN_SAFE_INTEGER
      };
      const extremeRect: IRect = {
        x: -Number.MAX_SAFE_INTEGER,
        y: -Number.MAX_SAFE_INTEGER,
        width: Number.MAX_SAFE_INTEGER,
        height: Number.MAX_SAFE_INTEGER
      };

      expect(extremePoint.x).toBe(Number.MAX_SAFE_INTEGER);
      expect(extremePoint.y).toBe(Number.MIN_SAFE_INTEGER);
      expect(extremeRect.width).toBe(Number.MAX_SAFE_INTEGER);
      expect(extremeRect.height).toBe(Number.MAX_SAFE_INTEGER);
    });

    it('should handle mathematical operations with transforms', () => {
      // Test matrix multiplication properties
      const transform1: ITransform = { a: 2, b: 0, c: 0, d: 2, e: 10, f: 20 };
      const transform2: ITransform = { a: 0.5, b: 0, c: 0, d: 0.5, e: -5, f: -10 };

      // These would be combined in a real graphics context
      const combinedScale = transform1.a * transform2.a;
      const combinedTranslateX = transform1.e + transform2.e;

      expect(combinedScale).toBe(1); // 2 * 0.5 = 1 (identity)
      expect(combinedTranslateX).toBe(5); // 10 + (-5) = 5
    });
  });
});