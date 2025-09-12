import {
  CanvasSDK,
  createCanvasSDK,
  ICanvasSDKConfig,
  ShapeEntity
} from '@sky-canvas/canvas-sdk';
import { useMemoizedFn } from 'ahooks';
import { useEffect, useMemo, useRef, useState } from 'react';

/**
 * Canvas SDK状态接口
 */
export interface CanvasSDKState {
  /** SDK实例 */
  sdk: CanvasSDK | null;
  /** 是否已初始化 */
  isInitialized: boolean;
  /** 所有形状 */
  shapes: ShapeEntity[];
  /** 选中的形状 */
  selectedShapes: ShapeEntity[];
  /** 是否可撤销 */
  canUndo: boolean;
  /** 是否可重做 */
  canRedo: boolean;
}

/**
 * Canvas SDK操作接口
 */
export interface CanvasSDKActions {
  /** 初始化SDK */
  initialize: (canvas: HTMLCanvasElement, config?: ICanvasSDKConfig) => Promise<void>;
  /** 获取Canvas管理器 */
  getCanvasManager: () => any;
  /** 获取Tool管理器 */
  getToolManager: () => any;
  /** 添加形状 */
  addShape: (entity: ShapeEntity) => void;
  /** 移除形状 */
  removeShape: (id: string) => void;
  /** 更新形状 */
  updateShape: (id: string, updates: Partial<ShapeEntity>) => void;
  /** 选择形状 */
  selectShape: (id: string) => void;
  /** 取消选择形状 */
  deselectShape: (id: string) => void;
  /** 清空选择 */
  clearSelection: () => void;
  /** 点击测试 */
  hitTest: (point: { x: number; y: number }) => string | null;
  /** 撤销 */
  undo: () => void;
  /** 重做 */
  redo: () => void;
  /** 清空所有形状 */
  clearShapes: () => void;
  /** 设置工具 */
  setTool: (toolName: string) => boolean;
  /** 事件监听 */
  on: (eventName: string, callback: Function) => void;
  /** 移除事件监听 */
  off: (eventName: string, callback?: Function) => void;
  /** 销毁SDK */
  dispose: () => void;
}

/**
 * useCanvasSDK Hook返回类型
 */
export type UseCanvasSDKResult = [CanvasSDKState, CanvasSDKActions];

/**
 * useCanvasSDK Hook
 * 
 * 提供Canvas SDK的React集成，管理SDK实例的生命周期和状态同步
 */
