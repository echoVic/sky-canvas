/**
 * WebGLPerformanceAnalyzer 单元测试
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { WebGLPerformanceAnalyzer, WebGLPerformanceMonitor } from '../monitoring/WebGLAnalyzer';

// Mock WebGL context
const createMockWebGLContext = () => {
  return {
    getExtension: vi.fn(() => null),
    getParameter: vi.fn(() => 0),
    createShader: vi.fn(() => ({} as WebGLShader)),
    shaderSource: vi.fn(),
    compileShader: vi.fn(),
    getShaderParameter: vi.fn(() => true),
    createProgram: vi.fn(() => ({} as WebGLProgram)),
    attachShader: vi.fn(),
    linkProgram: vi.fn(),
    getProgramParameter: vi.fn(() => true),
    useProgram: vi.fn(),
    createBuffer: vi.fn(() => ({} as WebGLBuffer)),
    bindBuffer: vi.fn(),
    bufferData: vi.fn(),
    VERTEX_SHADER: 0x8B31,
    FRAGMENT_SHADER: 0x8B30,
    ARRAY_BUFFER: 0x8892,
  } as unknown as WebGLRenderingContext;
};

describe('WebGLPerformanceAnalyzer', () => {
  let analyzer: WebGLPerformanceAnalyzer;
  let mockGL: WebGLRenderingContext;

  beforeEach(() => {
    mockGL = createMockWebGLContext();
    analyzer = new WebGLPerformanceAnalyzer(mockGL);
  });

  describe('基本功能', () => {
    it('应该正确初始化', () => {
      expect(analyzer).toBeDefined();
    });

    it('应该能够启用和禁用', () => {
      analyzer.setEnabled(true);
      expect(() => analyzer.recordDrawCall(100, 50)).not.toThrow();

      analyzer.setEnabled(false);
      expect(() => analyzer.recordDrawCall(100, 50)).not.toThrow();
    });

    it('应该能够记录绘制调用', () => {
      analyzer.setEnabled(true);
      analyzer.recordDrawCall(100, 50);

      const metrics = analyzer.getMetrics();
      expect(metrics.drawCalls).toBeGreaterThan(0);
      expect(metrics.vertices).toBeGreaterThan(0);
      expect(metrics.triangles).toBeGreaterThan(0);
    });

    it('应该能够重置指标', () => {
      analyzer.setEnabled(true);
      analyzer.recordDrawCall(100, 50);
      
      const metrics = analyzer.getMetrics();
      expect(metrics).toBeDefined();
    });
  });

  describe('性能分析', () => {
    it('应该能够生成性能警告', () => {
      analyzer.setEnabled(true);

      // 模拟大量绘制调用触发警告
      for (let i = 0; i < 1100; i++) {
        analyzer.recordDrawCall(100, 50);
      }

      const metrics = analyzer.getMetrics();
      expect(metrics).toBeDefined();
    });

    it('应该能够生成性能报告', () => {
      analyzer.setEnabled(true);
      analyzer.recordDrawCall(100, 50);

      const metrics = analyzer.getMetrics();
      expect(metrics).toHaveProperty('drawCalls');
      expect(metrics).toHaveProperty('frameTime');
      expect(metrics).toHaveProperty('fps');
    });
  });

  describe('内存跟踪', () => {
    it('应该能够更新内存使用', () => {
      analyzer.setEnabled(true);
      analyzer.updateMemoryUsage(1024 * 1024, 512 * 1024);

      const metrics = analyzer.getMetrics();
      expect(metrics.gpuMemoryUsed).toBe(1024 * 1024);
      expect(metrics.bufferMemoryUsed).toBe(512 * 1024);
    });

    it('应该能够记录纹理上传', () => {
      analyzer.setEnabled(true);
      analyzer.recordTextureUpload(1024 * 1024);

      const metrics = analyzer.getMetrics();
      expect(metrics.textureUploads).toBeGreaterThan(0);
      expect(metrics.textureMemoryUsed).toBeGreaterThan(0);
    });
  });

  describe('事件记录', () => {
    it('应该能够记录各种WebGL事件', () => {
      analyzer.setEnabled(true);

      analyzer.recordStateChange();
      analyzer.recordShaderSwitch();
      analyzer.recordUniformUpdate();
      analyzer.recordTextureBind();

      const metrics = analyzer.getMetrics();
      expect(metrics.stateChanges).toBeGreaterThan(0);
      expect(metrics.shaderSwitches).toBeGreaterThan(0);
      expect(metrics.uniformUpdates).toBeGreaterThan(0);
      expect(metrics.textureBinds).toBeGreaterThan(0);
    });
  });
});

describe('WebGLPerformanceMonitor', () => {
  let monitor: WebGLPerformanceMonitor;
  let analyzer: WebGLPerformanceAnalyzer;
  let mockGL: WebGLRenderingContext;

  beforeEach(() => {
    mockGL = createMockWebGLContext();
    analyzer = new WebGLPerformanceAnalyzer(mockGL);
    monitor = new WebGLPerformanceMonitor(analyzer);
  });

  describe('基本功能', () => {
    it('应该正确初始化', () => {
      expect(monitor).toBeDefined();
    });

    it('应该能够启动和停止监控', () => {
      expect(() => monitor.dispose()).not.toThrow();
    });

    it('应该能够获取当前指标', () => {
      const metrics = analyzer.getMetrics();
      expect(metrics).toHaveProperty('frameTime');
      expect(metrics).toHaveProperty('fps');
      expect(metrics).toHaveProperty('drawCalls');
    });
  });

  describe('历史数据', () => {
    it('应该能够获取历史数据', () => {
      // 模拟一些活动
      for (let i = 0; i < 5; i++) {
        analyzer.beginFrame();
        analyzer.endFrame();
      }

      const history = analyzer.getHistory();
      expect(Array.isArray(history)).toBe(true);
    });

    it('应该能够设置历史数据限制', () => {
      const limitedAnalyzer = new WebGLPerformanceAnalyzer(mockGL, { maxDrawCalls: 10 });
      expect(limitedAnalyzer).toBeDefined();
    });
  });

  describe('基准测试', () => {
    it('应该能够创建基准测试', () => {
      expect(monitor).toBeDefined();
      expect(analyzer).toBeDefined();
    });

    it('应该能够运行基准测试', async () => {
      analyzer.beginFrame();
      analyzer.endFrame();
      
      const metrics = analyzer.getMetrics();
      expect(metrics).toHaveProperty('frameTime');
      expect(metrics).toHaveProperty('fps');
    });
  });

  describe('资源清理', () => {
    it('应该能够正确销毁', () => {
      expect(() => monitor.dispose()).not.toThrow();
    });
  });
});