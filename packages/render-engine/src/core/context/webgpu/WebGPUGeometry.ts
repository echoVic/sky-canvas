/**
 * WebGPU 几何图形生成器
 * 生成各种图形的顶点数据
 */

/**
 * RGBA 颜色
 */
export interface Color {
  r: number;
  g: number;
  b: number;
  a: number;
}

/**
 * 矩形顶点数据
 */
export interface RectVertices {
  vertices: Float32Array;
  indices: Uint16Array;
  vertexCount: number;
  indexCount: number;
}

/**
 * 圆形顶点数据
 */
export interface CircleVertices {
  vertices: Float32Array;
  indices: Uint16Array;
  vertexCount: number;
  indexCount: number;
}

/**
 * 线段顶点数据
 */
export interface LineVertices {
  vertices: Float32Array;
  indices: Uint16Array;
  vertexCount: number;
  indexCount: number;
}

/**
 * WebGPU 几何图形生成器
 */
export class WebGPUGeometry {
  /**
   * 生成矩形顶点数据
   * 顶点格式：position (2) + color (4) = 6 floats per vertex
   */
  static createRect(
    x: number,
    y: number,
    width: number,
    height: number,
    color: Color
  ): RectVertices {
    const { r, g, b, a } = color;

    // 4个顶点，每个顶点 6 个 float (x, y, r, g, b, a)
    const vertices = new Float32Array([
      // 左上
      x, y, r, g, b, a,
      // 右上
      x + width, y, r, g, b, a,
      // 右下
      x + width, y + height, r, g, b, a,
      // 左下
      x, y + height, r, g, b, a
    ]);

    // 两个三角形组成矩形
    const indices = new Uint16Array([
      0, 1, 2, // 第一个三角形
      0, 2, 3  // 第二个三角形
    ]);

    return {
      vertices,
      indices,
      vertexCount: 4,
      indexCount: 6
    };
  }

  /**
   * 生成矩形边框顶点数据
   */
  static createRectStroke(
    x: number,
    y: number,
    width: number,
    height: number,
    lineWidth: number,
    color: Color
  ): RectVertices {
    const { r, g, b, a } = color;
    const hw = lineWidth / 2;

    // 8个顶点组成边框（外圈4个 + 内圈4个）
    const vertices = new Float32Array([
      // 外圈
      x - hw, y - hw, r, g, b, a,
      x + width + hw, y - hw, r, g, b, a,
      x + width + hw, y + height + hw, r, g, b, a,
      x - hw, y + height + hw, r, g, b, a,
      // 内圈
      x + hw, y + hw, r, g, b, a,
      x + width - hw, y + hw, r, g, b, a,
      x + width - hw, y + height - hw, r, g, b, a,
      x + hw, y + height - hw, r, g, b, a
    ]);

    // 8个三角形组成边框
    const indices = new Uint16Array([
      // 上边
      0, 1, 5, 0, 5, 4,
      // 右边
      1, 2, 6, 1, 6, 5,
      // 下边
      2, 3, 7, 2, 7, 6,
      // 左边
      3, 0, 4, 3, 4, 7
    ]);

    return {
      vertices,
      indices,
      vertexCount: 8,
      indexCount: 24
    };
  }

  /**
   * 生成圆形顶点数据（用于SDF渲染的四边形）
   */
  static createCircleQuad(
    centerX: number,
    centerY: number,
    radius: number
  ): CircleVertices {
    const r = radius;

    // 创建覆盖圆形的四边形，用于SDF渲染
    // 只需要位置，颜色通过 uniform 传入
    const vertices = new Float32Array([
      -1, -1,  // 左下
       1, -1,  // 右下
       1,  1,  // 右上
      -1,  1   // 左上
    ]);

    const indices = new Uint16Array([
      0, 1, 2,
      0, 2, 3
    ]);

    return {
      vertices,
      indices,
      vertexCount: 4,
      indexCount: 6
    };
  }

  /**
   * 生成实心圆顶点数据（三角形扇形）
   */
  static createCircleFill(
    centerX: number,
    centerY: number,
    radius: number,
    color: Color,
    segments: number = 32
  ): CircleVertices {
    const { r, g, b, a } = color;
    const vertices: number[] = [];
    const indices: number[] = [];

    // 中心点
    vertices.push(centerX, centerY, r, g, b, a);

    // 周边点
    for (let i = 0; i <= segments; i++) {
      const angle = (i / segments) * Math.PI * 2;
      const x = centerX + Math.cos(angle) * radius;
      const y = centerY + Math.sin(angle) * radius;
      vertices.push(x, y, r, g, b, a);
    }

    // 三角形索引
    for (let i = 1; i <= segments; i++) {
      indices.push(0, i, i + 1);
    }

    return {
      vertices: new Float32Array(vertices),
      indices: new Uint16Array(indices),
      vertexCount: segments + 2,
      indexCount: segments * 3
    };
  }

