/**
 * 测试环境设置 - 模拟Canvas API
 */

import { vi } from 'vitest';

// 模拟 ImageData
global.ImageData = class ImageData {
  width: number;
  height: number;
  data: Uint8ClampedArray;
  colorSpace: PredefinedColorSpace;

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
    this.colorSpace = 'srgb';
  }
};

// 模拟 HTMLCanvasElement
const mockImageData = new Map<string, ImageData>();

// 模拟 CanvasRenderingContext2D
class MockCanvasRenderingContext2D {
  fillStyle: string | CanvasGradient | CanvasPattern = 'black';
  strokeStyle: string | CanvasGradient | CanvasPattern = 'black';
  lineWidth = 1;
  globalAlpha = 1;
  globalCompositeOperation: GlobalCompositeOperation = 'source-over';
  canvas = new HTMLCanvasElement();

  getImageData(x: number, y: number, width: number, height: number): ImageData {
    const key = `${x}-${y}-${width}-${height}`;
    if (mockImageData.has(key)) {
      return mockImageData.get(key)!;
    }
    const imageData = new ImageData(width, height);
    mockImageData.set(key, imageData);
    return imageData;
  }

  putImageData(imageData: ImageData, x: number, y: number): void {
    const key = `${x}-${y}-${imageData.width}-${imageData.height}`;
    mockImageData.set(key, imageData);
  }

  drawImage = vi.fn();
  fillRect = vi.fn();
  strokeRect = vi.fn();
  clearRect = vi.fn();
  beginPath = vi.fn();
  closePath = vi.fn();
  moveTo = vi.fn();
  lineTo = vi.fn();
  arc = vi.fn();
  rect = vi.fn();
  quadraticCurveTo = vi.fn();
  bezierCurveTo = vi.fn();
  arcTo = vi.fn();
  ellipse = vi.fn();
  fill = vi.fn();
  stroke = vi.fn();
  clip = vi.fn();
  save = vi.fn();
  restore = vi.fn();
  translate = vi.fn();
  rotate = vi.fn();
  scale = vi.fn();
  transform = vi.fn();
  setTransform = vi.fn();
  resetTransform = vi.fn();
  createLinearGradient = vi.fn().mockReturnValue({} as CanvasGradient);
  createRadialGradient = vi.fn().mockReturnValue({
    addColorStop: vi.fn()
  } as CanvasGradient);
  createPattern = vi.fn().mockReturnValue(null);
  measureText = vi.fn().mockReturnValue({ width: 0 } as TextMetrics);
  fillText = vi.fn();
  strokeText = vi.fn();
  createImageData = vi.fn().mockImplementation(() => new ImageData(1, 1));
  isPointInPath = vi.fn().mockReturnValue(false);
  isPointInStroke = vi.fn().mockReturnValue(false);
}

global.CanvasRenderingContext2D = MockCanvasRenderingContext2D as any;

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

// 模拟 WebGL Context
const mockWebGLContext = {
  // WebGL 常量
  VERTEX_SHADER: 0x8B31,
  FRAGMENT_SHADER: 0x8B30,
  LINK_STATUS: 0x8B82,
  COMPILE_STATUS: 0x8B81,
  TEXTURE_2D: 0x0DE1,
  RGBA: 0x1908,
  UNSIGNED_BYTE: 0x1401,
  COLOR_BUFFER_BIT: 0x00004000,
  ARRAY_BUFFER: 0x8892,
  STATIC_DRAW: 0x88E4,
  FLOAT: 0x1406,
  NO_ERROR: 0,
  INVALID_ENUM: 0x0500,

  // Shader 方法
  createShader: vi.fn().mockReturnValue({}),
  shaderSource: vi.fn(),
  compileShader: vi.fn(),
  getShaderParameter: vi.fn().mockReturnValue(true),
  getShaderInfoLog: vi.fn().mockReturnValue(''),

  // Program 方法
  createProgram: vi.fn().mockReturnValue({}),
  attachShader: vi.fn(),
  linkProgram: vi.fn(),
  getProgramParameter: vi.fn().mockReturnValue(true),
  getProgramInfoLog: vi.fn().mockReturnValue(''),
  useProgram: vi.fn(),

  // Attribute/Uniform 方法
  getAttribLocation: vi.fn().mockReturnValue(0),
  getUniformLocation: vi.fn().mockReturnValue({}),
  getActiveAttrib: vi.fn().mockReturnValue({ name: 'a_position', type: 0x1406, size: 1 }),
  getActiveUniform: vi.fn().mockReturnValue({ name: 'u_color', type: 0x1406, size: 1 }),

  // Buffer 方法
  createBuffer: vi.fn().mockReturnValue({}),
  bindBuffer: vi.fn(),
  bufferData: vi.fn(),

  // Texture 方法
  createTexture: vi.fn().mockReturnValue({}),
  bindTexture: vi.fn(),
  texImage2D: vi.fn(),
  texParameteri: vi.fn(),

  // 渲染方法
  clear: vi.fn(),
  clearColor: vi.fn(),
  drawArrays: vi.fn(),
  drawElements: vi.fn(),

  // 状态方法
  enable: vi.fn(),
  disable: vi.fn(),
  blendFunc: vi.fn(),

  // 错误检查
  getError: vi.fn().mockReturnValue(0),

  // 信息获取
  getParameter: vi.fn().mockImplementation((param: number) => {
    switch (param) {
      case 0x1F00: return 'Mock Vendor'; // VENDOR
      case 0x1F01: return 'Mock Renderer'; // RENDERER
      case 0x1F02: return 'WebGL 2.0 Mock'; // VERSION
      case 0x1F03: return 'WebGL GLSL ES 2.0 Mock'; // SHADING_LANGUAGE_VERSION
      case 0x8B8C: return ['GL_mock_extension']; // EXTENSIONS
      case 0x0D33: return 16; // MAX_TEXTURE_SIZE
      case 0x8872: return 16; // MAX_VERTEX_ATTRIBS
      default: return 0;
    }
  }),

  // 清理方法
  deleteShader: vi.fn(),
  deleteProgram: vi.fn(),
  deleteBuffer: vi.fn(),
  deleteTexture: vi.fn()
};

// 扩展 HTMLCanvasElement 支持 WebGL
const originalGetContext = mockCanvasContext;
global.HTMLCanvasElement.prototype.getContext = vi.fn().mockImplementation((contextId: string) => {
  if (contextId === '2d') {
    return new MockCanvasRenderingContext2D();
  } else if (contextId === 'webgl' || contextId === 'experimental-webgl') {
    return mockWebGLContext;
  }
  return null;
});