import {
  type CanvasSDK,
  createCanvasSDK,
  type ICanvasManager,
  type ICanvasSDKConfig,
  type IShapeEntity,
  type IToolManager,
  type ShapeEntity,
} from '@sky-canvas/canvas-sdk'
import { create } from 'zustand'

interface SDKState {
  sdk: CanvasSDK | null
  isInitialized: boolean
  shapes: IShapeEntity[]
  selectedShapes: ShapeEntity[]
  canUndo: boolean
  canRedo: boolean

  initialize: (canvas: HTMLCanvasElement, config?: ICanvasSDKConfig) => Promise<void>
  updateState: () => void

  getCanvasManager: () => ICanvasManager
  getToolManager: () => IToolManager
  addShape: (entity: ShapeEntity) => void
  removeShape: (id: string) => void
  updateShape: (id: string, updates: Partial<ShapeEntity>) => void
  selectShape: (id: string) => void
  deselectShape: (id: string) => void
  clearSelection: () => void
  hitTest: (point: { x: number; y: number }) => string | null
  undo: () => void
  redo: () => void
  setTool: (toolName: string) => boolean
  on: (eventName: string, callback: (...args: unknown[]) => void) => void
  off: (eventName: string, callback?: (...args: unknown[]) => void) => void
  bringToFront: (shapeIds?: string[]) => void
  sendToBack: (shapeIds?: string[]) => void
  bringForward: (shapeIds?: string[]) => void
  sendBackward: (shapeIds?: string[]) => void
  setZIndex: (shapeIds: string[], zIndex: number) => void
  getShapesByZOrder: () => IShapeEntity[]
  dispose: () => void
}

export const useSDKStore = create<SDKState>((set, get) => ({
  sdk: null,
  isInitialized: false,
  shapes: [],
  selectedShapes: [],
  canUndo: false,
  canRedo: false,

  updateState: () => {
    const { sdk } = get()
    if (!sdk) return

    const manager = sdk.getCanvasManager()
    if (!manager) return

    const stats = manager.getStats()
    const shapes = manager.getShapesByZOrder?.() || []
    const selectedShapes = manager.getSelectedShapes?.() || []

    set({
      shapes,
      selectedShapes,
      canUndo: stats?.history?.canUndo ?? false,
      canRedo: stats?.history?.canRedo ?? false,
    })
  },

  initialize: async (canvas: HTMLCanvasElement, config: ICanvasSDKConfig = {}) => {
    const { sdk: existingSDK, isInitialized } = get()

    if (existingSDK || isInitialized) {
      console.log('SDK already initialized, skipping')
      return
    }

    const sdk = await createCanvasSDK({
      canvas,
      ...config,
    })

    const eventHandlers = {
      'shape:added': () => get().updateState(),
      'shape:removed': () => get().updateState(),
      'shape:updated': () => get().updateState(),
      'shape:selected': () => get().updateState(),
      'shape:deselected': () => get().updateState(),
      'selection:cleared': () => get().updateState(),
      'history:executed': () => get().updateState(),
      'history:undone': () => get().updateState(),
      'history:redone': () => get().updateState(),
      'history:cleared': () => get().updateState(),
      'canvas:shapeAdded': () => get().updateState(),
      'canvas:shapeRemoved': () => get().updateState(),
      'canvas:shapeUpdated': () => get().updateState(),
    }

    Object.keys(eventHandlers).forEach((eventName) => {
      sdk.on(eventName, eventHandlers[eventName as keyof typeof eventHandlers])
    })

    set({ sdk, isInitialized: true })
    get().updateState()
  },

  getCanvasManager: () => {
    const { sdk } = get()
    if (!sdk) throw new Error('SDK not initialized')
    return sdk.getCanvasManager()
  },

  getToolManager: () => {
    const { sdk } = get()
    if (!sdk) throw new Error('SDK not initialized')
    return sdk.getToolManager()
  },

  addShape: (entity: ShapeEntity) => {
    const { sdk } = get()
    if (!sdk) return
    sdk.getCanvasManager().addShape(entity)
  },

  removeShape: (id: string) => {
    const { sdk } = get()
    if (!sdk) return
    sdk.getCanvasManager().removeShape(id)
  },

  updateShape: (id: string, updates: Partial<ShapeEntity>) => {
    const { sdk } = get()
    if (!sdk) return
    sdk.getCanvasManager().updateShape(id, updates)
  },

  selectShape: (id: string) => {
    const { sdk } = get()
    if (!sdk) return
    sdk.getCanvasManager().selectShape(id)
  },

  deselectShape: (id: string) => {
    const { sdk } = get()
    if (!sdk) return
    sdk.getCanvasManager().deselectShape(id)
  },

  clearSelection: () => {
    const { sdk } = get()
    if (!sdk) return
    sdk.getCanvasManager().clearSelection()
  },

  hitTest: (point: { x: number; y: number }) => {
    const { sdk } = get()
    if (!sdk) return null
    return sdk.getCanvasManager().hitTest(point.x, point.y)
  },

  undo: () => {
    const { sdk } = get()
    if (!sdk) return
    sdk.getCanvasManager().undo()
  },

  redo: () => {
    const { sdk } = get()
    if (!sdk) return
    sdk.getCanvasManager().redo()
  },

  setTool: (toolName: string) => {
    const { sdk } = get()
    if (!sdk) return false
    return sdk.getToolManager().activateTool(toolName)
  },

  on: (eventName: string, callback: (...args: unknown[]) => void) => {
    const { sdk } = get()
    if (!sdk) return
    sdk.on(eventName, callback)
  },

  off: (eventName: string, callback?: (...args: unknown[]) => void) => {
    const { sdk } = get()
    if (!sdk) return
    sdk.off(eventName, callback)
  },

  bringToFront: (shapeIds?: string[]) => {
    const { sdk, selectedShapes } = get()
    if (!sdk) return
    const ids = shapeIds || selectedShapes.map((s) => s.id)
    if (ids.length > 0) {
      sdk.getCanvasManager().bringToFront(ids)
    }
  },

  sendToBack: (shapeIds?: string[]) => {
    const { sdk, selectedShapes } = get()
    if (!sdk) return
    const ids = shapeIds || selectedShapes.map((s) => s.id)
    if (ids.length > 0) {
      sdk.getCanvasManager().sendToBack(ids)
    }
  },

  bringForward: (shapeIds?: string[]) => {
    const { sdk, selectedShapes } = get()
    if (!sdk) return
    const ids = shapeIds || selectedShapes.map((s) => s.id)
    if (ids.length > 0) {
      sdk.getCanvasManager().bringForward(ids)
    }
  },

  sendBackward: (shapeIds?: string[]) => {
    const { sdk, selectedShapes } = get()
    if (!sdk) return
    const ids = shapeIds || selectedShapes.map((s) => s.id)
    if (ids.length > 0) {
      sdk.getCanvasManager().sendBackward(ids)
    }
  },

  setZIndex: (shapeIds: string[], zIndex: number) => {
    const { sdk } = get()
    if (!sdk) return
    sdk.getCanvasManager().setZIndex?.(shapeIds, zIndex)
  },

  getShapesByZOrder: () => {
    const { sdk } = get()
    if (!sdk) return []
    return sdk.getCanvasManager().getShapesByZOrder?.() || []
  },

  dispose: () => {
    const { sdk } = get()
    if (sdk) {
      sdk.dispose()
    }
    set({ sdk: null, isInitialized: false, shapes: [], selectedShapes: [] })
  },
}))
