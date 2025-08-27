import { useEffect, useRef, useCallback, useState } from 'react';
import { CanvasSDK, IShape, ICanvasSDKEvents } from '@sky-canvas/canvas-sdk';
import { IGraphicsContextFactory } from '@sky-canvas/render-engine';

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
}

/**
 * Canvas SDK操作接口
 */
export interface CanvasSDKActions {
  /** 初始化SDK */
  initialize: (canvas: HTMLCanvasElement, factory: IGraphicsContextFactory<HTMLCanvasElement>) => Promise<void>;
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
    }));
  }, []);

  /**
   * 初始化SDK
   */
  const initialize = useCallback(async (
    canvas: HTMLCanvasElement, 
    factory: IGraphicsContextFactory<HTMLCanvasElement>
  ) => {
    if (sdkRef.current) {
      throw new Error('SDK already initialized');
    }

    const sdk = new CanvasSDK();
    
    try {
      await sdk.initialize(canvas);
      
      // 设置事件监听器
      const eventHandlers: { [K in keyof ICanvasSDKEvents]: (event: ICanvasSDKEvents[K]) => void } = {
        shapeAdded: () => updateState(),
        shapeRemoved: () => updateState(),
        shapeUpdated: () => updateState(),
        shapeSelected: () => updateState(),
        shapeDeselected: () => updateState(),
        selectionCleared: () => updateState(),
      };

      // 注册所有事件监听器
      Object.keys(eventHandlers).forEach(eventName => {
        sdk.on(eventName as keyof ICanvasSDKEvents, eventHandlers[eventName as keyof ICanvasSDKEvents]);
      });

      sdkRef.current = sdk;
      
      setState(prev => ({
        ...prev,
        sdk,
        isInitialized: true,
        shapes: [],
        selectedShapes: [],
        canUndo: false,
        canRedo: false,
      }));

    } catch (error) {
      sdk.dispose();
      throw error;
    }
  }, [updateState]);

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

  /**
   * 销毁SDK
   */
  const dispose = useCallback(() => {
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
  }, []);

  // 清理副作用
  useEffect(() => {
    return () => {
      dispose();
    };
  }, [dispose]);

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
    dispose,
  };

  return [state, actions];
}