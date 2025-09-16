/**
 * 粒子发射器
 * 管理粒子的生成、生命周期和发射模式
 */

import { GPUParticleSystem, ParticleData } from './GPUParticleSystem';
import EventEmitter3 from 'eventemitter3';

export interface EmitterConfig {
  // 发射设置
  emissionRate: number; // 每秒发射的粒子数
  burstCount: number; // 爆发模式粒子数
  maxParticles: number; // 最大粒子数
  
  // 位置设置
  position: { x: number; y: number; z: number };
  positionVariance: { x: number; y: number; z: number };
  
  // 速度设置
  velocity: { x: number; y: number; z: number };
  velocityVariance: { x: number; y: number; z: number };
  
  // 加速度设置（重力等）
  acceleration: { x: number; y: number; z: number };
  accelerationVariance: { x: number; y: number; z: number };
  
  // 生命周期设置
  lifeSpan: number;
  lifeSpanVariance: number;
  
  // 外观设置
  startSize: number;
  endSize: number;
  sizeVariance: number;
  
  startColor: { r: number; g: number; b: number; a: number };
  endColor: { r: number; g: number; b: number; a: number };
  colorVariance: { r: number; g: number; b: number; a: number };
  
  // 旋转设置
  startRotation: number;
  endRotation: number;
  rotationVariance: number;
  
  // 发射模式
  emissionMode: 'continuous' | 'burst' | 'oneshot';
  
  // 形状设置
  emissionShape: 'point' | 'line' | 'circle' | 'rectangle' | 'cone';
  shapeParams: any; // 根据形状类型的参数
}

export interface EmitterEvents {
  'emission-started': { emitterId: string };
  'emission-stopped': { emitterId: string };
  'particles-emitted': { emitterId: string; count: number };
  'emitter-completed': { emitterId: string };
  'max-particles-reached': { emitterId: string; maxCount: number };
}

/**
 * 粒子发射器实现
 */
export class ParticleEmitter {
  private id: string;
  private particleSystem: GPUParticleSystem;
  private config: EmitterConfig;
  private eventBus?: EventEmitter3;
  
  // 状态管理
  private isActive = false;
  private isPaused = false;
  private lastEmissionTime = 0;
  private totalEmittedParticles = 0;
  private burstEmitted = false;
  
  // 时间管理
  private accumulatedTime = 0;
  private emissionTimer = 0;

  constructor(
    id: string,
    particleSystem: GPUParticleSystem,
    config: Partial<EmitterConfig> = {}
  ) {
    this.id = id;
    this.particleSystem = particleSystem;
    this.config = this.mergeWithDefaults(config);
    
    this.reset();
  }

  private mergeWithDefaults(config: Partial<EmitterConfig>): EmitterConfig {
    return {
      // 发射设置
      emissionRate: config.emissionRate || 30,
      burstCount: config.burstCount || 50,
      maxParticles: config.maxParticles || 1000,
      
      // 位置设置
      position: config.position || { x: 0, y: 0, z: 0 },
      positionVariance: config.positionVariance || { x: 10, y: 10, z: 0 },
      
      // 速度设置
      velocity: config.velocity || { x: 0, y: -50, z: 0 },
      velocityVariance: config.velocityVariance || { x: 20, y: 20, z: 0 },
      
      // 加速度设置
      acceleration: config.acceleration || { x: 0, y: 98, z: 0 },
      accelerationVariance: config.accelerationVariance || { x: 5, y: 5, z: 0 },
      
      // 生命周期设置
      lifeSpan: config.lifeSpan || 2.0,
      lifeSpanVariance: config.lifeSpanVariance || 0.5,
      
      // 外观设置
      startSize: config.startSize || 15,
      endSize: config.endSize || 5,
      sizeVariance: config.sizeVariance || 3,
      
      startColor: config.startColor || { r: 1, g: 1, b: 1, a: 1 },
      endColor: config.endColor || { r: 1, g: 1, b: 1, a: 0 },
      colorVariance: config.colorVariance || { r: 0.1, g: 0.1, b: 0.1, a: 0.1 },
      
      // 旋转设置
      startRotation: config.startRotation || 0,
      endRotation: config.endRotation || 0,
      rotationVariance: config.rotationVariance || Math.PI / 4,
      
      // 发射模式
      emissionMode: config.emissionMode || 'continuous',
      
      // 形状设置
      emissionShape: config.emissionShape || 'point',
      shapeParams: config.shapeParams || {}
    };
  }

  /**
   * 设置事件总线
   */
  setEventBus(eventBus: EventEmitter3): void {
    this.eventBus = eventBus;
  }

  /**
   * 开始发射
   */
  start(): void {
    if (this.isActive && !this.isPaused) return;
    
    this.isActive = true;
    this.isPaused = false;
    this.lastEmissionTime = Date.now();
    
    this.eventBus?.emit('emission-started', { emitterId: this.id });
  }

