/**
 * 粒子系统模块导出
 * 提供完整的GPU加速粒子系统功能
 */

export { GPUParticleSystem } from './GPUParticleSystem';
export { ParticleEmitter } from './ParticleEmitter';
export { ParticleManager } from './ParticleManager';

export type {
  ParticleConfig,
  ParticleData,
  ParticleSystemEvents
} from './GPUParticleSystem';

export type {
  EmitterConfig,
  EmitterEvents
} from './ParticleEmitter';

export type {
  ParticleManagerEvents
} from './ParticleManager';