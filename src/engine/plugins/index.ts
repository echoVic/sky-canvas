/**
 * 插件系统主入口文件
 */

// 核心组件
export { PluginManager } from './core/PluginManager';
export { ExtensionManager, DEFAULT_EXTENSION_POINTS } from './core/ExtensionManager';
export { PermissionManager } from './core/PermissionManager';
export { PluginContextImpl } from './core/PluginContext';

// 类型定义
export * from './types/PluginTypes';

// SDK
export * from './sdk/PluginSDK';

// 市场
export { PluginMarketplace, LocalPluginStore } from './marketplace/PluginMarketplace';

// 示例插件
export { default as CircleToolPlugin } from './examples/CircleToolPlugin';
export { default as TextToolPlugin } from './examples/TextToolPlugin';
export { default as LayerManagerPlugin } from './examples/LayerManagerPlugin';

// 插件系统工厂
import { PluginManager } from './core/PluginManager';
import { DEFAULT_EXTENSION_POINTS } from './core/ExtensionManager';

/**
 * 创建插件系统实例
 */
export function createPluginSystem(): PluginManager {
  const pluginManager = new PluginManager();
  const extensionManager = pluginManager.getExtensionManager();
  
  // 注册默认扩展点
  for (const extensionPoint of DEFAULT_EXTENSION_POINTS) {
    extensionManager.defineExtensionPoint(extensionPoint);
  }
  
  return pluginManager;
}

/**
 * 插件系统单例
 */
let globalPluginSystem: PluginManager | null = null;

export function getGlobalPluginSystem(): PluginManager {
  if (!globalPluginSystem) {
    globalPluginSystem = createPluginSystem();
  }
  return globalPluginSystem;
}
