/**
 * 虚拟化管理器 - 基于VSCode的虚拟化渲染机制
 * 提供视锥裁剪、LOD管理和批量渲染优化
 */

import { IDisposable } from '../events/EventBus';
import { Rectangle } from '../math/Rectangle';
import { Vector2 } from '../math/Vector2';

export interface IViewport {
  readonly bounds: Rectangle;
  readonly zoom: number;
  readonly center: Vector2;
  worldToScreen(point: Vector2): Vector2;
  screenToWorld(point: Vector2): Vector2;
  getViewBounds(): Rectangle;
}

export interface ISceneObject {
  readonly id: string;
  readonly type: string;
  getBounds(): Rectangle;
  getDistance(viewpoint: Vector2): number;
  getLODLevels(): ILODLevel[];
  isVisible(): boolean;
  setVisible(visible: boolean): void;
}

export interface ILODLevel {
  readonly level: number;
  readonly maxDistance: number;
  readonly geometry: unknown;
  readonly material: unknown;
}

export interface IRenderableObject {
  readonly id: string;
  readonly bounds: Rectangle;
  readonly lodLevel: number;
  readonly priority: number;
  render(context: CanvasRenderingContext2D | WebGLRenderingContext): void;
  getBounds(): Rectangle;
}

export interface IRenderItem {
  readonly object: ISceneObject;
  readonly lodLevel: ILODLevel;
  readonly distance: number;
  readonly priority: number;
}

export interface ICullingService {
  isVisible(objectBounds: Rectangle, viewBounds: Rectangle): boolean;
  performFrustumCulling(objects: ISceneObject[], viewport: IViewport): ISceneObject[];
  performOcclusionCulling(objects: ISceneObject[], viewport: IViewport): ISceneObject[];
}

export interface IBatchRenderer {
  addItem(item: IRenderItem): void;
  flush(): void;
  clear(): void;
  getBatchCount(): number;
}

/**
 * 裁剪服务实现
 */
class CullingService implements ICullingService {
  isVisible(objectBounds: Rectangle, viewBounds: Rectangle): boolean {
    return objectBounds.intersects(viewBounds);
  }

  performFrustumCulling(objects: ISceneObject[], viewport: IViewport): ISceneObject[] {
    const viewBounds = viewport.getViewBounds();
    return objects.filter(obj => {
      if (!obj.isVisible()) return false;
      return this.isVisible(obj.getBounds(), viewBounds);
    });
  }

  performOcclusionCulling(objects: ISceneObject[], viewport: IViewport): ISceneObject[] {
    // 简化的遮挡裁剪实现
    // 在实际应用中，这里会使用更复杂的遮挡查询算法
    const sortedObjects = objects.sort((a, b) => {
      const distA = a.getDistance(viewport.center);
      const distB = b.getDistance(viewport.center);
      return distA - distB;
    });

    const visibleObjects: ISceneObject[] = [];
    const occludedBounds: Rectangle[] = [];

    for (const obj of sortedObjects) {
      const objBounds = obj.getBounds();
      let isOccluded = false;

      // 检查是否被之前的对象遮挡
      for (const occluder of occludedBounds) {
        if (occluder.contains(objBounds.x, objBounds.y) && 
            occluder.contains(objBounds.x + objBounds.width, objBounds.y + objBounds.height)) {
          isOccluded = true;
          break;
        }
      }

      if (!isOccluded) {
        visibleObjects.push(obj);
        occludedBounds.push(objBounds);
      }
    }

    return visibleObjects;
  }
}

/**
 * LOD管理器
 */
class LODManager {
  selectLOD(object: ISceneObject, distance: number): ILODLevel {
    const lodLevels = object.getLODLevels();
    
    if (lodLevels.length === 0) {
      throw new Error(`Object ${object.id} has no LOD levels`);
    }

    // 选择合适的LOD级别
    for (const level of lodLevels) {
      if (distance <= level.maxDistance) {
        return level;
      }
    }

    // 返回最低质量的LOD
    return lodLevels[lodLevels.length - 1];
  }

  calculateDistance(object: ISceneObject, viewpoint: Vector2): number {
    return object.getDistance(viewpoint);
  }

  updateLODLevels(objects: ISceneObject[], viewport: IViewport): Map<string, ILODLevel> {
    const lodMap = new Map<string, ILODLevel>();
    
    for (const object of objects) {
      const distance = this.calculateDistance(object, viewport.center);
      const lodLevel = this.selectLOD(object, distance);
      lodMap.set(object.id, lodLevel);
    }

    return lodMap;
  }
}

/**
 * 批量渲染器
 */
class BatchRenderer implements IBatchRenderer {
  private _batches = new Map<string, IRenderItem[]>();
  private _maxBatchSize = 1000;

  addItem(item: IRenderItem): void {
    const batchKey = this._getBatchKey(item);
    
    if (!this._batches.has(batchKey)) {
      this._batches.set(batchKey, []);
    }

    const batch = this._batches.get(batchKey)!;
    batch.push(item);

    // 如果批次达到最大大小，自动刷新
    if (batch.length >= this._maxBatchSize) {
      this._flushBatch(batchKey, batch);
    }
  }

  flush(): void {
    for (const [batchKey, batch] of this._batches.entries()) {
      if (batch.length > 0) {
        this._flushBatch(batchKey, batch);
      }
    }
    this.clear();
  }

  clear(): void {
    this._batches.clear();
  }

  getBatchCount(): number {
    return this._batches.size;
  }

  private _getBatchKey(item: IRenderItem): string {
    // 根据材质、纹理等属性生成批次键
    return `${item.object.type}_${item.lodLevel.level}`;
  }

