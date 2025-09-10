/**
 * 粒子系统核心实现
 */

import { 
  IParticle, 
  IParticleSystem, 
  IParticleAffector,
  ParticleSystemConfig,
  ParticleSystemState,
  ParticleSystemEvents,
  AffectorConfig,
  Point2D
} from '../types/ParticleTypes';
import { ParticlePool } from './ParticlePool';
import { ParticleFactory } from './ParticleFactory';
import { EventEmitter } from '../core/EventEmitter';

// 导入影响器
import { GravityAffector } from './affectors/GravityAffector';
import { WindAffector } from './affectors/WindAffector';
import { AttractorAffector } from './affectors/AttractorAffector';
import { SizeAffector } from './affectors/SizeAffector';
import { AlphaAffector } from './affectors/AlphaAffector';

export class ParticleSystem extends EventEmitter<ParticleSystemEvents> implements IParticleSystem {
  readonly id: string;
  
  private _state: ParticleSystemState = ParticleSystemState.IDLE;
  private _particles: IParticle[] = [];
  private _affectors: IParticleAffector[] = [];
  private _config: ParticleSystemConfig;
  
  private pool: ParticlePool;
  private factory: ParticleFactory;
  
  private emissionTimer: number = 0;
  private systemTime: number = 0;
  private lastEmissionTime: number = 0;

  constructor(config: ParticleSystemConfig) {
    super();
    
    this.id = `particle_system_${Math.random().toString(36).substr(2, 9)}`;
    this._config = { ...config };
    
    // 初始化对象池
    const poolSize = Math.max(config.maxParticles || 1000, 100);
    this.pool = new ParticlePool(poolSize);
    
    // 初始化工厂
    this.factory = new ParticleFactory();
    
    // 预热（如果配置了）
    if (config.prewarm && config.prewarm > 0) {
      this.prewarmSystem(config.prewarm);
    }
    
    // 自动启动
    if (config.autoStart) {
      this.start();
    }
  }

  get state(): ParticleSystemState {
    return this._state;
  }

  get particles(): IParticle[] {
    return [...this._particles];
  }

  get activeParticles(): number {
    return this._particles.filter(p => p.isAlive()).length;
  }

  get config(): ParticleSystemConfig {
    return { ...this._config };
  }

  get affectors(): IParticleAffector[] {
    return [...this._affectors];
  }

  start(): this {
    if (this._state === ParticleSystemState.PLAYING) {
      return this;
    }

    this._state = ParticleSystemState.PLAYING;
    this.systemTime = 0;
    this.emissionTimer = 0;
    this.lastEmissionTime = 0;

    this.emit('start', this);
    return this;
  }

  stop(): this {
    this._state = ParticleSystemState.STOPPED;
    this.clear();
    this.emit('stop', this);
    return this;
  }

  pause(): this {
    if (this._state === ParticleSystemState.PLAYING) {
      this._state = ParticleSystemState.PAUSED;
      this.emit('pause', this);
    }
    return this;
  }

  resume(): this {
    if (this._state === ParticleSystemState.PAUSED) {
      this._state = ParticleSystemState.PLAYING;
      this.emit('resume', this);
    }
    return this;
  }

  restart(): this {
    this.stop();
    this.start();
    return this;
  }

  update(deltaTime: number): void {
    if (this._state !== ParticleSystemState.PLAYING) {
      return;
    }

    this.systemTime += deltaTime;

    // 检查是否应该完成
    if (this._config.duration && this.systemTime >= this._config.duration) {
      if (this._config.loop) {
        this.restart();
        return;
      } else {
        this._state = ParticleSystemState.COMPLETED;
        this.emit('complete', this);
        return;
      }
    }

    // 发射新粒子
    this.updateEmission(deltaTime);

    // 更新现有粒子
    this.updateParticles(deltaTime);

    // 应用影响器
    this.applyAffectors(deltaTime);

    // 清理死亡粒子
    this.cleanupDeadParticles();

    // 应用边界限制
    if (this._config.bounds) {
      this.applyBounds();
    }

    // 应用剔除
    if (this._config.culling && this._config.cullBounds) {
      this.applyCulling();
    }
  }

