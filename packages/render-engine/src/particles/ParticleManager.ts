/**
 * 粒子系统管理器
 * 统一管理多个粒子系统和发射器
 */

import type { IEventBus } from '../events/EventBus'
import { GPUParticleSystem, type ParticleConfig } from './GPUParticleSystem'
import { type EmitterConfig, ParticleEmitter } from './ParticleEmitter'

export interface ParticleManagerEvents {
  'system-created': { systemId: string }
  'system-removed': { systemId: string }
  'emitter-created': { emitterId: string; systemId: string }
  'emitter-removed': { emitterId: string; systemId: string }
  'all-systems-updated': { systemCount: number; totalParticles: number }
}

/**
 * 粒子系统管理器
 */
export class ParticleManager {
  private systems: Map<string, GPUParticleSystem> = new Map()
  private emitters: Map<string, { emitter: ParticleEmitter; systemId: string }> = new Map()
  private eventBus?: IEventBus

  // 全局设置
  private isRunning = false
  private lastUpdateTime = 0

  constructor() {}

  /**
   * 设置事件总线
   */
  setEventBus(eventBus: IEventBus): void {
    this.eventBus = eventBus

    // 为所有现有的系统和发射器设置事件总线
    for (const system of this.systems.values()) {
      system.setEventBus(eventBus)
    }

    for (const { emitter } of this.emitters.values()) {
      emitter.setEventBus(eventBus)
    }
  }

  /**
   * 创建粒子系统
   */
  createParticleSystem(
    systemId: string,
    canvas: HTMLCanvasElement,
    config: ParticleConfig
  ): GPUParticleSystem {
    if (this.systems.has(systemId)) {
      throw new Error(`Particle system with id '${systemId}' already exists`)
    }

    const system = new GPUParticleSystem(canvas, config)

    if (this.eventBus) {
      system.setEventBus(this.eventBus)
    }

    this.systems.set(systemId, system)

    this.eventBus?.emit('system-created', { systemId })

    return system
  }

  /**
   * 获取粒子系统
   */
  getParticleSystem(systemId: string): GPUParticleSystem | undefined {
    return this.systems.get(systemId)
  }

  /**
   * 移除粒子系统
   */
  removeParticleSystem(systemId: string): boolean {
    const system = this.systems.get(systemId)
    if (!system) return false

    // 移除关联的发射器
    const emittersToRemove = []
    for (const [emitterId, emitterData] of this.emitters) {
      if (emitterData.systemId === systemId) {
        emittersToRemove.push(emitterId)
      }
    }

    emittersToRemove.forEach((emitterId) => {
      this.removeEmitter(emitterId)
    })

    // 销毁系统
    system.dispose()
    this.systems.delete(systemId)

    this.eventBus?.emit('system-removed', { systemId })

    return true
  }

  /**
   * 创建粒子发射器
   */
  createEmitter(
    emitterId: string,
    systemId: string,
    config: Partial<EmitterConfig> = {}
  ): ParticleEmitter {
    if (this.emitters.has(emitterId)) {
      throw new Error(`Emitter with id '${emitterId}' already exists`)
    }

    const system = this.systems.get(systemId)
    if (!system) {
      throw new Error(`Particle system '${systemId}' not found`)
    }

    const emitter = new ParticleEmitter(emitterId, system, config)

    if (this.eventBus) {
      emitter.setEventBus(this.eventBus)
    }

    this.emitters.set(emitterId, { emitter, systemId })

    this.eventBus?.emit('emitter-created', { emitterId, systemId })

    return emitter
  }

  /**
   * 获取粒子发射器
   */
  getEmitter(emitterId: string): ParticleEmitter | undefined {
    const emitterData = this.emitters.get(emitterId)
    return emitterData?.emitter
  }

  /**
   * 移除粒子发射器
   */
  removeEmitter(emitterId: string): boolean {
    const emitterData = this.emitters.get(emitterId)
    if (!emitterData) return false

    emitterData.emitter.dispose()
    this.emitters.delete(emitterId)

    this.eventBus?.emit('emitter-removed', {
      emitterId,
      systemId: emitterData.systemId,
    })

    return true
  }

