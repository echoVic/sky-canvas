# 第二阶段实施指南：性能优化

## 1. 脏矩形检测系统

### 1.1 创建脏区域管理器

**文件**: `packages/render-engine/src/core/DirtyRegionManager.ts`

```typescript
import { Rectangle } from '../math/Rectangle';
import { IShape } from '../../types';

/**
 * 形状快照接口
 */
export interface ShapeSnapshot {
  id: string;
  bounds: Rectangle;
  visible: boolean;
  zIndex: number;
}

/**
 * 脏区域管理器
 */
export class DirtyRegionManager {
  private dirtyRegions: Rectangle[] = [];
  private lastFrameShapes: Map<string, ShapeSnapshot> = new Map();
  private currentFrameShapes: Map<string, ShapeSnapshot> = new Map();
  
  /**
   * 标记区域为脏区域
   */
  markRegionDirty(bounds: Rectangle, reason: string = 'unknown'): void {
    this.dirtyRegions.push({ ...bounds });
  }
  
  /**
   * 优化脏区域（合并相邻区域）
   */
  optimizeDirtyRegions(): Rectangle[] {
    if (this.dirtyRegions.length === 0) return [];
    
    // 简单的合并策略：合并重叠或相邻的区域
    const optimized: Rectangle[] = [];
    const regions = [...this.dirtyRegions];
    
    while (regions.length > 0) {
      const region = regions.shift()!;
      let merged = false;
      
      for (let i = 0; i < optimized.length; i++) {
        if (this.rectanglesIntersectOrAdjacent(region, optimized[i])) {
          // 合并区域
          optimized[i] = this.mergeRectangles(region, optimized[i]);
          merged = true;
          break;
        }
      }
      
      if (!merged) {
        optimized.push(region);
      }
    }
    
    this.dirtyRegions = optimized;
    return [...optimized];
  }
  
  /**
   * 检查两个矩形是否相交或相邻
   */
  private rectanglesIntersectOrAdjacent(rect1: Rectangle, rect2: Rectangle): boolean {
    // 扩展rect1和rect2各1像素以检查相邻
    const extended1 = {
      x: rect1.x - 1,
      y: rect1.y - 1,
      width: rect1.width + 2,
      height: rect1.height + 2
    };
    
    return !(
      extended1.x + extended1.width < rect2.x ||
      rect2.x + rect2.width < extended1.x ||
      extended1.y + extended1.height < rect2.y ||
      rect2.y + rect2.height < extended1.y
    );
  }
  
  /**
   * 合并两个矩形
   */
  private mergeRectangles(rect1: Rectangle, rect2: Rectangle): Rectangle {
    const minX = Math.min(rect1.x, rect2.x);
    const minY = Math.min(rect1.y, rect2.y);
    const maxX = Math.max(rect1.x + rect1.width, rect2.x + rect2.width);
    const maxY = Math.max(rect1.y + rect1.height, rect2.y + rect2.height);
    
    return {
      x: minX,
      y: minY,
      width: maxX - minX,
      height: maxY - minY
    };
  }
  
  /**
   * 检查形状是否需要重新绘制
   */
  shouldRedrawShape(shape: IShape): boolean {
    const id = shape.id;
    const currentSnapshot = this.createShapeSnapshot(shape);
    const lastSnapshot = this.lastFrameShapes.get(id);
    
    // 如果是新形状或形状发生变化，则需要重绘
    if (!lastSnapshot) {
      return true;
    }
    
    return (
      currentSnapshot.bounds.x !== lastSnapshot.bounds.x ||
      currentSnapshot.bounds.y !== lastSnapshot.bounds.y ||
      currentSnapshot.bounds.width !== lastSnapshot.bounds.width ||
      currentSnapshot.bounds.height !== lastSnapshot.bounds.height ||
      currentSnapshot.visible !== lastSnapshot.visible
    );
  }
  
  /**
   * 创建形状快照
   */
  private createShapeSnapshot(shape: IShape): ShapeSnapshot {
    return {
      id: shape.id,
      bounds: shape.getBounds(),
      visible: shape.visible,
      zIndex: shape.zIndex
    };
  }
  
  /**
   * 更新当前帧的形状状态
   */
  updateCurrentFrameShape(shape: IShape): void {
    const snapshot = this.createShapeSnapshot(shape);
    this.currentFrameShapes.set(snapshot.id, snapshot);
  }
  
  /**
   * 准备下一帧
   */
  prepareNextFrame(): void {
    this.lastFrameShapes = new Map(this.currentFrameShapes);
    this.currentFrameShapes.clear();
    this.dirtyRegions = [];
  }
  
  /**
   * 获取所有脏区域
   */
  getDirtyRegions(): Rectangle[] {
    return [...this.dirtyRegions];
  }
  
  /**
   * 清空脏区域
   */
  clearDirtyRegions(): void {
    this.dirtyRegions = [];
  }
}
```

