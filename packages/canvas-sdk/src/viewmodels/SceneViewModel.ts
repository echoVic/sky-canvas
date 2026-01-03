/**
 * 场景 ViewModel 实现
 * 使用 Valtio 管理场景状态
 */

import { proxy, snapshot } from 'valtio';
import { ShapeEntity } from '../models/entities/Shape';
import { ISceneViewModel, ISceneState } from './interfaces/IViewModel';
import { IShapeRepository } from '../models/repositories/IShapeRepository';

export class SceneViewModel implements ISceneViewModel {
  private readonly _state: ISceneState;

  constructor(
    private shapeRepository: IShapeRepository
  ) {
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
    const shapes = await this.shapeRepository.getAll();
    this._state.shapes = shapes;
    
    this.shapeRepository.subscribe((event) => {
      this.handleRepositoryEvent(event);
    });
  }

  dispose(): void {
    this._state.shapes = [];
    this._state.selection.selectedShapeIds = [];
  }

  getSnapshot() {
    return snapshot(this._state);
  }

  addShape(shape: ShapeEntity): void {
    this.shapeRepository.add(shape);
    
    this._state.shapes.push(shape);
    this._state.isModified = true;
    this._state.lastUpdated = new Date();
  }

  removeShape(id: string): void {
    this.shapeRepository.remove(id);
    
    const index = this._state.shapes.findIndex(s => s.id === id);
    if (index >= 0) {
      this._state.shapes.splice(index, 1);
      
      const selectionIndex = this._state.selection.selectedShapeIds.indexOf(id);
      if (selectionIndex >= 0) {
        this._state.selection.selectedShapeIds.splice(selectionIndex, 1);
      }
      
      this._state.isModified = true;
      this._state.lastUpdated = new Date();
    }
  }

  updateShape(id: string, updates: Partial<ShapeEntity>): void {
    this.shapeRepository.update(id, updates);
    
    const shape = this._state.shapes.find(s => s.id === id);
    if (shape) {
      Object.assign(shape, updates, { 
        updatedAt: new Date() 
      });
      
      this._state.isModified = true;
      this._state.lastUpdated = new Date();
    }
  }

  clearShapes(): void {
    this.shapeRepository.clear();
    
    this._state.shapes = [];
    this._state.selection.selectedShapeIds = [];
    this._state.isModified = true;
    this._state.lastUpdated = new Date();
  }

  getShape(id: string): ShapeEntity | undefined {
    return this._state.shapes.find(s => s.id === id);
  }

  getShapes(): ShapeEntity[] {
    return [...this._state.shapes];
  }

  private handleRepositoryEvent(event: { type: 'added' | 'updated' | 'removed' | 'cleared'; shapes?: ShapeEntity[] }): void {
    switch (event.type) {
      case 'added':
        break;
      case 'updated':
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
