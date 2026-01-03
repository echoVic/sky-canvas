/**
 * 图层视图
 * 负责图层面板的显示和图层可视化
 */

import { ILayerEntity, LayerManager } from '../models/entities/Layer';
import { ShapeEntity } from '../models/entities/Shape';

export interface ILayerViewConfig {
  itemHeight?: number;
  indent?: number;
  iconSize?: number;
  backgroundColor?: string;
  selectedBackgroundColor?: string;
  textColor?: string;
  secondaryTextColor?: string;
  borderColor?: string;
}

export interface ILayerViewItem {
  layer: ILayerEntity;
  level: number; // 嵌套层级
  expanded: boolean;
  selected: boolean;
  shapeCount: number;
}

export class LayerView {
  private config: ILayerViewConfig = {};
  private container!: HTMLElement;
  private layerItems: ILayerViewItem[] = [];
  private selectedLayerId: string | null = null;

  constructor(config: ILayerViewConfig = {}) {
    this.config = {
      itemHeight: 32,
      indent: 20,
      iconSize: 16,
      backgroundColor: '#FFFFFF',
      selectedBackgroundColor: '#E3F2FD',
      textColor: '#333333',
      secondaryTextColor: '#666666',
      borderColor: '#E0E0E0',
      ...config
    };
  }

  /**
   * 初始化图层视图
   */
  initialize(container: HTMLElement): void {
    this.container = container;
    this.setupContainer();
  }

  /**
   * 渲染图层列表
   */
  render(layerManager: LayerManager, shapes: ShapeEntity[]): void {
    if (!this.container) return;

    // 构建图层项目树
    this.buildLayerItems(layerManager, shapes);
    
    // 清空容器
    this.container.innerHTML = '';
    
    // 渲染每个图层项目
    this.layerItems.forEach(item => {
      const element = this.createLayerItemElement(item);
      this.container.appendChild(element);
    });
  }

  /**
   * 构建图层项目树
   */
  private buildLayerItems(layerManager: LayerManager, shapes: ShapeEntity[]): void {
    const layers = layerManager.getLayersByRenderOrder();
    this.layerItems = [];

    // 构建树形结构
    const rootLayers = layers.filter(layer => !layer.parentId);
    
    for (const layer of rootLayers) {
      this.addLayerItem(layer, 0, layerManager, shapes);
    }
  }

  /**
   * 递归添加图层项目
   */
  private addLayerItem(layer: ILayerEntity, level: number, layerManager: LayerManager, shapes: ShapeEntity[]): void {
    const shapeCount = this.getShapeCountInLayer(layer, layerManager, shapes);
    
    const item: ILayerViewItem = {
      layer,
      level,
      expanded: layer.expanded,
      selected: layer.id === this.selectedLayerId,
      shapeCount
    };
    
    this.layerItems.push(item);

    // 如果图层组展开，递归添加子图层
    if (layer.isGroup && layer.expanded) {
      const childLayers = layerManager.getAllLayers()
        .filter(child => child.parentId === layer.id)
        .sort((a, b) => a.zIndex - b.zIndex);
      
      for (const child of childLayers) {
        this.addLayerItem(child, level + 1, layerManager, shapes);
      }
    }
  }

  /**
   * 获取图层中的形状数量
   */
  private getShapeCountInLayer(layer: ILayerEntity, layerManager: LayerManager, shapes: ShapeEntity[]): number {
    if (layer.isGroup) {
      // 递归计算组中的形状数量
      let count = 0;
      layer.childrenIds.forEach(childId => {
        const child = layerManager.getLayer(childId);
        if (child) {
          count += this.getShapeCountInLayer(child, layerManager, shapes);
        }
      });
      return count;
    } else {
      return layer.shapes.length;
    }
  }

