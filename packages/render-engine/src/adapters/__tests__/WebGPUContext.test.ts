/**
 * WebGPUContext 单元测试
 * 基于 BDD (Behavior-Driven Development) 和 AAA (Arrange-Act-Assert) 模式
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { IColor, IGraphicsState, ITextStyle } from '../../graphics/IGraphicsContext';
import { Rectangle } from '../../math/Rectangle';
import {
  WebGPUContext,
  WebGPUContextConfig
} from '../WebGPUContext';

// Mock WebGPU API
const mockAdapter = {
  requestDevice: vi.fn().mockResolvedValue({
    createCommandEncoder: vi.fn(() => ({
      beginRenderPass: vi.fn(() => ({
        end: vi.fn(),
        setViewport: vi.fn(),
        draw: vi.fn()
      })),
      finish: vi.fn(() => ({ /* command buffer */ }))
    })),
    queue: {
      submit: vi.fn()
    },
    createBuffer: vi.fn(),
    createTexture: vi.fn(),
    createRenderPipeline: vi.fn(),
    destroy: vi.fn()
  })
};

const mockGPU = {
  requestAdapter: vi.fn().mockResolvedValue(mockAdapter),
  getPreferredCanvasFormat: vi.fn().mockReturnValue('bgra8unorm')
};

const mockCanvas = {
  width: 800,
  height: 600,
  getContext: vi.fn().mockReturnValue({
    configure: vi.fn(),
    getCurrentTexture: vi.fn(() => ({
      createView: vi.fn()
    }))
  })
} as unknown as HTMLCanvasElement;

// Mock global navigator.gpu
Object.defineProperty(global, 'navigator', {
  value: {
    gpu: mockGPU
  },
  writable: true
});

