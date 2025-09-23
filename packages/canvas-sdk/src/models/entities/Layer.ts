/**
 * 图层实体模型
 * MVVM架构中的Model层 - 图层数据实体
 */

// import { Shape } from './Shape'; // 暂时不需要导入

/**
 * 图层类型
 */
export type LayerType = 'normal' | 'background' | 'overlay' | 'guide';

/**
 * 混合模式
 */
export type BlendMode = 'normal' | 'multiply' | 'screen' | 'overlay' | 'darken' | 'lighten';

/**
 * 图层实体
 */
export interface ILayerEntity {
  id: string;
  name: string;
  type: LayerType;
  visible: boolean;
  locked: boolean;
  opacity: number;
  zIndex: number;
  blendMode: BlendMode;
  shapes: string[]; // 形状ID列表
  parentId?: string; // 父图层ID（用于图层组）
  childrenIds: string[]; // 子图层ID列表
  isGroup: boolean;
  expanded: boolean; // 在图层面板中是否展开
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * 图层工厂类
 */
export class LayerEntityFactory {
  private static generateId(): string {
    return `layer_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
  }

  /**
   * 创建普通图层
   */
  static createLayer(
    name: string = '图层',
    type: LayerType = 'normal'
  ): ILayerEntity {
    return {
      id: this.generateId(),
      name,
      type,
      visible: true,
      locked: false,
      opacity: 1.0,
      zIndex: 0,
      blendMode: 'normal',
      shapes: [],
      childrenIds: [],
      isGroup: false,
      expanded: true,
      createdAt: new Date(),
      updatedAt: new Date()
    };
  }

  /**
   * 创建图层组
   */
  static createLayerGroup(name: string = '图层组'): ILayerEntity {
    return {
      ...this.createLayer(name),
      isGroup: true,
      expanded: true
    };
  }

  /**
   * 创建背景图层
   */
  static createBackgroundLayer(): ILayerEntity {
    return {
      ...this.createLayer('背景', 'background'),
      locked: true,
      zIndex: -1000
    };
  }

  /**
   * 创建引导图层
   */
  static createGuideLayer(): ILayerEntity {
    return {
      ...this.createLayer('引导线', 'guide'),
      opacity: 0.5,
      zIndex: 1000
    };
  }
}

/**
 * 图层管理器
 */
export class LayerManager {
  private layers = new Map<string, ILayerEntity>();
  private layerOrder: string[] = []; // 图层渲染顺序

  /**
   * 添加图层
   */
  addLayer(layer: ILayerEntity, index?: number): void {
    this.layers.set(layer.id, layer);
    
    if (index !== undefined && index >= 0 && index <= this.layerOrder.length) {
      this.layerOrder.splice(index, 0, layer.id);
    } else {
      this.layerOrder.push(layer.id);
    }
    
    this.updateZIndices();
  }

  /**
   * 移除图层
   */
  removeLayer(layerId: string): boolean {
    const layer = this.layers.get(layerId);
    if (!layer) return false;

    // 移除子图层
    if (layer.isGroup) {
      layer.childrenIds.forEach(childId => {
        this.removeLayer(childId);
      });
    }

    // 从父图层中移除
    if (layer.parentId) {
      const parent = this.layers.get(layer.parentId);
      if (parent) {
        parent.childrenIds = parent.childrenIds.filter(id => id !== layerId);
        parent.updatedAt = new Date();
      }
    }

    this.layers.delete(layerId);
    this.layerOrder = this.layerOrder.filter(id => id !== layerId);
    this.updateZIndices();
    
    return true;
  }

  /**
   * 获取图层
   */
  getLayer(layerId: string): ILayerEntity | undefined {
    return this.layers.get(layerId);
  }

  /**
   * 获取所有图层
   */
  getAllLayers(): ILayerEntity[] {
    return Array.from(this.layers.values());
  }

  /**
   * 按渲染顺序获取图层
   */
  getLayersByRenderOrder(): ILayerEntity[] {
    return this.layerOrder
      .map(id => this.layers.get(id))
      .filter((layer): layer is ILayerEntity => layer !== undefined)
      .sort((a, b) => a.zIndex - b.zIndex);
  }

  /**
   * 移动图层
   */
  moveLayer(layerId: string, newIndex: number): boolean {
    const currentIndex = this.layerOrder.indexOf(layerId);
    if (currentIndex === -1) return false;

    this.layerOrder.splice(currentIndex, 1);
    this.layerOrder.splice(newIndex, 0, layerId);
    this.updateZIndices();
    
    return true;
  }

  /**
   * 将图层移动到组中
   */
  moveLayerToGroup(layerId: string, groupId: string): boolean {
    const layer = this.layers.get(layerId);
    const group = this.layers.get(groupId);
    
    if (!layer || !group || !group.isGroup) return false;

    // 从原父图层中移除
    if (layer.parentId) {
      const oldParent = this.layers.get(layer.parentId);
      if (oldParent) {
        oldParent.childrenIds = oldParent.childrenIds.filter(id => id !== layerId);
      }
    }

    // 添加到新组中
    layer.parentId = groupId;
    group.childrenIds.push(layerId);
    
    layer.updatedAt = new Date();
    group.updatedAt = new Date();
    
    return true;
  }

  /**
   * 添加形状到图层
   */
  addShapeToLayer(layerId: string, shapeId: string): boolean {
    const layer = this.layers.get(layerId);
    if (!layer || layer.isGroup) return false;

    if (!layer.shapes.includes(shapeId)) {
      layer.shapes.push(shapeId);
      layer.updatedAt = new Date();
    }
    
    return true;
  }

  /**
   * 从图层移除形状
   */
  removeShapeFromLayer(layerId: string, shapeId: string): boolean {
    const layer = this.layers.get(layerId);
    if (!layer) return false;

    const index = layer.shapes.indexOf(shapeId);
    if (index >= 0) {
      layer.shapes.splice(index, 1);
      layer.updatedAt = new Date();
      return true;
    }
    
    return false;
  }

  /**
   * 获取图层中的形状
   */
  getShapesInLayer(layerId: string): string[] {
    const layer = this.layers.get(layerId);
    if (!layer) return [];
    
    if (layer.isGroup) {
      // 如果是组，返回所有子图层的形状
      const shapes: string[] = [];
      layer.childrenIds.forEach(childId => {
        shapes.push(...this.getShapesInLayer(childId));
      });
      return shapes;
    }
    
    return [...layer.shapes];
  }

  /**
   * 更新图层的 zIndex
   */
  private updateZIndices(): void {
    this.layerOrder.forEach((layerId, index) => {
      const layer = this.layers.get(layerId);
      if (layer) {
        layer.zIndex = index;
      }
    });
  }

  /**
   * 清空所有图层
   */
  clear(): void {
    this.layers.clear();
    this.layerOrder = [];
  }

  /**
   * 获取图层统计信息
   */
  getStats(): {
    totalLayers: number;
    visibleLayers: number;
    groups: number;
    totalShapes: number;
  } {
    const layers = Array.from(this.layers.values());
    return {
      totalLayers: layers.length,
      visibleLayers: layers.filter(l => l.visible).length,
      groups: layers.filter(l => l.isGroup).length,
      totalShapes: layers.reduce((sum, layer) => sum + layer.shapes.length, 0)
    };
  }
}