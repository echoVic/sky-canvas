/**
 * 场景管理器 - 协调图层、渲染、视口等复杂场景功能
 * 纯业务协调单元，不直接依赖 DI 容器
 */

import { IRenderable } from '@sky-canvas/render-engine';
import type { ILogService } from '../services';
import { ICanvasRenderingService, IConfigurationService, IEventBusService } from '../services';
import { ICanvasManager } from './CanvasManager';

/**
 * 图层信息
 */
export interface ILayerInfo {
  id: string;
  name: string;
  visible: boolean;
  locked: boolean;
  opacity: number;
  zIndex: number;
  shapes: string[]; // 形状ID列表
}

/**
 * 场景管理器状态
 */
export interface ISceneManagerState {
  layers: ILayerInfo[];
  activeLayerId: string | null;
  backgroundColor: string;
  gridEnabled: boolean;
  gridSize: number;
  guidesEnabled: boolean;
}

/**
 * 场景管理器接口
 */
export interface ISceneManager {
  // 图层管理
  createLayer(name: string): ILayerInfo;
  removeLayer(layerId: string): boolean;
  setActiveLayer(layerId: string): boolean;
  getActiveLayer(): ILayerInfo | null;
  getAllLayers(): ILayerInfo[];
  updateLayer(layerId: string, updates: Partial<ILayerInfo>): boolean;
  
  // 形状到图层的映射
  addShapeToLayer(shapeId: string, layerId?: string): boolean;
  removeShapeFromLayer(shapeId: string): boolean;
  moveShapeToLayer(shapeId: string, targetLayerId: string): boolean;
  getShapeLayer(shapeId: string): ILayerInfo | null;
  
  // 场景设置
  setBackgroundColor(color: string): void;
  toggleGrid(): void;
  setGridSize(size: number): void;
  toggleGuides(): void;
  
  // 渲染控制
  render(): void;
  refreshScene(): void;
  
  // 状态查询
  getSceneState(): ISceneManagerState;
  clear(): void;
  dispose(): void;
}

/**
 * 场景管理器实现
 */
export class SceneManager implements ISceneManager {
  private state: ISceneManagerState;
  private nextLayerId = 1;

  constructor(
    private canvasManager: ICanvasManager,
    private renderingService: ICanvasRenderingService,
    private eventBus: IEventBusService,
    private logService: ILogService,
    private configService: IConfigurationService
  ) {
    // 初始化场景状态
    this.state = {
      layers: [],
      activeLayerId: null,
      backgroundColor: this.configService.get('scene.backgroundColor') || '#ffffff',
      gridEnabled: this.configService.get('scene.gridEnabled') || false,
      gridSize: this.configService.get('scene.gridSize') || 20,
      guidesEnabled: this.configService.get('scene.guidesEnabled') || false
    };

    // 创建默认图层
    this.createDefaultLayer();
    this.setupEventListeners();
    this.logService.info('SceneManager initialized');
  }

  // === 图层管理 ===

  createLayer(name: string): ILayerInfo {
    const layer: ILayerInfo = {
      id: `layer_${this.nextLayerId++}`,
      name: name || `图层 ${this.nextLayerId - 1}`,
      visible: true,
      locked: false,
      opacity: 1,
      zIndex: this.state.layers.length,
      shapes: []
    };

    this.state.layers.push(layer);
    
    // 如果没有活动图层，设为活动图层
    if (!this.state.activeLayerId) {
      this.state.activeLayerId = layer.id;
    }

    this.eventBus.emit('scene:layerCreated', { layer });
    this.logService.debug(`Layer created: ${layer.name} (${layer.id})`);
    
    return layer;
  }

  removeLayer(layerId: string): boolean {
    if (this.state.layers.length <= 1) {
      this.logService.warn('Cannot remove last layer');
      return false;
    }

    const layerIndex = this.state.layers.findIndex(l => l.id === layerId);
    if (layerIndex === -1) return false;

    const layer = this.state.layers[layerIndex];
    
    // 将图层中的形状移动到其他图层
    if (layer.shapes.length > 0) {
      const targetLayer = this.state.layers.find(l => l.id !== layerId);
      if (targetLayer) {
        targetLayer.shapes.push(...layer.shapes);
      }
    }

    // 移除图层
    this.state.layers.splice(layerIndex, 1);
    
    // 如果删除的是活动图层，选择新的活动图层
    if (this.state.activeLayerId === layerId) {
      this.state.activeLayerId = this.state.layers.length > 0 ? this.state.layers[0].id : null;
    }

    this.eventBus.emit('scene:layerRemoved', { layerId, layer });
    this.logService.debug(`Layer removed: ${layer.name} (${layerId})`);
    
    return true;
  }

  setActiveLayer(layerId: string): boolean {
    const layer = this.state.layers.find(l => l.id === layerId);
    if (!layer) return false;

    const previousLayerId = this.state.activeLayerId;
    this.state.activeLayerId = layerId;

    this.eventBus.emit('scene:activeLayerChanged', { 
      previousLayerId, 
      currentLayerId: layerId, 
      layer 
    });
    this.logService.debug(`Active layer changed to: ${layer.name} (${layerId})`);
    
    return true;
  }

  getActiveLayer(): ILayerInfo | null {
    if (!this.state.activeLayerId) return null;
    return this.state.layers.find(l => l.id === this.state.activeLayerId) || null;
  }

  getAllLayers(): ILayerInfo[] {
    return [...this.state.layers].sort((a, b) => b.zIndex - a.zIndex);
  }

