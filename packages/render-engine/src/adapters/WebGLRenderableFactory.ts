/**
 * WebGL可渲染对象工厂
 * 创建各种几何体的可渲染对象
 */

import type { IRenderable } from '../batch'
import { GeometryGenerator } from './GeometryGenerator'

/**
 * WebGL可渲染对象工厂
 */
export class WebGLRenderableFactory {
  /**
   * 创建矩形可渲染对象
   */
  static createRectangle(
    x: number,
    y: number,
    width: number,
    height: number,
    color: [number, number, number, number]
  ): IRenderable {
    const vertices = new Float32Array([
      // position + color + uv
      x,
      y,
      color[0],
      color[1],
      color[2],
      color[3],
      0,
      0,
      x + width,
      y,
      color[0],
      color[1],
      color[2],
      color[3],
      1,
      0,
      x + width,
      y + height,
      color[0],
      color[1],
      color[2],
      color[3],
      1,
      1,
      x,
      y + height,
      color[0],
      color[1],
      color[2],
      color[3],
      0,
      1,
    ])

    const indices = new Uint16Array([0, 1, 2, 0, 2, 3])

    return {
      getVertices: () => vertices,
      getIndices: () => indices,
      getShader: () => 'basic_shape',
      getBlendMode: () => 0, // NORMAL
      getZIndex: () => 0,
    }
  }

  /**
   * 创建圆形可渲染对象
   */
  static createCircle(
    centerX: number,
    centerY: number,
    radius: number,
    segments: number,
    color: [number, number, number, number]
  ): IRenderable {
    const vertexCount = segments + 1
    const vertices = new Float32Array(vertexCount * 8)
    const indices: number[] = []

    // 中心点
    vertices[0] = centerX
    vertices[1] = centerY
    vertices[2] = color[0]
    vertices[3] = color[1]
    vertices[4] = color[2]
    vertices[5] = color[3]
    vertices[6] = 0.5
    vertices[7] = 0.5

    // 圆周点
    for (let i = 0; i < segments; i++) {
      const angle = (i / segments) * 2 * Math.PI
      const x = centerX + Math.cos(angle) * radius
      const y = centerY + Math.sin(angle) * radius

      const offset = (i + 1) * 8
      vertices[offset] = x
      vertices[offset + 1] = y
      vertices[offset + 2] = color[0]
      vertices[offset + 3] = color[1]
      vertices[offset + 4] = color[2]
      vertices[offset + 5] = color[3]
      vertices[offset + 6] = 0.5 + Math.cos(angle) * 0.5
      vertices[offset + 7] = 0.5 + Math.sin(angle) * 0.5

      const next = ((i + 1) % segments) + 1
      indices.push(0, i + 1, next)
    }

    return {
      getVertices: () => vertices,
      getIndices: () => new Uint16Array(indices),
      getShader: () => 'basic_shape',
      getBlendMode: () => 0,
      getZIndex: () => 0,
    }
  }

  /**
   * 创建线条可渲染对象
   */
  static createLine(
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    width: number,
    color: [number, number, number, number]
  ): IRenderable {
    const dx = x2 - x1
    const dy = y2 - y1
    const angle = Math.atan2(dy, dx)

    const cos = Math.cos(angle)
    const sin = Math.sin(angle)
    const halfWidth = width / 2

    const vertices = new Float32Array([
      x1 - sin * halfWidth,
      y1 + cos * halfWidth,
      color[0],
      color[1],
      color[2],
      color[3],
      0,
      0,
      x2 - sin * halfWidth,
      y2 + cos * halfWidth,
      color[0],
      color[1],
      color[2],
      color[3],
      1,
      0,
      x2 + sin * halfWidth,
      y2 - cos * halfWidth,
      color[0],
      color[1],
      color[2],
      color[3],
      1,
      1,
      x1 + sin * halfWidth,
      y1 - cos * halfWidth,
      color[0],
      color[1],
      color[2],
      color[3],
      0,
      1,
    ])

    const indices = new Uint16Array([0, 1, 2, 0, 2, 3])

    return {
      getVertices: () => vertices,
      getIndices: () => indices,
      getShader: () => 'basic_shape',
      getBlendMode: () => 0,
      getZIndex: () => 0,
    }
  }

  /**
   * 绘制矩形描边（返回多个线条可渲染对象）
   */
  static createRectangleStroke(
    x: number,
    y: number,
    width: number,
    height: number,
    strokeColor: string,
    strokeWidth: number
  ): IRenderable[] {
    const color = GeometryGenerator.parseColor(strokeColor)

    const lines = [
      { x1: x, y1: y, x2: x + width, y2: y },
      { x1: x + width, y1: y, x2: x + width, y2: y + height },
      { x1: x + width, y1: y + height, x2: x, y2: y + height },
      { x1: x, y1: y + height, x2: x, y2: y },
    ]

    return lines.map((line) =>
      WebGLRenderableFactory.createLine(line.x1, line.y1, line.x2, line.y2, strokeWidth, color)
    )
  }

  /**
   * 从顶点和颜色数组创建可渲染对象
   * @param positions 位置数组 [x1, y1, x2, y2, ...]
   * @param colors 颜色数组 [r1, g1, b1, a1, r2, g2, b2, a2, ...]
   */
  static createFromVertices(positions: number[], colors: number[]): IRenderable {
    const vertexCount = positions.length / 2
    // 每个顶点：x, y, r, g, b, a, u, v
    const vertices = new Float32Array(vertexCount * 8)

    for (let i = 0; i < vertexCount; i++) {
      const posOffset = i * 2
      const colorOffset = i * 4
      const vertexOffset = i * 8

      vertices[vertexOffset] = positions[posOffset] // x
      vertices[vertexOffset + 1] = positions[posOffset + 1] // y
      vertices[vertexOffset + 2] = colors[colorOffset] // r
      vertices[vertexOffset + 3] = colors[colorOffset + 1] // g
      vertices[vertexOffset + 4] = colors[colorOffset + 2] // b
      vertices[vertexOffset + 5] = colors[colorOffset + 3] // a
      vertices[vertexOffset + 6] = 0 // u
      vertices[vertexOffset + 7] = 0 // v
    }

    // 为三角形创建索引（每3个顶点一个三角形）
    const triangleCount = vertexCount / 3
    const indices = new Uint16Array(vertexCount)
    for (let i = 0; i < vertexCount; i++) {
      indices[i] = i
    }

    return {
      getVertices: () => vertices,
      getIndices: () => indices,
      getShader: () => 'basic_shape',
      getBlendMode: () => 0,
      getZIndex: () => 0,
    }
  }
}
