import {
  CanvasSDK,
  ICanvasSDKConfig,
  ICanvasSDKEvents,
  IInteractionManager,
  InteractionMode,
  IShape
} from '@sky-canvas/canvas-sdk';
import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Canvas SDK状态接口
 */
export interface CanvasSDKState {
  /** SDK实例 */
  sdk: CanvasSDK | null;
  /** 是否已初始化 */
  isInitialized: boolean;
  /** 所有形状 */
  shapes: IShape[];
  /** 选中的形状 */
  selectedShapes: IShape[];
  /** 是否可以撤销 */
  canUndo: boolean;
  /** 是否可以重做 */
  canRedo: boolean;
  /** 当前交互模式 */
  interactionMode: InteractionMode;
  /** 视口信息 */
  viewport: {
    x: number;
    y: number;
    width: number;
    height: number;
    zoom: number;
  };
}

/**
 * Canvas SDK操作接口 - 更新为使用新API
 */
export interface CanvasSDKActions {
  /** 初始化SDK */
  initialize: (canvas: HTMLCanvasElement, config?: ICanvasSDKConfig) => Promise<void>;
  /** 添加形状 */
  addShape: (shape: IShape) => void;
  /** 移除形状 */
  removeShape: (id: string) => void;
  /** 更新形状 */
  updateShape: (id: string, updates: any) => void;
  /** 选择形状 */
  selectShape: (id: string) => void;
  /** 取消选择形状 */
  deselectShape: (id: string) => void;
  /** 清空选择 */
  clearSelection: () => void;
  /** 撤销操作 */
  undo: () => void;
  /** 重做操作 */
  redo: () => void;
  /** 清空所有形状 */
  clearShapes: () => void;
  /** 点击测试 */
  hitTest: (point: { x: number; y: number }) => IShape | null;
  
  // === 新增的交互系统API ===
  /** 设置交互模式 */
  setInteractionMode: (mode: InteractionMode) => boolean;
  /** 设置工具（按名称） */
  setTool: (toolName: string | null) => boolean;
  /** 获取交互管理器 */
  getInteractionManager: () => IInteractionManager | null;
  /** 启用/禁用交互 */
  setInteractionEnabled: (enabled: boolean) => void;
  
  // === 新增的视口控制API ===
  /** 设置视口 */
  setViewport: (viewport: Partial<{ x: number; y: number; width: number; height: number; zoom: number }>) => void;
  /** 平移视口 */
  panViewport: (delta: { x: number; y: number }) => void;
  /** 缩放视口 */
  zoomViewport: (factor: number, center?: { x: number; y: number }) => void;
  /** 适应内容 */
  fitToContent: () => void;
  /** 重置视口 */
  resetViewport: () => void;
  
