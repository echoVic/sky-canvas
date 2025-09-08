/**
 * 智能批处理系统
 * 基于材质、纹理和渲染状态智能合并渲染命令
 */
import { IRenderCommand, MaterialKey, RenderCommandType } from '../commands/IRenderCommand';
import { IRect } from '../graphics/IGraphicsContext';
import { Matrix2D } from '../math/Transform';

/**
 * 批处理数据结构
 */
export interface IBatchData {
  /** 顶点数据 */
  vertices: Float32Array;
  /** 索引数据 */
  indices: Uint16Array;
  /** 顶点数量 */
  vertexCount: number;
  /** 索引数量 */
  indexCount: number;
  /** 材质键 */
  materialKey: MaterialKey;
  /** 边界框 */
  bounds: IRect;
}

/**
 * 顶点属性布局
 */
export interface IVertexLayout {
  /** 位置（2 floats） */
  position: number;
  /** 纹理坐标（2 floats） */
  texCoord?: number;
  /** 颜色（4 floats） */
  color?: number;
  /** 变换矩阵索引（1 float） */
  transformIndex?: number;
  /** 纹理索引（1 float） */
  textureIndex?: number;
  /** 总步长 */
  stride: number;
}

/**
 * 批处理器接口
 */
export interface IBatcher {
  /** 最大批次大小 */
  readonly maxBatchSize: number;
  
  /** 当前批次数量 */
  readonly batchCount: number;
  
  /** 顶点布局 */
  readonly vertexLayout: IVertexLayout;
  
  /**
   * 添加渲染命令到批次
   * @param command 渲染命令
   * @returns 是否成功添加
   */
  addCommand(command: IRenderCommand): boolean;
  
  /**
   * 完成当前批次并返回批处理数据
   * @returns 批处理数据数组
   */
  flush(): IBatchData[];
  
  /**
   * 清空所有批次
   */
  clear(): void;
  
  /**
   * 获取批处理统计信息
   */
  getStats(): {
    totalCommands: number;
    totalBatches: number;
    averageCommandsPerBatch: number;
    memoryUsage: number;
  };
}

/**
 * 通用批处理器实现
 */
export class UniversalBatcher implements IBatcher {
  readonly maxBatchSize: number;
  readonly vertexLayout: IVertexLayout;
  
  private batches = new Map<string, BatchAccumulator>();
  private commandCount = 0;
  
  constructor(
    maxBatchSize: number = 10000,
    layout?: Partial<IVertexLayout>
  ) {
    this.maxBatchSize = maxBatchSize;
    this.vertexLayout = {
      position: 0,
      texCoord: 2,
      color: 4,
      transformIndex: 8,
      textureIndex: 9,
      stride: 10 * 4, // 10 floats * 4 bytes
      ...layout
    };
  }
  
  get batchCount(): number {
    return this.batches.size;
  }
  