### 1.2 集成到渲染引擎

**文件**: `packages/render-engine/src/core/RenderEngine.ts`

```typescript
// 添加导入
import { DirtyRegionManager } from './DirtyRegionManager';

// 在类中添加属性
export class RenderEngine {
  private dirtyRegionManager: DirtyRegionManager = new DirtyRegionManager();
  
  // 在render方法中使用脏矩形检测
  render(): void {
    if (!this.context || !this.scene) return;
    
    const context = this.context;
    const shapes = this.scene.getShapes();
    
    // 优化脏区域
    const dirtyRegions = this.dirtyRegionManager.optimizeDirtyRegions();
    
    if (dirtyRegions.length > 0) {
      // 只重绘脏区域
      dirtyRegions.forEach(region => {
        this.renderRegion(context, region, shapes);
      });
    } else {
      // 全屏重绘（首次渲染或需要全屏更新时）
      this.renderAll(context, shapes);
    }
    
    // 更新脏区域管理器为下一帧做准备
    this.dirtyRegionManager.prepareNextFrame();
  }
  
  /**
   * 渲染指定区域
   */
  private renderRegion(context: any, region: Rectangle, shapes: IShape[]): void {
    // 保存当前上下文状态
    context.save();
    
    // 设置裁剪区域
    if (context instanceof CanvasRenderingContext2D) {
      context.beginPath();
      context.rect(region.x, region.y, region.width, region.height);
      context.clip();
    }
    
    // 渲染该区域内的形状
    shapes.forEach(shape => {
      if (shape.visible && this.isShapeInRegion(shape, region)) {
        shape.render(context);
      }
    });
    
    // 恢复上下文状态
    context.restore();
  }
  
  /**
   * 检查形状是否在指定区域内
   */
  private isShapeInRegion(shape: IShape, region: Rectangle): boolean {
    const bounds = shape.getBounds();
    return !(
      bounds.x + bounds.width < region.x ||
      region.x + region.width < bounds.x ||
      bounds.y + bounds.height < region.y ||
      region.y + region.height < bounds.y
    );
  }
  
  /**
   * 全屏渲染
   */
  private renderAll(context: any, shapes: IShape[]): void {
    context.clear();
    
    // 按zIndex排序渲染
    const sortedShapes = [...shapes].sort((a, b) => a.zIndex - b.zIndex);
    
    sortedShapes.forEach(shape => {
      if (shape.visible) {
        shape.render(context);
        // 更新脏区域管理器中的形状状态
        this.dirtyRegionManager.updateCurrentFrameShape(shape);
      }
    });
  }
  
  /**
   * 标记区域为脏区域
   */
  markRegionDirty(bounds: Rectangle): void {
    this.dirtyRegionManager.markRegionDirty(bounds);
  }
}
```

## 2. 图层缓存系统

### 2.1 创建图层缓存管理器

**文件**: `packages/render-engine/src/core/LayerCache.ts`

