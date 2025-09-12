/**
 * WebGL渲染管理器
 * 集成着色器管理、缓冲区管理和几何体渲染
 */

import { Matrix3 } from '../math/Matrix3';
import { GeometryGenerator, GeometryData } from './GeometryGenerator';
import { ShaderManager, IShaderProgram } from '../webgl/ShaderManager';
import { BufferManager, IBuffer, BufferType, BufferUsage } from '../webgl/BufferManager';
import { SHADER_LIBRARY } from '../webgl/ShaderLibrary';

/**
 * 渲染命令接口
 */
interface IRenderCommand {
  type: 'rectangle' | 'circle' | 'line' | 'polygon' | 'text' | 'texture';
  geometry: GeometryData;
  shader: string;
  uniforms?: Record<string, any>;
}

/**
 * WebGL渲染管理器
 */
export class WebGLRenderManager {
  private gl: WebGLRenderingContext;
  private shaderManager: ShaderManager;
  private bufferManager: BufferManager;
  
  private currentShader: IShaderProgram | null = null;
  private renderQueue: IRenderCommand[] = [];
  
  // 常用缓冲区
  private vertexBuffer: IBuffer | null = null;
  private indexBuffer: IBuffer | null = null;

  constructor(gl: WebGLRenderingContext) {
    this.gl = gl;
    this.shaderManager = new ShaderManager(gl);
    this.bufferManager = new BufferManager(gl);
    
    this.initialize();
  }

  private initialize(): void {
    // 初始化标准着色器
    this.initializeShaders();
    
    // 创建通用缓冲区
    this.vertexBuffer = this.bufferManager.createBuffer(
      BufferType.VERTEX, 
      BufferUsage.DYNAMIC, 
      'main_vertex_buffer'
    );
    
    this.indexBuffer = this.bufferManager.createBuffer(
      BufferType.INDEX, 
      BufferUsage.DYNAMIC, 
      'main_index_buffer'
    );
  }

  private initializeShaders(): void {
    // 创建基础着色器
    this.shaderManager.createShader(SHADER_LIBRARY.BASIC_SHAPE);
    this.shaderManager.createShader(SHADER_LIBRARY.SOLID_COLOR);
    this.shaderManager.createShader(SHADER_LIBRARY.TEXTURE);
  }

  /**
   * 绘制矩形
   */
  drawRectangle(
    x: number, 
    y: number, 
    width: number, 
    height: number,
    fillColor?: string,
    strokeColor?: string,
    strokeWidth?: number
  ): void {
    const color = fillColor ? 
      GeometryGenerator.parseColor(fillColor) : 
      [1, 1, 1, 1] as [number, number, number, number];
    
    const geometry = GeometryGenerator.createRectangle(x, y, width, height, color);
    
    if (fillColor) {
      this.renderQueue.push({
        type: 'rectangle',
        geometry,
        shader: 'basic_shape'
      });
    }

    // 如果有描边，添加描边绘制
    if (strokeColor && strokeWidth && strokeWidth > 0) {
      this.drawRectangleStroke(x, y, width, height, strokeColor, strokeWidth);
    }
  }

  /**
   * 绘制矩形描边
   */
  private drawRectangleStroke(
    x: number, 
    y: number, 
    width: number, 
    height: number,
    strokeColor: string,
    strokeWidth: number
  ): void {
    const color = GeometryGenerator.parseColor(strokeColor);
    
    // 绘制四条边
    const lines = [
      // 上边
      GeometryGenerator.createLine(x, y, x + width, y, strokeWidth, color),
      // 右边
      GeometryGenerator.createLine(x + width, y, x + width, y + height, strokeWidth, color),
      // 下边
      GeometryGenerator.createLine(x + width, y + height, x, y + height, strokeWidth, color),
      // 左边
      GeometryGenerator.createLine(x, y + height, x, y, strokeWidth, color)
    ];

    lines.forEach(geometry => {
      if (geometry.vertexCount > 0) {
        this.renderQueue.push({
          type: 'line',
          geometry,
          shader: 'basic_shape'
        });
      }
    });
  }

