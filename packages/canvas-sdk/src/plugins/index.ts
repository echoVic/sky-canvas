/**
 * 插件系统入口文件
 * 导出所有插件相关的类型和实现
 */

// 类型定义
export * from './types';

// 插件管理器实现
export { PluginManagerImpl } from './PluginManager';

// 示例插件
export { WatermarkPlugin, WatermarkAPI } from './examples/WatermarkPlugin';