import { IRenderable } from '../core/IRenderEngine';

/**
 * 实例化形状接口
 */
export interface InstancedRenderable {
  renderable: IRenderable;
  instanceCount: number;
  instanceData: any[];
}

/**
 * 合并几何体接口
 */
export interface MergedGeometry {
  vertices: Float32Array;
  indices: Uint16Array;
  textureCoords: Float32Array;
  renderableType: string;
}

/**
 * 高级批处理器
 */
export class AdvancedBatcher {
  private instancedRenderables: Map<string, InstancedRenderable[]> = new Map();
  private mergedGeometries: Map<string, MergedGeometry> = new Map();
  private context: any = null; // 渲染上下文
  private _initialized: boolean = false;
  
  /**
   * 初始化批处理器
   */
  initialize(): void {
    this._initialized = true;
  }

  /**
   * 添加矩形到批处理
   */
  addRectangle(x: number, y: number, width: number, height: number, options?: any): void {
    const mockRenderable: IRenderable = {
      id: `rect_${Date.now()}_${Math.random()}`,
      visible: true,
      zIndex: 0,
      bounds: {
        x, y, width, height,
        left: x,
        right: x + width,
        top: y,
        bottom: y + height,
        center: { x: x + width/2, y: y + height/2 }
      } as any,
      getBounds: () => ({
        x, y, width, height,
        left: x,
        right: x + width,
        top: y,
        bottom: y + height,
        center: { x: x + width/2, y: y + height/2 }
      } as any),
      render: (ctx: any) => {
        if (ctx.fillRect) {
          ctx.fillRect(x, y, width, height);
        }
      },
      hitTest: (point: any) => {
        return point.x >= x && point.x <= x + width && 
               point.y >= y && point.y <= y + height;
      },
      dispose: () => {
        // No cleanup needed for mock rectangle
      }
    };
    this.addInstancedRenderable(mockRenderable);
  }

  /**
   * 渲染所有批处理内容
   */
  render(): void {
    if (!this._initialized) return;
    
    for (const [type, instances] of this.instancedRenderables) {
      this.renderInstancedBatch(type);
    }
  }

  /**
   * 清理批处理内容
   */
  clear(): void {
    this.instancedRenderables.clear();
    this.mergedGeometries.clear();
  }

  /**
   * 清理资源
   */
  dispose(): void {
    this.clear();
    this._initialized = false;
  }
  
  /**
   * 设置渲染上下文
   */
  setContext(context: any): void {
    this.context = context;
  }
  
  /**
   * 添加实例化形状
   */
  addInstancedRenderable(renderable: IRenderable, instanceCount: number = 1): void {
    const renderableType = this.getRenderableType(renderable);
    const instances = this.instancedRenderables.get(renderableType) || [];
    
    // 查找是否已有相同形状的实例
    const existingInstance = instances.find(inst => 
      this.renderablesAreEqual(inst.renderable, renderable)
    );
    
    if (existingInstance) {
      existingInstance.instanceCount += instanceCount;
    } else {
      instances.push({
        renderable,
        instanceCount,
        instanceData: this.getInstanceData(renderable, instanceCount)
      });
    }
    
    this.instancedRenderables.set(renderableType, instances);
  }
  
  /**
   * 渲染实例化批次
   */
  renderInstancedBatch(renderableType: string): void {
    const instances = this.instancedRenderables.get(renderableType);
    if (!instances || instances.length === 0) return;
    
    // 获取第一个实例的形状作为模板
    const templateRenderable = instances[0].renderable;
    
    // 对于每个实例，渲染形状
    instances.forEach(instance => {
      for (let i = 0; i < instance.instanceCount; i++) {
        // 在实际应用中，这里会使用WebGL实例化渲染
        // 简化实现：直接渲染每个实例
        if (this.context && templateRenderable.render) {
          templateRenderable.render(this.context);
        }
      }
    });
  }
  
