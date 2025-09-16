/**
 * 场景编辑器
 * 提供可视化场景编辑功能，包括对象选择、变换、层级管理等
 */

import EventEmitter3 from 'eventemitter3';

export interface SceneObject {
  id: string;
  name: string;
  type: 'group' | 'mesh' | 'light' | 'camera' | 'particle' | 'text';
  
  // 变换信息
  transform: {
    position: { x: number; y: number; z: number };
    rotation: { x: number; y: number; z: number };
    scale: { x: number; y: number; z: number };
  };
  
  // 层级关系
  parent?: string;
  children: string[];
  
  // 可见性和锁定
  visible: boolean;
  locked: boolean;
  
  // 选择状态
  selected: boolean;
  
  // 自定义属性
  properties: Record<string, any>;
  
  // 组件数据
  components: Record<string, any>;
}

export interface SceneHierarchy {
  rootObjects: string[];
  objects: Record<string, SceneObject>;
}

export interface SelectionInfo {
  objects: string[];
  boundingBox?: {
    min: { x: number; y: number; z: number };
    max: { x: number; y: number; z: number };
    center: { x: number; y: number; z: number };
  };
}

export interface EditorTool {
  id: string;
  name: string;
  icon: string;
  active: boolean;
  cursor: string;
  hotkey?: string;
}

export interface TransformMode {
  type: 'translate' | 'rotate' | 'scale';
  space: 'local' | 'world';
  constraint: 'none' | 'x' | 'y' | 'z' | 'xy' | 'xz' | 'yz';
}

export interface EditorState {
  // 选择状态
  selection: SelectionInfo;
  
  // 工具状态
  activeTool: string;
  transformMode: TransformMode;
  
  // 视图状态
  camera: {
    position: { x: number; y: number; z: number };
    target: { x: number; y: number; z: number };
    zoom: number;
  };
  
  // 网格和对齐
  gridVisible: boolean;
  gridSize: number;
  snapToGrid: boolean;
  snapToObjects: boolean;
  
  // 其他设置
  showWireframe: boolean;
  showBoundingBoxes: boolean;
  showGizmos: boolean;
}

export interface SceneEditorEvents {
  'object-created': { object: SceneObject };
  'object-deleted': { objectId: string };
  'object-modified': { objectId: string; changes: Partial<SceneObject> };
  'objects-selected': { objectIds: string[] };
  'selection-cleared': {};
  'transform-started': { objectIds: string[]; mode: TransformMode };
  'transform-updated': { objectIds: string[]; transforms: Array<{ id: string; transform: SceneObject['transform'] }> };
  'transform-ended': { objectIds: string[]; finalTransforms: Array<{ id: string; transform: SceneObject['transform'] }> };
  'hierarchy-changed': { parentId?: string; childIds: string[] };
  'tool-changed': { toolId: string };
  'editor-state-changed': { state: EditorState };
}

/**
 * 场景编辑器实现
 */
export class SceneEditor {
  private eventBus?: EventEmitter3;
  
  // 场景数据
  private scene: SceneHierarchy = {
    rootObjects: [],
    objects: {}
  };
  
  // 编辑器状态
  private state: EditorState;
  
  // 可用工具
  private tools: Map<string, EditorTool> = new Map();
  
  // 历史记录
  private history: Array<{ action: string; data: any; timestamp: number }> = [];
  private historyIndex = -1;
  private maxHistorySize = 100;
  
  // 变换控制
  private isTransforming = false;
  private transformStart: Map<string, SceneObject['transform']> = new Map();
  
  // 对象生成器
  private nextObjectId = 1;

  constructor() {
    this.state = this.createDefaultState();
    this.initializeTools();
  }

  /**
   * 设置事件总线
   */
  setEventBus(eventBus: EventEmitter3): void {
    this.eventBus = eventBus;
  }

