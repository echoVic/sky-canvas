/**
 * 测试环境设置 - 模拟Canvas API
 */

import { vi } from 'vitest';

// 模拟 ImageData
global.ImageData = class ImageData {
  width: number;
  height: number;
  data: Uint8ClampedArray;

  constructor(widthOrData: number | Uint8ClampedArray, height?: number) {
    if (typeof widthOrData === 'number') {
      this.width = widthOrData;
      this.height = height!;
      this.data = new Uint8ClampedArray(this.width * this.height * 4);
    } else {
      this.data = widthOrData;
      this.width = Math.sqrt(widthOrData.length / 4);
      this.height = this.width;
    }
  }
};

// 模拟 HTMLCanvasElement
const mockImageData = new Map<string, ImageData>();

const mockCanvasContext = {
  fillStyle: 'black',
  getImageData: vi.fn().mockImplementation((x: number, y: number, width: number, height: number) => {
    const key = `${x}-${y}-${width}-${height}`;
    if (mockImageData.has(key)) {
      return mockImageData.get(key);
    }
    const imageData = new ImageData(width, height);
    mockImageData.set(key, imageData);
    return imageData;
  }),
  putImageData: vi.fn().mockImplementation((imageData: ImageData, x: number, y: number) => {
    const key = `${x}-${y}-${imageData.width}-${imageData.height}`;
    mockImageData.set(key, imageData);
  }),
  drawImage: vi.fn(),
  fillRect: vi.fn().mockImplementation((x: number, y: number, width: number, height: number) => {
    // 模拟填充操作 - 设置一些颜色数据
    const key = `${x}-${y}-${width}-${height}`;
    const imageData = new ImageData(width, height);
    // 根据fillStyle设置颜色
    const color = mockCanvasContext.fillStyle === 'red' ? [255, 0, 0, 255] : [0, 0, 0, 255];
    for (let i = 0; i < imageData.data.length; i += 4) {
      imageData.data[i] = color[0];     // R
      imageData.data[i + 1] = color[1]; // G  
      imageData.data[i + 2] = color[2]; // B
      imageData.data[i + 3] = color[3]; // A
    }
    mockImageData.set(key, imageData);
  }),
  toBlob: vi.fn().mockImplementation((callback: (blob: Blob | null) => void) => {
    const blob = new Blob(['fake image data'], { type: 'image/png' });
    callback(blob);
  }),
  toDataURL: vi.fn().mockReturnValue('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==')
};

global.HTMLCanvasElement = class HTMLCanvasElement {
  width = 100;
  height = 100;

  getContext(contextId: string) {
    if (contextId === '2d') {
      return mockCanvasContext;
    }
    return null;
  }

  toBlob(callback: (blob: Blob | null) => void) {
    mockCanvasContext.toBlob(callback);
  }

  toDataURL() {
    return mockCanvasContext.toDataURL();
  }
} as any;

// 模拟 document.createElement
const originalCreateElement = document.createElement;
document.createElement = vi.fn().mockImplementation((tagName: string) => {
  if (tagName === 'canvas') {
    return new HTMLCanvasElement();
  }
  return originalCreateElement.call(document, tagName);
});

// 模拟 HTMLImageElement
global.HTMLImageElement = class HTMLImageElement {
  width = 0;
  height = 0;
  naturalWidth = 100;
  naturalHeight = 100;
  complete = true;
  onload: (() => void) | null = null;
  onerror: (() => void) | null = null;
} as any;