/**
 * 遮罩系统测试
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { 
  MaskManager,
  MaskFactory,
  MaskRenderer,
  MaskType,
  MaskShape,
  MaskBlendMode,
  MaskEdgeType,
  createCircleClip,
  createRectangleClip
} from '../masks';

// Mock DOM APIs
Object.defineProperty(global, 'CanvasRenderingContext2D', {
  value: class MockCanvasRenderingContext2D {},
  writable: true
});

Object.defineProperty(global, 'Path2D', {
  value: class MockPath2D {
    constructor(path?: string) {}
  },
  writable: true
});

Object.defineProperty(global, 'document', {
  value: {
    createElement: vi.fn(() => ({
      width: 800,
      height: 600,
      getContext: vi.fn(() => mockContext)
    }))
  },
  writable: true
});

// Mock Canvas API
const mockCanvas = {
  width: 800,
  height: 600
} as HTMLCanvasElement;

// 创建在全局定义之后
let mockContext: any;

describe('遮罩系统', () => {
  let maskManager: MaskManager;
  let maskFactory: MaskFactory;
  let maskRenderer: MaskRenderer;

  beforeEach(() => {
    mockContext = {
      canvas: mockCanvas,
      save: vi.fn(),
      restore: vi.fn(),
      translate: vi.fn(),
      rotate: vi.fn(),
      scale: vi.fn(),
      clip: vi.fn(),
      fill: vi.fn(),
      stroke: vi.fn(),
      beginPath: vi.fn(),
      closePath: vi.fn(),
      moveTo: vi.fn(),
      lineTo: vi.fn(),
      arc: vi.fn(),
      ellipse: vi.fn(),
      rect: vi.fn(),
      quadraticCurveTo: vi.fn(),
      addPath: vi.fn(),
      isPointInPath: vi.fn(),
      createRadialGradient: vi.fn(() => ({
        addColorStop: vi.fn()
      })),
      createLinearGradient: vi.fn(() => ({
        addColorStop: vi.fn()
      })),
      drawImage: vi.fn(),
      getImageData: vi.fn(() => ({
        data: new Uint8ClampedArray([255, 255, 255, 255])
      })),
      measureText: vi.fn(() => ({ width: 100 })),
      globalAlpha: 1,
      globalCompositeOperation: 'source-over',
      fillStyle: '#000000',
      strokeStyle: '#000000',
      lineWidth: 1,
      font: '16px Arial',
      textAlign: 'left',
      textBaseline: 'top',
      shadowColor: 'transparent',
      shadowBlur: 0
    };

    // 让mockContext是CanvasRenderingContext2D的实例
    Object.setPrototypeOf(mockContext, global.CanvasRenderingContext2D.prototype);

    maskManager = new MaskManager();
    maskFactory = new MaskFactory();
    maskRenderer = new MaskRenderer();
    vi.clearAllMocks();
  });

  describe('MaskFactory', () => {
    it('应该创建矩形遮罩', () => {
      const mask = maskFactory.createRectangleMask({
        type: MaskType.CLIP,
        position: { x: 100, y: 100 },
        width: 200,
        height: 150,
        enabled: true,
        opacity: 1,
        blendMode: MaskBlendMode.NORMAL,
        edgeType: MaskEdgeType.HARD
      });

      expect(mask.id).toMatch(/^mask_/);
      expect(mask.config.type).toBe(MaskType.CLIP);
      expect(mask.config.shape).toBe(MaskShape.RECTANGLE);
      expect(mask.enabled).toBe(true);
    });

    it('应该创建圆形遮罩', () => {
      const mask = maskFactory.createCircleMask({
        type: MaskType.ALPHA,
        position: { x: 50, y: 50 },
        radius: 30,
        enabled: true,
        opacity: 0.8,
        blendMode: MaskBlendMode.NORMAL,
        edgeType: MaskEdgeType.FEATHERED,
        featherRadius: 10
      });

      expect(mask.config.shape).toBe(MaskShape.CIRCLE);
      expect(mask.config.type).toBe(MaskType.ALPHA);
      expect(mask.config.opacity).toBe(0.8);
      expect(mask.config.featherRadius).toBe(10);
    });

    it('应该创建椭圆遮罩', () => {
      const mask = maskFactory.createEllipseMask({
        type: MaskType.CLIP,
        position: { x: 0, y: 0 },
        radiusX: 50,
        radiusY: 30,
        rotation: Math.PI / 4,
        enabled: true,
        opacity: 1,
        blendMode: MaskBlendMode.NORMAL,
        edgeType: MaskEdgeType.HARD
      });

      expect(mask.config.shape).toBe(MaskShape.ELLIPSE);
      expect((mask.config as any).radiusX).toBe(50);
      expect((mask.config as any).radiusY).toBe(30);
      expect((mask.config as any).rotation).toBe(Math.PI / 4);
    });

    it('应该创建多边形遮罩', () => {
      const points = [
        { x: 0, y: 0 },
        { x: 50, y: 0 },
        { x: 25, y: 50 }
      ];

      const mask = maskFactory.createPolygonMask({
        type: MaskType.CLIP,
        position: { x: 100, y: 100 },
        points,
        enabled: true,
        opacity: 1,
        blendMode: MaskBlendMode.NORMAL,
        edgeType: MaskEdgeType.HARD
      });

      expect(mask.config.shape).toBe(MaskShape.POLYGON);
      expect((mask.config as any).points).toEqual(points);
    });
  });

  describe('MaskManager', () => {
    it('应该创建和管理遮罩', () => {
      const config = {
        type: MaskType.CLIP,
        shape: MaskShape.CIRCLE,
        position: { x: 50, y: 50 },
        radius: 25,
        enabled: true,
        opacity: 1,
        blendMode: MaskBlendMode.NORMAL,
        edgeType: MaskEdgeType.HARD
      } as any;

      const mask = maskManager.createMask(config);

      expect(mask).toBeDefined();
      expect(maskManager.getAllMasks()).toHaveLength(1);
      expect(maskManager.getMask(mask.id)).toBe(mask);
    });

    it('应该移除遮罩', () => {
      const config = {
        type: MaskType.CLIP,
        shape: MaskShape.RECTANGLE,
        position: { x: 0, y: 0 },
        width: 100,
        height: 100,
        enabled: true,
        opacity: 1,
        blendMode: MaskBlendMode.NORMAL,
        edgeType: MaskEdgeType.HARD
      } as any;

      const mask = maskManager.createMask(config);
      const removed = maskManager.removeMask(mask.id);

      expect(removed).toBe(true);
      expect(maskManager.getAllMasks()).toHaveLength(0);
      expect(maskManager.getMask(mask.id)).toBeUndefined();
    });

    it('应该启用/禁用遮罩', () => {
      const config = {
        type: MaskType.CLIP,
        shape: MaskShape.CIRCLE,
        position: { x: 50, y: 50 },
        radius: 25,
        enabled: true,
        opacity: 1,
        blendMode: MaskBlendMode.NORMAL,
        edgeType: MaskEdgeType.HARD
      } as any;

      const mask = maskManager.createMask(config);
      
      maskManager.setMaskEnabled(mask.id, false);
      expect(mask.enabled).toBe(false);

      maskManager.setMaskEnabled(mask.id, true);
      expect(mask.enabled).toBe(true);
    });

    it('应该获取统计信息', () => {
      // 创建多个遮罩
      for (let i = 0; i < 3; i++) {
        maskManager.createMask({
          type: MaskType.CLIP,
          shape: MaskShape.CIRCLE,
          position: { x: i * 50, y: i * 50 },
          radius: 25,
          enabled: i < 2, // 前两个启用
          opacity: 1,
          blendMode: MaskBlendMode.NORMAL,
          edgeType: MaskEdgeType.HARD
        } as any);
      }

      const stats = maskManager.getStats();
      expect(stats.totalMasks).toBe(3);
      expect(stats.enabledMasks).toBe(2);
      expect(stats.activeMasks).toBe(2);
    });

    it('应该清除所有遮罩', () => {
      // 创建几个遮罩
      for (let i = 0; i < 3; i++) {
        maskManager.createMask({
          type: MaskType.CLIP,
          shape: MaskShape.CIRCLE,
          position: { x: i * 50, y: i * 50 },
          radius: 25,
          enabled: true,
          opacity: 1,
          blendMode: MaskBlendMode.NORMAL,
          edgeType: MaskEdgeType.HARD
        } as any);
      }

      expect(maskManager.getAllMasks()).toHaveLength(3);

      maskManager.clear();
      expect(maskManager.getAllMasks()).toHaveLength(0);
    });

    it('应该克隆遮罩', () => {
      const config = {
        type: MaskType.CLIP,
        shape: MaskShape.RECTANGLE,
        position: { x: 100, y: 100 },
        width: 200,
        height: 150,
        enabled: true,
        opacity: 1,
        blendMode: MaskBlendMode.NORMAL,
        edgeType: MaskEdgeType.HARD
      } as any;

      const originalMask = maskManager.createMask(config);
      const clonedMask = maskManager.cloneMask(originalMask.id);

      expect(clonedMask).toBeDefined();
      expect(clonedMask!.id).not.toBe(originalMask.id);
      expect(clonedMask!.config).toEqual(originalMask.config);
      expect(maskManager.getAllMasks()).toHaveLength(2);
    });
  });

  describe('遮罩应用', () => {
    it('应该应用圆形剪切遮罩', () => {
      const mask = createCircleClip({ x: 50, y: 50 }, 25);
      mask.apply(mockContext, mockCanvas);

      expect(mockContext.save).toHaveBeenCalled();
      expect(mockContext.translate).toHaveBeenCalledWith(50, 50);
      expect(mockContext.beginPath).toHaveBeenCalled();
      expect(mockContext.arc).toHaveBeenCalledWith(0, 0, 25, 0, Math.PI * 2);
      expect(mockContext.clip).toHaveBeenCalled();
      expect(mockContext.restore).toHaveBeenCalled();
    });

    it('应该应用矩形剪切遮罩', () => {
      const mask = createRectangleClip({ x: 100, y: 100 }, 200, 150);
      mask.apply(mockContext, mockCanvas);

      expect(mockContext.save).toHaveBeenCalled();
      expect(mockContext.translate).toHaveBeenCalledWith(100, 100);
      expect(mockContext.beginPath).toHaveBeenCalled();
      expect(mockContext.rect).toHaveBeenCalledWith(-100, -75, 200, 150);
      expect(mockContext.clip).toHaveBeenCalled();
      expect(mockContext.restore).toHaveBeenCalled();
    });
  });

  describe('遮罩碰撞检测', () => {
    it('应该正确检测圆形遮罩内的点', () => {
      const mask = createCircleClip({ x: 50, y: 50 }, 25);

      expect(mask.contains({ x: 50, y: 50 })).toBe(true); // 中心
      expect(mask.contains({ x: 60, y: 60 })).toBe(true); // 内部
      expect(mask.contains({ x: 100, y: 100 })).toBe(false); // 外部
    });

    it('应该正确检测矩形遮罩内的点', () => {
      const mask = createRectangleClip({ x: 100, y: 100 }, 200, 150);

      expect(mask.contains({ x: 100, y: 100 })).toBe(true); // 中心
      expect(mask.contains({ x: 150, y: 120 })).toBe(true); // 内部
      expect(mask.contains({ x: 250, y: 250 })).toBe(false); // 外部
    });
  });

  describe('遮罩边界', () => {
    it('应该正确计算圆形遮罩边界', () => {
      const mask = createCircleClip({ x: 50, y: 50 }, 25);
      const bounds = mask.getBounds();

      expect(bounds.min).toEqual({ x: 25, y: 25 });
      expect(bounds.max).toEqual({ x: 75, y: 75 });
    });

    it('应该正确计算矩形遮罩边界', () => {
      const mask = createRectangleClip({ x: 100, y: 100 }, 200, 150);
      const bounds = mask.getBounds();

      expect(bounds.min).toEqual({ x: 0, y: 25 });
      expect(bounds.max).toEqual({ x: 200, y: 175 });
    });
  });

  describe('MaskRenderer', () => {
    it('应该渲染单个遮罩', () => {
      const mask = createCircleClip({ x: 50, y: 50 }, 25);
      maskRenderer.render(mask, mockContext);

      expect(mockContext.save).toHaveBeenCalled();
      expect(mockContext.restore).toHaveBeenCalled();
    });

    it('应该渲染遮罩组', () => {
      const masks = [
        createCircleClip({ x: 50, y: 50 }, 25),
        createRectangleClip({ x: 100, y: 100 }, 100, 100)
      ];

      maskRenderer.renderMaskGroup(masks, mockContext);

      expect(mockContext.save).toHaveBeenCalled();
      expect(mockContext.restore).toHaveBeenCalled();
    });
  });

  describe('便捷函数', () => {
    it('应该创建圆形剪切遮罩', () => {
      const mask = createCircleClip({ x: 50, y: 50 }, 25);
      
      expect(mask.config.type).toBe(MaskType.CLIP);
      expect(mask.config.shape).toBe(MaskShape.CIRCLE);
      expect((mask.config as any).radius).toBe(25);
    });

    it('应该创建矩形剪切遮罩', () => {
      const mask = createRectangleClip({ x: 100, y: 100 }, 200, 150);
      
      expect(mask.config.type).toBe(MaskType.CLIP);
      expect(mask.config.shape).toBe(MaskShape.RECTANGLE);
      expect((mask.config as any).width).toBe(200);
      expect((mask.config as any).height).toBe(150);
    });
  });

  describe('事件系统', () => {
    it('应该触发遮罩创建事件', () => {
      const createCallback = vi.fn();
      maskManager.on('maskCreated', createCallback);

      const config = {
        type: MaskType.CLIP,
        shape: MaskShape.CIRCLE,
        position: { x: 50, y: 50 },
        radius: 25,
        enabled: true,
        opacity: 1,
        blendMode: MaskBlendMode.NORMAL,
        edgeType: MaskEdgeType.HARD
      } as any;

      const mask = maskManager.createMask(config);

      expect(createCallback).toHaveBeenCalledWith(mask);
    });

    it('应该触发遮罩移除事件', () => {
      const removeCallback = vi.fn();
      maskManager.on('maskRemoved', removeCallback);

      const config = {
        type: MaskType.CLIP,
        shape: MaskShape.CIRCLE,
        position: { x: 50, y: 50 },
        radius: 25,
        enabled: true,
        opacity: 1,
        blendMode: MaskBlendMode.NORMAL,
        edgeType: MaskEdgeType.HARD
      } as any;

      const mask = maskManager.createMask(config);
      maskManager.removeMask(mask.id);

      expect(removeCallback).toHaveBeenCalledWith(mask.id);
    });
  });
});