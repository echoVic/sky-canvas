import { BlendMode, BufferType, RenderStats } from '../core/RenderTypes';
import { Matrix3x3, Vector2 } from '../math';
import { WebGLBuffer, WebGLResourceManager } from '../resources/ResourceManager';
import { WebGLShaderManager } from '../shaders/ShaderManager';

// 批量渲染顶点结构
export interface BatchVertex {
  position: Vector2;
  color: [number, number, number, number];
  texCoord?: Vector2;
  textureId?: number;
}

// 批量渲染配置
export interface BatchConfig {
  maxVertices: number;
  maxIndices: number;
  maxTextures: number;
  vertexSize: number;
}

// 渲染批次状态
export enum BatchState {
  READY = 'ready',
  BUILDING = 'building',
  FULL = 'full',
  SUBMITTED = 'submitted'
}

// 批量渲染器
export class BatchRenderer {
  private gl: WebGLRenderingContext;
  private shaderManager: WebGLShaderManager;
  private resourceManager: WebGLResourceManager;
  
  // 配置
  private config: BatchConfig;
  
  // 当前批次数据
  private vertices: Float32Array;
  private indices: Uint16Array;
  private vertexCount = 0;
  private indexCount = 0;
  private currentTextures: WebGLTexture[] = [];
  
  // 缓冲区
  private vertexBuffer: WebGLBuffer;
  private indexBuffer: WebGLBuffer;
  
