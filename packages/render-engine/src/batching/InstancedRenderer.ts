/**
 * WebGL实例化渲染器
 * 实现高性能的实例化渲染，支持50+相同对象的批量渲染
 */

import { EventEmitter } from '../events/EventBus';
import { IRenderable } from '../core/IRenderEngine';

// 实例化数据结构
export interface InstanceData {
  transform: Float32Array;    // 变换矩阵 (4x4 = 16个float)
  tint: Float32Array;         // 颜色调制 (RGBA)
  textureOffset: Float32Array; // 纹理偏移 (UV坐标)
  customData?: Float32Array;   // 自定义数据
}

// 实例化缓冲区
export interface InstanceBuffer {
  transformBuffer: WebGLBuffer;
  tintBuffer: WebGLBuffer;
  textureOffsetBuffer: WebGLBuffer;
  customDataBuffer?: WebGLBuffer;
  instanceCount: number;
  maxInstances: number;
}

// 实例化批次
export interface InstancedBatch {
  id: string;
  template: IRenderable;
  instances: InstanceData[];
  buffer: InstanceBuffer | null;
  needsUpdate: boolean;
  lastUsed: number;
}

// 渲染器事件
export interface InstancedRendererEvents {
  batchCreated: { batchId: string; maxInstances: number };
  batchUpdated: { batchId: string; instanceCount: number };
  batchRendered: { batchId: string; instanceCount: number; drawTime: number };
  bufferReallocated: { batchId: string; oldSize: number; newSize: number };
}

/**
 * WebGL实例化渲染器
 */
export class InstancedRenderer extends EventEmitter<InstancedRendererEvents> {
  private gl: WebGLRenderingContext | WebGL2RenderingContext;
  private batches = new Map<string, InstancedBatch>();
  private extensionsAvailable: boolean = false;
  
  // WebGL扩展
  private instancedArrays: ANGLE_instanced_arrays | null = null;
  private vertexArrayObject: OES_vertex_array_object | null = null;
  
  // 配置参数
  private readonly MAX_INSTANCES_PER_BATCH = 1000;
  private readonly BUFFER_GROWTH_FACTOR = 1.5;
  private readonly CLEANUP_INTERVAL = 60000; // 1分钟清理一次
  
  constructor(gl: WebGLRenderingContext | WebGL2RenderingContext) {
    super();
    this.gl = gl;
    this.initializeExtensions();
    this.startCleanupTimer();
  }

  /**
   * 初始化WebGL扩展
   */
  private initializeExtensions(): void {
    // 检查是否为WebGL2（通过检查WebGL2特有的方法）
    if (this.gl && 'drawElementsInstanced' in this.gl) {
      // WebGL2原生支持实例化渲染
      this.extensionsAvailable = true;
    } else {
      // WebGL1需要扩展支持
      this.instancedArrays = this.gl.getExtension('ANGLE_instanced_arrays');
      this.vertexArrayObject = this.gl.getExtension('OES_vertex_array_object');
      this.extensionsAvailable = this.instancedArrays !== null;
    }
    
    if (!this.extensionsAvailable) {
      console.warn('实例化渲染扩展不可用，将回退到普通渲染');
    }
  }

  /**
   * 检查是否支持实例化渲染
   */
  isInstancedRenderingSupported(): boolean {
    return this.extensionsAvailable;
  }

  /**
   * 创建或更新实例化批次
   */
  updateBatch(batchId: string, template: IRenderable, instances: InstanceData[]): void {
    let batch = this.batches.get(batchId);
    
    if (!batch) {
      // 创建新批次
      batch = {
        id: batchId,
        template,
        instances: [],
        buffer: null,
        needsUpdate: true,
        lastUsed: Date.now()
      };
      
      this.batches.set(batchId, batch);
      this.emit('batchCreated', { 
        batchId, 
        maxInstances: this.MAX_INSTANCES_PER_BATCH 
      });
    }
    
    // 更新实例数据
    batch.instances = instances;
    batch.needsUpdate = true;
    batch.lastUsed = Date.now();
    
    // 确保缓冲区大小足够
    this.ensureBufferCapacity(batch);
    
    this.emit('batchUpdated', { batchId, instanceCount: instances.length });
  }

