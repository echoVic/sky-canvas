/**
 * CanvasModel单元测试
 *
 * 注意：此测试暂时简化，专注于测试CanvasModel的核心功能
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { CanvasModel, ChangeDescription } from '../CanvasModel';

// Mock形状对象，用于测试CanvasModel逻辑
class MockShape {
  public id: string;
  public x: number;
  public y: number;
  public visible: boolean = true;
  public zIndex: number = 0;
  public width?: number;
  public height?: number;

  constructor(config: any) {
    this.id = config.id;
    this.x = config.x || 0;
    this.y = config.y || 0;
    this.visible = config.visible ?? true;
    this.zIndex = config.zIndex || 0;
    if (config.width !== undefined) this.width = config.width;
    if (config.height !== undefined) this.height = config.height;
  }

  style() {
    return { fill: '#000000' };
  }

  setVisible(value: boolean): this {
    this.visible = value;
    return this;
  }

  setZIndex(value: number): this {
    this.zIndex = value;
    return this;
  }

  render() {}
  hitTest() { return false; }
  getBounds() { return { x: this.x, y: this.y, width: this.width || 10, height: this.height || 10 }; }
  clone() { return new MockShape(this); }
  dispose() {}

  get transform() {
    return {
      position: { x: this.x, y: this.y }
    };
  }
}

describe('CanvasModel', () => {
  let model: CanvasModel;
  let changeHistory: ChangeDescription[];
  let mockListener: any;

  beforeEach(() => {
    model = new CanvasModel();
    changeHistory = [];
    mockListener = vi.fn((change: ChangeDescription) => {
      changeHistory.push(change);
    });
    model.subscribe(mockListener);
  });

  afterEach(() => {
    model.dispose();
    vi.clearAllTimers();
  });

  describe('基本查询功能', () => {
    it('应该初始状态为空', () => {
      expect(model.getShapes()).toEqual([]);
      expect(model.getShapeIds()).toEqual([]);
      expect(model.getSelection()).toEqual([]);
      expect(model.getShapeCount()).toBe(0);
      expect(model.getSelectionCount()).toBe(0);
    });

    it('应该正确添加和查询形状', () => {
      const rect = new MockShape({ id: 'rect1', x: 10, y: 20, width: 100, height: 50 });
      model.addShape(rect as any);

      expect(model.hasShape('rect1')).toBe(true);
      expect(model.hasShape('nonexistent')).toBe(false);
      expect(model.getShape('rect1')).toBe(rect);
      expect(model.getShape('nonexistent')).toBeUndefined();
      expect(model.getShapeCount()).toBe(1);
      expect(model.getShapeIds()).toContain('rect1');
      expect(model.getShapes()).toContain(rect);
    });

    it('应该拒绝重复ID的形状', () => {
      const rect1 = new MockShape({ id: 'rect1' });
      const rect2 = new MockShape({ id: 'rect1' }); // 相同ID

      model.addShape(rect1 as any);

      expect(() => model.addShape(rect2 as any)).toThrow('Shape with id rect1 already exists');
      expect(model.getShapeCount()).toBe(1);
    });
  });

  describe('形状管理', () => {
    it('应该正确删除形状', () => {
      const rect = new MockShape({ id: 'rect1' });
      model.addShape(rect as any);
      model.setSelection(['rect1']); // 先选中

      const result = model.removeShape('rect1');

      expect(result).toBe(true);
      expect(model.hasShape('rect1')).toBe(false);
      expect(model.getShapeCount()).toBe(0);
      expect(model.isSelected('rect1')).toBe(false); // 应该自动从选择中移除
    });

    it('应该处理删除不存在的形状', () => {
      const result = model.removeShape('nonexistent');
      expect(result).toBe(false);
    });

    it('应该正确更新形状属性', () => {
      const rect = new MockShape({ id: 'rect1', x: 10, y: 20, width: 100, height: 50 });
      model.addShape(rect as any);

      const updates = {
        x: 30,
        y: 40,
        visible: false,
        zIndex: 5
      };

      const result = model.updateShape('rect1', updates);

      expect(result).toBe(true);
      expect(rect.x).toBe(30);
      expect(rect.y).toBe(40);
      expect(rect.visible).toBe(false);
      expect(rect.zIndex).toBe(5);
    });

    it('应该正确清空所有形状', () => {
      const rect = new MockShape({ id: 'rect1' });
      const circle = new MockShape({ id: 'circle1' });
      model.addShape(rect as any);
      model.addShape(circle as any);
      model.setSelection(['rect1', 'circle1']);

      model.clearShapes();

      expect(model.getShapeCount()).toBe(0);
      expect(model.getSelectionCount()).toBe(0);
      expect(model.getShapes()).toEqual([]);
      expect(model.getSelection()).toEqual([]);
    });
  });

  describe('选择管理', () => {
    let rect: MockShape, circle: MockShape;

    beforeEach(() => {
      rect = new MockShape({ id: 'rect1' });
      circle = new MockShape({ id: 'circle1' });
      model.addShape(rect as any);
      model.addShape(circle as any);
    });

    it('应该正确设置选择', () => {
      model.setSelection(['rect1', 'circle1']);

      expect(model.getSelection()).toEqual(['rect1', 'circle1']);
      expect(model.getSelectionCount()).toBe(2);
      expect(model.isSelected('rect1')).toBe(true);
      expect(model.isSelected('circle1')).toBe(true);
    });

    it('应该过滤无效的形状ID', () => {
      model.setSelection(['rect1', 'nonexistent', 'circle1']);

      expect(model.getSelection()).toEqual(['rect1', 'circle1']);
      expect(model.getSelectionCount()).toBe(2);
    });

    it('应该正确添加到选择', () => {
      model.setSelection(['rect1']);
      model.addToSelection(['circle1']);

      expect(model.getSelection()).toEqual(['rect1', 'circle1']);
      expect(model.getSelectionCount()).toBe(2);
    });

    it('应该正确从选择中移除', () => {
      model.setSelection(['rect1', 'circle1']);
      model.removeFromSelection(['circle1']);

      expect(model.getSelection()).toEqual(['rect1']);
      expect(model.getSelectionCount()).toBe(1);
    });

    it('应该正确清空选择', () => {
      model.setSelection(['rect1', 'circle1']);
      model.clearSelection();

      expect(model.getSelection()).toEqual([]);
      expect(model.getSelectionCount()).toBe(0);
    });

    it('应该正确执行全选', () => {
      model.selectAll();

      expect(model.getSelection().sort()).toEqual(['rect1', 'circle1'].sort());
      expect(model.getSelectionCount()).toBe(2);
    });
  });

  describe('批量操作', () => {
    it('应该支持批量操作', () => {
      const rect = new MockShape({ id: 'rect1' });
      const circle = new MockShape({ id: 'circle1' });

      model.beginBatch();
      expect(model.isBatching()).toBe(true);

      model.addShape(rect as any);
      model.addShape(circle as any);
      model.setSelection(['rect1', 'circle1']);

      // 在批量操作中，不应该发送通知
      expect(mockListener).not.toHaveBeenCalled();

      model.endBatch();
      expect(model.isBatching()).toBe(false);
    });

    it('应该处理空的批量操作', () => {
      model.beginBatch();
      model.endBatch();

      expect(mockListener).not.toHaveBeenCalled();
    });
  });

  describe('通知机制', () => {
    it('应该正确订阅和取消订阅', () => {
      const listener1 = vi.fn();
      const listener2 = vi.fn();

      const unsubscribe1 = model.subscribe(listener1);
      model.subscribe(listener2);

      const rect = new MockShape({ id: 'rect1' });
      model.addShape(rect as any);

      // 等待异步通知
      setTimeout(() => {
        expect(listener1).toHaveBeenCalled();
        expect(listener2).toHaveBeenCalled();

        // 取消订阅第一个监听器
        unsubscribe1();

        const circle = new MockShape({ id: 'circle1' });
        model.addShape(circle as any);

        setTimeout(() => {
          expect(listener2).toHaveBeenCalledTimes(2);
          expect(listener1).toHaveBeenCalledTimes(1);
        }, 20);
      }, 20);
    });

    it('应该支持立即通知', () => {
      const immediateChange: ChangeDescription = {
        type: 'test-immediate',
        timestamp: Date.now()
      };

      model.notifyImmediate(immediateChange);

      expect(mockListener).toHaveBeenCalledWith(immediateChange);
    });
  });

  describe('统计信息', () => {
    it('应该返回正确的统计信息', () => {
      const rect = new MockShape({ id: 'rect1' });
      const circle = new MockShape({ id: 'circle1' });

      model.addShape(rect as any);
      model.addShape(circle as any);
      model.setSelection(['rect1']);

      const secondListener = vi.fn();
      model.subscribe(secondListener);

      const stats = model.getStats();

      expect(stats.shapeCount).toBe(2);
      expect(stats.selectionCount).toBe(1);
      expect(stats.listenerCount).toBe(2);
      expect(stats.isBatching).toBe(false);
      expect(typeof stats.pendingNotifications).toBe('number');
    });
  });

  describe('资源清理', () => {
    it('应该正确清理所有资源', () => {
      const rect = new MockShape({ id: 'rect1' });
      model.addShape(rect as any);
      model.setSelection(['rect1']);
      model.beginBatch();

      model.dispose();

      const stats = model.getStats();
      expect(stats.shapeCount).toBe(0);
      expect(stats.selectionCount).toBe(0);
      expect(stats.listenerCount).toBe(0);
      expect(stats.isBatching).toBe(false);
      expect(stats.pendingNotifications).toBe(0);

      expect(model.getShapes()).toEqual([]);
      expect(model.getSelection()).toEqual([]);
    });
  });
});