  updateLayer(layerId: string, updates: Partial<ILayerInfo>): boolean {
    const layer = this.state.layers.find(l => l.id === layerId);
    if (!layer) return false;

    const oldValues = { ...layer };
    Object.assign(layer, updates);

    this.eventBus.emit('scene:layerUpdated', { layerId, updates, oldValues });
    this.logService.debug(`Layer updated: ${layer.name} (${layerId})`);
    
    return true;
  }

  // === 形状到图层的映射 ===

  addShapeToLayer(shapeId: string, layerId?: string): boolean {
    const targetLayerId = layerId || this.state.activeLayerId;
    if (!targetLayerId) return false;

    const layer = this.state.layers.find(l => l.id === targetLayerId);
    if (!layer) return false;

    // 从其他图层移除该形状
    this.removeShapeFromLayer(shapeId);
    
    // 添加到目标图层
    if (!layer.shapes.includes(shapeId)) {
      layer.shapes.push(shapeId);
      this.logService.debug(`Shape ${shapeId} added to layer ${layer.name}`);
    }

    return true;
  }

  removeShapeFromLayer(shapeId: string): boolean {
    let removed = false;
    for (const layer of this.state.layers) {
      const index = layer.shapes.indexOf(shapeId);
      if (index !== -1) {
        layer.shapes.splice(index, 1);
        removed = true;
        this.logService.debug(`Shape ${shapeId} removed from layer ${layer.name}`);
      }
    }
    return removed;
  }

  moveShapeToLayer(shapeId: string, targetLayerId: string): boolean {
    const targetLayer = this.state.layers.find(l => l.id === targetLayerId);
    if (!targetLayer) return false;

    this.removeShapeFromLayer(shapeId);
    targetLayer.shapes.push(shapeId);
    
    this.eventBus.emit('scene:shapeMoved', { shapeId, targetLayerId });
    this.logService.debug(`Shape ${shapeId} moved to layer ${targetLayer.name}`);
    
    return true;
  }

  getShapeLayer(shapeId: string): ILayerInfo | null {
    for (const layer of this.state.layers) {
      if (layer.shapes.includes(shapeId)) {
        return layer;
      }
    }
    return null;
  }

  // === 场景设置 ===

  setBackgroundColor(color: string): void {
    this.state.backgroundColor = color;
    this.configService.set('scene.backgroundColor', color);
    this.eventBus.emit('scene:backgroundChanged', { color });
  }

  toggleGrid(): void {
    this.state.gridEnabled = !this.state.gridEnabled;
    this.configService.set('scene.gridEnabled', this.state.gridEnabled);
    this.eventBus.emit('scene:gridToggled', { enabled: this.state.gridEnabled });
  }

  setGridSize(size: number): void {
    this.state.gridSize = Math.max(1, size);
    this.configService.set('scene.gridSize', this.state.gridSize);
    this.eventBus.emit('scene:gridSizeChanged', { size: this.state.gridSize });
  }

  toggleGuides(): void {
    this.state.guidesEnabled = !this.state.guidesEnabled;
    this.configService.set('scene.guidesEnabled', this.state.guidesEnabled);
    this.eventBus.emit('scene:guidesToggled', { enabled: this.state.guidesEnabled });
  }

  // === 渲染控制 ===

  render(): void {
    const renderables = this.getRenderablesInLayerOrder();
    // 假设渲染服务有批量渲染方法
    renderables.forEach(renderable => {
      this.renderingService.addRenderable(renderable);
    });
    this.eventBus.emit('scene:rendered', { renderableCount: renderables.length });
  }

  refreshScene(): void {
    this.render();
    this.eventBus.emit('scene:refreshed', {});
  }

  // === 私有方法 ===

  private createDefaultLayer(): void {
    const defaultLayer = this.createLayer('默认图层');
    this.state.activeLayerId = defaultLayer.id;
  }

  private setupEventListeners(): void {
    // 监听形状变化，自动添加到活动图层
    this.eventBus.on('canvas:shapeAdded', (data: any) => {
      this.addShapeToLayer(data.entity.id);
    });

    // 监听形状删除，从图层中移除
    this.eventBus.on('canvas:shapeRemoved', (data: any) => {
      this.removeShapeFromLayer(data.id);
    });
  }

  private getRenderablesInLayerOrder(): IRenderable[] {
    const allRenderables = this.canvasManager.getRenderables();
    const renderableMap = new Map<string, IRenderable>();
    
    // 创建 ID 到 Renderable 的映射
    allRenderables.forEach(renderable => {
      renderableMap.set((renderable as any).id, renderable);
    });

    // 按图层顺序排列
    const orderedRenderables: IRenderable[] = [];
    const sortedLayers = this.getAllLayers(); // 已按 zIndex 排序
    
    for (const layer of sortedLayers) {
      if (!layer.visible) continue;
      
      for (const shapeId of layer.shapes) {
        const renderable = renderableMap.get(shapeId);
        if (renderable) {
          orderedRenderables.push(renderable);
        }
      }
    }

    return orderedRenderables;
  }

  // === 状态查询 ===

  getSceneState(): ISceneManagerState {
    return { ...this.state };
  }

  clear(): void {
    // 清除所有图层（除了默认图层）
    this.state.layers = [];
    this.nextLayerId = 1;
    this.createDefaultLayer();
    
    this.eventBus.emit('scene:cleared', {});
    this.logService.info('Scene cleared');
  }

  dispose(): void {
    this.logService.info('SceneManager disposed');
  }
}