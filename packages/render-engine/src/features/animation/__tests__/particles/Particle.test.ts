import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { Particle } from '../../particles/Particle';
import { ParticleConfig, ParticleState, Point2D, Vector2D } from '../../types/ParticleTypes';

describe('Particle', () => {
  let particle: Particle;
  let config: ParticleConfig;

  beforeEach(() => {
    // Arrange: 准备测试数据
    config = {
      position: { x: 10, y: 20 },
      velocity: { x: 1, y: 2 },
      acceleration: { x: 0.1, y: 0.2 },
      size: 5,
      scale: { x: 1.5, y: 1.5 },
      rotation: Math.PI / 4,
      angularVelocity: 0.1,
      alpha: 0.8,
      color: '#ff0000',
      life: 2000,
      mass: 2,
      userData: { type: 'test' }
    };
    particle = new Particle(config);
  });

  afterEach(() => {
    // Cleanup: 清理测试环境
    vi.restoreAllMocks();
  });

  describe('基本功能', () => {
    it('应该正确初始化粒子', () => {
      // Assert: 验证结果
      expect(particle.id).toBeDefined();
      expect(particle.position).toEqual({ x: 10, y: 20 });
      expect(particle.velocity).toEqual({ x: 1, y: 2 });
      expect(particle.acceleration).toEqual({ x: 0.1, y: 0.2 });
      expect(particle.size).toBe(5);
      expect(particle.scale).toEqual({ x: 1.5, y: 1.5 });
      expect(particle.rotation).toBe(Math.PI / 4);
      expect(particle.angularVelocity).toBe(0.1);
      expect(particle.alpha).toBe(0.8);
      expect(particle.color).toBe('#ff0000');
      expect(particle.life).toBe(2000);
      expect(particle.maxLife).toBe(2000);
      expect(particle.mass).toBe(2);
      expect(particle.state).toBe(ParticleState.ACTIVE);
      expect(particle.userData).toEqual({ type: 'test' });
    });

    it('应该使用默认值初始化粒子', () => {
      // Arrange: 准备测试数据
      const defaultParticle = new Particle();
      
      // Assert: 验证结果
      expect(defaultParticle.position).toEqual({ x: 0, y: 0 });
      expect(defaultParticle.velocity).toEqual({ x: 0, y: 0 });
      expect(defaultParticle.acceleration).toEqual({ x: 0, y: 0 });
      expect(defaultParticle.size).toBe(1);
      expect(defaultParticle.scale).toEqual({ x: 1, y: 1 });
      expect(defaultParticle.rotation).toBe(0);
      expect(defaultParticle.angularVelocity).toBe(0);
      expect(defaultParticle.alpha).toBe(1);
      expect(defaultParticle.color).toBe('#ffffff');
      expect(defaultParticle.life).toBe(1000);
      expect(defaultParticle.mass).toBe(1);
      expect(defaultParticle.state).toBe(ParticleState.ACTIVE);
      expect(defaultParticle.userData).toEqual({});
    });

    it('应该生成唯一的 ID', () => {
      // Arrange: 准备测试数据
      const particle2 = new Particle();
      
      // Assert: 验证结果
      expect(particle.id).not.toBe(particle2.id);
      expect(particle.id).toMatch(/^particle_[a-z0-9]{9}$/);
    });
  });

  describe('生命周期管理', () => {
    it('应该正确计算生命进度', () => {
      // Act & Assert: 执行测试操作并验证结果
      expect(particle.getLifeProgress()).toBe(0); // 刚创建时进度为 0
      
      particle.life = 1000; // 剩余一半生命
      expect(particle.getLifeProgress()).toBe(0.5);
      
      particle.life = 0; // 生命结束
      expect(particle.getLifeProgress()).toBe(1);
    });

    it('应该正确计算剩余生命进度', () => {
      // Act & Assert: 执行测试操作并验证结果
      expect(particle.getRemainingLifeProgress()).toBe(1); // 刚创建时剩余 100%
      
      particle.life = 1000; // 剩余一半生命
      expect(particle.getRemainingLifeProgress()).toBe(0.5);
      
      particle.life = 0; // 生命结束
      expect(particle.getRemainingLifeProgress()).toBe(0);
    });

    it('应该正确判断粒子是否存活', () => {
      // Assert: 验证结果
      expect(particle.isAlive()).toBe(true);
      expect(particle.isDead()).toBe(false);
      
      // Act: 执行测试操作
      particle.life = 0;
      
      // Assert: 验证结果
      expect(particle.isAlive()).toBe(false);
      expect(particle.isDead()).toBe(true);
    });

    it('应该能够设置生命值', () => {
      // Act: 执行测试操作
      particle.setLife(3000);
      
      // Assert: 验证结果
      expect(particle.life).toBe(3000);
      expect(particle.maxLife).toBe(3000);
    });

    it('应该能够延长生命', () => {
      // Arrange: 准备测试数据
      const originalLife = particle.life;
      const originalMaxLife = particle.maxLife;
      
      // Act: 执行测试操作
      particle.extendLife(1000);
      
      // Assert: 验证结果
      expect(particle.life).toBe(originalLife + 1000);
      expect(particle.maxLife).toBe(originalMaxLife + 1000);
    });
  });

  describe('物理运动', () => {
    it('应该正确更新粒子状态', () => {
      // Arrange: 准备测试数据
      const deltaTime = 16; // 16ms
      const initialPosition = { ...particle.position };
      const initialVelocity = { ...particle.velocity };
      const initialRotation = particle.rotation;
      const initialLife = particle.life;
      
      // Act: 执行测试操作
      particle.update(deltaTime);
      
      // Assert: 验证结果
      // 位置应该根据速度更新
      expect(particle.position.x).toBeCloseTo(initialPosition.x + initialVelocity.x * deltaTime / 1000);
      expect(particle.position.y).toBeCloseTo(initialPosition.y + initialVelocity.y * deltaTime / 1000);
      
      // 速度应该根据加速度更新
      expect(particle.velocity.x).toBeCloseTo(initialVelocity.x + particle.acceleration.x * deltaTime / 1000);
      expect(particle.velocity.y).toBeCloseTo(initialVelocity.y + particle.acceleration.y * deltaTime / 1000);
      
      // 旋转应该根据角速度更新
      expect(particle.rotation).toBeCloseTo(initialRotation + particle.angularVelocity * deltaTime / 1000);
      
      // 生命应该减少
      expect(particle.life).toBe(initialLife - deltaTime);
    });

    it('应该在生命结束时设置为死亡状态', () => {
      // Arrange: 准备测试数据
      particle.life = 10; // 很短的生命
      
      // Act: 执行测试操作
      particle.update(20); // 更新时间超过生命
      
      // Assert: 验证结果
      expect(particle.life).toBeLessThanOrEqual(0);
      expect(particle.state).toBe(ParticleState.DEAD);
    });

    it('应该在非活跃状态时不更新', () => {
      // Arrange: 准备测试数据
      particle.state = ParticleState.INACTIVE;
      const initialPosition = { ...particle.position };
      const initialLife = particle.life;
      
      // Act: 执行测试操作
      particle.update(16);
      
      // Assert: 验证结果
      expect(particle.position).toEqual(initialPosition);
      expect(particle.life).toBe(initialLife);
    });
  });

  describe('力的应用', () => {
    it('应该能够应用力', () => {
      // Arrange: 准备测试数据
      const force: Vector2D = { x: 10, y: 20 };
      const initialAcceleration = { ...particle.acceleration };
      
      // Act: 执行测试操作
      particle.applyForce(force);
      
      // Assert: 验证结果
      expect(particle.acceleration.x).toBeCloseTo(initialAcceleration.x + force.x / particle.mass);
      expect(particle.acceleration.y).toBeCloseTo(initialAcceleration.y + force.y / particle.mass);
    });

    it('应该根据质量正确计算加速度', () => {
      // Arrange: 准备测试数据
      const heavyParticle = new Particle({ mass: 10 });
      const lightParticle = new Particle({ mass: 1 });
      const force: Vector2D = { x: 10, y: 0 };
      
      // Act: 执行测试操作
      heavyParticle.applyForce(force);
      lightParticle.applyForce(force);
      
      // Assert: 验证结果
      expect(lightParticle.acceleration.x).toBeGreaterThan(heavyParticle.acceleration.x);
    });
  });

  describe('距离和向量计算', () => {
    it('应该正确计算到点的距离', () => {
      // Arrange: 准备测试数据
      const point: Point2D = { x: 13, y: 24 }; // 距离 (10,20) 为 5
      
      // Act: 执行测试操作
      const distance = particle.getDistanceTo(point);
      
      // Assert: 验证结果
      expect(distance).toBeCloseTo(5, 5);
    });

    it('应该正确计算到点的向量', () => {
      // Arrange: 准备测试数据
      const point: Point2D = { x: 15, y: 25 };
      
      // Act: 执行测试操作
      const vector = particle.getVectorTo(point);
      
      // Assert: 验证结果
      expect(vector.x).toBe(5); // 15 - 10
      expect(vector.y).toBe(5); // 25 - 20
    });
  });

  describe('速度管理', () => {
    it('应该正确计算速度大小', () => {
      // Act: 执行测试操作
      const speed = particle.getSpeed();
      
      // Assert: 验证结果
      expect(speed).toBeCloseTo(Math.sqrt(1 * 1 + 2 * 2), 5); // sqrt(1^2 + 2^2)
    });

    it('应该能够设置速度大小', () => {
      // Arrange: 准备测试数据
      const newSpeed = 10;
      const originalAngle = particle.getVelocityAngle();
      
      // Act: 执行测试操作
      particle.setSpeed(newSpeed);
      
      // Assert: 验证结果
      expect(particle.getSpeed()).toBeCloseTo(newSpeed, 5);
      expect(particle.getVelocityAngle()).toBeCloseTo(originalAngle, 5); // 角度应该保持不变
    });

    it('应该正确计算速度角度', () => {
      // Act: 执行测试操作
      const angle = particle.getVelocityAngle();
      
      // Assert: 验证结果
      expect(angle).toBeCloseTo(Math.atan2(2, 1), 5); // atan2(vy, vx)
    });

    it('应该能够设置速度角度', () => {
      // Arrange: 准备测试数据
      const newAngle = Math.PI / 2; // 90度
      const originalSpeed = particle.getSpeed();
      
      // Act: 执行测试操作
      particle.setVelocityAngle(newAngle);
      
      // Assert: 验证结果
      expect(particle.getVelocityAngle()).toBeCloseTo(newAngle, 5);
      expect(particle.getSpeed()).toBeCloseTo(originalSpeed, 5); // 速度大小应该保持不变
      expect(particle.velocity.x).toBeCloseTo(0, 5); // cos(90°) = 0
      expect(particle.velocity.y).toBeCloseTo(originalSpeed, 5); // sin(90°) = 1
    });
  });

  describe('粒子重置', () => {
    it('应该能够重置到初始状态', () => {
      // Arrange: 准备测试数据
      particle.position = { x: 100, y: 200 };
      particle.velocity = { x: 10, y: 20 };
      particle.life = 500;
      particle.state = ParticleState.DEAD;
      
      // Act: 执行测试操作
      particle.reset();
      
      // Assert: 验证结果
      expect(particle.position).toEqual({ x: 10, y: 20 });
      expect(particle.velocity).toEqual({ x: 1, y: 2 });
      expect(particle.life).toBe(2000);
      expect(particle.state).toBe(ParticleState.ACTIVE);
    });

    it('应该能够更新初始配置', () => {
      // Arrange: 准备测试数据
      const newConfig = {
        position: { x: 50, y: 60 },
        velocity: { x: 5, y: 6 },
        color: '#00ff00'
      };
      
      // Act: 执行测试操作
      particle.updateInitialConfig(newConfig);
      particle.reset();
      
      // Assert: 验证结果
      expect(particle.position).toEqual({ x: 50, y: 60 });
      expect(particle.velocity).toEqual({ x: 5, y: 6 });
      expect(particle.color).toBe('#00ff00');
    });
  });

  describe('粒子克隆', () => {
    it('应该能够克隆粒子', () => {
      // Act: 执行测试操作
      const clonedParticle = particle.clone();
      
      // Assert: 验证结果
      expect(clonedParticle.id).not.toBe(particle.id); // ID 应该不同
      expect(clonedParticle.position).toEqual(particle.position);
      expect(clonedParticle.velocity).toEqual(particle.velocity);
      expect(clonedParticle.acceleration).toEqual(particle.acceleration);
      expect(clonedParticle.size).toBe(particle.size);
      expect(clonedParticle.scale).toEqual(particle.scale);
      expect(clonedParticle.rotation).toBe(particle.rotation);
      expect(clonedParticle.angularVelocity).toBe(particle.angularVelocity);
      expect(clonedParticle.alpha).toBe(particle.alpha);
      expect(clonedParticle.color).toBe(particle.color);
      expect(clonedParticle.life).toBe(particle.life);
      expect(clonedParticle.maxLife).toBe(particle.maxLife);
      expect(clonedParticle.mass).toBe(particle.mass);
      expect(clonedParticle.state).toBe(particle.state);
      expect(clonedParticle.userData).toEqual(particle.userData);
    });

    it('克隆的粒子应该是独立的', () => {
      // Arrange: 准备测试数据
      const clonedParticle = particle.clone();
      
      // Act: 执行测试操作
      particle.position.x = 999;
      particle.userData.newProp = 'test';
      
      // Assert: 验证结果
      expect(clonedParticle.position.x).not.toBe(999); // 克隆的粒子不应该受影响
      expect(clonedParticle.userData.newProp).toBeUndefined();
    });
  });

  describe('边界情况', () => {
    it('应该处理零质量的情况', () => {
      // Arrange: 准备测试数据
      const zeroMassParticle = new Particle({ mass: 0 });
      const force: Vector2D = { x: 10, y: 10 };
      
      // Act & Assert: 执行测试操作并验证结果
      expect(() => {
        zeroMassParticle.applyForce(force);
      }).not.toThrow();
    });

    it('应该处理负生命值', () => {
      // Act: 执行测试操作
      particle.setLife(-100);
      
      // Assert: 验证结果
      expect(particle.life).toBe(-100);
      expect(particle.isDead()).toBe(true);
    });

    it('应该处理零速度的角度计算', () => {
      // Arrange: 准备测试数据
      const stillParticle = new Particle({ velocity: { x: 0, y: 0 } });
      
      // Act & Assert: 执行测试操作并验证结果
      expect(() => {
        stillParticle.getVelocityAngle();
        stillParticle.setVelocityAngle(Math.PI / 4);
      }).not.toThrow();
    });
  });
});