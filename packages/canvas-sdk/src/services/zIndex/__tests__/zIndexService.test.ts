/**
 * Z轴管理服务测试
 */

import { Rectangle, Shape } from '@sky-canvas/render-engine';
import { vi } from 'vitest';
import { IZIndexService, ZIndexService } from '../zIndexService';

describe('ZIndexService', () => {
  let zIndexService: IZIndexService;
  let mockEventBus: any;
  let mockLogService: any;
  let testShapes: Shape[];

  beforeEach(() => {
    mockEventBus = {
      emit: vi.fn()
    };
    mockLogService = {
      debug: vi.fn()
    };

    zIndexService = new ZIndexService(mockEventBus, mockLogService);

    // 创建测试用的形状数据
    testShapes = [
      new Rectangle({ x: 0, y: 0, width: 50, height: 50, zIndex: 0 }),
      new Rectangle({ x: 100, y: 100, width: 50, height: 50, zIndex: 1 }),
      new Rectangle({ x: 200, y: 200, width: 50, height: 50, zIndex: 2 }),
      new Rectangle({ x: 300, y: 300, width: 50, height: 50, zIndex: 3 })
    ];
  });

  describe('bringToFront', () => {
    it('应该将选中的形状移到最前面', () => {
      const shapesToMove = [testShapes[0]]; // zIndex: 0
      const result = zIndexService.bringToFront(shapesToMove, testShapes);

      // 选中的形状应该获得最高的zIndex
      const movedShape = result.find(s => s.id === testShapes[0].id);
      expect(movedShape?.zIndex).toBe(4); // 比最大值3还要大

      // 其他形状的zIndex应该保持不变
      const otherShapes = result.filter(s => s.id !== testShapes[0].id);
      expect(otherShapes.every(s => s.zIndex <= 3)).toBe(true);
    });

    it('应该处理多个形状同时置顶', () => {
      const shapesToMove = [testShapes[0], testShapes[1]]; // zIndex: 0, 1
      const result = zIndexService.bringToFront(shapesToMove, testShapes);

      const movedShapes = result.filter(s => shapesToMove.some(ms => ms.id === s.id));

      // 多个形状都应该在最前面，保持相对顺序
      expect(movedShapes[0].zIndex).toBe(4);
      expect(movedShapes[1].zIndex).toBe(5);
    });

    it('应该发送zIndex变更事件', () => {
      const shapesToMove = [testShapes[0]];
      zIndexService.bringToFront(shapesToMove, testShapes);

      expect(mockEventBus.emit).toHaveBeenCalledWith('canvas:zIndexChanged', expect.objectContaining({
        shapeIds: [testShapes[0].id],
        operation: 'bringToFront',
        oldZIndices: { [testShapes[0].id]: 0 },
        newZIndices: { [testShapes[0].id]: 4 }
      }));
    });
  });

  describe('sendToBack', () => {
    it('应该将选中的形状移到最后面', () => {
      const shapesToMove = [testShapes[3]]; // zIndex: 3
      const result = zIndexService.sendToBack(shapesToMove, testShapes);

      const movedShape = result.find(s => s.id === testShapes[3].id);
      expect(movedShape?.zIndex).toBe(-1); // 比最小值0还要小
    });

    it('应该处理多个形状同时置底', () => {
      const shapesToMove = [testShapes[2], testShapes[3]]; // zIndex: 2, 3
      const result = zIndexService.sendToBack(shapesToMove, testShapes);

      const movedShapes = result.filter(s => shapesToMove.some(ms => ms.id === s.id));

      // 多个形状都应该在最后面，保持相对顺序
      expect(movedShapes[0].zIndex).toBe(-2);
      expect(movedShapes[1].zIndex).toBe(-1);
    });
  });

  describe('bringForward', () => {
    it('应该将形状上移一层', () => {
      const shapesToMove = [testShapes[1]]; // zIndex: 1
      const result = zIndexService.bringForward(shapesToMove, testShapes);

      const movedShape = result.find(s => s.id === testShapes[1].id);
      const swappedShape = result.find(s => s.id === testShapes[2].id);

      // 应该与zIndex为2的形状交换位置
      expect(movedShape?.zIndex).toBe(2);
      expect(swappedShape?.zIndex).toBe(1);
    });

    it('已经在最前面的形状不应该移动', () => {
      const shapesToMove = [testShapes[3]]; // zIndex: 3, 已经是最高
      const result = zIndexService.bringForward(shapesToMove, testShapes);

      const movedShape = result.find(s => s.id === testShapes[3].id);
      expect(movedShape?.zIndex).toBe(3); // 应该保持不变
    });
  });

  describe('sendBackward', () => {
    it('应该将形状下移一层', () => {
      const shapesToMove = [testShapes[2]]; // zIndex: 2
      const result = zIndexService.sendBackward(shapesToMove, testShapes);

      const movedShape = result.find(s => s.id === testShapes[2].id);
      const swappedShape = result.find(s => s.id === testShapes[1].id);

      // 应该与zIndex为1的形状交换位置
      expect(movedShape?.zIndex).toBe(1);
      expect(swappedShape?.zIndex).toBe(2);
    });

    it('已经在最后面的形状不应该移动', () => {
      const shapesToMove = [testShapes[0]]; // zIndex: 0, 已经是最低
      const result = zIndexService.sendBackward(shapesToMove, testShapes);

      const movedShape = result.find(s => s.id === testShapes[0].id);
      expect(movedShape?.zIndex).toBe(0); // 应该保持不变
    });
  });

  describe('setZIndex', () => {
    it('应该设置指定的zIndex值', () => {
      const shapesToUpdate = [testShapes[0], testShapes[1]];
      const targetZIndex = 10;

      const result = zIndexService.setZIndex(shapesToUpdate, targetZIndex);

      expect(result[0].zIndex).toBe(10);
      expect(result[1].zIndex).toBe(11); // 多个形状依次递增
    });
  });

  describe('getSortedShapes', () => {
    it('应该按zIndex排序形状', () => {
      // 打乱顺序
      const shuffledShapes = [testShapes[2], testShapes[0], testShapes[3], testShapes[1]];

      const result = zIndexService.getSortedShapes(shuffledShapes);

      expect(result[0].zIndex).toBe(0);
      expect(result[1].zIndex).toBe(1);
      expect(result[2].zIndex).toBe(2);
      expect(result[3].zIndex).toBe(3);
    });
  });

  describe('normalizeZIndices', () => {
    it('应该重新分配连续的zIndex', () => {
      // 创建不连续的zIndex
      const messyShapes = [
        new Rectangle({ x: 0, y: 0, width: 50, height: 50, zIndex: -5 }),
        new Rectangle({ x: 100, y: 100, width: 50, height: 50, zIndex: 10 }),
        new Rectangle({ x: 200, y: 200, width: 50, height: 50, zIndex: 100 }),
        new Rectangle({ x: 300, y: 300, width: 50, height: 50, zIndex: 1000 })
      ];

      const result = zIndexService.normalizeZIndices(messyShapes);

      expect(result[0].zIndex).toBe(0);
      expect(result[1].zIndex).toBe(1);
      expect(result[2].zIndex).toBe(2);
      expect(result[3].zIndex).toBe(3);
    });
  });

  describe('getRelativePosition', () => {
    it('应该返回形状在排序列表中的位置', () => {
      const position = zIndexService.getRelativePosition(testShapes[2], testShapes);
      expect(position).toBe(2); // zIndex为2的形状在第3个位置（从0开始）
    });

    it('如果形状不存在应该返回-1', () => {
      const nonExistentShape = new Rectangle({ x: 999, y: 999, width: 50, height: 50 });
      const position = zIndexService.getRelativePosition(nonExistentShape, testShapes);
      expect(position).toBe(-1);
    });
  });
});