```typescript
/**
 * 缓存策略接口
 */
export interface CachePolicy {
  maxSize: number;
  ttl: number; // 生存时间（毫秒）
}

/**
 * 图层缓存管理器
 */
export class LayerCache {
  private cache: Map<string, {
    canvas: HTMLCanvasElement;
    context: CanvasRenderingContext2D;
    timestamp: number;
    memoryUsage: number;
  }> = new Map();
  
  private cachePolicy: CachePolicy = {
    maxSize: 100 * 1024 * 1024, // 100MB
    ttl: 30000 // 30秒
  };
  
  private currentMemoryUsage: number = 0;
  
  /**
   * 缓存图层
   */
  cacheLayer(layerId: string, shapes: IShape[]): HTMLCanvasElement {
    // 检查缓存是否已存在且有效
    const cached = this.cache.get(layerId);
    if (cached && this.isCacheValid(cached)) {
      return cached.canvas;
    }
    
    // 创建新的缓存
    const canvas = document.createElement('canvas');
    const bounds = this.calculateLayerBounds(shapes);
    
    canvas.width = bounds.width;
    canvas.height = bounds.height;
    
    const context = canvas.getContext('2d');
    if (!context) {
      throw new Error('Failed to get 2D context');
    }
    
    // 渲染形状到缓存画布
    context.save();
    context.translate(-bounds.x, -bounds.y);
    
    shapes.forEach(shape => {
      if (shape.visible) {
        shape.render(context);
      }
    });
    
    context.restore();
    
    // 计算内存使用量
    const memoryUsage = canvas.width * canvas.height * 4; // 假设32位颜色
    
    // 更新内存使用量
    if (cached) {
      this.currentMemoryUsage -= cached.memoryUsage;
    }
    this.currentMemoryUsage += memoryUsage;
    
    // 存储到缓存
    this.cache.set(layerId, {
      canvas,
      context,
      timestamp: Date.now(),
      memoryUsage
    });
    
    // 清理过期缓存
    this.cleanupExpiredCache();
    
    // 如果内存使用超出限制，清理最少使用的缓存
    if (this.currentMemoryUsage > this.cachePolicy.maxSize) {
      this.cleanupLeastUsedCache();
    }
    
    return canvas;
  }
  
  /**
   * 使缓存失效
   */
  invalidateCache(layerId: string): void {
    const cached = this.cache.get(layerId);
    if (cached) {
      this.currentMemoryUsage -= cached.memoryUsage;
      this.cache.delete(layerId);
    }
  }
  
  /**
   * 从缓存渲染图层
   */
  renderFromCache(layerId: string, context: CanvasRenderingContext2D, position: { x: number; y: number }): void {
    const cached = this.cache.get(layerId);
    if (cached && this.isCacheValid(cached)) {
      context.drawImage(cached.canvas, position.x, position.y);
    }
  }
  
  /**
   * 检查缓存是否有效
   */
  private isCacheValid(cached: { timestamp: number }): boolean {
    return Date.now() - cached.timestamp < this.cachePolicy.ttl;
  }
  
  /**
   * 清理过期缓存
   */
  cleanupExpiredCache(): void {
    const now = Date.now();
    for (const [key, cached] of this.cache.entries()) {
      if (now - cached.timestamp >= this.cachePolicy.ttl) {
        this.currentMemoryUsage -= cached.memoryUsage;
        this.cache.delete(key);
      }
    }
  }
  
  /**
   * 清理最少使用的缓存
   */
  cleanupLeastUsedCache(): void {
    // 简单的LRU策略：清理最旧的缓存
    const entries = Array.from(this.cache.entries());
    entries.sort((a, b) => a[1].timestamp - b[1].timestamp);
    
    let cleanedMemory = 0;
    const targetMemory = this.cachePolicy.maxSize * 0.8; // 清理到80%以下
    
    for (const [key, cached] of entries) {
      if (this.currentMemoryUsage - cleanedMemory <= targetMemory) {
        break;
      }
      
      cleanedMemory += cached.memoryUsage;
      this.cache.delete(key);
    }
    
    this.currentMemoryUsage -= cleanedMemory;
  }
  
  /**
   * 清理未使用的缓存
   */
  cleanupUnusedCache(): void {
    // 在实际应用中，可以根据使用频率清理缓存
    // 这里简化为清理所有缓存
    this.cache.clear();
    this.currentMemoryUsage = 0;
  }
  
  /**
   * 获取缓存内存使用量
   */
  getCacheMemoryUsage(): number {
    return this.currentMemoryUsage;
  }
  
  /**
   * 获取缓存命中率
   */
  getCacheHitRate(): number {
    // 简化实现，实际应用中需要统计命中和未命中次数
    return this.cache.size > 0 ? 0.8 : 0;
  }
  
  /**
   * 计算图层边界
   */
  private calculateLayerBounds(shapes: IShape[]): { x: number; y: number; width: number; height: number } {
    if (shapes.length === 0) {
      return { x: 0, y: 0, width: 1, height: 1 };
    }
    
    let minX = Infinity, minY = Infinity;
    let maxX = -Infinity, maxY = -Infinity;
    
    shapes.forEach(shape => {
      const bounds = shape.getBounds();
      minX = Math.min(minX, bounds.x);
      minY = Math.min(minY, bounds.y);
      maxX = Math.max(maxX, bounds.x + bounds.width);
      maxY = Math.max(maxY, bounds.y + bounds.height);
    });
    
    return {
      x: minX,
      y: minY,
      width: Math.max(1, maxX - minX),
      height: Math.max(1, maxY - minY)
    };
  }
}
```

