/**
 * CircleMask 单元测试
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CircleMask, CircleMaskConfig, MaskBlendMode, MaskEdgeType, MaskShape, MaskType } from '../../masks';


describe('CircleMask', () => {
  let mask: CircleMask;
  let mockCanvas: HTMLCanvasElement;
  let mockContext: CanvasRenderingContext2D;
  let mockConfig: CircleMaskConfig;

  beforeEach(() => {
    mockConfig = {
      type: MaskType.CLIP,
      shape: MaskShape.CIRCLE,
      position: { x: 50, y: 50 },
      enabled: true,
      opacity: 1.0,
      blendMode: MaskBlendMode.NORMAL,
      edgeType: MaskEdgeType.HARD,
      radius: 25,
      inverted: false
    };

    mask = new CircleMask(mockConfig);

    mockCanvas = document.createElement('canvas');
    mockCanvas.width = 100;
    mockCanvas.height = 100;

    mockContext = mockCanvas.getContext('2d')!;
  });

  describe('基本功能', () => {
    it('应该能够创建圆形遮罩实例', () => {
      expect(mask).toBeDefined();
      expect(mask.id).toBeDefined();
      expect(mask.config).toEqual(mockConfig);
    });

    it('应该有正确的遮罩属性', () => {
      expect(mask.enabled).toBe(true);
      expect(mask.config.type).toBe(MaskType.CLIP);
      expect(mask.config.shape).toBe(MaskShape.CIRCLE);
      expect((mask.config as CircleMaskConfig).radius).toBe(25);
    });
  });

  describe('配置管理', () => {
    it('应该能够更新配置', () => {
      mask.updateConfig({ radius: 30 });
      expect((mask.config as CircleMaskConfig).radius).toBe(30);
    });

    it('应该能够启用和禁用遮罩', () => {
      expect(mask.enabled).toBe(true);

      mask.enabled = false;
      expect(mask.enabled).toBe(false);

      mask.enabled = true;
      expect(mask.enabled).toBe(true);
    });
  });

  describe('遮罩应用', () => {
    it('应该能够应用圆形遮罩到Canvas', () => {
      expect(() => {
        mask.apply(mockContext, mockCanvas);
      }).not.toThrow();

      // 验证Canvas 2D上下文方法被调用
      expect(mockContext.save).toHaveBeenCalled();
      expect(mockContext.restore).toHaveBeenCalled();
    });

    it('禁用时不应该应用遮罩', () => {
      mask.enabled = false;

      const saveCallCount = vi.mocked(mockContext.save).mock.calls.length;
      mask.apply(mockContext, mockCanvas);

      // save应该没有被额外调用
      expect(vi.mocked(mockContext.save).mock.calls.length).toBe(saveCallCount);
    });

    it('应该处理WebGL上下文（返回而不处理）', () => {
      const mockWebGLContext = {} as WebGLRenderingContext;

      expect(() => {
        mask.apply(mockWebGLContext, mockCanvas);
      }).not.toThrow();
    });
  });

  describe('圆形参数', () => {
    it('应该能够处理不同的位置', () => {
      const positions = [
        { x: 0, y: 0 },
        { x: 50, y: 50 },
        { x: 100, y: 100 }
      ];

      positions.forEach(position => {
        mask.updateConfig({ position });
        expect(() => {
          mask.apply(mockContext, mockCanvas);
        }).not.toThrow();
      });
    });

    it('应该能够处理不同的半径', () => {
      const radii = [1, 25, 50, 100];

      radii.forEach(radius => {
        mask.updateConfig({ radius });
        expect(() => {
          mask.apply(mockContext, mockCanvas);
        }).not.toThrow();
      });
    });
  });

  describe('反转效果', () => {
    it('应该能够处理反转遮罩', () => {
      mask.updateConfig({ inverted: true });

      expect(() => {
        mask.apply(mockContext, mockCanvas);
      }).not.toThrow();
    });
  });

  describe('透明度处理', () => {
    it('应该能够处理不同的透明度值', () => {
      const opacities = [0.0, 0.25, 0.5, 0.75, 1.0];

      opacities.forEach(opacity => {
        mask.updateConfig({ opacity });

        expect(() => {
          mask.apply(mockContext, mockCanvas);
        }).not.toThrow();
      });
    });
  });

  describe('点包含检测', () => {
    it('应该正确检测点是否在圆形内', () => {
      // 中心点
      expect(mask.contains({ x: 50, y: 50 })).toBe(true);

      // 圆内的点
      expect(mask.contains({ x: 60, y: 50 })).toBe(true);

      // 圆外的点
      expect(mask.contains({ x: 80, y: 50 })).toBe(false);
    });

    it('反转遮罩应该反转包含检测结果', () => {
      mask.updateConfig({ inverted: true });

      // 中心点（反转后应该为false）
      expect(mask.contains({ x: 50, y: 50 })).toBe(false);

      // 圆外的点（反转后应该为true）
      expect(mask.contains({ x: 80, y: 50 })).toBe(true);
    });
  });

  describe('边界检测', () => {
    it('应该能够获取正确的边界', () => {
      const bounds = mask.getBounds();

      expect(bounds.min.x).toBe(25); // 50 - 25
      expect(bounds.min.y).toBe(25); // 50 - 25
      expect(bounds.max.x).toBe(75); // 50 + 25
      expect(bounds.max.y).toBe(75); // 50 + 25
    });
  });

  describe('克隆功能', () => {
    it('应该能够克隆遮罩', () => {
      const clonedMask = mask.clone();

      expect(clonedMask).not.toBe(mask);
      expect(clonedMask.config).toEqual(mask.config);
      expect(clonedMask.id).not.toBe(mask.id); // ID应该不同
    });
  });

  describe('销毁功能', () => {
    it('应该能够销毁遮罩', () => {
      expect(() => {
        mask.dispose();
      }).not.toThrow();
    });
  });

  describe('遮罩类型处理', () => {
    it('应该能够处理不同的遮罩类型', () => {
      const maskTypes = [MaskType.CLIP, MaskType.ALPHA, MaskType.STENCIL, MaskType.INVERTED];

      maskTypes.forEach(type => {
        mask.updateConfig({ type });
        expect(() => {
          mask.apply(mockContext, mockCanvas);
        }).not.toThrow();
      });
    });
  });
});