export function useCanvasSDK(): UseCanvasSDKResult {
  const sdkRef = useRef<CanvasSDK | null>(null);
  
  const [state, setState] = useState<CanvasSDKState>({
    sdk: null,
    isInitialized: false,
    shapes: [],
    selectedShapes: [],
    canUndo: false,
    canRedo: false,
  });

  /**
   * 更新状态
   */
  const updateState = useMemoizedFn(() => {
    const sdk = sdkRef.current;
    if (!sdk) return;

    const manager = sdk.getCanvasManager();
    if (!manager) return;

    setState((prev: typeof state) => ({
      ...prev,
      sdk,
      shapes: manager.getRenderables() || [],
      selectedShapes: manager.getSelectedShapes() || [],
      canUndo: false, // TODO: 从CanvasManager获取实际状态
      canRedo: false, // TODO: 从CanvasManager获取实际状态
    }));
  });

  /**
   * 初始化SDK
   */
  const initialize = useMemoizedFn(async (
    canvas: HTMLCanvasElement,
    config: ICanvasSDKConfig = {}
  ) => {
    console.log('Initialize called, current SDK:', sdkRef.current, 'isInitialized:', state.isInitialized);
    
    if (sdkRef.current) {
      console.log('SDK already initialized, throwing error');
      throw new Error('SDK already initialized');
    }

    // 创建SDK实例，需要传入canvas和配置
    const sdk = await createCanvasSDK({ 
      canvas,
      ...config 
    });
    
    try {
      // 设置事件监听器
      const eventHandlers = {
        'shape:added': () => updateState(),
        'shape:removed': () => updateState(),
        'shape:updated': () => updateState(),
        'shape:selected': () => updateState(),
        'shape:deselected': () => updateState(),
        'selection:cleared': () => updateState(),
      };

      // 注册所有事件监听器
      Object.keys(eventHandlers).forEach(eventName => {
        sdk.on(eventName, eventHandlers[eventName as keyof typeof eventHandlers]);
      });

      sdkRef.current = sdk;
      console.log('SDK reference set:', sdkRef.current);
      
      // 初始更新状态
      updateState();
      
      setState((prev: typeof state) => ({
        ...prev,
        sdk,
        isInitialized: true,
      }));

    } catch (error) {
      sdk.dispose();
      throw error;
    }
  });

  /**
   * 获取Canvas管理器
   */
  const getCanvasManager = useMemoizedFn(() => {
    if (!sdkRef.current) {
      throw new Error('SDK not initialized');
    }
    return sdkRef.current.getCanvasManager();
  });

  /**
   * 获取Tool管理器
   */
  const getToolManager = useMemoizedFn(() => {
    if (!sdkRef.current) {
      throw new Error('SDK not initialized');
    }
    return (sdkRef.current as any).getToolManager();
  });

  /**
   * 添加形状
   */
  const addShape = useMemoizedFn((entity: ShapeEntity) => {
    if (!sdkRef.current) {
      throw new Error('SDK not initialized');
    }
    const manager = sdkRef.current.getCanvasManager();
    manager.addShape(entity);
  });

  /**
   * 移除形状
   */
  const removeShape = useMemoizedFn((id: string) => {
    if (!sdkRef.current) {
      throw new Error('SDK not initialized');
    }
    const manager = sdkRef.current.getCanvasManager();
    manager.removeShape(id);
  });

  /**
   * 更新形状
   */
  const updateShape = useMemoizedFn((id: string, updates: Partial<ShapeEntity>) => {
    if (!sdkRef.current) {
      throw new Error('SDK not initialized');
    }
    const manager = sdkRef.current.getCanvasManager();
    manager.updateShape(id, updates);
  });

  /**
   * 选择形状
   */
  const selectShape = useMemoizedFn((id: string) => {
    if (!sdkRef.current) {
      throw new Error('SDK not initialized');
    }
    const manager = sdkRef.current.getCanvasManager();
    manager.selectShape(id);
  });

  /**
   * 取消选择形状
   */
  const deselectShape = useMemoizedFn((id: string) => {
    if (!sdkRef.current) {
      throw new Error('SDK not initialized');
    }
    const manager = sdkRef.current.getCanvasManager();
    manager.deselectShape(id);
  });

  /**
   * 清空选择
   */
  const clearSelection = useMemoizedFn(() => {
    if (!sdkRef.current) {
      throw new Error('SDK not initialized');
    }
    const manager = sdkRef.current.getCanvasManager();
    manager.clearSelection();
  });

  /**
   * 点击测试
   */
  const hitTest = useMemoizedFn((point: { x: number; y: number }) => {
    if (!sdkRef.current) {
      throw new Error('SDK not initialized');
    }
    const manager = sdkRef.current.getCanvasManager();
    return manager.hitTest(point.x, point.y);
  });

  /**
   * 撤销操作
   */
  const undo = useMemoizedFn(() => {
    if (!sdkRef.current) {
      throw new Error('SDK not initialized');
    }
    const manager = sdkRef.current.getCanvasManager();
    manager.undo();
  });

  /**
   * 重做操作
   */
  const redo = useMemoizedFn(() => {
    if (!sdkRef.current) {
      throw new Error('SDK not initialized');
    }
    const manager = sdkRef.current.getCanvasManager();
    manager.redo();
  });

  /**
   * 清空所有形状
   */
  const clearShapes = useMemoizedFn(() => {
    if (!sdkRef.current) {
      throw new Error('SDK not initialized');
    }
    const manager = sdkRef.current.getCanvasManager();
    manager.clear();
  });

  /**
   * 设置工具
   */
  const setTool = useMemoizedFn((toolName: string): boolean => {
    if (!sdkRef.current) {
      throw new Error('SDK not initialized');
    }
    const toolManager = (sdkRef.current as any).getToolManager();
    return toolManager.activateTool(toolName);
  });

  /**
   * 事件监听
   */
  const on = useMemoizedFn((eventName: string, callback: Function) => {
    if (!sdkRef.current) {
      throw new Error('SDK not initialized');
    }
    sdkRef.current.on(eventName, callback);
  });

  /**
   * 移除事件监听
   */
  const off = useMemoizedFn((eventName: string, callback?: Function) => {
    if (!sdkRef.current) {
      throw new Error('SDK not initialized');
    }
    sdkRef.current.off(eventName, callback);
  });

  /**
   * 销毁SDK
   */
  const dispose = useMemoizedFn(() => {
    console.log('dispose called, current SDK:', sdkRef.current);
    if (sdkRef.current) {
      sdkRef.current.dispose();
      sdkRef.current = null;
      setState({
        sdk: null,
        isInitialized: false,
        shapes: [],
        selectedShapes: [],
        canUndo: false,
        canRedo: false,
      });
    }
  });

  // 清理副作用 - 只在组件真正卸载时清理
  useEffect(() => {
    return () => {
      console.log('useCanvasSDK cleanup called');
      dispose();
    };
  }, []); // 空依赖数组，只在组件卸载时运行

  // 使用useMemo来稳定actions对象，避免无限循环
  const actions = useMemo(() => ({
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
    dispose,
  }), [
    initialize, getCanvasManager, getToolManager, addShape, removeShape, updateShape,
    selectShape, deselectShape, clearSelection, hitTest, undo, redo, clearShapes,
    setTool, on, off, dispose
  ]);

  return [state, actions];
}