### 2.2 集成到渲染引擎

**文件**: `packages/render-engine/src/core/RenderEngine.ts`

```typescript
// 添加导入
import { LayerCache } from './LayerCache';

// 在类中添加属性
export class RenderEngine {
  private layerCache: LayerCache = new LayerCache();
  
  // 在render方法中使用图层缓存
  render(): void {
    if (!this.context || !this.scene) return;
    
    const context = this.context;
    const layers = this.scene.getLayers();
    
    context.clear();
    
    // 按图层渲染
    layers.forEach(layer => {
      if (layer.visible) {
        // 检查图层是否可以缓存
        if (this.canCacheLayer(layer)) {
          // 从缓存渲染
          const position = { x: 0, y: 0 }; // 根据实际需求调整
          this.layerCache.renderFromCache(layer.id, context, position);
        } else {
          // 直接渲染图层中的形状
          const shapes = layer.getShapes();
          shapes.forEach(shape => {
            if (shape.visible) {
              shape.render(context);
            }
          });
        }
      }
    });
  }
  
  /**
   * 检查图层是否可以缓存
   */
  private canCacheLayer(layer: ILayer): boolean {
    // 静态图层可以缓存（没有动画或频繁变化的元素）
    const shapes = layer.getShapes();
    return shapes.every(shape => !this.isShapeAnimating(shape));
  }
  
  /**
   * 检查形状是否在动画中
   */
  private isShapeAnimating(shape: IShape): boolean {
    // 简化实现，实际应用中需要检查动画状态
    return false;
  }
  
  /**
   * 使图层缓存失效
   */
  invalidateLayerCache(layerId: string): void {
    this.layerCache.invalidateCache(layerId);
  }
}
```

## 3. 批量渲染优化

### 3.1 创建高级批处理器

**文件**: `packages/render-engine/src/batching/AdvancedBatcher.ts`