  /**
   * 渲染实例化批次
   */
  renderBatch(batchId: string, shader: WebGLProgram): void {
    if (!this.extensionsAvailable) {
      this.fallbackRender(batchId);
      return;
    }
    
    const batch = this.batches.get(batchId);
    if (!batch || batch.instances.length === 0) return;
    
    const startTime = performance.now();
    
    // 更新缓冲区数据
    if (batch.needsUpdate) {
      this.updateBufferData(batch);
      batch.needsUpdate = false;
    }
    
    // 执行实例化渲染
    this.performInstancedDraw(batch, shader);
    
    const drawTime = performance.now() - startTime;
    batch.lastUsed = Date.now();
    
    this.emit('batchRendered', { 
      batchId, 
      instanceCount: batch.instances.length,
      drawTime 
    });
  }

  /**
   * 确保缓冲区容量
   */
  private ensureBufferCapacity(batch: InstancedBatch): void {
    const requiredSize = batch.instances.length;
    
    if (!batch.buffer) {
      // 创建新缓冲区
      const bufferSize = Math.min(
        Math.max(requiredSize, 100) * this.BUFFER_GROWTH_FACTOR,
        this.MAX_INSTANCES_PER_BATCH
      );
      
      batch.buffer = this.createInstanceBuffer(bufferSize);
      return;
    }
    
    if (requiredSize > batch.buffer.maxInstances) {
      // 需要重新分配更大的缓冲区
      const oldSize = batch.buffer.maxInstances;
      const newSize = Math.min(
        oldSize * this.BUFFER_GROWTH_FACTOR,
        this.MAX_INSTANCES_PER_BATCH
      );
      
      this.deleteBuffer(batch.buffer);
      batch.buffer = this.createInstanceBuffer(newSize);
      
      this.emit('bufferReallocated', { 
        batchId: batch.id, 
        oldSize, 
        newSize 
      });
    }
  }

  /**
   * 创建实例化缓冲区
   */
  private createInstanceBuffer(maxInstances: number): InstanceBuffer {
    const gl = this.gl;
    
    return {
      transformBuffer: gl.createBuffer()!,
      tintBuffer: gl.createBuffer()!,
      textureOffsetBuffer: gl.createBuffer()!,
      customDataBuffer: gl.createBuffer(),
      instanceCount: 0,
      maxInstances
    };
  }

  /**
   * 更新缓冲区数据
   */
  private updateBufferData(batch: InstancedBatch): void {
    if (!batch.buffer) return;
    
    const gl = this.gl;
    const instances = batch.instances;
    const instanceCount = instances.length;
    
    // 准备数据数组
    const transforms = new Float32Array(instanceCount * 16); // 4x4矩阵
    const tints = new Float32Array(instanceCount * 4);       // RGBA
    const textureOffsets = new Float32Array(instanceCount * 4); // UV偏移
    const customData = new Float32Array(instanceCount * 4);  // 自定义数据
    
    // 填充数据
    for (let i = 0; i < instanceCount; i++) {
      const instance = instances[i];
      const offset = i * 16;
      const offset4 = i * 4;
      
      // 变换矩阵
      transforms.set(instance.transform, offset);
      
      // 颜色调制
      tints.set(instance.tint, offset4);
      
      // 纹理偏移
      textureOffsets.set(instance.textureOffset, offset4);
      
      // 自定义数据
      if (instance.customData) {
        customData.set(instance.customData, offset4);
      }
    }
    
    // 更新WebGL缓冲区
    gl.bindBuffer(gl.ARRAY_BUFFER, batch.buffer.transformBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, transforms, gl.DYNAMIC_DRAW);
    
    gl.bindBuffer(gl.ARRAY_BUFFER, batch.buffer.tintBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, tints, gl.DYNAMIC_DRAW);
    
    gl.bindBuffer(gl.ARRAY_BUFFER, batch.buffer.textureOffsetBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, textureOffsets, gl.DYNAMIC_DRAW);
    
    if (batch.buffer.customDataBuffer && customData.some(v => v !== 0)) {
      gl.bindBuffer(gl.ARRAY_BUFFER, batch.buffer.customDataBuffer);
      gl.bufferData(gl.ARRAY_BUFFER, customData, gl.DYNAMIC_DRAW);
    }
    
    batch.buffer.instanceCount = instanceCount;
  }