  emitParticles(count?: number): void {
    if (this._state !== ParticleSystemState.PLAYING) {
      return;
    }

    const emitCount = count || 1;
    
    for (let i = 0; i < emitCount; i++) {
      this.spawnParticle();
    }
  }

  burst(count: number): void {
    for (let i = 0; i < count; i++) {
      this.spawnParticle();
    }
  }

  addAffector(config: AffectorConfig): IParticleAffector {
    let affector: IParticleAffector;

    switch (config.type) {
      case 'gravity':
        affector = new GravityAffector(config);
        break;
      case 'wind':
        affector = new WindAffector(config);
        break;
      case 'attractor':
        affector = new AttractorAffector(config);
        break;
      case 'size':
        affector = new SizeAffector(config);
        break;
      case 'alpha':
        affector = new AlphaAffector(config);
        break;
      default:
        throw new Error(`Unknown affector type: ${(config as any).type}`);
    }

    this._affectors.push(affector);
    return affector;
  }

  removeAffector(affector: IParticleAffector): boolean {
    const index = this._affectors.indexOf(affector);
    if (index !== -1) {
      this._affectors.splice(index, 1);
      return true;
    }
    return false;
  }

  getAffector(type: string): IParticleAffector | undefined {
    return this._affectors.find(affector => affector.type === type);
  }

  updateConfig(config: Partial<ParticleSystemConfig>): void {
    this._config = { ...this._config, ...config };
  }

  clear(): void {
    // 将所有粒子返回池中
    this._particles.forEach(particle => {
      this.pool.release(particle);
    });
    
    this._particles.length = 0;
  }

  dispose(): void {
    this.clear();
    this.pool.dispose();
    this._affectors.length = 0;
    this.removeAllListeners();
  }

  private updateEmission(deltaTime: number): void {
    const emission = this._config.emission;
    
    // 处理延迟
    if (this._config.delay && this.systemTime < this._config.delay) {
      return;
    }

    // 处理爆发发射
    if (emission.burst && this.lastEmissionTime === 0) {
      this.burst(emission.burst);
      this.lastEmissionTime = this.systemTime;
      return;
    }

    // 处理连续发射
    if (emission.rate > 0) {
      this.emissionTimer += deltaTime;
      const interval = 1000 / emission.rate; // 发射间隔（毫秒）

      while (this.emissionTimer >= interval) {
        this.spawnParticle();
        this.emissionTimer -= interval;
      }
    }
  }

  private spawnParticle(): void {
    const maxParticles = this._config.maxParticles || 1000;
    
    if (this._particles.length >= maxParticles) {
      return;
    }

    const particle = this.pool.get();
    if (!particle) {
      return;
    }

    // 根据发射配置设置粒子
    this.initializeParticleFromEmission(particle);

    this._particles.push(particle);
    this.emit('particleSpawn', particle, this);
  }

  private initializeParticleFromEmission(particle: IParticle): void {
    const emission = this._config.emission;
    const factory = new ParticleFactory();
    
    // 创建临时粒子获取随机配置
    const tempParticle = factory.createFromEmission(emission);
    
    // 复制配置到目标粒子
    particle.position = { ...tempParticle.position };
    particle.velocity = { ...tempParticle.velocity };
    particle.acceleration = { ...tempParticle.acceleration };
    particle.size = tempParticle.size;
    particle.scale = { ...tempParticle.scale };
    particle.rotation = tempParticle.rotation;
    particle.angularVelocity = tempParticle.angularVelocity;
    particle.alpha = tempParticle.alpha;
    particle.color = tempParticle.color;
    particle.life = tempParticle.life;
    particle.maxLife = tempParticle.maxLife;
    particle.mass = tempParticle.mass;
    particle.userData = { ...tempParticle.userData };
  }

