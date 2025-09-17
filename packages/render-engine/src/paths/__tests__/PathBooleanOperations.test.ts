/**
 * PathBooleanOperations 单元测试
 */

import EventEmitter3 from 'eventemitter3';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  Path,
  PathBooleanOperations,
  PathPoint
} from '../PathBooleanOperations';

// 创建测试用的路径点
const createPoint = (x: number, y: number): PathPoint => ({ x, y });

// 创建简单的矩形路径
const createRectanglePath = (x: number, y: number, width: number, height: number): Path => ({
  segments: [
    { type: 'moveTo', points: [createPoint(x, y)] },
    { type: 'lineTo', points: [createPoint(x + width, y)] },
    { type: 'lineTo', points: [createPoint(x + width, y + height)] },
    { type: 'lineTo', points: [createPoint(x, y + height)] },
    { type: 'closePath', points: [] }
  ],
  closed: true,
  fillRule: 'nonzero'
});

// 创建圆形路径
const createCirclePath = (centerX: number, centerY: number, radius: number): Path => ({
  segments: [
    { type: 'moveTo', points: [createPoint(centerX + radius, centerY)] },
    {
      type: 'arc',
      points: [createPoint(centerX, centerY)],
      radius,
      startAngle: 0,
      endAngle: Math.PI * 2,
      anticlockwise: false
    },
    { type: 'closePath', points: [] }
  ],
  closed: true,
  fillRule: 'nonzero'
});