```typescript
import { IShape } from '../../types';
import { Batcher } from './Batcher';

/**
 * 实例化形状接口
 */
export interface InstancedShape {
  shape: IShape;
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
  shapeType: string;
}

/**
 * 高级批处理器
 */
export class AdvancedBatcher extends Batcher {
  private instancedShapes: Map<string, InstancedShape[]> = new Map();
  private mergedGeometries: Map<string, MergedGeometry> = new Map();
  
  /**
   * 添加实例化形状
   */
  addInstancedShape(shape: IShape, instanceCount: number = 1): void {
    const shapeType = this.getShapeType(shape);
    const instances = this.instancedShapes.get(shapeType) || [];
    
    // 查找是否已有相同形状的实例
    const existingInstance = instances.find(inst => 
      this.shapesAreEqual(inst.shape, shape)
    );
    
    if (existingInstance) {
      existingInstance.instanceCount += instanceCount;
    } else {
      instances.push({
        shape,
        instanceCount,
        instanceData: this.getInstanceData(shape, instanceCount)
      });
    }
    
    this.instancedShapes.set(shapeType, instances);
  }
  
  /**
   * 渲染实例化批次
   */
  renderInstancedBatch(shapeType: string): void {
    const instances = this.instancedShapes.get(shapeType);
    if (!instances || instances.length === 0) return;
    
    // 获取第一个实例的形状作为模板
    const templateShape = instances[0].shape;
    
    // 对于每个实例，渲染形状
    instances.forEach(instance => {
      for (let i = 0; i < instance.instanceCount; i++) {
        // 在实际应用中，这里会使用WebGL实例化渲染
        // 简化实现：直接渲染每个实例
        templateShape.render(this.context);
      }
    });
  }
  
  /**
   * 合并几何体
   */
  mergeGeometry(shapes: IShape[]): MergedGeometry {
    const shapeType = shapes.length > 0 ? this.getShapeType(shapes[0]) : 'unknown';
    const cacheKey = this.getGeometryCacheKey(shapes);
    
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
    
    shapes.forEach(shape => {
      const shapeGeometry = this.getShapeGeometry(shape);
      if (shapeGeometry) {
        // 添加顶点
        vertices.push(...shapeGeometry.vertices);
        
        // 调整索引偏移
        const adjustedIndices = shapeGeometry.indices.map(index => index + vertexOffset);
        indices.push(...adjustedIndices);
        
        // 添加纹理坐标
        textureCoords.push(...shapeGeometry.textureCoords);
        
        // 更新顶点偏移
        vertexOffset += shapeGeometry.vertices.length / 2; // 假设每个顶点2个坐标
      }
    });
    
    const mergedGeometry: MergedGeometry = {
      vertices: new Float32Array(vertices),
      indices: new Uint16Array(indices),
      textureCoords: new Float32Array(textureCoords),
      shapeType
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
   * 获取形状类型
   */
  private getShapeType(shape: IShape): string {
    return shape.constructor.name;
  }
  
  /**
   * 检查两个形状是否相等
   */
  private shapesAreEqual(shape1: IShape, shape2: IShape): boolean {
    // 简化实现：比较一些基本属性
    const bounds1 = shape1.getBounds();
    const bounds2 = shape2.getBounds();
    
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
  private getInstanceData(shape: IShape, count: number): any[] {
    // 简化实现：返回位置偏移数据
    const bounds = shape.getBounds();
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
  private getGeometryCacheKey(shapes: IShape[]): string {
    return shapes.map(shape => shape.id).join(',');
  }
  
  /**
   * 获取形状几何体数据
   */
  private getShapeGeometry(shape: IShape): { 
    vertices: number[]; 
    indices: number[]; 
    textureCoords: number[] 
  } | null {
    // 简化实现：返回基本的几何体数据
    const bounds = shape.getBounds();
    
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
   * 清空实例化形状
   */
  clearInstancedShapes(): void {
    this.instancedShapes.clear();
  }
  
  /**
   * 清空合并的几何体
   */
  clearMergedGeometries(): void {
    this.mergedGeometries.clear();
  }
}
```

### 3.2 在渲染引擎中使用批处理

**文件**: `packages/render-engine/src/core/RenderEngine.ts`