  /**
   * 停止发射
   */
  stop(): void {
    if (!this.isActive) return;
    
    this.isActive = false;
    this.isPaused = false;
    
    this.eventBus?.emit('emission-stopped', { emitterId: this.id });
  }

  /**
   * 暂停发射
   */
  pause(): void {
    this.isPaused = true;
  }

  /**
   * 恢复发射
   */
  resume(): void {
    if (!this.isActive) return;
    
    this.isPaused = false;
    this.lastEmissionTime = Date.now();
  }

  /**
   * 重置发射器
   */
  reset(): void {
    this.totalEmittedParticles = 0;
    this.burstEmitted = false;
    this.accumulatedTime = 0;
    this.emissionTimer = 0;
  }

  /**
   * 更新发射器
   */
  update(deltaTime: number): void {
    if (!this.isActive || this.isPaused) return;

    this.accumulatedTime += deltaTime;

    switch (this.config.emissionMode) {
      case 'continuous':
        this.updateContinuousEmission(deltaTime);
        break;
      case 'burst':
        this.updateBurstEmission(deltaTime);
        break;
      case 'oneshot':
        this.updateOneShotEmission();
        break;
    }
  }

  private updateContinuousEmission(deltaTime: number): void {
    if (this.totalEmittedParticles >= this.config.maxParticles) {
      this.eventBus?.emit('max-particles-reached', { 
        emitterId: this.id, 
        maxCount: this.config.maxParticles 
      });
      return;
    }

    this.emissionTimer += deltaTime;
    const emissionInterval = 1.0 / this.config.emissionRate;
    
    while (this.emissionTimer >= emissionInterval && this.totalEmittedParticles < this.config.maxParticles) {
      this.emitParticle();
      this.emissionTimer -= emissionInterval;
    }
  }

  private updateBurstEmission(deltaTime: number): void {
    if (this.burstEmitted) return;

    const particlesToEmit = Math.min(
      this.config.burstCount,
      this.config.maxParticles - this.totalEmittedParticles
    );

    if (particlesToEmit > 0) {
      this.emitBurst(particlesToEmit);
    }

    this.burstEmitted = true;
    
    // 检查是否完成
    if (this.particleSystem.getAliveParticleCount() === 0) {
      this.eventBus?.emit('emitter-completed', { emitterId: this.id });
    }
  }

  private updateOneShotEmission(): void {
    if (!this.burstEmitted) {
      const particlesToEmit = Math.min(
        this.config.burstCount,
        this.config.maxParticles - this.totalEmittedParticles
      );

      if (particlesToEmit > 0) {
        this.emitBurst(particlesToEmit);
      }

      this.burstEmitted = true;
      this.stop();
      
      this.eventBus?.emit('emitter-completed', { emitterId: this.id });
    }
  }

  /**
   * 发射单个粒子
   */
  private emitParticle(): boolean {
    const particleData = this.generateParticleData();
    const success = this.particleSystem.spawnParticles(1, [particleData]);
    
    if (success) {
      this.totalEmittedParticles++;
      this.eventBus?.emit('particles-emitted', { emitterId: this.id, count: 1 });
    }

    return success;
  }

  /**
   * 发射一组粒子（爆发模式）
   */
  private emitBurst(count: number): boolean {
    const particlesData = [];
    for (let i = 0; i < count; i++) {
      particlesData.push(this.generateParticleData());
    }

    const success = this.particleSystem.spawnParticles(count, particlesData);
    
    if (success) {
      this.totalEmittedParticles += count;
      this.eventBus?.emit('particles-emitted', { emitterId: this.id, count });
    }

    return success;
  }

  /**
   * 生成粒子数据
   */
  private generateParticleData(): Partial<ParticleData> {
    const config = this.config;
    
    // 生成位置
    const position = this.generatePosition();
    
    // 生成速度
    const velocity = {
      x: config.velocity.x + this.randomVariance(config.velocityVariance.x),
      y: config.velocity.y + this.randomVariance(config.velocityVariance.y),
      z: config.velocity.z + this.randomVariance(config.velocityVariance.z)
    };

    // 生成加速度
    const acceleration = {
      x: config.acceleration.x + this.randomVariance(config.accelerationVariance.x),
      y: config.acceleration.y + this.randomVariance(config.accelerationVariance.y),
      z: config.acceleration.z + this.randomVariance(config.accelerationVariance.z)
    };

    // 生成生命周期
    const life = Math.max(0.1, config.lifeSpan + this.randomVariance(config.lifeSpanVariance));

    // 生成大小
    const size = Math.max(1, config.startSize + this.randomVariance(config.sizeVariance));

    // 生成颜色
    const color = {
      r: Math.max(0, Math.min(1, config.startColor.r + this.randomVariance(config.colorVariance.r))),
      g: Math.max(0, Math.min(1, config.startColor.g + this.randomVariance(config.colorVariance.g))),
      b: Math.max(0, Math.min(1, config.startColor.b + this.randomVariance(config.colorVariance.b))),
      a: Math.max(0, Math.min(1, config.startColor.a + this.randomVariance(config.colorVariance.a)))
    };

    // 生成旋转
    const rotation = config.startRotation + this.randomVariance(config.rotationVariance);
    const angularVelocity = (config.endRotation - config.startRotation) / life;

    return {
      position,
      velocity,
      acceleration,
      life,
      maxLife: life,
      size,
      color,
      rotation,
      angularVelocity
    };
  }