  addCommand(command: IRenderCommand): boolean {
    const batchKey = this.getBatchKey(command);
    let batch = this.batches.get(batchKey);
    
    if (!batch) {
      batch = new BatchAccumulator(
        command.materialKey,
        this.vertexLayout,
        this.maxBatchSize
      );
      this.batches.set(batchKey, batch);
    }
    
    if (batch.addCommand(command)) {
      this.commandCount++;
      return true;
    }
    
    // 如果当前批次已满，尝试创建新批次
    const newBatchKey = `${batchKey}_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
    const newBatch = new BatchAccumulator(
      command.materialKey,
      this.vertexLayout,
      this.maxBatchSize
    );
    
    if (newBatch.addCommand(command)) {
      this.batches.set(newBatchKey, newBatch);
      this.commandCount++;
      return true;
    }
    
    return false;
  }
  
  flush(): IBatchData[] {
    const batchData: IBatchData[] = [];
    
    for (const batch of this.batches.values()) {
      if (batch.hasData()) {
        batchData.push(batch.generateBatchData());
      }
    }
    
    this.clear();
    return batchData;
  }
  
  clear(): void {
    this.batches.clear();
    this.commandCount = 0;
  }
  
  getStats() {
    const totalBatches = this.batches.size;
    let memoryUsage = 0;
    
    for (const batch of this.batches.values()) {
      memoryUsage += batch.getMemoryUsage();
    }
    
    return {
      totalCommands: this.commandCount,
      totalBatches,
      averageCommandsPerBatch: totalBatches > 0 ? this.commandCount / totalBatches : 0,
      memoryUsage
    };
  }
  
  protected getBatchKey(command: IRenderCommand): string {
    const mk = command.materialKey;
    // 使用类型、纹理、着色器、混合模式作为批次键
    return `${command.type}_${mk.textureId || 'none'}_${mk.shaderId || 'default'}_${mk.blendMode || 'normal'}`;
  }
}

/**
 * 批次累加器 - 负责收集和组织单个批次的数据
 */
class BatchAccumulator {
  private materialKey: MaterialKey;
  private layout: IVertexLayout;
  private maxSize: number;
  
  private vertices: number[] = [];
  private indices: number[] = [];
  private currentVertexIndex = 0;
  private bounds: IRect | null = null;
  
  constructor(
    materialKey: MaterialKey,
    layout: IVertexLayout,
    maxSize: number
  ) {
    this.materialKey = { ...materialKey };
    this.layout = layout;
    this.maxSize = maxSize;
  }
  
  addCommand(command: IRenderCommand): boolean {
    // 检查是否可以添加更多数据
    if (this.vertices.length >= this.maxSize * this.layout.stride / 4) {
      return false;
    }
    
    // 检查材质兼容性
    if (!this.isCompatible(command)) {
      return false;
    }
    
    // 获取命令的批处理数据
    const batchData = command.getBatchData();
    if (!batchData) return false;
    
    // 添加顶点和索引数据
    this.addVertexData(command, batchData);
    this.updateBounds(command.getBounds());
    
    return true;
  }
  
  hasData(): boolean {
    return this.vertices.length > 0;
  }
  
  generateBatchData(): IBatchData {
    return {
      vertices: new Float32Array(this.vertices),
      indices: new Uint16Array(this.indices),
      vertexCount: this.vertices.length / (this.layout.stride / 4),
      indexCount: this.indices.length,
      materialKey: this.materialKey,
      bounds: this.bounds || { x: 0, y: 0, width: 0, height: 0 }
    };
  }
  
  getMemoryUsage(): number {
    return this.vertices.length * 4 + this.indices.length * 2;
  }
  
  private isCompatible(command: IRenderCommand): boolean {
    const mk = command.materialKey;
    const myMk = this.materialKey;
    
    return mk.textureId === myMk.textureId &&
           mk.shaderId === myMk.shaderId &&
           mk.blendMode === myMk.blendMode;
  }
  
  private addVertexData(command: IRenderCommand, batchData: any): void {
    const startVertexIndex = this.currentVertexIndex;
    
    // 根据命令类型生成顶点数据
    switch (command.type) {
      case RenderCommandType.RECT:
        this.addRectVertices(batchData);
        break;
      case RenderCommandType.CIRCLE:
        this.addCircleVertices(batchData);
        break;
      default:
        console.warn(`Unsupported command type for batching: ${command.type}`);
        return;
    }
    
    // 添加索引数据（假设是四边形）
    const baseIndex = startVertexIndex;
    this.indices.push(
      baseIndex, baseIndex + 1, baseIndex + 2,
      baseIndex + 2, baseIndex + 3, baseIndex
    );
    
    this.currentVertexIndex += 4; // 每个形状4个顶点
  }
  
  private addRectVertices(data: any): void {
    const { x, y, width, height } = data;
    const floatsPerVertex = this.layout.stride / 4;
    
    // 四个顶点：左下、右下、右上、左上
    const positions = [
      [x, y],
      [x + width, y],
      [x + width, y + height],
      [x, y + height]
    ];
    
    const texCoords = [
      [0, 0], [1, 0], [1, 1], [0, 1]
    ];
    
    for (let i = 0; i < 4; i++) {
      // 位置
      this.vertices.push(positions[i][0], positions[i][1]);
      
      // 纹理坐标
      if (this.layout.texCoord !== undefined) {
        this.vertices.push(texCoords[i][0], texCoords[i][1]);
      }
      
      // 颜色 (白色，后续会被材质颜色调制)
      if (this.layout.color !== undefined) {
        this.vertices.push(1.0, 1.0, 1.0, 1.0);
      }
      
      // 变换索引
      if (this.layout.transformIndex !== undefined) {
        this.vertices.push(0); // 暂时使用单位变换
      }
      
      // 纹理索引
      if (this.layout.textureIndex !== undefined) {
        this.vertices.push(0); // 默认纹理槽
      }
      
      // 填充到指定步长
      const currentLength = this.vertices.length;
      const expectedLength = Math.floor(currentLength / floatsPerVertex) * floatsPerVertex + floatsPerVertex;
      while (this.vertices.length < expectedLength) {
        this.vertices.push(0);
      }
    }
  }
  
  private addCircleVertices(data: any): void {
    const { centerX, centerY, radius } = data;
    
    // 将圆形表示为四边形，在着色器中使用SDF绘制
    const x = centerX - radius;
    const y = centerY - radius;
    const size = radius * 2;
    
    this.addRectVertices({ x, y, width: size, height: size });
  }
  
  private updateBounds(newBounds: IRect): void {
    if (!this.bounds) {
      this.bounds = { ...newBounds };
    } else {
      const minX = Math.min(this.bounds.x, newBounds.x);
      const minY = Math.min(this.bounds.y, newBounds.y);
      const maxX = Math.max(this.bounds.x + this.bounds.width, newBounds.x + newBounds.width);
      const maxY = Math.max(this.bounds.y + this.bounds.height, newBounds.y + newBounds.height);
      
      this.bounds = {
        x: minX,
        y: minY,
        width: maxX - minX,
        height: maxY - minY
      };
    }
  }
}

/**
 * 多纹理批处理器
 * 支持在单个批次中使用多个纹理
 */
export class MultiTextureBatcher extends UniversalBatcher {
  private readonly maxTextures: number;
  private textureSlots = new Map<string, number>();
  private nextTextureSlot = 0;
  
  constructor(maxBatchSize: number = 10000, maxTextures: number = 16) {
    super(maxBatchSize, {
      position: 0,
      texCoord: 2,
      color: 4,
      textureIndex: 8,
      stride: 9 * 4 // 9 floats
    });
    this.maxTextures = maxTextures;
  }
  
  protected getBatchKey(command: IRenderCommand): string {
    // 多纹理批处理器使用更宽松的批次键
    const mk = command.materialKey;
    return `${command.type}_${mk.shaderId || 'default'}_${mk.blendMode || 'normal'}`;
  }
  
  addCommand(command: IRenderCommand): boolean {
    const textureId = command.materialKey.textureId;
    
    if (textureId && !this.textureSlots.has(textureId)) {
      if (this.nextTextureSlot >= this.maxTextures) {
        // 纹理槽已满，需要刷新当前批次
        return false;
      }
      this.textureSlots.set(textureId, this.nextTextureSlot++);
    }
    
    return super.addCommand(command);
  }
  
  flush(): IBatchData[] {
    const batchData = super.flush();
    
    // 重置纹理槽
    this.textureSlots.clear();
    this.nextTextureSlot = 0;
    
    // 为每个批次添加纹理槽信息
    for (const batch of batchData) {
      (batch as any).textureSlots = new Map(this.textureSlots);
    }
    
    return batchData;
  }
}

/**
 * 批处理器工厂
 */
export class BatcherFactory {
  /**
   * 创建基础批处理器
   * @param maxSize 最大批次大小
   */
  static createBasic(maxSize: number = 10000): IBatcher {
    return new UniversalBatcher(maxSize);
  }
  
  /**
   * 创建多纹理批处理器
   * @param maxSize 最大批次大小
   * @param maxTextures 最大纹理数量
   */
  static createMultiTexture(maxSize: number = 10000, maxTextures: number = 16): IBatcher {
    return new MultiTextureBatcher(maxSize, maxTextures);
  }
  
  /**
   * 创建高性能批处理器
   */
  static createHighPerformance(): IBatcher {
    return new MultiTextureBatcher(50000, 16); // 大批次，支持多纹理
  }
}