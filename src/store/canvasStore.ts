import { create } from 'zustand'

// 工具类型定义（与Hook中的ToolType保持一致）
export type UIToolType = 
  | 'select' 
  | 'hand' 
  | 'rectangle' 
  | 'diamond' 
  | 'circle' 
  | 'arrow' 
  | 'line' 
  | 'draw' 
  | 'text' 
  | 'image' 
  | 'sticky' 
  | 'link' 
  | 'frame'

interface Tool {
  id: UIToolType
  name: string
  icon: string
  active: boolean
}

interface CanvasState {
  tools: Tool[]
  theme: 'light' | 'dark'
  sidebarOpen: boolean
  zoom: number
  
  toggleTheme: () => void
  toggleSidebar: () => void
  setZoom: (zoom: number) => void
}

export const useCanvasStore = create<CanvasState>((set) => ({
  tools: [
    { id: 'select', name: '选择', icon: 'MousePointer2', active: true },
    { id: 'hand', name: '抓手', icon: 'Hand', active: false },
    { id: 'rectangle', name: '矩形', icon: 'Square', active: false },
    { id: 'diamond', name: '菱形', icon: 'Diamond', active: false },
    { id: 'circle', name: '圆形', icon: 'Circle', active: false },
    { id: 'arrow', name: '箭头', icon: 'MoveRight', active: false },
    { id: 'line', name: '线条', icon: 'Minus', active: false },
    { id: 'draw', name: '自由绘画', icon: 'Pencil', active: false },
    { id: 'text', name: '文本', icon: 'Type', active: false },
    { id: 'image', name: '图片', icon: 'Image', active: false },
    { id: 'sticky', name: '便签', icon: 'StickyNote', active: false },
    { id: 'link', name: '链接', icon: 'Link', active: false },
    { id: 'frame', name: '框架', icon: 'Frame', active: false }
  ],
  theme: 'light',
  sidebarOpen: false, // 默认关闭
  zoom: 100, // 默认100%缩放

  toggleTheme: () => set((state) => ({
    theme: state.theme === 'light' ? 'dark' : 'light'
  })),

  toggleSidebar: () => set((state) => ({
    sidebarOpen: !state.sidebarOpen
  })),

  setZoom: (zoom: number) => set(() => ({
    zoom
  })),
}))