  /**
   * 合并几何体
   */
  mergeGeometry(renderables: IRenderable[]): MergedGeometry {
    const renderableType = renderables.length > 0 ? this.getRenderableType(renderables[0]) : 'unknown';
    const cacheKey = this.getGeometryCacheKey(renderables);
    
    // 检查缓存
    const cached = this.mergedGeometries.get(cacheKey);
    if (cached) {
      return cached;
    }
    
    // 合并顶点数据
    const vertices: number[] = [];
    const indices: number[] = [];
    const textureCoords: number[] = [];
    
    let vertexOffset = 0;
    
    renderables.forEach(renderable => {
      const renderableGeometry = this.getRenderableGeometry(renderable);
      if (renderableGeometry) {
        // 添加顶点
        vertices.push(...renderableGeometry.vertices);
        
        // 调整索引偏移
        const adjustedIndices = renderableGeometry.indices.map(index => index + vertexOffset);
        indices.push(...adjustedIndices);
        
        // 添加纹理坐标
        textureCoords.push(...renderableGeometry.textureCoords);
        
        // 更新顶点偏移
        vertexOffset += renderableGeometry.vertices.length / 2; // 假设每个顶点2个坐标
      }
    });
    
    const mergedGeometry: MergedGeometry = {
      vertices: new Float32Array(vertices),
      indices: new Uint16Array(indices),
      textureCoords: new Float32Array(textureCoords),
      renderableType
    };
    
    // 缓存结果
    this.mergedGeometries.set(cacheKey, mergedGeometry);
    
    return mergedGeometry;
  }
  
  /**
   * 渲染合并的几何体
   */
  renderMergedGeometry(geometry: MergedGeometry): void {
    if (!this.context) return;
    
    // 在WebGL环境中，这里会使用缓冲区渲染合并的几何体
    // 简化实现：这里只是示意
    console.log(`Rendering merged geometry with ${geometry.vertices.length / 2} vertices`);
  }
  
  /**
   * 获取渲染对象类型
   */
  private getRenderableType(renderable: IRenderable): string {
    return renderable.constructor.name;
  }
  
  /**
   * 检查两个渲染对象是否相等
   */
  private renderablesAreEqual(renderable1: IRenderable, renderable2: IRenderable): boolean {
    // 简化实现：比较一些基本属性
    const bounds1 = renderable1.getBounds();
    const bounds2 = renderable2.getBounds();
    
    return (
      bounds1.x === bounds2.x &&
      bounds1.y === bounds2.y &&
      bounds1.width === bounds2.width &&
      bounds1.height === bounds2.height
    );
  }
  
  /**
   * 获取实例数据
   */
  private getInstanceData(renderable: IRenderable, count: number): any[] {
    // 简化实现：返回位置偏移数据
    const bounds = renderable.getBounds();
    const data = [];
    
    for (let i = 0; i < count; i++) {
      data.push({
        offsetX: i * 10, // 简单的水平偏移
        offsetY: 0,
        scale: 1
      });
    }
    
    return data;
  }
  
  /**
   * 获取几何体缓存键
   */
  private getGeometryCacheKey(renderables: IRenderable[]): string {
    return renderables.map(r => r.id).join(',');
  }
  
  /**
   * 获取渲染对象几何体数据
   */
  private getRenderableGeometry(renderable: IRenderable): { 
    vertices: number[]; 
    indices: number[]; 
    textureCoords: number[] 
  } | null {
    // 简化实现：返回基本的几何体数据
    const bounds = renderable.getBounds();
    
    // 简单的矩形几何体
    const vertices = [
      bounds.x, bounds.y,
      bounds.x + bounds.width, bounds.y,
      bounds.x + bounds.width, bounds.y + bounds.height,
      bounds.x, bounds.y + bounds.height
    ];
    
    const indices = [0, 1, 2, 0, 2, 3];
    
    const textureCoords = [0, 0, 1, 0, 1, 1, 0, 1];
    
    return { vertices, indices, textureCoords };
  }
  
  /**
   * 清空实例化渲染对象
   */
  clearInstancedRenderables(): void {
    this.instancedRenderables.clear();
  }
  
  /**
   * 清空合并的几何体
   */
  clearMergedGeometries(): void {
    this.mergedGeometries.clear();
  }
  
  /**
   * 获取实例化渲染对象数量
   */
  getInstancedRenderableCount(): number {
    let count = 0;
    for (const instances of this.instancedRenderables.values()) {
      count += instances.length;
    }
    return count;
  }
  
  /**
   * 获取合并几何体数量
   */
  getMergedGeometryCount(): number {
    return this.mergedGeometries.size;
  }
}