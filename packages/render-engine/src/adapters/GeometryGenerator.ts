/**
 * WebGL几何体生成工具
 * 生成基础图形的顶点和索引数据
 */

export interface GeometryData {
  vertices: Float32Array
  indices: Uint16Array
  vertexCount: number
  indexCount: number
}

/**
 * 顶点数据格式: position(2) + color(4) + texCoord(2) = 8 floats per vertex
 */
export class GeometryGenerator {
  /**
   * 生成矩形几何体
   * @param x 左上角X坐标
   * @param y 左上角Y坐标
   * @param width 宽度
   * @param height 高度
   * @param color 颜色 [r, g, b, a]
   */
  static createRectangle(
    x: number,
    y: number,
    width: number,
    height: number,
    color: [number, number, number, number] = [1, 1, 1, 1]
  ): GeometryData {
    // 4个顶点，每个顶点8个float
    const vertices = new Float32Array(4 * 8)
    const indices = new Uint16Array([
      0,
      1,
      2, // 第一个三角形
      0,
      2,
      3, // 第二个三角形
    ])

    const [r, g, b, a] = color

    // 顶点数据布局：x, y, r, g, b, a, u, v
    let offset = 0

    // 左上角
    vertices[offset++] = x
    vertices[offset++] = y
    vertices[offset++] = r
    vertices[offset++] = g
    vertices[offset++] = b
    vertices[offset++] = a
    vertices[offset++] = 0 // u
    vertices[offset++] = 0 // v

    // 右上角
    vertices[offset++] = x + width
    vertices[offset++] = y
    vertices[offset++] = r
    vertices[offset++] = g
    vertices[offset++] = b
    vertices[offset++] = a
    vertices[offset++] = 1 // u
    vertices[offset++] = 0 // v

    // 右下角
    vertices[offset++] = x + width
    vertices[offset++] = y + height
    vertices[offset++] = r
    vertices[offset++] = g
    vertices[offset++] = b
    vertices[offset++] = a
    vertices[offset++] = 1 // u
    vertices[offset++] = 1 // v

    // 左下角
    vertices[offset++] = x
    vertices[offset++] = y + height
    vertices[offset++] = r
    vertices[offset++] = g
    vertices[offset++] = b
    vertices[offset++] = a
    vertices[offset++] = 0 // u
    vertices[offset++] = 1 // v

    return {
      vertices,
      indices,
      vertexCount: 4,
      indexCount: 6,
    }
  }

  /**
   * 生成圆形几何体
   * @param centerX 圆心X坐标
   * @param centerY 圆心Y坐标
   * @param radius 半径
   * @param segments 分段数（默认32）
   * @param color 颜色 [r, g, b, a]
   */
  static createCircle(
    centerX: number,
    centerY: number,
    radius: number,
    segments: number = 32,
    color: [number, number, number, number] = [1, 1, 1, 1]
  ): GeometryData {
    // 圆心 + 圆周顶点
    const vertexCount = segments + 1
    const vertices = new Float32Array(vertexCount * 8)
    const indices = new Uint16Array(segments * 3)

    const [r, g, b, a] = color
    let offset = 0

    // 圆心顶点
    vertices[offset++] = centerX
    vertices[offset++] = centerY
    vertices[offset++] = r
    vertices[offset++] = g
    vertices[offset++] = b
    vertices[offset++] = a
    vertices[offset++] = 0.5 // u (中心)
    vertices[offset++] = 0.5 // v (中心)

    // 圆周顶点
    for (let i = 0; i < segments; i++) {
      const angle = (i / segments) * Math.PI * 2
      const x = centerX + Math.cos(angle) * radius
      const y = centerY + Math.sin(angle) * radius

      vertices[offset++] = x
      vertices[offset++] = y
      vertices[offset++] = r
      vertices[offset++] = g
      vertices[offset++] = b
      vertices[offset++] = a
      vertices[offset++] = (Math.cos(angle) + 1) * 0.5 // u
      vertices[offset++] = (Math.sin(angle) + 1) * 0.5 // v
    }

    // 生成索引（扇形三角形）
    let indexOffset = 0
    for (let i = 0; i < segments; i++) {
      const next = (i + 1) % segments
      indices[indexOffset++] = 0 // 圆心
      indices[indexOffset++] = i + 1 // 当前点
      indices[indexOffset++] = next + 1 // 下一个点
    }

    return {
      vertices,
      indices,
      vertexCount,
      indexCount: segments * 3,
    }
  }

