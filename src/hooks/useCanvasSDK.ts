import {
  type CanvasSDK,
  createCanvasSDK,
  type ICanvasSDKConfig,
  type IShapeEntity,
  type ShapeEntity,
} from '@sky-canvas/canvas-sdk'
import { useMemoizedFn } from 'ahooks'
import { useEffect, useMemo, useRef, useState } from 'react'

/**
 * Canvas SDK状态接口
 */
export interface CanvasSDKState {
  /** SDK实例 */
  sdk: CanvasSDK | null
  /** 是否已初始化 */
  isInitialized: boolean
  /** 所有形状 */
  shapes: IShapeEntity[]
  /** 选中的形状 */
  selectedShapes: ShapeEntity[]
  /** 是否可撤销 */
  canUndo: boolean
  /** 是否可重做 */
  canRedo: boolean
}

/**
 * Canvas SDK操作接口
 */
export interface CanvasSDKActions {
  /** 初始化SDK */
  initialize: (canvas: HTMLCanvasElement, config?: ICanvasSDKConfig) => Promise<void>
  /** 获取Canvas管理器 */
  getCanvasManager: () => any
  /** 获取Tool管理器 */
  getToolManager: () => any
  /** 添加形状 */
  addShape: (entity: ShapeEntity) => void
  /** 移除形状 */
  removeShape: (id: string) => void
  /** 更新形状 */
  updateShape: (id: string, updates: Partial<ShapeEntity>) => void
  /** 选择形状 */
  selectShape: (id: string) => void
  /** 取消选择形状 */
  deselectShape: (id: string) => void
  /** 清空选择 */
  clearSelection: () => void
  /** 点击测试 */
  hitTest: (point: { x: number; y: number }) => string | null
  /** 撤销 */
  undo: () => void
  /** 重做 */
  redo: () => void
  /** 清空所有形状 */
  clearShapes: () => void
  /** 设置工具 */
  setTool: (toolName: string) => boolean
  /** 事件监听 */
  on: (eventName: string, callback: (...args: unknown[]) => void) => void
  /** 移除事件监听 */
  off: (eventName: string, callback?: (...args: unknown[]) => void) => void
  /** 置顶 */
  bringToFront: () => void
  /** 置底 */
  sendToBack: () => void
  /** 上移一层 */
  bringForward: () => void
  /** 下移一层 */
  sendBackward: () => void
  /** 设置zIndex */
  setZIndex: (shapeIds: string[], zIndex: number) => void
  /** 按Z轴顺序获取形状 */
  getShapesByZOrder: () => IShapeEntity[]
  /** 销毁SDK */
  dispose: () => void
}

/**
 * useCanvasSDK Hook返回类型
 */
export type UseCanvasSDKResult = [CanvasSDKState, CanvasSDKActions]

/**
 * useCanvasSDK Hook
 *
 * 提供Canvas SDK的React集成，管理SDK实例的生命周期和状态同步
 */
