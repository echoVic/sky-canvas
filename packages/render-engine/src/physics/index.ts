/**
 * 物理系统模块导出
 * 提供完整的物理引擎集成功能
 */

export { PhysicsWorld } from './PhysicsWorld';
export { PhysicsSync } from './PhysicsSync';

export type {
  PhysicsConfig,
  PhysicsBodyOptions,
  PhysicsBody,
  PhysicsEvents
} from './PhysicsWorld';

export type {
  RenderObject,
  PhysicsSyncEvents,
  PhysicsRenderMapping
} from './PhysicsSync';