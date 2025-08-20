import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import { RenderEngine } from '../engine/RenderEngine';
import { ISceneNode } from '../engine/scene/SceneNode';

export interface AppState {
  // 应用状态
  isLoading: boolean;
  error: string | null;
  
  // 画布相关
  renderEngine: RenderEngine | null;
  selectedNodes: ISceneNode[];
  
  // UI状态
  showGrid: boolean;
  showRulers: boolean;
  showLayerPanel: boolean;
  showPropertiesPanel: boolean;
  showToolbar: boolean;
  
  // 性能相关
  fps: number;
  renderStats: {
    drawCalls: number;
    triangles: number;
    vertices: number;
  };
}

export interface AppActions {
  // 应用状态管理
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  
  // 画布管理
  setRenderEngine: (engine: RenderEngine | null) => void;
  setSelectedNodes: (nodes: ISceneNode[]) => void;
  addSelectedNode: (node: ISceneNode) => void;
  removeSelectedNode: (node: ISceneNode) => void;
  clearSelection: () => void;
  
  // UI控制
  toggleGrid: () => void;
  toggleRulers: () => void;
  toggleLayerPanel: () => void;
  togglePropertiesPanel: () => void;
  toggleToolbar: () => void;
  setShowGrid: (show: boolean) => void;
  setShowRulers: (show: boolean) => void;
  setShowLayerPanel: (show: boolean) => void;
  setShowPropertiesPanel: (show: boolean) => void;
  setShowToolbar: (show: boolean) => void;
  
  // 性能监控
  updateFPS: (fps: number) => void;
  updateRenderStats: (stats: AppState['renderStats']) => void;
  
  // 重置
  reset: () => void;
}

const initialState: AppState = {
  isLoading: false,
  error: null,
  renderEngine: null,
  selectedNodes: [],
  showGrid: true,
  showRulers: true,
  showLayerPanel: true,
  showPropertiesPanel: true,
  showToolbar: true,
  fps: 60,
  renderStats: {
    drawCalls: 0,
    triangles: 0,
    vertices: 0
  }
};

export const useAppStore = create<AppState & AppActions>()(
  subscribeWithSelector((set, get) => ({
    ...initialState,
    
    // 应用状态管理
    setLoading: (loading: boolean) => set({ isLoading: loading }),
    setError: (error: string | null) => set({ error }),
    
    // 画布管理
    setRenderEngine: (engine: RenderEngine | null) => set({ renderEngine: engine }),
    
    setSelectedNodes: (nodes: ISceneNode[]) => set({ selectedNodes: [...nodes] }),
    
    addSelectedNode: (node: ISceneNode) => {
      const { selectedNodes } = get();
      if (!selectedNodes.includes(node)) {
        set({ selectedNodes: [...selectedNodes, node] });
      }
    },
    
    removeSelectedNode: (node: ISceneNode) => {
      const { selectedNodes } = get();
      set({ selectedNodes: selectedNodes.filter(n => n !== node) });
    },
    
    clearSelection: () => set({ selectedNodes: [] }),
    
    // UI控制
    toggleGrid: () => set((state) => ({ showGrid: !state.showGrid })),
    toggleRulers: () => set((state) => ({ showRulers: !state.showRulers })),
    toggleLayerPanel: () => set((state) => ({ showLayerPanel: !state.showLayerPanel })),
    togglePropertiesPanel: () => set((state) => ({ showPropertiesPanel: !state.showPropertiesPanel })),
    toggleToolbar: () => set((state) => ({ showToolbar: !state.showToolbar })),
    
    setShowGrid: (show: boolean) => set({ showGrid: show }),
    setShowRulers: (show: boolean) => set({ showRulers: show }),
    setShowLayerPanel: (show: boolean) => set({ showLayerPanel: show }),
    setShowPropertiesPanel: (show: boolean) => set({ showPropertiesPanel: show }),
    setShowToolbar: (show: boolean) => set({ showToolbar: show }),
    
    // 性能监控
    updateFPS: (fps: number) => set({ fps }),
    updateRenderStats: (stats: AppState['renderStats']) => set({ renderStats: stats }),
    
    // 重置
    reset: () => set(initialState)
  }))
);

// 选择器函数，用于优化性能
export const selectSelectedNodes = (state: AppState & AppActions) => state.selectedNodes;
export const selectUIState = (state: AppState & AppActions) => ({
  showGrid: state.showGrid,
  showRulers: state.showRulers,
  showLayerPanel: state.showLayerPanel,
  showPropertiesPanel: state.showPropertiesPanel,
  showToolbar: state.showToolbar
});
export const selectRenderStats = (state: AppState & AppActions) => state.renderStats;