  /**
   * 创建场景对象
   */
  createObject(
    type: SceneObject['type'],
    properties: Partial<SceneObject> = {}
  ): SceneObject {
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
    
    // 添加到场景
    this.scene.objects[id] = object;
    
    // 处理父子关系
    if (object.parent) {
      const parent = this.scene.objects[object.parent];
      if (parent && !parent.children.includes(id)) {
        parent.children.push(id);
      }
    } else {
      this.scene.rootObjects.push(id);
    }
    
    // 记录历史
    this.addToHistory('create', { object });
    
    this.eventBus?.emit('object-created', { object });
    
    return object;
  }

  /**
   * 删除场景对象
   */
  deleteObject(objectId: string): boolean {
    const object = this.scene.objects[objectId];
    if (!object || object.locked) return false;
    
    // 递归删除子对象
    const childrenToDelete = [...object.children];
    for (const childId of childrenToDelete) {
      this.deleteObject(childId);
    }
    
    // 从父对象中移除
    if (object.parent) {
      const parent = this.scene.objects[object.parent];
      if (parent) {
        parent.children = parent.children.filter(id => id !== objectId);
      }
    } else {
      this.scene.rootObjects = this.scene.rootObjects.filter(id => id !== objectId);
    }
    
    // 从选择中移除
    if (object.selected) {
      this.removeFromSelection([objectId]);
    }
    
    // 记录历史
    this.addToHistory('delete', { object: { ...object } });
    
    // 删除对象
    delete this.scene.objects[objectId];
    
    this.eventBus?.emit('object-deleted', { objectId });
    
    return true;
  }

  /**
   * 修改场景对象
   */
  modifyObject(objectId: string, changes: Partial<SceneObject>): boolean {
    const object = this.scene.objects[objectId];
    if (!object || object.locked) return false;
    
    // 记录原始状态
    const originalState = { ...object };
    
    // 应用变更
    Object.assign(object, changes);
    
    // 处理父子关系变更
    if (changes.parent !== undefined) {
      this.updateParentChild(objectId, changes.parent);
    }
    
    // 记录历史
    this.addToHistory('modify', { 
      objectId, 
      originalState, 
      changes 
    });
    
    this.eventBus?.emit('object-modified', { objectId, changes });
    
    return true;
  }

  /**
   * 获取场景对象
   */
  getObject(objectId: string): SceneObject | undefined {
    return this.scene.objects[objectId];
  }

  /**
   * 获取所有场景对象
   */
  getAllObjects(): Record<string, SceneObject> {
    return { ...this.scene.objects };
  }

  /**
   * 获取场景层级结构
   */
  getSceneHierarchy(): SceneHierarchy {
    return {
      rootObjects: [...this.scene.rootObjects],
      objects: { ...this.scene.objects }
    };
  }

  /**
   * 选择对象
   */
  selectObjects(objectIds: string[], additive: boolean = false): void {
    if (!additive) {
      this.clearSelection();
    }
    
    const validIds = objectIds.filter(id => this.scene.objects[id]);
    
    for (const id of validIds) {
      const object = this.scene.objects[id];
      if (object && !object.selected) {
        object.selected = true;
      }
    }
    
    this.updateSelection();
    this.eventBus?.emit('objects-selected', { objectIds: validIds });
  }

  /**
   * 从选择中移除对象
   */
  removeFromSelection(objectIds: string[]): void {
    for (const id of objectIds) {
      const object = this.scene.objects[id];
      if (object) {
        object.selected = false;
      }
    }
    
    this.updateSelection();
  }

  /**
   * 清除选择
   */
  clearSelection(): void {
    for (const object of Object.values(this.scene.objects)) {
      object.selected = false;
    }
    
    this.updateSelection();
    this.eventBus?.emit('selection-cleared', {});
  }

  /**
   * 获取选择信息
   */
  getSelection(): SelectionInfo {
    return { ...this.state.selection };
  }

  /**
   * 开始变换操作
   */
  startTransform(mode: TransformMode): void {
    const selectedIds = this.getSelectedObjectIds();
    if (selectedIds.length === 0 || this.isTransforming) return;
    
    this.isTransforming = true;
    this.state.transformMode = mode;
    this.transformStart.clear();
    
    // 记录初始变换状态
    for (const id of selectedIds) {
      const object = this.scene.objects[id];
      if (object) {
        this.transformStart.set(id, { ...object.transform });
      }
    }
    
    this.eventBus?.emit('transform-started', { objectIds: selectedIds, mode });
  }

