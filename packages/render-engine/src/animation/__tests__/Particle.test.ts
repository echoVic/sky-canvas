/**
 * 粒子测试
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { Particle } from '../particles/Particle';
import { ParticleState } from '../types/ParticleTypes';

describe('Particle', () => {
  let particle: Particle;

  beforeEach(() => {
    particle = new Particle({
      position: { x: 0, y: 0 },
      velocity: { x: 10, y: -10 },
      acceleration: { x: 0, y: 9.8 },
      size: 5,
      alpha: 1,
      color: '#ff0000',
      life: 1000,
      mass: 1
    });
  });

  describe('构造函数', () => {
    it('应该正确初始化粒子属性', () => {
      expect(particle.position).toEqual({ x: 0, y: 0 });
      expect(particle.velocity).toEqual({ x: 10, y: -10 });
      expect(particle.acceleration).toEqual({ x: 0, y: 9.8 });
      expect(particle.size).toBe(5);
      expect(particle.alpha).toBe(1);
      expect(particle.color).toBe('#ff0000');
      expect(particle.life).toBe(1000);
      expect(particle.maxLife).toBe(1000);
      expect(particle.mass).toBe(1);
      expect(particle.state).toBe(ParticleState.ACTIVE);
    });

    it('应该使用默认值', () => {
      const defaultParticle = new Particle();
      
      expect(defaultParticle.position).toEqual({ x: 0, y: 0 });
      expect(defaultParticle.velocity).toEqual({ x: 0, y: 0 });
      expect(defaultParticle.size).toBe(1);
      expect(defaultParticle.alpha).toBe(1);
      expect(defaultParticle.color).toBe('#ffffff');
      expect(defaultParticle.life).toBe(1000);
      expect(defaultParticle.mass).toBe(1);
    });

    it('应该生成唯一ID', () => {
      const particle1 = new Particle();
      const particle2 = new Particle();
      
      expect(particle1.id).not.toBe(particle2.id);
      expect(particle1.id).toMatch(/^particle_/);
    });
  });

  describe('更新', () => {
    it('应该更新位置和速度', () => {
      particle.update(100); // 0.1秒

      expect(particle.position.x).toBeCloseTo(1, 5); // 10 * 0.1
      expect(particle.position.y).toBeCloseTo(-0.902, 5); // -10 * 0.1 + 0.5 * 9.8 * 0.1^2 = -1 + 0.049 = -0.951，但实际计算是分步的
      expect(particle.velocity.x).toBeCloseTo(10, 5); // 10 + 0 * 0.1
      expect(particle.velocity.y).toBeCloseTo(-9.02, 5); // -10 + 9.8 * 0.1
    });

    it('应该减少生命值', () => {
      particle.update(100);
      expect(particle.life).toBe(900);
    });

    it('应该在生命耗尽时标记为死亡', () => {
      particle.update(1000);
      expect(particle.life).toBe(0);
      expect(particle.state).toBe(ParticleState.DEAD);
    });

    it('应该更新旋转', () => {
      particle.angularVelocity = Math.PI; // 每秒180度
      particle.update(500); // 0.5秒

      expect(particle.rotation).toBeCloseTo(Math.PI / 2, 5); // 90度
    });

    it('不应该更新非活跃粒子', () => {
      particle.state = ParticleState.INACTIVE;
      const initialPosition = { ...particle.position };
      const initialLife = particle.life;

      particle.update(100);

      expect(particle.position).toEqual(initialPosition);
      expect(particle.life).toBe(initialLife);
    });
  });

  describe('生命周期管理', () => {
    it('应该正确计算生命进度', () => {
      expect(particle.getLifeProgress()).toBe(0);

      particle.update(250);
      expect(particle.getLifeProgress()).toBeCloseTo(0.25, 5);

      particle.update(500);
      expect(particle.getLifeProgress()).toBeCloseTo(0.75, 5);

      particle.update(250);
      expect(particle.getLifeProgress()).toBe(1);
    });

    it('应该正确计算剩余生命进度', () => {
      expect(particle.getRemainingLifeProgress()).toBe(1);

      particle.update(250);
      expect(particle.getRemainingLifeProgress()).toBeCloseTo(0.75, 5);
    });

    it('应该设置生命值', () => {
      particle.setLife(500);
      expect(particle.life).toBe(500);
      expect(particle.state).toBe(ParticleState.ACTIVE);

      particle.setLife(0);
      expect(particle.life).toBe(0);
      expect(particle.state).toBe(ParticleState.DEAD);
    });

    it('应该延长生命', () => {
      particle.setLife(0); // 死亡
      expect(particle.state).toBe(ParticleState.DEAD);

      particle.extendLife(500);
      expect(particle.life).toBe(500);
      expect(particle.state).toBe(ParticleState.ACTIVE);
    });

    it('应该正确检查生死状态', () => {
      expect(particle.isAlive()).toBe(true);
      expect(particle.isDead()).toBe(false);

      particle.setLife(0);
      expect(particle.isAlive()).toBe(false);
      expect(particle.isDead()).toBe(true);
    });
  });

  describe('重置', () => {
    it('应该重置到初始状态', () => {
      // 修改粒子状态
      particle.update(500);
      particle.position.x = 100;
      particle.size = 10;
      particle.alpha = 0.5;

      // 重置
      particle.reset();

      expect(particle.position).toEqual({ x: 0, y: 0 });
      expect(particle.velocity).toEqual({ x: 10, y: -10 });
      expect(particle.size).toBe(5);
      expect(particle.alpha).toBe(1);
      expect(particle.life).toBe(1000);
      expect(particle.state).toBe(ParticleState.ACTIVE);
    });
  });

  describe('力的应用', () => {
    it('应该应用力到加速度', () => {
      const initialAcceleration = { ...particle.acceleration };
      
      particle.applyForce({ x: 10, y: 20 });

      expect(particle.acceleration.x).toBeCloseTo(initialAcceleration.x + 10, 5);
      expect(particle.acceleration.y).toBeCloseTo(initialAcceleration.y + 20, 5);
    });

    it('应该考虑质量', () => {
      particle.mass = 2;
      particle.acceleration = { x: 0, y: 0 };

      particle.applyForce({ x: 10, y: 20 });

      expect(particle.acceleration.x).toBeCloseTo(5, 5); // 10 / 2
      expect(particle.acceleration.y).toBeCloseTo(10, 5); // 20 / 2
    });
  });

  describe('距离和向量计算', () => {
    it('应该计算到点的距离', () => {
      particle.position = { x: 0, y: 0 };
      
      const distance = particle.getDistanceTo({ x: 3, y: 4 });
      expect(distance).toBeCloseTo(5, 5); // 3-4-5直角三角形
    });

    it('应该计算到点的向量', () => {
      particle.position = { x: 1, y: 2 };
      
      const vector = particle.getVectorTo({ x: 4, y: 6 });
      expect(vector).toEqual({ x: 3, y: 4 });
    });

    it('应该获取速度大小', () => {
      particle.velocity = { x: 3, y: 4 };
      
      expect(particle.getSpeed()).toBeCloseTo(5, 5);
    });

    it('应该设置速度大小', () => {
      particle.velocity = { x: 3, y: 4 };
      particle.setSpeed(10);

      expect(particle.getSpeed()).toBeCloseTo(10, 5);
      // 方向应该保持不变
      expect(particle.velocity.x).toBeCloseTo(6, 5);
      expect(particle.velocity.y).toBeCloseTo(8, 5);
    });

    it('应该处理零速度的设速度', () => {
      particle.velocity = { x: 0, y: 0 };
      particle.setSpeed(10);

      // 零速度时方向不确定，速度应该保持为零
      expect(particle.getSpeed()).toBe(0);
    });

    it('应该获取速度角度', () => {
      particle.velocity = { x: 1, y: 1 };
      
      expect(particle.getVelocityAngle()).toBeCloseTo(Math.PI / 4, 5);
    });

    it('应该设置速度角度', () => {
      particle.velocity = { x: 5, y: 0 }; // 速度大小为5，方向为0度
      particle.setVelocityAngle(Math.PI / 2); // 设置为90度

      expect(particle.velocity.x).toBeCloseTo(0, 5);
      expect(particle.velocity.y).toBeCloseTo(5, 5);
      expect(particle.getSpeed()).toBeCloseTo(5, 5);
    });
  });

  describe('克隆', () => {
    it('应该创建完整副本', () => {
      // 修改原粒子
      particle.position = { x: 10, y: 20 };
      particle.userData = { test: 'value' };

      const cloned = particle.clone();

      expect(cloned.id).not.toBe(particle.id); // ID应该不同
      expect(cloned.position).toEqual(particle.position);
      expect(cloned.velocity).toEqual(particle.velocity);
      expect(cloned.size).toBe(particle.size);
      expect(cloned.userData).toEqual(particle.userData);

      // 修改克隆不应该影响原始
      cloned.position.x = 100;
      expect(particle.position.x).toBe(10);
    });
  });

  describe('配置更新', () => {
    it('应该更新初始配置', () => {
      particle.updateInitialConfig({
        size: 20,
        color: '#00ff00'
      });

      particle.reset();

      expect(particle.size).toBe(20);
      expect(particle.color).toBe('#00ff00');
    });
  });
});