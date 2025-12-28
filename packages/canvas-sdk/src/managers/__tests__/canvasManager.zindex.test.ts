/**
 * CanvasManager Z轴管理功能测试
 */

import { vi } from 'vitest';
import { CanvasManager } from '../CanvasManager';
import { ShapeEntityFactory, IShapeEntity } from '../../models/entities/Shape';

describe('CanvasManager Z轴管理', () => {
  let canvasManager: CanvasManager;
  let mockEventBus: any;
  let mockLogService: any;
  let mockShapeService: any;
  let mockSelectionService: any;
  let mockZIndexService: any;
  let testShapes: IShapeEntity[];

  beforeEach(() => {
    testShapes = [
      ShapeEntityFactory.createRectangle({ x: 0, y: 0 }),
      ShapeEntityFactory.createCircle({ x: 100, y: 100 }),
      ShapeEntityFactory.createRectangle({ x: 200, y: 200 })
    ];

    mockEventBus = {
      emit: vi.fn()
    };

    mockLogService = {
      info: vi.fn(),
      debug: vi.fn()
    };

    mockShapeService = {
      getShapeEntity: vi.fn((id: string) =>
        testShapes.find(shape => shape.id === id) || null
      ),
      getAllShapeEntities: vi.fn(() => testShapes),
      updateShapeEntity: vi.fn(),
      updateShape: vi.fn()
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
      mockShapeService,
      mockSelectionService,
      null as any, // clipboardService
      null as any, // historyService
      mockZIndexService
    );
  });

  describe('bringToFront', () => {
    it('应该将指定的形状置顶', () => {
      const shapeIds = [testShapes[0].id];
      canvasManager.bringToFront(shapeIds);

      expect(mockShapeService.getShapeEntity).toHaveBeenCalledWith(testShapes[0].id);
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

      expect(mockShapeService.getShapeEntity).toHaveBeenCalledWith(testShapes[1].id);
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

    it('应该批量更新形状实体', () => {
      const updatedShapes = [
        { ...testShapes[0], zIndex: 5 }
      ];
      mockZIndexService.setZIndex.mockReturnValue(updatedShapes);

      const shapeIds = [testShapes[0].id];
      canvasManager.setZIndex(shapeIds, 5);

      // setZIndex 使用 updateShape 方法更新 zIndex
      expect(mockShapeService.updateShape).toHaveBeenCalledWith(
        testShapes[0].id,
        { zIndex: 5 }
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

  describe('批量更新', () => {
    it('batchUpdateShapes应该更新所有提供的形状', () => {
      const updatedShapes = [
        { ...testShapes[0], zIndex: 10 },
        { ...testShapes[1], zIndex: 11 }
      ];

      // 通过置顶操作触发批量更新
      mockZIndexService.bringToFront.mockReturnValue(updatedShapes);
      canvasManager.bringToFront([testShapes[0].id, testShapes[1].id]);

      // 现在使用 updateShape 方法进行 zIndex 更新
      expect(mockShapeService.updateShape).toHaveBeenCalledTimes(2);
      expect(mockShapeService.updateShape).toHaveBeenCalledWith(
        testShapes[0].id,
        { zIndex: 10 }
      );
      expect(mockShapeService.updateShape).toHaveBeenCalledWith(
        testShapes[1].id,
        { zIndex: 11 }
      );
    });
  });
});