  /**
   * 执行实例化绘制
   */
  private performInstancedDraw(batch: InstancedBatch, shader: WebGLProgram): void {
    if (!batch.buffer) return;
    
    const gl = this.gl;
    
    // 使用着色器程序
    gl.useProgram(shader);
    
    // 设置实例化属性
    this.setupInstanceAttributes(batch, shader);
    
    // 执行模板对象的绘制准备
    this.prepareTemplateRender(batch.template);
    
    // 执行实例化绘制调用
    if ('drawElementsInstanced' in this.gl) {
      // WebGL2
      (gl as any).drawElementsInstanced(
        gl.TRIANGLES,
        this.getVertexCount(batch.template),
        gl.UNSIGNED_SHORT,
        0,
        batch.buffer.instanceCount
      );
    } else if (this.instancedArrays) {
      // WebGL1 + 扩展
      this.instancedArrays.drawElementsInstancedANGLE(
        gl.TRIANGLES,
        this.getVertexCount(batch.template),
        gl.UNSIGNED_SHORT,
        0,
        batch.buffer.instanceCount
      );
    }
  }

  /**
   * 设置实例化属性
   */
  private setupInstanceAttributes(batch: InstancedBatch, shader: WebGLProgram): void {
    if (!batch.buffer) return;
    
    const gl = this.gl;
    
    // 变换矩阵属性 (4个vec4)
    const transformLoc = gl.getAttribLocation(shader, 'a_instanceTransform');
    if (transformLoc !== -1) {
      gl.bindBuffer(gl.ARRAY_BUFFER, batch.buffer.transformBuffer);
      
      for (let i = 0; i < 4; i++) {
        const loc = transformLoc + i;
        gl.enableVertexAttribArray(loc);
        gl.vertexAttribPointer(loc, 4, gl.FLOAT, false, 64, i * 16);
        
        if ('vertexAttribDivisor' in this.gl) {
          (gl as any).vertexAttribDivisor(loc, 1);
        } else if (this.instancedArrays) {
          this.instancedArrays.vertexAttribDivisorANGLE(loc, 1);
        }
      }
    }
    
    // 颜色调制属性
    const tintLoc = gl.getAttribLocation(shader, 'a_instanceTint');
    if (tintLoc !== -1) {
      gl.bindBuffer(gl.ARRAY_BUFFER, batch.buffer.tintBuffer);
      gl.enableVertexAttribArray(tintLoc);
      gl.vertexAttribPointer(tintLoc, 4, gl.FLOAT, false, 0, 0);
      
      if ('vertexAttribDivisor' in this.gl) {
        (gl as any).vertexAttribDivisor(tintLoc, 1);
      } else if (this.instancedArrays) {
        this.instancedArrays.vertexAttribDivisorANGLE(tintLoc, 1);
      }
    }
    
    // 纹理偏移属性
    const texOffsetLoc = gl.getAttribLocation(shader, 'a_instanceTexOffset');
    if (texOffsetLoc !== -1) {
      gl.bindBuffer(gl.ARRAY_BUFFER, batch.buffer.textureOffsetBuffer);
      gl.enableVertexAttribArray(texOffsetLoc);
      gl.vertexAttribPointer(texOffsetLoc, 4, gl.FLOAT, false, 0, 0);
      
      if ('vertexAttribDivisor' in this.gl) {
        (gl as any).vertexAttribDivisor(texOffsetLoc, 1);
      } else if (this.instancedArrays) {
        this.instancedArrays.vertexAttribDivisorANGLE(texOffsetLoc, 1);
      }
    }
  }

