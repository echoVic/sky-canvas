/**
 * 粒子系统模块导出
 * 提供完整的GPU加速粒子系统功能
 */

export type {
  ParticleConfig,
  ParticleData,
  ParticleSystemEvents,
} from './GPUParticleSystem'
export { GPUParticleSystem } from './GPUParticleSystem'
export type {
  EmitterConfig,
  EmitterEvents,
} from './ParticleEmitter'
export { ParticleEmitter } from './ParticleEmitter'
export type { ParticleManagerEvents } from './ParticleManager'
export { ParticleManager } from './ParticleManager'
