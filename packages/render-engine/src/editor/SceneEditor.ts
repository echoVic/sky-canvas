/**
 * 场景编辑器
 * 提供可视化场景编辑功能，包括对象选择、变换、层级管理等
 */

import { IEventBus } from '../events/EventBus';
import {
  SceneObject,
  SceneHierarchy,
  SelectionInfo,
  EditorTool,
  TransformMode,
  EditorState,
  HistoryEntry,
  Vector3,
  createDefaultEditorState,
  createDefaultTools
} from './SceneEditorTypes';
import { SelectionManager } from './SelectionManager';
import { TransformController } from './TransformController';

// 重新导出类型
export type {
  SceneObject,
  SceneHierarchy,
  SelectionInfo,
  EditorTool,
  TransformMode,
  EditorState,
  Vector3
} from './SceneEditorTypes';
export type { SceneEditorEvents } from './SceneEditorTypes';
export { SelectionManager } from './SelectionManager';
export { TransformController } from './TransformController';

/**
 * 场景编辑器实现
 */
export class SceneEditor {
  private eventBus?: IEventBus;
  private scene: SceneHierarchy = { rootObjects: [], objects: {} };
  private state: EditorState;
  private tools: Map<string, EditorTool> = new Map();
  private history: HistoryEntry[] = [];
  private historyIndex = -1;
  private maxHistorySize = 100;
  private nextObjectId = 1;

  private selectionManager: SelectionManager;
  private transformController: TransformController;

  constructor() {
    this.state = createDefaultEditorState();
    this.initializeTools();

    this.selectionManager = new SelectionManager(
      () => this.scene,
      () => this.state,
      (state) => { this.state = state; }
    );

    this.transformController = new TransformController(
      () => this.scene,
      () => this.state,
      (state) => { this.state = state; },
      () => this.selectionManager.getSelectedObjectIds(),
      () => this.selectionManager.updateSelection(),
      (action, data) => this.addToHistory(action, data),
      () => this.eventBus
    );
  }

  setEventBus(eventBus: IEventBus): void {
    this.eventBus = eventBus;
  }

  createObject(type: SceneObject['type'], properties: Partial<SceneObject> = {}): SceneObject {
    const id = `object_${this.nextObjectId++}`;

    const object: SceneObject = {
      id,
      name: properties.name || `${type}_${id}`,
      type,
      transform: properties.transform || {
        position: { x: 0, y: 0, z: 0 },
        rotation: { x: 0, y: 0, z: 0 },
        scale: { x: 1, y: 1, z: 1 }
      },
      parent: properties.parent,
      children: [],
      visible: properties.visible !== false,
      locked: properties.locked || false,
      selected: false,
      properties: properties.properties || {},
      components: properties.components || {}
    };

    this.scene.objects[id] = object;

    if (object.parent) {
      const parent = this.scene.objects[object.parent];
      if (parent && !parent.children.includes(id)) {
        parent.children.push(id);
      }
    } else {
      this.scene.rootObjects.push(id);
    }

    this.addToHistory('create', { object });
    this.eventBus?.emit('object-created', { object });

    return object;
  }

  deleteObject(objectId: string): boolean {
    const object = this.scene.objects[objectId];
    if (!object || object.locked) return false;

    for (const childId of [...object.children]) {
      this.deleteObject(childId);
    }

    if (object.parent) {
      const parent = this.scene.objects[object.parent];
      if (parent) {
        parent.children = parent.children.filter(id => id !== objectId);
      }
    } else {
      this.scene.rootObjects = this.scene.rootObjects.filter(id => id !== objectId);
    }

    if (object.selected) {
      this.selectionManager.removeFromSelection([objectId]);
    }

    this.addToHistory('delete', { object: { ...object } });
    delete this.scene.objects[objectId];
    this.eventBus?.emit('object-deleted', { objectId });

    return true;
  }

  modifyObject(objectId: string, changes: Partial<SceneObject>): boolean {
    const object = this.scene.objects[objectId];
    if (!object || object.locked) return false;

    const originalState = { ...object };
    Object.assign(object, changes);

    if (changes.parent !== undefined) {
      this.updateParentChild(objectId, changes.parent);
    }

    this.addToHistory('modify', { objectId, originalState, changes });
    this.eventBus?.emit('object-modified', { objectId, changes });

    return true;
  }

  getObject(objectId: string): SceneObject | undefined {
    return this.scene.objects[objectId];
  }

  getAllObjects(): Record<string, SceneObject> {
    return { ...this.scene.objects };
  }

  getSceneHierarchy(): SceneHierarchy {
    return { rootObjects: [...this.scene.rootObjects], objects: { ...this.scene.objects } };
  }

  selectObjects(objectIds: string[], additive: boolean = false): void {
    const validIds = this.selectionManager.selectObjects(objectIds, additive);
    this.eventBus?.emit('objects-selected', { objectIds: validIds });
  }

  removeFromSelection(objectIds: string[]): void {
    this.selectionManager.removeFromSelection(objectIds);
  }

  clearSelection(): void {
    this.selectionManager.clearSelection();
    this.eventBus?.emit('selection-cleared', {});
  }