  /**
   * 绘制圆形
   */
  drawCircle(
    centerX: number, 
    centerY: number, 
    radius: number,
    fillColor?: string,
    strokeColor?: string,
    strokeWidth?: number
  ): void {
    const color = fillColor ? 
      GeometryGenerator.parseColor(fillColor) : 
      [1, 1, 1, 1] as [number, number, number, number];
    
    const geometry = GeometryGenerator.createCircle(centerX, centerY, radius, 32, color);
    
    if (fillColor) {
      this.renderQueue.push({
        type: 'circle',
        geometry,
        shader: 'basic_shape'
      });
    }

    // 圆形描边通过创建空心圆实现
    if (strokeColor && strokeWidth && strokeWidth > 0) {
      const strokeColorParsed = GeometryGenerator.parseColor(strokeColor);
      const innerRadius = Math.max(0, radius - strokeWidth);
      
      // 创建外圆和内圆，通过模板缓冲或多次绘制实现空心效果
      // 这里简化为绘制一个稍大的圆作为描边
      const outerGeometry = GeometryGenerator.createCircle(
        centerX, centerY, radius + strokeWidth / 2, 32, strokeColorParsed
      );
      
      this.renderQueue.push({
        type: 'circle',
        geometry: outerGeometry,
        shader: 'basic_shape'
      });
    }
  }

  /**
   * 绘制线条
   */
  drawLine(
    x1: number, 
    y1: number, 
    x2: number, 
    y2: number,
    color?: string,
    width?: number
  ): void {
    const lineColor = color ? 
      GeometryGenerator.parseColor(color) : 
      [1, 1, 1, 1] as [number, number, number, number];
    const lineWidth = width || 1;
    
    const geometry = GeometryGenerator.createLine(x1, y1, x2, y2, lineWidth, lineColor);
    
    if (geometry.vertexCount > 0) {
      this.renderQueue.push({
        type: 'line',
        geometry,
        shader: 'basic_shape'
      });
    }
  }

  /**
   * 执行渲染队列
   */
  flush(projectionMatrix: Matrix3, transformMatrix: Matrix3): void {
    if (this.renderQueue.length === 0) return;

    // 清除深度缓冲区（虽然2D不需要，但保持良好习惯）
    this.gl.clear(this.gl.DEPTH_BUFFER_BIT);

    // 处理渲染队列
    for (const command of this.renderQueue) {
      this.executeRenderCommand(command, projectionMatrix, transformMatrix);
    }

    // 清空队列
    this.renderQueue = [];
  }

  /**
   * 执行单个渲染命令
   */
  private executeRenderCommand(
    command: IRenderCommand, 
    projectionMatrix: Matrix3, 
    transformMatrix: Matrix3
  ): void {
    // 获取着色器
    const shader = this.getShaderByName(command.shader);
    if (!shader) {
      console.warn(`Shader not found: ${command.shader}`);
      return;
    }

    // 使用着色器
    shader.use(this.gl);
    this.currentShader = shader;

    // 设置uniform
    shader.setUniform('u_projection', projectionMatrix.toWebGL());
    shader.setUniform('u_transform', transformMatrix.toWebGL());

    // 设置自定义uniform
    if (command.uniforms) {
      for (const [name, value] of Object.entries(command.uniforms)) {
        shader.setUniform(name, value);
      }
    }

    // 上传几何数据
    this.uploadGeometry(command.geometry);

    // 绘制
    this.gl.drawElements(
      this.gl.TRIANGLES, 
      command.geometry.indexCount, 
      this.gl.UNSIGNED_SHORT, 
      0
    );
  }

