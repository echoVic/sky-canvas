import {
  CanvasSDK,
  createCanvasSDK,
  ICanvasSDKConfig,
  ICanvasSDKEvents,
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
  /** 当前工具 */
  currentTool: string | null;
  /** 交互模式 */
  interactionMode: string | null;
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
 * Canvas SDK操作接口
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
  /** 撤销 */
  undo: () => void;
  /** 重做 */
  redo: () => void;
  /** 清空所有形状 */
  clearShapes: () => void;
  
  // === 交互系统方法 ===
  /** 设置活动工具 */
  setActiveTool: (toolName: string | null) => boolean;
  /** 设置工具 (别名) */
  setTool: (toolName: string | null) => boolean;
  /** 获取当前工具 */
  getActiveTool: () => any;
  /** 注册工具 */
  registerTool: (tool: any) => void;
  /** 注册交互工具 (别名) */
  registerInteractionTool: (tool: any) => void;
  /** 点击测试 */
  hitTest: (point: { x: number; y: number }) => IShape | null;
  /** 获取交互管理器 */
  getInteractionManager: () => any;
  
  // === 视口控制方法 ===
  /** 设置视口 */
  setViewport: (viewport: any) => void;
  /** 平移视口 */
  panViewport: (delta: any) => void;
  /** 缩放视口 */
  zoomViewport: (factor: number, center?: any) => void;
  /** 适应内容 */
  fitToContent: () => void;
  /** 重置视口 */
  resetViewport: () => void;
  
  // === 渲染控制方法 ===
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
    currentTool: null,
    interactionMode: null,
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

    // 获取当前工具
    const activeTool = sdk.getActiveTool();
    const currentTool = activeTool?.name || null;

    setState((prev: typeof state) => ({
      ...prev,
      sdk,
      shapes: sdk.getShapes(),
      selectedShapes: sdk.getSelectedShapes(),
      canUndo: sdk.canUndo(),
      canRedo: sdk.canRedo(),
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

    const sdk = await createCanvasSDK();
    
    // 初始化SDK
    await sdk.initialize(canvas, {
      renderEngine: 'webgl', // 默认使用WebGL
      enableInteraction: true,
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
        'viewport:changed': () => updateState(),
      };

      // 注册所有事件监听器
      Object.keys(eventHandlers).forEach(eventName => {
        sdk.on(eventName as keyof typeof eventHandlers, eventHandlers[eventName as keyof typeof eventHandlers]);
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
        currentTool: sdk.getActiveTool()?.name || null,
        interactionMode: sdk.getActiveTool()?.name || null,
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

  // === 交互系统方法 ===

  /**
   * 设置活动工具
   */
  const setActiveTool = useMemoizedFn((toolName: string | null) => {
    if (!sdkRef.current) {
      console.warn('setActiveTool called but SDK not ready yet. Tool will be applied when SDK is ready.');
      return false;
    }
    console.log('Setting active tool:', toolName);
    return sdkRef.current.setActiveTool(toolName);
  });

  /**
   * 获取当前工具
   */
  const getActiveTool = useMemoizedFn(() => {
    if (!sdkRef.current) {
      return null;
    }
    return sdkRef.current.getActiveTool();
  });

  /**
   * 注册工具
   */
  const registerTool = useMemoizedFn((tool: any) => {
    if (!sdkRef.current) {
      throw new Error('SDK not initialized');
    }
    sdkRef.current.registerTool(tool);
  });

  /**
   * 设置工具 (setActiveTool的别名)
   */
  const setTool = useMemoizedFn((toolName: string | null) => {
    return setActiveTool(toolName);
  });

  /**
   * 注册交互工具 (registerTool的别名)
   */
  const registerInteractionTool = useMemoizedFn((tool: any) => {
    return registerTool(tool);
  });

  /**
   * 点击测试
   */
  const hitTest = useMemoizedFn((point: { x: number; y: number }) => {
    if (!sdkRef.current) {
      return null;
    }
    // 简单实现：遍历所有形状进行点击测试
    const shapes = sdkRef.current.getShapes();
    for (const shape of shapes) {
      if (shape.hitTest && shape.hitTest(point)) {
        return shape;
      }
    }
    return null;
  });

  /**
   * 获取交互管理器
   */
  const getInteractionManager = useMemoizedFn(() => {
    if (!sdkRef.current) {
      return null;
    }
    // 返回一个简单的交互管理器对象
    return {
      setCursor: (cursor: string) => {
        // 设置鼠标样式的简单实现
        if (typeof document !== 'undefined') {
          document.body.style.cursor = cursor;
        }
      }
    };
  });

  // === 视口控制方法 ===

  /**
   * 设置视口
   */
  const setViewport = useMemoizedFn((viewport: any) => {
    if (!sdkRef.current) {
      throw new Error('SDK not initialized');
    }
    sdkRef.current.setViewport(viewport);
  });

  /**
   * 平移视口
   */
  const panViewport = useMemoizedFn((delta: any) => {
    if (!sdkRef.current) {
      throw new Error('SDK not initialized');
    }
    sdkRef.current.panViewport(delta);
  });

  /**
   * 缩放视口
   */
  const zoomViewport = useMemoizedFn((factor: number, center?: any) => {
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

  // === 渲染控制方法 ===

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
        currentTool: null,
        interactionMode: null,
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
    // 交互系统方法
    setActiveTool,
    setTool,
    getActiveTool,
    registerTool,
    registerInteractionTool,
    hitTest,
    getInteractionManager,
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
    undo, redo, clearShapes, setActiveTool, setTool, getActiveTool, registerTool, registerInteractionTool, hitTest, getInteractionManager,
    setViewport, panViewport, zoomViewport, fitToContent, resetViewport,
    startRender, stopRender, render, dispose
  ]);

  return [state, actions];
}