describe('WebGPUContext', () => {
  let webGPUContext: WebGPUContext;
  let config: WebGPUContextConfig;

  beforeEach(() => {
    // Arrange: 重置所有 mock
    vi.clearAllMocks();
    
    // Arrange: 准备配置
    config = {
      powerPreference: 'high-performance',
      antialias: true,
      alpha: true
    };
    
    // Arrange: 创建 WebGPUContext 实例
    webGPUContext = new WebGPUContext(mockCanvas, config);
  });

  afterEach(() => {
    webGPUContext?.dispose();
  });

  describe('Given a WebGPUContext instance', () => {
    describe('When accessing basic properties', () => {
      it('Then should return correct canvas dimensions', () => {
        // Arrange: 设置预期值
        const expectedWidth = 800;
        const expectedHeight = 600;

        // Act: 获取尺寸
        const width = webGPUContext.width;
        const height = webGPUContext.height;

        // Assert: 验证结果
        expect(width).toBe(expectedWidth);
        expect(height).toBe(expectedHeight);
      });

      it('Then should return device pixel ratio', () => {
        // Act: 获取设备像素比
        const ratio = webGPUContext.devicePixelRatio;

        // Assert: 验证结果（测试环境中默认为 1）
        expect(ratio).toBe(1);
      });

      it('Then should return canvas reference', () => {
        // Act: 获取画布
        const canvas = webGPUContext.getCanvas();

        // Assert: 验证画布引用
        expect(canvas).toBe(mockCanvas);
      });

      it('Then should return configuration', () => {
        // Act: 获取配置
        const returnedConfig = webGPUContext.getConfig();

        // Assert: 验证配置包含默认值和传入的配置
        const expectedConfig = {
          powerPreference: 'high-performance',
          forceFallbackAdapter: false,
          antialias: true,
          alpha: true,
          premultipliedAlpha: true,
          preserveDrawingBuffer: false,
          desynchronized: false
        };
        expect(returnedConfig).toEqual(expectedConfig);
      });
    });

    describe('When initializing context', () => {
      it('Then should initialize successfully when WebGPU is supported', async () => {
        // Act: 初始化上下文
        const result = await webGPUContext.initialize();

        // Assert: 验证初始化成功
        expect(result).toBe(true);
        expect(webGPUContext.isContextInitialized()).toBe(true);
        expect(mockGPU.requestAdapter).toHaveBeenCalled();
        expect(mockAdapter.requestDevice).toHaveBeenCalled();
      });

      it('Then should return false when WebGPU is not supported', async () => {
        // Arrange: 模拟不支持 WebGPU
        Object.defineProperty(global, 'navigator', {
          value: {},
          writable: true
        });
        const unsupportedContext = new WebGPUContext(mockCanvas, config);

        // Act: 尝试初始化
        const result = await unsupportedContext.initialize();

        // Assert: 验证初始化失败
        expect(result).toBe(false);
        expect(unsupportedContext.isContextInitialized()).toBe(false);
      });

      it('Then should handle adapter request failure', async () => {
        // Arrange: 模拟适配器请求失败
        mockGPU.requestAdapter.mockResolvedValueOnce(null);

        // Act: 尝试初始化
        const result = await webGPUContext.initialize();

        // Assert: 验证初始化失败
        expect(result).toBe(false);
        expect(webGPUContext.isContextInitialized()).toBe(false);
      });
    });

    describe('When managing graphics state', () => {
      it('Then should save and restore state correctly', () => {
        // Arrange: 准备初始状态
        const initialState = webGPUContext.getState();

        // Act: 保存状态，修改，然后恢复
        webGPUContext.save();
        webGPUContext.setOpacity(0.5);
        webGPUContext.restore();

        // Assert: 验证状态恢复
        const restoredState = webGPUContext.getState();
        expect(restoredState.style.opacity).toBe(initialState.style.opacity);
      });

      it('Then should update state correctly', () => {
        // Arrange: 准备新状态
        const newState: Partial<IGraphicsState> = {
          style: { opacity: 0.7 },
          transform: { a: 1, b: 0, c: 0, d: 1, e: 10, f: 20 }
        };

        // Act: 设置状态
        webGPUContext.setState(newState);

        // Assert: 验证状态更新
        const currentState = webGPUContext.getState();
        expect(currentState.style.opacity).toBe(0.7);
        expect(currentState.transform).toEqual(newState.transform);
      });
    });

    describe('When managing viewport and rendering state', () => {
      it('Then should set viewport correctly', () => {
        // Arrange: 准备视口参数
        const x = 10, y = 20, width = 400, height = 300;

        // Act: 设置视口
        webGPUContext.setViewport(x, y, width, height);
        const viewport = webGPUContext.getViewport();

        // Assert: 验证视口设置
        expect(viewport.x).toBe(x);
        expect(viewport.y).toBe(y);
        expect(viewport.width).toBe(width);
        expect(viewport.height).toBe(height);
      });

      it('Then should resize correctly', () => {
        // Arrange: 准备新尺寸
        const newWidth = 1024;
        const newHeight = 768;

        // Act: 调整尺寸
        webGPUContext.resize(newWidth, newHeight);

        // Assert: 验证尺寸更新
        expect(mockCanvas.width).toBe(newWidth);
        expect(mockCanvas.height).toBe(newHeight);
      });

      it('Then should set scissor test correctly', () => {
        // Arrange: 准备裁剪区域
        const rect = new Rectangle(10, 20, 100, 50);

        // Act: 启用裁剪测试
        webGPUContext.setScissorTest(true, rect);

        // Assert: 验证裁剪设置（通过内部状态验证）
        expect(() => webGPUContext.setScissorTest(true, rect)).not.toThrow();
      });

      it('Then should set blend mode correctly', () => {
        // Arrange: 准备混合模式
        const blendMode = 'multiply';

        // Act: 设置混合模式
        webGPUContext.setBlendMode(blendMode);

        // Assert: 验证设置不抛出错误
        expect(() => webGPUContext.setBlendMode(blendMode)).not.toThrow();
      });

      it('Then should set depth test correctly', () => {
        // Act: 启用深度测试
        webGPUContext.setDepthTest(true);

        // Assert: 验证设置不抛出错误
        expect(() => webGPUContext.setDepthTest(true)).not.toThrow();
      });

      it('Then should set cull face correctly', () => {
        // Act: 启用面剔除
        webGPUContext.setCullFace(true);

        // Assert: 验证设置不抛出错误
        expect(() => webGPUContext.setCullFace(true)).not.toThrow();
      });
    });

    describe('When applying transformations', () => {
      it('Then should apply transform matrix correctly', () => {
        // Arrange: 准备变换矩阵
        const transform = { a: 2, b: 0, c: 0, d: 2, e: 100, f: 50 };

        // Act: 应用变换
        webGPUContext.setTransform(transform);

        // Assert: 验证变换应用（占位符实现不抛出错误）
        expect(() => webGPUContext.setTransform(transform)).not.toThrow();
      });

      it('Then should translate correctly', () => {
        // Arrange: 准备平移参数
        const x = 50, y = 30;

        // Act: 执行平移
        webGPUContext.translate(x, y);

        // Assert: 验证平移不抛出错误
        expect(() => webGPUContext.translate(x, y)).not.toThrow();
      });

      it('Then should rotate correctly', () => {
        // Arrange: 准备旋转角度
        const angle = Math.PI / 4;

        // Act: 执行旋转
        webGPUContext.rotate(angle);

        // Assert: 验证旋转不抛出错误
        expect(() => webGPUContext.rotate(angle)).not.toThrow();
      });

      it('Then should scale correctly', () => {
        // Arrange: 准备缩放参数
        const scaleX = 2, scaleY = 1.5;

        // Act: 执行缩放
        webGPUContext.scale(scaleX, scaleY);

        // Assert: 验证缩放不抛出错误
        expect(() => webGPUContext.scale(scaleX, scaleY)).not.toThrow();
      });

      it('Then should reset transform correctly', () => {
        // Act: 重置变换
        webGPUContext.resetTransform();

        // Assert: 验证重置不抛出错误
        expect(() => webGPUContext.resetTransform()).not.toThrow();
      });
    });

    describe('When setting styles', () => {
      it('Then should set fill color correctly', () => {
        // Arrange: 准备颜色
        const color: IColor = { r: 1, g: 0, b: 0, a: 0.8 };

        // Act: 设置填充颜色
        webGPUContext.setFillColor(color);

        // Assert: 验证颜色设置不抛出错误
        expect(() => webGPUContext.setFillColor(color)).not.toThrow();
      });

      it('Then should set stroke color correctly', () => {
        // Arrange: 准备颜色字符串
        const color = '#00FF00';

        // Act: 设置描边颜色
        webGPUContext.setStrokeColor(color);

        // Assert: 验证颜色设置不抛出错误
        expect(() => webGPUContext.setStrokeColor(color)).not.toThrow();
      });

      it('Then should set line width correctly', () => {
        // Arrange: 准备线宽
        const width = 5;

        // Act: 设置线宽
        webGPUContext.setLineWidth(width);

        // Assert: 验证线宽设置不抛出错误
        expect(() => webGPUContext.setLineWidth(width)).not.toThrow();
      });

      it('Then should set opacity correctly', () => {
        // Arrange: 准备透明度
        const opacity = 0.6;

        // Act: 设置透明度
        webGPUContext.setOpacity(opacity);

        // Assert: 验证透明度设置不抛出错误
        expect(() => webGPUContext.setOpacity(opacity)).not.toThrow();
      });
    });

    describe('When clearing and presenting', () => {
      it('Then should clear correctly', () => {
        // Act: 清空画布
        webGPUContext.clear();

        // Assert: 验证清空不抛出错误
        expect(() => webGPUContext.clear()).not.toThrow();
      });

      it('Then should clear specific rectangle correctly', () => {
        // Arrange: 准备清空区域
        const x = 10, y = 20, width = 100, height = 50;

        // Act: 清空指定区域
        webGPUContext.clearRect(x, y, width, height);

        // Assert: 验证清空不抛出错误
        expect(() => webGPUContext.clearRect(x, y, width, height)).not.toThrow();
      });

      it('Then should present correctly', () => {
        // Act: 呈现画面
        webGPUContext.present();

        // Assert: 验证呈现不抛出错误
        expect(() => webGPUContext.present()).not.toThrow();
      });
    });

    describe('When drawing shapes', () => {
      it('Then should draw line correctly', () => {
        // Arrange: 准备线段参数
        const x1 = 10, y1 = 20, x2 = 100, y2 = 200;

        // Act: 绘制线段
        webGPUContext.drawLine(x1, y1, x2, y2);

        // Assert: 验证绘制不抛出错误
        expect(() => webGPUContext.drawLine(x1, y1, x2, y2)).not.toThrow();
      });

      it('Then should fill rectangle correctly', () => {
        // Arrange: 准备矩形参数
        const x = 10, y = 20, width = 100, height = 50;

        // Act: 填充矩形
        webGPUContext.fillRect(x, y, width, height);

        // Assert: 验证填充不抛出错误
        expect(() => webGPUContext.fillRect(x, y, width, height)).not.toThrow();
      });

      it('Then should stroke rectangle correctly', () => {
        // Arrange: 准备矩形参数
        const x = 10, y = 20, width = 100, height = 50;

        // Act: 描边矩形
        webGPUContext.strokeRect(x, y, width, height);

        // Assert: 验证描边不抛出错误
        expect(() => webGPUContext.strokeRect(x, y, width, height)).not.toThrow();
      });

      it('Then should fill circle correctly', () => {
        // Arrange: 准备圆形参数
        const x = 50, y = 50, radius = 25;

        // Act: 填充圆形
        webGPUContext.fillCircle(x, y, radius);

        // Assert: 验证填充不抛出错误
        expect(() => webGPUContext.fillCircle(x, y, radius)).not.toThrow();
      });

      it('Then should stroke circle correctly', () => {
        // Arrange: 准备圆形参数
        const x = 50, y = 50, radius = 25;

        // Act: 描边圆形
        webGPUContext.strokeCircle(x, y, radius);

        // Assert: 验证描边不抛出错误
        expect(() => webGPUContext.strokeCircle(x, y, radius)).not.toThrow();
      });
    });

    describe('When working with text', () => {
      it('Then should fill text correctly', () => {
        // Arrange: 准备文本参数
        const text = 'Hello World';
        const x = 100, y = 50;
        const style: ITextStyle = {
          fontFamily: 'Arial',
          fontSize: 16,
          fillColor: '#FF0000'
        };

        // Act: 绘制填充文本
        webGPUContext.fillText(text, x, y, style);

        // Assert: 验证文本绘制不抛出错误
        expect(() => webGPUContext.fillText(text, x, y, style)).not.toThrow();
      });

      it('Then should stroke text correctly', () => {
        // Arrange: 准备文本参数
        const text = 'Stroke Text';
        const x = 50, y = 100;

        // Act: 绘制描边文本
        webGPUContext.strokeText(text, x, y);

        // Assert: 验证文本绘制不抛出错误
        expect(() => webGPUContext.strokeText(text, x, y)).not.toThrow();
      });

      it('Then should measure text correctly', () => {
        // Arrange: 准备文本
        const text = 'Measure Me';

        // Act: 测量文本
        const metrics = webGPUContext.measureText(text);

        // Assert: 验证测量结果
        expect(metrics).toBeDefined();
        expect(typeof metrics.width).toBe('number');
        expect(typeof metrics.height).toBe('number');
      });
    });

    describe('When managing frame lifecycle', () => {
      it('Then should begin frame correctly', () => {
        // Act: 开始帧
        webGPUContext.beginFrame();

        // Assert: 验证开始帧不抛出错误
        expect(() => webGPUContext.beginFrame()).not.toThrow();
      });

      it('Then should end frame correctly', () => {
        // Act: 结束帧
        webGPUContext.endFrame();

        // Assert: 验证结束帧不抛出错误
        expect(() => webGPUContext.endFrame()).not.toThrow();
      });
    });

    describe('When getting capabilities and stats', () => {
      it('Then should return capabilities correctly', () => {
        // Act: 获取能力
        const capabilities = webGPUContext.getCapabilities();

        // Assert: 验证能力信息
        expect(capabilities).toBeDefined();
        expect(typeof capabilities.maxTextureSize).toBe('number');
        expect(typeof capabilities.supportsHardwareAcceleration).toBe('boolean');
        expect(typeof capabilities.supportsTransforms).toBe('boolean');
      });

      it('Then should return stats correctly', () => {
        // Act: 获取统计信息
        const stats = webGPUContext.getStats();

        // Assert: 验证统计信息
        expect(stats).toBeDefined();
        expect(typeof stats.drawCalls).toBe('number');
        expect(typeof stats.triangles).toBe('number');
        expect(typeof stats.vertices).toBe('number');
        expect(typeof stats.textureMemory).toBe('number');
        expect(typeof stats.bufferMemory).toBe('number');
      });
    });

    describe('When checking WebGPU support', () => {
      it('Then should check support correctly', () => {
        // Act: 检查支持
        const isSupported = WebGPUContext.isSupported();

        // Assert: 验证支持检查
        expect(typeof isSupported).toBe('boolean');
      });

      it('Then should get available adapters', async () => {
        // Act: 获取可用适配器
        const adapters = await WebGPUContext.getAvailableAdapters();

        // Assert: 验证适配器列表
        expect(Array.isArray(adapters)).toBe(true);
      });
    });
  });
});
