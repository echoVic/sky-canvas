import {
  createCanvasSDK,
  type Action,
  type ICanvasSDK,
  type ICanvasSDKConfig,
  type SDKChangeEvent
} from '@sky-canvas/canvas-sdk';
import { useMemoizedFn } from 'ahooks';
import { useEffect, useMemo, useRef, useState } from 'react';
import { AnyShapeData } from '../types';

/**
 * Canvas SDK状态接口
 */
export interface CanvasSDKState {
  /** SDK实例 */
  sdk: ICanvasSDK | null;
  /** 是否已初始化 */
  isInitialized: boolean;
  /** 所有形状 */
  shapes: AnyShapeData[];
  /** 选中的形状ID列表 */
  selectedShapeIds: string[];
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
  initialize: (container: HTMLElement, config?: ICanvasSDKConfig) => Promise<void>;
  /** 分发Action */
  dispatch: (action: Action) => Promise<void>;
  /** 添加矩形 */
  addRectangle: (params: { x: number; y: number; width: number; height: number; style?: any }) => Promise<void>;
  /** 添加圆形 */
  addCircle: (params: { x: number; y: number; radius: number; style?: any }) => Promise<void>;
  /** 添加文本 */
  addText: (params: { x: number; y: number; text: string; style?: any }) => Promise<void>;
  /** 删除形状 */
  deleteShape: (shapeId: string) => Promise<void>;
  /** 删除选中形状 */
  deleteSelected: () => Promise<void>;
  /** 更新形状 */
  updateShape: (shapeId: string, updates: any) => Promise<void>;
  /** 选择形状 */
  selectShapes: (shapeIds: string[], addToSelection?: boolean) => Promise<void>;
  /** 取消选择形状 */
  deselectShape: (shapeId: string) => Promise<void>;
  /** 清空选择 */
  clearSelection: () => Promise<void>;
  /** 全选 */
  selectAll: () => Promise<void>;
  /** 反选 */
  invertSelection: () => Promise<void>;
  /** 置顶 */
  bringToFront: (shapeIds?: string[]) => Promise<void>;
  /** 置底 */
  sendToBack: (shapeIds?: string[]) => Promise<void>;
  /** 上移一层 */
  bringForward: (shapeIds?: string[]) => Promise<void>;
  /** 下移一层 */
  sendBackward: (shapeIds?: string[]) => Promise<void>;
  /** 设置Z-index */
  setZIndex: (shapeIds: string[], zIndex: number) => Promise<void>;
  /** 设置工具 */
  setTool: (toolType: string, previousTool?: string) => Promise<void>;
  /** 撤销 */
  undo: () => Promise<void>;
  /** 重做 */
  redo: () => Promise<void>;
  /** 清空历史记录 */
  clearHistory: () => void;
  /** 批量操作 */
  batchActions: (actions: Action[], transactional?: boolean) => Promise<void>;
  /** 导入文件 */
  importFile: (params: { file?: File; url?: string; format?: string; replaceExisting?: boolean; position?: { x: number; y: number } }) => Promise<void>;
  /** 导出文件 */
  exportFile: (params: { filename?: string; format: string; quality?: number; includeOnlySelected?: boolean; bounds?: any }) => Promise<void>;
  /** 自动保存 */
  enableAutoSave: (params: { target: string; key?: string; url?: string; interval?: number; enableCompression?: boolean }) => Promise<void>;
  /** 插件管理 */
  registerPlugin: (plugin: any) => Promise<void>;
  unregisterPlugin: (pluginId: string) => Promise<void>;
  activatePlugin: (pluginId: string) => Promise<void>;
  deactivatePlugin: (pluginId: string) => Promise<void>;
  getPlugins: () => any[];
  getActivePlugins: () => any[];
  isPluginActive: (pluginId: string) => boolean;
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
  const sdkRef = useRef<ICanvasSDK | null>(null);
  
  const [state, setState] = useState<CanvasSDKState>({
    sdk: null,
    isInitialized: false,
    shapes: [],
    selectedShapeIds: [],
    canUndo: false,
    canRedo: false,
  });

  const unsubscribeRef = useRef<(() => void) | null>(null);

