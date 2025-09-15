/**
 * GeometryGenerator 单元测试
 * 基于 BDD (Behavior-Driven Development) 和 AAA (Arrange-Act-Assert) 模式
 */

import { describe, expect, it } from 'vitest';
import { GeometryGenerator } from '../GeometryGenerator';

describe('GeometryGenerator', () => {
  describe('Given GeometryGenerator static methods', () => {
    describe('When creating rectangle geometry', () => {
      it('Then should generate correct rectangle vertices and indices', () => {
        // Arrange: 准备矩形参数
        const x = 10;
        const y = 20;
        const width = 100;
        const height = 50;
        const color: [number, number, number, number] = [1, 0, 0, 0.8];

        // Act: 生成矩形几何体
        const geometry = GeometryGenerator.createRectangle(x, y, width, height, color);

        // Assert: 验证几何体数据
        expect(geometry.vertexCount).toBe(4);
        expect(geometry.indexCount).toBe(6);
        expect(geometry.vertices).toBeInstanceOf(Float32Array);
        expect(geometry.indices).toBeInstanceOf(Uint16Array);
        expect(geometry.vertices.length).toBe(32); // 4 vertices * 8 floats per vertex
        expect(geometry.indices.length).toBe(6); // 2 triangles * 3 indices per triangle

        // 验证顶点数据格式 (x, y, r, g, b, a, u, v)
        // 左上角顶点
        expect(geometry.vertices[0]).toBe(x); // x
        expect(geometry.vertices[1]).toBe(y); // y
        expect(geometry.vertices[2]).toBe(1); // r
        expect(geometry.vertices[3]).toBe(0); // g
        expect(geometry.vertices[4]).toBe(0); // b
        expect(geometry.vertices[5]).toBe(0.8); // a
        expect(geometry.vertices[6]).toBe(0); // u
        expect(geometry.vertices[7]).toBe(0); // v

        // 右下角顶点
        expect(geometry.vertices[24]).toBe(x + width); // x
        expect(geometry.vertices[25]).toBe(y + height); // y

        // 验证索引数据
        expect(Array.from(geometry.indices)).toEqual([0, 1, 2, 0, 2, 3]);
      });

      it('Then should use default color when not specified', () => {
        // Arrange: 准备矩形参数（不指定颜色）
        const x = 0, y = 0, width = 10, height = 10;

        // Act: 生成矩形几何体
        const geometry = GeometryGenerator.createRectangle(x, y, width, height);

        // Assert: 验证默认颜色 (白色)
        expect(geometry.vertices[2]).toBe(1); // r
        expect(geometry.vertices[3]).toBe(1); // g
        expect(geometry.vertices[4]).toBe(1); // b
        expect(geometry.vertices[5]).toBe(1); // a
      });
    });

    describe('When creating circle geometry', () => {
      it('Then should generate correct circle vertices and indices', () => {
        // Arrange: 准备圆形参数
        const centerX = 50;
        const centerY = 50;
        const radius = 25;
        const segments = 8;
        const color: [number, number, number, number] = [0, 1, 0, 1];

        // Act: 生成圆形几何体
        const geometry = GeometryGenerator.createCircle(centerX, centerY, radius, segments, color);

        // Assert: 验证几何体数据
        expect(geometry.vertexCount).toBe(segments + 1); // 中心点 + 圆周点
        expect(geometry.indexCount).toBe(segments * 3); // 每个扇形3个索引
        expect(geometry.vertices.length).toBe((segments + 1) * 8);
        expect(geometry.indices.length).toBe(segments * 3);

        // 验证中心点
        expect(geometry.vertices[0]).toBe(centerX);
        expect(geometry.vertices[1]).toBe(centerY);
        expect(geometry.vertices[2]).toBe(0); // r
        expect(geometry.vertices[3]).toBe(1); // g
        expect(geometry.vertices[4]).toBe(0); // b
        expect(geometry.vertices[5]).toBe(1); // a

        // 验证第一个圆周点（角度为0）
        expect(geometry.vertices[8]).toBeCloseTo(centerX + radius); // x
        expect(geometry.vertices[9]).toBeCloseTo(centerY); // y
      });

      it('Then should use default segments when not specified', () => {
        // Arrange: 准备圆形参数（不指定分段数）
        const centerX = 0, centerY = 0, radius = 10;

        // Act: 生成圆形几何体
        const geometry = GeometryGenerator.createCircle(centerX, centerY, radius);

        // Assert: 验证默认分段数 (32)
        expect(geometry.vertexCount).toBe(33); // 32 + 1 center
        expect(geometry.indexCount).toBe(96); // 32 * 3
      });
    });

    describe('When creating line geometry', () => {
      it('Then should generate correct line vertices and indices', () => {
        // Arrange: 准备线段参数
        const x1 = 10, y1 = 20;
        const x2 = 100, y2 = 80;
        const width = 5;
        const color: [number, number, number, number] = [0, 0, 1, 1];

        // Act: 生成线段几何体
        const geometry = GeometryGenerator.createLine(x1, y1, x2, y2, width, color);

        // Assert: 验证几何体数据
        expect(geometry.vertexCount).toBe(4); // 线段的4个顶点
        expect(geometry.indexCount).toBe(6); // 2个三角形
        expect(geometry.vertices.length).toBe(32); // 4 * 8
        expect(geometry.indices.length).toBe(6);

        // 验证颜色设置
        expect(geometry.vertices[2]).toBe(0); // r
        expect(geometry.vertices[3]).toBe(0); // g
        expect(geometry.vertices[4]).toBe(1); // b
        expect(geometry.vertices[5]).toBe(1); // a

        // 验证索引
        expect(Array.from(geometry.indices)).toEqual([0, 1, 2, 0, 2, 3]);
      });

      it('Then should use default width when not specified', () => {
        // Arrange: 准备线段参数（不指定宽度）
        const x1 = 0, y1 = 0, x2 = 10, y2 = 10;

        // Act: 生成线段几何体
        const geometry = GeometryGenerator.createLine(x1, y1, x2, y2);

        // Assert: 验证几何体生成成功
        expect(geometry.vertexCount).toBe(4);
        expect(geometry.indexCount).toBe(6);
      });

      it('Then should handle vertical line correctly', () => {
        // Arrange: 准备垂直线段
        const x1 = 50, y1 = 10;
        const x2 = 50, y2 = 100;
        const width = 2;

        // Act: 生成垂直线段几何体
        const geometry = GeometryGenerator.createLine(x1, y1, x2, y2, width);

        // Assert: 验证几何体生成成功
        expect(geometry.vertexCount).toBe(4);
        expect(geometry.indexCount).toBe(6);
        expect(geometry.vertices).toBeInstanceOf(Float32Array);
      });

      it('Then should handle horizontal line correctly', () => {
        // Arrange: 准备水平线段
        const x1 = 10, y1 = 50;
        const x2 = 100, y2 = 50;
        const width = 3;

        // Act: 生成水平线段几何体
        const geometry = GeometryGenerator.createLine(x1, y1, x2, y2, width);

        // Assert: 验证几何体生成成功
        expect(geometry.vertexCount).toBe(4);
        expect(geometry.indexCount).toBe(6);
        expect(geometry.vertices).toBeInstanceOf(Float32Array);
      });
    });

    describe('When creating polygon geometry', () => {
      it('Then should generate correct triangle polygon', () => {
        // Arrange: 准备三角形顶点
        const points = [
          { x: 0, y: 0 },
          { x: 100, y: 0 },
          { x: 50, y: 100 }
        ];
        const color: [number, number, number, number] = [1, 1, 0, 1];

        // Act: 生成多边形几何体
        const geometry = GeometryGenerator.createPolygon(points, color);

        // Assert: 验证几何体数据
        expect(geometry.vertexCount).toBe(3);
        expect(geometry.indexCount).toBe(3); // 1个三角形
        expect(geometry.vertices.length).toBe(24); // 3 * 8
        expect(geometry.indices.length).toBe(3);

        // 验证顶点位置
        expect(geometry.vertices[0]).toBe(0); // 第一个顶点 x
        expect(geometry.vertices[1]).toBe(0); // 第一个顶点 y
        expect(geometry.vertices[8]).toBe(100); // 第二个顶点 x
        expect(geometry.vertices[9]).toBe(0); // 第二个顶点 y
        expect(geometry.vertices[16]).toBe(50); // 第三个顶点 x
        expect(geometry.vertices[17]).toBe(100); // 第三个顶点 y

        // 验证颜色
        expect(geometry.vertices[2]).toBe(1); // r
        expect(geometry.vertices[3]).toBe(1); // g
        expect(geometry.vertices[4]).toBe(0); // b
        expect(geometry.vertices[5]).toBe(1); // a

        // 验证索引
        expect(Array.from(geometry.indices)).toEqual([0, 1, 2]);
      });

      it('Then should generate correct quadrilateral polygon', () => {
        // Arrange: 准备四边形顶点
        const points = [
          { x: 0, y: 0 },
          { x: 100, y: 0 },
          { x: 100, y: 100 },
          { x: 0, y: 100 }
        ];

        // Act: 生成多边形几何体
        const geometry = GeometryGenerator.createPolygon(points);

        // Assert: 验证几何体数据
        expect(geometry.vertexCount).toBe(4);
        expect(geometry.indexCount).toBe(6); // 2个三角形
        expect(geometry.vertices.length).toBe(32); // 4 * 8
        expect(geometry.indices.length).toBe(6);

        // 验证索引（三角剖分）
        expect(Array.from(geometry.indices)).toEqual([0, 1, 2, 0, 2, 3]);
      });

      it('Then should handle empty points array', () => {
        // Arrange: 准备空顶点数组
        const points: { x: number; y: number }[] = [];

        // Act: 生成多边形几何体
        const geometry = GeometryGenerator.createPolygon(points);

        // Assert: 验证空几何体
        expect(geometry.vertexCount).toBe(0);
        expect(geometry.indexCount).toBe(0);
        expect(geometry.vertices.length).toBe(0);
        expect(geometry.indices.length).toBe(0);
      });
    });

    describe('When creating texture rectangle', () => {
      it('Then should generate correct texture rectangle', () => {
        // Arrange: 准备纹理矩形参数
        const x = 20, y = 30, width = 80, height = 60;

        // Act: 生成纹理矩形几何体
        const geometry = GeometryGenerator.createTextureRect(x, y, width, height);

        // Assert: 验证几何体数据
        expect(geometry.vertexCount).toBe(4);
        expect(geometry.indexCount).toBe(6);
        expect(geometry.vertices.length).toBe(32);
        expect(geometry.indices.length).toBe(6);

        // 验证纹理坐标
        // 左上角
        expect(geometry.vertices[6]).toBe(0); // u
        expect(geometry.vertices[7]).toBe(0); // v
        // 右上角
        expect(geometry.vertices[14]).toBe(1); // u
        expect(geometry.vertices[15]).toBe(0); // v
        // 右下角
        expect(geometry.vertices[22]).toBe(1); // u
        expect(geometry.vertices[23]).toBe(1); // v
        // 左下角
        expect(geometry.vertices[30]).toBe(0); // u
        expect(geometry.vertices[31]).toBe(1); // v
      });
    });

    describe('When creating unit quad', () => {
      it('Then should generate correct unit quad', () => {
        // Arrange: 准备颜色
        const color: [number, number, number, number] = [0.5, 0.5, 0.5, 0.5];

        // Act: 生成单位四边形几何体
        const geometry = GeometryGenerator.createUnitQuad(color);

        // Assert: 验证几何体数据
        expect(geometry.vertexCount).toBe(4);
        expect(geometry.indexCount).toBe(6);
        expect(geometry.vertices.length).toBe(32);
        expect(geometry.indices.length).toBe(6);

        // 验证单位坐标 (-1 到 1)
        expect(geometry.vertices[0]).toBe(-1); // 左上角 x
        expect(geometry.vertices[1]).toBe(-1); // 左上角 y
        expect(geometry.vertices[8]).toBe(1); // 右上角 x
        expect(geometry.vertices[9]).toBe(-1); // 右上角 y
        expect(geometry.vertices[16]).toBe(1); // 右下角 x
        expect(geometry.vertices[17]).toBe(1); // 右下角 y
        expect(geometry.vertices[24]).toBe(-1); // 左下角 x
        expect(geometry.vertices[25]).toBe(1); // 左下角 y

        // 验证颜色
        expect(geometry.vertices[2]).toBe(0.5); // r
        expect(geometry.vertices[3]).toBe(0.5); // g
        expect(geometry.vertices[4]).toBe(0.5); // b
        expect(geometry.vertices[5]).toBe(0.5); // a
      });

      it('Then should use default color when not specified', () => {
        // Act: 生成单位四边形几何体（默认颜色）
        const geometry = GeometryGenerator.createUnitQuad();

        // Assert: 验证默认颜色（白色）
        expect(geometry.vertices[2]).toBe(1); // r
        expect(geometry.vertices[3]).toBe(1); // g
        expect(geometry.vertices[4]).toBe(1); // b
        expect(geometry.vertices[5]).toBe(1); // a
      });
    });

    describe('When parsing color strings', () => {
      it('Then should parse hex color correctly', () => {
        // Arrange: 准备十六进制颜色
        const hexColor = '#FF0080';

        // Act: 解析颜色
        const color = GeometryGenerator.parseColor(hexColor);

        // Assert: 验证解析结果
        expect(color).toEqual([1, 0, 0.5019607843137255, 1]);
      });

      it('Then should parse short hex color correctly', () => {
        // Arrange: 准备短十六进制颜色
        const shortHexColor = '#F08';

        // Act: 解析颜色
        const color = GeometryGenerator.parseColor(shortHexColor);

        // Assert: 验证解析结果
        expect(color).toEqual([1, 0, 0.5333333333333333, 1]);
      });

      it('Then should parse rgb color correctly', () => {
        // Arrange: 准备RGB颜色
        const rgbColor = 'rgb(255, 128, 64)';

        // Act: 解析颜色
        const color = GeometryGenerator.parseColor(rgbColor);

        // Assert: 验证解析结果
        expect(color).toEqual([1, 0.5019607843137255, 0.25098039215686274, 1]);
      });

      it('Then should parse rgba color correctly', () => {
        // Arrange: 准备RGBA颜色
        const rgbaColor = 'rgba(255, 128, 64, 0.8)';

        // Act: 解析颜色
        const color = GeometryGenerator.parseColor(rgbaColor);

        // Assert: 验证解析结果
        expect(color).toEqual([1, 0.5019607843137255, 0.25098039215686274, 0.8]);
      });

      it('Then should handle invalid color format', () => {
        // Arrange: 准备无效颜色格式
        const invalidColor = 'invalid-color';

        // Act: 解析颜色
        const color = GeometryGenerator.parseColor(invalidColor);

        // Assert: 验证返回默认颜色（黑色）
        expect(color).toEqual([0, 0, 0, 1]);
      });

      it('Then should handle named colors', () => {
        // Arrange: 准备命名颜色
        const namedColor = 'red';

        // Act: 解析颜色
        const color = GeometryGenerator.parseColor(namedColor);

        // Assert: 验证解析结果（应该返回默认值，因为不支持命名颜色）
        expect(color).toEqual([0, 0, 0, 1]);
      });
    });

    describe('When validating geometry data structure', () => {
      it('Then should have consistent data structure across all methods', () => {
        // Arrange: 准备测试参数
        const testCases = [
          () => GeometryGenerator.createRectangle(0, 0, 10, 10),
          () => GeometryGenerator.createCircle(0, 0, 5, 8),
          () => GeometryGenerator.createLine(0, 0, 10, 10),
          () => GeometryGenerator.createPolygon([{ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 5, y: 10 }]),
          () => GeometryGenerator.createTextureRect(0, 0, 10, 10),
          () => GeometryGenerator.createUnitQuad()
        ];

        testCases.forEach((createGeometry, index) => {
          // Act: 生成几何体
          const geometry = createGeometry();

          // Assert: 验证数据结构一致性
          expect(geometry).toHaveProperty('vertices');
          expect(geometry).toHaveProperty('indices');
          expect(geometry).toHaveProperty('vertexCount');
          expect(geometry).toHaveProperty('indexCount');
          expect(geometry.vertices).toBeInstanceOf(Float32Array);
          expect(geometry.indices).toBeInstanceOf(Uint16Array);
          expect(geometry.vertices.length).toBe(geometry.vertexCount * 8); // 8 floats per vertex
          expect(geometry.vertexCount).toBeGreaterThanOrEqual(0);
          expect(geometry.indexCount).toBeGreaterThanOrEqual(0);
        });
      });
    });
  });
});