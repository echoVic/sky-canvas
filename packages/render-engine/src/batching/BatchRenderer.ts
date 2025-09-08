/**
 * 批处理渲染器
 * 将批处理数据高效地渲染到GPU
 */
import { IGraphicsContext } from '../graphics/IGraphicsContext';
import { IShaderProgram, ShaderManager } from '../webgl/ShaderManager';
import { IBuffer, IVertexArray, BufferType, BufferUsage, IVertexLayout as WebGLVertexLayout, IVertexAttribute } from '../webgl/BufferManager';
import { IBatchData, IVertexLayout as BatchVertexLayout } from './Batcher';
import { Matrix2D } from '../math/Transform';

/**
 * 批处理渲染器接口
 */
export interface IBatchRenderer {
  /**
   * 渲染批处理数据
   * @param gl WebGL上下文
   * @param batchData 批处理数据
   * @param shader 着色器程序
   * @param projectionMatrix 投影矩阵
   */
  renderBatch(
    gl: WebGLRenderingContext,
    batchData: IBatchData,
    shader: IShaderProgram,
    projectionMatrix: Matrix2D
  ): void;
  
  /**
   * 批量渲染多个批次
   * @param gl WebGL上下文
   * @param batches 批处理数据数组
   * @param projectionMatrix 投影矩阵
   */
  renderBatches(
    gl: WebGLRenderingContext,
    batches: IBatchData[],
    projectionMatrix: Matrix2D
  ): void;
  
  /**
   * 获取渲染统计
   */
  getStats(): {
    drawCalls: number;
    verticesRendered: number;
    trianglesRendered: number;
  };
  
  /**
   * 重置统计
   */
  resetStats(): void;
}

/**
 * WebGL批处理渲染器实现
 */
export class WebGLBatchRenderer implements IBatchRenderer {
  private stats = {
    drawCalls: 0,
    verticesRendered: 0,
    trianglesRendered: 0
  };
  
  private dynamicBuffers = new Map<string, IBuffer>();
  private vaoCache = new Map<string, IVertexArray>();
  
  renderBatch(
    gl: WebGLRenderingContext,
    batchData: IBatchData,
    shader: IShaderProgram,
    projectionMatrix: Matrix2D
  ): void {
    if (batchData.vertexCount === 0) return;
    
    // 使用着色器程序
    shader.use(gl);
    
    // 设置投影矩阵
    shader.setUniform('u_projection', projectionMatrix.toWebGL());
    
    // 设置材质uniform
    this.setMaterialUniforms(gl, shader, batchData);
    
    // 获取或创建缓冲区和VAO
    const buffers = this.getOrCreateBuffers(gl, batchData);
    const vao = this.getOrCreateVAO(gl, buffers, shader);
    
    // 绑定VAO并绘制
    const ext = gl.getExtension('OES_vertex_array_object');
    if (ext && vao) {
      vao.bind(gl, ext);
      vao.draw(gl, gl.TRIANGLES, batchData.indexCount);
      vao.unbind(gl, ext);
    } else {
      // 降级：手动绑定缓冲区和属性
      this.bindBuffersManually(gl, buffers, shader);
      gl.drawElements(gl.TRIANGLES, batchData.indexCount, gl.UNSIGNED_SHORT, 0);
    }
    
    // 更新统计
    this.stats.drawCalls++;
    this.stats.verticesRendered += batchData.vertexCount;
    this.stats.trianglesRendered += batchData.indexCount / 3;
  }
  
  renderBatches(
    gl: WebGLRenderingContext,
    batches: IBatchData[],
    projectionMatrix: Matrix2D
  ): void {
    // 按材质分组以减少状态切换
    const groupedBatches = this.groupBatchesByMaterial(batches);
    
    for (const [materialKey, batchGroup] of groupedBatches) {
      // 获取对应的着色器
      const shader = this.getShaderForMaterial(gl, materialKey);
      if (!shader) {
        console.warn('No shader found for material:', materialKey);
        continue;
      }
      
      // 渲染同材质的所有批次
      for (const batch of batchGroup) {
        this.renderBatch(gl, batch, shader, projectionMatrix);
      }
    }
  }
  
  getStats() {
    return { ...this.stats };
  }
  
  resetStats(): void {
    this.stats = {
      drawCalls: 0,
      verticesRendered: 0,
      trianglesRendered: 0
    };
  }
  
