/**
 * 场景 ViewModel 实现
 * 使用 Valtio 管理场景状态
 */

import { Shape } from '@sky-canvas/render-engine';
import { proxy, snapshot } from 'valtio';
import { IEventBusService } from '../services/eventBus/eventBusService';
import { ISceneState, ISceneViewModel } from './types/IViewModel';

export class SceneViewModel implements ISceneViewModel {
  private readonly _state: ISceneState;

  constructor(
    private eventBus: IEventBusService
  ) {
    // 使用 Valtio proxy 创建响应式状态
    this._state = proxy<ISceneState>({
      shapes: [],
      selection: {
        selectedShapeIds: []
      },
      isModified: false,
      lastUpdated: new Date()
    });
  }

  get state(): ISceneState {
    return this._state;
  }

  async initialize(): Promise<void> {
    // 简单初始化，不使用仓储
    // 发布初始化完成事件
    this.eventBus.emit('scene:initialized', { shapeCount: 0 });
  }

  dispose(): void {
    // 清理资源
    this._state.shapes = [];
    this._state.selection.selectedShapeIds = [];
  }

  getSnapshot() {
    return snapshot(this._state);
  }

  addShape(shape: Shape): void {
    // 直接管理状态，不使用仓储
    // 更新状态
    this._state.shapes.push(shape);
    this._state.isModified = true;
    this._state.lastUpdated = new Date();

    // 发布事件
    this.eventBus.emit('scene:shape-added', { shape });
  }

  removeShape(id: string): void {
    // 直接管理状态
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

  updateShape(id: string, updates: Partial<Shape>): void {
    // 直接管理状态
    // 更新状态
    const shape = this._state.shapes.find(s => s.id === id);
    if (shape) {
      Object.assign(shape, updates);
      
      this._state.isModified = true;
      this._state.lastUpdated = new Date();

      // 发布事件
      this.eventBus.emit('scene:shape-updated', { id, updates, shape });
    }
  }

  clearShapes(): void {
    // 更新状态
    this._state.shapes = [];
    this._state.selection.selectedShapeIds = [];
    this._state.isModified = true;
    this._state.lastUpdated = new Date();

    // 发布事件
    this.eventBus.emit('scene:shapes-cleared', {});
  }

  getShape(id: string): Shape | undefined {
    return this._state.shapes.find(s => s.id === id);
  }

  getShapes(): Shape[] {
    return [...this._state.shapes];
  }

}