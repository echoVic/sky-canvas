/**
 * 粒子系统管理器
 * 管理多个粒子系统的生命周期和更新
 */

import { 
  IParticleSystem, 
  ParticleSystemConfig, 
  ParticleSystemState 
} from '../types/ParticleTypes';
import { ParticleSystem } from './ParticleSystem';
import { EventEmitter } from '../core/EventEmitter';

interface ParticleSystemManagerEvents {
  systemAdded: (system: IParticleSystem) => void;
  systemRemoved: (system: IParticleSystem) => void;
  systemCompleted: (system: IParticleSystem) => void;
  allSystemsCompleted: () => void;
  [key: string]: (...args: any[]) => void;
}

export class ParticleSystemManager extends EventEmitter<ParticleSystemManagerEvents> {
  private systems: Map<string, IParticleSystem> = new Map();
  private updateEnabled: boolean = true;

  /**
   * 创建并添加粒子系统
   */
  createSystem(config: ParticleSystemConfig): IParticleSystem {
    const system = new ParticleSystem(config);
    this.addSystem(system);
    return system;
  }

  /**
   * 添加粒子系统
   */
  addSystem(system: IParticleSystem): this {
    if (this.systems.has(system.id)) {
      console.warn(`Particle system with id '${system.id}' already exists`);
      return this;
    }

    this.systems.set(system.id, system);

    // 监听系统完成事件
    system.on('complete', (completedSystem) => {
      this.emit('systemCompleted', completedSystem);
      this.checkAllSystemsCompleted();
    });

    this.emit('systemAdded', system);
    return this;
  }

  /**
   * 移除粒子系统
   */
  removeSystem(systemId: string): boolean {
    const system = this.systems.get(systemId);
    if (!system) {
      return false;
    }

    // 停止并清理系统
    system.stop();
    system.dispose();

    this.systems.delete(systemId);
    this.emit('systemRemoved', system);

    return true;
  }

  /**
   * 获取粒子系统
   */
  getSystem(systemId: string): IParticleSystem | undefined {
    return this.systems.get(systemId);
  }

  /**
   * 获取所有系统
   */
  getAllSystems(): IParticleSystem[] {
    return Array.from(this.systems.values());
  }

  /**
   * 获取活跃系统
   */
  getActiveSystems(): IParticleSystem[] {
    return this.getAllSystems().filter(system => 
      system.state === ParticleSystemState.PLAYING
    );
  }

  /**
   * 更新所有系统
   */
  update(deltaTime: number): void {
    if (!this.updateEnabled) {
      return;
    }

    for (const system of this.systems.values()) {
      system.update(deltaTime);
    }

    // 自动清理已完成的系统（可选）
    this.autoCleanupCompleted();
  }

  /**
   * 启动所有系统
   */
  startAll(): this {
    for (const system of this.systems.values()) {
      system.start();
    }
    return this;
  }

  /**
   * 停止所有系统
   */
  stopAll(): this {
    for (const system of this.systems.values()) {
      system.stop();
    }
    return this;
  }

  /**
   * 暂停所有系统
   */
  pauseAll(): this {
    for (const system of this.systems.values()) {
      system.pause();
    }
    return this;
  }

  /**
   * 恢复所有系统
   */
  resumeAll(): this {
    for (const system of this.systems.values()) {
      system.resume();
    }
    return this;
  }

  /**
   * 重启所有系统
   */
  restartAll(): this {
    for (const system of this.systems.values()) {
      system.restart();
    }
    return this;
  }

  /**
   * 清理所有系统
   */
  clear(): this {
    const systemIds = Array.from(this.systems.keys());
    for (const systemId of systemIds) {
      this.removeSystem(systemId);
    }
    return this;
  }

  /**
   * 启用/禁用更新
   */
  setUpdateEnabled(enabled: boolean): this {
    this.updateEnabled = enabled;
    return this;
  }

