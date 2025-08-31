/**
 * 测试工具和帮助函数
 */

import { vi } from 'vitest';
import { render, RenderOptions } from '@testing-library/react';
import { ReactElement, ReactNode } from 'react';
import { CanvasProvider } from '../contexts/CanvasProvider';

// Mock Canvas SDK Factory
export const createMockCanvasSDK = () => ({
  initialize: vi.fn(),
  addShape: vi.fn(),
  removeShape: vi.fn(),
  updateShape: vi.fn(),
  selectShape: vi.fn(),
  deselectShape: vi.fn(),
  clearSelection: vi.fn(),
  getShapes: vi.fn(() => []),
  getSelectedShapes: vi.fn(() => []),
  canUndo: vi.fn(() => false),
  canRedo: vi.fn(() => false),
  undo: vi.fn(),
  redo: vi.fn(),
  clearShapes: vi.fn(),
  hitTest: vi.fn(() => null),
  dispose: vi.fn(),
  on: vi.fn(),
  off: vi.fn(),
  emit: vi.fn(),
});

// Mock Graphics Context Factory
export const createMockGraphicsContextFactory = () => ({
  create: vi.fn(() => ({
    clear: vi.fn(),
    drawShape: vi.fn(),
    setViewport: vi.fn(),
    dispose: vi.fn(),
  })),
});

// Mock Canvas Element
export const createMockCanvas = (width = 800, height = 600): HTMLCanvasElement => {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  return canvas;
};

// Mock Shape
export const createMockShape = (id?: string) => ({
  id: id || `shape-${Math.random().toString(36).substr(2, 9)}`,
  type: 'rectangle' as const,
  position: { x: 10, y: 10 },
  size: { width: 100, height: 50 },
  bounds: { x: 10, y: 10, width: 100, height: 50 },
  selected: false,
  locked: false,
  visible: true,
  zIndex: 0,
  render: vi.fn(),
  clone: vi.fn().mockReturnValue({}),
  dispose: vi.fn(),
  update: vi.fn(),
  serialize: vi.fn().mockReturnValue({}),
  deserialize: vi.fn(),
  hitTest: vi.fn().mockReturnValue(false),
  getBounds: vi.fn().mockReturnValue({ x: 10, y: 10, width: 100, height: 50 }),
});

// 自定义渲染函数，包装 CanvasProvider
interface AllTheProvidersProps {
  children: ReactNode;
}

const AllTheProviders = ({ children }: AllTheProvidersProps) => {
  return (
    <CanvasProvider>
      {children}
    </CanvasProvider>
  );
};

const customRender = (
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>
) => render(ui, { wrapper: AllTheProviders, ...options });

export * from '@testing-library/react';
export { customRender as render };

// 异步工具
export const waitFor = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// 事件模拟
export const createMouseEvent = (type: string, options: any = {}) => {
  return new MouseEvent(type, {
    bubbles: true,
    cancelable: true,
    view: window,
    clientX: 0,
    clientY: 0,
    ...options,
  });
};

export const createTouchEvent = (type: string, touches: any[] = []) => {
  const event = new TouchEvent(type, {
    bubbles: true,
    cancelable: true,
    touches: touches as any,
    targetTouches: touches as any,
    changedTouches: touches as any,
  });
  return event;
};

// 性能测试工具
export const measurePerformance = async (fn: () => Promise<void> | void) => {
  const start = performance.now();
  await fn();
  const end = performance.now();
  return end - start;
};

// 内存测试工具
export const getMemoryUsage = () => {
  const perfWithMemory = performance as any;
  if (perfWithMemory.memory) {
    return {
      used: perfWithMemory.memory.usedJSHeapSize,
      total: perfWithMemory.memory.totalJSHeapSize,
      limit: perfWithMemory.memory.jsHeapSizeLimit,
    };
  }
  return null;
};

// Canvas 测试工具
export const getCanvasContext = (canvas: HTMLCanvasElement, type: '2d' | 'webgl' | 'webgl2') => {
  return canvas.getContext(type);
};

export const captureCanvasData = (canvas: HTMLCanvasElement) => {
  return canvas.toDataURL();
};