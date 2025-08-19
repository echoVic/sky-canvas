import { create } from 'zustand';
import { HistoryState } from '../types';

interface CanvasHistoryState {
  zoom: number;
  pan: { x: number; y: number };
  timestamp: number;
}

interface HistoryStore extends HistoryState {
  history: CanvasHistoryState[];
  
  // Actions
  pushState: (state: CanvasHistoryState) => void;
  undo: () => CanvasHistoryState | null;
  redo: () => CanvasHistoryState | null;
  clear: () => void;
}

export const useHistoryStore = create<HistoryStore>((set, get) => ({
  canUndo: false,
  canRedo: false,
  currentIndex: -1,
  maxSize: 50,
  history: [],
  
  pushState: (state: any) => {
    const { history, currentIndex, maxSize } = get();
    const newHistory = history.slice(0, currentIndex + 1);
    newHistory.push(state);
    
    // 限制历史记录大小
    if (newHistory.length > maxSize) {
      newHistory.shift();
    }
    
    const newIndex = newHistory.length - 1;
    
    set({
      history: newHistory,
      currentIndex: newIndex,
      canUndo: newIndex > 0,
      canRedo: false
    });
  },
  
  undo: () => {
    const { history, currentIndex } = get();
    if (currentIndex > 0) {
      const newIndex = currentIndex - 1;
      set({
        currentIndex: newIndex,
        canUndo: newIndex > 0,
        canRedo: true
      });
      return history[newIndex];
    }
    return null;
  },
  
  redo: () => {
    const { history, currentIndex } = get();
    if (currentIndex < history.length - 1) {
      const newIndex = currentIndex + 1;
      set({
        currentIndex: newIndex,
        canUndo: true,
        canRedo: newIndex < history.length - 1
      });
      return history[newIndex];
    }
    return null;
  },
  
  clear: () => set({
    history: [],
    currentIndex: -1,
    canUndo: false,
    canRedo: false
  })
}));
