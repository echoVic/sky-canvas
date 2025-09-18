/**
 * 批量渲染器核心渲染管理
 */

import { BlendMode } from '../../../core/webgl/types';
import { RenderStats } from '../../../core/renderers/types';
import { Matrix3x3 } from '../../../math';
import { WebGLResourceManager } from '../../../resources/ResourceManager';
import { WebGLShaderManager } from '../../../core/webgl/ShaderManager';
import { BatchConfig } from '../types/BatchTypes';

export class BatchRenderManager {
  private gl: WebGLRenderingContext;
  private shaderManager: WebGLShaderManager;
  private resourceManager: WebGLResourceManager;
  
  // 渲染状态
  private currentBlendMode = BlendMode.NORMAL;
  private currentTextures: WebGLTexture[] = [];
  private config: BatchConfig;
  
  // 性能统计
  private stats: RenderStats = {
    drawCalls: 0,
    triangles: 0,
    vertices: 0,
    batches: 0,
    textureBinds: 0,
    shaderSwitches: 0,
    frameTime: 0
  };

  constructor(
    gl: WebGLRenderingContext,
    shaderManager: WebGLShaderManager,
    resourceManager: WebGLResourceManager,
    config: BatchConfig
  ) {
    this.gl = gl;
    this.shaderManager = shaderManager;
    this.resourceManager = resourceManager;
    this.config = config;
  }

  /**
   * 执行渲染
   */
  render(vertexCount: number, indexCount: number): void {
    if (vertexCount === 0 || indexCount === 0) return;

    // 设置混合模式
    this.setBlendMode(this.currentBlendMode);

    // 绑定纹理
    this.bindTextures();

    // 使用着色器程序
    const shaderName = this.currentTextures.length > 0 ? 'textured' : 'basic';
    this.shaderManager.useProgram(shaderName);
    this.stats.shaderSwitches++;

    // 设置顶点属性
    this.setupVertexAttributes(shaderName);

    // 绘制
    this.gl.drawElements(this.gl.TRIANGLES, indexCount, this.gl.UNSIGNED_SHORT, 0);

    // 更新统计
    this.updateStats(vertexCount, indexCount);
  }

  /**
   * 设置混合模式
   */
  setBlendMode(mode: BlendMode): void {
    this.currentBlendMode = mode;
    
    switch (mode) {
      case BlendMode.NORMAL:
        this.gl.blendFunc(this.gl.SRC_ALPHA, this.gl.ONE_MINUS_SRC_ALPHA);
        break;
      case BlendMode.ADD:
        this.gl.blendFunc(this.gl.SRC_ALPHA, this.gl.ONE);
        break;
      case BlendMode.MULTIPLY:
        this.gl.blendFunc(this.gl.DST_COLOR, this.gl.ZERO);
        break;
      case BlendMode.SCREEN:
        this.gl.blendFunc(this.gl.ONE_MINUS_DST_COLOR, this.gl.ONE);
        break;
    }
  }

  /**
   * 获取纹理槽位
   */
  getTextureSlot(texture: WebGLTexture): number {
    const existingIndex = this.currentTextures.indexOf(texture);
    if (existingIndex !== -1) {
      return existingIndex;
    }

    if (this.currentTextures.length < this.config.maxTextures) {
      this.currentTextures.push(texture);
      return this.currentTextures.length - 1;
    }

    return -1; // 需要刷新批次
  }

  /**
   * 检查是否需要刷新批次
   */
  needsFlush(
    vertexCount: number,
    indexCount: number,
    texture?: WebGLTexture,
    blendMode?: BlendMode
  ): boolean {
    // 检查混合模式变化
    if (blendMode && blendMode !== this.currentBlendMode) {
      return true;
    }

    // 检查纹理容量
    if (texture && this.getTextureSlot(texture) === -1 && 
        this.currentTextures.length >= this.config.maxTextures) {
      return true;
    }

    return false;
  }

  /**
   * 绑定纹理
   */
  private bindTextures(): void {
    for (let i = 0; i < this.currentTextures.length; i++) {
      this.gl.activeTexture(this.gl.TEXTURE0 + i);
      this.gl.bindTexture(this.gl.TEXTURE_2D, this.currentTextures[i]);
      this.stats.textureBinds++;
    }
  }

  /**
   * 设置顶点属性
   */
  private setupVertexAttributes(shaderName: string): void {
    const program = this.shaderManager.getShader(shaderName);
    if (!program) return;

    const stride = this.config.vertexSize * 4;

    // 位置属性
    const positionLocation = program.attributes.get('a_position');
    if (positionLocation !== undefined) {
      this.gl.enableVertexAttribArray(positionLocation);
      this.gl.vertexAttribPointer(positionLocation, 2, this.gl.FLOAT, false, stride, 0);
    }

    // 颜色属性
    const colorLocation = program.attributes.get('a_color');
    if (colorLocation !== undefined) {
      this.gl.enableVertexAttribArray(colorLocation);
      this.gl.vertexAttribPointer(colorLocation, 4, this.gl.FLOAT, false, stride, 2 * 4);
    }

    // 纹理坐标属性
    if (shaderName === 'textured') {
      const texCoordLocation = program.attributes.get('a_texCoord');
      if (texCoordLocation !== undefined) {
        this.gl.enableVertexAttribArray(texCoordLocation);
        this.gl.vertexAttribPointer(texCoordLocation, 2, this.gl.FLOAT, false, stride, 6 * 4);
      }
    }
  }

  /**
   * 更新统计信息
   */
  private updateStats(vertexCount: number, indexCount: number): void {
    this.stats.drawCalls++;
    this.stats.batches++;
    this.stats.vertices += vertexCount;
    this.stats.triangles += indexCount / 3;
  }

  /**
   * 重置批次状态
   */
  resetBatch(): void {
    this.currentTextures = [];
  }

  /**
   * 重置统计
   */
  resetStats(): void {
    this.stats.drawCalls = 0;
    this.stats.triangles = 0;
    this.stats.vertices = 0;
    this.stats.batches = 0;
    this.stats.textureBinds = 0;
    this.stats.shaderSwitches = 0;
  }

  /**
   * 获取渲染统计
   */
  getStats(): RenderStats {
    return { ...this.stats };
  }

  /**
   * 设置投影矩阵
   */
  setProjectionMatrix(matrix: Matrix3x3): void {
    this.shaderManager.setUniform('u_projection', matrix.elements);
  }

  /**
   * 设置变换矩阵
   */
  setTransformMatrix(matrix: Matrix3x3): void {
    this.shaderManager.setUniform('u_transform', matrix.elements);
  }

  /**
   * 获取当前混合模式
   */
  getCurrentBlendMode(): BlendMode {
    return this.currentBlendMode;
  }

  /**
   * 获取当前纹理数量
   */
  getCurrentTextureCount(): number {
    return this.currentTextures.length;
  }
}
