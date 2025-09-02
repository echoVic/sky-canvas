/**
 * 批量渲染几何图形处理
 */

import { Vector2 } from '../../math';
import { BlendMode } from '../../core/RenderTypes';
import { BatchVertex, QuadParams, TriangleParams, LineParams } from '../types/BatchTypes';
import { BatchBuffer } from './BatchBuffer';

export class BatchGeometry {
  private buffer: BatchBuffer;

  constructor(buffer: BatchBuffer) {
    this.buffer = buffer;
  }

  /**
   * 添加四边形
   */
  addQuad(params: QuadParams): boolean {
    const { positions, colors, texCoords, texture } = params;
    
    // 检查空间
    if (!this.buffer.hasSpace(4, 6)) {
      return false;
    }

    // 获取纹理ID
    const textureId = texture ? 0 : 0; // 简化处理，实际应由纹理管理器处理

    // 添加四个顶点
    const baseVertex = this.buffer.getVertexCount();
    for (let i = 0; i < 4; i++) {
      const vertex: BatchVertex = {
        position: positions[i],
        color: colors[i],
        texCoord: texCoords?.[i] || new Vector2(0, 0),
        textureId
      };
      this.buffer.addVertex(vertex);
    }

    // 添加索引（两个三角形组成四边形）
    const quadIndices = [0, 1, 2, 0, 2, 3];
    for (const index of quadIndices) {
      this.buffer.addIndex(baseVertex + index);
    }

    return true;
  }

  /**
   * 添加三角形
   */
  addTriangle(params: TriangleParams): boolean {
    const { positions, colors, texCoords, texture } = params;
    
    // 检查空间
    if (!this.buffer.hasSpace(3, 3)) {
      return false;
    }

    // 获取纹理ID
    const textureId = texture ? 0 : 0; // 简化处理

    // 添加三个顶点
    const baseVertex = this.buffer.getVertexCount();
    for (let i = 0; i < 3; i++) {
      const vertex: BatchVertex = {
        position: positions[i],
        color: colors[i],
        texCoord: texCoords?.[i] || new Vector2(0, 0),
        textureId
      };
      this.buffer.addVertex(vertex);
    }

    // 添加三角形索引
    for (let i = 0; i < 3; i++) {
      this.buffer.addIndex(baseVertex + i);
    }

    return true;
  }

  /**
   * 添加线段
   */
  addLine(params: LineParams): boolean {
    const { start, end, color, width = 1.0 } = params;
    
    // 将线段转换为四边形
    const direction = end.subtract(start).normalize();
    const perpendicular = new Vector2(-direction.y, direction.x).multiply(width * 0.5);

    const positions: [Vector2, Vector2, Vector2, Vector2] = [
      start.subtract(perpendicular),
      start.add(perpendicular),
      end.add(perpendicular),
      end.subtract(perpendicular)
    ];

    const colors: [[number, number, number, number], [number, number, number, number], [number, number, number, number], [number, number, number, number]] = [
      color, color, color, color
    ];

    return this.addQuad({
      positions,
      colors,
      blendMode: BlendMode.NORMAL
    });
  }

  /**
   * 添加矩形
   */
  addRect(
    x: number, 
    y: number, 
    width: number, 
    height: number, 
    color: [number, number, number, number]
  ): boolean {
    const positions: [Vector2, Vector2, Vector2, Vector2] = [
      new Vector2(x, y),
      new Vector2(x + width, y),
      new Vector2(x + width, y + height),
      new Vector2(x, y + height)
    ];

    const colors: [[number, number, number, number], [number, number, number, number], [number, number, number, number], [number, number, number, number]] = [
      color, color, color, color
    ];

    return this.addQuad({
      positions,
      colors,
      blendMode: BlendMode.NORMAL
    });
  }

  /**
   * 添加圆形（使用三角扇形近似）
   */
  addCircle(
    center: Vector2, 
    radius: number, 
    color: [number, number, number, number], 
    segments: number = 32
  ): boolean {
    // 检查空间（中心点 + 圆周点 + 三角形索引）
    const vertexCount = segments + 1;
    const indexCount = segments * 3;
    
    if (!this.buffer.hasSpace(vertexCount, indexCount)) {
      return false;
    }

    const baseVertex = this.buffer.getVertexCount();

    // 添加中心点
    this.buffer.addVertex({
      position: center,
      color,
      texCoord: new Vector2(0.5, 0.5)
    });

    // 添加圆周点
    for (let i = 0; i < segments; i++) {
      const angle = (i / segments) * Math.PI * 2;
      const x = center.x + Math.cos(angle) * radius;
      const y = center.y + Math.sin(angle) * radius;
      
      this.buffer.addVertex({
        position: new Vector2(x, y),
        color,
        texCoord: new Vector2(
          0.5 + Math.cos(angle) * 0.5,
          0.5 + Math.sin(angle) * 0.5
        )
      });
    }

    // 添加三角形索引
    for (let i = 0; i < segments; i++) {
      const next = (i + 1) % segments;
      this.buffer.addIndex(baseVertex); // 中心点
      this.buffer.addIndex(baseVertex + 1 + i); // 当前圆周点
      this.buffer.addIndex(baseVertex + 1 + next); // 下一个圆周点
    }

    return true;
  }
}