  /**
   * 上传几何体数据到缓冲区
   */
  private uploadGeometry(geometry: GeometryData): void {
    if (!this.vertexBuffer || !this.indexBuffer) return;

    // 上传顶点数据
    this.vertexBuffer.uploadData(this.gl, geometry.vertices);
    this.indexBuffer.uploadData(this.gl, geometry.indices);

    // 设置顶点属性
    this.setupVertexAttributes();
  }

  /**
   * 设置顶点属性
   */
  private setupVertexAttributes(): void {
    if (!this.currentShader || !this.vertexBuffer || !this.indexBuffer) return;

    this.vertexBuffer.bind(this.gl);
    this.indexBuffer.bind(this.gl);

    const stride = 8 * 4; // 8 floats * 4 bytes per float

    // 位置属性 (a_position)
    const posLocation = this.currentShader.getAttributeLocation('a_position');
    if (posLocation >= 0) {
      this.gl.enableVertexAttribArray(posLocation);
      this.gl.vertexAttribPointer(posLocation, 2, this.gl.FLOAT, false, stride, 0);
    }

    // 颜色属性 (a_color)
    const colorLocation = this.currentShader.getAttributeLocation('a_color');
    if (colorLocation >= 0) {
      this.gl.enableVertexAttribArray(colorLocation);
      this.gl.vertexAttribPointer(colorLocation, 4, this.gl.FLOAT, false, stride, 2 * 4);
    }

    // 纹理坐标属性 (a_texCoord)
    const texCoordLocation = this.currentShader.getAttributeLocation('a_texCoord');
    if (texCoordLocation >= 0) {
      this.gl.enableVertexAttribArray(texCoordLocation);
      this.gl.vertexAttribPointer(texCoordLocation, 2, this.gl.FLOAT, false, stride, 6 * 4);
    }
  }

  /**
   * 根据名称获取着色器
   */
  private getShaderByName(name: string): IShaderProgram | null {
    return this.shaderManager.getShaderByName(name);
  }

  /**
   * 清空渲染队列
   */
  clear(): void {
    this.renderQueue = [];
  }

  /**
   * 获取渲染统计
   */
  getStats() {
    return {
      queuedCommands: this.renderQueue.length,
      shaderStats: this.shaderManager.getStats(),
      bufferStats: this.bufferManager.getStats()
    };
  }

  /**
   * 绘制多边形
   */
  drawPolygon(points: { x: number; y: number }[], fillColor?: string): void {
    if (points.length < 3) return;
    
    const color = fillColor ? 
      GeometryGenerator.parseColor(fillColor) : 
      [1, 1, 1, 1] as [number, number, number, number];
    
    // 将多边形三角化
    const geometry = GeometryGenerator.createPolygon(points, color);
    
    if (geometry.vertexCount > 0) {
      this.renderQueue.push({
        type: 'polygon',
        geometry,
        shader: 'basic_shape'
      });
    }
  }

  /**
   * 绘制文本（占位符实现）
   */
  drawText(
    text: string, 
    x: number, 
    y: number, 
    color?: string, 
    font?: string, 
    stroke?: boolean
  ): void {
    // WebGL文本渲染需要预渲染文本到纹理
    // 这里是简化实现，实际项目中需要文本纹理系统
    console.warn(`WebGL text rendering not implemented: "${text}" at (${x}, ${y})`);
  }

  /**
   * 绘制纹理（占位符实现）
   */
  drawTexture(
    texture: WebGLTexture | null, 
    x: number, 
    y: number, 
    width: number, 
    height: number
  ): void {
    if (!texture) return;
    
    // 创建纹理矩形几何体
    const geometry = GeometryGenerator.createTextureRect(x, y, width, height);
    
    this.renderQueue.push({
      type: 'texture',
      geometry,
      shader: 'texture',
      uniforms: {
        u_texture: texture
      }
    });
  }

  /**
   * 释放资源
   */
  dispose(): void {
    this.clear();
    this.shaderManager.dispose();
    this.bufferManager.dispose();
    this.currentShader = null;
    this.vertexBuffer = null;
    this.indexBuffer = null;
  }
}