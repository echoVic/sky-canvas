/**
 * Vitest 测试设置文件
 */

import '@testing-library/jest-dom';
import { vi } from 'vitest';

// Mock Canvas 2D Context
const mockCanvas2DContext = {
  clearRect: vi.fn(),
  fillRect: vi.fn(),
  strokeRect: vi.fn(),
  fillText: vi.fn(),
  strokeText: vi.fn(),
  measureText: vi.fn(() => ({ width: 0 })),
  beginPath: vi.fn(),
  closePath: vi.fn(),
  moveTo: vi.fn(),
  lineTo: vi.fn(),
  arc: vi.fn(),
  stroke: vi.fn(),
  fill: vi.fn(),
  save: vi.fn(),
  restore: vi.fn(),
  translate: vi.fn(),
  rotate: vi.fn(),
  scale: vi.fn(),
  setTransform: vi.fn(),
  getTransform: vi.fn(),
  setLineDash: vi.fn(),
  getLineDash: vi.fn(),
};

// Mock performance.memory
Object.defineProperty(performance, 'memory', {
  value: {
    usedJSHeapSize: 10 * 1024 * 1024,
    totalJSHeapSize: 20 * 1024 * 1024,
    jsHeapSizeLimit: 100 * 1024 * 1024
  },
  configurable: true
});

// Mock ResizeObserver
global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));

// Mock WebGL Context
const mockWebGLContext = {
  canvas: null,
  drawingBufferWidth: 800,
  drawingBufferHeight: 600,
  getExtension: vi.fn(),
  getParameter: vi.fn(),
  createShader: vi.fn(),
  shaderSource: vi.fn(),
  compileShader: vi.fn(),
  getShaderParameter: vi.fn(),
  createProgram: vi.fn(),
  attachShader: vi.fn(),
  linkProgram: vi.fn(),
  getProgramParameter: vi.fn(),
  useProgram: vi.fn(),
  createBuffer: vi.fn(),
  bindBuffer: vi.fn(),
  bufferData: vi.fn(),
  getAttribLocation: vi.fn(),
  vertexAttribPointer: vi.fn(),
  enableVertexAttribArray: vi.fn(),
  getUniformLocation: vi.fn(),
  uniform1f: vi.fn(),
  uniform2f: vi.fn(),
  uniform3f: vi.fn(),
  uniform4f: vi.fn(),
  uniformMatrix4fv: vi.fn(),
  clear: vi.fn(),
  clearColor: vi.fn(),
  enable: vi.fn(),
  disable: vi.fn(),
  depthFunc: vi.fn(),
  blendFunc: vi.fn(),
  viewport: vi.fn(),
  drawArrays: vi.fn(),
  drawElements: vi.fn(),
};

// Mock HTMLCanvasElement.getContext with proper typing
HTMLCanvasElement.prototype.getContext = vi.fn((contextType: string) => {
  if (contextType === 'webgl' || contextType === 'webgl2') {
    return mockWebGLContext as any;
  }
  if (contextType === '2d') {
    return mockCanvas2DContext as any;
  }
  return null;
}) as any;