export function useCanvasSDK(): UseCanvasSDKResult {
  const sdkRef = useRef<CanvasSDK | null>(null)

  const [state, setState] = useState<CanvasSDKState>({
    sdk: null,
    isInitialized: false,
    shapes: [],
    selectedShapes: [],
    canUndo: false,
    canRedo: false,
  })

  /**
   * 更新状态
   */
  const updateState = useMemoizedFn(() => {
    const sdk = sdkRef.current
    if (!sdk) return

    const manager = sdk.getCanvasManager()
    if (!manager) return

    const stats = manager.getStats()
    const shapes = manager.getShapesByZOrder?.() || []
    const selectedShapes = manager.getSelectedShapes?.() || []

    setState((prev) => ({
      ...prev,
      sdk,
      shapes,
      selectedShapes,
      canUndo: stats?.history?.canUndo ?? false,
      canRedo: stats?.history?.canRedo ?? false,
    }))
  })

  /**
   * 初始化SDK
   */
  const initialize = useMemoizedFn(
    async (canvas: HTMLCanvasElement, config: ICanvasSDKConfig = {}) => {
      console.log(
        'Initialize called, current SDK:',
        sdkRef.current,
        'isInitialized:',
        state.isInitialized
      )

      // 如果已经初始化，直接返回（不抛出错误，支持 StrictMode 双重调用）
      if (sdkRef.current) {
        console.log('SDK already initialized, skipping')
        return
      }

      // 创建SDK实例，需要传入canvas和配置
      const sdk = await createCanvasSDK({
        canvas,
        ...config,
      })

      try {
        // 设置事件监听器
        const eventHandlers = {
          'shape:added': () => updateState(),
          'shape:removed': () => updateState(),
          'shape:updated': () => updateState(),
          'shape:selected': () => updateState(),
          'shape:deselected': () => updateState(),
          'selection:cleared': () => updateState(),
          // 历史记录事件
          'history:executed': () => updateState(),
          'history:undone': () => updateState(),
          'history:redone': () => updateState(),
          'history:cleared': () => updateState(),
          // canvas 事件
          'canvas:shapeAdded': () => updateState(),
          'canvas:shapeRemoved': () => updateState(),
          'canvas:shapeUpdated': () => updateState(),
        }

        // 注册所有事件监听器
        Object.keys(eventHandlers).forEach((eventName) => {
          sdk.on(eventName, eventHandlers[eventName as keyof typeof eventHandlers])
        })

        sdkRef.current = sdk
        console.log('SDK reference set:', sdkRef.current)

        // 设置初始化状态和SDK实例（在更新状态之前设置 isInitialized）
        setState((prev: typeof state) => ({
          ...prev,
          sdk,
          isInitialized: true,
        }))

        // 然后更新形状等状态
        updateState()
      } catch (error) {
        sdk.dispose()
        throw error
      }
    }
  )

  /**
   * 获取Canvas管理器
   */
  const getCanvasManager = useMemoizedFn(() => {
    if (!sdkRef.current) {
      throw new Error('SDK not initialized')
    }
    return sdkRef.current.getCanvasManager()
  })

  /**
   * 获取Tool管理器
   */
  const getToolManager = useMemoizedFn(() => {
    if (!sdkRef.current) {
      throw new Error('SDK not initialized')
    }
    return (sdkRef.current as any).getToolManager()
  })

  /**
   * 添加形状
   */
  const addShape = useMemoizedFn((entity: ShapeEntity) => {
    if (!sdkRef.current) {
      throw new Error('SDK not initialized')
    }
    const manager = sdkRef.current.getCanvasManager()
    manager.addShape(entity)
  })

  /**
   * 移除形状
   */
  const removeShape = useMemoizedFn((id: string) => {
    if (!sdkRef.current) {
      throw new Error('SDK not initialized')
    }
    const manager = sdkRef.current.getCanvasManager()
    manager.removeShape(id)
  })

  /**
   * 更新形状
   */
  const updateShape = useMemoizedFn((id: string, updates: Partial<ShapeEntity>) => {
    if (!sdkRef.current) {
      throw new Error('SDK not initialized')
    }
    const manager = sdkRef.current.getCanvasManager()
    manager.updateShape(id, updates)
  })

  /**
   * 选择形状
   */
  const selectShape = useMemoizedFn((id: string) => {
    if (!sdkRef.current) {
      throw new Error('SDK not initialized')
    }
    const manager = sdkRef.current.getCanvasManager()
    manager.selectShape(id)
  })

  /**
   * 取消选择形状
   */
  const deselectShape = useMemoizedFn((id: string) => {
    if (!sdkRef.current) {
      throw new Error('SDK not initialized')
    }
    const manager = sdkRef.current.getCanvasManager()
    manager.deselectShape(id)
  })

  /**
   * 清空选择
   */
  const clearSelection = useMemoizedFn(() => {
    if (!sdkRef.current) {
      throw new Error('SDK not initialized')
    }
    const manager = sdkRef.current.getCanvasManager()
    manager.clearSelection()
  })

  /**
   * 点击测试
   */
  const hitTest = useMemoizedFn((point: { x: number; y: number }) => {
    if (!sdkRef.current) {
      throw new Error('SDK not initialized')
    }
    const manager = sdkRef.current.getCanvasManager()
    return manager.hitTest(point.x, point.y)
  })

  /**
   * 撤销操作
   */
  const undo = useMemoizedFn(() => {
    if (!sdkRef.current) {
      throw new Error('SDK not initialized')
    }
    const manager = sdkRef.current.getCanvasManager()
    manager.undo()
  })

  /**
   * 重做操作
   */
  const redo = useMemoizedFn(() => {
    if (!sdkRef.current) {
      throw new Error('SDK not initialized')
    }
    const manager = sdkRef.current.getCanvasManager()
    manager.redo()
  })

  /**
   * 清空所有形状
   */
  const clearShapes = useMemoizedFn(() => {
    if (!sdkRef.current) {
      throw new Error('SDK not initialized')
    }
    const manager = sdkRef.current.getCanvasManager()
    manager.clear()
  })

  /**
   * 设置工具
   */
  const setTool = useMemoizedFn((toolName: string): boolean => {
    if (!sdkRef.current) {
      throw new Error('SDK not initialized')
    }
    const toolManager = (sdkRef.current as any).getToolManager()
    return toolManager.activateTool(toolName)
  })

  /**
   * 事件监听
   */
  const on = useMemoizedFn((eventName: string, callback: (...args: unknown[]) => void) => {
    if (!sdkRef.current) {
      throw new Error('SDK not initialized')
    }
    sdkRef.current.on(eventName, callback)
  })

  /**
   * 移除事件监听
   */
  const off = useMemoizedFn((eventName: string, callback?: (...args: unknown[]) => void) => {
    if (!sdkRef.current) {
      throw new Error('SDK not initialized')
    }
    sdkRef.current.off(eventName, callback)
  })

  // === Z轴管理方法 ===

  /**
   * 置顶 - 将选中的形状移到最前面
   */
  const bringToFront = useMemoizedFn(() => {
    if (!sdkRef.current) {
      throw new Error('SDK not initialized')
    }
    const manager = sdkRef.current.getCanvasManager()
    const selectedIds = manager.getSelectedShapes().map((shape: any) => shape.id)
    if (selectedIds.length > 0) {
      manager.bringToFront(selectedIds)
    }
  })

  /**
   * 置底 - 将选中的形状移到最后面
   */
  const sendToBack = useMemoizedFn(() => {
    if (!sdkRef.current) {
      throw new Error('SDK not initialized')
    }
    const manager = sdkRef.current.getCanvasManager()
    const selectedIds = manager.getSelectedShapes().map((shape: any) => shape.id)
    if (selectedIds.length > 0) {
      manager.sendToBack(selectedIds)
    }
  })

  /**
   * 上移一层
   */
  const bringForward = useMemoizedFn(() => {
    if (!sdkRef.current) {
      throw new Error('SDK not initialized')
    }
    const manager = sdkRef.current.getCanvasManager()
    const selectedIds = manager.getSelectedShapes().map((shape: any) => shape.id)
    if (selectedIds.length > 0) {
      manager.bringForward(selectedIds)
    }
  })

  /**
   * 下移一层
   */
  const sendBackward = useMemoizedFn(() => {
    if (!sdkRef.current) {
      throw new Error('SDK not initialized')
    }
    const manager = sdkRef.current.getCanvasManager()
    const selectedIds = manager.getSelectedShapes().map((shape: any) => shape.id)
    if (selectedIds.length > 0) {
      manager.sendBackward(selectedIds)
    }
  })

  /**
   * 设置指定形状的zIndex
   */
  const setZIndex = useMemoizedFn((shapeIds: string[], zIndex: number) => {
    if (!sdkRef.current) {
      throw new Error('SDK not initialized')
    }
    const manager = sdkRef.current.getCanvasManager()
    manager.setZIndex(shapeIds, zIndex)
  })

  /**
   * 获取按Z轴顺序排序的形状
   */
  const getShapesByZOrder = useMemoizedFn(() => {
    if (!sdkRef.current) {
      throw new Error('SDK not initialized')
    }
    const manager = sdkRef.current.getCanvasManager()
    return manager.getShapesByZOrder()
  })

  // 使用 ref 跟踪是否正在被 StrictMode 卸载
  const isMountedRef = useRef(false)

  /**
   * 销毁SDK
   */
  const dispose = useMemoizedFn(() => {
    console.log('dispose called, current SDK:', sdkRef.current)
    if (sdkRef.current) {
      sdkRef.current.dispose()
      sdkRef.current = null
      setState({
        sdk: null,
        isInitialized: false,
        shapes: [],
        selectedShapes: [],
        canUndo: false,
        canRedo: false,
      })
    }
  })

  // 跟踪组件挂载状态
  useEffect(() => {
    isMountedRef.current = true
    return () => {
      isMountedRef.current = false
    }
  }, [])

  // 清理副作用 - 只在组件真正卸载时清理（延迟执行以避免 StrictMode 问题）
  useEffect(() => {
    return () => {
      console.log('useCanvasSDK cleanup called')
      // 使用 setTimeout 延迟 dispose，让 StrictMode 的重新挂载有机会执行
      setTimeout(() => {
        if (!isMountedRef.current) {
          dispose()
        }
      }, 0)
    }
  }, []) // 空依赖数组，只在组件卸载时运行

  // 使用useMemo来稳定actions对象，避免无限循环
  const actions = useMemo(
    () => ({
      initialize,
      getCanvasManager,
      getToolManager,
      addShape,
      removeShape,
      updateShape,
      selectShape,
      deselectShape,
      clearSelection,
      hitTest,
      undo,
      redo,
      clearShapes,
      setTool,
      on,
      off,
      // Z轴管理方法
      bringToFront,
      sendToBack,
      bringForward,
      sendBackward,
      setZIndex,
      getShapesByZOrder,
      dispose,
    }),
    [
      initialize,
      getCanvasManager,
      getToolManager,
      addShape,
      removeShape,
      updateShape,
      selectShape,
      deselectShape,
      clearSelection,
      hitTest,
      undo,
      redo,
      clearShapes,
      setTool,
      on,
      off,
      bringToFront,
      sendToBack,
      bringForward,
      sendBackward,
      setZIndex,
      getShapesByZOrder,
      dispose,
    ]
  )

  return [state, actions]
}