  /**
   * 创建图层项目元素
   */
  private createLayerItemElement(item: ILayerViewItem): HTMLElement {
    const element = document.createElement('div');
    element.className = 'layer-item';
    element.style.cssText = `
      height: ${this.config.itemHeight}px;
      padding-left: ${item.level * this.config.indent!}px;
      display: flex;
      align-items: center;
      background-color: ${item.selected ? this.config.selectedBackgroundColor : this.config.backgroundColor};
      border-bottom: 1px solid ${this.config.borderColor};
      cursor: pointer;
      user-select: none;
    `;

    // 展开/折叠图标（仅组显示）
    if (item.layer.isGroup) {
      const expandIcon = this.createExpandIcon(item.expanded);
      element.appendChild(expandIcon);
    } else {
      // 占位符保持对齐
      const spacer = document.createElement('div');
      spacer.style.width = `${this.config.iconSize}px`;
      element.appendChild(spacer);
    }

    // 可见性图标
    const visibilityIcon = this.createVisibilityIcon(item.layer.visible);
    element.appendChild(visibilityIcon);

    // 锁定图标
    if (item.layer.locked) {
      const lockIcon = this.createLockIcon();
      element.appendChild(lockIcon);
    }

    // 图层类型图标
    const typeIcon = this.createTypeIcon(item.layer);
    element.appendChild(typeIcon);

    // 图层名称
    const nameElement = document.createElement('span');
    nameElement.textContent = item.layer.name;
    nameElement.style.cssText = `
      flex: 1;
      color: ${this.config.textColor};
      font-size: 14px;
      margin-left: 8px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    `;
    element.appendChild(nameElement);

    // 形状数量
    if (item.shapeCount > 0) {
      const countElement = document.createElement('span');
      countElement.textContent = item.shapeCount.toString();
      countElement.style.cssText = `
        color: ${this.config.secondaryTextColor};
        font-size: 12px;
        margin-right: 8px;
        background-color: rgba(0,0,0,0.1);
        border-radius: 10px;
        padding: 2px 6px;
      `;
      element.appendChild(countElement);
    }

    // 不透明度指示器
    if (item.layer.opacity < 1) {
      const opacityElement = document.createElement('span');
      opacityElement.textContent = `${Math.round(item.layer.opacity * 100)}%`;
      opacityElement.style.cssText = `
        color: ${this.config.secondaryTextColor};
        font-size: 11px;
        margin-right: 8px;
      `;
      element.appendChild(opacityElement);
    }

    // 添加事件监听器
    this.setupLayerItemEvents(element, item);

    return element;
  }

  /**
   * 创建展开/折叠图标
   */
  private createExpandIcon(expanded: boolean): HTMLElement {
    const icon = document.createElement('div');
    icon.className = 'expand-icon';
    icon.style.cssText = `
      width: ${this.config.iconSize}px;
      height: ${this.config.iconSize}px;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
    `;
    icon.innerHTML = expanded ? '▼' : '▶';
    return icon;
  }

  /**
   * 创建可见性图标
   */
  private createVisibilityIcon(visible: boolean): HTMLElement {
    const icon = document.createElement('div');
    icon.className = 'visibility-icon';
    icon.style.cssText = `
      width: ${this.config.iconSize}px;
      height: ${this.config.iconSize}px;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      margin-left: 4px;
    `;
    icon.innerHTML = visible ? '👁' : '🙈';
    icon.title = visible ? '隐藏图层' : '显示图层';
    return icon;
  }

  /**
   * 创建锁定图标
   */
  private createLockIcon(): HTMLElement {
    const icon = document.createElement('div');
    icon.className = 'lock-icon';
    icon.style.cssText = `
      width: ${this.config.iconSize}px;
      height: ${this.config.iconSize}px;
      display: flex;
      align-items: center;
      justify-content: center;
      margin-left: 4px;
    `;
    icon.innerHTML = '🔒';
    icon.title = '图层已锁定';
    return icon;
  }

