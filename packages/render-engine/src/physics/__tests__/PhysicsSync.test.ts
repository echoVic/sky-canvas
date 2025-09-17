/**
 * PhysicsSync 单元测试
 * 测试物理世界与渲染世界同步器的功能
 */

import { PhysicsSync, RenderObject, PhysicsRenderMapping } from '../PhysicsSync';
import { PhysicsWorld, PhysicsBody } from '../PhysicsWorld';
import EventEmitter3 from 'eventemitter3';

describe('PhysicsSync', () => {
  let physicsSync: PhysicsSync;
  let mockPhysicsWorld: PhysicsWorld;
  let mockEventBus: EventEmitter3;

  beforeEach(() => {
    mockPhysicsWorld = new PhysicsWorld();
    physicsSync = new PhysicsSync(mockPhysicsWorld);
    mockEventBus = new EventEmitter3();
  });

  afterEach(() => {
    physicsSync.dispose();
  });

  describe('基本功能', () => {
    it('应该正确创建同步器实例', () => {
      expect(physicsSync).toBeInstanceOf(PhysicsSync);
    });

    it('应该正确设置事件总线', () => {
      expect(() => {
        physicsSync.setEventBus(mockEventBus);
      }).not.toThrow();
    });
  });

  describe('映射管理', () => {
    it('应该正确添加映射', () => {
      const physicsId = 'physics-1';
      const renderId = 'render-1';
      
      const result = physicsSync.addMapping(physicsId, renderId);
      
      expect(result).toBe(true);
    });

    it('应该正确添加带选项的映射', () => {
      const physicsId = 'physics-1';
      const renderId = 'render-1';
      const options = {
        syncPosition: true,
        syncRotation: false,
        syncScale: true,
        offset: { x: 10, y: 20, rotation: 0.5 }
      };
      
      const result = physicsSync.addMapping(physicsId, renderId, options);
      
      expect(result).toBe(true);
    });

    it('应该防止添加重复映射', () => {
      const physicsId = 'physics-1';
      const renderId = 'render-1';
      
      physicsSync.addMapping(physicsId, renderId);
      const result = physicsSync.addMapping(physicsId, 'render-2');
      
      expect(result).toBe(false);
    });

    it('应该正确移除映射', () => {
      const physicsId = 'physics-1';
      const renderId = 'render-1';
      
      physicsSync.addMapping(physicsId, renderId);
      const result = physicsSync.removeMapping(physicsId);
      
      expect(result).toBe(true);
    });

    it('应该返回false当移除不存在的映射', () => {
      const result = physicsSync.removeMapping('non-existent');
      
      expect(result).toBe(false);
    });
  });

  describe('渲染对象管理', () => {
    const mockRenderObject: RenderObject = {
      id: 'render-1',
      position: { x: 100, y: 200 },
      rotation: 0.5,
      scale: { x: 1, y: 1 },
      type: 'rectangle',
      width: 50,
      height: 30,
      visible: true
    };

    it('应该正确创建渲染对象', () => {
      expect(() => {
        physicsSync.createRenderObject(mockRenderObject);
      }).not.toThrow();
    });

    it('应该正确获取渲染对象', () => {
      physicsSync.createRenderObject(mockRenderObject);
      
      const retrieved = physicsSync.getRenderObject('render-1');
      
      expect(retrieved).toBeDefined();
      expect(retrieved?.id).toBe('render-1');
    });

    it('应该返回undefined当获取不存在的渲染对象', () => {
      const retrieved = physicsSync.getRenderObject('non-existent');
      
      expect(retrieved).toBeUndefined();
    });

    it('应该正确获取所有渲染对象', () => {
      const object1 = { ...mockRenderObject, id: 'render-1' };
      const object2 = { ...mockRenderObject, id: 'render-2' };
      
      physicsSync.createRenderObject(object1);
      physicsSync.createRenderObject(object2);
      
      const allObjects = physicsSync.getAllRenderObjects();
      
      expect(allObjects).toHaveLength(2);
      expect(allObjects.map(obj => obj.id)).toContain('render-1');
      expect(allObjects.map(obj => obj.id)).toContain('render-2');
    });
  });

  describe('同步生命周期', () => {
    it('应该正确启动同步', () => {
      expect(() => {
        physicsSync.start();
      }).not.toThrow();
    });

    it('应该正确停止同步', () => {
      physicsSync.start();
      
      expect(() => {
        physicsSync.stop();
      }).not.toThrow();
    });

    it('应该正确设置同步帧率', () => {
      expect(() => {
        physicsSync.setSyncFrameRate(30);
      }).not.toThrow();
    });

    it('应该正确设置高帧率', () => {
      expect(() => {
        physicsSync.setSyncFrameRate(120);
      }).not.toThrow();
    });
  });

  describe('单体同步', () => {
    beforeEach(() => {
      // 创建一个物理体用于测试
      const physicsBody = mockPhysicsWorld.createRectangle(
        'test-body-1',
        100,
        200,
        50,
        30,
        { isStatic: false }
      );
      
      // 添加映射
      physicsSync.addMapping(physicsBody.id, 'render-1');
    });

    it('应该正确同步单个物理体', () => {
      const physicsBody = mockPhysicsWorld.getAllBodies()[0];
      
      const result = physicsSync.syncBody(physicsBody.id);
      
      expect(result).toBe(true);
    });

    it('应该返回false当同步不存在的物理体', () => {
      const result = physicsSync.syncBody('non-existent');
      
      expect(result).toBe(false);
    });
  });

  describe('渲染对象类型', () => {
    it('应该正确处理矩形渲染对象', () => {
      const rectangleObject: RenderObject = {
        id: 'rect-1',
        position: { x: 0, y: 0 },
        rotation: 0,
        scale: { x: 1, y: 1 },
        type: 'rectangle',
        width: 100,
        height: 50,
        visible: true
      };
      
      expect(() => {
        physicsSync.createRenderObject(rectangleObject);
      }).not.toThrow();
    });

    it('应该正确处理圆形渲染对象', () => {
      const circleObject: RenderObject = {
        id: 'circle-1',
        position: { x: 0, y: 0 },
        rotation: 0,
        scale: { x: 1, y: 1 },
        type: 'circle',
        radius: 25,
        visible: true
      };
      
      expect(() => {
        physicsSync.createRenderObject(circleObject);
      }).not.toThrow();
    });

    it('应该正确处理多边形渲染对象', () => {
      const polygonObject: RenderObject = {
        id: 'polygon-1',
        position: { x: 0, y: 0 },
        rotation: 0,
        scale: { x: 1, y: 1 },
        type: 'polygon',
        visible: true
      };
      
      expect(() => {
        physicsSync.createRenderObject(polygonObject);
      }).not.toThrow();
    });

    it('应该正确处理复合渲染对象', () => {
      const compoundObject: RenderObject = {
        id: 'compound-1',
        position: { x: 0, y: 0 },
        rotation: 0,
        scale: { x: 1, y: 1 },
        type: 'compound',
        visible: true
      };
      
      expect(() => {
        physicsSync.createRenderObject(compoundObject);
      }).not.toThrow();
    });
  });

  describe('事件处理', () => {
    beforeEach(() => {
      physicsSync.setEventBus(mockEventBus);
    });

    it('应该正确处理物理体创建事件', () => {
      const physicsBody = mockPhysicsWorld.createRectangle(
        'test-body-2',
        100,
        200,
        50,
        30,
        { isStatic: false }
      );
      
      // 事件应该被正确处理，不抛出异常
      expect(() => {
        mockEventBus.emit('body-created', { body: physicsBody });
      }).not.toThrow();
    });

    it('应该正确处理物理体移除事件', () => {
      const physicsBody = mockPhysicsWorld.createRectangle(
        'test-body-3',
        100,
        200,
        50,
        30,
        { isStatic: false }
      );
      
      expect(() => {
        mockEventBus.emit('body-removed', { bodyId: physicsBody.id });
      }).not.toThrow();
    });
  });

  describe('偏移处理', () => {
    it('应该正确应用位置偏移', () => {
      const physicsBody = mockPhysicsWorld.createRectangle(
        'test-body-4',
        100,
        200,
        50,
        30,
        { isStatic: false }
      );
      
      const offset = { x: 10, y: 20, rotation: 0.1 };
      
      expect(() => {
        physicsSync.addMapping(physicsBody.id, 'render-1', { offset });
        physicsSync.syncBody(physicsBody.id);
      }).not.toThrow();
    });

    it('应该正确应用旋转偏移', () => {
      const physicsBody = mockPhysicsWorld.createRectangle(
        'test-body-5',
        100,
        200,
        50,
        30,
        { isStatic: false }
      );
      
      const offset = { x: 0, y: 0, rotation: Math.PI / 4 };
      
      expect(() => {
        physicsSync.addMapping(physicsBody.id, 'render-1', { offset });
        physicsSync.syncBody(physicsBody.id);
      }).not.toThrow();
    });
  });

  describe('选择性同步', () => {
    it('应该支持仅同步位置', () => {
      const physicsBody = mockPhysicsWorld.createRectangle(
        'test-body-6',
        100,
        200,
        50,
        30,
        { isStatic: false }
      );
      
      expect(() => {
        physicsSync.addMapping(physicsBody.id, 'render-1', {
          syncPosition: true,
          syncRotation: false,
          syncScale: false
        });
        physicsSync.syncBody(physicsBody.id);
      }).not.toThrow();
    });

    it('应该支持仅同步旋转', () => {
      const physicsBody = mockPhysicsWorld.createRectangle(
        'test-body-7',
        100,
        200,
        50,
        30,
        { isStatic: false }
      );
      
      expect(() => {
        physicsSync.addMapping(physicsBody.id, 'render-1', {
          syncPosition: false,
          syncRotation: true,
          syncScale: false
        });
        physicsSync.syncBody(physicsBody.id);
      }).not.toThrow();
    });

    it('应该支持仅同步缩放', () => {
      const physicsBody = mockPhysicsWorld.createRectangle(
        'test-body-8',
        100,
        200,
        50,
        30,
        { isStatic: false }
      );
      
      expect(() => {
        physicsSync.addMapping(physicsBody.id, 'render-1', {
          syncPosition: false,
          syncRotation: false,
          syncScale: true
        });
        physicsSync.syncBody(physicsBody.id);
      }).not.toThrow();
    });
  });

  describe('清理和销毁', () => {
    it('应该正确清理所有数据', () => {
      // 添加一些数据
      physicsSync.addMapping('physics-1', 'render-1');
      physicsSync.createRenderObject({
        id: 'render-1',
        position: { x: 0, y: 0 },
        rotation: 0,
        scale: { x: 1, y: 1 },
        type: 'rectangle',
        visible: true
      });
      
      expect(() => {
        physicsSync.clear();
      }).not.toThrow();
      
      // 验证数据已清理
      expect(physicsSync.getAllRenderObjects()).toHaveLength(0);
    });

    it('应该正确销毁同步器', () => {
      physicsSync.start();
      
      expect(() => {
        physicsSync.dispose();
      }).not.toThrow();
    });
  });

  describe('边界情况', () => {
    it('应该处理空的物理体ID', () => {
      expect(() => {
        physicsSync.syncBody('');
      }).not.toThrow();
    });

    it('应该处理无效的帧率设置', () => {
      expect(() => {
        physicsSync.setSyncFrameRate(0);
      }).not.toThrow();
      
      expect(() => {
        physicsSync.setSyncFrameRate(-1);
      }).not.toThrow();
    });

    it('应该处理重复启动', () => {
      physicsSync.start();
      
      expect(() => {
        physicsSync.start();
      }).not.toThrow();
    });

    it('应该处理重复停止', () => {
      expect(() => {
        physicsSync.stop();
      }).not.toThrow();
    });
  });

  describe('性能测试', () => {
    it('应该能处理大量映射', () => {
      const startTime = performance.now();
      
      for (let i = 0; i < 1000; i++) {
        physicsSync.addMapping(`physics-${i}`, `render-${i}`);
      }
      
      const endTime = performance.now();
      expect(endTime - startTime).toBeLessThan(100); // 应该在100ms内完成
    });

    it('应该能处理大量渲染对象', () => {
      const startTime = performance.now();
      
      for (let i = 0; i < 1000; i++) {
        physicsSync.createRenderObject({
          id: `render-${i}`,
          position: { x: i, y: i },
          rotation: 0,
          scale: { x: 1, y: 1 },
          type: 'rectangle',
          visible: true
        });
      }
      
      const endTime = performance.now();
      expect(endTime - startTime).toBeLessThan(100); // 应该在100ms内完成
    });
  });
});