  /**
   * 获取系统的所有发射器
   */
  getEmittersBySystem(systemId: string): ParticleEmitter[] {
    const emitters = []
    for (const [, emitterData] of this.emitters) {
      if (emitterData.systemId === systemId) {
        emitters.push(emitterData.emitter)
      }
    }
    return emitters
  }

  /**
   * 启动所有系统
   */
  start(): void {
    if (this.isRunning) return

    this.isRunning = true
    this.lastUpdateTime = Date.now()

    // 启动所有粒子系统
    for (const system of this.systems.values()) {
      system.start()
    }

    // 启动所有发射器
    for (const { emitter } of this.emitters.values()) {
      emitter.start()
    }

    this.updateLoop()
  }

  /**
   * 停止所有系统
   */
  stop(): void {
    if (!this.isRunning) return

    this.isRunning = false

    // 停止所有粒子系统
    for (const system of this.systems.values()) {
      system.stop()
    }

    // 停止所有发射器
    for (const { emitter } of this.emitters.values()) {
      emitter.stop()
    }
  }

  /**
   * 暂停所有系统
   */
  pause(): void {
    for (const { emitter } of this.emitters.values()) {
      emitter.pause()
    }
  }

  /**
   * 恢复所有系统
   */
  resume(): void {
    for (const { emitter } of this.emitters.values()) {
      emitter.resume()
    }
  }

  /**
   * 更新循环
   */
  private updateLoop(): void {
    if (!this.isRunning) return

    const currentTime = Date.now()
    const deltaTime = (currentTime - this.lastUpdateTime) / 1000 // 转换为秒
    this.lastUpdateTime = currentTime

    this.update(deltaTime)

    requestAnimationFrame(() => this.updateLoop())
  }

  /**
   * 更新所有系统和发射器
   */
  update(deltaTime: number): void {
    let totalParticles = 0

    // 更新所有发射器
    for (const { emitter } of this.emitters.values()) {
      emitter.update(deltaTime)
    }

    // 更新所有粒子系统
    for (const system of this.systems.values()) {
      system.update(deltaTime)
      totalParticles += system.getAliveParticleCount()
    }

    this.eventBus?.emit('all-systems-updated', {
      systemCount: this.systems.size,
      totalParticles,
    })
  }

  /**
   * 渲染所有系统
   */
  render(mvpMatrix: Float32Array): void {
    for (const system of this.systems.values()) {
      system.render(mvpMatrix)
    }
  }

  /**
   * 清除所有粒子
   */
  clear(): void {
    for (const system of this.systems.values()) {
      system.clear()
    }
  }

  /**
   * 获取统计信息
   */
  getStats(): {
    systemCount: number
    emitterCount: number
    totalParticles: number
    maxParticles: number
    activeEmitters: number
  } {
    let totalParticles = 0
    let maxParticles = 0
    let activeEmitters = 0

    for (const system of this.systems.values()) {
      totalParticles += system.getAliveParticleCount()
      maxParticles += system.getMaxParticleCount()
    }

    for (const { emitter } of this.emitters.values()) {
      if (emitter.isEmitting()) {
        activeEmitters++
      }
    }

    return {
      systemCount: this.systems.size,
      emitterCount: this.emitters.size,
      totalParticles,
      maxParticles,
      activeEmitters,
    }
  }

  /**
   * 批量创建发射器（用于复杂效果）
   */
  createEmitterGroup(
    groupId: string,
    systemId: string,
    emitterConfigs: Array<{ id: string; config: Partial<EmitterConfig> }>
  ): ParticleEmitter[] {
    const emitters = []

    for (const { id, config } of emitterConfigs) {
      const fullId = `${groupId}_${id}`
      try {
        const emitter = this.createEmitter(fullId, systemId, config)
        emitters.push(emitter)
      } catch (error) {
        console.warn(`Failed to create emitter ${fullId}:`, error)
      }
    }

    return emitters
  }

  /**
   * 移除发射器组
   */
  removeEmitterGroup(groupId: string): number {
    let removedCount = 0
    const emittersToRemove = []

    for (const emitterId of this.emitters.keys()) {
      if (emitterId.startsWith(`${groupId}_`)) {
        emittersToRemove.push(emitterId)
      }
    }

    emittersToRemove.forEach((emitterId) => {
      if (this.removeEmitter(emitterId)) {
        removedCount++
      }
    })

    return removedCount
  }