  /**
   * 根据发射形状生成位置
   */
  private generatePosition(): { x: number; y: number; z: number } {
    const basePosition = this.config.position;
    const variance = this.config.positionVariance;
    
    let position = {
      x: basePosition.x + this.randomVariance(variance.x),
      y: basePosition.y + this.randomVariance(variance.y),
      z: basePosition.z + this.randomVariance(variance.z)
    };

    // 根据发射形状调整位置
    switch (this.config.emissionShape) {
      case 'line':
        position = this.generateLinePosition(position);
        break;
      case 'circle':
        position = this.generateCirclePosition(position);
        break;
      case 'rectangle':
        position = this.generateRectanglePosition(position);
        break;
      case 'cone':
        position = this.generateConePosition(position);
        break;
      case 'point':
      default:
        // 已经应用了variance，保持原样
        break;
    }

    return position;
  }

  private generateLinePosition(basePosition: { x: number; y: number; z: number }): { x: number; y: number; z: number } {
    const params = this.config.shapeParams;
    const length = params.length || 100;
    const direction = params.direction || { x: 1, y: 0, z: 0 };
    
    const t = Math.random() - 0.5; // -0.5 to 0.5
    
    return {
      x: basePosition.x + direction.x * length * t,
      y: basePosition.y + direction.y * length * t,
      z: basePosition.z + direction.z * length * t
    };
  }

  private generateCirclePosition(basePosition: { x: number; y: number; z: number }): { x: number; y: number; z: number } {
    const params = this.config.shapeParams;
    const radius = params.radius || 50;
    const angle = Math.random() * Math.PI * 2;
    
    return {
      x: basePosition.x + Math.cos(angle) * radius,
      y: basePosition.y + Math.sin(angle) * radius,
      z: basePosition.z
    };
  }

  private generateRectanglePosition(basePosition: { x: number; y: number; z: number }): { x: number; y: number; z: number } {
    const params = this.config.shapeParams;
    const width = params.width || 100;
    const height = params.height || 100;
    
    return {
      x: basePosition.x + (Math.random() - 0.5) * width,
      y: basePosition.y + (Math.random() - 0.5) * height,
      z: basePosition.z
    };
  }

  private generateConePosition(basePosition: { x: number; y: number; z: number }): { x: number; y: number; z: number } {
    const params = this.config.shapeParams;
    const angle = params.angle || Math.PI / 6; // 30 degrees
    const radius = params.radius || 50;
    
    const randomAngle = (Math.random() - 0.5) * angle;
    const randomRadius = Math.random() * radius;
    
    return {
      x: basePosition.x + Math.cos(randomAngle) * randomRadius,
      y: basePosition.y + Math.sin(randomAngle) * randomRadius,
      z: basePosition.z
    };
  }

  /**
   * 生成随机变化值
   */
  private randomVariance(variance: number): number {
    return (Math.random() - 0.5) * variance;
  }

  /**
   * 立即发射粒子（手动触发）
   */
  emit(count: number = 1): boolean {
    if (this.totalEmittedParticles + count > this.config.maxParticles) {
      this.eventBus?.emit('max-particles-reached', { 
        emitterId: this.id, 
        maxCount: this.config.maxParticles 
      });
      return false;
    }

    return this.emitBurst(count);
  }

  /**
   * 更新发射器配置
   */
  updateConfig(newConfig: Partial<EmitterConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  /**
   * 获取发射器ID
   */
  getId(): string {
    return this.id;
  }

  /**
   * 获取发射器配置
   */
  getConfig(): EmitterConfig {
    return { ...this.config };
  }

  /**
   * 获取发射器状态
   */
  getState(): {
    isActive: boolean;
    isPaused: boolean;
    totalEmittedParticles: number;
    accumulatedTime: number;
  } {
    return {
      isActive: this.isActive,
      isPaused: this.isPaused,
      totalEmittedParticles: this.totalEmittedParticles,
      accumulatedTime: this.accumulatedTime
    };
  }

  /**
   * 检查是否正在发射
   */
  isEmitting(): boolean {
    return this.isActive && !this.isPaused;
  }

  /**
   * 检查是否已完成（对于burst和oneshot模式）
   */
  isCompleted(): boolean {
    if (this.config.emissionMode === 'continuous') {
      return false;
    }
    
    return this.burstEmitted && this.particleSystem.getAliveParticleCount() === 0;
  }

  /**
   * 销毁发射器
   */
  dispose(): void {
    this.stop();
    this.reset();
  }
}