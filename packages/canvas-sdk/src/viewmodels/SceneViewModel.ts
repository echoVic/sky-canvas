/**
 * 场景 ViewModel 实现
 * 使用 Valtio 管理场景状态
 */

import { proxy, snapshot } from 'valtio';
import { ShapeEntity } from '../models/entities/Shape';
import { ISceneViewModel, ISceneState } from './interfaces/IViewModel';
import { IShapeRepository } from '../models/repositories/IShapeRepository';
import { IEventBusService } from '../services/eventBus/eventBusService';

export class SceneViewModel implements ISceneViewModel {
  private readonly _state: ISceneState;

  constructor(
    private shapeRepository: IShapeRepository,
    private eventBus: IEventBusService
  ) {
    // 使用 Valtio proxy 创建响应式状态
    this._state = proxy<ISceneState>({
      shapes: [],
      viewport: {
        x: 0,
        y: 0,
        width: 800,
        height: 600,
        zoom: 1
      },
      selection: {
        selectedShapeIds: [],
        isMultiSelect: false
      },
      isModified: false,
      lastUpdated: new Date()
    });
  }

  get state(): ISceneState {
    return this._state;
  }

  async initialize(): Promise<void> {
    // 从仓储加载初始数据
    const shapes = await this.shapeRepository.getAll();
    this._state.shapes = shapes;
    
    // 监听仓储变化
    this.shapeRepository.subscribe((event) => {
      this.handleRepositoryEvent(event);
    });

    // 发布初始化完成事件
    this.eventBus.emit('scene:initialized', { shapeCount: shapes.length });
  }

  dispose(): void {
    // 清理资源
    this._state.shapes = [];
    this._state.selection.selectedShapeIds = [];
  }

  getSnapshot() {
    return snapshot(this._state);
  }

  addShape(shape: ShapeEntity): void {
    // 添加到仓储
    this.shapeRepository.add(shape);
    
    // 更新状态
    this._state.shapes.push(shape);
    this._state.isModified = true;
    this._state.lastUpdated = new Date();

    // 发布事件
    this.eventBus.emit('scene:shape-added', { shape });
  }

  removeShape(id: string): void {
    // 从仓储移除
    this.shapeRepository.remove(id);
    
    // 更新状态
    const index = this._state.shapes.findIndex(s => s.id === id);
    if (index >= 0) {
      const shape = this._state.shapes[index];
      this._state.shapes.splice(index, 1);
      
      // 从选择中移除
      const selectionIndex = this._state.selection.selectedShapeIds.indexOf(id);
      if (selectionIndex >= 0) {
        this._state.selection.selectedShapeIds.splice(selectionIndex, 1);
      }
      
      this._state.isModified = true;
      this._state.lastUpdated = new Date();

      // 发布事件
      this.eventBus.emit('scene:shape-removed', { shape });
    }
  }

  updateShape(id: string, updates: Partial<ShapeEntity>): void {
    // 更新仓储
    this.shapeRepository.update(id, updates);
    
    // 更新状态
    const shape = this._state.shapes.find(s => s.id === id);
    if (shape) {
      Object.assign(shape, updates, { 
        updatedAt: new Date() 
      });
      
      this._state.isModified = true;
      this._state.lastUpdated = new Date();

      // 发布事件
      this.eventBus.emit('scene:shape-updated', { id, updates, shape });
    }
  }

  clearShapes(): void {
    // 清空仓储
    this.shapeRepository.clear();
    
    // 更新状态
    this._state.shapes = [];
    this._state.selection.selectedShapeIds = [];
    this._state.isModified = true;
    this._state.lastUpdated = new Date();

    // 发布事件
    this.eventBus.emit('scene:shapes-cleared', {});
  }

  getShape(id: string): ShapeEntity | undefined {
    return this._state.shapes.find(s => s.id === id);
  }

  getShapes(): ShapeEntity[] {
    return [...this._state.shapes];
  }

  private handleRepositoryEvent(event: { type: 'added' | 'updated' | 'removed' | 'cleared'; shapes?: ShapeEntity[] }): void {
    // 同步仓储变化到状态
    switch (event.type) {
      case 'added':
        // 仓储添加事件通常由 addShape 方法触发，避免重复处理
        break;
      case 'updated':
        // 同步更新
        if (event.shapes) {
          for (const updatedShape of event.shapes) {
            const index = this._state.shapes.findIndex(s => s.id === updatedShape.id);
            if (index >= 0) {
              this._state.shapes[index] = { ...updatedShape };
            }
          }
        }
        break;
      case 'removed':
        // 同步移除
        if (event.shapes) {
          for (const removedShape of event.shapes) {
            const index = this._state.shapes.findIndex(s => s.id === removedShape.id);
            if (index >= 0) {
              this._state.shapes.splice(index, 1);
            }
          }
        }
        break;
      case 'cleared':
        this._state.shapes = [];
        break;
    }

    this._state.lastUpdated = new Date();
  }
}