```typescript
// 添加导入
import { AdvancedBatcher } from '../batching/AdvancedBatcher';

// 在类中添加属性
export class RenderEngine {
  private advancedBatcher: AdvancedBatcher = new AdvancedBatcher();
  
  // 修改render方法以使用批处理
  render(): void {
    if (!this.context || !this.scene) return;
    
    const context = this.context;
    const shapes = this.scene.getShapes();
    
    context.clear();
    
    // 分类形状以便批处理
    const shapeGroups = this.groupShapesByType(shapes);
    
    // 对每组同类型形状进行批处理渲染
    for (const [shapeType, groupShapes] of shapeGroups.entries()) {
      if (groupShapes.length > 10) { // 超过10个形状时使用批处理
        // 使用实例化渲染
        groupShapes.forEach(shape => {
          this.advancedBatcher.addInstancedShape(shape);
        });
        this.advancedBatcher.renderInstancedBatch(shapeType);
      } else {
        // 正常渲染
        groupShapes.forEach(shape => {
          if (shape.visible) {
            shape.render(context);
          }
        });
      }
    }
  }
  
  /**
   * 按类型分组形状
   */
  private groupShapesByType(shapes: IShape[]): Map<string, IShape[]> {
    const groups = new Map<string, IShape[]>();
    
    shapes.forEach(shape => {
      const type = shape.constructor.name;
      const group = groups.get(type) || [];
      group.push(shape);
      groups.set(type, group);
    });
    
    return groups;
  }
}
```

## 4. 测试验证

### 4.1 脏矩形检测测试

**文件**: `packages/render-engine/src/core/__tests__/DirtyRegionManager.test.ts`

```typescript
import { DirtyRegionManager, ShapeSnapshot } from '../DirtyRegionManager';
import { Rectangle } from '../../math/Rectangle';

describe('DirtyRegionManager', () => {
  let dirtyRegionManager: DirtyRegionManager;

  beforeEach(() => {
    dirtyRegionManager = new DirtyRegionManager();
  });

  test('should mark region as dirty', () => {
    const region: Rectangle = { x: 0, y: 0, width: 100, height: 100 };
    dirtyRegionManager.markRegionDirty(region);
    
    const dirtyRegions = dirtyRegionManager.getDirtyRegions();
    expect(dirtyRegions).toHaveLength(1);
    expect(dirtyRegions[0]).toEqual(region);
  });

  test('should optimize dirty regions by merging adjacent ones', () => {
    // 添加相邻的区域
    dirtyRegionManager.markRegionDirty({ x: 0, y: 0, width: 50, height: 50 });
    dirtyRegionManager.markRegionDirty({ x: 50, y: 0, width: 50, height: 50 });
    
    const optimized = dirtyRegionManager.optimizeDirtyRegions();
    expect(optimized).toHaveLength(1);
    expect(optimized[0]).toEqual({ x: 0, y: 0, width: 100, height: 50 });
  });

  test('should detect shape changes', () => {
    // 模拟形状对象
    const mockShape: any = {
      id: 'test-shape',
      getBounds: () => ({ x: 0, y: 0, width: 100, height: 100 }),
      visible: true,
      zIndex: 1
    };
    
    // 第一次检查应该返回true（新形状）
    expect(dirtyRegionManager.shouldRedrawShape(mockShape)).toBe(true);
    
    // 更新当前帧形状
    dirtyRegionManager.updateCurrentFrameShape(mockShape);
    dirtyRegionManager.prepareNextFrame();
    
    // 第二次检查应该返回false（无变化）
    expect(dirtyRegionManager.shouldRedrawShape(mockShape)).toBe(false);
    
    // 修改形状属性后应该返回true
    mockShape.getBounds = () => ({ x: 10, y: 10, width: 100, height: 100 });
    expect(dirtyRegionManager.shouldRedrawShape(mockShape)).toBe(true);
  });
});
```

### 4.2 图层缓存测试

**文件**: `packages/render-engine/src/core/__tests__/LayerCache.test.ts`

