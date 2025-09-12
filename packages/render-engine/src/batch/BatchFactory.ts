/**
 * 批处理工厂
 * 创建预配置的批处理管理器
 */

import { BatchManager, BatchManagerConfig, createBatchManager } from './core';
import { BasicStrategy } from './strategies/BasicStrategy';
import { EnhancedStrategy } from './strategies/EnhancedStrategy';
import { InstancedStrategy } from './strategies/InstancedStrategy';

/**
 * 创建带有默认策略的批处理管理器
 */
export function createBatchManagerWithDefaultStrategies(
  gl: WebGLRenderingContext,
  config?: Partial<BatchManagerConfig>
): BatchManager {
  const manager = createBatchManager(gl, config);
  
  // 注册所有默认策略
  manager.registerStrategy(new BasicStrategy(gl));
  manager.registerStrategy(new EnhancedStrategy(gl));
  manager.registerStrategy(new InstancedStrategy(gl));
  
  // 设置默认策略
  manager.setStrategy(config?.defaultStrategy || 'basic');
  
  return manager;
}

/**
 * 创建基础批处理管理器
 */
export function createBasicBatchManager(
  gl: WebGLRenderingContext,
  config?: Partial<BatchManagerConfig>
): BatchManager {
  const manager = createBatchManager(gl, config);
  manager.registerStrategy(new BasicStrategy(gl));
  manager.setStrategy('basic');
  return manager;
}

/**
 * 创建增强批处理管理器
 */
export function createEnhancedBatchManager(
  gl: WebGLRenderingContext,
  config?: Partial<BatchManagerConfig>
): BatchManager {
  const manager = createBatchManager(gl, config);
  manager.registerStrategy(new BasicStrategy(gl));
  manager.registerStrategy(new EnhancedStrategy(gl));
  manager.setStrategy('enhanced');
  return manager;
}

/**
 * 创建高性能实例化批处理管理器
 */
export function createInstancedBatchManager(
  gl: WebGLRenderingContext,
  config?: Partial<BatchManagerConfig>
): BatchManager {
  const manager = createBatchManager(gl, config);
  manager.registerStrategy(new BasicStrategy(gl));
  manager.registerStrategy(new InstancedStrategy(gl));
  manager.setStrategy('instanced');
  return manager;
}