  private setMaterialUniforms(
    gl: WebGLRenderingContext,
    shader: IShaderProgram,
    batchData: IBatchData
  ): void {
    const material = batchData.materialKey;
    
    // 设置颜色uniform
    if (material.fillColor) {
      const color = this.parseColor(material.fillColor);
      shader.setUniform('u_color', color);
    }
    
    // 设置纹理uniform
    if (material.textureId) {
      shader.setUniform('u_texture', 0); // 假设纹理绑定到槽0
    }
    
    // 设置其他材质参数
    if (material.lineWidth !== undefined) {
      shader.setUniform('u_lineWidth', material.lineWidth);
    }
  }
  
  private getOrCreateBuffers(
    gl: WebGLRenderingContext,
    batchData: IBatchData
  ): { vertex: IBuffer; index: IBuffer } {
    const key = `batch_${batchData.vertexCount}_${batchData.indexCount}`;
    
    let vertexBuffer = this.dynamicBuffers.get(`${key}_vertex`);
    let indexBuffer = this.dynamicBuffers.get(`${key}_index`);
    
    if (!vertexBuffer) {
      // 创建新的顶点缓冲区
      vertexBuffer = {
        id: `${key}_vertex`,
        buffer: gl.createBuffer()!,
        type: BufferType.VERTEX,
        usage: BufferUsage.DYNAMIC,
        size: batchData.vertices.byteLength,
        isValid: true,
        bind: (gl) => gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer!.buffer),
        unbind: (gl) => gl.bindBuffer(gl.ARRAY_BUFFER, null),
        uploadData: (gl, data) => {
          vertexBuffer!.bind(gl);
          gl.bufferData(gl.ARRAY_BUFFER, data, gl.DYNAMIC_DRAW);
        },
        updateData: (gl, data, offset) => {
          vertexBuffer!.bind(gl);
          gl.bufferSubData(gl.ARRAY_BUFFER, offset, data);
        },
        dispose: (gl) => {
          gl.deleteBuffer(vertexBuffer!.buffer);
          (vertexBuffer as any).isValid = false;
        }
      };
      this.dynamicBuffers.set(`${key}_vertex`, vertexBuffer);
    }
    
