/**
 * 实例化渲染批处理器
 * 专门用于高效渲染大量相似对象
 */
import { IRenderCommand, MaterialKey, RenderCommandType } from '../commands/IRenderCommand';
import { IBatchData, IBatcher, IVertexLayout } from './Batcher';
import { IRect } from '../graphics/IGraphicsContext';
import { Vector2, Matrix3x3 } from '../math';

/**
 * 实例数据接口
 */
export interface InstanceData {
  /** 变换矩阵 */
  transform: Matrix3x3;
  /** 颜色调制 */
  colorModulation: [number, number, number, number];
  /** UV偏移和缩放 */
  uvTransform: [number, number, number, number]; // offsetX, offsetY, scaleX, scaleY
  /** 自定义数据 */
  customData: Float32Array;
}

/**
 * 实例化几何体
 */
interface InstancedGeometry {
  /** 基础顶点数据 */
  baseVertices: Float32Array;
  /** 基础索引数据 */
  baseIndices: Uint16Array;
  /** 实例数据 */
  instances: InstanceData[];
  /** 材质键 */
  materialKey: MaterialKey;
  /** 几何体哈希（用于去重） */
  geometryHash: string;
}

/**
 * 实例化批处理数据
 */
export interface InstancedBatchData extends IBatchData {
  /** 实例数量 */
  instanceCount: number;
  /** 实例变换矩阵数组 */
  instanceTransforms: Float32Array;
  /** 实例颜色数组 */
  instanceColors: Float32Array;
  /** 实例UV变换数组 */
  instanceUVTransforms: Float32Array;
  /** 自定义实例数据 */
  instanceCustomData?: Float32Array;
}

/**
 * 实例化配置
 */
interface InstancedConfig {
  /** 最大实例数量 */
  maxInstances: number;
  /** 最小实例数量阈值（低于此数量不使用实例化） */
  minInstanceThreshold: number;
  /** 几何体去重阈值 */
  geometryDeduplicationThreshold: number;
  /** 启用自动几何体合并 */
  enableGeometryMerging: boolean;
  /** 自定义数据大小 */
  customDataSize: number;
}

/**
 * 几何体相似性分析器
 */
class GeometryAnalyzer {
  /**
   * 计算几何体哈希值
   */
  static calculateGeometryHash(vertices: Float32Array, indices: Uint16Array): string {
    // 简化的几何体哈希算法
    const vertexHash = this.hashFloatArray(vertices, 16); // 采样前16个顶点
    const indexHash = this.hashUint16Array(indices, 16); // 采样前16个索引
    return `${vertexHash}_${indexHash}_${vertices.length}_${indices.length}`;
  }
  
  /**
   * 检查两个几何体是否相似
   */
  static areGeometriesSimilar(
    geo1: { vertices: Float32Array; indices: Uint16Array },
    geo2: { vertices: Float32Array; indices: Uint16Array },
    threshold: number
  ): boolean {
    // 快速检查：大小必须相同
    if (geo1.vertices.length !== geo2.vertices.length || geo1.indices.length !== geo2.indices.length) {
      return false;
    }
    
    // 采样比较，避免完整比较的性能开销
    const sampleSize = Math.min(16, geo1.vertices.length / 4);
    const step = Math.floor(geo1.vertices.length / sampleSize);
    
    let differences = 0;
    for (let i = 0; i < geo1.vertices.length; i += step) {
      if (Math.abs(geo1.vertices[i] - geo2.vertices[i]) > threshold) {
        differences++;
        if (differences > sampleSize * 0.1) { // 允许10%的差异
          return false;
        }
      }
    }
    
    return true;
  }
  
  private static hashFloatArray(array: Float32Array, sampleSize: number): string {
    const samples = Math.min(sampleSize, array.length);
    const step = Math.floor(array.length / samples);
    let hash = 0;
    
    for (let i = 0; i < array.length; i += step) {
      hash = ((hash << 5) - hash + Math.floor(array[i] * 1000)) & 0xffffffff;
    }
    
    return hash.toString(36);
  }
  
  private static hashUint16Array(array: Uint16Array, sampleSize: number): string {
    const samples = Math.min(sampleSize, array.length);
    const step = Math.floor(array.length / samples);
    let hash = 0;
    
    for (let i = 0; i < array.length; i += step) {
      hash = ((hash << 5) - hash + array[i]) & 0xffffffff;
    }
    
    return hash.toString(36);
  }
}

/**
 * 实例化批处理器
 */
export class InstancedBatcher implements IBatcher {
  readonly maxBatchSize: number;
  readonly vertexLayout: IVertexLayout;
  
  private config: InstancedConfig;
  private geometryGroups = new Map<string, InstancedGeometry>();
  private commandCount = 0;
  
  // 性能统计
  private stats = {
    instancedDrawCalls: 0,
    totalInstances: 0,
    geometryDeduplication: 0,
    memoryUsageBytes: 0
  };
  
