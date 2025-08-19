import { create } from 'zustand';
import { CanvasState, Point, Size } from '../types';

interface CanvasStore extends CanvasState {
  // Actions
  setZoom: (zoom: number) => void;
  setPan: (pan: Point) => void;
  setSize: (size: Size) => void;
  setDragging: (isDragging: boolean) => void;
  zoomIn: () => void;
  zoomOut: () => void;
  resetView: () => void;
  panBy: (delta: Point) => void;
}

export const useCanvasStore = create<CanvasStore>((set, get) => ({
  // Initial state
  zoom: 1,
  pan: { x: 0, y: 0 },
  size: { width: 800, height: 600 },
  isDragging: false,

  // Actions
  setZoom: (zoom: number) => set({ zoom: Math.max(0.1, Math.min(10, zoom)) }),
  
  setPan: (pan: Point) => set({ pan }),
  
  setSize: (size: Size) => set({ size }),
  
  setDragging: (isDragging: boolean) => set({ isDragging }),
  
  zoomIn: () => {
    const { zoom } = get();
    set({ zoom: Math.min(10, zoom * 1.2) });
  },
  
  zoomOut: () => {
    const { zoom } = get();
    set({ zoom: Math.max(0.1, zoom / 1.2) });
  },
  
  resetView: () => set({ 
    zoom: 1, 
    pan: { x: 0, y: 0 } 
  }),
  
  panBy: (delta: Point) => {
    const { pan } = get();
    set({ 
      pan: { 
        x: pan.x + delta.x, 
        y: pan.y + delta.y 
      } 
    });
  }
}));