  // === 新增的渲染控制API ===
  /** 开始渲染 */
  startRender: () => void;
  /** 停止渲染 */
  stopRender: () => void;
  /** 手动渲染一帧 */
  render: () => void;
  
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
    interactionMode: InteractionMode.SELECT,
    viewport: {
      x: 0,
      y: 0,
      width: 800,
      height: 600,
      zoom: 1
    },
  });

  /**
   * 更新状态
   */
  const updateState = useCallback(() => {
    const sdk = sdkRef.current;
    if (!sdk) return;

    setState(prev => ({
      ...prev,
      sdk,
      shapes: sdk.getShapes(),
      selectedShapes: sdk.getSelectedShapes(),
      canUndo: sdk.canUndo(),
      canRedo: sdk.canRedo(),
      interactionMode: sdk.getInteractionMode(),
      viewport: sdk.getViewport(),
    }));
  }, []);

  /**
   * 初始化SDK
   */
  const initialize = useCallback(async (
    canvas: HTMLCanvasElement, 
    config: ICanvasSDKConfig = {}
  ) => {
    console.log('Initialize called, current SDK:', sdkRef.current, 'isInitialized:', state.isInitialized);
    
    if (sdkRef.current) {
      console.log('SDK already initialized, throwing error');
      throw new Error('SDK already initialized');
    }

    const sdk = new CanvasSDK();
    
    try {
      // 使用新的配置API初始化
      await sdk.initialize(canvas, {
        renderEngine: 'webgl', // 默认使用WebGL
        enableInteraction: true,
        ...config
      });
      
      // 设置事件监听器
      const eventHandlers: { [K in keyof ICanvasSDKEvents]: (event: ICanvasSDKEvents[K]) => void } = {
        shapeAdded: () => updateState(),
        shapeRemoved: () => updateState(),
        shapeUpdated: () => updateState(),
        shapeSelected: () => updateState(),
        shapeDeselected: () => updateState(),
        selectionCleared: () => updateState(),
        interactionModeChanged: () => updateState(),
        viewportChanged: () => updateState(),
        mousedown: () => updateState(),
        mousemove: () => updateState(),
      };

      // 注册所有事件监听器
      Object.keys(eventHandlers).forEach(eventName => {
        sdk.on(eventName as keyof ICanvasSDKEvents, eventHandlers[eventName as keyof ICanvasSDKEvents]);
      });

      sdkRef.current = sdk;
      console.log('SDK reference set:', sdkRef.current);
      
      // 开始渲染循环
      sdk.startRender();
      
      setState(prev => ({
        ...prev,
        sdk,
        isInitialized: true,
        shapes: sdk.getShapes(),
        selectedShapes: sdk.getSelectedShapes(),
        canUndo: sdk.canUndo(),
        canRedo: sdk.canRedo(),
        interactionMode: sdk.getInteractionMode(),
        viewport: sdk.getViewport(),
      }));

    } catch (error) {
      sdk.dispose();
      throw error;
    }
  }, []);

  /**
   * 添加形状
   */
  const addShape = useCallback((shape: IShape) => {
    if (!sdkRef.current) {
      throw new Error('SDK not initialized');
    }
    sdkRef.current.addShape(shape);
  }, []);

  /**
   * 移除形状
   */
  const removeShape = useCallback((id: string) => {
    if (!sdkRef.current) {
      throw new Error('SDK not initialized');
    }
    sdkRef.current.removeShape(id);
  }, []);

  /**
   * 更新形状
   */
  const updateShape = useCallback((id: string, updates: any) => {
    if (!sdkRef.current) {
      throw new Error('SDK not initialized');
    }
    sdkRef.current.updateShape(id, updates);
  }, []);

  /**
   * 选择形状
   */
  const selectShape = useCallback((id: string) => {
    if (!sdkRef.current) {
      throw new Error('SDK not initialized');
    }
    sdkRef.current.selectShape(id);
  }, []);

  /**
   * 取消选择形状
   */
  const deselectShape = useCallback((id: string) => {
    if (!sdkRef.current) {
      throw new Error('SDK not initialized');
    }
    sdkRef.current.deselectShape(id);
  }, []);

  /**
   * 清空选择
   */
  const clearSelection = useCallback(() => {
    if (!sdkRef.current) {
      throw new Error('SDK not initialized');
    }
    sdkRef.current.clearSelection();
  }, []);

  /**
   * 撤销操作
   */
  const undo = useCallback(() => {
    if (!sdkRef.current) {
      throw new Error('SDK not initialized');
    }
    sdkRef.current.undo();
  }, []);

  /**
   * 重做操作
   */
  const redo = useCallback(() => {
    if (!sdkRef.current) {
      throw new Error('SDK not initialized');
    }
    sdkRef.current.redo();
  }, []);

  /**
   * 清空所有形状
   */
  const clearShapes = useCallback(() => {
    if (!sdkRef.current) {
      throw new Error('SDK not initialized');
    }
    sdkRef.current.clearShapes();
  }, []);

  /**
   * 点击测试
   */
  const hitTest = useCallback((point: { x: number; y: number }) => {
    if (!sdkRef.current) {
      throw new Error('SDK not initialized');
    }
    return sdkRef.current.hitTest(point);
  }, []);

  // === 新增的交互系统方法 ===

  /**
   * 设置交互模式
   */
  const setInteractionMode = useCallback((mode: InteractionMode) => {
    if (!sdkRef.current) {
      console.warn('setInteractionMode called but SDK not ready yet. Mode will be applied when SDK is ready.');
      return false; // 返回 false 表示设置失败，但不抛错误
    }
    console.log('Setting interaction mode:', mode);
    return sdkRef.current.setInteractionMode(mode);
  }, []);

  /**
   * 设置工具（按名称）
   */
  const setTool = useCallback((toolName: string | null) => {
    if (!sdkRef.current) {
      console.warn('setTool called but SDK not ready yet. Tool will be applied when SDK is ready.');
      return false;
    }
    console.log('Setting tool:', toolName);
    return sdkRef.current.setTool(toolName);
  }, []);

  /**
   * 获取交互管理器
   */
  const getInteractionManager = useCallback(() => {
    if (!sdkRef.current) {
      return null;
    }
    return sdkRef.current.getInteractionManager();
  }, []);

  /**
   * 启用/禁用交互
   */
  const setInteractionEnabled = useCallback((enabled: boolean) => {
    if (!sdkRef.current) {
      throw new Error('SDK not initialized');
    }
    sdkRef.current.setInteractionEnabled(enabled);
  }, []);

  // === 新增的视口控制方法 ===

  /**
   * 设置视口
   */
  const setViewport = useCallback((viewport: Partial<{ x: number; y: number; width: number; height: number; zoom: number }>) => {
    if (!sdkRef.current) {
      throw new Error('SDK not initialized');
    }
    sdkRef.current.setViewport(viewport);
  }, []);

  /**
   * 平移视口
   */
  const panViewport = useCallback((delta: { x: number; y: number }) => {
    if (!sdkRef.current) {
      throw new Error('SDK not initialized');
    }
    sdkRef.current.panViewport(delta);
  }, []);

  /**
   * 缩放视口
   */
  const zoomViewport = useCallback((factor: number, center?: { x: number; y: number }) => {
    if (!sdkRef.current) {
      throw new Error('SDK not initialized');
    }
    sdkRef.current.zoomViewport(factor, center);
  }, []);

  /**
   * 适应内容
   */
  const fitToContent = useCallback(() => {
    if (!sdkRef.current) {
      throw new Error('SDK not initialized');
    }
    sdkRef.current.fitToContent();
  }, []);

  /**
   * 重置视口
   */
  const resetViewport = useCallback(() => {
    if (!sdkRef.current) {
      throw new Error('SDK not initialized');
    }
    sdkRef.current.resetViewport();
  }, []);

  // === 新增的渲染控制方法 ===

  /**
   * 开始渲染
   */
  const startRender = useCallback(() => {
    if (!sdkRef.current) {
      throw new Error('SDK not initialized');
    }
    sdkRef.current.startRender();
  }, []);

  /**
   * 停止渲染
   */
  const stopRender = useCallback(() => {
    if (!sdkRef.current) {
      throw new Error('SDK not initialized');
    }
    sdkRef.current.stopRender();
  }, []);

  /**
   * 手动渲染一帧
   */
  const render = useCallback(() => {
    if (!sdkRef.current) {
      throw new Error('SDK not initialized');
    }
    sdkRef.current.render();
  }, []);

  /**
   * 销毁SDK
   */
  const dispose = useCallback(() => {
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
        interactionMode: InteractionMode.SELECT,
        viewport: {
          x: 0,
          y: 0,
          width: 800,
          height: 600,
          zoom: 1
        },
      });
    }
  }, []);

  // 清理副作用 - 只在组件真正卸载时清理
  useEffect(() => {
    return () => {
      console.log('useCanvasSDK cleanup called');
      dispose();
    };
  }, []); // 空依赖数组，只在组件卸载时运行

  const actions: CanvasSDKActions = {
    initialize,
    addShape,
    removeShape,
    updateShape,
    selectShape,
    deselectShape,
    clearSelection,
    undo,
    redo,
    clearShapes,
    hitTest,
    // 交互系统方法
    setInteractionMode,
    setTool,
    getInteractionManager,
    setInteractionEnabled,
    // 视口控制方法
    setViewport,
    panViewport,
    zoomViewport,
    fitToContent,
    resetViewport,
    // 渲染控制方法
    startRender,
    stopRender,
    render,
    dispose,
  };

  return [state, actions];
}