/**
 * 实例化渲染器测试
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { InstancedRenderer, InstanceData } from '../InstancedRenderer';

// Mock WebGL Context
const createMockGL = () => {
  const mockGL = {
    createBuffer: vi.fn(() => ({})),
    deleteBuffer: vi.fn(),
    bindBuffer: vi.fn(),
    bufferData: vi.fn(),
    useProgram: vi.fn(),
    getAttribLocation: vi.fn(() => 0),
    enableVertexAttribArray: vi.fn(),
    vertexAttribPointer: vi.fn(),
    vertexAttribDivisor: vi.fn(),
    drawElementsInstanced: vi.fn(),
    getExtension: vi.fn(() => null),
    ARRAY_BUFFER: 34962,
    DYNAMIC_DRAW: 35048,
    TRIANGLES: 4,
    UNSIGNED_SHORT: 5123,
    FLOAT: 5126
  } as any;
  
  return mockGL;
};

// Mock IRenderable
const createMockRenderable = (id: string) => ({
  render: vi.fn(),
  getBounds: () => ({ x: 0, y: 0, width: 100, height: 100 }),
  prepareRender: vi.fn(),
  getVertexCount: () => 6,
  id
});

describe('InstancedRenderer', () => {
  let renderer: InstancedRenderer;
  let mockGL: any;

  beforeEach(() => {
    mockGL = createMockGL();
    renderer = new InstancedRenderer(mockGL);
  });

  describe('初始化', () => {
    it('应该能够创建实例化渲染器', () => {
      expect(renderer).toBeDefined();
      expect(renderer.isInstancedRenderingSupported()).toBe(true);
    });

    it('应该能够获取统计信息', () => {
      const stats = renderer.getStats();
      
      expect(stats.supportedInstancedRendering).toBe(true);
      expect(stats.totalBatches).toBe(0);
      expect(stats.totalInstances).toBe(0);
    });
  });

  describe('批次管理', () => {
    const mockTemplate = createMockRenderable('template');
    const mockInstances: InstanceData[] = [
      {
        transform: new Float32Array([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 10, 20, 0, 1]),
        tint: new Float32Array([1, 1, 1, 1]),
        textureOffset: new Float32Array([0, 0, 1, 1])
      },
      {
        transform: new Float32Array([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 30, 40, 0, 1]),
        tint: new Float32Array([1, 0.5, 0.5, 1]),
        textureOffset: new Float32Array([0, 0, 1, 1])
      }
    ];

    it('应该能够更新批次', () => {
      const batchId = 'test-batch';
      
      renderer.updateBatch(batchId, mockTemplate, mockInstances);
      
      const stats = renderer.getStats();
      expect(stats.totalBatches).toBe(1);
      expect(stats.totalInstances).toBe(2);
    });

    it('应该能够删除批次', () => {
      const batchId = 'test-batch';
      renderer.updateBatch(batchId, mockTemplate, mockInstances);
      
      const deleted = renderer.deleteBatch(batchId);
      expect(deleted).toBe(true);
      
      const stats = renderer.getStats();
      expect(stats.totalBatches).toBe(0);
    });

    it('删除不存在的批次应该返回false', () => {
      const deleted = renderer.deleteBatch('nonexistent');
      expect(deleted).toBe(false);
    });
  });

  describe('渲染', () => {
    const mockTemplate = createMockRenderable('template');
    const mockShader = {} as WebGLProgram;
    
    beforeEach(() => {
      // Mock shader attribute locations
      mockGL.getAttribLocation = vi.fn((shader, name) => {
        if (name === 'a_instanceTransform') return 1;
        if (name === 'a_instanceTint') return 5;
        if (name === 'a_instanceTexOffset') return 6;
        return -1;
      });
    });

    it('应该能够渲染批次', () => {
      const batchId = 'render-batch';
      const instances: InstanceData[] = [
        {
          transform: new Float32Array(16).fill(0),
          tint: new Float32Array([1, 1, 1, 1]),
          textureOffset: new Float32Array([0, 0, 1, 1])
        }
      ];
      
      renderer.updateBatch(batchId, mockTemplate, instances);
      renderer.renderBatch(batchId, mockShader);
      
      expect(mockGL.useProgram).toHaveBeenCalledWith(mockShader);
      expect(mockGL.drawElementsInstanced).toHaveBeenCalledWith(
        mockGL.TRIANGLES,
        6,
        mockGL.UNSIGNED_SHORT,
        0,
        1
      );
    });

    it('应该正确设置实例化属性', () => {
      const batchId = 'attr-batch';
      const instances: InstanceData[] = [
        {
          transform: new Float32Array(16).fill(1),
          tint: new Float32Array([0.5, 0.5, 0.5, 1]),
          textureOffset: new Float32Array([0.25, 0.25, 0.5, 0.5])
        }
      ];
      
      renderer.updateBatch(batchId, mockTemplate, instances);
      renderer.renderBatch(batchId, mockShader);
      
      // 验证变换矩阵属性设置 (4个vec4)
      expect(mockGL.enableVertexAttribArray).toHaveBeenCalledTimes(6); // 4 + 1 + 1
      expect(mockGL.vertexAttribDivisor).toHaveBeenCalledTimes(6);
      
      // 验证所有属性都设置了实例化除数
      for (let i = 0; i < 6; i++) {
        expect(mockGL.vertexAttribDivisor).toHaveBeenCalledWith(expect.any(Number), 1);
      }
    });

    it('应该能够处理空批次', () => {
      renderer.renderBatch('empty-batch', mockShader);
      
      // 空批次不应该调用渲染
      expect(mockGL.drawElementsInstanced).not.toHaveBeenCalled();
    });
  });

  describe('事件系统', () => {
    it('应该发出批次创建事件', () => {
      const handler = vi.fn();
      renderer.on('batchCreated', handler);
      
      const mockTemplate = createMockRenderable('event-template');
      renderer.updateBatch('event-batch', mockTemplate, []);
      
      expect(handler).toHaveBeenCalledWith({
        batchId: 'event-batch',
        maxInstances: 1000
      });
    });

    it('应该发出批次更新事件', () => {
      const handler = vi.fn();
      renderer.on('batchUpdated', handler);
      
      const mockTemplate = createMockRenderable('update-template');
      const instances: InstanceData[] = [
        {
          transform: new Float32Array(16),
          tint: new Float32Array(4),
          textureOffset: new Float32Array(4)
        }
      ];
      
      renderer.updateBatch('update-batch', mockTemplate, instances);
      
      expect(handler).toHaveBeenCalledWith({
        batchId: 'update-batch',
        instanceCount: 1
      });
    });

    it('应该发出渲染事件', () => {
      const handler = vi.fn();
      renderer.on('batchRendered', handler);
      
      const mockTemplate = createMockRenderable('render-template');
      const mockShader = {} as WebGLProgram;
      const instances: InstanceData[] = [
        {
          transform: new Float32Array(16),
          tint: new Float32Array(4),
          textureOffset: new Float32Array(4)
        }
      ];
      
      renderer.updateBatch('render-batch', mockTemplate, instances);
      renderer.renderBatch('render-batch', mockShader);
      
      expect(handler).toHaveBeenCalledWith({
        batchId: 'render-batch',
        instanceCount: 1,
        drawTime: expect.any(Number)
      });
    });
  });

  describe('缓冲区管理', () => {
    it('应该能够处理大批次', () => {
      const mockTemplate = createMockRenderable('large-template');
      const instances: InstanceData[] = [];
      
      // 创建大量实例
      for (let i = 0; i < 500; i++) {
        instances.push({
          transform: new Float32Array(16).fill(i),
          tint: new Float32Array([1, 1, 1, 1]),
          textureOffset: new Float32Array([0, 0, 1, 1])
        });
      }
      
      renderer.updateBatch('large-batch', mockTemplate, instances);
      
      const stats = renderer.getStats();
      expect(stats.totalInstances).toBe(500);
      expect(stats.averageInstancesPerBatch).toBe(500);
    });

    it('应该能够处理缓冲区重新分配', () => {
      const handler = vi.fn();
      renderer.on('bufferReallocated', handler);
      
      const mockTemplate = createMockRenderable('realloc-template');
      const batchId = 'realloc-batch';
      
      // 先添加少量实例
      renderer.updateBatch(batchId, mockTemplate, [
        {
          transform: new Float32Array(16),
          tint: new Float32Array(4),
          textureOffset: new Float32Array(4)
        }
      ]);
      
      // 然后添加大量实例触发重新分配
      const largeInstances: InstanceData[] = [];
      for (let i = 0; i < 200; i++) {
        largeInstances.push({
          transform: new Float32Array(16),
          tint: new Float32Array(4),
          textureOffset: new Float32Array(4)
        });
      }
      
      renderer.updateBatch(batchId, mockTemplate, largeInstances);
      
      // 应该触发缓冲区重新分配事件
      expect(handler).toHaveBeenCalled();
    });
  });

  describe('WebGL1 回退', () => {
    let webgl1Renderer: InstancedRenderer;
    let mockWebGL1: any;

    beforeEach(() => {
      mockWebGL1 = {
        ...createMockGL(),
        getExtension: vi.fn(() => null) // 模拟不支持扩展
      };
      delete mockWebGL1.drawElementsInstanced; // WebGL1没有原生实例化支持
      
      webgl1Renderer = new InstancedRenderer(mockWebGL1);
    });

    it('应该检测到不支持实例化渲染', () => {
      expect(webgl1Renderer.isInstancedRenderingSupported()).toBe(false);
    });

    it('应该使用回退渲染', () => {
      const mockTemplate = createMockRenderable('fallback-template');
      const mockShader = {} as WebGLProgram;
      const instances: InstanceData[] = [
        {
          transform: new Float32Array(16),
          tint: new Float32Array(4),
          textureOffset: new Float32Array(4)
        }
      ];
      
      webgl1Renderer.updateBatch('fallback-batch', mockTemplate, instances);
      webgl1Renderer.renderBatch('fallback-batch', mockShader);
      
      // 应该调用模板的渲染方法
      expect(mockTemplate.render).toHaveBeenCalled();
    });
  });

  describe('清理和销毁', () => {
    it('应该能够正确销毁', () => {
      const mockTemplate = createMockRenderable('dispose-template');
      renderer.updateBatch('dispose-batch', mockTemplate, []);
      
      renderer.dispose();
      
      const stats = renderer.getStats();
      expect(stats.totalBatches).toBe(0);
      expect(mockGL.deleteBuffer).toHaveBeenCalled();
    });
  });
});