  /**
   * 创建类型图标
   */
  private createTypeIcon(layer: ILayerEntity): HTMLElement {
    const icon = document.createElement('div');
    icon.className = 'type-icon';
    icon.style.cssText = `
      width: ${this.config.iconSize}px;
      height: ${this.config.iconSize}px;
      display: flex;
      align-items: center;
      justify-content: center;
      margin-left: 4px;
    `;
    
    switch (layer.type) {
      case 'normal':
        icon.innerHTML = layer.isGroup ? '📁' : '📄';
        break;
      case 'background':
        icon.innerHTML = '🖼';
        break;
      case 'overlay':
        icon.innerHTML = '🎭';
        break;
      case 'guide':
        icon.innerHTML = '📐';
        break;
    }
    
    return icon;
  }

  /**
   * 设置图层项目事件
   */
  private setupLayerItemEvents(element: HTMLElement, item: ILayerViewItem): void {
    // 点击选择图层
    element.addEventListener('click', (e) => {
      e.stopPropagation();
      this.selectLayer(item.layer.id);
      this.emit('layerSelected', item.layer);
    });

    // 展开/折叠处理
    const expandIcon = element.querySelector('.expand-icon');
    if (expandIcon) {
      expandIcon.addEventListener('click', (e) => {
        e.stopPropagation();
        this.toggleLayerExpansion(item.layer.id);
        this.emit('layerToggled', item.layer);
      });
    }

    // 可见性切换
    const visibilityIcon = element.querySelector('.visibility-icon');
    if (visibilityIcon) {
      visibilityIcon.addEventListener('click', (e) => {
        e.stopPropagation();
        this.toggleLayerVisibility(item.layer.id);
        this.emit('layerVisibilityChanged', item.layer);
      });
    }

    // 双击重命名
    element.addEventListener('dblclick', (e) => {
      e.stopPropagation();
      this.startLayerRename(item.layer.id);
    });

    // 右键菜单
    element.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      this.showContextMenu(item.layer, { x: e.clientX, y: e.clientY });
    });
  }

  /**
   * 设置容器样式
   */
  private setupContainer(): void {
    this.container.style.cssText = `
      background-color: ${this.config.backgroundColor};
      border: 1px solid ${this.config.borderColor};
      overflow-y: auto;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    `;
  }

  /**
   * 选择图层
   */
  selectLayer(layerId: string): void {
    this.selectedLayerId = layerId;
    // 重新渲染以更新选中状态
    // render() 方法会被外部调用
  }

  /**
   * 切换图层展开状态
   */
  private toggleLayerExpansion(layerId: string): void {
    // 这里应该调用 LayerManager 的方法
    this.emit('toggleExpansion', { layerId });
  }

  /**
   * 切换图层可见性
   */
  private toggleLayerVisibility(layerId: string): void {
    this.emit('toggleVisibility', { layerId });
  }

  /**
   * 开始图层重命名
   */
  private startLayerRename(layerId: string): void {
    this.emit('startRename', { layerId });
  }

  /**
   * 显示右键菜单
   */
  private showContextMenu(layer: ILayerEntity, position: { x: number; y: number }): void {
    this.emit('showContextMenu', { layer, position });
  }

  /**
   * 简单的事件发射器
   */
  private eventListeners = new Map<string, Function[]>();

  on(event: string, listener: Function): () => void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, []);
    }
    this.eventListeners.get(event)!.push(listener);
    
    return () => {
      const listeners = this.eventListeners.get(event);
      if (listeners) {
        const index = listeners.indexOf(listener);
        if (index >= 0) {
          listeners.splice(index, 1);
        }
      }
    };
  }

  private emit(event: string, data?: any): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      listeners.forEach(listener => {
        try {
          listener(data);
        } catch {
        }
      });
    }
  }

  /**
   * 更新配置
   */
  updateConfig(config: Partial<ILayerViewConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * 获取选中的图层ID
   */
  getSelectedLayerId(): string | null {
    return this.selectedLayerId;
  }

  /**
   * 销毁视图
   */
  dispose(): void {
    this.eventListeners.clear();
    if (this.container) {
      this.container.innerHTML = '';
    }
  }
}