  /**
   * 生成线条几何体
   * @param x1 起点X坐标
   * @param y1 起点Y坐标
   * @param x2 终点X坐标
   * @param y2 终点Y坐标
   * @param width 线宽
   * @param color 颜色 [r, g, b, a]
   */
  static createLine(
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    width: number = 1,
    color: [number, number, number, number] = [1, 1, 1, 1]
  ): GeometryData {
    // 计算线条方向和法向量
    const dx = x2 - x1
    const dy = y2 - y1
    const length = Math.sqrt(dx * dx + dy * dy)

    if (length < 1e-6) {
      // 线条长度为0，返回空几何体
      return {
        vertices: new Float32Array(0),
        indices: new Uint16Array(0),
        vertexCount: 0,
        indexCount: 0,
      }
    }

    // 归一化方向向量
    const dirX = dx / length
    const dirY = dy / length

    // 计算法向量（垂直于线条方向）
    const normalX = -dirY
    const normalY = dirX

    // 半宽
    const halfWidth = width * 0.5

    // 4个顶点构成矩形线条
    const vertices = new Float32Array(4 * 8)
    const indices = new Uint16Array([0, 1, 2, 0, 2, 3])

    const [r, g, b, a] = color
    let offset = 0

    // 起点左侧
    vertices[offset++] = x1 + normalX * halfWidth
    vertices[offset++] = y1 + normalY * halfWidth
    vertices[offset++] = r
    vertices[offset++] = g
    vertices[offset++] = b
    vertices[offset++] = a
    vertices[offset++] = 0 // u
    vertices[offset++] = 0 // v

    // 起点右侧
    vertices[offset++] = x1 - normalX * halfWidth
    vertices[offset++] = y1 - normalY * halfWidth
    vertices[offset++] = r
    vertices[offset++] = g
    vertices[offset++] = b
    vertices[offset++] = a
    vertices[offset++] = 0 // u
    vertices[offset++] = 1 // v

    // 终点右侧
    vertices[offset++] = x2 - normalX * halfWidth
    vertices[offset++] = y2 - normalY * halfWidth
    vertices[offset++] = r
    vertices[offset++] = g
    vertices[offset++] = b
    vertices[offset++] = a
    vertices[offset++] = 1 // u
    vertices[offset++] = 1 // v

    // 终点左侧
    vertices[offset++] = x2 + normalX * halfWidth
    vertices[offset++] = y2 + normalY * halfWidth
    vertices[offset++] = r
    vertices[offset++] = g
    vertices[offset++] = b
    vertices[offset++] = a
    vertices[offset++] = 1 // u
    vertices[offset++] = 0 // v

    return {
      vertices,
      indices,
      vertexCount: 4,
      indexCount: 6,
    }
  }

  /**
   * 生成多边形几何体（使用三角化）
   * @param points 多边形顶点数组
   * @param color 颜色 [r, g, b, a]
   */
  static createPolygon(
    points: { x: number; y: number }[],
    color: [number, number, number, number] = [1, 1, 1, 1]
  ): GeometryData {
    if (points.length < 3) {
      return {
        vertices: new Float32Array(0),
        indices: new Uint16Array(0),
        vertexCount: 0,
        indexCount: 0,
      }
    }

    const vertexCount = points.length
    const vertices = new Float32Array(vertexCount * 8)

    // 使用扇形三角化：以第一个点为中心，连接相邻点构成三角形
    const triangleCount = Math.max(0, vertexCount - 2)
    const indices = new Uint16Array(triangleCount * 3)

    const [r, g, b, a] = color
    let offset = 0

    // 设置顶点数据
    for (let i = 0; i < vertexCount; i++) {
      const point = points[i]
      vertices[offset++] = point.x
      vertices[offset++] = point.y
      vertices[offset++] = r
      vertices[offset++] = g
      vertices[offset++] = b
      vertices[offset++] = a
      vertices[offset++] = 0 // u
      vertices[offset++] = 0 // v
    }

    // 生成三角形索引（扇形三角化）
    let indexOffset = 0
    for (let i = 1; i < vertexCount - 1; i++) {
      indices[indexOffset++] = 0 // 第一个点作为中心
      indices[indexOffset++] = i // 当前点
      indices[indexOffset++] = i + 1 // 下一个点
    }

    return {
      vertices,
      indices,
      vertexCount,
      indexCount: triangleCount * 3,
    }
  }

  /**
   * 创建纹理矩形（用于纹理绘制）
   * @param x X坐标
   * @param y Y坐标
   * @param width 宽度
   * @param height 高度
   */
  static createTextureRect(x: number, y: number, width: number, height: number): GeometryData {
    // 纹理矩形使用白色，颜色由纹理提供
    return GeometryGenerator.createRectangle(x, y, width, height, [1, 1, 1, 1])
  }

  /**
   * 创建单位四边形（用于纹理绘制）
   */
  static createUnitQuad(color: [number, number, number, number] = [1, 1, 1, 1]): GeometryData {
    return GeometryGenerator.createRectangle(0, 0, 1, 1, color)
  }

  /**
   * 解析颜色字符串为RGBA数组
   */
  static parseColor(colorString: string): [number, number, number, number] {
    if (colorString.startsWith('#')) {
      const hex = colorString.slice(1)
      if (hex.length === 3) {
        // #RGB -> #RRGGBB
        const r = parseInt(hex[0] + hex[0], 16) / 255
        const g = parseInt(hex[1] + hex[1], 16) / 255
        const b = parseInt(hex[2] + hex[2], 16) / 255
        return [r, g, b, 1]
      } else if (hex.length === 6) {
        // #RRGGBB
        const r = parseInt(hex.slice(0, 2), 16) / 255
        const g = parseInt(hex.slice(2, 4), 16) / 255
        const b = parseInt(hex.slice(4, 6), 16) / 255
        return [r, g, b, 1]
      }
    } else if (colorString.startsWith('rgb')) {
      // 简化的RGB解析
      const match = colorString.match(/\d+(\.\d+)?/g)
      if (match && match.length >= 3) {
        const r = parseFloat(match[0] || '0') / 255
        const g = parseFloat(match[1] || '0') / 255
        const b = parseFloat(match[2] || '0') / 255
        const a = match.length > 3 ? parseFloat(match[3] || '1') : 1
        return [r, g, b, a]
      }
    }

    // 默认黑色
    return [0, 0, 0, 1]
  }
}
