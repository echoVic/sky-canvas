/**
 * WebGL渲染器 - 高性能批量渲染实现
 */
import { IPoint } from '../core/IGraphicsContext';
import { IRenderEngine, IRenderable, IViewport } from '../core/IRenderEngine';
import { IWebGLContext } from './WebGLContext';

/**
 * 顶点数据结构
 */
export interface Vertex {
  position: IPoint;
  color: [number, number, number, number];
  texCoord?: IPoint;
}

/**
 * 批量渲染数据
 */
export interface BatchData {
  vertices: Vertex[];
  indices: number[];
  texture?: WebGLTexture;
  blendMode: string;
}

/**
 * 渲染统计信息
 */
export interface RenderStats {
  drawCalls: number;
  triangles: number;
  vertices: number;
  batches: number;
  frameTime: number;
}

/**
 * WebGL渲染器
 */
export class WebGLRenderer {
  private context: IWebGLContext | null = null;
  private gl: WebGLRenderingContext | null = null;
  
  // 批量渲染系统
  private batches = new Map<string, BatchData>();
  private maxBatchSize = 65536; // 64K顶点
  
  // 预构建几何
  private quadGeometry: { vertices: Float32Array; indices: Uint16Array } | null = null;
  
  // 渲染统计
  private stats: RenderStats = {
    drawCalls: 0,
    triangles: 0,
    vertices: 0,
    batches: 0,
    frameTime: 0
  };

  // 着色器管理
  private shaderPrograms = new Map<string, WebGLProgram>();
  private currentProgram: WebGLProgram | null = null;
  
  // 缓冲区
  private vertexBuffer: WebGLBuffer | null = null;
  private indexBuffer: WebGLBuffer | null = null;

  async initialize(context: IWebGLContext): Promise<void> {
    this.context = context;
    this.gl = context.gl;
    
    // 初始化着色器
    await this.initializeShaders();
    
    // 创建缓冲区
    this.createBuffers();
    
    // 预构建几何
    this.createQuadGeometry();
    
    console.log('WebGL Renderer initialized');
  }

  private async initializeShaders(): Promise<void> {
    if (!this.gl) return;

    // 基础着色器
    const basicVertexShader = `
      attribute vec2 a_position;
      attribute vec4 a_color;
      
      uniform mat3 u_transform;
      uniform mat3 u_projection;
      
      varying vec4 v_color;
      
      void main() {
        vec3 position = u_projection * u_transform * vec3(a_position, 1.0);
        gl_Position = vec4(position.xy, 0.0, 1.0);
        v_color = a_color;
      }
    `;

    const basicFragmentShader = `
      precision mediump float;
      
      varying vec4 v_color;
      
      void main() {
        gl_FragColor = v_color;
      }
    `;

    const basicProgram = this.createShaderProgram(basicVertexShader, basicFragmentShader);
    if (basicProgram) {
      this.shaderPrograms.set('basic', basicProgram);
    }

    // 纹理着色器
    const textureVertexShader = `
      attribute vec2 a_position;
      attribute vec2 a_texCoord;
      attribute vec4 a_color;
      
      uniform mat3 u_transform;
      uniform mat3 u_projection;
      
      varying vec2 v_texCoord;
      varying vec4 v_color;
      
      void main() {
        vec3 position = u_projection * u_transform * vec3(a_position, 1.0);
        gl_Position = vec4(position.xy, 0.0, 1.0);
        v_texCoord = a_texCoord;
        v_color = a_color;
      }
    `;

    const textureFragmentShader = `
      precision mediump float;
      
      uniform sampler2D u_texture;
      
      varying vec2 v_texCoord;
      varying vec4 v_color;
      
      void main() {
        vec4 texColor = texture2D(u_texture, v_texCoord);
        gl_FragColor = texColor * v_color;
      }
    `;

    const textureProgram = this.createShaderProgram(textureVertexShader, textureFragmentShader);
    if (textureProgram) {
      this.shaderPrograms.set('texture', textureProgram);
    }
  }

  private createShaderProgram(vertexSource: string, fragmentSource: string): WebGLProgram | null {
    if (!this.gl) return null;

    const vertexShader = this.compileShader(this.gl.VERTEX_SHADER, vertexSource);
    const fragmentShader = this.compileShader(this.gl.FRAGMENT_SHADER, fragmentSource);

    if (!vertexShader || !fragmentShader) {
      return null;
    }

    const program = this.gl.createProgram();
    if (!program) return null;

    this.gl.attachShader(program, vertexShader);
    this.gl.attachShader(program, fragmentShader);
    this.gl.linkProgram(program);

    if (!this.gl.getProgramParameter(program, this.gl.LINK_STATUS)) {
      console.error('Shader program linking error:', this.gl.getProgramInfoLog(program));
      this.gl.deleteProgram(program);
      return null;
    }

    return program;
  }

