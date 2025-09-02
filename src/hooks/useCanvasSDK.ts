import {
  CanvasSDK,
  ICanvasSDKConfig,
  ICanvasSDKEvents,
  IInteractionManager,
  InteractionMode,
  IShape
} from '@sky-canvas/canvas-sdk';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useCreation, useMemoizedFn } from 'ahooks';

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
  /** 当前选中的工具 */
  currentTool: string | null;
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
  /** 注册交互工具 */
  registerInteractionTool: (tool: any) => void;
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
    currentTool: null,
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
  const updateState = useMemoizedFn(() => {
    const sdk = sdkRef.current;
    if (!sdk) return;

    // 获取当前工具名称
    const interactionManager = sdk.getInteractionManager();
    const activeTool = interactionManager?.getActiveTool();
    const currentTool = activeTool?.name || null;

    setState((prev: typeof state) => ({
      ...prev,
      sdk,
      shapes: sdk.getShapes(),
      selectedShapes: sdk.getSelectedShapes(),
      canUndo: sdk.canUndo(),
      canRedo: sdk.canRedo(),
      interactionMode: sdk.getInteractionMode(),
      currentTool,
      viewport: sdk.getViewport(),
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
      
      setState((prev: typeof state) => ({
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
  });

  /**
   * 添加形状
   */
  const addShape = useMemoizedFn((shape: IShape) => {
    if (!sdkRef.current) {
      throw new Error('SDK not initialized');
    }
    sdkRef.current.addShape(shape);
  });

  /**
   * 移除形状
   */
  const removeShape = useMemoizedFn((id: string) => {
    if (!sdkRef.current) {
      throw new Error('SDK not initialized');
    }
    sdkRef.current.removeShape(id);
  });

  /**
   * 更新形状
   */
  const updateShape = useMemoizedFn((id: string, updates: any) => {
    if (!sdkRef.current) {
      throw new Error('SDK not initialized');
    }
    sdkRef.current.updateShape(id, updates);
  });

  /**
   * 选择形状
   */
  const selectShape = useMemoizedFn((id: string) => {
    if (!sdkRef.current) {
      throw new Error('SDK not initialized');
    }
    sdkRef.current.selectShape(id);
  });

  /**
   * 取消选择形状
   */
  const deselectShape = useMemoizedFn((id: string) => {
    if (!sdkRef.current) {
      throw new Error('SDK not initialized');
    }
    sdkRef.current.deselectShape(id);
  });

  /**
   * 清空选择
   */
  const clearSelection = useMemoizedFn(() => {
    if (!sdkRef.current) {
      throw new Error('SDK not initialized');
    }
    sdkRef.current.clearSelection();
  });

  /**
   * 撤销操作
   */
  const undo = useMemoizedFn(() => {
    if (!sdkRef.current) {
      throw new Error('SDK not initialized');
    }
    sdkRef.current.undo();
  });

  /**
   * 重做操作
   */
  const redo = useMemoizedFn(() => {
    if (!sdkRef.current) {
      throw new Error('SDK not initialized');
    }
    sdkRef.current.redo();
  });

  /**
   * 清空所有形状
   */
  const clearShapes = useMemoizedFn(() => {
    if (!sdkRef.current) {
      throw new Error('SDK not initialized');
    }
    sdkRef.current.clearShapes();
  });

  /**
   * 点击测试
   */
  const hitTest = useMemoizedFn((point: { x: number; y: number }) => {
    if (!sdkRef.current) {
      throw new Error('SDK not initialized');
    }
    return sdkRef.current.hitTest(point);
  });

  // === 新增的交互系统方法 ===

  /**
   * 设置交互模式
   */
  const setInteractionMode = useMemoizedFn((mode: InteractionMode) => {
    if (!sdkRef.current) {
      console.warn('setInteractionMode called but SDK not ready yet. Mode will be applied when SDK is ready.');
      return false; // 返回 false 表示设置失败，但不抛错误
    }
    console.log('Setting interaction mode:', mode);
    return sdkRef.current.setInteractionMode(mode);
  });

  /**
   * 设置工具（按名称）
   */
  const setTool = useMemoizedFn((toolName: string | null) => {
    if (!sdkRef.current) {
      console.warn('setTool called but SDK not ready yet. Tool will be applied when SDK is ready.');
      return false;
    }
    console.log('Setting tool:', toolName);
    return sdkRef.current.setTool(toolName);
  });

  /**
   * 获取交互管理器
   */
  const getInteractionManager = useMemoizedFn(() => {
    if (!sdkRef.current) {
      return null;
    }
    return sdkRef.current.getInteractionManager();
  });

  /**
   * 注册交互工具
   */
  const registerInteractionTool = useMemoizedFn((tool: any) => {
    if (!sdkRef.current) {
      throw new Error('SDK not initialized');
    }
    sdkRef.current.registerInteractionTool(tool);
  });

  /**
   * 启用/禁用交互
   */
  const setInteractionEnabled = useMemoizedFn((enabled: boolean) => {
    if (!sdkRef.current) {
      throw new Error('SDK not initialized');
    }
    sdkRef.current.setInteractionEnabled(enabled);
  });

  // === 新增的视口控制方法 ===

  /**
   * 设置视口
   */
  const setViewport = useMemoizedFn((viewport: Partial<{ x: number; y: number; width: number; height: number; zoom: number }>) => {
    if (!sdkRef.current) {
      throw new Error('SDK not initialized');
    }
    sdkRef.current.setViewport(viewport);
  });

  /**
   * 平移视口
   */
  const panViewport = useMemoizedFn((delta: { x: number; y: number }) => {
    if (!sdkRef.current) {
      throw new Error('SDK not initialized');
    }
    sdkRef.current.panViewport(delta);
  });

  /**
   * 缩放视口
   */
  const zoomViewport = useMemoizedFn((factor: number, center?: { x: number; y: number }) => {
    if (!sdkRef.current) {
      throw new Error('SDK not initialized');
    }
    sdkRef.current.zoomViewport(factor, center);
  });

  /**
   * 适应内容
   */
  const fitToContent = useMemoizedFn(() => {
    if (!sdkRef.current) {
      throw new Error('SDK not initialized');
    }
    sdkRef.current.fitToContent();
  });

  /**
   * 重置视口
   */
  const resetViewport = useMemoizedFn(() => {
    if (!sdkRef.current) {
      throw new Error('SDK not initialized');
    }
    sdkRef.current.resetViewport();
  });

  // === 新增的渲染控制方法 ===

  /**
   * 开始渲染
   */
  const startRender = useMemoizedFn(() => {
    if (!sdkRef.current) {
      throw new Error('SDK not initialized');
    }
    sdkRef.current.startRender();
  });

  /**
   * 停止渲染
   */
  const stopRender = useMemoizedFn(() => {
    if (!sdkRef.current) {
      throw new Error('SDK not initialized');
    }
    sdkRef.current.stopRender();
  });

  /**
   * 手动渲染一帧
   */
  const render = useMemoizedFn(() => {
    if (!sdkRef.current) {
      throw new Error('SDK not initialized');
    }
    sdkRef.current.render();
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
        interactionMode: InteractionMode.SELECT,
        currentTool: null,
        viewport: {
          x: 0,
          y: 0,
          width: 800,
          height: 600,
          zoom: 1
        },
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
    registerInteractionTool,
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
  }), [
    initialize, addShape, removeShape, updateShape, selectShape, deselectShape, clearSelection,
    undo, redo, clearShapes, hitTest, setInteractionMode, setTool, getInteractionManager,
    setInteractionEnabled, setViewport, panViewport, zoomViewport, fitToContent, resetViewport,
    startRender, stopRender, render, dispose
  ]);

  return [state, actions];
}