  constructor(config?: Partial<InstancedConfig>) {
    this.config = {
      maxInstances: 1000,
      minInstanceThreshold: 3,
      geometryDeduplicationThreshold: 0.001,
      enableGeometryMerging: true,
      customDataSize: 4,
      ...config
    };
    
    this.maxBatchSize = this.config.maxInstances;
    
    // 定义实例化顶点布局
    this.vertexLayout = {
      position: 0,
      texCoord: 8,
      color: 16,
      transformIndex: 32,
      stride: 36
    };
  }
  
  get batchCount(): number {
    return this.geometryGroups.size;
  }
  
  addCommand(command: IRenderCommand): boolean {
    // 获取命令的几何数据
    const batchData = command.getBatchData();
    if (!batchData) return false;
    
    // 计算几何体哈希
    const geometryHash = GeometryAnalyzer.calculateGeometryHash(
      batchData.vertices, 
      batchData.indices
    );
    
    // 查找或创建几何体组
    let geometryGroup = this.geometryGroups.get(geometryHash);
    
    if (!geometryGroup) {
      // 检查是否存在相似的几何体
      if (this.config.enableGeometryMerging) {
        geometryGroup = this.findSimilarGeometry(batchData.vertices, batchData.indices);
      }
      
      if (!geometryGroup) {
        // 创建新的几何体组
        geometryGroup = {
          baseVertices: batchData.vertices,
          baseIndices: batchData.indices,
          instances: [],
          materialKey: command.materialKey,
          geometryHash
        };
        this.geometryGroups.set(geometryHash, geometryGroup);
      } else {
        this.stats.geometryDeduplication++;
      }
    }
    
    // 检查是否可以添加更多实例
    if (geometryGroup.instances.length >= this.config.maxInstances) {
      return false;
    }
    
    // 从命令中提取实例数据
    const instanceData = this.extractInstanceData(command);
    geometryGroup.instances.push(instanceData);
    
    this.commandCount++;
    return true;
  }
  
  flush(): IBatchData[] {
    const batchData: InstancedBatchData[] = [];
    
    for (const [geometryHash, geometry] of this.geometryGroups) {
      // 只对达到最小阈值的几何体使用实例化渲染
      if (geometry.instances.length >= this.config.minInstanceThreshold) {
        const instancedBatch = this.createInstancedBatch(geometry);
        batchData.push(instancedBatch);
        this.stats.instancedDrawCalls++;
        this.stats.totalInstances += geometry.instances.length;
      } else {
        // 对于实例数量少的几何体，回退到普通批处理
        for (const instance of geometry.instances) {
          const regularBatch = this.createRegularBatch(geometry, instance);
          batchData.push(regularBatch);
        }
      }
    }
    
    this.clear();
    return batchData;
  }
  
  clear(): void {
    this.geometryGroups.clear();
    this.commandCount = 0;
    this.stats.memoryUsageBytes = 0;
  }
  
  getStats() {
    // 计算当前内存使用量
    let memoryUsage = 0;
    for (const geometry of this.geometryGroups.values()) {
      memoryUsage += geometry.baseVertices.byteLength;
      memoryUsage += geometry.baseIndices.byteLength;
      memoryUsage += geometry.instances.length * (16 * 4 + 4 * 4 + 4 * 4 + this.config.customDataSize * 4);
    }
    this.stats.memoryUsageBytes = memoryUsage;
    
    return {
      totalCommands: this.commandCount,
      totalBatches: this.geometryGroups.size,
      averageCommandsPerBatch: this.geometryGroups.size > 0 ? this.commandCount / this.geometryGroups.size : 0,
      memoryUsage
    };
  }
  
  /**
   * 获取实例化特有的统计信息
   */
  getInstancedStats() {
    return { ...this.stats };
  }
  
  /**
   * 从渲染命令中提取实例数据
   */
  private extractInstanceData(command: IRenderCommand): InstanceData {
    const bounds = command.getBounds();
    
    // 构建变换矩阵
    const transform = Matrix3x3.translation(bounds.x, bounds.y)
      .multiply(Matrix3x3.scale(bounds.width, bounds.height));
    
    // 提取颜色信息（如果可用）
    const colorModulation: [number, number, number, number] = [1, 1, 1, 1];
    
    // 计算UV变换
    const uvTransform: [number, number, number, number] = [0, 0, 1, 1];
    
    // 自定义数据（可以根据命令类型扩展）
    const customData = new Float32Array(this.config.customDataSize);
    
    // 根据命令类型填充自定义数据
    switch (command.type) {
      case RenderCommandType.CIRCLE:
        customData[0] = 1; // 标记为圆形
        break;
      case RenderCommandType.RECTANGLE:
        customData[0] = 2; // 标记为矩形
        break;
      // 可以添加更多类型
    }
    
    return {
      transform,
      colorModulation,
      uvTransform,
      customData
    };
  }
  
  /**
   * 查找相似的几何体
   */
  private findSimilarGeometry(vertices: Float32Array, indices: Uint16Array): InstancedGeometry | undefined {
    for (const geometry of this.geometryGroups.values()) {
      if (GeometryAnalyzer.areGeometriesSimilar(
        { vertices: geometry.baseVertices, indices: geometry.baseIndices },
        { vertices, indices },
        this.config.geometryDeduplicationThreshold
      )) {
        return geometry;
      }
    }
    return undefined;
  }
  