  private compileShader(type: number, source: string): WebGLShader | null {
    if (!this.gl) return null;

    const shader = this.gl.createShader(type);
    if (!shader) return null;

    this.gl.shaderSource(shader, source);
    this.gl.compileShader(shader);

    if (!this.gl.getShaderParameter(shader, this.gl.COMPILE_STATUS)) {
      console.error('Shader compilation error:', this.gl.getShaderInfoLog(shader));
      this.gl.deleteShader(shader);
      return null;
    }

    return shader;
  }

  private createBuffers(): void {
    if (!this.gl) return;

    // 创建顶点缓冲区
    this.vertexBuffer = this.gl.createBuffer();
    
    // 创建索引缓冲区
    this.indexBuffer = this.gl.createBuffer();
  }

  private createQuadGeometry(): void {
    // 预构建单位四边形几何
    const vertices = new Float32Array([
      // position(2) + color(4) + texCoord(2) = 8 components per vertex
      0.0, 0.0, 1.0, 1.0, 1.0, 1.0, 0.0, 0.0, // 左下
      1.0, 0.0, 1.0, 1.0, 1.0, 1.0, 1.0, 0.0, // 右下  
      1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, // 右上
      0.0, 1.0, 1.0, 1.0, 1.0, 1.0, 0.0, 1.0  // 左上
    ]);

    const indices = new Uint16Array([
      0, 1, 2,
      0, 2, 3
    ]);

    this.quadGeometry = { vertices, indices };
  }

  render(renderables: IRenderable[], viewport: IViewport): void {
    if (!this.gl || !this.context) return;

    const startTime = performance.now();

    // 重置统计
    this.resetStats();

    // 设置视口
    this.gl.viewport(0, 0, viewport.width, viewport.height);

    // 清空画布
    this.context.clear();

    // 收集并排序可见对象
    const visibleRenderables = this.cullAndSortRenderables(renderables, viewport);

    // 智能批量渲染
    this.renderBatched(visibleRenderables);

    // 更新统计
    this.stats.frameTime = performance.now() - startTime;
  }

  private resetStats(): void {
    this.stats.drawCalls = 0;
    this.stats.triangles = 0;
    this.stats.vertices = 0;
    this.stats.batches = 0;
  }

  private cullAndSortRenderables(renderables: IRenderable[], viewport: IViewport): IRenderable[] {
    const visible = renderables.filter(renderable => 
      renderable.visible && this.isRenderableInViewport(renderable, viewport)
    );

    // 按渲染状态排序以减少状态切换
    return visible.sort((a, b) => {
      // 按Z索引排序
      return a.zIndex - b.zIndex;
    });
  }

  private isRenderableInViewport(renderable: IRenderable, viewport: IViewport): boolean {
    // 简化的视口剔除
    return true; // 暂时返回true，实际应该做边界检测
  }

  private renderBatched(renderables: IRenderable[]): void {
    this.batches.clear();
    
    // 将renderables分组到批次中
    for (const renderable of renderables) {
      const batchKey = this.generateBatchKey(renderable);
      this.addRenderableToBatch(renderable, batchKey);
    }

    // 渲染所有批次
    for (const [key, batch] of this.batches) {
      if (batch.vertices.length > 0) {
        this.renderBatch(batch);
      }
    }
  }

  private generateBatchKey(renderable: IRenderable): string {
    // 简化的批次键生成
    return 'basic';
  }

  private addRenderableToBatch(renderable: IRenderable, batchKey: string): void {
    let batch = this.batches.get(batchKey);
    if (!batch) {
      batch = {
        vertices: [],
        indices: [],
        blendMode: 'normal'
      };
      this.batches.set(batchKey, batch);
    }

    // 简化：添加四边形
    const baseIndex = batch.vertices.length;
    batch.vertices.push(
      { position: { x: 0, y: 0 }, color: [1, 1, 1, 1] },
      { position: { x: 100, y: 0 }, color: [1, 1, 1, 1] },
      { position: { x: 100, y: 100 }, color: [1, 1, 1, 1] },
      { position: { x: 0, y: 100 }, color: [1, 1, 1, 1] }
    );

    batch.indices.push(
      baseIndex, baseIndex + 1, baseIndex + 2,
      baseIndex, baseIndex + 2, baseIndex + 3
    );
  }