  /**
   * 更新状态
   */
  const updateState = useMemoizedFn(() => {
    const sdk = sdkRef.current;
    if (!sdk) return;

    const shapes = sdk.getShapeData();
    const selectedShapeIds = sdk.getSelection();
    const historyStats = sdk.getHistoryStats();

    setState((prev: typeof state) => ({
      ...prev,
      sdk,
      shapes: shapes || [],
      selectedShapeIds: selectedShapeIds || [],
      canUndo: historyStats.canUndo,
      canRedo: historyStats.canRedo,
    }));
  });

  /**
   * 初始化SDK
   */
  const initialize = useMemoizedFn(async (
    container: HTMLElement,
    config: ICanvasSDKConfig = {}
  ) => {
    console.log('Initialize called, current SDK:', sdkRef.current, 'isInitialized:', state.isInitialized);

    if (sdkRef.current) {
      console.log('SDK already initialized, skipping re-initialization');
      return; // 改为直接返回，而不是抛出错误
    }

    // 创建SDK实例，需要传入container和配置
    const sdk = await createCanvasSDK({
      container,
      ...config
    });

    try {
      // 使用新的订阅接口监听SDK事件
      const unsubscribe = sdk.subscribe((event: SDKChangeEvent) => {
        switch (event.type) {
          case 'graphics-changed':
          case 'selection-changed':
          case 'history-changed':
            updateState();
            break;
          case 'render-completed':
            // 可选：处理渲染完成事件
            break;
        }
      });

      unsubscribeRef.current = unsubscribe;

      sdkRef.current = sdk;
      console.log('SDK reference set:', sdkRef.current);
      
      // 初始更新状态
      updateState();
      
      setState((prev: typeof state) => ({
        ...prev,
        sdk,
        isInitialized: true,
      }));

      console.log('SDK initialized successfully with new Action system');

    } catch (error) {
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
        unsubscribeRef.current = null;
      }
      sdk.dispose();
      throw error;
    }
  });

  /**
   * 分发Action
   */
  const dispatch = useMemoizedFn(async (action: Action) => {
    if (!sdkRef.current) {
      throw new Error('SDK not initialized');
    }
    await sdkRef.current.dispatch(action);
  });

  /**
   * 添加矩形
   */
  const addRectangle = useMemoizedFn(async (params: { x: number; y: number; width: number; height: number; style?: any }) => {
    await dispatch({
      type: 'ADD_RECTANGLE',
      payload: params,
      metadata: {
        timestamp: Date.now(),
        source: 'user'
      }
    });
  });

  /**
   * 添加圆形
   */
  const addCircle = useMemoizedFn(async (params: { x: number; y: number; radius: number; style?: any }) => {
    await dispatch({
      type: 'ADD_CIRCLE',
      payload: params,
      metadata: {
        timestamp: Date.now(),
        source: 'user'
      }
    });
  });

  /**
   * 添加文本
   */
  const addText = useMemoizedFn(async (params: { x: number; y: number; text: string; style?: any }) => {
    await dispatch({
      type: 'ADD_TEXT',
      payload: params,
      metadata: {
        timestamp: Date.now(),
        source: 'user'
      }
    });
  });

  /**
   * 删除形状
   */
  const deleteShape = useMemoizedFn(async (shapeId: string) => {
    await dispatch({
      type: 'DELETE_SHAPE',
      payload: { shapeId },
      metadata: {
        timestamp: Date.now(),
        source: 'user'
      }
    });
  });

  /**
   * 删除选中形状
   */
  const deleteSelected = useMemoizedFn(async () => {
    await dispatch({
      type: 'DELETE_SELECTED',
      payload: {},
      metadata: {
        timestamp: Date.now(),
        source: 'user'
      }
    });
  });

  /**
   * 更新形状
   */
  const updateShape = useMemoizedFn(async (shapeId: string, updates: any) => {
    await dispatch({
      type: 'UPDATE_SHAPE',
      payload: { shapeId, updates },
      metadata: {
        timestamp: Date.now(),
        source: 'user'
      }
    });
  });

  /**
   * 选择形状
   */
  const selectShapes = useMemoizedFn(async (shapeIds: string[], addToSelection = false) => {
    await dispatch({
      type: 'SELECT_SHAPES',
      payload: { shapeIds, addToSelection },
      metadata: {
        timestamp: Date.now(),
        source: 'user'
      }
    });
  });

  /**
   * 取消选择形状
   */
  const deselectShape = useMemoizedFn(async (shapeId: string) => {
    await dispatch({
      type: 'DESELECT_SHAPE',
      payload: { shapeId },
      metadata: {
        timestamp: Date.now(),
        source: 'user'
      }
    });
  });

  /**
   * 清空选择
   */
  const clearSelection = useMemoizedFn(async () => {
    await dispatch({
      type: 'CLEAR_SELECTION',
      payload: {},
      metadata: {
        timestamp: Date.now(),
        source: 'user'
      }
    });
  });

  /**
   * 全选
   */
  const selectAll = useMemoizedFn(async () => {
    await dispatch({
      type: 'SELECT_ALL',
      payload: {},
      metadata: {
        timestamp: Date.now(),
        source: 'user'
      }
    });
  });

  /**
   * 反选
   */
  const invertSelection = useMemoizedFn(async () => {
    await dispatch({
      type: 'INVERT_SELECTION',
      payload: {},
      metadata: {
        timestamp: Date.now(),
        source: 'user'
      }
    });
  });

  /**
   * 撤销操作
   */
  const undo = useMemoizedFn(async () => {
    if (!sdkRef.current) {
      throw new Error('SDK not initialized');
    }
    await sdkRef.current.undo();
  });

  /**
   * 重做操作
   */
  const redo = useMemoizedFn(async () => {
    if (!sdkRef.current) {
      throw new Error('SDK not initialized');
    }
    await sdkRef.current.redo();
  });

  /**
   * 清空历史记录
   */
  const clearHistory = useMemoizedFn(() => {
    if (!sdkRef.current) {
      throw new Error('SDK not initialized');
    }
    sdkRef.current.clearHistory();
  });

  /**
   * 置顶 - 将选中的形状或指定形状移到最前面
   */
  const bringToFront = useMemoizedFn(async (shapeIds?: string[]) => {
    const targetIds = shapeIds || state.selectedShapeIds;
    if (targetIds.length === 0) return;

    await dispatch({
      type: 'BRING_TO_FRONT',
      payload: { shapeIds: targetIds },
      metadata: {
        timestamp: Date.now(),
        source: 'user'
      }
    });
  });

  /**
   * 置底 - 将选中的形状或指定形状移到最后面
   */
  const sendToBack = useMemoizedFn(async (shapeIds?: string[]) => {
    const targetIds = shapeIds || state.selectedShapeIds;
    if (targetIds.length === 0) return;

    await dispatch({
      type: 'SEND_TO_BACK',
      payload: { shapeIds: targetIds },
      metadata: {
        timestamp: Date.now(),
        source: 'user'
      }
    });
  });

  /**
   * 上移一层
   */
  const bringForward = useMemoizedFn(async (shapeIds?: string[]) => {
    const targetIds = shapeIds || state.selectedShapeIds;
    if (targetIds.length === 0) return;

    await dispatch({
      type: 'BRING_FORWARD',
      payload: { shapeIds: targetIds },
      metadata: {
        timestamp: Date.now(),
        source: 'user'
      }
    });
  });

  /**
   * 下移一层
   */
  const sendBackward = useMemoizedFn(async (shapeIds?: string[]) => {
    const targetIds = shapeIds || state.selectedShapeIds;
    if (targetIds.length === 0) return;

    await dispatch({
      type: 'SEND_BACKWARD',
      payload: { shapeIds: targetIds },
      metadata: {
        timestamp: Date.now(),
        source: 'user'
      }
    });
  });

  /**
   * 设置指定形状的z-index
   */
  const setZIndex = useMemoizedFn(async (shapeIds: string[], zIndex: number) => {
    if (shapeIds.length === 0) return;

    await dispatch({
      type: 'SET_Z_INDEX',
      payload: { shapeIds, zIndex },
      metadata: {
        timestamp: Date.now(),
        source: 'user'
      }
    });
  });

  /**
   * 设置工具
   */
  const setTool = useMemoizedFn(async (toolType: string, previousTool?: string) => {
    await dispatch({
      type: 'SET_TOOL',
      payload: { toolType, previousTool },
      metadata: {
        timestamp: Date.now(),
        source: 'user'
      }
    });
  });

  /**
   * 批量操作
   */
  const batchActions = useMemoizedFn(async (actions: Action[], transactional = true) => {
    await dispatch({
      type: 'BATCH',
      payload: {
        actions,
        transactional,
        description: `Batch operation with ${actions.length} actions`
      },
      metadata: {
        timestamp: Date.now(),
        source: 'user'
      }
    });
  });

  /**
   * 导入文件
   */
  const importFile = useMemoizedFn(async (params: {
    file?: File;
    url?: string;
    format?: string;
    replaceExisting?: boolean;
    position?: { x: number; y: number }
  }) => {
    await dispatch({
      type: 'IMPORT_FILE',
      payload: params,
      metadata: {
        timestamp: Date.now(),
        source: 'user',
        async: true
      }
    });
  });

  /**
   * 导出文件
   */
  const exportFile = useMemoizedFn(async (params: {
    filename?: string;
    format: string;
    quality?: number;
    includeOnlySelected?: boolean;
    bounds?: any
  }) => {
    await dispatch({
      type: 'EXPORT_FILE',
      payload: params,
      metadata: {
        timestamp: Date.now(),
        source: 'user',
        async: true
      }
    });
  });

  /**
   * 启用自动保存
   */
  const enableAutoSave = useMemoizedFn(async (params: {
    target: string;
    key?: string;
    url?: string;
    interval?: number;
    enableCompression?: boolean
  }) => {
    await dispatch({
      type: 'AUTO_SAVE',
      payload: params,
      metadata: {
        timestamp: Date.now(),
        source: 'system',
        async: true
      }
    });
  });

  /**
   * 插件管理API
   */
  const registerPlugin = useMemoizedFn(async (plugin: any) => {
    if (!sdkRef.current) {
      throw new Error('SDK not initialized');
    }
    // await sdkRef.current.registerPlugin(plugin); // 暂时禁用
    console.log('registerPlugin 暂时禁用');
  });

  const unregisterPlugin = useMemoizedFn(async (pluginId: string) => {
    if (!sdkRef.current) {
      throw new Error('SDK not initialized');
    }
    // await sdkRef.current.unregisterPlugin(pluginId); // 暂时禁用
    console.log('unregisterPlugin 暂时禁用');
  });

  const activatePlugin = useMemoizedFn(async (pluginId: string) => {
    if (!sdkRef.current) {
      throw new Error('SDK not initialized');
    }
    // await sdkRef.current.activatePlugin(pluginId); // 暂时禁用
    console.log('activatePlugin 暂时禁用');
  });

  const deactivatePlugin = useMemoizedFn(async (pluginId: string) => {
    if (!sdkRef.current) {
      throw new Error('SDK not initialized');
    }
    // await sdkRef.current.deactivatePlugin(pluginId); // 暂时禁用
    console.log('deactivatePlugin 暂时禁用');
  });

  const getPlugins = useMemoizedFn(() => {
    if (!sdkRef.current) {
      return [];
    }
    // return sdkRef.current.getPlugins(); // 暂时禁用
    return [];
  });

  const getActivePlugins = useMemoizedFn(() => {
    if (!sdkRef.current) {
      return [];
    }
    // return sdkRef.current.getActivePlugins(); // 暂时禁用
    return [];
  });

  const isPluginActive = useMemoizedFn((pluginId: string) => {
    if (!sdkRef.current) {
      return false;
    }
    // return sdkRef.current.isPluginActive(pluginId); // 暂时禁用
    return false;
  });

  /**
   * 销毁SDK
   */
  const dispose = useMemoizedFn(() => {
    console.log('dispose called, current SDK:', sdkRef.current);

    // 清理事件订阅
    if (unsubscribeRef.current) {
      unsubscribeRef.current();
      unsubscribeRef.current = null;
    }

    // 销毁SDK实例
    if (sdkRef.current) {
      sdkRef.current.dispose();
      sdkRef.current = null;
      setState({
        sdk: null,
        isInitialized: false,
        shapes: [],
        selectedShapeIds: [],
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

  // 使用useMemo来稳定actions对象，空依赖数组因为useMemoizedFn已经保证了函数稳定性
  const actions = useMemo(() => ({
    initialize,
    dispatch,
    addRectangle,
    addCircle,
    addText,
    deleteShape,
    deleteSelected,
    updateShape,
    selectShapes,
    deselectShape,
    clearSelection,
    selectAll,
    invertSelection,
    bringToFront,
    sendToBack,
    bringForward,
    sendBackward,
    setZIndex,
    setTool,
    batchActions,
    importFile,
    exportFile,
    enableAutoSave,
    registerPlugin,
    unregisterPlugin,
    activatePlugin,
    deactivatePlugin,
    getPlugins,
    getActivePlugins,
    isPluginActive,
    undo,
    redo,
    clearHistory,
    dispose,
  }), []); // 空依赖数组，因为所有函数都已用useMemoizedFn稳定化

  return [state, actions];
}