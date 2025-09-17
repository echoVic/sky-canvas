/**
 * 批量渲染器 - 重构后的主入口
 */

import { BlendMode } from '../webgl/types';
import { RenderStats } from '../renderers/types';
import { Matrix3x3, Vector2 } from '../math';
import { WebGLResourceManager } from '../resources/ResourceManager';
import { WebGLShaderManager } from '../shaders/ShaderManager';

import { BatchBuffer } from './core/BatchBuffer';
import { BatchGeometry } from './core/BatchGeometry';
import { BatchRenderManager } from './core/BatchRenderer';
import {
  BatchConfig,
  BatchState,
  LineParams,
  QuadParams,
  TriangleParams
} from './types/BatchTypes';

// 重新导出类型以保持向后兼容
export { BatchState } from './types/BatchTypes';
export type {
  BatchConfig, BatchVertex, LineParams, QuadParams,
  TriangleParams
} from './types/BatchTypes';

/**
 * 批量渲染器主类
 */
export class BatchRenderer {
  private buffer: BatchBuffer;
  private geometry: BatchGeometry;
  private renderManager: BatchRenderManager;
  
  // 批次状态
  private state = BatchState.READY;
  private config: BatchConfig;

  constructor(
    gl: WebGLRenderingContext,
    shaderManager: WebGLShaderManager,
    resourceManager: WebGLResourceManager,
    config?: Partial<BatchConfig>
  ) {
    // 配置默认值
    this.config = {
      maxVertices: 10000,
      maxIndices: 15000,
      maxTextures: 8,
      vertexSize: 8, // position(2) + color(4) + texCoord(2)
      ...config
    };

    // 初始化子模块
    this.buffer = new BatchBuffer(gl, resourceManager, this.config);
    this.geometry = new BatchGeometry(this.buffer);
    this.renderManager = new BatchRenderManager(gl, shaderManager, resourceManager, this.config);
  }

  /**
   * 开始新批次
   */
  begin(): void {
    if (this.state === BatchState.BUILDING) {
      throw new Error('Batch already in progress');
    }
    
    this.state = BatchState.BUILDING;
    this.buffer.clear();
    this.renderManager.resetBatch();
    this.renderManager.resetStats();
  }

  /**
   * 结束当前批次
   */
  end(): void {
    if (this.state !== BatchState.BUILDING) {
      throw new Error('No batch in progress');
    }
    if (this.buffer.getVertexCount() > 0) {
      this.flush();
    }
    this.state = BatchState.READY;
  }

  /**
   * 添加四边形到批次
   */
  addQuad(
    positions: [Vector2, Vector2, Vector2, Vector2],
    colors: [[number, number, number, number], [number, number, number, number], [number, number, number, number], [number, number, number, number]],
    texCoords?: [Vector2, Vector2, Vector2, Vector2],
    texture?: WebGLTexture,
    blendMode: BlendMode = BlendMode.NORMAL
  ): boolean {
    // 检查批次状态
    if (this.state !== BatchState.BUILDING) {
      throw new Error('Batch not started');
    }

    // 检查是否需要刷新批次
    if (!this.buffer.hasSpace(4, 6) || this.renderManager.needsFlush(4, 6, texture, blendMode)) {
      this.flush();
      // 刷新后再次检查空间，如果仍然没有空间则返回false
      if (!this.buffer.hasSpace(4, 6)) {
        return false;
      }
    }

    const params: QuadParams = {
      positions,
      colors,
      texCoords,
      texture,
      blendMode
    };

    const success = this.geometry.addQuad(params);
    if (success && blendMode) {
      this.renderManager.setBlendMode(blendMode);
    }
    
    return success;
  }

  /**
   * 添加三角形到批次
   */
  addTriangle(
    positions: [Vector2, Vector2, Vector2],
    colors: [[number, number, number, number], [number, number, number, number], [number, number, number, number]],
    texCoords?: [Vector2, Vector2, Vector2],
    texture?: WebGLTexture,
    blendMode: BlendMode = BlendMode.NORMAL
  ): boolean {
    // 检查批次状态
    if (this.state !== BatchState.BUILDING) {
      throw new Error('Batch not started');
    }

    // 检查是否需要刷新批次
    if (!this.buffer.hasSpace(3, 3) || this.renderManager.needsFlush(3, 3, texture, blendMode)) {
      this.flush();
    }

    const params: TriangleParams = {
      positions,
      colors,
      texCoords,
      texture,
      blendMode
    };

    const success = this.geometry.addTriangle(params);
    if (success && blendMode) {
      this.renderManager.setBlendMode(blendMode);
    }
    
    return success;
  }

  /**
   * 添加线段到批次
   */
  addLine(
    start: Vector2,
    end: Vector2,
    color: [number, number, number, number],
    width: number = 1.0
  ): boolean {
    // 检查批次状态
    if (this.state !== BatchState.BUILDING) {
      throw new Error('Batch not started');
    }

    const params: LineParams = {
      start,
      end,
      color,
      width
    };

    return this.geometry.addLine(params);
  }

  /**
   * 刷新当前批次
   */
  private flush(): void {
    const vertexCount = this.buffer.getVertexCount();
    const indexCount = this.buffer.getIndexCount();
    
    if (vertexCount === 0 || this.state !== BatchState.BUILDING) return;

    // 更新缓冲区
    this.buffer.updateBuffers();
    this.buffer.bind();

    // 执行渲染
    this.renderManager.render(vertexCount, indexCount);

    // 重置批次
    this.buffer.clear();
    this.renderManager.resetBatch();
    this.state = BatchState.READY;
  }

  /**
   * 获取渲染统计
   */
  getStats(): RenderStats {
    return this.renderManager.getStats();
  }

  /**
   * 设置投影矩阵
   */
  setProjectionMatrix(matrix: Matrix3x3): void {
    this.renderManager.setProjectionMatrix(matrix);
  }

  /**
   * 设置变换矩阵
   */
  setTransformMatrix(matrix: Matrix3x3): void {
    this.renderManager.setTransformMatrix(matrix);
  }

  /**
   * 销毁资源
   */
  dispose(): void {
    this.buffer.dispose();
    this.state = BatchState.READY;
  }
}