  private renderBatch(batch: BatchData): void {
    if (!this.gl || !batch.vertices.length) return;

    // 使用基础着色器
    const program = this.shaderPrograms.get('basic');
    if (!program) return;

    this.useProgram(program);

    // 准备数据
    const vertexData = this.prepareVertexData(batch.vertices);
    const indexData = new Uint16Array(batch.indices);

    // 更新缓冲区
    if (this.vertexBuffer) {
      this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.vertexBuffer);
      this.gl.bufferData(this.gl.ARRAY_BUFFER, vertexData, this.gl.DYNAMIC_DRAW);
    }

    if (this.indexBuffer) {
      this.gl.bindBuffer(this.gl.ELEMENT_ARRAY_BUFFER, this.indexBuffer);
      this.gl.bufferData(this.gl.ELEMENT_ARRAY_BUFFER, indexData, this.gl.DYNAMIC_DRAW);
    }

    // 设置顶点属性
    this.setupVertexAttributes();

    // 绘制
    this.gl.drawElements(this.gl.TRIANGLES, batch.indices.length, this.gl.UNSIGNED_SHORT, 0);

    // 更新统计
    this.stats.drawCalls++;
    this.stats.batches++;
    this.stats.vertices += batch.vertices.length;
    this.stats.triangles += batch.indices.length / 3;
  }

  private prepareVertexData(vertices: Vertex[]): Float32Array {
    const buffer = new Float32Array(vertices.length * 8); // 8 floats per vertex
    
    for (let i = 0; i < vertices.length; i++) {
      const vertex = vertices[i];
      if (!vertex) {
        console.warn(`Vertex at index ${i} is undefined`);
        continue;
      }
      
      const offset = i * 8;
      
      buffer[offset] = vertex.position?.x || 0;
      buffer[offset + 1] = vertex.position?.y || 0;
      buffer[offset + 2] = vertex.color?.[0] || 0;
      buffer[offset + 3] = vertex.color?.[1] || 0;
      buffer[offset + 4] = vertex.color?.[2] || 0;
      buffer[offset + 5] = vertex.color?.[3] || 1;
      buffer[offset + 6] = vertex.texCoord?.x || 0;
      buffer[offset + 7] = vertex.texCoord?.y || 0;
    }

    return buffer;
  }

  private useProgram(program: WebGLProgram): void {
    if (this.currentProgram !== program) {
      this.gl?.useProgram(program);
      this.currentProgram = program;
    }
  }

  private setupVertexAttributes(): void {
    if (!this.gl || !this.currentProgram) return;

    const stride = 8 * 4; // 8 floats per vertex

    // 位置属性
    const positionLocation = this.gl.getAttribLocation(this.currentProgram, 'a_position');
    if (positionLocation !== -1) {
      this.gl.enableVertexAttribArray(positionLocation);
      this.gl.vertexAttribPointer(positionLocation, 2, this.gl.FLOAT, false, stride, 0);
    }

    // 颜色属性
    const colorLocation = this.gl.getAttribLocation(this.currentProgram, 'a_color');
    if (colorLocation !== -1) {
      this.gl.enableVertexAttribArray(colorLocation);
      this.gl.vertexAttribPointer(colorLocation, 4, this.gl.FLOAT, false, stride, 2 * 4);
    }

    // 纹理坐标属性
    const texCoordLocation = this.gl.getAttribLocation(this.currentProgram, 'a_texCoord');
    if (texCoordLocation !== -1) {
      this.gl.enableVertexAttribArray(texCoordLocation);
      this.gl.vertexAttribPointer(texCoordLocation, 2, this.gl.FLOAT, false, stride, 6 * 4);
    }
  }

  getRenderStats(): RenderStats {
    return { ...this.stats };
  }

  dispose(): void {
    if (this.gl) {
      // 清理着色器程序
      for (const program of this.shaderPrograms.values()) {
        this.gl.deleteProgram(program);
      }
      
      // 清理缓冲区
      if (this.vertexBuffer) {
        this.gl.deleteBuffer(this.vertexBuffer);
      }
      if (this.indexBuffer) {
        this.gl.deleteBuffer(this.indexBuffer);
      }
    }

    this.shaderPrograms.clear();
    this.batches.clear();
    this.context = null;
    this.gl = null;
  }
}