/**
 * 物理系统模块导出
 * 提供完整的物理引擎集成功能
 */

export type {
  PhysicsRenderMapping,
  PhysicsSyncEvents,
  RenderObject,
} from './PhysicsSync'
export { PhysicsSync } from './PhysicsSync'

export type {
  PhysicsBody,
  PhysicsBodyOptions,
  PhysicsConfig,
  PhysicsEvents,
} from './PhysicsWorld'
export { PhysicsWorld } from './PhysicsWorld'
