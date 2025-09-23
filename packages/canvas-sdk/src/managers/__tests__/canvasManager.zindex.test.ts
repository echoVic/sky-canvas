/**
 * CanvasManager Z轴管理功能测试
 */

import { Rectangle, Shape } from '@sky-canvas/render-engine';
import { vi } from 'vitest';
import { CanvasManager } from '../CanvasManager';

describe('CanvasManager Z轴管理', () => {
  let canvasManager: CanvasManager;
  let mockEventBus: any;
  let mockLogService: any;
  let mockSelectionService: any;
  let mockZIndexService: any;
  let testShapes: Shape[];

  beforeEach(() => {
    testShapes = [
      new Rectangle({ x: 0, y: 0, width: 50, height: 50 }),
      new Rectangle({ x: 100, y: 100, width: 50, height: 50 }),
      new Rectangle({ x: 200, y: 200, width: 50, height: 50 })
    ];

    mockEventBus = {
      emit: vi.fn()
    };

    mockLogService = {
      info: vi.fn(),
      debug: vi.fn()
    };

    mockSelectionService = {
      getSelectedShapes: vi.fn(() => [testShapes[0]])
    };

    mockZIndexService = {
      bringToFront: vi.fn((shapes, all) => all),
      sendToBack: vi.fn((shapes, all) => all),
      bringForward: vi.fn((shapes, all) => all),
      sendBackward: vi.fn((shapes, all) => all),
      setZIndex: vi.fn((shapes, zIndex) => shapes),
      getSortedShapes: vi.fn((shapes) => shapes)
    };

    canvasManager = new CanvasManager(
      mockEventBus,
      mockLogService,
      mockSelectionService,
      null as any, // clipboardService
      null as any, // historyService
      mockZIndexService,
      null as any  // renderingService
    );

    // 手动设置 shapes 数据
    (canvasManager as any).shapes = new Map(testShapes.map(shape => [shape.id, shape]));
  });

  describe('bringToFront', () => {
    it('应该将指定的形状置顶', () => {
      const shapeIds = [testShapes[0].id];
      canvasManager.bringToFront(shapeIds);

      expect(mockZIndexService.bringToFront).toHaveBeenCalledWith(
        [testShapes[0]],
        testShapes
      );
      expect(mockEventBus.emit).toHaveBeenCalledWith('canvas:shapesBroughtToFront', {
        shapeIds
      });
    });

    it('应该忽略不存在的形状ID', () => {
      const shapeIds = ['non-existent-id'];
      canvasManager.bringToFront(shapeIds);

      expect(mockZIndexService.bringToFront).not.toHaveBeenCalled();
    });

    it('空数组不应该触发任何操作', () => {
      canvasManager.bringToFront([]);

      expect(mockZIndexService.bringToFront).not.toHaveBeenCalled();
      expect(mockEventBus.emit).not.toHaveBeenCalled();
    });
  });

  describe('sendToBack', () => {
    it('应该将指定的形状置底', () => {
      const shapeIds = [testShapes[1].id];
      canvasManager.sendToBack(shapeIds);

      expect(mockZIndexService.sendToBack).toHaveBeenCalledWith(
        [testShapes[1]],
        testShapes
      );
      expect(mockEventBus.emit).toHaveBeenCalledWith('canvas:shapesSentToBack', {
        shapeIds
      });
    });
  });

  describe('bringForward', () => {
    it('应该将指定的形状上移一层', () => {
      const shapeIds = [testShapes[0].id, testShapes[1].id];
      canvasManager.bringForward(shapeIds);

      expect(mockZIndexService.bringForward).toHaveBeenCalledWith(
        [testShapes[0], testShapes[1]],
        testShapes
      );
      expect(mockEventBus.emit).toHaveBeenCalledWith('canvas:shapesBroughtForward', {
        shapeIds
      });
    });
  });

  describe('sendBackward', () => {
    it('应该将指定的形状下移一层', () => {
      const shapeIds = [testShapes[2].id];
      canvasManager.sendBackward(shapeIds);

      expect(mockZIndexService.sendBackward).toHaveBeenCalledWith(
        [testShapes[2]],
        testShapes
      );
      expect(mockEventBus.emit).toHaveBeenCalledWith('canvas:shapesSentBackward', {
        shapeIds
      });
    });
  });

  describe('setZIndex', () => {
    it('应该设置指定形状的zIndex值', () => {
      const shapeIds = [testShapes[0].id];
      const targetZIndex = 5;

      canvasManager.setZIndex(shapeIds, targetZIndex);

      expect(mockZIndexService.setZIndex).toHaveBeenCalledWith(
        [testShapes[0]],
        targetZIndex
      );
      expect(mockEventBus.emit).toHaveBeenCalledWith('canvas:shapesZIndexSet', {
        shapeIds,
        zIndex: targetZIndex
      });
    });

    it('zIndexService已经直接修改Shape对象', () => {
      const updatedShapes = testShapes.slice(0, 1);
      mockZIndexService.setZIndex.mockReturnValue(updatedShapes);

      const shapeIds = [testShapes[0].id];
      canvasManager.setZIndex(shapeIds, 5);

      // zIndexService 已经直接修改了 Shape 对象，无需额外更新
      expect(mockZIndexService.setZIndex).toHaveBeenCalledWith(
        [testShapes[0]],
        5
      );
    });
  });

  describe('getShapesByZOrder', () => {
    it('应该返回按Z轴排序的形状列表', () => {
      const sortedShapes = [...testShapes].reverse();
      mockZIndexService.getSortedShapes.mockReturnValue(sortedShapes);

      const result = canvasManager.getShapesByZOrder();

      expect(mockZIndexService.getSortedShapes).toHaveBeenCalledWith(testShapes);
      expect(result).toBe(sortedShapes);
    });
  });

  describe('zIndex操作不再需要批量更新', () => {
    it('zIndexService直接修改Shape对象', () => {
      const updatedShapes = testShapes.slice(0, 2);
      mockZIndexService.bringToFront.mockReturnValue(updatedShapes);

      canvasManager.bringToFront([testShapes[0].id, testShapes[1].id]);

      // 只验证调用了zIndexService，不验证批量更新
      expect(mockZIndexService.bringToFront).toHaveBeenCalledWith(
        [testShapes[0], testShapes[1]],
        testShapes
      );
    });
  });
});