  /**
   * 创建实例化批处理数据
   */
  private createInstancedBatch(geometry: InstancedGeometry): InstancedBatchData {
    const instanceCount = geometry.instances.length;
    
    // 创建实例变换矩阵数组
    const instanceTransforms = new Float32Array(instanceCount * 16);
    const instanceColors = new Float32Array(instanceCount * 4);
    const instanceUVTransforms = new Float32Array(instanceCount * 4);
    const instanceCustomData = new Float32Array(instanceCount * this.config.customDataSize);
    
    // 计算合并边界框
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    
    for (let i = 0; i < instanceCount; i++) {
      const instance = geometry.instances[i];
      
      // 变换矩阵（转换为4x4矩阵格式）
      const matrix = instance.transform.toArray();
      const matrixOffset = i * 16;
      instanceTransforms[matrixOffset + 0] = matrix[0];
      instanceTransforms[matrixOffset + 1] = matrix[1];
      instanceTransforms[matrixOffset + 2] = 0;
      instanceTransforms[matrixOffset + 3] = matrix[2];
      instanceTransforms[matrixOffset + 4] = matrix[3];
      instanceTransforms[matrixOffset + 5] = matrix[4];
      instanceTransforms[matrixOffset + 6] = 0;
      instanceTransforms[matrixOffset + 7] = matrix[5];
      instanceTransforms[matrixOffset + 8] = 0;
      instanceTransforms[matrixOffset + 9] = 0;
      instanceTransforms[matrixOffset + 10] = 1;
      instanceTransforms[matrixOffset + 11] = 0;
      instanceTransforms[matrixOffset + 12] = matrix[6];
      instanceTransforms[matrixOffset + 13] = matrix[7];
      instanceTransforms[matrixOffset + 14] = 0;
      instanceTransforms[matrixOffset + 15] = matrix[8];
      
      // 颜色调制
      const colorOffset = i * 4;
      instanceColors[colorOffset + 0] = instance.colorModulation[0];
      instanceColors[colorOffset + 1] = instance.colorModulation[1];
      instanceColors[colorOffset + 2] = instance.colorModulation[2];
      instanceColors[colorOffset + 3] = instance.colorModulation[3];
      
      // UV变换
      const uvOffset = i * 4;
      instanceUVTransforms[uvOffset + 0] = instance.uvTransform[0];
      instanceUVTransforms[uvOffset + 1] = instance.uvTransform[1];
      instanceUVTransforms[uvOffset + 2] = instance.uvTransform[2];
      instanceUVTransforms[uvOffset + 3] = instance.uvTransform[3];
      
      // 自定义数据
      const customOffset = i * this.config.customDataSize;
      for (let j = 0; j < this.config.customDataSize; j++) {
        instanceCustomData[customOffset + j] = instance.customData[j];
      }
      
      // 更新边界框
      const translation = instance.transform.getTranslation();
      minX = Math.min(minX, translation.x);
      minY = Math.min(minY, translation.y);
      maxX = Math.max(maxX, translation.x);
      maxY = Math.max(maxY, translation.y);
    }
    
    return {
      vertices: geometry.baseVertices,
      indices: geometry.baseIndices,
      vertexCount: geometry.baseVertices.length / (this.vertexLayout.stride / 4),
      indexCount: geometry.baseIndices.length,
      materialKey: geometry.materialKey,
      bounds: {
        x: minX,
        y: minY,
        width: maxX - minX,
        height: maxY - minY
      },
      instanceCount,
      instanceTransforms,
      instanceColors,
      instanceUVTransforms,
      instanceCustomData
    };
  }
  
  /**
   * 为低实例数的几何体创建常规批处理数据
   */
  private createRegularBatch(geometry: InstancedGeometry, instance: InstanceData): IBatchData {
    // 应用实例变换到基础几何体
    const transformedVertices = new Float32Array(geometry.baseVertices.length);
    const stride = this.vertexLayout.stride / 4;
    
    for (let i = 0; i < geometry.baseVertices.length; i += stride) {
      const vertex = new Vector2(
        geometry.baseVertices[i],
        geometry.baseVertices[i + 1]
      );
      
      const transformed = instance.transform.transformVector(vertex);
      transformedVertices[i] = transformed.x;
      transformedVertices[i + 1] = transformed.y;
      
      // 复制其他属性
      for (let j = 2; j < stride; j++) {
        transformedVertices[i + j] = geometry.baseVertices[i + j];
      }
    }
    
    const translation = instance.transform.getTranslation();
    const scale = instance.transform.getScale();
    
    return {
      vertices: transformedVertices,
      indices: geometry.baseIndices,
      vertexCount: transformedVertices.length / stride,
      indexCount: geometry.baseIndices.length,
      materialKey: geometry.materialKey,
      bounds: {
        x: translation.x,
        y: translation.y,
        width: scale.x,
        height: scale.y
      }
    };
  }
}