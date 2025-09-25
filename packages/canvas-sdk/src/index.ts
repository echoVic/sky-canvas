/**
 * Sky Canvas SDK - Public API
 *
 * @packageDocumentation
 */

// 主要工厂函数 - 创建SDK实例
export { createCanvasSDK } from './main';

// 核心类型
export type { CanvasSDK, ICanvasSDK, ICanvasSDKConfig } from './CanvasSDK';
export type { SDKConfig } from './main';

// Command + Action 架构
export * from './actions';
export * from './commands';
export * from './models';

// 事件系统
export * from './events';

// 插件系统
export * from './plugins';