  // 批次状态
  private state = BatchState.READY;
  private currentBlendMode = BlendMode.NORMAL;
  
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
    config?: Partial<BatchConfig>
  ) {
    this.gl = gl;
    this.shaderManager = shaderManager;
    this.resourceManager = resourceManager;
    
    this.config = {
      maxVertices: 10000,
      maxIndices: 15000,
      maxTextures: 8,
      vertexSize: 8, // position(2) + color(4) + texCoord(2)
      ...config
    };
    
    // 初始化数据数组
    this.vertices = new Float32Array(this.config.maxVertices * this.config.vertexSize);
    this.indices = new Uint16Array(this.config.maxIndices);
    
    // 创建缓冲区
    this.vertexBuffer = this.resourceManager.createBuffer(
      BufferType.VERTEX,
      this.vertices.buffer
    );
    this.indexBuffer = this.resourceManager.createBuffer(
      BufferType.INDEX,
      this.indices.buffer
    );
  }

  // 开始新批次
  begin(): void {
    if (this.state === BatchState.BUILDING) {
      this.flush();
    }
    
    this.state = BatchState.BUILDING;
    this.vertexCount = 0;
    this.indexCount = 0;
    this.currentTextures = [];
    this.resetStats();
  }

  // 结束当前批次
  end(): void {
    if (this.state === BatchState.BUILDING && this.vertexCount > 0) {
      this.flush();
    }
    this.state = BatchState.READY;
  }

  // 添加四边形到批次
  addQuad(
    positions: [Vector2, Vector2, Vector2, Vector2],
    colors: [[number, number, number, number], [number, number, number, number], [number, number, number, number], [number, number, number, number]],
    texCoords?: [Vector2, Vector2, Vector2, Vector2],
    texture?: WebGLTexture,
    blendMode: BlendMode = BlendMode.NORMAL
  ): boolean {
    // 检查是否需要刷新批次
    if (this.needsFlush(4, 6, texture, blendMode)) {
      this.flush();
    }

    // 获取纹理ID
    let textureId = 0;
    if (texture) {
      textureId = this.getTextureSlot(texture);
      if (textureId === -1) {
        this.flush();
        textureId = this.getTextureSlot(texture);
      }
    }

    // 添加顶点
    const baseVertex = this.vertexCount;
    for (let i = 0; i < 4; i++) {
      this.addVertex({
        position: positions[i],
        color: colors[i],
        texCoord: texCoords?.[i] || new Vector2(0, 0),
        textureId
      });
    }

    // 添加索引（两个三角形组成四边形）
    const quadIndices = [0, 1, 2, 0, 2, 3];
    for (const index of quadIndices) {
      this.indices[this.indexCount++] = baseVertex + index;
    }

    this.currentBlendMode = blendMode;
    return true;
  }

  // 添加三角形到批次
  addTriangle(
    positions: [Vector2, Vector2, Vector2],
    colors: [[number, number, number, number], [number, number, number, number], [number, number, number, number]],
    texCoords?: [Vector2, Vector2, Vector2],
    texture?: WebGLTexture,
    blendMode: BlendMode = BlendMode.NORMAL
  ): boolean {
    if (this.needsFlush(3, 3, texture, blendMode)) {
      this.flush();
    }

    let textureId = 0;
    if (texture) {
      textureId = this.getTextureSlot(texture);
      if (textureId === -1) {
        this.flush();
        textureId = this.getTextureSlot(texture);
      }
    }

    const baseVertex = this.vertexCount;
    for (let i = 0; i < 3; i++) {
      this.addVertex({
        position: positions[i],
        color: colors[i],
        texCoord: texCoords?.[i] || new Vector2(0, 0),
        textureId
      });
    }

    // 添加三角形索引
    for (let i = 0; i < 3; i++) {
      this.indices[this.indexCount++] = baseVertex + i;
    }

    this.currentBlendMode = blendMode;
    return true;
  }

  // 添加线段到批次
  addLine(
    start: Vector2,
    end: Vector2,
    color: [number, number, number, number],
    width: number = 1.0
  ): boolean {
    // 将线段转换为四边形
    const direction = end.subtract(start).normalize();
    const perpendicular = new Vector2(-direction.y, direction.x).scale(width * 0.5);

    const positions: [Vector2, Vector2, Vector2, Vector2] = [
      start.subtract(perpendicular),
      start.add(perpendicular),
      end.add(perpendicular),
      end.subtract(perpendicular)
    ];

    const colors: [[number, number, number, number], [number, number, number, number], [number, number, number, number], [number, number, number, number]] = [
      color, color, color, color
    ];

    return this.addQuad(positions, colors);
  }

  // 刷新当前批次
  private flush(): void {
    if (this.vertexCount === 0 || this.state !== BatchState.BUILDING) return;

    // 更新缓冲区
    this.vertexBuffer.update(this.vertices.buffer.slice(0, this.vertexCount * this.config.vertexSize * 4));
    this.indexBuffer.update(this.indices.buffer.slice(0, this.indexCount * 2));

    // 设置混合模式
    this.setBlendMode(this.currentBlendMode);

    // 绑定纹理
    this.bindTextures();

    // 使用着色器程序
    const shaderName = this.currentTextures.length > 0 ? 'textured' : 'basic';
    this.shaderManager.useProgram(shaderName);
    this.stats.shaderSwitches++;

    // 绑定缓冲区
    this.vertexBuffer.bind();
    this.indexBuffer.bind();

    // 设置顶点属性
    this.setupVertexAttributes(shaderName);

    // 绘制
    this.gl.drawElements(this.gl.TRIANGLES, this.indexCount, this.gl.UNSIGNED_SHORT, 0);

    // 更新统计
    this.stats.drawCalls++;
    this.stats.batches++;
    this.stats.vertices += this.vertexCount;
    this.stats.triangles += this.indexCount / 3;

    // 重置批次
    this.vertexCount = 0;
    this.indexCount = 0;
    this.currentTextures = [];
    this.state = BatchState.READY;
  }

  // 添加单个顶点
  private addVertex(vertex: BatchVertex): void {
    const offset = this.vertexCount * this.config.vertexSize;
    
    // 位置
    this.vertices[offset] = vertex.position.x;
    this.vertices[offset + 1] = vertex.position.y;
    
    // 颜色
    this.vertices[offset + 2] = vertex.color[0];
    this.vertices[offset + 3] = vertex.color[1];
    this.vertices[offset + 4] = vertex.color[2];
    this.vertices[offset + 5] = vertex.color[3];
    
    // 纹理坐标
    this.vertices[offset + 6] = vertex.texCoord?.x || 0;
    this.vertices[offset + 7] = vertex.texCoord?.y || 0;
    
    this.vertexCount++;
  }

  // 检查是否需要刷新批次
  private needsFlush(
    vertexCount: number,
    indexCount: number,
    texture?: WebGLTexture,
    blendMode?: BlendMode
  ): boolean {
    // 检查顶点/索引容量
    if (this.vertexCount + vertexCount > this.config.maxVertices ||
        this.indexCount + indexCount > this.config.maxIndices) {
      return true;
    }

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

  // 获取纹理槽位
  private getTextureSlot(texture: WebGLTexture): number {
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

  // 绑定纹理
  private bindTextures(): void {
    for (let i = 0; i < this.currentTextures.length; i++) {
      this.gl.activeTexture(this.gl.TEXTURE0 + i);
      this.gl.bindTexture(this.gl.TEXTURE_2D, this.currentTextures[i]);
      this.stats.textureBinds++;
    }
  }

  // 设置混合模式
  private setBlendMode(mode: BlendMode): void {
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

  // 设置顶点属性
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

  // 重置统计
  private resetStats(): void {
    this.stats.drawCalls = 0;
    this.stats.triangles = 0;
    this.stats.vertices = 0;
    this.stats.batches = 0;
    this.stats.textureBinds = 0;
    this.stats.shaderSwitches = 0;
  }

  // 获取渲染统计
  getStats(): RenderStats {
    return { ...this.stats };
  }

  // 设置投影矩阵
  setProjectionMatrix(matrix: Matrix3x3): void {
    this.shaderManager.setUniform('u_projection', matrix.elements);
  }

  // 设置变换矩阵
  setTransformMatrix(matrix: Matrix3x3): void {
    this.shaderManager.setUniform('u_transform', matrix.elements);
  }

  // 销毁资源
  dispose(): void {
    this.flush();
    this.resourceManager.releaseResource(this.vertexBuffer);
    this.resourceManager.releaseResource(this.indexBuffer);
  }
}
