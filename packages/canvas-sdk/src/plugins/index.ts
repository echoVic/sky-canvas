/**
 * 插件系统主入口文件
 */

export { DEFAULT_EXTENSION_POINTS, ExtensionManager } from './core/ExtensionManager'
export { PermissionManager } from './core/PermissionManager'
export { PluginContextImpl } from './core/PluginContext'
// 核心组件
export { PluginManager } from './core/PluginManager'
// 示例插件
export { default as CircleToolPlugin } from './examples/CircleToolPlugin'
export { default as TextToolPlugin } from './examples/TextToolPlugin'

// 市场
export { LocalPluginStore, PluginMarketplace } from './marketplace/PluginMarketplace'
// SDK
export * from './sdk/PluginSDK'
// 类型定义
export * from './types/PluginTypes'

import { DEFAULT_EXTENSION_POINTS } from './core/ExtensionManager'
// 插件系统工厂
import { PluginManager } from './core/PluginManager'

/**
 * 创建插件系统实例
 */
export function createPluginSystem(): PluginManager {
  const pluginManager = new PluginManager()
  const extensionManager = pluginManager.getExtensionManager()

  // 注册默认扩展点
  for (const extensionPoint of DEFAULT_EXTENSION_POINTS) {
    extensionManager.defineExtensionPoint(extensionPoint)
  }

  return pluginManager
}

/**
 * 插件系统单例
 */
let globalPluginSystem: PluginManager | null = null

export function getGlobalPluginSystem(): PluginManager {
  if (!globalPluginSystem) {
    globalPluginSystem = createPluginSystem()
  }
  return globalPluginSystem
}