  /**
   * 获取更新状态
   */
  isUpdateEnabled(): boolean {
    return this.updateEnabled;
  }

  /**
   * 获取管理器统计信息
   */
  getStats(): {
    totalSystems: number;
    activeSystems: number;
    pausedSystems: number;
    completedSystems: number;
    totalParticles: number;
    activeParticles: number;
  } {
    const systems = this.getAllSystems();
    
    let activeSystems = 0;
    let pausedSystems = 0;
    let completedSystems = 0;
    let totalParticles = 0;
    let activeParticles = 0;

    for (const system of systems) {
      switch (system.state) {
        case ParticleSystemState.PLAYING:
          activeSystems++;
          break;
        case ParticleSystemState.PAUSED:
          pausedSystems++;
          break;
        case ParticleSystemState.COMPLETED:
          completedSystems++;
          break;
      }

      totalParticles += system.particles.length;
      activeParticles += system.activeParticles;
    }

    return {
      totalSystems: systems.length,
      activeSystems,
      pausedSystems,
      completedSystems,
      totalParticles,
      activeParticles
    };
  }

  /**
   * 根据标签查找系统
   */
  findSystemsByTag(tag: string): IParticleSystem[] {
    return this.getAllSystems().filter(system => {
      const userData = system.config.emission.userData;
      return userData && userData.tags && userData.tags.includes(tag);
    });
  }

  /**
   * 创建预设效果
   */
  createFireEffect(position: { x: number; y: number }): IParticleSystem {
    const config: ParticleSystemConfig = {
      emission: {
        position: { min: position, max: position },
        velocity: { min: { x: -50, y: -200 }, max: { x: 50, y: -100 } },
        acceleration: { min: { x: 0, y: 50 }, max: { x: 0, y: 100 } },
        size: { min: 2, max: 8 },
        alpha: { min: 0.8, max: 1.0 },
        color: ['#ff4500', '#ff6347', '#ffa500', '#ffff00'],
        life: { min: 500, max: 2000 },
        rate: 50,
        userData: { tags: ['fire', 'effect'] }
      },
      maxParticles: 200,
      autoStart: true,
      gravity: { x: 0, y: 100 }
    };

    return this.createSystem(config);
  }

  createExplosionEffect(position: { x: number; y: number }): IParticleSystem {
    const config: ParticleSystemConfig = {
      emission: {
        position: { min: position, max: position },
        velocity: { min: { x: -300, y: -300 }, max: { x: 300, y: 300 } },
        acceleration: { min: { x: 0, y: 200 }, max: { x: 0, y: 400 } },
        size: { min: 3, max: 12 },
        alpha: { min: 0.8, max: 1.0 },
        color: ['#ff0000', '#ff4500', '#ffa500', '#ffff00'],
        life: { min: 200, max: 800 },
        rate: 0,
        burst: 150,
        userData: { tags: ['explosion', 'effect'] }
      },
      maxParticles: 150,
      autoStart: true,
      duration: 1000,
      gravity: { x: 0, y: 300 }
    };

    return this.createSystem(config);
  }

  private checkAllSystemsCompleted(): void {
    const allCompleted = this.getAllSystems().every(system => 
      system.state === ParticleSystemState.COMPLETED || 
      system.state === ParticleSystemState.STOPPED
    );

    if (allCompleted && this.systems.size > 0) {
      this.emit('allSystemsCompleted');
    }
  }

  private autoCleanupCompleted(): void {
    const completedSystems = this.getAllSystems().filter(system => 
      system.state === ParticleSystemState.COMPLETED &&
      system.activeParticles === 0
    );

    for (const system of completedSystems) {
      // 如果系统有清理标记，自动移除
      const userData = system.config.emission.userData;
      if (userData && userData.autoCleanup) {
        this.removeSystem(system.id);
      }
    }
  }

  /**
   * 销毁管理器
   */
  dispose(): void {
    this.clear();
    this.removeAllListeners();
  }
}