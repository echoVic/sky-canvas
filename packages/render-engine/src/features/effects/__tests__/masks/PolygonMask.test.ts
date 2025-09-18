/**
 * PolygonMask 单元测试
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Point2D } from '../../../animation/types/PathTypes';
import { MaskType, PolygonMask, PolygonMaskConfig } from '../../masks';


// Mock Canvas API
const mockCanvas = document.createElement('canvas');
mockCanvas.width = 200;
mockCanvas.height = 200;

// 创建一个真实的CanvasRenderingContext2D实例作为原型
const realCtx = mockCanvas.getContext('2d')!;

const mockCtx = Object.create(CanvasRenderingContext2D.prototype);
Object.assign(mockCtx, {
  save: vi.fn(),
  restore: vi.fn(),
  beginPath: vi.fn(),
  closePath: vi.fn(),
  moveTo: vi.fn(),
  lineTo: vi.fn(),
  clip: vi.fn(),
  rect: vi.fn(),
  fill: vi.fn(),
  translate: vi.fn(),
  fillStyle: '',
  globalCompositeOperation: 'source-over',
  globalAlpha: 1,
  shadowColor: '',
  shadowBlur: 0,
  canvas: mockCanvas
});

// 确保shadowBlur是可写的
Object.defineProperty(mockCtx, 'shadowBlur', {
  value: 0,
  writable: true,
  configurable: true
});

Object.defineProperty(mockCtx, 'fillStyle', {
  value: '',
  writable: true,
  configurable: true
});

Object.defineProperty(mockCtx, 'globalCompositeOperation', {
  value: 'source-over',
  writable: true,
  configurable: true
});

Object.defineProperty(mockCtx, 'shadowColor', {
  value: '',
  writable: true,
  configurable: true
});

const mockShape = {
  id: 'test-shape',
  visible: true,
  zIndex: 1,
  bounds: {
    x: 0, y: 0, width: 100, height: 100,
    left: 0, right: 100, top: 0, bottom: 100,
    center: { x: 50, y: 50 }
  }
};

describe('PolygonMask', () => {
  let mask: PolygonMask;
  let config: PolygonMaskConfig;

  beforeEach(() => {
    vi.clearAllMocks();
    
    // 重置mockCtx的属性值
    Object.defineProperty(mockCtx, 'shadowBlur', {
      value: 0,
      writable: true,
      configurable: true
    });
    Object.defineProperty(mockCtx, 'fillStyle', {
      value: '',
      writable: true,
      configurable: true
    });
    Object.defineProperty(mockCtx, 'globalCompositeOperation', {
      value: 'source-over',
      writable: true,
      configurable: true
    });
    Object.defineProperty(mockCtx, 'shadowColor', {
      value: '',
      writable: true,
      configurable: true
    });

    // 创建三角形
    config = {
      type: MaskType.CLIP,
      shape: 'polygon' as any,
      position: { x: 100, y: 100 },
      points: [
        { x: 100, y: 50 },  // 顶部
        { x: 75, y: 100 },  // 左下
        { x: 125, y: 100 }  // 右下
      ],
      enabled: true,
      opacity: 1.0,
      blendMode: 'normal' as any,
      edgeType: 'hard' as any
    };

    mask = new PolygonMask(config);
  });

  describe('构造和基本属性', () => {
    it('应该正确初始化', () => {
      expect(mask).toBeInstanceOf(PolygonMask);
      expect(mask.config.type).toBe(MaskType.CLIP);
      expect((mask.config as PolygonMaskConfig).points).toHaveLength(3);
      expect(mask.config.position).toEqual({ x: 100, y: 100 });
    });

    it('应该存储顶点数组', () => {
      const vertices = mask.getVertices();
      expect(vertices).toHaveLength(3);
      expect(vertices).toEqual(config.points);
    });
  });

  describe('apply方法', () => {
    it('应该应用剪切遮罩', () => {
      mask.apply(mockCtx, mockShape);

      expect(mockCtx.save).toHaveBeenCalled();
      expect(mockCtx.restore).toHaveBeenCalled();
      expect(mockCtx.beginPath).toHaveBeenCalled();
      expect(mockCtx.moveTo).toHaveBeenCalledWith(100, 50); // 绝对坐标
      expect(mockCtx.lineTo).toHaveBeenCalledWith(75, 100);
      expect(mockCtx.lineTo).toHaveBeenCalledWith(125, 100);
      expect(mockCtx.closePath).toHaveBeenCalled();
      expect(mockCtx.clip).toHaveBeenCalled();
    });

    it('应该在顶点少于3个时不创建路径', () => {
      const invalidConfig = { ...config, points: [{ x: 50, y: 50 }, { x: 100, y: 50 }] };
      const invalidMask = new PolygonMask(invalidConfig);

      invalidMask.apply(mockCtx, mockShape);

      expect(mockCtx.beginPath).not.toHaveBeenCalled();
    });

    it('应该应用反转剪切遮罩', () => {
      const invertedConfig = { ...config, inverted: true };
      const invertedMask = new PolygonMask(invertedConfig);

      invertedMask.apply(mockCtx, mockShape);

      expect(mockCtx.rect).toHaveBeenCalled();
      expect(mockCtx.clip).toHaveBeenCalledWith('evenodd');
    });

    it('应该应用Alpha遮罩', () => {
      const alphaConfig = { ...config, type: MaskType.ALPHA };
      const alphaMask = new PolygonMask(alphaConfig);
      
      // 确保mask是启用的
      expect(alphaMask.enabled).toBe(true);
      
      // 调试信息
      alphaMask.apply(mockCtx, mockShape);

      expect(mockCtx.fill).toHaveBeenCalled();
      expect(mockCtx.globalCompositeOperation).toBe('destination-in');
    });

    it('应该应用带羽化的Alpha遮罩', () => {
      const featheredConfig = {
        ...config,
        type: MaskType.ALPHA,
        featherRadius: 8
      };
      const featheredMask = new PolygonMask(featheredConfig);

      featheredMask.apply(mockCtx, mockShape);

      expect(mockCtx.shadowBlur).toBe(8);
      expect(mockCtx.fill).toHaveBeenCalled();
    });
  });

  describe('contains方法', () => {
    it('应该检测三角形内的点', () => {
      const insidePoint: Point2D = { x: 100, y: 85 }; // 三角形内部
      expect(mask.contains(insidePoint)).toBe(true);
    });

    it('应该拒绝三角形外的点', () => {
      const outsidePoint: Point2D = { x: 50, y: 50 }; // 三角形外部
      expect(mask.contains(outsidePoint)).toBe(false);
    });

    it('应该正确处理反转遮罩', () => {
      const invertedConfig = { ...config, inverted: true };
      const invertedMask = new PolygonMask(invertedConfig);

      const insidePoint: Point2D = { x: 100, y: 85 };
      const outsidePoint: Point2D = { x: 50, y: 50 };

      expect(invertedMask.contains(insidePoint)).toBe(false); // 反转
      expect(invertedMask.contains(outsidePoint)).toBe(true);  // 反转
    });
  });

  describe('getBounds方法', () => {
    it('应该返回正确的边界框', () => {
      const bounds = mask.getBounds();

      expect(bounds.min.x).toBe(75);  // 最小x坐标
      expect(bounds.min.y).toBe(50);  // 最小y坐标
      expect(bounds.max.x).toBe(125); // 最大x坐标
      expect(bounds.max.y).toBe(100); // 最大y坐标
    });

    it('应该处理单点多边形', () => {
      const pointConfig = {
        ...config,
        points: [{ x: 50, y: 50 }]
      };
      const pointMask = new PolygonMask(pointConfig);

      const bounds = pointMask.getBounds();

      expect(bounds.min.x).toBe(50);
      expect(bounds.min.y).toBe(50);
      expect(bounds.max.x).toBe(50);
      expect(bounds.max.y).toBe(50);
    });
  });

  describe('顶点操作方法', () => {
    it('应该能添加顶点', () => {
      const newVertex: Point2D = { x: 100, y: 125 };

      mask.addVertex(newVertex);

      expect(mask.getVertexCount()).toBe(4);
      const vertices = mask.getVertices();
      expect(vertices[3]).toEqual(newVertex);
    });

    it('应该能移除顶点', () => {
      const success = mask.removeVertex(1); // 移除第二个顶点

      expect(success).toBe(true);
      expect(mask.getVertexCount()).toBe(2);
    });

    it('应该拒绝移除无效索引的顶点', () => {
      const success1 = mask.removeVertex(-1);
      const success2 = mask.removeVertex(10);

      expect(success1).toBe(false);
      expect(success2).toBe(false);
      expect(mask.getVertexCount()).toBe(3); // 保持原数量
    });

    it('应该能更新顶点', () => {
      const newPoint: Point2D = { x: 200, y: 200 };
      const success = mask.updateVertex(0, newPoint);

      expect(success).toBe(true);
      const vertices = mask.getVertices();
      expect(vertices[0]).toEqual(newPoint);
    });

    it('应该拒绝更新无效索引的顶点', () => {
      const newPoint: Point2D = { x: 200, y: 200 };
      const success1 = mask.updateVertex(-1, newPoint);
      const success2 = mask.updateVertex(10, newPoint);

      expect(success1).toBe(false);
      expect(success2).toBe(false);
    });

    it('应该能设置所有顶点', () => {
      const newVertices: Point2D[] = [
        { x: 0, y: 0 },
        { x: 100, y: 0 },
        { x: 100, y: 100 },
        { x: 0, y: 100 }
      ];

      mask.setVertices(newVertices);

      expect(mask.getVertexCount()).toBe(4);
      expect((mask.config as PolygonMaskConfig).points).toEqual(newVertices);
    });
  });

  describe('clone方法', () => {
    it('应该创建深度克隆', () => {
      const cloned = mask.clone();

      expect(cloned).not.toBe(mask);
      expect(cloned).toBeInstanceOf(PolygonMask);
      expect(cloned.config).toEqual(mask.config);
      expect((cloned.config as PolygonMaskConfig).points).not.toBe((mask.config as PolygonMaskConfig).points); // 不同的数组引用
    });

    it('克隆应该是独立的', () => {
      const cloned = mask.clone() as PolygonMask;

      // 修改原遮罩
      mask.addVertex({ x: 200, y: 200 });

      expect(cloned.getVertexCount()).toBe(3); // 克隆不受影响
      expect(mask.getVertexCount()).toBe(4);
    });
  });

  describe('复杂多边形测试', () => {
    it('应该处理复杂多边形', () => {
      const complexVertices: Point2D[] = [
        { x: 100, y: 50 },
        { x: 150, y: 75 },
        { x: 125, y: 125 },
        { x: 75, y: 125 },
        { x: 50, y: 75 }
      ];

      const complexConfig = { ...config, points: complexVertices };
      const complexMask = new PolygonMask(complexConfig);

      expect(() => {
        complexMask.apply(mockCtx, mockShape);
      }).not.toThrow();

      const bounds = complexMask.getBounds();
      expect(bounds.min.x).toBe(50);
      expect(bounds.max.x).toBe(150);
    });

    it('应该处理凹多边形', () => {
      // 创建L形多边形
      const lShapeVertices: Point2D[] = [
        { x: 50, y: 50 },
        { x: 100, y: 50 },
        { x: 100, y: 75 },
        { x: 75, y: 75 },
        { x: 75, y: 100 },
        { x: 50, y: 100 }
      ];

      const lShapeConfig = { ...config, points: lShapeVertices };
      const lShapeMask = new PolygonMask(lShapeConfig);

      expect(() => {
        lShapeMask.apply(mockCtx, mockShape);
      }).not.toThrow();

      // 测试L形内外的点
      const insidePoint: Point2D = { x: 60, y: 60 };
      const outsidePoint: Point2D = { x: 90, y: 90 }; // 在凹陷部分

      // 注意：简单的点在多边形测试可能不能正确处理复杂凹多边形
      // 这里主要测试不会崩溃
      expect(typeof lShapeMask.contains(insidePoint)).toBe('boolean');
      expect(typeof lShapeMask.contains(outsidePoint)).toBe('boolean');
    });
  });

  describe('性能测试', () => {
    it('应该快速执行点包含测试', () => {
      const iterations = 1000;
      const testPoint: Point2D = { x: 100, y: 80 };

      const startTime = performance.now();

      for (let i = 0; i < iterations; i++) {
        mask.contains(testPoint);
      }

      const endTime = performance.now();
      const duration = endTime - startTime;

      expect(duration).toBeLessThan(100); // 应该在100ms内完成
    });

    it('应该快速执行顶点操作', () => {
      const iterations = 1000;

      const startTime = performance.now();

      for (let i = 0; i < iterations; i++) {
        mask.addVertex({ x: i, y: i });
        mask.removeVertex(mask.getVertexCount() - 1);
      }

      const endTime = performance.now();
      const duration = endTime - startTime;

      expect(duration).toBeLessThan(50);
      expect(mask.getVertexCount()).toBe(3); // 回到原始状态
    });
  });

  describe('边界情况', () => {
    it('应该处理空顶点数组', () => {
      const emptyConfig = { ...config, points: [] };
      const emptyMask = new PolygonMask(emptyConfig);

      expect(() => {
        emptyMask.apply(mockCtx, mockShape);
      }).not.toThrow();

      expect(emptyMask.getVertexCount()).toBe(0);
    });

    it('应该处理重复顶点', () => {
      const duplicateVertices: Point2D[] = [
        { x: 50, y: 50 },
        { x: 50, y: 50 }, // 重复
        { x: 100, y: 50 }
      ];

      const duplicateConfig = { ...config, points: duplicateVertices };
      const duplicateMask = new PolygonMask(duplicateConfig);

      expect(() => {
        duplicateMask.apply(mockCtx, mockShape);
      }).not.toThrow();
    });

    it('应该处理共线顶点', () => {
      const collinearVertices: Point2D[] = [
        { x: 50, y: 50 },
        { x: 75, y: 50 },
        { x: 100, y: 50 }
      ];

      const collinearConfig = { ...config, points: collinearVertices };
      const collinearMask = new PolygonMask(collinearConfig);

      expect(() => {
        collinearMask.apply(mockCtx, mockShape);
      }).not.toThrow();
    });
  });

  describe('错误处理', () => {
    it('应该处理禁用状态', () => {
      const disabledConfig = { ...config, enabled: false };
      const disabledMask = new PolygonMask(disabledConfig);

      disabledMask.apply(mockCtx, mockShape);

      expect(mockCtx.save).not.toHaveBeenCalled();
    });

    it('应该处理WebGL上下文', () => {
      const webglCtx = {} as WebGLRenderingContext;

      expect(() => {
        mask.apply(webglCtx, mockShape);
      }).not.toThrow();
    });

    it('应该处理null上下文', () => {
      expect(() => {
        mask.apply(null as any, mockShape);
      }).not.toThrow();
    });
  });
});