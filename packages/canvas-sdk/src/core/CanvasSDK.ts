/**
 * 画板SDK核心实现
 */
import { RenderEngine, IRenderLayer, IPoint } from '@sky-canvas/render-engine';
import { IShape, IShapeUpdate, IShapeEvent, IShapeSelectionEvent } from '../scene/IShape';
import { EventEmitter } from '../events/EventEmitter';
import { HistoryManager } from '../core/HistoryManager';

/**
 * SDK事件类型
 */
export interface ICanvasSDKEvents {
  'shapeAdded': IShapeEvent;
  'shapeRemoved': IShapeEvent;
  'shapeUpdated': IShapeEvent;
  'shapeSelected': IShapeSelectionEvent;
  'shapeDeselected': IShapeSelectionEvent;
  'selectionCleared': {};
}

/**
 * 画板SDK核心类
 */
export class CanvasSDK extends EventEmitter<ICanvasSDKEvents> {
  private renderEngine: RenderEngine | null = null;
  private canvas: HTMLCanvasElement | null = null;
  private shapes: Map<string, IShape> = new Map();
  private layers: Map<string, IRenderLayer> = new Map();
  private selectedShapes: Set<string> = new Set();
  private historyManager: HistoryManager = new HistoryManager();
  private isInitializedFlag = false;

  /**
   * 初始化SDK
   * @param canvas 画布元素
   */
  async initialize(canvas: HTMLCanvasElement): Promise<void> {
    if (this.isInitializedFlag) {
      throw new Error('Canvas SDK already initialized');
    }

    if (!canvas) {
      throw new Error('Canvas element is required');
    }

    this.canvas = canvas;
    this.renderEngine = new RenderEngine();
    
    // 这里需要实际的图形上下文工厂，暂时使用占位符
    // await this.renderEngine.initialize(factory, canvas);
    
    this.isInitializedFlag = true;
  }

  /**
   * 检查是否已初始化
   */
  isInitialized(): boolean {
    return this.isInitializedFlag;
  }

  /**
   * 获取画布元素
   */
  getCanvas(): HTMLCanvasElement | null {
    return this.canvas;
  }

  // === 形状管理 ===

  /**
   * 添加形状
   * @param shape 形状对象
   */
  addShape(shape: IShape): void {
    this.shapes.set(shape.id, shape);
    
    // 记录历史
    this.historyManager.execute({
      execute: () => this.shapes.set(shape.id, shape),
      undo: () => this.shapes.delete(shape.id)
    });

    this.emit('shapeAdded', { shape });
  }

  /**
   * 移除形状
   * @param id 形状ID
   */
  removeShape(id: string): void {
    const shape = this.shapes.get(id);
    if (shape) {
      this.shapes.delete(id);
      this.selectedShapes.delete(id);
      
      // 记录历史
      this.historyManager.execute({
        execute: () => {
          this.shapes.delete(id);
          this.selectedShapes.delete(id);
        },
        undo: () => this.shapes.set(id, shape)
      });

      shape.dispose();
      this.emit('shapeRemoved', { shape });
    }
  }

  /**
   * 获取形状
   * @param id 形状ID
   */
  getShape(id: string): IShape | undefined {
    return this.shapes.get(id);
  }

  /**
   * 获取所有形状
   */
  getShapes(): IShape[] {
    return Array.from(this.shapes.values())
      .sort((a, b) => a.zIndex - b.zIndex);
  }

  /**
   * 更新形状
   * @param id 形状ID
   * @param updates 更新数据
   */
  updateShape(id: string, updates: IShapeUpdate): void {
    const shape = this.shapes.get(id);
    if (shape) {
      const oldData = {
        position: { ...shape.position },
        size: { ...shape.size },
        visible: shape.visible,
        zIndex: shape.zIndex
      };

      // 应用更新
      if (updates.position) {
        shape.position = { ...shape.position, ...updates.position };
      }
      if (updates.size) {
        shape.size = { ...shape.size, ...updates.size };
      }
      if (updates.visible !== undefined) {
        shape.visible = updates.visible;
      }
      if (updates.zIndex !== undefined) {
        shape.zIndex = updates.zIndex;
      }

      // 记录历史
      this.historyManager.execute({
        execute: () => {
          if (updates.position) {
            shape.position = { ...shape.position, ...updates.position };
          }
          if (updates.size) {
            shape.size = { ...shape.size, ...updates.size };
          }
          if (updates.visible !== undefined) {
            shape.visible = updates.visible;
          }
          if (updates.zIndex !== undefined) {
            shape.zIndex = updates.zIndex;
          }
        },
        undo: () => {
          shape.position = oldData.position;
          shape.size = oldData.size;
          shape.visible = oldData.visible;
          shape.zIndex = oldData.zIndex;
        }
      });

      this.emit('shapeUpdated', { shape });
    }
  }

