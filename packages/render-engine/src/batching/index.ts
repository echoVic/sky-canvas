/**
 * 批处理模块导出
 */

// 批处理器
export { UniversalBatcher, MultiTextureBatcher } from './Batcher';
export { BatcherFactory as BasicBatcherFactory } from './Batcher';

// 类型导出
export type { IBatcher, IBatchData } from './Batcher';

// 批处理渲染器
export * from './BatchRenderer';

// 动态批处理器
export { DynamicBatcher } from './DynamicBatcher';
export { BatcherFactory as DynamicBatcherFactory } from './DynamicBatcher';

// 实例化批处理器  
export { InstancedBatcher } from './InstancedBatcher';
export type { InstanceData as InstancedBatchData } from './InstancedBatcher';

// 高级批处理器
export * from './AdvancedBatcher';

// 增强批处理器 (新版本)
export * from './EnhancedBatcher';

// 实例化渲染器
export { InstancedRenderer } from './InstancedRenderer';
export type { InstanceData as InstanceRenderData } from './InstancedRenderer';

// 批处理系统管理器
export * from './BatchManager';