  /**
   * 创建预设效果
   */
  createPresetEffect(
    effectId: string,
    systemId: string,
    presetName: string,
    position: { x: number; y: number; z: number },
    scale: number = 1
  ): ParticleEmitter[] {
    const presets = this.getPresetConfigs()
    const preset = presets[presetName]

    if (!preset) {
      throw new Error(`Unknown preset effect: ${presetName}`)
    }

    const emitterConfigs = preset.map((config, index) => ({
      id: `${effectId}_emitter_${index}`,
      config: {
        ...config,
        position,
        startSize: (config.startSize || 1) * scale,
        endSize: (config.endSize || 1) * scale,
        velocity: {
          x: (config.velocity?.x || 0) * scale,
          y: (config.velocity?.y || 0) * scale,
          z: (config.velocity?.z || 0) * scale,
        },
      },
    }))

    return this.createEmitterGroup(effectId, systemId, emitterConfigs)
  }

  /**
   * 获取预设效果配置
   */
  private getPresetConfigs(): Record<string, Partial<EmitterConfig>[]> {
    return {
      // 爆炸效果
      explosion: [
        {
          emissionMode: 'oneshot',
          burstCount: 100,
          velocity: { x: 0, y: 0, z: 0 },
          velocityVariance: { x: 200, y: 200, z: 0 },
          lifeSpan: 1.5,
          startSize: 8,
          endSize: 2,
          startColor: { r: 1, g: 0.8, b: 0.2, a: 1 },
          endColor: { r: 1, g: 0.2, b: 0.1, a: 0 },
          emissionShape: 'circle',
          shapeParams: { radius: 10 },
        },
      ],

      // 烟火效果
      fireworks: [
        {
          emissionMode: 'oneshot',
          burstCount: 50,
          velocity: { x: 0, y: -100, z: 0 },
          velocityVariance: { x: 150, y: 50, z: 0 },
          acceleration: { x: 0, y: 98, z: 0 },
          lifeSpan: 3.0,
          startSize: 6,
          endSize: 1,
          startColor: { r: 1, g: 0.3, b: 0.8, a: 1 },
          endColor: { r: 0.2, g: 0.1, b: 1, a: 0 },
          emissionShape: 'point',
        },
      ],

      // 星星效果
      stars: [
        {
          emissionMode: 'continuous',
          emissionRate: 20,
          maxParticles: 200,
          velocity: { x: 0, y: -30, z: 0 },
          velocityVariance: { x: 20, y: 10, z: 0 },
          lifeSpan: 4.0,
          lifeSpanVariance: 1.0,
          startSize: 4,
          endSize: 8,
          startColor: { r: 1, g: 1, b: 0.8, a: 0.8 },
          endColor: { r: 1, g: 1, b: 0.8, a: 0 },
          emissionShape: 'line',
          shapeParams: { length: 400, direction: { x: 1, y: 0, z: 0 } },
        },
      ],

      // 雨滴效果
      rain: [
        {
          emissionMode: 'continuous',
          emissionRate: 100,
          maxParticles: 1000,
          velocity: { x: 0, y: 200, z: 0 },
          velocityVariance: { x: 20, y: 50, z: 0 },
          lifeSpan: 2.0,
          startSize: 2,
          endSize: 1,
          startColor: { r: 0.7, g: 0.8, b: 1, a: 0.8 },
          endColor: { r: 0.7, g: 0.8, b: 1, a: 0.2 },
          emissionShape: 'line',
          shapeParams: { length: 800, direction: { x: 1, y: 0, z: 0 } },
        },
      ],
    }
  }

  /**
   * 销毁管理器
   */
  dispose(): void {
    this.stop()

    // 销毁所有发射器
    for (const emitterId of Array.from(this.emitters.keys())) {
      this.removeEmitter(emitterId)
    }

    // 销毁所有系统
    for (const systemId of Array.from(this.systems.keys())) {
      this.removeParticleSystem(systemId)
    }

    this.systems.clear()
    this.emitters.clear()
  }
}