  /**
   * 更新变换
   */
  updateTransform(
    delta: { x: number; y: number; z: number },
    mode?: TransformMode
  ): void {
    if (!this.isTransforming) return;
    
    const selectedIds = this.getSelectedObjectIds();
    const transforms = [];
    const currentMode = mode || this.state.transformMode;
    
    for (const id of selectedIds) {
      const object = this.scene.objects[id];
      const startTransform = this.transformStart.get(id);
      
      if (object && startTransform) {
        const newTransform = this.applyTransformDelta(
          startTransform,
          delta,
          currentMode
        );
        
        object.transform = newTransform;
        transforms.push({ id, transform: newTransform });
      }
    }
    
    this.updateSelection(); // 更新边界框
    
    this.eventBus?.emit('transform-updated', { objectIds: selectedIds, transforms });
  }

  /**
   * 结束变换操作
   */
  endTransform(): void {
    if (!this.isTransforming) return;
    
    const selectedIds = this.getSelectedObjectIds();
    const finalTransforms = [];
    
    for (const id of selectedIds) {
      const object = this.scene.objects[id];
      if (object) {
        finalTransforms.push({ id, transform: { ...object.transform } });
      }
    }
    
    // 记录历史
    this.addToHistory('transform', { 
      objectIds: selectedIds,
      startTransforms: Array.from(this.transformStart.entries()),
      finalTransforms
    });
    
    this.isTransforming = false;
    this.transformStart.clear();
    
    this.eventBus?.emit('transform-ended', { objectIds: selectedIds, finalTransforms });
  }

  /**
   * 设置活动工具
   */
  setActiveTool(toolId: string): boolean {
    const tool = this.tools.get(toolId);
    if (!tool) return false;
    
    // 取消所有工具的激活状态
    for (const t of this.tools.values()) {
      t.active = false;
    }
    
    // 激活新工具
    tool.active = true;
    this.state.activeTool = toolId;
    
    this.eventBus?.emit('tool-changed', { toolId });
    
    return true;
  }

  /**
   * 获取可用工具
   */
  getTools(): EditorTool[] {
    return Array.from(this.tools.values());
  }

  /**
   * 复制选中对象
   */
  copySelectedObjects(): SceneObject[] {
    const selectedIds = this.getSelectedObjectIds();
    return selectedIds.map(id => {
      const object = this.scene.objects[id];
      return object ? { ...object } : null;
    }).filter(Boolean) as SceneObject[];
  }