  getSelection(): SelectionInfo {
    return this.selectionManager.getSelection();
  }

  startTransform(mode: TransformMode): void {
    this.transformController.startTransform(mode);
  }

  updateTransform(delta: Vector3, mode?: TransformMode): void {
    this.transformController.updateTransform(delta, mode);
  }

  endTransform(): void {
    this.transformController.endTransform();
  }

  setActiveTool(toolId: string): boolean {
    const tool = this.tools.get(toolId);
    if (!tool) return false;

    for (const t of this.tools.values()) {
      t.active = false;
    }

    tool.active = true;
    this.state.activeTool = toolId;
    this.eventBus?.emit('tool-changed', { toolId });

    return true;
  }

  getTools(): EditorTool[] {
    return Array.from(this.tools.values());
  }

  copySelectedObjects(): SceneObject[] {
    return this.selectionManager.copySelectedObjects();
  }

  pasteObjects(objects: SceneObject[], offset?: Vector3): SceneObject[] {
    const pastedObjects: SceneObject[] = [];
    const idMapping: Record<string, string> = {};

    for (const sourceObject of objects) {
      const newObject = this.createObject(sourceObject.type, {
        ...sourceObject,
        name: `${sourceObject.name}_copy`,
        transform: {
          position: {
            x: sourceObject.transform.position.x + (offset?.x || 10),
            y: sourceObject.transform.position.y + (offset?.y || 10),
            z: sourceObject.transform.position.z + (offset?.z || 0)
          },
          rotation: { ...sourceObject.transform.rotation },
          scale: { ...sourceObject.transform.scale }
        },
        parent: undefined,
        children: []
      });

      idMapping[sourceObject.id] = newObject.id;
      pastedObjects.push(newObject);
    }

    for (let i = 0; i < objects.length; i++) {
      const sourceObject = objects[i];
      if (sourceObject.parent && idMapping[sourceObject.parent]) {
        this.updateParentChild(pastedObjects[i].id, idMapping[sourceObject.parent]);
      }
    }

    return pastedObjects;
  }

  undo(): boolean {
    if (this.historyIndex < 0) return false;
    this.applyHistoryReverse(this.history[this.historyIndex]);
    this.historyIndex--;
    return true;
  }

  redo(): boolean {
    if (this.historyIndex >= this.history.length - 1) return false;
    this.historyIndex++;
    this.applyHistory(this.history[this.historyIndex]);
    return true;
  }

  setEditorState(changes: Partial<EditorState>): void {
    this.state = { ...this.state, ...changes };
    this.eventBus?.emit('editor-state-changed', { state: this.state });
  }

  getEditorState(): EditorState {
    return { ...this.state };
  }

  clearScene(): void {
    this.scene = { rootObjects: [], objects: {} };
    this.selectionManager.clearSelection();
    this.history = [];
    this.historyIndex = -1;
    this.nextObjectId = 1;
  }

  dispose(): void {
    this.clearScene();
    this.tools.clear();
  }

  private initializeTools(): void {
    for (const tool of createDefaultTools()) {
      this.tools.set(tool.id, tool);
    }
  }

  private updateParentChild(objectId: string, newParentId?: string): void {
    const object = this.scene.objects[objectId];
    if (!object) return;

    if (object.parent) {
      const oldParent = this.scene.objects[object.parent];
      if (oldParent) {
        oldParent.children = oldParent.children.filter(id => id !== objectId);
      }
    } else {
      this.scene.rootObjects = this.scene.rootObjects.filter(id => id !== objectId);
    }

    if (newParentId) {
      const newParent = this.scene.objects[newParentId];
      if (newParent && !newParent.children.includes(objectId)) {
        newParent.children.push(objectId);
      }
    } else {
      if (!this.scene.rootObjects.includes(objectId)) {
        this.scene.rootObjects.push(objectId);
      }
    }

    object.parent = newParentId;
    this.eventBus?.emit('hierarchy-changed', { parentId: newParentId, childIds: [objectId] });
  }

  private addToHistory(action: string, data: unknown): void {
    this.history = this.history.slice(0, this.historyIndex + 1);
    this.history.push({ action, data, timestamp: Date.now() });
    this.historyIndex = this.history.length - 1;

    if (this.history.length > this.maxHistorySize) {
      this.history.shift();
      this.historyIndex--;
    }
  }

  private applyHistory(entry: HistoryEntry): void {
    if (entry.action === 'create') {
      const data = entry.data as { object: SceneObject };
      const obj = data.object;
      this.scene.objects[obj.id] = obj;
      if (obj.parent) {
        const parent = this.scene.objects[obj.parent];
        if (parent && !parent.children.includes(obj.id)) {
          parent.children.push(obj.id);
        }
      } else if (!this.scene.rootObjects.includes(obj.id)) {
        this.scene.rootObjects.push(obj.id);
      }
    }
  }

  private applyHistoryReverse(entry: HistoryEntry): void {
    if (entry.action === 'create') {
      const data = entry.data as { object: SceneObject };
      this.deleteObject(data.object.id);
    }
  }
}
