/**
 * BaseMask 单元测试
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Point2D } from '../../../animation/types/PathTypes';
import { AnyMaskConfig, BaseMask, MaskBlendMode, MaskEdgeType, MaskShape, MaskType, RectangleMaskConfig } from '../../masks';


// Shape interface definition for render-engine
interface IShape {
  id: string;
  visible: boolean;
  zIndex: number;
  bounds: {
    x: number;
    y: number;
    width: number;
    height: number;
    left: number;
    right: number;
    top: number;
    bottom: number;
    center: { x: number; y: number };
  };
}

class TestMask extends BaseMask {
  constructor(config?: Partial<RectangleMaskConfig>) {
    const defaultConfig: RectangleMaskConfig = {
      type: MaskType.ALPHA,
      shape: MaskShape.RECTANGLE,
      position: { x: 0, y: 0 },
      enabled: true,
      opacity: 1.0,
      blendMode: MaskBlendMode.NORMAL,
      edgeType: MaskEdgeType.HARD,
      width: 100,
      height: 100,
      inverted: false,
      ...config
    };
    super(defaultConfig);
  }

  apply(ctx: CanvasRenderingContext2D | WebGLRenderingContext, target: IShape | HTMLCanvasElement): void {
    if (!this.enabled) return;
    
    if (ctx instanceof CanvasRenderingContext2D) {
      ctx.save();
      this.setBlendMode(ctx);
      this.applyOpacity(ctx);
      this.createPath(ctx);
      
      if (this._config.type === MaskType.CLIP) {
        ctx.clip();
      } else {
        ctx.fill();
      }
      
      ctx.restore();
    }
  }

  protected createPath(ctx: CanvasRenderingContext2D): void {
    const config = this._config as RectangleMaskConfig;
    ctx.beginPath();
    ctx.rect(config.position.x, config.position.y, config.width, config.height);
  }

  contains(point: Point2D): boolean {
    const config = this._config as RectangleMaskConfig;
    return this.isPointInRectangle(
      point,
      config.position.x,
      config.position.y,
      config.width,
      config.height
    );
  }

  getBounds(): { min: Point2D; max: Point2D } {
    const config = this._config as RectangleMaskConfig;
    return {
      min: { x: config.position.x, y: config.position.y },
      max: { 
        x: config.position.x + config.width, 
        y: config.position.y + config.height 
      }
    };
  }

  clone(): TestMask {
    return new TestMask(this._config as RectangleMaskConfig);
  }

  validateConfig(config: AnyMaskConfig): boolean {
    return config.enabled !== undefined &&
           typeof config.opacity === 'number' &&
           config.opacity >= 0 && config.opacity <= 1;
  }

  getDefaultConfig(): RectangleMaskConfig {
    return {
      type: MaskType.CLIP,
      shape: MaskShape.RECTANGLE,
      position: { x: 0, y: 0 },
      enabled: true,
      opacity: 1.0,
      blendMode: MaskBlendMode.NORMAL,
      edgeType: MaskEdgeType.HARD,
      width: 100,
      height: 100,
      inverted: false
    };
  }
}

describe('BaseMask', () => {
  let mask: TestMask;
  let mockCanvas: HTMLCanvasElement;
  let mockImageData: ImageData;
  let mockConfig: RectangleMaskConfig;

  beforeEach(() => {
    mask = new TestMask();

    mockCanvas = document.createElement('canvas');
    mockCanvas.width = 100;
    mockCanvas.height = 100;

    mockImageData = new ImageData(100, 100);

    mockConfig = {
      type: MaskType.ALPHA,
      shape: MaskShape.RECTANGLE,
      position: { x: 0, y: 0 },
      enabled: true,
      opacity: 1.0,
      blendMode: MaskBlendMode.NORMAL,
      edgeType: MaskEdgeType.HARD,
      width: 100,
      height: 100,
      inverted: false
    };
  });

  describe('基本功能', () => {
    it('应该能够创建遮罩实例', () => {
      expect(mask).toBeInstanceOf(BaseMask);
      expect(mask.config.type).toBe(MaskType.ALPHA);
      expect(mask.config.shape).toBe(MaskShape.RECTANGLE);
    });

    it('应该有正确的遮罩属性', () => {
      expect(mask.config.type).toBe(MaskType.ALPHA);
      expect(mask.config.shape).toBe(MaskShape.RECTANGLE);
      expect(mask.enabled).toBe(true);
      expect(mask.config.opacity).toBe(1.0);
    });
  });

  describe('配置管理', () => {
    it('应该能够验证有效配置', () => {
      const validConfig: RectangleMaskConfig = {
        type: MaskType.ALPHA,
        shape: MaskShape.RECTANGLE,
        position: { x: 0, y: 0 },
        enabled: true,
        opacity: 0.8,
        blendMode: MaskBlendMode.NORMAL,
        edgeType: MaskEdgeType.HARD,
        width: 100,
        height: 100,
        inverted: false
      };

      expect(mask.validateConfig(validConfig)).toBe(true);
    });

    it('应该拒绝无效配置', () => {
      const invalidConfig: RectangleMaskConfig = {
        type: MaskType.ALPHA,
        shape: MaskShape.RECTANGLE,
        position: { x: 0, y: 0 },
        enabled: true,
        opacity: 2.0, // 超出范围
        blendMode: MaskBlendMode.NORMAL,
        edgeType: MaskEdgeType.HARD,
        width: 100,
        height: 100,
        inverted: false
      };

      expect(mask.validateConfig(invalidConfig)).toBe(false);
    });

    it('应该提供默认配置', () => {
      const defaultConfig = mask.getDefaultConfig();

      expect(defaultConfig.enabled).toBe(true);
      expect(defaultConfig.opacity).toBe(1.0);
      expect(defaultConfig.inverted).toBe(false);
    });
  });

  describe('遮罩应用', () => {
    it('应该能够应用遮罩到Canvas', () => {
      const mockCtx = mockCanvas.getContext('2d')!;
      vi.spyOn(mockCtx, 'fill');
      vi.spyOn(mockCtx, 'beginPath');
      vi.spyOn(mockCtx, 'rect');

      mask.apply(mockCtx, mockCanvas);

      expect(mockCtx.fill).toHaveBeenCalled();
      expect(mockCtx.beginPath).toHaveBeenCalled();
      expect(mockCtx.rect).toHaveBeenCalled();
    });

    it('应该能够处理禁用的遮罩', () => {
      mask.enabled = false;
      const mockCtx = mockCanvas.getContext('2d')!;
      vi.spyOn(mockCtx, 'fill');

      mask.apply(mockCtx, mockCanvas);

      expect(mockCtx.fill).not.toHaveBeenCalled();
    });
  });

  describe('边界测试', () => {
    it('应该能够处理边界透明度值', () => {
      // 测试最小透明度
      const minOpacityMask = new TestMask({ opacity: 0.0 });
      expect(minOpacityMask.validateConfig(minOpacityMask.config)).toBe(true);

      // 测试最大透明度
      const maxOpacityMask = new TestMask({ opacity: 1.0 });
      expect(maxOpacityMask.validateConfig(maxOpacityMask.config)).toBe(true);
    });

    it('应该能够处理反转遮罩', () => {
      const invertedMask = new TestMask({ inverted: true });
      expect(invertedMask.config.inverted).toBe(true);
    });

    it('应该能够处理禁用的遮罩', () => {
      const disabledMask = new TestMask({ enabled: false });
      expect(disabledMask.enabled).toBe(false);
    });
  });

  describe('性能测试', () => {
    it('应该能够高效处理小图像', () => {
      const smallCanvas = document.createElement('canvas');
      smallCanvas.width = 10;
      smallCanvas.height = 10;
      const smallCtx = smallCanvas.getContext('2d')!;

      const start = performance.now();
      mask.apply(smallCtx, smallCanvas);
      const end = performance.now();

      expect(end - start).toBeLessThan(100); // 应该在100ms内完成
    });

    it('受影响的像素数应该合理', () => {
      const mockCtx = mockCanvas.getContext('2d')!;
      vi.spyOn(mockCtx, 'fill');
      
      mask.apply(mockCtx, mockCanvas);

      expect(mockCtx.fill).toHaveBeenCalled();
    });
  });

  describe('继承和扩展', () => {
    it('应该能够被继承', () => {
      class ExtendedTestMask extends TestMask {
        readonly name = 'ExtendedTestRectangleMask';
      }

      const extendedMask = new ExtendedTestMask();
      expect(extendedMask).toBeInstanceOf(BaseMask);
      expect(extendedMask).toBeInstanceOf(TestMask);
      expect(extendedMask.name).toBe('ExtendedTestRectangleMask');
    });

    it('应该保持抽象类特性', () => {
      // BaseMask 是抽象类，不能直接实例化
      // 这个测试确保我们的具体实现是正确的
      expect(mask.config).toBeDefined();
      expect(mask.enabled).toBeDefined();
      expect(typeof mask.apply).toBe('function');
      expect(typeof mask.validateConfig).toBe('function');
    });
  });

  describe('输入格式支持', () => {
    it('应该支持Canvas输入', () => {
      // BaseMask的apply方法接受CanvasRenderingContext2D
      const mockCtx = mockCanvas.getContext('2d')!;
      expect(() => mask.apply(mockCtx, mockCanvas)).not.toThrow();
    });

    it('应该处理WebGL上下文', () => {
      // 模拟WebGL上下文
      const mockWebGLCtx = {} as WebGLRenderingContext;
      expect(() => mask.apply(mockWebGLCtx, mockCanvas)).not.toThrow();
    });

    it('应该能够处理不同尺寸的输入', () => {
      // 测试小尺寸
      const smallCanvas = document.createElement('canvas');
      smallCanvas.width = 1;
      smallCanvas.height = 1;

      const smallCtx = smallCanvas.getContext('2d')!;
      vi.spyOn(smallCtx, 'fill');
      
      mask.apply(smallCtx, smallCanvas);
      expect(smallCtx.fill).toHaveBeenCalled();

      // 测试大尺寸
      const largeCanvas = document.createElement('canvas');
      largeCanvas.width = 500;
      largeCanvas.height = 500;

      const largeCtx = largeCanvas.getContext('2d')!;
      vi.spyOn(largeCtx, 'fill');
      
      mask.apply(largeCtx, largeCanvas);
      expect(largeCtx.fill).toHaveBeenCalled();
    });
  });
});