  /**
   * 清空所有形状
   */
  clearShapes(): void {
    const shapesToRemove = Array.from(this.shapes.values());
    
    for (const shape of shapesToRemove) {
      shape.dispose();
    }
    
    this.shapes.clear();
    this.selectedShapes.clear();
    
    // 记录历史
    this.historyManager.execute({
      execute: () => {
        this.shapes.clear();
        this.selectedShapes.clear();
      },
      undo: () => {
        for (const shape of shapesToRemove) {
          this.shapes.set(shape.id, shape);
        }
      }
    });
  }

  // === 图层管理 ===

  /**
   * 创建图层
   * @param id 图层ID
   * @param zIndex Z轴层级
   */
  createLayer(id: string, zIndex: number = 0): IRenderLayer {
    if (!this.renderEngine) {
      throw new Error('SDK not initialized');
    }

    const layer = this.renderEngine.createLayer(id, zIndex);
    this.layers.set(id, layer);
    return layer;
  }

  /**
   * 获取图层
   * @param id 图层ID
   */
  getLayer(id: string): IRenderLayer | undefined {
    return this.layers.get(id);
  }

  /**
   * 移除图层
   * @param id 图层ID
   */
  removeLayer(id: string): void {
    if (this.renderEngine) {
      this.renderEngine.removeLayer(id);
    }
    this.layers.delete(id);
  }

  /**
   * 获取所有图层
   */
  getLayers(): IRenderLayer[] {
    return Array.from(this.layers.values());
  }

  // === 选择系统 ===

  /**
   * 选择形状
   * @param id 形状ID
   */
  selectShape(id: string): void {
    const shape = this.shapes.get(id);
    if (shape) {
      this.selectedShapes.add(id);
      this.emit('shapeSelected', { shape, selected: true });
    }
  }

  /**
   * 取消选择形状
   * @param id 形状ID
   */
  deselectShape(id: string): void {
    const shape = this.shapes.get(id);
    if (shape && this.selectedShapes.has(id)) {
      this.selectedShapes.delete(id);
      this.emit('shapeDeselected', { shape, selected: false });
    }
  }

  /**
   * 清空所有选择
   */
  clearSelection(): void {
    this.selectedShapes.clear();
    this.emit('selectionCleared', {});
  }

  /**
   * 检查形状是否被选中
   * @param id 形状ID
   */
  isSelected(id: string): boolean {
    return this.selectedShapes.has(id);
  }

  /**
   * 获取所有被选中的形状
   */
  getSelectedShapes(): IShape[] {
    return Array.from(this.selectedShapes)
      .map(id => this.shapes.get(id))
      .filter((shape): shape is IShape => shape !== undefined);
  }

  // === 点击测试 ===

  /**
   * 点击测试
   * @param point 测试点
   */
  hitTest(point: IPoint): IShape | null {
    // 从上到下测试形状（按zIndex倒序）
    const sortedShapes = this.getShapes().reverse();
    
    for (const shape of sortedShapes) {
      if (shape.visible && shape.hitTest(point)) {
        return shape;
      }
    }
    
    return null;
  }

  // === 历史记录 ===

  /**
   * 撤销操作
   */
  undo(): void {
    this.historyManager.undo();
  }

  /**
   * 重做操作
   */
  redo(): void {
    this.historyManager.redo();
  }

  /**
   * 检查是否可以撤销
   */
  canUndo(): boolean {
    return this.historyManager.canUndo();
  }

  /**
   * 检查是否可以重做
   */
  canRedo(): boolean {
    return this.historyManager.canRedo();
  }

  // === 资源管理 ===

  /**
   * 销毁SDK
   */
  dispose(): void {
    // 清理所有形状
    for (const shape of this.shapes.values()) {
      shape.dispose();
    }
    
    this.shapes.clear();
    this.layers.clear();
    this.selectedShapes.clear();
    
    // 销毁渲染引擎
    if (this.renderEngine) {
      this.renderEngine.dispose();
      this.renderEngine = null;
    }
    
    this.canvas = null;
    this.isInitializedFlag = false;
    
    // 清理事件监听器
    this.removeAllListeners();
  }
}