  /**
   * 粘贴对象
   */
  pasteObjects(objects: SceneObject[], offset?: { x: number; y: number; z: number }): SceneObject[] {
    const pastedObjects: SceneObject[] = [];
    const idMapping: Record<string, string> = {};
    
    // 第一遍：创建所有对象并建立ID映射
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
        parent: undefined, // 先不设置父对象
        children: [] // 清空子对象列表
      });
      
      idMapping[sourceObject.id] = newObject.id;
      pastedObjects.push(newObject);
    }
    
    // 第二遍：重建父子关系
    for (let i = 0; i < objects.length; i++) {
      const sourceObject = objects[i];
      const newObject = pastedObjects[i];
      
      if (sourceObject.parent && idMapping[sourceObject.parent]) {
        this.setParent(newObject.id, idMapping[sourceObject.parent]);
      }
    }
    
    return pastedObjects;
  }

  /**
   * 撤销操作
   */
  undo(): boolean {
    if (this.historyIndex < 0) return false;
    
    const historyEntry = this.history[this.historyIndex];
    this.applyHistoryReverse(historyEntry);
    this.historyIndex--;
    
    return true;
  }

  /**
   * 重做操作
   */
  redo(): boolean {
    if (this.historyIndex >= this.history.length - 1) return false;
    
    this.historyIndex++;
    const historyEntry = this.history[this.historyIndex];
    this.applyHistory(historyEntry);
    
    return true;
  }

  /**
   * 设置编辑器状态
   */
  setEditorState(changes: Partial<EditorState>): void {
    this.state = { ...this.state, ...changes };
    this.eventBus?.emit('editor-state-changed', { state: this.state });
  }

  /**
   * 获取编辑器状态
   */
  getEditorState(): EditorState {
    return { ...this.state };
  }

  /**
   * 重置场景
   */
  clearScene(): void {
    this.scene = {
      rootObjects: [],
      objects: {}
    };
    
    this.clearSelection();
    this.history = [];
    this.historyIndex = -1;
    this.nextObjectId = 1;
  }

  /**
   * 创建默认编辑器状态
   */
  private createDefaultState(): EditorState {
    return {
      selection: { objects: [] },
      activeTool: 'select',
      transformMode: {
        type: 'translate',
        space: 'world',
        constraint: 'none'
      },
      camera: {
        position: { x: 0, y: 0, z: 10 },
        target: { x: 0, y: 0, z: 0 },
        zoom: 1
      },
      gridVisible: true,
      gridSize: 1,
      snapToGrid: false,
      snapToObjects: false,
      showWireframe: false,
      showBoundingBoxes: true,
      showGizmos: true
    };
  }

  /**
   * 初始化工具
   */
  private initializeTools(): void {
    const defaultTools: EditorTool[] = [
      { id: 'select', name: 'Select', icon: 'cursor', active: true, cursor: 'default', hotkey: 'V' },
      { id: 'move', name: 'Move', icon: 'move', active: false, cursor: 'move', hotkey: 'G' },
      { id: 'rotate', name: 'Rotate', icon: 'rotate', active: false, cursor: 'grab', hotkey: 'R' },
      { id: 'scale', name: 'Scale', icon: 'scale', active: false, cursor: 'nwse-resize', hotkey: 'S' },
      { id: 'rectangle', name: 'Rectangle', icon: 'square', active: false, cursor: 'crosshair' },
      { id: 'circle', name: 'Circle', icon: 'circle', active: false, cursor: 'crosshair' },
      { id: 'text', name: 'Text', icon: 'text', active: false, cursor: 'text' }
    ];
    
    for (const tool of defaultTools) {
      this.tools.set(tool.id, tool);
    }
  }

  /**
   * 更新选择信息
   */
  private updateSelection(): void {
    const selectedIds = this.getSelectedObjectIds();
    
    if (selectedIds.length === 0) {
      this.state.selection = { objects: [] };
      return;
    }
    
    // 计算选择边界框
    let minX = Infinity, minY = Infinity, minZ = Infinity;
    let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;
    
    for (const id of selectedIds) {
      const object = this.scene.objects[id];
      if (object) {
        const pos = object.transform.position;
        const scale = object.transform.scale;
        
        minX = Math.min(minX, pos.x - scale.x / 2);
        minY = Math.min(minY, pos.y - scale.y / 2);
        minZ = Math.min(minZ, pos.z - scale.z / 2);
        
        maxX = Math.max(maxX, pos.x + scale.x / 2);
        maxY = Math.max(maxY, pos.y + scale.y / 2);
        maxZ = Math.max(maxZ, pos.z + scale.z / 2);
      }
    }
    
    this.state.selection = {
      objects: selectedIds,
      boundingBox: {
        min: { x: minX, y: minY, z: minZ },
        max: { x: maxX, y: maxY, z: maxZ },
        center: {
          x: (minX + maxX) / 2,
          y: (minY + maxY) / 2,
          z: (minZ + maxZ) / 2
        }
      }
    };
  }

  /**
   * 获取选中对象ID列表
   */
  private getSelectedObjectIds(): string[] {
    return Object.values(this.scene.objects)
      .filter(obj => obj.selected)
      .map(obj => obj.id);
  }

  /**
   * 应用变换增量
   */
  private applyTransformDelta(
    startTransform: SceneObject['transform'],
    delta: { x: number; y: number; z: number },
    mode: TransformMode
  ): SceneObject['transform'] {
    const result = { ...startTransform };
    
    switch (mode.type) {
      case 'translate':
        if (mode.constraint === 'none' || mode.constraint.includes('x')) {
          result.position.x = startTransform.position.x + delta.x;
        }
        if (mode.constraint === 'none' || mode.constraint.includes('y')) {
          result.position.y = startTransform.position.y + delta.y;
        }
        if (mode.constraint === 'none' || mode.constraint.includes('z')) {
          result.position.z = startTransform.position.z + delta.z;
        }
        break;
        
      case 'rotate':
        if (mode.constraint === 'none' || mode.constraint.includes('x')) {
          result.rotation.x = startTransform.rotation.x + delta.x;
        }
        if (mode.constraint === 'none' || mode.constraint.includes('y')) {
          result.rotation.y = startTransform.rotation.y + delta.y;
        }
        if (mode.constraint === 'none' || mode.constraint.includes('z')) {
          result.rotation.z = startTransform.rotation.z + delta.z;
        }
        break;
        
      case 'scale':
        const scaleFactor = 1 + (delta.x + delta.y + delta.z) / 3;
        if (mode.constraint === 'none' || mode.constraint.includes('x')) {
          result.scale.x = Math.max(0.01, startTransform.scale.x * scaleFactor);
        }
        if (mode.constraint === 'none' || mode.constraint.includes('y')) {
          result.scale.y = Math.max(0.01, startTransform.scale.y * scaleFactor);
        }
        if (mode.constraint === 'none' || mode.constraint.includes('z')) {
          result.scale.z = Math.max(0.01, startTransform.scale.z * scaleFactor);
        }
        break;
    }
    
    return result;
  }

  /**
   * 更新父子关系
   */
  private updateParentChild(objectId: string, newParentId?: string): void {
    const object = this.scene.objects[objectId];
    if (!object) return;
    
    // 从原父对象中移除
    if (object.parent) {
      const oldParent = this.scene.objects[object.parent];
      if (oldParent) {
        oldParent.children = oldParent.children.filter(id => id !== objectId);
      }
    } else {
      this.scene.rootObjects = this.scene.rootObjects.filter(id => id !== objectId);
    }
    
    // 添加到新父对象
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
    
    this.eventBus?.emit('hierarchy-changed', { 
      parentId: newParentId, 
      childIds: [objectId] 
    });
  }

  /**
   * 设置父对象
   */
  private setParent(childId: string, parentId?: string): void {
    this.updateParentChild(childId, parentId);
  }

  /**
   * 添加到历史记录
   */
  private addToHistory(action: string, data: any): void {
    // 移除当前位置之后的历史记录
    this.history = this.history.slice(0, this.historyIndex + 1);
    
    // 添加新的历史记录
    this.history.push({
      action,
      data,
      timestamp: Date.now()
    });
    
    this.historyIndex = this.history.length - 1;
    
    // 限制历史记录大小
    if (this.history.length > this.maxHistorySize) {
      this.history.shift();
      this.historyIndex--;
    }
  }

  /**
   * 应用历史记录
   */
  private applyHistory(entry: { action: string; data: any }): void {
    switch (entry.action) {
      case 'create':
        // 重新创建对象
        const obj = entry.data.object;
        this.scene.objects[obj.id] = obj;
        if (obj.parent) {
          const parent = this.scene.objects[obj.parent];
          if (parent && !parent.children.includes(obj.id)) {
            parent.children.push(obj.id);
          }
        } else {
          if (!this.scene.rootObjects.includes(obj.id)) {
            this.scene.rootObjects.push(obj.id);
          }
        }
        break;
    }
  }

  /**
   * 反向应用历史记录
   */
  private applyHistoryReverse(entry: { action: string; data: any }): void {
    switch (entry.action) {
      case 'create':
        // 删除对象
        this.deleteObject(entry.data.object.id);
        break;
    }
  }

  /**
   * 销毁编辑器
   */
  dispose(): void {
    this.clearScene();
    this.tools.clear();
  }
}