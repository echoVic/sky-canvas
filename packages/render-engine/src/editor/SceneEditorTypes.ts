/**
 * 场景编辑器类型定义
 */

export interface Vector3 {
  x: number
  y: number
  z: number
}

export interface SceneObject {
  id: string
  name: string
  type: 'group' | 'mesh' | 'light' | 'camera' | 'particle' | 'text'

  transform: {
    position: Vector3
    rotation: Vector3
    scale: Vector3
  }

  parent?: string
  children: string[]

  visible: boolean
  locked: boolean
  selected: boolean

  properties: Record<string, unknown>
  components: Record<string, unknown>
}

export interface SceneHierarchy {
  rootObjects: string[]
  objects: Record<string, SceneObject>
}

export interface SelectionInfo {
  objects: string[]
  boundingBox?: {
    min: Vector3
    max: Vector3
    center: Vector3
  }
}

export interface EditorTool {
  id: string
  name: string
  icon: string
  active: boolean
  cursor: string
  hotkey?: string
}

export interface TransformMode {
  type: 'translate' | 'rotate' | 'scale'
  space: 'local' | 'world'
  constraint: 'none' | 'x' | 'y' | 'z' | 'xy' | 'xz' | 'yz'
}

export interface EditorState {
  selection: SelectionInfo
  activeTool: string
  transformMode: TransformMode

  camera: {
    position: Vector3
    target: Vector3
    zoom: number
  }

  gridVisible: boolean
  gridSize: number
  snapToGrid: boolean
  snapToObjects: boolean

  showWireframe: boolean
  showBoundingBoxes: boolean
  showGizmos: boolean
}

export interface HistoryEntry {
  action: string
  data: unknown
  timestamp: number
}

export interface SceneEditorEvents {
  'object-created': { object: SceneObject }
  'object-deleted': { objectId: string }
  'object-modified': { objectId: string; changes: Partial<SceneObject> }
  'objects-selected': { objectIds: string[] }
  'selection-cleared': Record<string, never>
  'transform-started': { objectIds: string[]; mode: TransformMode }
  'transform-updated': {
    objectIds: string[]
    transforms: Array<{ id: string; transform: SceneObject['transform'] }>
  }
  'transform-ended': {
    objectIds: string[]
    finalTransforms: Array<{ id: string; transform: SceneObject['transform'] }>
  }
  'hierarchy-changed': { parentId?: string; childIds: string[] }
  'tool-changed': { toolId: string }
  'editor-state-changed': { state: EditorState }
}

export function createDefaultEditorState(): EditorState {
  return {
    selection: { objects: [] },
    activeTool: 'select',
    transformMode: {
      type: 'translate',
      space: 'world',
      constraint: 'none',
    },
    camera: {
      position: { x: 0, y: 0, z: 10 },
      target: { x: 0, y: 0, z: 0 },
      zoom: 1,
    },
    gridVisible: true,
    gridSize: 1,
    snapToGrid: false,
    snapToObjects: false,
    showWireframe: false,
    showBoundingBoxes: true,
    showGizmos: true,
  }
}

export function createDefaultTools(): EditorTool[] {
  return [
    { id: 'select', name: 'Select', icon: 'cursor', active: true, cursor: 'default', hotkey: 'V' },
    { id: 'move', name: 'Move', icon: 'move', active: false, cursor: 'move', hotkey: 'G' },
    { id: 'rotate', name: 'Rotate', icon: 'rotate', active: false, cursor: 'grab', hotkey: 'R' },
    {
      id: 'scale',
      name: 'Scale',
      icon: 'scale',
      active: false,
      cursor: 'nwse-resize',
      hotkey: 'S',
    },
    { id: 'rectangle', name: 'Rectangle', icon: 'square', active: false, cursor: 'crosshair' },
    { id: 'circle', name: 'Circle', icon: 'circle', active: false, cursor: 'crosshair' },
    { id: 'text', name: 'Text', icon: 'text', active: false, cursor: 'text' },
  ]
}
