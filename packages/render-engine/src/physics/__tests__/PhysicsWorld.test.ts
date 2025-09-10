/**
 * 物理世界测试
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { PhysicsWorld, PhysicsConfig } from '../PhysicsWorld';

describe('PhysicsWorld', () => {
  let physicsWorld: PhysicsWorld;

  beforeEach(() => {
    const config: PhysicsConfig = {
      gravity: { x: 0, y: 1, scale: 0.001 },
      enableSleeping: true,
      debug: false,
      constraintIterations: 2,
      positionIterations: 6
    };
    
    physicsWorld = new PhysicsWorld(config);
  });

  afterEach(() => {
    physicsWorld.dispose();
  });

  describe('物理体创建', () => {
    it('应该能创建矩形物理体', () => {
      const body = physicsWorld.createRectangle('rect1', 100, 100, 50, 30);
      
      expect(body).toBeDefined();
      expect(body.id).toBe('rect1');
      expect(body.type).toBe('rectangle');
      expect(body.body.position.x).toBe(100);
      expect(body.body.position.y).toBe(100);
    });

    it('应该能创建圆形物理体', () => {
      const body = physicsWorld.createCircle('circle1', 200, 200, 25);
      
      expect(body).toBeDefined();
      expect(body.id).toBe('circle1');
      expect(body.type).toBe('circle');
      expect(body.body.position.x).toBe(200);
      expect(body.body.position.y).toBe(200);
    });

    it('应该能创建多边形物理体', () => {
      const body = physicsWorld.createPolygon('polygon1', 150, 150, 6, 30);
      
      expect(body).toBeDefined();
      expect(body.id).toBe('polygon1');
      expect(body.type).toBe('polygon');
      expect(body.body.position.x).toBe(150);
      expect(body.body.position.y).toBe(150);
    });
  });

  describe('物理体管理', () => {
    it('应该能获取已创建的物理体', () => {
      physicsWorld.createRectangle('rect1', 100, 100, 50, 30);
      
      const body = physicsWorld.getBody('rect1');
      expect(body).toBeDefined();
      expect(body!.id).toBe('rect1');
    });

    it('应该能移除物理体', () => {
      physicsWorld.createRectangle('rect1', 100, 100, 50, 30);
      
      const removed = physicsWorld.removeBody('rect1');
      expect(removed).toBe(true);
      
      const body = physicsWorld.getBody('rect1');
      expect(body).toBeUndefined();
    });

    it('移除不存在的物理体应返回false', () => {
      const removed = physicsWorld.removeBody('nonexistent');
      expect(removed).toBe(false);
    });

    it('应该能获取所有物理体', () => {
      physicsWorld.createRectangle('rect1', 100, 100, 50, 30);
      physicsWorld.createCircle('circle1', 200, 200, 25);
      
      const allBodies = physicsWorld.getAllBodies();
      expect(allBodies).toHaveLength(2);
      expect(allBodies.map(b => b.id).sort()).toEqual(['circle1', 'rect1']);
    });
  });

  describe('物理体操作', () => {
    beforeEach(() => {
      physicsWorld.createRectangle('rect1', 100, 100, 50, 30);
    });

    it('应该能设置物理体位置', () => {
      const success = physicsWorld.setPosition('rect1', { x: 200, y: 200 });
      expect(success).toBe(true);
      
      const body = physicsWorld.getBody('rect1');
      expect(body!.body.position.x).toBe(200);
      expect(body!.body.position.y).toBe(200);
    });

    it('应该能设置物理体角度', () => {
      const success = physicsWorld.setAngle('rect1', Math.PI / 4);
      expect(success).toBe(true);
      
      const body = physicsWorld.getBody('rect1');
      expect(body!.body.angle).toBeCloseTo(Math.PI / 4);
    });

    it('应该能设置物理体速度', () => {
      const success = physicsWorld.setVelocity('rect1', { x: 10, y: -5 });
      expect(success).toBe(true);
      
      const body = physicsWorld.getBody('rect1');
      expect(body!.body.velocity.x).toBe(10);
      expect(body!.body.velocity.y).toBe(-5);
    });

    it('应该能应用力到物理体', () => {
      const success = physicsWorld.applyForce('rect1', { x: 0.01, y: -0.01 });
      expect(success).toBe(true);
      
      // 验证力的应用（力会影响速度，但具体值取决于质量等因素）
      const body = physicsWorld.getBody('rect1');
      expect(body!.body.force.x).not.toBe(0);
      expect(body!.body.force.y).not.toBe(0);
    });

    it('对不存在的物理体操作应返回false', () => {
      expect(physicsWorld.setPosition('nonexistent', { x: 0, y: 0 })).toBe(false);
      expect(physicsWorld.setAngle('nonexistent', 0)).toBe(false);
      expect(physicsWorld.setVelocity('nonexistent', { x: 0, y: 0 })).toBe(false);
      expect(physicsWorld.applyForce('nonexistent', { x: 0, y: 0 })).toBe(false);
    });
  });

  describe('约束系统', () => {
    beforeEach(() => {
      physicsWorld.createRectangle('rect1', 100, 100, 50, 30);
      physicsWorld.createRectangle('rect2', 200, 100, 50, 30);
    });

    it('应该能创建两个物理体间的约束', () => {
      const constraint = physicsWorld.createConstraint('constraint1', 'rect1', 'rect2', {
        length: 100,
        stiffness: 1,
        damping: 0.1
      });
      
      expect(constraint).toBeDefined();
      expect(constraint!.length).toBe(100);
      expect(constraint!.stiffness).toBe(1);
      expect(constraint!.damping).toBe(0.1);
    });

    it('创建不存在物理体间的约束应返回null', () => {
      const constraint = physicsWorld.createConstraint('constraint1', 'nonexistent', 'rect2');
      expect(constraint).toBeNull();
    });
  });

  describe('物理世界控制', () => {
    it('应该能启动和停止物理世界', () => {
      expect(() => {
        physicsWorld.start();
        physicsWorld.stop();
      }).not.toThrow();
    });

    it('重复启动应该安全', () => {
      physicsWorld.start();
      expect(() => {
        physicsWorld.start(); // 重复启动
      }).not.toThrow();
      physicsWorld.stop();
    });

    it('应该能清除所有物理体', () => {
      physicsWorld.createRectangle('rect1', 100, 100, 50, 30);
      physicsWorld.createCircle('circle1', 200, 200, 25);
      
      physicsWorld.clear();
      
      expect(physicsWorld.getAllBodies()).toHaveLength(0);
    });
  });

  describe('事件系统', () => {
    it('应该能设置事件总线', () => {
      const eventBus = {
        emit: vi.fn(),
        on: vi.fn(),
        off: vi.fn()
      };
      
      physicsWorld.setEventBus(eventBus);
      
      // 创建物理体应该触发事件
      physicsWorld.createRectangle('rect1', 100, 100, 50, 30);
      
      expect(eventBus.emit).toHaveBeenCalledWith('body-created', expect.any(Object));
    });
  });

  describe('物理体配置', () => {
    it('应该能使用自定义物理属性创建物理体', () => {
      const body = physicsWorld.createRectangle('rect1', 100, 100, 50, 30, {
        isStatic: true,
        density: 0.002,
        friction: 0.8,
        restitution: 0.9,
        angle: Math.PI / 6,
        velocity: { x: 5, y: -3 },
        angularVelocity: 0.1
      });
      
      expect(body.body.isStatic).toBe(true);
      expect(body.body.density).toBe(0.002);
      expect(body.body.friction).toBe(0.8);
      expect(body.body.restitution).toBe(0.9);
      expect(body.body.angle).toBeCloseTo(Math.PI / 6);
      expect(body.body.velocity.x).toBe(5);
      expect(body.body.velocity.y).toBe(-3);
      expect(body.body.angularVelocity).toBeCloseTo(0.1);
    });
  });
});