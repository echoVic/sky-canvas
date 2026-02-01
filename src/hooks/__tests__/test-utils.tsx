/**
 * 测试工具和帮助函数
 */

import { vi } from 'vitest'

// Mock Canvas Element
export const createMockCanvas = (width = 800, height = 600): HTMLCanvasElement => {
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  return canvas
}

// Mock Shape
export const createMockShape = (id?: string) => ({
  id: id || `shape-${Math.random().toString(36).substr(2, 9)}`,
  type: 'rectangle' as const,
  transform: {
    position: { x: 10, y: 10 },
    rotation: 0,
    scale: { x: 1, y: 1 },
  },
  style: {
    fillColor: '#ffffff',
    strokeColor: '#000000',
    strokeWidth: 1,
    opacity: 1,
  },
  visible: true,
  zIndex: 0,
  locked: false,
  createdAt: new Date(),
  updatedAt: new Date(),
  // 兼容旧属性
  position: { x: 10, y: 10 },
  size: { width: 100, height: 50 },
  bounds: { x: 10, y: 10, width: 100, height: 50 },
  selected: false,
  render: vi.fn(),
  clone: vi.fn().mockReturnValue({}),
  dispose: vi.fn(),
  update: vi.fn(),
  serialize: vi.fn().mockReturnValue({}),
  deserialize: vi.fn(),
  hitTest: vi.fn().mockReturnValue(false),
  getBounds: vi.fn().mockReturnValue({ x: 10, y: 10, width: 100, height: 50 }),
})
