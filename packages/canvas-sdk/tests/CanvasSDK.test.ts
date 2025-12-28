/**
 * 画板SDK核心API测试
 * 使用 createCanvasSDK 工厂函数测试 DI 容器创建的 SDK 实例
 *
 * 注意：这些测试需要真正的 Canvas/WebGL 环境支持，在 jsdom 中无法运行。
 * 应该在浏览器环境或使用 puppeteer/playwright 的 e2e 测试中运行这些测试。
 */
import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest';
import { createCanvasSDK } from '../src/main';
import type { CanvasSDK } from '../src/CanvasSDK';

// 跳过集成测试 - 需要真正的 Canvas 环境
describe.skip('CanvasSDK', () => {
  let sdk: CanvasSDK;
  let mockCanvas: HTMLCanvasElement;
  let mockContext: CanvasRenderingContext2D;

  beforeEach(() => {
    // 创建模拟 canvas 和 context
    mockContext = {
      fillRect: vi.fn(),
      clearRect: vi.fn(),
      getImageData: vi.fn().mockReturnValue({
        data: new Uint8ClampedArray(4),
        width: 1,
        height: 1
      }),
      putImageData: vi.fn(),
      createImageData: vi.fn(),
      setTransform: vi.fn(),
      drawImage: vi.fn(),
      save: vi.fn(),
      fillText: vi.fn(),
      restore: vi.fn(),
      beginPath: vi.fn(),
      moveTo: vi.fn(),
      lineTo: vi.fn(),
      closePath: vi.fn(),
      stroke: vi.fn(),
      fill: vi.fn(),
      translate: vi.fn(),
      scale: vi.fn(),
      rotate: vi.fn(),
      arc: vi.fn(),
      rect: vi.fn(),
      clip: vi.fn(),
      measureText: vi.fn().mockReturnValue({ width: 10 }),
      canvas: null as unknown as HTMLCanvasElement,
    } as unknown as CanvasRenderingContext2D;

    mockCanvas = {
      width: 800,
      height: 600,
      getContext: vi.fn().mockReturnValue(mockContext),
      getBoundingClientRect: vi.fn().mockReturnValue({
        left: 0,
        top: 0,
        width: 800,
        height: 600
      }),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      style: {},
    } as unknown as HTMLCanvasElement;

    (mockContext as unknown as { canvas: HTMLCanvasElement }).canvas = mockCanvas;
  });

  afterEach(() => {
    if (sdk) {
      sdk.dispose();
    }
    vi.clearAllMocks();
  });

  describe('初始化测试', () => {
    test('应该能通过工厂函数成功创建SDK实例', async () => {
      sdk = await createCanvasSDK({ canvas: mockCanvas });

      expect(sdk).toBeDefined();
      expect(sdk.getCanvasManager()).toBeDefined();
      expect(sdk.getToolManager()).toBeDefined();
    });

    test('传入null画布应该抛出错误', async () => {
      await expect(createCanvasSDK({ canvas: null as unknown as HTMLCanvasElement }))
        .rejects.toThrow('Canvas element is required');
    });

    test('应该能使用自定义配置创建SDK', async () => {
      sdk = await createCanvasSDK({
        canvas: mockCanvas,
        renderEngine: 'canvas2d',
        logLevel: 'debug',
        enableHistory: true,
        enableInteraction: true
      });

      expect(sdk).toBeDefined();
    });
  });

  describe('形状管理测试', () => {
    beforeEach(async () => {
      sdk = await createCanvasSDK({ canvas: mockCanvas });
    });

    test('应该能通过CanvasManager添加形状', () => {
      const canvasManager = sdk.getCanvasManager();

      // 使用 ShapeEntityFactory 创建形状
      const { ShapeEntityFactory } = require('../src/models/entities/Shape');
      const shape = ShapeEntityFactory.createRectangle({ x: 10, y: 20 });

      canvasManager.addShape(shape);

      expect(canvasManager.getRenderables()).toContainEqual(
        expect.objectContaining({ id: shape.id })
      );
    });

    test('应该能移除形状', () => {
      const canvasManager = sdk.getCanvasManager();
      const { ShapeEntityFactory } = require('../src/models/entities/Shape');
      const shape = ShapeEntityFactory.createRectangle({ x: 10, y: 20 });

      canvasManager.addShape(shape);
      canvasManager.removeShape(shape.id);

      expect(canvasManager.getRenderables().find(r => r.id === shape.id)).toBeUndefined();
    });

    test('应该能更新形状属性', () => {
      const canvasManager = sdk.getCanvasManager();
      const { ShapeEntityFactory } = require('../src/models/entities/Shape');
      const shape = ShapeEntityFactory.createRectangle({ x: 10, y: 20 });

      canvasManager.addShape(shape);
      canvasManager.updateShape(shape.id, { visible: false });

      const updated = canvasManager.getRenderables().find(r => r.id === shape.id);
      expect(updated?.visible).toBe(false);
    });

    test('应该能清空所有形状', () => {
      const canvasManager = sdk.getCanvasManager();
      const { ShapeEntityFactory } = require('../src/models/entities/Shape');

      canvasManager.addShape(ShapeEntityFactory.createRectangle({ x: 10, y: 20 }));
      canvasManager.addShape(ShapeEntityFactory.createCircle({ x: 50, y: 50 }));

      canvasManager.clear();

      expect(canvasManager.getRenderables()).toHaveLength(0);
    });
  });

  describe('选择系统测试', () => {
    beforeEach(async () => {
      sdk = await createCanvasSDK({ canvas: mockCanvas });
    });

    test('应该能选择形状', () => {
      const canvasManager = sdk.getCanvasManager();
      const { ShapeEntityFactory } = require('../src/models/entities/Shape');
      const shape = ShapeEntityFactory.createRectangle({ x: 10, y: 20 });

      canvasManager.addShape(shape);
      canvasManager.selectShape(shape.id);

      expect(canvasManager.getSelectedShapes()).toContainEqual(
        expect.objectContaining({ id: shape.id })
      );
    });

    test('应该能取消选择形状', () => {
      const canvasManager = sdk.getCanvasManager();
      const { ShapeEntityFactory } = require('../src/models/entities/Shape');
      const shape = ShapeEntityFactory.createRectangle({ x: 10, y: 20 });

      canvasManager.addShape(shape);
      canvasManager.selectShape(shape.id);
      canvasManager.deselectShape(shape.id);

      expect(canvasManager.getSelectedShapes()).not.toContainEqual(
        expect.objectContaining({ id: shape.id })
      );
    });

    test('应该能清空所有选择', () => {
      const canvasManager = sdk.getCanvasManager();
      const { ShapeEntityFactory } = require('../src/models/entities/Shape');

      const shape1 = ShapeEntityFactory.createRectangle({ x: 10, y: 20 });
      const shape2 = ShapeEntityFactory.createCircle({ x: 50, y: 50 });

      canvasManager.addShape(shape1);
      canvasManager.addShape(shape2);
      canvasManager.selectShape(shape1.id);
      canvasManager.selectShape(shape2.id);

      canvasManager.clearSelection();

      expect(canvasManager.getSelectedShapes()).toHaveLength(0);
    });

    test('应该能检测形状是否被选中', () => {
      const canvasManager = sdk.getCanvasManager();
      const { ShapeEntityFactory } = require('../src/models/entities/Shape');
      const shape = ShapeEntityFactory.createRectangle({ x: 10, y: 20 });

      canvasManager.addShape(shape);

      expect(canvasManager.isShapeSelected(shape.id)).toBe(false);

      canvasManager.selectShape(shape.id);

      expect(canvasManager.isShapeSelected(shape.id)).toBe(true);
    });
  });

  describe('事件系统测试', () => {
    beforeEach(async () => {
      sdk = await createCanvasSDK({ canvas: mockCanvas });
    });

    test('应该能注册和触发事件', () => {
      const callback = vi.fn();

      sdk.on('test:event', callback);

      // 通过添加形状触发事件
      const canvasManager = sdk.getCanvasManager();
      const { ShapeEntityFactory } = require('../src/models/entities/Shape');
      const shape = ShapeEntityFactory.createRectangle({ x: 10, y: 20 });
      canvasManager.addShape(shape);

      // 验证 canvas:shapeAdded 事件被触发
      const addedCallback = vi.fn();
      sdk.on('canvas:shapeAdded', addedCallback);

      const shape2 = ShapeEntityFactory.createCircle({ x: 50, y: 50 });
      canvasManager.addShape(shape2);

      expect(addedCallback).toHaveBeenCalled();
    });

    test('应该能注销事件监听器', () => {
      const callback = vi.fn();

      sdk.on('canvas:shapeAdded', callback);
      sdk.off('canvas:shapeAdded', callback);

      const canvasManager = sdk.getCanvasManager();
      const { ShapeEntityFactory } = require('../src/models/entities/Shape');
      const shape = ShapeEntityFactory.createRectangle({ x: 10, y: 20 });
      canvasManager.addShape(shape);

      // 由于已注销，callback 不应该被调用
      expect(callback).not.toHaveBeenCalled();
    });
  });

  describe('Z轴管理测试', () => {
    beforeEach(async () => {
      sdk = await createCanvasSDK({ canvas: mockCanvas });
    });

    test('应该能获取按Z轴排序的形状', () => {
      const canvasManager = sdk.getCanvasManager();
      const { ShapeEntityFactory } = require('../src/models/entities/Shape');

      const shape1 = ShapeEntityFactory.createRectangle({ x: 10, y: 20 });
      const shape2 = ShapeEntityFactory.createCircle({ x: 50, y: 50 });

      canvasManager.addShape(shape1);
      canvasManager.addShape(shape2);

      const sorted = canvasManager.getShapesByZOrder();

      expect(sorted.length).toBe(2);
    });

    test('应该能将形状置顶', () => {
      const canvasManager = sdk.getCanvasManager();
      const { ShapeEntityFactory } = require('../src/models/entities/Shape');

      const shape1 = ShapeEntityFactory.createRectangle({ x: 10, y: 20 });
      const shape2 = ShapeEntityFactory.createCircle({ x: 50, y: 50 });

      canvasManager.addShape(shape1);
      canvasManager.addShape(shape2);

      canvasManager.bringToFront([shape1.id]);

      const sorted = canvasManager.getShapesByZOrder();
      expect(sorted[sorted.length - 1].id).toBe(shape1.id);
    });
  });

  describe('统计信息测试', () => {
    beforeEach(async () => {
      sdk = await createCanvasSDK({ canvas: mockCanvas });
    });

    test('应该能获取画布统计信息', () => {
      const canvasManager = sdk.getCanvasManager();
      const { ShapeEntityFactory } = require('../src/models/entities/Shape');

      canvasManager.addShape(ShapeEntityFactory.createRectangle({ x: 10, y: 20 }));
      canvasManager.addShape(ShapeEntityFactory.createCircle({ x: 50, y: 50 }));

      const stats = canvasManager.getStats();

      expect(stats.shapes.totalShapes).toBe(2);
    });
  });

  describe('销毁测试', () => {
    test('应该能正确销毁SDK', async () => {
      sdk = await createCanvasSDK({ canvas: mockCanvas });

      // 应该不抛出错误
      expect(() => sdk.dispose()).not.toThrow();
    });
  });
});
