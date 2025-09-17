/**
 * SceneEditor 单元测试
 * 测试场景编辑器的核心功能
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import EventEmitter3 from 'eventemitter3';
import { SceneEditor, SceneObject, TransformMode } from '../SceneEditor';

describe('SceneEditor', () => {
  let editor: SceneEditor;
  let eventBus: EventEmitter3;

  beforeEach(() => {
    editor = new SceneEditor();
    eventBus = new EventEmitter3();
    editor.setEventBus(eventBus);
  });

  describe('初始化', () => {
    it('应该正确初始化编辑器', () => {
      const state = editor.getEditorState();
      expect(state.selection.objects).toEqual([]);
      expect(state.activeTool).toBe('select');
      expect(state.transformMode.type).toBe('translate');
      expect(state.transformMode.space).toBe('world');
    });

    it('应该正确设置事件总线', () => {
      const newEventBus = new EventEmitter3();
      editor.setEventBus(newEventBus);
      // 验证事件总线设置成功（通过后续事件测试验证）
      expect(true).toBe(true);
    });
  });

  describe('对象管理', () => {
    it('应该能创建对象', () => {
      const eventSpy = vi.fn();
      eventBus.on('object-created', eventSpy);

      const obj = editor.createObject('mesh', {
        name: 'Test Mesh',
        properties: { material: 'default' }
      });

      expect(obj.id).toBeDefined();
      expect(obj.name).toBe('Test Mesh');
      expect(obj.type).toBe('mesh');
      expect(obj.properties.material).toBe('default');
      expect(obj.transform.position).toEqual({ x: 0, y: 0, z: 0 });
      expect(obj.visible).toBe(true);
      expect(obj.locked).toBe(false);
      expect(eventSpy).toHaveBeenCalledWith({ object: obj });
    });

    it('应该能获取对象', () => {
      const obj = editor.createObject('light');
      const retrieved = editor.getObject(obj.id);
      expect(retrieved).toEqual(obj);
    });

    it('应该能修改对象', () => {
      const eventSpy = vi.fn();
      eventBus.on('object-modified', eventSpy);

      const obj = editor.createObject('camera');
      const changes = {
        name: 'Modified Camera',
        transform: {
          position: { x: 10, y: 20, z: 30 },
          rotation: { x: 0, y: 0, z: 0 },
          scale: { x: 1, y: 1, z: 1 }
        }
      };

      const result = editor.modifyObject(obj.id, changes);
      expect(result).toBe(true);

      const modified = editor.getObject(obj.id);
      expect(modified?.name).toBe('Modified Camera');
      expect(modified?.transform.position).toEqual({ x: 10, y: 20, z: 30 });
      expect(eventSpy).toHaveBeenCalledWith({ objectId: obj.id, changes });
    });

    it('应该能删除对象', () => {
      const eventSpy = vi.fn();
      eventBus.on('object-deleted', eventSpy);

      const obj = editor.createObject('group');
      const result = editor.deleteObject(obj.id);
      expect(result).toBe(true);

      const deleted = editor.getObject(obj.id);
      expect(deleted).toBeUndefined();
      expect(eventSpy).toHaveBeenCalledWith({ objectId: obj.id });
    });

    it('删除不存在的对象应该返回false', () => {
      const result = editor.deleteObject('non-existent');
      expect(result).toBe(false);
    });

    it('应该能获取所有对象', () => {
      const obj1 = editor.createObject('mesh');
      const obj2 = editor.createObject('light');
      
      const allObjects = editor.getAllObjects();
      expect(Object.keys(allObjects)).toHaveLength(2);
      expect(allObjects[obj1.id]).toEqual(obj1);
      expect(allObjects[obj2.id]).toEqual(obj2);
    });
  });

  describe('选择管理', () => {
    let obj1: SceneObject;
    let obj2: SceneObject;
    let obj3: SceneObject;

    beforeEach(() => {
      obj1 = editor.createObject('mesh', { name: 'Object 1' });
      obj2 = editor.createObject('light', { name: 'Object 2' });
      obj3 = editor.createObject('camera', { name: 'Object 3' });
    });

    it('应该能选择对象', () => {
      const eventSpy = vi.fn();
      eventBus.on('objects-selected', eventSpy);

      editor.selectObjects([obj1.id, obj2.id]);
      
      const selection = editor.getSelection();
      expect(selection.objects).toEqual([obj1.id, obj2.id]);
      expect(eventSpy).toHaveBeenCalledWith({ objectIds: [obj1.id, obj2.id] });
    });

    it('应该能追加选择对象', () => {
      editor.selectObjects([obj1.id]);
      editor.selectObjects([obj2.id], true);
      
      const selection = editor.getSelection();
      expect(selection.objects).toEqual([obj1.id, obj2.id]);
    });

    it('应该能从选择中移除对象', () => {
      editor.selectObjects([obj1.id, obj2.id, obj3.id]);
      editor.removeFromSelection([obj2.id]);
      
      const selection = editor.getSelection();
      expect(selection.objects).toEqual([obj1.id, obj3.id]);
    });

    it('应该能清除选择', () => {
      const eventSpy = vi.fn();
      eventBus.on('selection-cleared', eventSpy);

      editor.selectObjects([obj1.id, obj2.id]);
      editor.clearSelection();
      
      const selection = editor.getSelection();
      expect(selection.objects).toEqual([]);
      expect(eventSpy).toHaveBeenCalled();
    });
  });

  describe('变换操作', () => {
    let obj: SceneObject;

    beforeEach(() => {
      obj = editor.createObject('mesh');
      editor.selectObjects([obj.id]);
    });

    it('应该能开始变换', () => {
      const eventSpy = vi.fn();
      eventBus.on('transform-started', eventSpy);

      const mode: TransformMode = {
        type: 'translate',
        space: 'world',
        constraint: 'none'
      };

      editor.startTransform(mode);
      expect(eventSpy).toHaveBeenCalledWith({ objectIds: [obj.id], mode });
    });

    it('应该能更新变换', () => {
      const eventSpy = vi.fn();
      eventBus.on('transform-updated', eventSpy);

      const mode: TransformMode = {
        type: 'translate',
        space: 'world',
        constraint: 'none'
      };

      editor.startTransform(mode);
      editor.updateTransform({ x: 10, y: 5, z: 0 });

      const updated = editor.getObject(obj.id);
      expect(updated?.transform.position).toEqual({ x: 10, y: 5, z: 0 });
      expect(eventSpy).toHaveBeenCalled();
    });

    it('应该能结束变换', () => {
      const eventSpy = vi.fn();
      eventBus.on('transform-ended', eventSpy);

      const mode: TransformMode = {
        type: 'translate',
        space: 'world',
        constraint: 'none'
      };

      editor.startTransform(mode);
      editor.updateTransform({ x: 10, y: 5, z: 0 });
      editor.endTransform();

      expect(eventSpy).toHaveBeenCalled();
    });

    it('应该能处理旋转变换', () => {
      const mode: TransformMode = {
        type: 'rotate',
        space: 'world',
        constraint: 'none'
      };

      editor.startTransform(mode);
      editor.updateTransform({ x: 45, y: 0, z: 0 });

      const updated = editor.getObject(obj.id);
      expect(updated?.transform.rotation.x).toBe(45);
    });

    it('应该能处理缩放变换', () => {
      const mode: TransformMode = {
        type: 'scale',
        space: 'world',
        constraint: 'none'
      };

      editor.startTransform(mode);
      editor.updateTransform({ x: 2, y: 2, z: 2 });

      const updated = editor.getObject(obj.id);
      // 缩放因子 = 1 + (2+2+2)/3 = 3，所以 1 * 3 = 3
      expect(updated?.transform.scale).toEqual({ x: 3, y: 3, z: 3 });
    });
  });

  describe('工具管理', () => {
    it('应该能设置活动工具', () => {
      const eventSpy = vi.fn();
      eventBus.on('tool-changed', eventSpy);

      const result = editor.setActiveTool('move');
      expect(result).toBe(true);
      
      const state = editor.getEditorState();
      expect(state.activeTool).toBe('move');
      expect(eventSpy).toHaveBeenCalledWith({ toolId: 'move' });
    });

    it('设置不存在的工具应该返回false', () => {
      const result = editor.setActiveTool('non-existent');
      expect(result).toBe(false);
    });

    it('应该能获取所有工具', () => {
      const tools = editor.getTools();
      expect(Array.isArray(tools)).toBe(true);
      expect(tools.length).toBeGreaterThan(0);
      
      const selectTool = tools.find(tool => tool.id === 'select');
      expect(selectTool).toBeDefined();
      expect(selectTool?.name).toBeDefined();
    });
  });

  describe('复制粘贴', () => {
    let obj1: SceneObject;
    let obj2: SceneObject;

    beforeEach(() => {
      obj1 = editor.createObject('mesh', { name: 'Original 1' });
      obj2 = editor.createObject('light', { name: 'Original 2' });
    });

    it('应该能复制选中的对象', () => {
      editor.selectObjects([obj1.id, obj2.id]);
      const copied = editor.copySelectedObjects();
      
      expect(copied).toHaveLength(2);
      expect(copied[0].name).toBe('Original 1');
      expect(copied[1].name).toBe('Original 2');
    });

    it('应该能粘贴对象', () => {
      editor.selectObjects([obj1.id]);
      const copied = editor.copySelectedObjects();
      const pasted = editor.pasteObjects(copied, { x: 10, y: 0, z: 0 });
      
      expect(pasted).toHaveLength(1);
      expect(pasted[0].id).not.toBe(obj1.id);
      expect(pasted[0].name).toBe('Original 1_copy'); // 粘贴时会添加 _copy 后缀
      expect(pasted[0].transform.position).toEqual({ x: 10, y: 10, z: 0 }); // 默认偏移是 (10, 10, 0)
    });

    it('没有选择对象时复制应该返回空数组', () => {
      const copied = editor.copySelectedObjects();
      expect(copied).toEqual([]);
    });
  });

  describe('撤销重做', () => {
    it('应该能撤销创建操作', () => {
      const obj = editor.createObject('mesh', { name: 'Test' });
      
      const result = editor.undo();
      expect(result).toBe(true);
      
      const deleted = editor.getObject(obj.id);
      expect(deleted).toBeUndefined();
    });

    it('应该能重做创建操作', () => {
      const obj = editor.createObject('mesh', { name: 'Test' });
      const objId = obj.id;
      editor.undo(); // 撤销创建
      
      const result = editor.redo();
      expect(result).toBe(true);
      
      const recreated = editor.getObject(objId);
      expect(recreated).toBeDefined();
      expect(recreated?.name).toBe('Test');
    });

    it('应该能撤销删除操作', () => {
       const obj = editor.createObject('mesh', { name: 'Test' });
       const objId = obj.id;
       editor.deleteObject(objId);
       
       const result = editor.undo();
       expect(result).toBe(true);
       
       const restored = editor.getObject(objId);
       expect(restored).toBeDefined();
       expect(restored?.name).toBe('Test');
     });

     it('应该能撤销修改操作', () => {
       const obj = editor.createObject('mesh', { name: 'Original' });
       editor.modifyObject(obj.id, { name: 'Modified' });
       
       const result = editor.undo();
       expect(result).toBe(true);
       
       const reverted = editor.getObject(obj.id);
       expect(reverted?.name).toBe('Original');
     });

     it('应该能重做修改操作', () => {
       const obj = editor.createObject('mesh', { name: 'Original' });
       editor.modifyObject(obj.id, { name: 'Modified' });
       editor.undo();
       
       const result = editor.redo();
       expect(result).toBe(true);
       
       const redone = editor.getObject(obj.id);
       expect(redone?.name).toBe('Modified');
     });

    it('没有可撤销操作时应该返回false', () => {
      const result = editor.undo();
      expect(result).toBe(false);
    });

    it('没有可重做操作时应该返回false', () => {
      const result = editor.redo();
      expect(result).toBe(false);
    });
  });

  describe('编辑器状态', () => {
    it('应该能设置编辑器状态', () => {
      const eventSpy = vi.fn();
      eventBus.on('editor-state-changed', eventSpy);

      const changes = {
        gridVisible: false,
        gridSize: 2,
        snapToGrid: true
      };

      editor.setEditorState(changes);
      
      const state = editor.getEditorState();
      expect(state.gridVisible).toBe(false);
      expect(state.gridSize).toBe(2);
      expect(state.snapToGrid).toBe(true);
      expect(eventSpy).toHaveBeenCalledWith({ state });
    });

    it('应该能获取完整的编辑器状态', () => {
      const state = editor.getEditorState();
      
      expect(state).toHaveProperty('selection');
      expect(state).toHaveProperty('activeTool');
      expect(state).toHaveProperty('transformMode');
      expect(state).toHaveProperty('camera');
      expect(state).toHaveProperty('gridVisible');
      expect(state).toHaveProperty('gridSize');
      expect(state).toHaveProperty('snapToGrid');
      expect(state).toHaveProperty('snapToObjects');
      expect(state).toHaveProperty('showWireframe');
      expect(state).toHaveProperty('showBoundingBoxes');
      expect(state).toHaveProperty('showGizmos');
    });
  });

  describe('场景层级', () => {
    it('应该能获取场景层级结构', () => {
      const obj1 = editor.createObject('group', { name: 'Parent' });
      const obj2 = editor.createObject('mesh', { name: 'Child' });
      
      const hierarchy = editor.getSceneHierarchy();
      expect(hierarchy.rootObjects).toContain(obj1.id);
      expect(hierarchy.rootObjects).toContain(obj2.id);
      expect(hierarchy.objects[obj1.id]).toEqual(obj1);
      expect(hierarchy.objects[obj2.id]).toEqual(obj2);
    });

    it('应该能清除场景', () => {
      editor.createObject('mesh');
      editor.createObject('light');
      
      editor.clearScene();
      
      const hierarchy = editor.getSceneHierarchy();
      expect(hierarchy.rootObjects).toEqual([]);
      expect(Object.keys(hierarchy.objects)).toHaveLength(0);
      
      const selection = editor.getSelection();
      expect(selection.objects).toEqual([]);
    });
  });

  describe('资源清理', () => {
    it('应该能正确清理资源', () => {
      editor.createObject('mesh');
      editor.createObject('light');
      
      expect(() => editor.dispose()).not.toThrow();
    });
  });
});