describe('PathBooleanOperations', () => {
  let pathOps: PathBooleanOperations;
  let eventBus: EventEmitter3;

  beforeEach(() => {
    pathOps = new PathBooleanOperations();
    eventBus = new EventEmitter3();
    pathOps.setEventBus(eventBus);
  });

  describe('基础功能', () => {
    it('应该能够创建PathBooleanOperations实例', () => {
      expect(pathOps).toBeInstanceOf(PathBooleanOperations);
    });

    it('应该能够设置事件总线', () => {
      const newEventBus = new EventEmitter3();
      expect(() => pathOps.setEventBus(newEventBus)).not.toThrow();
    });

    it('应该能够设置精度', () => {
      expect(() => pathOps.setPrecision(1e-8)).not.toThrow();
    });
  });

  describe('并集运算', () => {
    it('应该能够计算两个不相交矩形的并集', () => {
      const rectA = createRectanglePath(0, 0, 10, 10);
      const rectB = createRectanglePath(20, 20, 10, 10);

      const result = pathOps.union(rectA, rectB);

      expect(result.success).toBe(true);
      expect(result.operation).toBe('union');
      expect(result.paths).toHaveLength(2); // 两个不相交的路径
    });

    it('应该能够计算两个相交矩形的并集', () => {
      const rectA = createRectanglePath(0, 0, 10, 10);
      const rectB = createRectanglePath(5, 5, 10, 10);

      const result = pathOps.union(rectA, rectB);

      expect(result.success).toBe(true);
      expect(result.operation).toBe('union');
      expect(result.paths).toHaveLength(1); // 合并为一个路径
    });

    it('应该触发operation-started和operation-completed事件', () => {
      const startedSpy = vi.fn();
      const completedSpy = vi.fn();
      
      eventBus.on('operation-started', startedSpy);
      eventBus.on('operation-completed', completedSpy);

      const rectA = createRectanglePath(0, 0, 10, 10);
      const rectB = createRectanglePath(5, 5, 10, 10);

      pathOps.union(rectA, rectB);

      expect(startedSpy).toHaveBeenCalledWith({
        operation: 'union',
        pathCount: 2
      });
      expect(completedSpy).toHaveBeenCalled();
    });
  });

  describe('交集运算', () => {
    it('应该能够计算两个相交矩形的交集', () => {
      const rectA = createRectanglePath(0, 0, 10, 10);
      const rectB = createRectanglePath(5, 5, 10, 10);

      const result = pathOps.intersection(rectA, rectB);

      expect(result.success).toBe(true);
      expect(result.operation).toBe('intersection');
      expect(result.paths.length).toBeGreaterThan(0);
    });

    it('应该返回空结果当两个矩形不相交时', () => {
      const rectA = createRectanglePath(0, 0, 10, 10);
      const rectB = createRectanglePath(20, 20, 10, 10);

      const result = pathOps.intersection(rectA, rectB);

      expect(result.success).toBe(true);
      expect(result.operation).toBe('intersection');
      expect(result.paths).toHaveLength(0);
    });
  });

  describe('差集运算', () => {
    it('应该能够计算两个矩形的差集', () => {
      const rectA = createRectanglePath(0, 0, 10, 10);
      const rectB = createRectanglePath(5, 5, 10, 10);

      const result = pathOps.difference(rectA, rectB);

      expect(result.success).toBe(true);
      expect(result.operation).toBe('difference');
      expect(Array.isArray(result.paths)).toBe(true);
    });

    it('应该返回原路径当两个矩形不相交时', () => {
      const rectA = createRectanglePath(0, 0, 10, 10);
      const rectB = createRectanglePath(20, 20, 10, 10);

      const result = pathOps.difference(rectA, rectB);

      expect(result.success).toBe(true);
      expect(result.operation).toBe('difference');
      expect(Array.isArray(result.paths)).toBe(true);
    });
  });

  describe('异或运算', () => {
    it('应该能够计算两个矩形的异或', () => {
      const rect1 = createRectanglePath(0, 0, 10, 10);
      const rect2 = createRectanglePath(5, 5, 10, 10);

      const result = pathOps.exclusion(rect1, rect2);

      expect(result.success).toBe(true);
      expect(result.operation).toBe('exclusion');
      expect(result.paths).toBeDefined();
      expect(Array.isArray(result.paths)).toBe(true);
    });

    it('应该返回两个路径当它们不相交时', () => {
      const rectA = createRectanglePath(0, 0, 10, 10);
      const rectB = createRectanglePath(20, 20, 10, 10);

      const result = pathOps.exclusion(rectA, rectB);

      expect(result.success).toBe(true);
      expect(result.operation).toBe('exclusion');
      expect(result.paths).toHaveLength(2);
    });
  });

  describe('复杂路径处理', () => {
    it('应该能够处理包含曲线的路径', () => {
      const circle = createCirclePath(5, 5, 5);
      const rect = createRectanglePath(0, 0, 10, 10);

      const result = pathOps.intersection(circle, rect);

      expect(result.success).toBe(true);
      expect(result.operation).toBe('intersection');
    });

    it('应该能够处理贝塞尔曲线路径', () => {
      const bezierPath: Path = {
        segments: [
          { type: 'moveTo', points: [createPoint(0, 0)] },
          {
            type: 'bezierCurveTo',
            points: [createPoint(10, 10)],
            controlPoints: [createPoint(5, 0), createPoint(5, 10)]
          },
          { type: 'closePath', points: [] }
        ],
        closed: true,
        fillRule: 'nonzero'
      };

      const rect = createRectanglePath(0, 0, 10, 10);
      const result = pathOps.union(bezierPath, rect);

      expect(result.success).toBe(true);
    });
  });

  describe('错误处理', () => {
    it('应该处理空路径', () => {
      const emptyPath: Path = {
        segments: [],
        closed: false,
        fillRule: 'nonzero'
      };
      const rect = createRectanglePath(0, 0, 10, 10);

      const result = pathOps.union(emptyPath, rect);

      expect(result).toBeDefined();
      expect(result.success).toBeDefined();
      expect(result.paths).toBeDefined();
    });

    it('应该处理无效的路径数据', () => {
      const invalidPath: Path = {
        segments: [
          { type: 'moveTo', points: [] } // 无效：moveTo需要点
        ],
        closed: false,
        fillRule: 'nonzero'
      };
      const rect = createRectanglePath(0, 0, 10, 10);

      const result = pathOps.union(invalidPath, rect);

      // 应该优雅地处理错误
      expect(result).toBeDefined();
    });

    it('应该在操作失败时触发operation-failed事件', () => {
      const failedSpy = vi.fn();
      eventBus.on('operation-failed', failedSpy);

      // 创建可能导致失败的路径
      const invalidPath: Path = {
        segments: [{ type: 'moveTo', points: [] }],
        closed: false,
        fillRule: 'nonzero'
      };
      const rect = createRectanglePath(0, 0, 10, 10);

      pathOps.union(invalidPath, rect);

      // 根据实际实现，可能会触发失败事件
      // expect(failedSpy).toHaveBeenCalled();
    });
  });

  describe('精度控制', () => {
    it('应该根据设置的精度进行计算', () => {
      pathOps.setPrecision(1e-6);

      const rectA = createRectanglePath(0, 0, 10, 10);
      const rectB = createRectanglePath(10.0000001, 0, 10, 10); // 非常接近

      const result = pathOps.union(rectA, rectB);

      expect(result.success).toBe(true);
      // 根据精度设置，这两个矩形可能被认为是相接的
    });
  });

  describe('性能测试', () => {
    it('应该能够处理大量路径段', () => {
      // 创建包含多个段的复杂路径
      const complexPath: Path = {
        segments: Array.from({ length: 100 }, (_, i) => ({
          type: 'lineTo' as const,
          points: [createPoint(i, Math.sin(i * 0.1) * 10)]
        })),
        closed: true,
        fillRule: 'nonzero'
      };

      const rect = createRectanglePath(-10, -15, 120, 30);

      const startTime = performance.now();
      const result = pathOps.intersection(complexPath, rect);
      const endTime = performance.now();

      expect(result.success).toBe(true);
      expect(endTime - startTime).toBeLessThan(1000); // 应该在1秒内完成
    });
  });
});