/**
 * PathSimplification 单元测试
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import EventEmitter3 from 'eventemitter3';
import {
  PathSimplification,
  SimplificationOptions,
  SimplificationResult,
  PathEditOperation,
  CurvePoint
} from '../PathSimplification';
import { Path, PathPoint, PathSegment } from '../PathBooleanOperations';

// 创建测试用的路径点
const createPoint = (x: number, y: number): PathPoint => ({ x, y });

// 创建包含多个点的复杂路径
const createComplexPath = (): Path => ({
  segments: [
    { type: 'moveTo', points: [createPoint(0, 0)] },
    { type: 'lineTo', points: [createPoint(1, 0.1)] },
    { type: 'lineTo', points: [createPoint(2, 0.05)] },
    { type: 'lineTo', points: [createPoint(3, 0.15)] },
    { type: 'lineTo', points: [createPoint(4, 0.08)] },
    { type: 'lineTo', points: [createPoint(5, 0.12)] },
    { type: 'lineTo', points: [createPoint(6, 0.03)] },
    { type: 'lineTo', points: [createPoint(7, 0.18)] },
    { type: 'lineTo', points: [createPoint(8, 0.06)] },
    { type: 'lineTo', points: [createPoint(9, 0.14)] },
    { type: 'lineTo', points: [createPoint(10, 0)] }
  ],
  closed: false,
  fillRule: 'nonzero'
});

// 创建正弦波路径
const createSinePath = (points: number = 50): Path => ({
  segments: [
    { type: 'moveTo', points: [createPoint(0, 0)] },
    ...Array.from({ length: points - 1 }, (_, i) => {
      const x = (i + 1) * 0.2;
      const y = Math.sin(x) * 10;
      return { type: 'lineTo' as const, points: [createPoint(x, y)] };
    })
  ],
  closed: false,
  fillRule: 'nonzero'
});

// 创建贝塞尔曲线路径
const createBezierPath = (): Path => ({
  segments: [
    { type: 'moveTo', points: [createPoint(0, 0)] },
    {
      type: 'bezierCurveTo',
      points: [createPoint(10, 10)],
      controlPoints: [createPoint(3, 0), createPoint(7, 10)]
    },
    {
      type: 'bezierCurveTo',
      points: [createPoint(20, 0)],
      controlPoints: [createPoint(13, 10), createPoint(17, 0)]
    }
  ],
  closed: false,
  fillRule: 'nonzero'
});

describe('PathSimplification', () => {
  let simplifier: PathSimplification;
  let eventBus: EventEmitter3;

  beforeEach(() => {
    simplifier = new PathSimplification();
    eventBus = new EventEmitter3();
    simplifier.setEventBus(eventBus);
  });

  describe('基础功能', () => {
    it('应该能够创建PathSimplification实例', () => {
      expect(simplifier).toBeInstanceOf(PathSimplification);
    });

    it('应该能够设置事件总线', () => {
      const newEventBus = new EventEmitter3();
      expect(() => simplifier.setEventBus(newEventBus)).not.toThrow();
    });
  });

  describe('路径简化', () => {
    it('应该能够简化复杂路径', () => {
      const complexPath = createComplexPath();
      const originalPoints = complexPath.segments.length;

      const result = simplifier.simplifyPath(complexPath, {
        tolerance: 0.1,
        preserveCorners: false
      });

      expect(result.originalPoints).toBe(originalPoints);
      expect(result.simplifiedPoints).toBeLessThanOrEqual(originalPoints);
      expect(result.compressionRatio).toBeGreaterThan(0);
      expect(result.path).toBeDefined();
      expect(result.path.segments.length).toBeGreaterThan(0);
    });

    it('应该根据容差调整简化程度', () => {
      const complexPath = createComplexPath();

      const lowToleranceResult = simplifier.simplifyPath(complexPath, {
        tolerance: 0.01
      });
      const highToleranceResult = simplifier.simplifyPath(complexPath, {
        tolerance: 0.5
      });

      expect(lowToleranceResult.simplifiedPoints)
        .toBeGreaterThanOrEqual(highToleranceResult.simplifiedPoints);
    });

    it('应该保留角点当preserveCorners为true时', () => {
      const path: Path = {
        segments: [
          { type: 'moveTo', points: [createPoint(0, 0)] },
          { type: 'lineTo', points: [createPoint(10, 0)] },
          { type: 'lineTo', points: [createPoint(10, 10)] }, // 90度角点
          { type: 'lineTo', points: [createPoint(20, 10)] }
        ],
        closed: false,
        fillRule: 'nonzero'
      };

      const result = simplifier.simplifyPath(path, {
        tolerance: 1.0,
        preserveCorners: true
      });

      // 角点应该被保留
      expect(result.simplifiedPoints).toBeGreaterThan(2);
    });

    it('应该触发simplification事件', () => {
      const startedSpy = vi.fn();
      const completedSpy = vi.fn();
      
      eventBus.on('simplification-started', startedSpy);
      eventBus.on('simplification-completed', completedSpy);

      const complexPath = createComplexPath();
      const result = simplifier.simplifyPath(complexPath);

      expect(startedSpy).toHaveBeenCalledWith({
        originalPoints: expect.any(Number),
        tolerance: expect.any(Number)
      });
      expect(completedSpy).toHaveBeenCalledWith({
        result: expect.objectContaining({
          originalPoints: expect.any(Number),
          simplifiedPoints: expect.any(Number),
          compressionRatio: expect.any(Number)
        })
      });
    });

    it('应该处理最大段数限制', () => {
      const complexPath = createSinePath(100);

      const result = simplifier.simplifyPath(complexPath, {
        maxSegments: 10
      });

      expect(result.path.segments.length).toBeLessThanOrEqual(10);
    });

    it('应该处理最小段长度限制', () => {
      const path: Path = {
        segments: [
          { type: 'moveTo', points: [createPoint(0, 0)] },
          { type: 'lineTo', points: [createPoint(0.001, 0)] }, // 很短的段
          { type: 'lineTo', points: [createPoint(0.002, 0)] },
          { type: 'lineTo', points: [createPoint(10, 0)] }
        ],
        closed: false,
        fillRule: 'nonzero'
      };

      const result = simplifier.simplifyPath(path, {
        minSegmentLength: 1.0
      });

      // 短段应该被合并或移除
      expect(result.path.segments.length).toBeLessThan(path.segments.length);
    });
  });

  describe('曲线拟合', () => {
    it('应该能够将点序列拟合为贝塞尔曲线', () => {
      const points: PathPoint[] = [
        createPoint(0, 0),
        createPoint(1, 2),
        createPoint(2, 3),
        createPoint(3, 3.5),
        createPoint(4, 3.8),
        createPoint(5, 4)
      ];

      const result = simplifier.fitCurves(points, 0.5);

      expect(result).toBeDefined();
      expect(result.segments.length).toBeGreaterThan(0);
      expect(result.segments.some(s => s.type === 'bezierCurveTo')).toBe(true);
    });

    it('应该根据容差调整曲线数量', () => {
      const sinePoints: PathPoint[] = Array.from({ length: 20 }, (_, i) => {
        const x = i * 0.5;
        return createPoint(x, Math.sin(x) * 5);
      });

      const lowToleranceResult = simplifier.fitCurves(sinePoints, 0.1);
      const highToleranceResult = simplifier.fitCurves(sinePoints, 1.0);

      expect(lowToleranceResult.segments.length)
        .toBeGreaterThanOrEqual(highToleranceResult.segments.length);
    });

    it('应该触发curve-fitting事件', () => {
      const startedSpy = vi.fn();
      const completedSpy = vi.fn();
      
      eventBus.on('curve-fitting-started', startedSpy);
      eventBus.on('curve-fitting-completed', completedSpy);

      const points: PathPoint[] = [
        createPoint(0, 0),
        createPoint(5, 5),
        createPoint(10, 0)
      ];

      simplifier.fitCurves(points);

      expect(startedSpy).toHaveBeenCalledWith({
        points: points.length
      });
      expect(completedSpy).toHaveBeenCalledWith({
        curves: expect.any(Number)
      });
    });
  });

  describe('路径编辑', () => {
    it('应该能够插入新点', () => {
      const path = createComplexPath();
      const originalLength = path.segments.length;

      const operation: PathEditOperation = {
        type: 'insert',
        segmentIndex: 2,
        point: createPoint(2.5, 0.2)
      };

      const result = simplifier.editPath(path, operation);

      expect(result.segments.length).toBe(originalLength + 1);
    });

    it('应该能够删除点', () => {
      const path = createComplexPath();
      const originalLength = path.segments.length;

      const operation: PathEditOperation = {
        type: 'delete',
        segmentIndex: 2
      };

      const result = simplifier.editPath(path, operation);

      expect(result.segments.length).toBe(originalLength - 1);
    });

    it('应该能够移动点', () => {
      const path = createComplexPath();
      const originalPoint = path.segments[2].points[0];

      const operation: PathEditOperation = {
        type: 'move',
        segmentIndex: 2,
        point: createPoint(originalPoint.x + 1, originalPoint.y + 1)
      };

      const result = simplifier.editPath(path, operation);

      expect(result.segments[2].points[0]).not.toEqual(originalPoint);
      expect(result.segments[2].points[0].x).toBe(originalPoint.x + 1);
      expect(result.segments[2].points[0].y).toBe(originalPoint.y + 1);
    });

    it('应该能够平滑路径段', () => {
      const path: Path = {
        segments: [
          { type: 'moveTo', points: [createPoint(0, 0)] },
          { type: 'lineTo', points: [createPoint(5, 0)] },
          { type: 'lineTo', points: [createPoint(5, 5)] }, // 尖角
          { type: 'lineTo', points: [createPoint(10, 5)] }
        ],
        closed: false,
        fillRule: 'nonzero'
      };

      const operation: PathEditOperation = {
        type: 'smooth',
        segmentIndex: 2
      };

      const result = simplifier.editPath(path, operation);

      // 平滑后的路径段数量可能会变化
      expect(result.segments.length).toBeGreaterThan(0);
    });

    it('应该能够创建尖角', () => {
      const bezierPath = createBezierPath();

      const operation: PathEditOperation = {
        type: 'corner',
        segmentIndex: 1
      };

      const result = simplifier.editPath(bezierPath, operation);

      expect(result).toBeDefined();
      expect(result.segments.length).toBeGreaterThan(0);
    });

    it('应该触发path-edited事件', () => {
      const editedSpy = vi.fn();
      eventBus.on('path-edited', editedSpy);

      const path = createComplexPath();
      const operation: PathEditOperation = {
        type: 'insert',
        segmentIndex: 1,
        point: createPoint(0.5, 0.5)
      };

      simplifier.editPath(path, operation);

      expect(editedSpy).toHaveBeenCalledWith({
        operation
      });
    });
  });

  describe('曲率分析', () => {
    it('应该能够分析路径的曲率', () => {
      const sinePath = createSinePath(20);

      const curvePoints = simplifier.analyzeCurvature(sinePath);

      expect(curvePoints).toBeInstanceOf(Array);
      expect(curvePoints.length).toBeGreaterThan(0);
      
      curvePoints.forEach(cp => {
        expect(cp).toHaveProperty('point');
        expect(cp).toHaveProperty('curvature');
        expect(cp).toHaveProperty('tangent');
        expect(typeof cp.curvature).toBe('number');
        expect(cp.tangent).toHaveProperty('x');
        expect(cp.tangent).toHaveProperty('y');
      });
    });

    it('应该为直线返回零曲率', () => {
      const straightPath: Path = {
        segments: [
          { type: 'moveTo', points: [createPoint(0, 0)] },
          { type: 'lineTo', points: [createPoint(5, 0)] },
          { type: 'lineTo', points: [createPoint(10, 0)] }
        ],
        closed: false,
        fillRule: 'nonzero'
      };

      const curvePoints = simplifier.analyzeCurvature(straightPath);

      // 直线的曲率应该接近0
      curvePoints.forEach(cp => {
        expect(Math.abs(cp.curvature)).toBeLessThan(0.1);
      });
    });

    it('应该为圆弧返回恒定曲率', () => {
      const circlePoints: PathPoint[] = Array.from({ length: 16 }, (_, i) => {
        const angle = (i / 16) * Math.PI * 2;
        return createPoint(Math.cos(angle) * 5, Math.sin(angle) * 5);
      });

      const circlePath: Path = {
        segments: [
          { type: 'moveTo', points: [circlePoints[0]] },
          ...circlePoints.slice(1).map(p => ({ type: 'lineTo' as const, points: [p] }))
        ],
        closed: true,
        fillRule: 'nonzero'
      };

      const curvePoints = simplifier.analyzeCurvature(circlePath);

      // 圆的曲率应该大致相等
      const curvatures = curvePoints.map(cp => Math.abs(cp.curvature));
      const avgCurvature = curvatures.reduce((a, b) => a + b, 0) / curvatures.length;
      
      curvatures.forEach(c => {
        expect(Math.abs(c - avgCurvature)).toBeLessThan(avgCurvature * 0.5);
      });
    });
  });

  describe('错误处理', () => {
    it('应该处理空路径', () => {
      const emptyPath: Path = {
        segments: [],
        closed: false,
        fillRule: 'nonzero'
      };

      const result = simplifier.simplifyPath(emptyPath);

      expect(result).toBeDefined();
      expect(result.originalPoints).toBeDefined();
      expect(result.simplifiedPoints).toBeDefined();
      expect(result.compressionRatio).toBeDefined();
    });

    it('应该处理单点路径', () => {
      const singlePointPath: Path = {
        segments: [
          { type: 'moveTo', points: [createPoint(0, 0)] }
        ],
        closed: false,
        fillRule: 'nonzero'
      };

      const result = simplifier.simplifyPath(singlePointPath);

      expect(result.path.segments.length).toBe(1);
    });

    it('应该处理无效的编辑操作', () => {
      const path = createComplexPath();

      const invalidOperation: PathEditOperation = {
        type: 'delete',
        segmentIndex: 999 // 超出范围
      };

      expect(() => {
        simplifier.editPath(path, invalidOperation);
      }).not.toThrow();
    });

    it('应该处理无效的简化选项', () => {
      const path = createComplexPath();

      const invalidOptions: Partial<SimplificationOptions> = {
        tolerance: -1, // 负值
        maxSegments: 0 // 零值
      };

      expect(() => {
        simplifier.simplifyPath(path, invalidOptions);
      }).not.toThrow();
    });
  });

  describe('性能测试', () => {
    it('应该能够处理大量点的路径', () => {
      const largePath = createSinePath(1000);

      const startTime = performance.now();
      const result = simplifier.simplifyPath(largePath, { tolerance: 0.1 });
      const endTime = performance.now();

      expect(result.simplifiedPoints).toBeLessThan(result.originalPoints);
      expect(endTime - startTime).toBeLessThan(2000); // 应该在2秒内完成
    });

    it('应该能够快速进行曲率分析', () => {
      const complexPath = createSinePath(500);

      const startTime = performance.now();
      const curvePoints = simplifier.analyzeCurvature(complexPath);
      const endTime = performance.now();

      expect(curvePoints.length).toBeGreaterThan(0);
      expect(endTime - startTime).toBeLessThan(1000); // 应该在1秒内完成
    });
  });
});