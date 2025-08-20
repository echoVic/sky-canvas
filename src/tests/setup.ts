/**
 * Vitest 测试环境设置
 */

import { vi } from 'vitest';

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
