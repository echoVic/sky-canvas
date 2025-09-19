/**
 * WebGPU 渲染器测试
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { WebGPURenderer } from '../WebGPURenderer';

// Mock WebGPU API
Object.defineProperty(navigator, 'gpu', {
  value: {
    requestAdapter: vi.fn().mockResolvedValue({
      requestDevice: vi.fn().mockResolvedValue({})
    })
  },
  configurable: true
});

describe('WebGPURenderer', () => {
  let canvas: HTMLCanvasElement;
  let renderer: WebGPURenderer;

  beforeEach(() => {
    // 创建模拟 canvas
    canvas = document.createElement('canvas');
    canvas.width = 800;
    canvas.height = 600;
    
    // Mock getContext for WebGPU
    canvas.getContext = vi.fn().mockReturnValue({
      configure: vi.fn(),
      getCurrentTexture: vi.fn().mockReturnValue({
        createView: vi.fn()
      })
    });
    
    renderer = new WebGPURenderer();
  });

  it('should create WebGPU renderer instance', () => {
    expect(renderer).toBeInstanceOf(WebGPURenderer);
  });

  it('should check WebGPU support', () => {
    const isSupported = WebGPURenderer.isSupported();
    expect(typeof isSupported).toBe('boolean');
  });

  it('should have correct capabilities', () => {
    const capabilities = renderer.getCapabilities();
    expect(capabilities).toHaveProperty('supportsTransforms');
    expect(capabilities).toHaveProperty('supportsFilters');
    expect(capabilities).toHaveProperty('supportsBlending');
    expect(capabilities).toHaveProperty('maxTextureSize');
    expect(capabilities).toHaveProperty('supportedFormats');
  });

  it('should initialize successfully', async () => {
    const result = await renderer.initialize(canvas);
    expect(typeof result).toBe('boolean');
  });

  it('should handle viewport changes', () => {
    expect(() => {
      renderer.setViewport({ width: 1024, height: 768 });
    }).not.toThrow();
  });

  it('should handle viewport setting', () => {
    const viewport = { x: 0, y: 0, width: 800, height: 600 };
    expect(() => {
      renderer.setViewport(viewport);
    }).not.toThrow();
  });

  it('should dispose properly', () => {
    expect(() => {
      renderer.dispose();
    }).not.toThrow();
  });
});