  private _flushBatch(batchKey: string, batch: IRenderItem[]): void {
    // 实际的批量渲染逻辑
    console.log(`Rendering batch ${batchKey} with ${batch.length} items`);
    batch.length = 0;
  }
}

/**
 * 性能分析器
 */
class PerformanceProfiler {
  private _metrics = new Map<string, number[]>();
  private _frameCount = 0;
  private _startTime = 0;

  startFrame(): void {
    this._startTime = performance.now();
    this._frameCount++;
  }

  endFrame(): void {
    const frameTime = performance.now() - this._startTime;
    this._recordMetric('frameTime', frameTime);
  }

  startTimer(name: string): void {
    this._recordMetric(`${name}_start`, performance.now());
  }

  endTimer(name: string): void {
    const startTime = this._getLastMetric(`${name}_start`);
    if (startTime !== undefined) {
      const duration = performance.now() - startTime;
      this._recordMetric(name, duration);
    }
  }

  getAverageMetric(name: string): number {
    const values = this._metrics.get(name);
    if (!values || values.length === 0) return 0;
    
    return values.reduce((a, b) => a + b, 0) / values.length;
  }

  getMetrics(): Record<string, number> {
    const result: Record<string, number> = {};
    for (const [name, values] of this._metrics.entries()) {
      if (!name.endsWith('_start')) {
        result[name] = this.getAverageMetric(name);
      }
    }
    return result;
  }

  private _recordMetric(name: string, value: number): void {
    if (!this._metrics.has(name)) {
      this._metrics.set(name, []);
    }
    
    const values = this._metrics.get(name)!;
    values.push(value);
    
    // 保持最近100个样本
    if (values.length > 100) {
      values.shift();
    }
  }

  private _getLastMetric(name: string): number | undefined {
    const values = this._metrics.get(name);
    return values && values.length > 0 ? values[values.length - 1] : undefined;
  }

  clear(): void {
    this._metrics.clear();
    this._frameCount = 0;
  }
}

/**
 * 虚拟化管理器主类
 */
export class VirtualizationManager implements IDisposable {
  private _cullingService: ICullingService;
  private _lodManager: LODManager;
  private _batchRenderer: IBatchRenderer;
  private _profiler: PerformanceProfiler;
  private _disposed = false;

  constructor() {
    this._cullingService = new CullingService();
    this._lodManager = new LODManager();
    this._batchRenderer = new BatchRenderer();
    this._profiler = new PerformanceProfiler();
  }

  processFrame(objects: ISceneObject[], viewport: IViewport): IRenderItem[] {
    if (this._disposed) {
      throw new Error('VirtualizationManager is disposed');
    }

    this._profiler.startFrame();

    try {
      // 1. 视锥裁剪
      this._profiler.startTimer('frustumCulling');
      const visibleObjects = this._cullingService.performFrustumCulling(objects, viewport);
      this._profiler.endTimer('frustumCulling');

      // 2. 遮挡裁剪
      this._profiler.startTimer('occlusionCulling');
      const unoccludedObjects = this._cullingService.performOcclusionCulling(visibleObjects, viewport);
      this._profiler.endTimer('occlusionCulling');

      // 3. LOD选择
      this._profiler.startTimer('lodSelection');
      const lodMap = this._lodManager.updateLODLevels(unoccludedObjects, viewport);
      this._profiler.endTimer('lodSelection');

      // 4. 生成渲染项
      this._profiler.startTimer('renderItemGeneration');
      const renderItems: IRenderItem[] = [];
      
      for (const object of unoccludedObjects) {
        const lodLevel = lodMap.get(object.id);
        if (lodLevel) {
          const distance = this._lodManager.calculateDistance(object, viewport.center);
          const priority = this._calculatePriority(object, distance, viewport.zoom);
          
          renderItems.push({
            object,
            lodLevel,
            distance,
            priority
          });
        }
      }

      // 按优先级排序
      renderItems.sort((a, b) => b.priority - a.priority);
      this._profiler.endTimer('renderItemGeneration');

      // 5. 批量渲染
      this._profiler.startTimer('batching');
      for (const item of renderItems) {
        this._batchRenderer.addItem(item);
      }
      this._batchRenderer.flush();
      this._profiler.endTimer('batching');

      return renderItems;

    } finally {
      this._profiler.endFrame();
    }
  }

  private _calculatePriority(object: ISceneObject, distance: number, zoom: number): number {
    // 基于距离、缩放级别和对象类型计算优先级
    const distanceFactor = 1 / (distance + 1);
    const zoomFactor = zoom;
    const typeFactor = this._getTypePriority(object.type);
    
    return distanceFactor * zoomFactor * typeFactor;
  }

  private _getTypePriority(type: string): number {
    // 不同类型的对象有不同的渲染优先级
    const priorities: Record<string, number> = {
      'text': 1.0,
      'shape': 0.8,
      'image': 0.6,
      'background': 0.2
    };
    
    return priorities[type] || 0.5;
  }

  getCullingService(): ICullingService {
    return this._cullingService;
  }

  getLODManager(): LODManager {
    return this._lodManager;
  }

  getBatchRenderer(): IBatchRenderer {
    return this._batchRenderer;
  }

  getPerformanceMetrics(): Record<string, number> {
    return this._profiler.getMetrics();
  }

  clearPerformanceMetrics(): void {
    this._profiler.clear();
  }

  dispose(): void {
    if (this._disposed) {
      return;
    }

    this._disposed = true;
    this._batchRenderer.clear();
    this._profiler.clear();
  }
}