  /**
   * 生成线段顶点数据
   * 顶点格式：position (2) + normal (2) = 4 floats per vertex
   */
  static createLine(
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    lineWidth: number,
    color: Color
  ): LineVertices {
    // 计算线段方向和法线
    const dx = x2 - x1;
    const dy = y2 - y1;
    const len = Math.sqrt(dx * dx + dy * dy);

    if (len === 0) {
      return {
        vertices: new Float32Array(0),
        indices: new Uint16Array(0),
        vertexCount: 0,
        indexCount: 0
      };
    }

    // 单位法线
    const nx = -dy / len;
    const ny = dx / len;

    const hw = lineWidth / 2;
    const { r, g, b, a } = color;

    // 4个顶点组成线段矩形
    const vertices = new Float32Array([
      // 起点两侧
      x1 + nx * hw, y1 + ny * hw, r, g, b, a,
      x1 - nx * hw, y1 - ny * hw, r, g, b, a,
      // 终点两侧
      x2 + nx * hw, y2 + ny * hw, r, g, b, a,
      x2 - nx * hw, y2 - ny * hw, r, g, b, a
    ]);

    const indices = new Uint16Array([
      0, 1, 3,
      0, 3, 2
    ]);

    return {
      vertices,
      indices,
      vertexCount: 4,
      indexCount: 6
    };
  }

  /**
   * 生成多段线顶点数据
   */
  static createPolyline(
    points: Array<{ x: number; y: number }>,
    lineWidth: number,
    color: Color,
    closed: boolean = false
  ): LineVertices {
    if (points.length < 2) {
      return {
        vertices: new Float32Array(0),
        indices: new Uint16Array(0),
        vertexCount: 0,
        indexCount: 0
      };
    }

    const { r, g, b, a } = color;
    const hw = lineWidth / 2;
    const vertices: number[] = [];
    const indices: number[] = [];

    const actualPoints = closed ? [...points, points[0]] : points;

    for (let i = 0; i < actualPoints.length - 1; i++) {
      const p0 = actualPoints[i];
      const p1 = actualPoints[i + 1];

      const dx = p1.x - p0.x;
      const dy = p1.y - p0.y;
      const len = Math.sqrt(dx * dx + dy * dy);

      if (len === 0) continue;

      const nx = -dy / len;
      const ny = dx / len;

      const baseIndex = vertices.length / 6;

      // 添加4个顶点
      vertices.push(
        p0.x + nx * hw, p0.y + ny * hw, r, g, b, a,
        p0.x - nx * hw, p0.y - ny * hw, r, g, b, a,
        p1.x + nx * hw, p1.y + ny * hw, r, g, b, a,
        p1.x - nx * hw, p1.y - ny * hw, r, g, b, a
      );

      // 添加索引
      indices.push(
        baseIndex, baseIndex + 1, baseIndex + 3,
        baseIndex, baseIndex + 3, baseIndex + 2
      );
    }

    return {
      vertices: new Float32Array(vertices),
      indices: new Uint16Array(indices),
      vertexCount: vertices.length / 6,
      indexCount: indices.length
    };
  }

  /**
   * 生成三角形顶点数据
   */
  static createTriangle(
    x1: number, y1: number,
    x2: number, y2: number,
    x3: number, y3: number,
    color: Color
  ): RectVertices {
    const { r, g, b, a } = color;

    const vertices = new Float32Array([
      x1, y1, r, g, b, a,
      x2, y2, r, g, b, a,
      x3, y3, r, g, b, a
    ]);

    const indices = new Uint16Array([0, 1, 2]);

    return {
      vertices,
      indices,
      vertexCount: 3,
      indexCount: 3
    };
  }

  /**
   * 生成单位四边形（用于纹理渲染）
   */
  static createTexturedQuad(
    x: number,
    y: number,
    width: number,
    height: number,
    color: Color = { r: 1, g: 1, b: 1, a: 1 }
  ): RectVertices {
    const { r, g, b, a } = color;

    // 顶点格式：position (2) + texCoord (2) + color (4) = 8 floats
    const vertices = new Float32Array([
      // 左上
      x, y, 0, 0, r, g, b, a,
      // 右上
      x + width, y, 1, 0, r, g, b, a,
      // 右下
      x + width, y + height, 1, 1, r, g, b, a,
      // 左下
      x, y + height, 0, 1, r, g, b, a
    ]);

    const indices = new Uint16Array([
      0, 1, 2,
      0, 2, 3
    ]);

    return {
      vertices,
      indices,
      vertexCount: 4,
      indexCount: 6
    };
  }
}
