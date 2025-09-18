/**
 * EllipseMask 单元测试
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Point2D } from '../../../animation/types/PathTypes';
import { EllipseMask, EllipseMaskConfig, MaskType } from '../../masks';


// Mock Canvas API
const mockCanvas = document.createElement('canvas');
mockCanvas.width = 200;
mockCanvas.height = 200;

const mockCtx = mockCanvas.getContext('2d') as CanvasRenderingContext2D;

// 重置所有mock调用
beforeEach(() => {
  vi.clearAllMocks();
});

const mockWebGLCtx = {} as WebGLRenderingContext;

// Shape mock
const mockShape = {
  id: 'test-shape',
  visible: true,
  zIndex: 1,
  bounds: {
    x: 0,
    y: 0,
    width: 100,
    height: 100,
    left: 0,
    right: 100,
    top: 0,
    bottom: 100,
    center: { x: 50, y: 50 }
  }
};

describe('EllipseMask', () => {
  let mask: EllipseMask;
  let config: EllipseMaskConfig;

  beforeEach(() => {
    vi.clearAllMocks();

    config = {
      type: MaskType.CLIP,
      shape: 'ellipse' as any,
      position: { x: 100, y: 100 },
      radiusX: 50,
      radiusY: 30,
      enabled: true,
      opacity: 1.0,
      blendMode: 'normal' as any,
      edgeType: 'hard' as any
    } as EllipseMaskConfig;

    mask = new EllipseMask(config);
  });

  describe('构造和基本属性', () => {
    it('应该正确初始化', () => {
      expect(mask).toBeInstanceOf(EllipseMask);
      expect(mask.config.type).toBe(MaskType.CLIP);
      expect(mask.config.position).toEqual({ x: 100, y: 100 });
      expect((mask.config as EllipseMaskConfig).radiusX).toBe(50);
      expect((mask.config as EllipseMaskConfig).radiusY).toBe(30);
    });

    it('应该正确存储配置', () => {
      const maskConfig = mask.config as EllipseMaskConfig;
      expect(maskConfig.radiusX).toBe(50);
      expect(maskConfig.radiusY).toBe(30);
      expect(maskConfig.position).toEqual(config.position);
    });
  });

  describe('apply方法', () => {
    it('应该对2D上下文应用剪切遮罩', () => {
      mask.apply(mockCtx, mockShape);

      expect(mockCtx.save).toHaveBeenCalled();
      expect(mockCtx.restore).toHaveBeenCalled();
      expect(mockCtx.beginPath).toHaveBeenCalled();
      expect(mockCtx.ellipse).toHaveBeenCalledWith(0, 0, 50, 30, 0, 0, Math.PI * 2);
      expect(mockCtx.closePath).toHaveBeenCalled();
      expect(mockCtx.clip).toHaveBeenCalled();
    });

    it('应该忽略WebGL上下文', () => {
      mask.apply(mockWebGLCtx, mockShape);

      // WebGL上下文不应该调用任何2D方法
      expect(mockCtx.save).not.toHaveBeenCalled();
    });

    it('应该在禁用时不执行任何操作', () => {
      const disabledConfig = { ...config, enabled: false };
      const disabledMask = new EllipseMask(disabledConfig);

      disabledMask.apply(mockCtx, mockShape);

      expect(mockCtx.save).not.toHaveBeenCalled();
    });

    it('应该应用旋转', () => {
      const rotatedConfig = { ...config, rotation: Math.PI / 4 };
      const rotatedMask = new EllipseMask(rotatedConfig);

      // 创建带有rotate spy的context
      const rotateSpy = vi.spyOn(mockCtx, 'rotate');

      rotatedMask.apply(mockCtx, mockShape);

      expect(rotateSpy).toHaveBeenCalledWith(Math.PI / 4);
    });

    describe('不同遮罩类型', () => {
      it('应该应用Alpha遮罩', () => {
        const alphaConfig = { ...config, type: MaskType.ALPHA };
        const alphaMask = new EllipseMask(alphaConfig);

        alphaMask.apply(mockCtx, mockShape);

        expect(mockCtx.fill).toHaveBeenCalled();
        expect(mockCtx.globalCompositeOperation).toBe('destination-in');
      });

      it('应该应用Alpha遮罩与羽化', () => {
        const featheredConfig = {
          ...config,
          type: MaskType.ALPHA,
          featherRadius: 10
        };
        const featheredMask = new EllipseMask(featheredConfig);

        featheredMask.apply(mockCtx, mockShape);

        expect(mockCtx.createRadialGradient).toHaveBeenCalled();
        expect(mockCtx.fill).toHaveBeenCalled();
      });

      it('应该应用Stencil遮罩', () => {
        const stencilConfig = { ...config, type: MaskType.STENCIL };
        const stencilMask = new EllipseMask(stencilConfig);

        stencilMask.apply(mockCtx, mockShape);

        expect(mockCtx.fill).toHaveBeenCalled();
        expect(mockCtx.globalCompositeOperation).toBe('source-in');
      });

      it('应该应用反转遮罩', () => {
        const invertedConfig = { ...config, type: MaskType.INVERTED };
        const invertedMask = new EllipseMask(invertedConfig);

        invertedMask.apply(mockCtx, mockShape);

        expect(mockCtx.beginPath).toHaveBeenCalled();
        expect(mockCtx.clip).toHaveBeenCalledWith('evenodd');
      });

      it('应该应用反转的剪切遮罩', () => {
        const invertedClipConfig = {
          ...config,
          type: MaskType.CLIP,
          inverted: true
        };
        const invertedClipMask = new EllipseMask(invertedClipConfig);

        invertedClipMask.apply(mockCtx, mockShape);

        expect(mockCtx.rect).toHaveBeenCalled();
        expect(mockCtx.clip).toHaveBeenCalledWith('evenodd');
      });
    });
  });

  describe('contains方法', () => {
    it('应该检测椭圆内的点', () => {
      const insidePoint: Point2D = { x: 100, y: 100 }; // 中心点
      expect(mask.contains(insidePoint)).toBe(true);

      const edgePoint: Point2D = { x: 150, y: 100 }; // 边缘点
      expect(mask.contains(edgePoint)).toBe(true);
    });

    it('应该拒绝椭圆外的点', () => {
      const outsidePoint: Point2D = { x: 200, y: 100 }; // 超出radiusX
      expect(mask.contains(outsidePoint)).toBe(false);

      const farPoint: Point2D = { x: 100, y: 200 }; // 超出radiusY
      expect(mask.contains(farPoint)).toBe(false);
    });

    it('应该正确处理旋转的椭圆', () => {
      const rotatedConfig = {
        ...config,
        rotation: Math.PI / 2 // 90度旋转
      };
      const rotatedMask = new EllipseMask(rotatedConfig);

      // 旋转后，原本在X轴上的点现在应该在Y轴上
      const point: Point2D = { x: 100, y: 150 }; // 现在应该在椭圆内
      expect(rotatedMask.contains(point)).toBe(true);
    });

    it('应该正确处理反转遮罩的点测试', () => {
      const invertedConfig = { ...config, inverted: true };
      const invertedMask = new EllipseMask(invertedConfig);

      const insidePoint: Point2D = { x: 100, y: 100 };
      const outsidePoint: Point2D = { x: 200, y: 200 };

      expect(invertedMask.contains(insidePoint)).toBe(false); // 反转
      expect(invertedMask.contains(outsidePoint)).toBe(true); // 反转
    });
  });

  describe('getBounds方法', () => {
    it('应该返回正确的边界框（无旋转）', () => {
      const bounds = mask.getBounds();

      expect(bounds.min.x).toBe(50);  // 100 - 50
      expect(bounds.min.y).toBe(70);  // 100 - 30
      expect(bounds.max.x).toBe(150); // 100 + 50
      expect(bounds.max.y).toBe(130); // 100 + 30
    });

    it('应该计算旋转椭圆的边界框', () => {
      const rotatedConfig = {
        ...config,
        rotation: Math.PI / 4 // 45度旋转
      };
      const rotatedMask = new EllipseMask(rotatedConfig);

      const bounds = rotatedMask.getBounds();

      // 旋转后的边界应该更大
      expect(bounds.min.x).toBeLessThan(60); // 调整为更合理的期望值
      expect(bounds.min.y).toBeLessThan(70);
      expect(bounds.max.x).toBeGreaterThan(140); // 调整为更合理的期望值
      expect(bounds.max.y).toBeGreaterThan(130);

      // 应该是对称的
      const centerX = (bounds.min.x + bounds.max.x) / 2;
      const centerY = (bounds.min.y + bounds.max.y) / 2;
      expect(centerX).toBeCloseTo(100, 1);
      expect(centerY).toBeCloseTo(100, 1);
    });
  });

  describe('clone方法', () => {
    it('应该创建相同的副本', () => {
      const cloned = mask.clone();

      expect(cloned).not.toBe(mask);
      expect(cloned).toBeInstanceOf(EllipseMask);
      expect(cloned.config).toEqual(mask.config);
    });

    it('克隆应该是独立的', () => {
      const cloned = mask.clone() as EllipseMask;

      // 修改原始遮罩的配置
      mask.updateConfig({ opacity: 0.5 });

      // 克隆应该不受影响
      expect(cloned.config.opacity).toBe(1.0);
      expect(mask.config.opacity).toBe(0.5);
    });
  });

  describe('边界情况', () => {
    it('应该处理零半径', () => {
      const zeroConfig = { ...config, radiusX: 0, radiusY: 0 };
      const zeroMask = new EllipseMask(zeroConfig);

      expect(() => {
        zeroMask.apply(mockCtx, mockShape);
      }).not.toThrow();

      const bounds = zeroMask.getBounds();
      expect(bounds.min.x).toBe(bounds.max.x);
      expect(bounds.min.y).toBe(bounds.max.y);
    });

    it('应该处理很大的半径', () => {
      const largeConfig = {
        ...config,
        radiusX: 1000,
        radiusY: 1000
      };
      const largeMask = new EllipseMask(largeConfig);

      expect(() => {
        largeMask.apply(mockCtx, mockShape);
      }).not.toThrow();

      const bounds = largeMask.getBounds();
      expect(bounds.max.x - bounds.min.x).toBe(2000);
      expect(bounds.max.y - bounds.min.y).toBe(2000);
    });

    it('应该处理负位置', () => {
      const negativeConfig = {
        ...config,
        position: { x: -50, y: -50 }
      };
      const negativeMask = new EllipseMask(negativeConfig);

      expect(() => {
        negativeMask.apply(mockCtx, mockShape);
      }).not.toThrow();

      const bounds = negativeMask.getBounds();
      expect(bounds.min.x).toBe(-100); // -50 - 50
      expect(bounds.min.y).toBe(-80);  // -50 - 30
    });
  });

  describe('性能测试', () => {
    it('应该快速执行点包含测试', () => {
      const iterations = 10000;
      const testPoint: Point2D = { x: 125, y: 115 };

      const startTime = performance.now();

      for (let i = 0; i < iterations; i++) {
        mask.contains(testPoint);
      }

      const endTime = performance.now();
      const duration = endTime - startTime;

      expect(duration).toBeLessThan(100); // 应该在100ms内完成
    });

    it('应该快速计算边界框', () => {
      const iterations = 1000;

      const startTime = performance.now();

      for (let i = 0; i < iterations; i++) {
        mask.getBounds();
      }

      const endTime = performance.now();
      const duration = endTime - startTime;

      expect(duration).toBeLessThan(50); // 应该在50ms内完成
    });
  });

  describe('数学精度测试', () => {
    it('应该正确实现椭圆方程', () => {
      // 测试标准椭圆方程: (x-h)²/a² + (y-k)²/b² = 1
      const center = config.position;
      const a = config.radiusX;
      const b = config.radiusY;

      // 测试椭圆边界上的点
      const rightPoint: Point2D = { x: center.x + a, y: center.y };
      const topPoint: Point2D = { x: center.x, y: center.y - b };
      const leftPoint: Point2D = { x: center.x - a, y: center.y };
      const bottomPoint: Point2D = { x: center.x, y: center.y + b };

      expect(mask.contains(rightPoint)).toBe(true);
      expect(mask.contains(topPoint)).toBe(true);
      expect(mask.contains(leftPoint)).toBe(true);
      expect(mask.contains(bottomPoint)).toBe(true);

      // 测试稍微超出边界的点
      const outsideRight: Point2D = { x: center.x + a + 1, y: center.y };
      const outsideTop: Point2D = { x: center.x, y: center.y - b - 1 };

      expect(mask.contains(outsideRight)).toBe(false);
      expect(mask.contains(outsideTop)).toBe(false);
    });
  });
});