  private updateParticles(deltaTime: number): void {
    for (const particle of this._particles) {
      if (particle.isAlive()) {
        // 重置加速度（每帧重新计算）
        particle.acceleration.x = 0;
        particle.acceleration.y = 0;

        // 应用全局重力
        if (this._config.gravity) {
          particle.acceleration.x += this._config.gravity.x;
          particle.acceleration.y += this._config.gravity.y;
        }

        // 应用阻尼
        if (this._config.damping) {
          particle.velocity.x *= (1 - this._config.damping);
          particle.velocity.y *= (1 - this._config.damping);
        }

        particle.update(deltaTime);
      }
    }
  }

  private applyAffectors(deltaTime: number): void {
    for (const affector of this._affectors) {
      if (affector.enabled) {
        for (const particle of this._particles) {
          if (particle.isAlive()) {
            affector.affect(particle, deltaTime);
          }
        }
      }
    }
  }

  private cleanupDeadParticles(): void {
    for (let i = this._particles.length - 1; i >= 0; i--) {
      const particle = this._particles[i];
      
      if (particle.isDead()) {
        // 从活跃列表移除
        this._particles.splice(i, 1);
        
        // 触发死亡事件
        this.emit('particleDeath', particle, this);
        
        // 返回对象池
        this.pool.release(particle);
      }
    }
  }

  private applyBounds(): void {
    const bounds = this._config.bounds!;
    const bounce = bounds.bounce || 0;

    for (const particle of this._particles) {
      if (!particle.isAlive()) continue;

      // 检查边界碰撞
      if (particle.position.x < bounds.min.x) {
        particle.position.x = bounds.min.x;
        particle.velocity.x = Math.abs(particle.velocity.x) * bounce;
      } else if (particle.position.x > bounds.max.x) {
        particle.position.x = bounds.max.x;
        particle.velocity.x = -Math.abs(particle.velocity.x) * bounce;
      }

      if (particle.position.y < bounds.min.y) {
        particle.position.y = bounds.min.y;
        particle.velocity.y = Math.abs(particle.velocity.y) * bounce;
      } else if (particle.position.y > bounds.max.y) {
        particle.position.y = bounds.max.y;
        particle.velocity.y = -Math.abs(particle.velocity.y) * bounce;
      }
    }
  }

  private applyCulling(): void {
    const cullBounds = this._config.cullBounds!;

    for (const particle of this._particles) {
      if (!particle.isAlive()) continue;

      // 如果粒子超出剔除边界，标记为死亡
      if (particle.position.x < cullBounds.min.x || 
          particle.position.x > cullBounds.max.x ||
          particle.position.y < cullBounds.min.y || 
          particle.position.y > cullBounds.max.y) {
        particle.setLife(0);
      }
    }
  }

  private prewarmSystem(seconds: number): void {
    const deltaTime = 16; // 假设60fps
    const steps = Math.floor((seconds * 1000) / deltaTime);

    this.start();
    
    for (let i = 0; i < steps; i++) {
      this.update(deltaTime);
    }
  }

  /**
   * 获取系统统计信息
   */
  getStats(): {
    activeParticles: number;
    totalParticles: number;
    poolStats: any;
    systemTime: number;
    state: ParticleSystemState;
  } {
    return {
      activeParticles: this.activeParticles,
      totalParticles: this._particles.length,
      poolStats: this.pool.getStats(),
      systemTime: this.systemTime,
      state: this._state
    };
  }

  /**
   * 设置系统位置（移动所有粒子）
   */
  setPosition(position: Point2D): void {
    // 这里可以实现系统整体位置移动的逻辑
    // 简化实现：更新发射器位置
    if (this._config.emission.position) {
      const offset = {
        x: position.x - this._config.emission.position.min.x,
        y: position.y - this._config.emission.position.min.y
      };
      
      this._config.emission.position.min.x += offset.x;
      this._config.emission.position.max.x += offset.x;
      this._config.emission.position.min.y += offset.y;
      this._config.emission.position.max.y += offset.y;
    }
  }
}