    if (!indexBuffer) {
      // 创建新的索引缓冲区
      indexBuffer = {
        id: `${key}_index`,
        buffer: gl.createBuffer()!,
        type: BufferType.INDEX,
        usage: BufferUsage.DYNAMIC,
        size: batchData.indices.byteLength,
        isValid: true,
        bind: (gl) => gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer!.buffer),
        unbind: (gl) => gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, null),
        uploadData: (gl, data) => {
          indexBuffer!.bind(gl);
          gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, data, gl.DYNAMIC_DRAW);
        },
        updateData: (gl, data, offset) => {
          indexBuffer!.bind(gl);
          gl.bufferSubData(gl.ELEMENT_ARRAY_BUFFER, offset, data);
        },
        dispose: (gl) => {
          gl.deleteBuffer(indexBuffer!.buffer);
          (indexBuffer as any).isValid = false;
        }
      };
      this.dynamicBuffers.set(`${key}_index`, indexBuffer);
    }
    
    // 上传数据
    vertexBuffer.uploadData(gl, batchData.vertices);
    indexBuffer.uploadData(gl, batchData.indices);
    
    return { vertex: vertexBuffer, index: indexBuffer };
  }
  
  private getOrCreateVAO(
    gl: WebGLRenderingContext,
    buffers: { vertex: IBuffer; index: IBuffer },
    shader: IShaderProgram
  ): IVertexArray | null {
    const ext = gl.getExtension('OES_vertex_array_object');
    if (!ext) return null;
    
    const key = `${buffers.vertex.id}_${shader.id}`;
    let vao = this.vaoCache.get(key);
    
    if (!vao) {
      const layout = this.createVertexLayout(shader);
      vao = {
        id: key,
        vao: ext.createVertexArrayOES(),
        vertexBuffer: buffers.vertex,
        indexBuffer: buffers.index,
        layout,
        isValid: true,
        bind: (gl, ext) => {
          if (vao!.vao) {
            ext.bindVertexArrayOES(vao!.vao);
          }
        },
        unbind: (gl, ext) => ext.bindVertexArrayOES(null),
        setupAttributes: (gl, program) => {
          vao!.vertexBuffer.bind(gl);
          this.setupVertexAttributes(gl, shader, layout);
          vao!.indexBuffer?.bind(gl);
        },
        draw: (gl, mode, count, offset) => {
          gl.drawElements(mode, count, gl.UNSIGNED_SHORT, offset || 0);
        },
        dispose: (gl, ext) => {
          if (vao!.vao) {
            ext.deleteVertexArrayOES(vao!.vao);
          }
          (vao as any).isValid = false;
        }
      };
      
      // 设置VAO
      if (vao.vao) {
        ext.bindVertexArrayOES(vao.vao);
        vao.setupAttributes(gl, shader.program);
        ext.bindVertexArrayOES(null);
      }
      
      this.vaoCache.set(key, vao);
    }
    
    return vao;
  }
  
  private bindBuffersManually(
    gl: WebGLRenderingContext,
    buffers: { vertex: IBuffer; index: IBuffer },
    shader: IShaderProgram
  ): void {
    buffers.vertex.bind(gl);
    buffers.index.bind(gl);
    
    const layout = this.createVertexLayout(shader);
    this.setupVertexAttributes(gl, shader, layout);
  }
  
  private createVertexLayout(shader: IShaderProgram): WebGLVertexLayout {
    // 创建标准的顶点布局
    const attributes: IVertexAttribute[] = [
      { name: 'a_position', size: 2, type: WebGLRenderingContext.FLOAT, normalized: false, offset: 0 },
      { name: 'a_texCoord', size: 2, type: WebGLRenderingContext.FLOAT, normalized: false, offset: 8 },
      { name: 'a_color', size: 4, type: WebGLRenderingContext.FLOAT, normalized: false, offset: 16 },
    ];
    return {
      stride: 10 * 4, // 10 floats * 4 bytes
      attributes
    };
  }

  private setupVertexAttributes(
    gl: WebGLRenderingContext,
    shader: IShaderProgram,
    layout: WebGLVertexLayout
  ): void {
    // 设置顶点属性
    for (const attribute of layout.attributes) {
      const location = shader.getAttributeLocation(attribute.name);
      if (location >= 0) {
        gl.enableVertexAttribArray(location);
        gl.vertexAttribPointer(
          location,
          attribute.size,
          attribute.type,
          attribute.normalized,
          layout.stride,
          attribute.offset
        );
      }
    }
  }
  
  private groupBatchesByMaterial(batches: IBatchData[]): Map<string, IBatchData[]> {
    const groups = new Map<string, IBatchData[]>();
    
    for (const batch of batches) {
      const key = this.getMaterialKey(batch.materialKey);
      if (!groups.has(key)) {
        groups.set(key, []);
      }
      groups.get(key)!.push(batch);
    }
    
    return groups;
  }
  
  private getMaterialKey(material: any): string {
    return `${material.shaderId || 'default'}_${material.textureId || 'none'}_${material.blendMode || 'normal'}`;
  }
  
  private shaderManager: ShaderManager | null = null;
  
  /**
   * 设置着色器管理器
   */
  setShaderManager(shaderManager: ShaderManager): void {
    this.shaderManager = shaderManager;
  }

  private getShaderForMaterial(gl: WebGLRenderingContext, materialKey: string): IShaderProgram | null {
    if (!this.shaderManager) {
      console.warn('ShaderManager not set for WebGLBatchRenderer');
      return null;
    }

    // 根据材质键解析着色器类型
    const [shaderId] = materialKey.split('_');
    
    switch (shaderId) {
      case 'basic':
        return this.shaderManager.getShaderByName('basic_shape');
      case 'texture':
        return this.shaderManager.getShaderByName('texture');
      case 'solid':
        return this.shaderManager.getShaderByName('solid_color');
      default:
        return this.shaderManager.getShaderByName('basic_shape');
    }
  }
  
  private parseColor(colorString: string): number[] {
    // 简化的颜色解析
    if (colorString.startsWith('#')) {
      const hex = colorString.slice(1);
      const r = parseInt(hex.slice(0, 2), 16) / 255;
      const g = parseInt(hex.slice(2, 4), 16) / 255;
      const b = parseInt(hex.slice(4, 6), 16) / 255;
      return [r, g, b, 1.0];
    }
    return [1.0, 1.0, 1.0, 1.0]; // 默认白色
  }
}