/**
 * 粒子系统测试
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ParticleSystem } from '../particles/ParticleSystem';
import { ParticleSystemState } from '../types/ParticleTypes';

describe('ParticleSystem', () => {
  let system: ParticleSystem;

  beforeEach(() => {
    const config = {
      emission: {
        position: { min: { x: 0, y: 0 }, max: { x: 0, y: 0 } },
        velocity: { min: { x: -10, y: -10 }, max: { x: 10, y: 10 } },
        size: { min: 1, max: 5 },
        alpha: { min: 0.8, max: 1.0 },
        color: ['#ffffff'],
        life: { min: 500, max: 1000 },
        rate: 10
      },
      maxParticles: 100,
      autoStart: false
    };
    
    system = new ParticleSystem(config);
  });

  afterEach(() => {
    system.dispose();
  });

  describe('构造函数', () => {
    it('应该正确初始化系统', () => {
      expect(system.id).toMatch(/^particle_system_/);
      expect(system.state).toBe(ParticleSystemState.IDLE);
      expect(system.particles).toEqual([]);
      expect(system.activeParticles).toBe(0);
      expect(system.affectors).toEqual([]);
    });

    it('应该支持自动启动', () => {
      const autoStartConfig = {
        emission: {
          position: { min: { x: 0, y: 0 }, max: { x: 0, y: 0 } },
          velocity: { min: { x: 0, y: 0 }, max: { x: 0, y: 0 } },
          size: { min: 1, max: 1 },
          life: { min: 1000, max: 1000 },
          rate: 1
        },
        autoStart: true
      };

      const autoSystem = new ParticleSystem(autoStartConfig);
      expect(autoSystem.state).toBe(ParticleSystemState.PLAYING);
      autoSystem.dispose();
    });
  });

  describe('生命周期管理', () => {
    it('应该启动系统', () => {
      system.start();
      expect(system.state).toBe(ParticleSystemState.PLAYING);
    });

    it('应该停止系统', () => {
      system.start();
      system.stop();
      expect(system.state).toBe(ParticleSystemState.STOPPED);
      expect(system.particles.length).toBe(0);
    });

    it('应该暂停和恢复系统', () => {
      system.start();
      system.pause();
      expect(system.state).toBe(ParticleSystemState.PAUSED);

      system.resume();
      expect(system.state).toBe(ParticleSystemState.PLAYING);
    });

    it('应该重启系统', () => {
      system.start();
      system.emitParticles(10); // 发射一些粒子
      
      system.restart();
      expect(system.state).toBe(ParticleSystemState.PLAYING);
    });

    it('不应该重复启动已启动的系统', () => {
      system.start();
      const result = system.start();
      expect(result).toBe(system); // 应该返回自身
      expect(system.state).toBe(ParticleSystemState.PLAYING);
    });
  });

  describe('粒子发射', () => {
    beforeEach(() => {
      system.start();
    });

    it('应该手动发射粒子', () => {
      system.emitParticles(5);
      expect(system.particles.length).toBe(5);
      expect(system.activeParticles).toBe(5);
    });

    it('应该爆发发射粒子', () => {
      system.burst(20);
      expect(system.particles.length).toBe(20);
    });

    it('应该限制最大粒子数量', () => {
      system.burst(150); // 超过maxParticles (100)
      expect(system.particles.length).toBe(100);
    });

    it('不应该在停止状态发射粒子', () => {
      system.stop();
      system.emitParticles(5);
      expect(system.particles.length).toBe(0);
    });

    it('应该根据发射速率自动发射', () => {
      // 模拟1秒的更新（10个粒子/秒）
      system.update(100);
      system.update(100);
      system.update(100);
      system.update(100);
      system.update(100);
      system.update(100);
      system.update(100);
      system.update(100);
      system.update(100);
      system.update(100);

      expect(system.particles.length).toBeGreaterThan(0);
      expect(system.particles.length).toBeLessThanOrEqual(15); // 允许一些误差
    });
  });

  describe('粒子更新', () => {
    beforeEach(() => {
      system.start();
      system.emitParticles(10);
    });

    it('应该更新粒子位置', () => {
      const initialPositions = system.particles.map(p => ({ ...p.position }));
      
      system.update(100);
      
      // 至少一些粒子应该移动了
      const moved = system.particles.some((p, i) => 
        p.position.x !== initialPositions[i].x || p.position.y !== initialPositions[i].y
      );
      expect(moved).toBe(true);
    });

    it('应该清理死亡粒子', () => {
      // 让所有粒子立即死亡
      system.particles.forEach(p => p.life = 0);
      
      system.update(16);
      
      expect(system.activeParticles).toBe(0);
      expect(system.particles.length).toBe(0);
    });

    it('不应该在暂停状态更新', () => {
      system.pause();
      const initialCount = system.particles.length;
      
      system.update(100);
      
      expect(system.particles.length).toBe(initialCount);
    });
  });

  describe('影响器管理', () => {
    it('应该添加重力影响器', () => {
      const affector = system.addAffector({
        type: 'gravity',
        force: { x: 0, y: 100 }
      });

      expect(affector.type).toBe('gravity');
      expect(system.affectors.length).toBe(1);
    });

    it('应该添加风力影响器', () => {
      const affector = system.addAffector({
        type: 'wind',
        force: { x: 50, y: 0 },
        turbulence: 10
      });

      expect(affector.type).toBe('wind');
    });

    it('应该添加吸引器', () => {
      const affector = system.addAffector({
        type: 'attractor',
        position: { x: 100, y: 100 },
        strength: 50
      });

      expect(affector.type).toBe('attractor');
    });

    it('应该添加大小影响器', () => {
      const affector = system.addAffector({
        type: 'size',
        curve: [
          { time: 0, value: 0 },
          { time: 1, value: 1 }
        ]
      });

      expect(affector.type).toBe('size');
    });

    it('应该添加透明度影响器', () => {
      const affector = system.addAffector({
        type: 'alpha',
        curve: [
          { time: 0, value: 1 },
          { time: 1, value: 0 }
        ]
      });

      expect(affector.type).toBe('alpha');
    });

    it('应该移除影响器', () => {
      const affector = system.addAffector({
        type: 'gravity',
        force: { x: 0, y: 100 }
      });

      const removed = system.removeAffector(affector);
      expect(removed).toBe(true);
      expect(system.affectors.length).toBe(0);
    });

    it('应该根据类型获取影响器', () => {
      system.addAffector({
        type: 'gravity',
        force: { x: 0, y: 100 }
      });

      const affector = system.getAffector('gravity');
      expect(affector?.type).toBe('gravity');
    });

    it('应该抛出未知影响器类型错误', () => {
      expect(() => {
        system.addAffector({
          type: 'unknown'
        } as any);
      }).toThrow('Unknown affector type: unknown');
    });
  });

  describe('边界和限制', () => {
    it('应该应用边界约束', () => {
      const boundsConfig = {
        emission: {
          position: { min: { x: 0, y: 0 }, max: { x: 0, y: 0 } },
          velocity: { min: { x: 100, y: 100 }, max: { x: 100, y: 100 } },
          size: { min: 1, max: 1 },
          life: { min: 10000, max: 10000 }, // 10秒生命，足够长
          rate: 0
        },
        bounds: {
          min: { x: -50, y: -50 },
          max: { x: 50, y: 50 },
          bounce: 0.8
        }
      };

      const boundsSystem = new ParticleSystem(boundsConfig);
      boundsSystem.start();
      boundsSystem.emitParticles(1);

      // 更新让粒子移动到边界外
      for (let i = 0; i < 10; i++) {
        boundsSystem.update(100);
      }

      expect(boundsSystem.particles.length).toBeGreaterThan(0);
      const particle = boundsSystem.particles[0];
      expect(particle.position.x).toBeGreaterThanOrEqual(-50);
      expect(particle.position.x).toBeLessThanOrEqual(50);
      expect(particle.position.y).toBeGreaterThanOrEqual(-50);
      expect(particle.position.y).toBeLessThanOrEqual(50);

      boundsSystem.dispose();
    });

    it('应该应用剔除边界', () => {
      const cullConfig = {
        emission: {
          position: { min: { x: 0, y: 0 }, max: { x: 0, y: 0 } },
          velocity: { min: { x: 100, y: 0 }, max: { x: 100, y: 0 } },
          size: { min: 1, max: 1 },
          life: { min: 5000, max: 5000 },
          rate: 0
        },
        culling: true,
        cullBounds: {
          min: { x: -10, y: -10 },
          max: { x: 10, y: 10 }
        }
      };

      const cullSystem = new ParticleSystem(cullConfig);
      cullSystem.start();
      cullSystem.emitParticles(1);

      // 更新让粒子移动到剔除边界外
      for (let i = 0; i < 10; i++) {
        cullSystem.update(50);
      }

      expect(cullSystem.activeParticles).toBe(0);
      cullSystem.dispose();
    });
  });

  describe('系统配置', () => {
    it('应该更新配置', () => {
      system.updateConfig({
        maxParticles: 200,
        gravity: { x: 0, y: 50 }
      });

      expect(system.config.maxParticles).toBe(200);
      expect(system.config.gravity).toEqual({ x: 0, y: 50 });
    });

    it('应该处理循环配置', () => {
      const loopConfig = {
        emission: {
          position: { min: { x: 0, y: 0 }, max: { x: 0, y: 0 } },
          velocity: { min: { x: 0, y: 0 }, max: { x: 0, y: 0 } },
          size: { min: 1, max: 1 },
          life: { min: 100, max: 100 },
          rate: 10
        },
        duration: 100,
        loop: true
      };

      const loopSystem = new ParticleSystem(loopConfig);
      loopSystem.start();
      
      // 模拟超过持续时间的更新
      loopSystem.update(150);
      
      expect(loopSystem.state).toBe(ParticleSystemState.PLAYING);
      loopSystem.dispose();
    });

    it('应该处理持续时间完成', () => {
      const timedConfig = {
        emission: {
          position: { min: { x: 0, y: 0 }, max: { x: 0, y: 0 } },
          velocity: { min: { x: 0, y: 0 }, max: { x: 0, y: 0 } },
          size: { min: 1, max: 1 },
          life: { min: 100, max: 100 },
          rate: 10
        },
        duration: 100,
        loop: false
      };

      const timedSystem = new ParticleSystem(timedConfig);
      timedSystem.start();
      
      timedSystem.update(150);
      
      expect(timedSystem.state).toBe(ParticleSystemState.COMPLETED);
      timedSystem.dispose();
    });
  });

  describe('事件', () => {
    it('应该触发启动事件', () => {
      const startCallback = vi.fn();
      system.on('start', startCallback);

      system.start();

      expect(startCallback).toHaveBeenCalledWith(system);
    });

    it('应该触发停止事件', () => {
      const stopCallback = vi.fn();
      system.on('stop', stopCallback);

      system.start();
      system.stop();

      expect(stopCallback).toHaveBeenCalledWith(system);
    });

    it('应该触发粒子生成事件', () => {
      const spawnCallback = vi.fn();
      system.on('particleSpawn', spawnCallback);

      system.start();
      system.emitParticles(1);

      expect(spawnCallback).toHaveBeenCalledTimes(1);
      expect(spawnCallback).toHaveBeenCalledWith(expect.any(Object), system);
    });

    it('应该触发粒子死亡事件', () => {
      const deathCallback = vi.fn();
      system.on('particleDeath', deathCallback);

      system.start();
      system.emitParticles(1);

      // 让粒子死亡
      system.particles[0].life = 0;
      system.update(16);

      expect(deathCallback).toHaveBeenCalledTimes(1);
    });

    it('应该触发完成事件', () => {
      const completeCallback = vi.fn();
      
      const timedConfig = {
        emission: {
          position: { min: { x: 0, y: 0 }, max: { x: 0, y: 0 } },
          velocity: { min: { x: 0, y: 0 }, max: { x: 0, y: 0 } },
          size: { min: 1, max: 1 },
          life: { min: 100, max: 100 },
          rate: 1
        },
        duration: 50
      };

      const timedSystem = new ParticleSystem(timedConfig);
      timedSystem.on('complete', completeCallback);
      timedSystem.start();
      
      timedSystem.update(60);

      expect(completeCallback).toHaveBeenCalledWith(timedSystem);
      timedSystem.dispose();
    });
  });

  describe('统计信息', () => {
    it('应该提供统计信息', () => {
      system.start();
      system.emitParticles(5);

      const stats = system.getStats();

      expect(stats.activeParticles).toBe(5);
      expect(stats.totalParticles).toBe(5);
      expect(stats.state).toBe(ParticleSystemState.PLAYING);
      expect(stats.systemTime).toBeGreaterThanOrEqual(0);
      expect(stats.poolStats).toBeDefined();
    });
  });

  describe('清理', () => {
    it('应该清理所有粒子', () => {
      system.start();
      system.emitParticles(10);

      system.clear();

      expect(system.particles.length).toBe(0);
      expect(system.activeParticles).toBe(0);
    });

    it('应该完全销毁系统', () => {
      system.start();
      system.emitParticles(10);

      system.dispose();

      expect(system.particles.length).toBe(0);
      expect(system.affectors.length).toBe(0);
    });
  });
});