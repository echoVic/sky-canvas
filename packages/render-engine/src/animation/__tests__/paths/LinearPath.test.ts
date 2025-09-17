/**
 * 线性路径测试
 */

import { describe, it, expect } from 'vitest';
import { LinearPath } from '../../paths/LinearPath';
import { PathType, LinearPathConfig } from '../../types/PathTypes';

describe('LinearPath', () => {
  describe('构造函数', () => {
    it('应该正确创建线性路径', () => {
      const path = new LinearPath({
        type: PathType.LINEAR,
        start: { x: 0, y: 0 },
        end: { x: 100, y: 100 }
      });

      expect(path.type).toBe(PathType.LINEAR);
      expect(path.getLength()).toBeCloseTo(Math.sqrt(20000), 5);
    });
  });

  describe('点获取', () => {
    it('应该在t=0时返回起点', () => {
      const path = new LinearPath({
        type: PathType.LINEAR,
        start: { x: 10, y: 20 },
        end: { x: 110, y: 120 }
      });

      const point = path.getPoint(0);
      expect(point).toEqual({ x: 10, y: 20 });
    });

    it('应该在t=1时返回终点', () => {
      const path = new LinearPath({
        type: PathType.LINEAR,
        start: { x: 10, y: 20 },
        end: { x: 110, y: 120 }
      });

      const point = path.getPoint(1);
      expect(point).toEqual({ x: 110, y: 120 });
    });

    it('应该在t=0.5时返回中点', () => {
      const path = new LinearPath({
        type: PathType.LINEAR,
        start: { x: 0, y: 0 },
        end: { x: 100, y: 200 }
      });

      const point = path.getPoint(0.5);
      expect(point).toEqual({ x: 50, y: 100 });
    });

    it('应该正确插值任意t值', () => {
      const path = new LinearPath({
        type: PathType.LINEAR,
        start: { x: 0, y: 0 },
        end: { x: 100, y: 50 }
      });

      const point = path.getPoint(0.3);
      expect(point.x).toBeCloseTo(30, 5);
      expect(point.y).toBeCloseTo(15, 5);
    });

    it('应该限制t值在[0,1]范围内', () => {
      const path = new LinearPath({
        type: PathType.LINEAR,
        start: { x: 0, y: 0 },
        end: { x: 100, y: 100 }
      });

      const point1 = path.getPoint(-0.5);
      expect(point1).toEqual({ x: 0, y: 0 });

      const point2 = path.getPoint(1.5);
      expect(point2).toEqual({ x: 100, y: 100 });
    });
  });

  describe('切线向量', () => {
    it('应该返回正确的切线方向', () => {
      const path = new LinearPath({
        type: PathType.LINEAR,
        start: { x: 0, y: 0 },
        end: { x: 100, y: 100 }
      });

      const tangent = path.getTangent(0.5);
      // 45度线的单位切线向量
      expect(tangent.x).toBeCloseTo(Math.sqrt(0.5), 5);
      expect(tangent.y).toBeCloseTo(Math.sqrt(0.5), 5);
    });

    it('应该返回单位向量', () => {
      const path = new LinearPath({
        type: PathType.LINEAR,
        start: { x: 0, y: 0 },
        end: { x: 300, y: 400 }
      });

      const tangent = path.getTangent(0.3);
      const length = Math.sqrt(tangent.x * tangent.x + tangent.y * tangent.y);
      expect(length).toBeCloseTo(1, 5);
    });

    it('应该处理垂直线', () => {
      const path = new LinearPath({
        type: PathType.LINEAR,
        start: { x: 50, y: 0 },
        end: { x: 50, y: 100 }
      });

      const tangent = path.getTangent(0.5);
      expect(tangent.x).toBeCloseTo(0, 5);
      expect(tangent.y).toBeCloseTo(1, 5);
    });

    it('应该处理水平线', () => {
      const path = new LinearPath({
        type: PathType.LINEAR,
        start: { x: 0, y: 50 },
        end: { x: 100, y: 50 }
      });

      const tangent = path.getTangent(0.7);
      expect(tangent.x).toBeCloseTo(1, 5);
      expect(tangent.y).toBeCloseTo(0, 5);
    });

    it('应该处理零长度线段', () => {
      const path = new LinearPath({
        type: PathType.LINEAR,
        start: { x: 50, y: 50 },
        end: { x: 50, y: 50 }
      });

      const tangent = path.getTangent(0.5);
      expect(tangent.x).toBeCloseTo(1, 5);
      expect(tangent.y).toBeCloseTo(0, 5);
    });
  });

  describe('法线向量', () => {
    it('应该返回垂直于切线的法线', () => {
      const path = new LinearPath({
        type: PathType.LINEAR,
        start: { x: 0, y: 0 },
        end: { x: 100, y: 0 }
      });

      const tangent = path.getTangent(0.5);
      const normal = path.getNormal(0.5);

      // 法线应该垂直于切线
      const dotProduct = tangent.x * normal.x + tangent.y * normal.y;
      expect(dotProduct).toBeCloseTo(0, 5);
    });

    it('应该返回单位向量', () => {
      const path = new LinearPath({
        type: PathType.LINEAR,
        start: { x: 0, y: 0 },
        end: { x: 300, y: 400 }
      });

      const normal = path.getNormal(0.3);
      const length = Math.sqrt(normal.x * normal.x + normal.y * normal.y);
      expect(length).toBeCloseTo(1, 5);
    });
  });

  describe('曲率', () => {
    it('直线的曲率应该为0', () => {
      const path = new LinearPath({
        type: PathType.LINEAR,
        start: { x: 0, y: 0 },
        end: { x: 100, y: 100 }
      });

      expect(path.getCurvature(0)).toBe(0);
      expect(path.getCurvature(0.5)).toBe(0);
      expect(path.getCurvature(1)).toBe(0);
    });
  });

  describe('长度计算', () => {
    it('应该计算正确的长度', () => {
      const path = new LinearPath({
        type: PathType.LINEAR,
        start: { x: 0, y: 0 },
        end: { x: 30, y: 40 }
      });

      expect(path.getLength()).toBeCloseTo(50, 5); // 3-4-5直角三角形
    });

    it('应该计算水平线长度', () => {
      const path = new LinearPath({
        type: PathType.LINEAR,
        start: { x: 10, y: 50 },
        end: { x: 110, y: 50 }
      });

      expect(path.getLength()).toBeCloseTo(100, 5);
    });

    it('应该计算垂直线长度', () => {
      const path = new LinearPath({
        type: PathType.LINEAR,
        start: { x: 50, y: 10 },
        end: { x: 50, y: 110 }
      });

      expect(path.getLength()).toBeCloseTo(100, 5);
    });

    it('应该处理零长度线段', () => {
      const path = new LinearPath({
        type: PathType.LINEAR,
        start: { x: 50, y: 50 },
        end: { x: 50, y: 50 }
      });

      expect(path.getLength()).toBe(0);
    });
  });

  describe('路径分割', () => {
    it('应该在指定点分割路径', () => {
      const path = new LinearPath({
        type: PathType.LINEAR,
        start: { x: 0, y: 0 },
        end: { x: 100, y: 100 }
      });

      const [firstPart, secondPart] = path.split(0.3);

      // 第一部分：0% -> 30%
      expect(firstPart.getPoint(0)).toEqual({ x: 0, y: 0 });
      expect(firstPart.getPoint(1)).toEqual({ x: 30, y: 30 });

      // 第二部分：30% -> 100%
      expect(secondPart.getPoint(0)).toEqual({ x: 30, y: 30 });
      expect(secondPart.getPoint(1)).toEqual({ x: 100, y: 100 });
    });

    it('应该限制分割点在有效范围内', () => {
      const path = new LinearPath({
        type: PathType.LINEAR,
        start: { x: 0, y: 0 },
        end: { x: 100, y: 100 }
      });

      const [firstPart, secondPart] = path.split(1.5);

      // 应该被限制在t=1
      expect(firstPart.getPoint(1)).toEqual({ x: 100, y: 100 });
      expect(secondPart.getPoint(0)).toEqual({ x: 100, y: 100 });
    });
  });

  describe('路径连接', () => {
    it('应该连接两个路径', () => {
      const path1 = new LinearPath({
        type: PathType.LINEAR,
        start: { x: 0, y: 0 },
        end: { x: 50, y: 50 }
      });

      const path2 = new LinearPath({
        type: PathType.LINEAR,
        start: { x: 50, y: 50 },
        end: { x: 100, y: 0 }
      });

      const combined = path1.concat(path2);
      expect(combined).toBeDefined();
      expect(combined.type).toBe(PathType.LINEAR); // 连续的线性路径应该合并为一个线性路径
    });
  });

  describe('路径变换', () => {
    it('应该应用平移变换', () => {
      const path = new LinearPath({
        type: PathType.LINEAR,
        start: { x: 0, y: 0 },
        end: { x: 100, y: 100 }
      });

      // 平移变换矩阵 [1, 0, 0, 1, 50, 30]
      const transformed = path.transform([1, 0, 0, 1, 50, 30]);

      expect(transformed.getPoint(0)).toEqual({ x: 50, y: 30 });
      expect(transformed.getPoint(1)).toEqual({ x: 150, y: 130 });
    });

    it('应该应用缩放变换', () => {
      const path = new LinearPath({
        type: PathType.LINEAR,
        start: { x: 0, y: 0 },
        end: { x: 100, y: 100 }
      });

      // 缩放变换矩阵 [2, 0, 0, 1.5, 0, 0]
      const transformed = path.transform([2, 0, 0, 1.5, 0, 0]);

      expect(transformed.getPoint(0)).toEqual({ x: 0, y: 0 });
      expect(transformed.getPoint(1)).toEqual({ x: 200, y: 150 });
    });

    it('应该验证变换矩阵长度', () => {
      const path = new LinearPath({
        type: PathType.LINEAR,
        start: { x: 0, y: 0 },
        end: { x: 100, y: 100 }
      });

      expect(() => {
        path.transform([1, 0, 0, 1]); // 只有4个元素
      }).toThrow('Transform matrix must be a 2x3 matrix (6 elements)');
    });
  });

  describe('边界框', () => {
    it('应该计算正确的边界框', () => {
      const path = new LinearPath({
        type: PathType.LINEAR,
        start: { x: 20, y: 30 },
        end: { x: 80, y: 70 }
      });

      const bounds = path.getBounds();
      expect(bounds.min).toEqual({ x: 20, y: 30 });
      expect(bounds.max).toEqual({ x: 80, y: 70 });
    });

    it('应该处理反向线段', () => {
      const path = new LinearPath({
        type: PathType.LINEAR,
        start: { x: 80, y: 70 },
        end: { x: 20, y: 30 }
      });

      const bounds = path.getBounds();
      expect(bounds.min).toEqual({ x: 20, y: 30 });
      expect(bounds.max).toEqual({ x: 80, y: 70 });
    });
  });

  describe('配置获取', () => {
    it('应该返回路径配置', () => {
      const config: LinearPathConfig = {
        type: PathType.LINEAR,
        start: { x: 10, y: 20 },
        end: { x: 90, y: 80 }
      };

      const path = new LinearPath(config);
      const retrievedConfig = path.getConfig();

      expect(retrievedConfig.type).toBe(PathType.LINEAR);
      expect(retrievedConfig.start).toEqual({ x: 10, y: 20 });
      expect(retrievedConfig.end).toEqual({ x: 90, y: 80 });
    });
  });

  describe('边界框', () => {
    it('应该计算正确的边界框', () => {
      const path = new LinearPath({
        type: PathType.LINEAR,
        start: { x: 20, y: 30 },
        end: { x: 80, y: 70 }
      });

      const bounds = path.getBounds();
      expect(bounds.min).toEqual({ x: 20, y: 30 });
      expect(bounds.max).toEqual({ x: 80, y: 70 });
    });

    it('应该处理反向线段', () => {
      const path = new LinearPath({
        type: PathType.LINEAR,
        start: { x: 80, y: 70 },
        end: { x: 20, y: 30 }
      });

      const bounds = path.getBounds();
      expect(bounds.min).toEqual({ x: 20, y: 30 });
      expect(bounds.max).toEqual({ x: 80, y: 70 });
    });
  });
});