  /**
   * 准备模板对象渲染
   */
  private prepareTemplateRender(template: IRenderable): void {
    // 这里需要根据具体的IRenderable接口实现
    // 设置顶点缓冲区、纹理绑定等
    if ('prepareRender' in template && typeof template.prepareRender === 'function') {
      (template as any).prepareRender(this.gl);
    }
  }

  /**
   * 获取顶点数量
   */
  private getVertexCount(template: IRenderable): number {
    // 这里需要根据具体的IRenderable接口实现
    if ('getVertexCount' in template && typeof template.getVertexCount === 'function') {
      return (template as any).getVertexCount();
    }
    return 6; // 默认矩形 (2个三角形)
  }

  /**
   * 回退渲染（不支持实例化时）
   */
  private fallbackRender(batchId: string): void {
    const batch = this.batches.get(batchId);
    if (!batch) return;
    
    const startTime = performance.now();
    
    // 逐个渲染每个实例
    for (const instance of batch.instances) {
      this.renderSingleInstance(batch.template, instance);
    }
    
    const drawTime = performance.now() - startTime;
    
    this.emit('batchRendered', { 
      batchId, 
      instanceCount: batch.instances.length,
      drawTime 
    });
  }

  /**
   * 渲染单个实例（回退方案）
   */
  private renderSingleInstance(template: IRenderable, instance: InstanceData): void {
    // 设置变换矩阵
    // 这里需要将instance.transform应用到渲染上下文
    
    // 设置颜色调制
    // 应用instance.tint
    
    // 设置纹理偏移
    // 应用instance.textureOffset
    
    // 渲染模板对象
    if (template.render) {
      template.render(this.gl);
    }
  }

  /**
   * 删除批次
   */
  deleteBatch(batchId: string): boolean {
    const batch = this.batches.get(batchId);
    if (!batch) return false;
    
    if (batch.buffer) {
      this.deleteBuffer(batch.buffer);
    }
    
    this.batches.delete(batchId);
    return true;
  }

  /**
   * 删除缓冲区
   */
  private deleteBuffer(buffer: InstanceBuffer): void {
    const gl = this.gl;
    
    gl.deleteBuffer(buffer.transformBuffer);
    gl.deleteBuffer(buffer.tintBuffer);
    gl.deleteBuffer(buffer.textureOffsetBuffer);
    if (buffer.customDataBuffer) {
      gl.deleteBuffer(buffer.customDataBuffer);
    }
  }

  /**
   * 清理未使用的批次
   */
  private cleanup(): void {
    const now = Date.now();
    const UNUSED_THRESHOLD = 5 * 60 * 1000; // 5分钟未使用
    
    for (const [batchId, batch] of this.batches) {
      if (now - batch.lastUsed > UNUSED_THRESHOLD) {
        this.deleteBatch(batchId);
      }
    }
  }

  /**
   * 启动清理定时器
   */
  private startCleanupTimer(): void {
    setInterval(() => {
      this.cleanup();
    }, this.CLEANUP_INTERVAL);
  }

  /**
   * 获取统计信息
   */
  getStats() {
    let totalInstances = 0;
    let totalBatches = 0;
    let bufferedBatches = 0;
    
    for (const batch of this.batches.values()) {
      totalBatches++;
      totalInstances += batch.instances.length;
      if (batch.buffer) {
        bufferedBatches++;
      }
    }
    
    return {
      supportedInstancedRendering: this.extensionsAvailable,
      totalBatches,
      bufferedBatches,
      totalInstances,
      averageInstancesPerBatch: totalBatches > 0 ? totalInstances / totalBatches : 0
    };
  }

  /**
   * 销毁渲染器
   */
  dispose(): void {
    for (const batchId of this.batches.keys()) {
      this.deleteBatch(batchId);
    }
    this.batches.clear();
  }
}