```typescript
import { LayerCache } from '../LayerCache';

describe('LayerCache', () => {
  let layerCache: LayerCache;

  beforeEach(() => {
    layerCache = new LayerCache();
  });

  test('should cache layer and return cached canvas', () => {
    // 模拟形状对象
    const mockShapes: any[] = [
      {
        id: 'shape-1',
        visible: true,
        getBounds: () => ({ x: 0, y: 0, width: 50, height: 50 }),
        render: jest.fn()
      }
    ];
    
    const canvas = layerCache.cacheLayer('test-layer', mockShapes);
    expect(canvas).toBeInstanceOf(HTMLCanvasElement);
    expect(canvas.width).toBe(50);
    expect(canvas.height).toBe(50);
  });

  test('should invalidate cache', () => {
    const mockShapes: any[] = [
      {
        id: 'shape-1',
        visible: true,
        getBounds: () => ({ x: 0, y: 0, width: 50, height: 50 }),
        render: jest.fn()
      }
    ];
    
    // 缓存图层
    layerCache.cacheLayer('test-layer', mockShapes);
    expect(layerCache.getCacheMemoryUsage()).toBeGreaterThan(0);
    
    // 使缓存失效
    layerCache.invalidateCache('test-layer');
    expect(layerCache.getCacheMemoryUsage()).toBe(0);
  });

  test('should cleanup expired cache', () => {
    // 修改缓存策略为短时间过期
    (layerCache as any).cachePolicy.ttl = 10;
    
    const mockShapes: any[] = [
      {
        id: 'shape-1',
        visible: true,
        getBounds: () => ({ x: 0, y: 0, width: 50, height: 50 }),
        render: jest.fn()
      }
    ];
    
    layerCache.cacheLayer('test-layer', mockShapes);
    expect(layerCache.getCacheMemoryUsage()).toBeGreaterThan(0);
    
    // 等待过期
    setTimeout(() => {
      (layerCache as any).cleanupExpiredCache();
      expect(layerCache.getCacheMemoryUsage()).toBe(0);
    }, 20);
  });
});
```

## 实施计划

### 第一周任务

1. **创建基础文件结构**
   - 创建`DirtyRegionManager.ts`
   - 创建`LayerCache.ts`
   - 创建`AdvancedBatcher.ts`

2. **实现脏矩形检测系统**
   - 完成脏区域管理器基础功能
   - 实现矩形合并算法
   - 集成到渲染引擎

3. **实现图层缓存系统**
   - 完成缓存管理基础功能
   - 实现内存管理策略
   - 集成到渲染引擎

### 第二周任务

1. **完善批处理系统**
   - 实现实例化渲染
   - 实现几何体合并
   - 集成到渲染引擎

2. **性能优化**
   - 优化脏区域计算算法
   - 优化缓存策略
   - 优化批处理逻辑

3. **集成测试**
   - 测试各组件集成
   - 验证性能提升效果
   - 修复发现的问题

### 测试和验证

1. **单元测试**
   - 为新增类编写测试用例
   - 确保覆盖率 > 85%

2. **性能测试**
   - 渲染性能基准测试
   - 内存使用量监控
   - 缓存命中率测试

3. **集成测试**
   - 复杂场景渲染测试
   - 长时间运行稳定性测试
   - 多浏览器兼容性测试

## 验收标准

### 脏矩形检测
- [ ] 只重绘变化区域功能正常
- [ ] 相邻脏区域自动合并
- [ ] 性能提升 > 50%（大场景）
- [ ] 内存使用合理

### 图层缓存
- [ ] 静态图层缓存功能正常
- [ ] 缓存失效策略完善
- [ ] 内存使用量监控准确
- [ ] 缓存命中率 > 80%

### 批量渲染
- [ ] 同类型形状批量渲染
- [ ] Draw Call数量减少 > 70%
- [ ] 帧率提升 > 2x（复杂场景）
- [ ] WebGL实例化渲染支持

这个第二阶段实施指南详细说明了如何实现性能优化功能。按照这个指南逐步实施，可以显著提升Sky Canvas的渲染性能。