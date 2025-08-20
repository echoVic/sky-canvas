import { create } from 'zustand';
import { Tool, ToolType } from '../types';

interface ToolStore {
  currentTool: ToolType;
  tools: Tool[];
  brushSize: number;
  brushOpacity: number;
  color: string;
  fontSize: number;
  fontFamily: string;
  
  // Actions
  setCurrentTool: (tool: ToolType) => void;
  setBrushSize: (size: number) => void;
  setBrushOpacity: (opacity: number) => void;
  setColor: (color: string) => void;
  setFontSize: (size: number) => void;
  setFontFamily: (family: string) => void;
}

const defaultTools: Tool[] = [
  { type: ToolType.SELECT, name: '选择', icon: '🔍', shortcut: 'V' },
  { type: ToolType.PAN, name: '平移', icon: '✋', shortcut: 'H' },
  { type: ToolType.ZOOM, name: '缩放', icon: '🔍', shortcut: 'Z' },
  { type: ToolType.BRUSH, name: '画笔', icon: '🖌️', shortcut: 'B' },
  { type: ToolType.ERASER, name: '橡皮擦', icon: '🧽', shortcut: 'E' },
  { type: ToolType.TEXT, name: '文字', icon: '📝', shortcut: 'T' },
  { type: ToolType.RECTANGLE, name: '矩形', icon: '⬜', shortcut: 'R' }
];

export const useToolStore = create<ToolStore>((set) => ({
  currentTool: ToolType.SELECT,
  tools: defaultTools,
  brushSize: 5,
  brushOpacity: 1,
  color: '#000000',
  fontSize: 16,
  fontFamily: 'Arial',
  
  setCurrentTool: (tool: ToolType) => set({ currentTool: tool }),
  setBrushSize: (size: number) => set({ brushSize: Math.max(1, Math.min(100, size)) }),
  setBrushOpacity: (opacity: number) => set({ brushOpacity: Math.max(0, Math.min(1, opacity)) }),
  setColor: (color: string) => set({ color }),
  setFontSize: (size: number) => set({ fontSize: Math.max(8, Math.min(72, size)) }),
  setFontFamily: (family: string) => set({ fontFamily: family })
}));
