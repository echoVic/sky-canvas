/**
 * 画板SDK核心API测试
 */
import { describe, test, expect, beforeEach, vi } from 'vitest';
import { CanvasSDK } from '../src/CanvasSDK';
import { IShape } from '../src/scene/IShape';
import { IPoint } from '@sky-canvas/render-engine';

describe('CanvasSDK', () => {
  let sdk: CanvasSDK;
  let mockCanvas: HTMLCanvasElement;

  beforeEach(() => {
    mockCanvas = document.createElement('canvas');
    mockCanvas.width = 800;
    mockCanvas.height = 600;
    
    sdk = new CanvasSDK();
  });

  describe('初始化测试', () => {
    test('应该能成功创建SDK实例', () => {
      expect(sdk).toBeDefined();
      expect(sdk).toBeInstanceOf(CanvasSDK);
    });

    test('应该能初始化画布', async () => {
      await sdk.initialize(mockCanvas);
      
      expect(sdk.isInitialized()).toBe(true);
      expect(sdk.getCanvas()).toBe(mockCanvas);
    });

    test('重复初始化应该抛出错误', async () => {
      await sdk.initialize(mockCanvas);
      
      await expect(sdk.initialize(mockCanvas))
        .rejects.toThrow('Canvas SDK already initialized');
    });

    test('传入null画布应该抛出错误', async () => {
      await expect(sdk.initialize(null as any))
        .rejects.toThrow('Canvas element is required');
    });
  });

  describe('形状管理测试', () => {
    beforeEach(async () => {
      await sdk.initialize(mockCanvas);
    });

    test('应该能添加形状', () => {
      const mockShape: IShape = {
        id: 'shape1',
        type: 'rectangle',
        position: { x: 10, y: 20 },
        size: { width: 100, height: 80 },
        visible: true,
        zIndex: 0,
        render: vi.fn(),
        getBounds: vi.fn().mockReturnValue({ x: 10, y: 20, width: 100, height: 80 }),
        hitTest: vi.fn().mockReturnValue(false),
        clone: vi.fn(),
        dispose: vi.fn()
      };

      sdk.addShape(mockShape);
      
      expect(sdk.getShapes()).toContain(mockShape);
      expect(sdk.getShape('shape1')).toBe(mockShape);
    });

    test('应该能移除形状', () => {
      const mockShape: IShape = {
        id: 'shape1',
        type: 'rectangle',
        position: { x: 10, y: 20 },
        size: { width: 100, height: 80 },
        visible: true,
        zIndex: 0,
        render: vi.fn(),
        getBounds: vi.fn().mockReturnValue({ x: 10, y: 20, width: 100, height: 80 }),
        hitTest: vi.fn().mockReturnValue(false),
        clone: vi.fn(),
        dispose: vi.fn()
      };

      sdk.addShape(mockShape);
      sdk.removeShape('shape1');
      
      expect(sdk.getShapes()).not.toContain(mockShape);
      expect(sdk.getShape('shape1')).toBeUndefined();
      expect(mockShape.dispose).toHaveBeenCalled();
    });

    test('应该能更新形状属性', () => {
      const mockShape: IShape = {
        id: 'shape1',
        type: 'rectangle',
        position: { x: 10, y: 20 },
        size: { width: 100, height: 80 },
        visible: true,
        zIndex: 0,
        render: vi.fn(),
        getBounds: vi.fn().mockReturnValue({ x: 10, y: 20, width: 100, height: 80 }),
        hitTest: vi.fn().mockReturnValue(false),
        clone: vi.fn(),
        dispose: vi.fn()
      };

      sdk.addShape(mockShape);
      sdk.updateShape('shape1', { 
        position: { x: 50, y: 60 },
        visible: false
      });
      
      expect(mockShape.position).toEqual({ x: 50, y: 60 });
      expect(mockShape.visible).toBe(false);
    });

    test('应该能清空所有形状', () => {
      const mockShape1: IShape = {
        id: 'shape1',
        type: 'rectangle',
        position: { x: 10, y: 20 },
        size: { width: 100, height: 80 },
        visible: true,
        zIndex: 0,
        render: vi.fn(),
        getBounds: vi.fn().mockReturnValue({ x: 10, y: 20, width: 100, height: 80 }),
        hitTest: vi.fn().mockReturnValue(false),
        clone: vi.fn(),
        dispose: vi.fn()
      };

      const mockShape2: IShape = {
        id: 'shape2',
        type: 'circle',
        position: { x: 30, y: 40 },
        size: { width: 50, height: 50 },
        visible: true,
        zIndex: 1,
        render: vi.fn(),
        getBounds: vi.fn().mockReturnValue({ x: 30, y: 40, width: 50, height: 50 }),
        hitTest: vi.fn().mockReturnValue(false),
        clone: vi.fn(),
        dispose: vi.fn()
      };

      sdk.addShape(mockShape1);
      sdk.addShape(mockShape2);
      sdk.clearShapes();
      
      expect(sdk.getShapes()).toHaveLength(0);
      expect(mockShape1.dispose).toHaveBeenCalled();
      expect(mockShape2.dispose).toHaveBeenCalled();
    });
  });

  describe('图层管理测试', () => {
    beforeEach(async () => {
      await sdk.initialize(mockCanvas);
    });

    test('应该能创建图层', () => {
      const layer = sdk.createLayer('layer1', 1);
      
      expect(layer).toBeDefined();
      expect(layer.id).toBe('layer1');
      expect(layer.zIndex).toBe(1);
      expect(sdk.getLayer('layer1')).toBe(layer);
    });

    test('应该能移除图层', () => {
      sdk.createLayer('layer1', 1);
      sdk.removeLayer('layer1');
      
      expect(sdk.getLayer('layer1')).toBeUndefined();
    });

    test('应该能获取所有图层', () => {
      const layer1 = sdk.createLayer('layer1', 1);
      const layer2 = sdk.createLayer('layer2', 2);
      
      const layers = sdk.getLayers();
      expect(layers).toContain(layer1);
      expect(layers).toContain(layer2);
    });
  });

  describe('选择系统测试', () => {
    beforeEach(async () => {
      await sdk.initialize(mockCanvas);
    });

    test('应该能选择形状', () => {
      const mockShape: IShape = {
        id: 'shape1',
        type: 'rectangle',
        position: { x: 10, y: 20 },
        size: { width: 100, height: 80 },
        visible: true,
        zIndex: 0,
        render: vi.fn(),
        getBounds: vi.fn().mockReturnValue({ x: 10, y: 20, width: 100, height: 80 }),
        hitTest: vi.fn().mockReturnValue(true),
        clone: vi.fn(),
        dispose: vi.fn()
      };

      sdk.addShape(mockShape);
      sdk.selectShape('shape1');
      
      expect(sdk.getSelectedShapes()).toContain(mockShape);
      expect(sdk.isSelected('shape1')).toBe(true);
    });

    test('应该能取消选择形状', () => {
      const mockShape: IShape = {
        id: 'shape1',
        type: 'rectangle',
        position: { x: 10, y: 20 },
        size: { width: 100, height: 80 },
        visible: true,
        zIndex: 0,
        render: vi.fn(),
        getBounds: vi.fn().mockReturnValue({ x: 10, y: 20, width: 100, height: 80 }),
        hitTest: vi.fn().mockReturnValue(true),
        clone: vi.fn(),
        dispose: vi.fn()
      };

      sdk.addShape(mockShape);
      sdk.selectShape('shape1');
      sdk.deselectShape('shape1');
      
      expect(sdk.getSelectedShapes()).not.toContain(mockShape);
      expect(sdk.isSelected('shape1')).toBe(false);
    });

    test('应该能清空所有选择', () => {
      const mockShape1: IShape = {
        id: 'shape1',
        type: 'rectangle',
        position: { x: 10, y: 20 },
        size: { width: 100, height: 80 },
        visible: true,
        zIndex: 0,
        render: vi.fn(),
        getBounds: vi.fn().mockReturnValue({ x: 10, y: 20, width: 100, height: 80 }),
        hitTest: vi.fn().mockReturnValue(true),
        clone: vi.fn(),
        dispose: vi.fn()
      };

      const mockShape2: IShape = {
        id: 'shape2',
        type: 'circle',
        position: { x: 30, y: 40 },
        size: { width: 50, height: 50 },
        visible: true,
        zIndex: 1,
        render: vi.fn(),
        getBounds: vi.fn().mockReturnValue({ x: 30, y: 40, width: 50, height: 50 }),
        hitTest: vi.fn().mockReturnValue(true),
        clone: vi.fn(),
        dispose: vi.fn()
      };

      sdk.addShape(mockShape1);
      sdk.addShape(mockShape2);
      sdk.selectShape('shape1');
      sdk.selectShape('shape2');
      sdk.clearSelection();
      
      expect(sdk.getSelectedShapes()).toHaveLength(0);
    });
  });

  describe('点击测试', () => {
    beforeEach(async () => {
      await sdk.initialize(mockCanvas);
    });

    test('应该能进行点击测试', () => {
      const mockShape: IShape = {
        id: 'shape1',
        type: 'rectangle',
        position: { x: 10, y: 20 },
        size: { width: 100, height: 80 },
        visible: true,
        zIndex: 0,
        render: vi.fn(),
        getBounds: vi.fn().mockReturnValue({ x: 10, y: 20, width: 100, height: 80 }),
        hitTest: vi.fn().mockReturnValue(true),
        clone: vi.fn(),
        dispose: vi.fn()
      };

      sdk.addShape(mockShape);
      const hitShape = sdk.hitTest({ x: 50, y: 50 });
      
      expect(hitShape).toBe(mockShape);
      expect(mockShape.hitTest).toHaveBeenCalledWith({ x: 50, y: 50 });
    });

    test('点击空白区域应该返回null', () => {
      const mockShape: IShape = {
        id: 'shape1',
        type: 'rectangle',
        position: { x: 10, y: 20 },
        size: { width: 100, height: 80 },
        visible: true,
        zIndex: 0,
        render: vi.fn(),
        getBounds: vi.fn().mockReturnValue({ x: 10, y: 20, width: 100, height: 80 }),
        hitTest: vi.fn().mockReturnValue(false),
        clone: vi.fn(),
        dispose: vi.fn()
      };

      sdk.addShape(mockShape);
      const hitShape = sdk.hitTest({ x: 200, y: 200 });
      
      expect(hitShape).toBeNull();
    });
  });

  describe('事件系统测试', () => {
    beforeEach(async () => {
      await sdk.initialize(mockCanvas);
    });

    test('应该能注册和触发事件', () => {
      const eventHandler = vi.fn();
      sdk.on('shapeAdded', eventHandler);
      
      const mockShape: IShape = {
        id: 'shape1',
        type: 'rectangle',
        position: { x: 10, y: 20 },
        size: { width: 100, height: 80 },
        visible: true,
        zIndex: 0,
        render: vi.fn(),
        getBounds: vi.fn().mockReturnValue({ x: 10, y: 20, width: 100, height: 80 }),
        hitTest: vi.fn().mockReturnValue(false),
        clone: vi.fn(),
        dispose: vi.fn()
      };

      sdk.addShape(mockShape);
      
      expect(eventHandler).toHaveBeenCalledWith({ shape: mockShape });
    });

    test('应该能注销事件监听器', () => {
      const eventHandler = vi.fn();
      sdk.on('shapeAdded', eventHandler);
      sdk.off('shapeAdded', eventHandler);
      
      const mockShape: IShape = {
        id: 'shape1',
        type: 'rectangle',
        position: { x: 10, y: 20 },
        size: { width: 100, height: 80 },
        visible: true,
        zIndex: 0,
        render: vi.fn(),
        getBounds: vi.fn().mockReturnValue({ x: 10, y: 20, width: 100, height: 80 }),
        hitTest: vi.fn().mockReturnValue(false),
        clone: vi.fn(),
        dispose: vi.fn()
      };

      sdk.addShape(mockShape);
      
      expect(eventHandler).not.toHaveBeenCalled();
    });
  });

  describe('历史记录测试', () => {
    beforeEach(async () => {
      await sdk.initialize(mockCanvas);
    });

    test('应该能撤销操作', () => {
      const mockShape: IShape = {
        id: 'shape1',
        type: 'rectangle',
        position: { x: 10, y: 20 },
        size: { width: 100, height: 80 },
        visible: true,
        zIndex: 0,
        render: vi.fn(),
        getBounds: vi.fn().mockReturnValue({ x: 10, y: 20, width: 100, height: 80 }),
        hitTest: vi.fn().mockReturnValue(false),
        clone: vi.fn(),
        dispose: vi.fn()
      };

      sdk.addShape(mockShape);
      expect(sdk.getShapes()).toContain(mockShape);
      
      sdk.undo();
      expect(sdk.getShapes()).not.toContain(mockShape);
    });

    test('应该能重做操作', () => {
      const mockShape: IShape = {
        id: 'shape1',
        type: 'rectangle',
        position: { x: 10, y: 20 },
        size: { width: 100, height: 80 },
        visible: true,
        zIndex: 0,
        render: vi.fn(),
        getBounds: vi.fn().mockReturnValue({ x: 10, y: 20, width: 100, height: 80 }),
        hitTest: vi.fn().mockReturnValue(false),
        clone: vi.fn(),
        dispose: vi.fn()
      };

      sdk.addShape(mockShape);
      sdk.undo();
      sdk.redo();
      
      expect(sdk.getShapes()).toContain(mockShape);
    });

    test('应该能检查撤销/重做状态', () => {
      expect(sdk.canUndo()).toBe(false);
      expect(sdk.canRedo()).toBe(false);

      const mockShape: IShape = {
        id: 'shape1',
        type: 'rectangle',
        position: { x: 10, y: 20 },
        size: { width: 100, height: 80 },
        visible: true,
        zIndex: 0,
        render: vi.fn(),
        getBounds: vi.fn().mockReturnValue({ x: 10, y: 20, width: 100, height: 80 }),
        hitTest: vi.fn().mockReturnValue(false),
        clone: vi.fn(),
        dispose: vi.fn()
      };

      sdk.addShape(mockShape);
      expect(sdk.canUndo()).toBe(true);
      expect(sdk.canRedo()).toBe(false);

      sdk.undo();
      expect(sdk.canUndo()).toBe(false);
      expect(sdk.canRedo()).toBe(true);
    });
  });

  describe('资源管理测试', () => {
    beforeEach(async () => {
      await sdk.initialize(mockCanvas);
    });

    test('应该能销毁SDK', () => {
      const mockShape: IShape = {
        id: 'shape1',
        type: 'rectangle',
        position: { x: 10, y: 20 },
        size: { width: 100, height: 80 },
        visible: true,
        zIndex: 0,
        render: vi.fn(),
        getBounds: vi.fn().mockReturnValue({ x: 10, y: 20, width: 100, height: 80 }),
        hitTest: vi.fn().mockReturnValue(false),
        clone: vi.fn(),
        dispose: vi.fn()
      };

      sdk.addShape(mockShape);
      sdk.dispose();
      
      expect(sdk.isInitialized()).toBe(false);
      expect(mockShape.dispose).toHaveBeenCalled();
    });
  });
});