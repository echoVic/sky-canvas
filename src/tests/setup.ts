/**
 * Vitest 测试环境设置
 */

import { vi, afterEach } from 'vitest';
import '@testing-library/jest-dom';
import { cleanup } from '@testing-library/react';

// 每个测试后清理
afterEach(() => {
  cleanup();
});

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
  key: vi.fn(),
  length: 0
};

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock
});

// Mock sessionStorage
Object.defineProperty(window, 'sessionStorage', {
  value: localStorageMock
});

// Mock performance.memory
Object.defineProperty(performance, 'memory', {
  value: {
    usedJSHeapSize: 10 * 1024 * 1024,
    totalJSHeapSize: 20 * 1024 * 1024,
    jsHeapSizeLimit: 100 * 1024 * 1024
  },
  configurable: true
});

// Mock window.confirm
Object.defineProperty(window, 'confirm', {
  value: vi.fn(() => true),
  configurable: true
});

// Mock window.alert
Object.defineProperty(window, 'alert', {
  value: vi.fn(),
  configurable: true
});

// Mock console methods to reduce noise in tests
global.console = {
  ...console,
  log: vi.fn(),
  debug: vi.fn(),
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn()
};

// Mock global.gc for memory management tests
Object.defineProperty(global, 'gc', {
  value: vi.fn(),
  configurable: true
});

// Mock ResizeObserver
global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn()
}));

// Mock IntersectionObserver
global.IntersectionObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn()
}));

// Mock requestAnimationFrame
global.requestAnimationFrame = vi.fn((cb) => {
  setTimeout(cb, 16);
  return 1;
});

global.cancelAnimationFrame = vi.fn();

// Mock URL.createObjectURL
global.URL.createObjectURL = vi.fn(() => 'mock-url');
global.URL.revokeObjectURL = vi.fn();

// Mock HTMLCanvasElement
HTMLCanvasElement.prototype.getContext = vi.fn((type: string) => {
  if (type === '2d') {
    return {
      fillRect: vi.fn(),
      clearRect: vi.fn(),
      getImageData: vi.fn(),
      putImageData: vi.fn(),
      createLinearGradient: vi.fn(),
      createRadialGradient: vi.fn(),
      createPattern: vi.fn(),
      setTransform: vi.fn(),
      resetTransform: vi.fn(),
      drawImage: vi.fn(),
      save: vi.fn(),
      restore: vi.fn(),
      beginPath: vi.fn(),
      moveTo: vi.fn(),
      lineTo: vi.fn(),
      closePath: vi.fn(),
      stroke: vi.fn(),
      fill: vi.fn(),
      arc: vi.fn(),
      rect: vi.fn(),
      transform: vi.fn(),
      translate: vi.fn(),
      rotate: vi.fn(),
      scale: vi.fn(),
      measureText: vi.fn(() => ({ width: 100 })),
      fillText: vi.fn(),
      strokeText: vi.fn(),
      canvas: {
        width: 800,
        height: 600,
      },
    };
  }
  if (type === 'webgl' || type === 'webgl2') {
    return {
      canvas: {
        width: 800,
        height: 600,
      },
      createShader: vi.fn(),
      shaderSource: vi.fn(),
      compileShader: vi.fn(),
      createProgram: vi.fn(),
      attachShader: vi.fn(),
      linkProgram: vi.fn(),
      useProgram: vi.fn(),
      createBuffer: vi.fn(),
      bindBuffer: vi.fn(),
      bufferData: vi.fn(),
      getAttribLocation: vi.fn(),
      enableVertexAttribArray: vi.fn(),
      vertexAttribPointer: vi.fn(),
      drawArrays: vi.fn(),
      clear: vi.fn(),
      clearColor: vi.fn(),
      viewport: vi.fn(),
    };
  }
  return null;
});

HTMLCanvasElement.prototype.toDataURL = vi.fn(() => 'data:image/png;base64,mock');

// Mock Blob
global.Blob = class MockBlob {
  constructor(public parts: any[], public options?: any) {}
  
  size = 0;
  type = '';
  
  arrayBuffer() {
    return Promise.resolve(new ArrayBuffer(0));
  }
  
  text() {
    return Promise.resolve('');
  }
  
  stream() {
    return new ReadableStream();
  }
  
  slice() {
    return new MockBlob([]);
  }
} as any;

// Mock File
global.File = class MockFile extends global.Blob {
  constructor(
    parts: any[], 
    public name: string, 
    options?: any
  ) {
    super(parts, options);
  }
  
  lastModified = Date.now();
  webkitRelativePath = '';
} as any;

// Mock FileReader
global.FileReader = class MockFileReader {
  result: any = null;
  error: any = null;
  readyState = 0;
  
  onload: ((event: any) => void) | null = null;
  onerror: ((event: any) => void) | null = null;
  onabort: ((event: any) => void) | null = null;
  
  readAsText() {
    setTimeout(() => {
      this.result = 'mock file content';
      this.readyState = 2;
      if (this.onload) {
        this.onload({ target: this });
      }
    }, 0);
  }
  
  readAsDataURL() {
    setTimeout(() => {
      this.result = 'data:text/plain;base64,bW9jayBmaWxlIGNvbnRlbnQ=';
      this.readyState = 2;
      if (this.onload) {
        this.onload({ target: this });
      }
    }, 0);
  }
  
  readAsArrayBuffer() {
    setTimeout(() => {
      this.result = new ArrayBuffer(0);
      this.readyState = 2;
      if (this.onload) {
        this.onload({ target: this });
      }
    }, 0);
  }
  
  abort() {
    this.readyState = 0;
    if (this.onabort) {
      this.onabort({ target: this });
    }
  }
} as any;

// 设置测试环境变量
process.env.NODE_ENV = 'test';
