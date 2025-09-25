/**
 * 插件系统类型定义
 * 支持Action/Command/UI扩展
 */

import { Action } from '../actions/types';
import { Command } from '../commands/base';
import { CanvasModel } from '../models/CanvasModel';

/**
 * 插件基础信息
 */
export interface PluginMetadata {
  /** 插件唯一标识 */
  id: string;
  /** 插件名称 */
  name: string;
  /** 插件版本 */
  version: string;
  /** 插件描述 */
  description?: string;
  /** 作者信息 */
  author?: string;
  /** 插件主页 */
  homepage?: string;
  /** 依赖的SDK版本范围 */
  sdkVersion?: string;
  /** 插件依赖 */
  dependencies?: string[];
}

/**
 * 扩展点类型
 */
export type ExtensionPoint =
  | 'action'      // Action扩展
  | 'command'     // Command扩展
  | 'ui'          // UI扩展
  | 'tool'        // 工具扩展
  | 'event'       // 事件扩展
  | 'validator'   // 验证器扩展
  | 'renderer';   // 渲染器扩展

/**
 * 扩展贡献
 */
export interface PluginContribution {
  /** 扩展点类型 */
  point: ExtensionPoint;
  /** 扩展内容 */
  content: any;
}

/**
 * Action扩展贡献
 */
export interface ActionContribution extends PluginContribution {
  point: 'action';
  content: {
    /** Action类型 */
    type: string;
    /** Action创建器 */
    creator: (payload: any) => Action;
    /** Action描述 */
    description?: string;
  };
}

/**
 * Command扩展贡献
 */
export interface CommandContribution extends PluginContribution {
  point: 'command';
  content: {
    /** 对应的Action类型 */
    actionType: string;
    /** Command创建器 */
    creator: (model: CanvasModel, action: Action) => Command;
    /** 优先级（用于覆盖默认实现） */
    priority?: number;
  };
}

/**
 * 工具扩展贡献
 */
export interface ToolContribution extends PluginContribution {
  point: 'tool';
  content: {
    /** 工具类型 */
    type: string;
    /** 工具名称 */
    name: string;
    /** 工具图标 */
    icon?: string;
    /** 工具配置 */
    config?: Record<string, any>;
    /** 工具处理器 */
    handler: ToolHandler;
  };
}

/**
 * 工具处理器接口
 */
export interface ToolHandler {
  /** 激活工具时调用 */
  onActivate?: (context: ToolContext) => void;
  /** 停用工具时调用 */
  onDeactivate?: (context: ToolContext) => void;
  /** 鼠标按下时调用 */
  onMouseDown?: (event: MouseEvent, context: ToolContext) => void;
  /** 鼠标移动时调用 */
  onMouseMove?: (event: MouseEvent, context: ToolContext) => void;
  /** 鼠标释放时调用 */
  onMouseUp?: (event: MouseEvent, context: ToolContext) => void;
  /** 键盘按下时调用 */
  onKeyDown?: (event: KeyboardEvent, context: ToolContext) => void;
}

/**
 * 工具上下文
 */
export interface ToolContext {
  /** Canvas模型 */
  model: CanvasModel;
  /** 分发Action */
  dispatch: (action: Action) => Promise<void>;
  /** 当前选择 */
  selection: string[];
  /** 鼠标位置 */
  mousePosition?: { x: number; y: number };
  /** 修饰键状态 */
  modifiers?: {
    ctrl: boolean;
    shift: boolean;
    alt: boolean;
  };
}

/**
 * UI扩展贡献
 */
export interface UIContribution extends PluginContribution {
  point: 'ui';
  content: {
    /** 位置标识 */
    position: 'toolbar' | 'menubar' | 'contextmenu' | 'panel' | 'statusbar';
    /** 组件渲染器 */
    render: (context: UIContext) => React.ReactNode;
    /** 优先级 */
    priority?: number;
  };
}

/**
 * UI上下文
 */
export interface UIContext {
  /** Canvas模型 */
  model: CanvasModel;
  /** 分发Action */
  dispatch: (action: Action) => Promise<void>;
  /** SDK状态 */
  sdkState: any;
}

/**
 * 事件扩展贡献
 */
export interface EventContribution extends PluginContribution {
  point: 'event';
  content: {
    /** 事件类型 */
    eventType: string;
    /** 事件处理器 */
    handler: (event: any, context: EventContext) => void;
    /** 优先级 */
    priority?: number;
  };
}

/**
 * 事件上下文
 */
export interface EventContext {
  /** Canvas模型 */
  model: CanvasModel;
  /** 分发Action */
  dispatch: (action: Action) => Promise<void>;
  /** 事件源 */
  source: string;
}

/**
 * 验证器扩展贡献
 */
export interface ValidatorContribution extends PluginContribution {
  point: 'validator';
  content: {
    /** 验证的Action类型 */
    actionType: string;
    /** 验证函数 */
    validator: (action: Action) => boolean | string;
    /** 优先级 */
    priority?: number;
  };
}

/**
 * 插件生命周期接口
 */
export interface PluginLifecycle {
  /** 插件激活时调用 */
  activate?(context: PluginContext): void | Promise<void>;
  /** 插件停用时调用 */
  deactivate?(context: PluginContext): void | Promise<void>;
}

/**
 * 插件上下文
 */
export interface PluginContext {
  /** Canvas模型 */
  model: CanvasModel;
  /** 分发Action */
  dispatch: (action: Action) => Promise<void>;
  /** 扩展点注册器 */
  extensionRegistry: ExtensionRegistry;
  /** 插件配置 */
  config?: Record<string, any>;
  /** 日志记录器 */
  logger?: {
    info: (message: string, ...args: any[]) => void;
    warn: (message: string, ...args: any[]) => void;
    error: (message: string, ...args: any[]) => void;
  };
}

/**
 * 插件主入口接口
 */
export interface Plugin extends PluginLifecycle {
  /** 插件元数据 */
  metadata: PluginMetadata;
  /** 插件贡献 */
  contributions?: PluginContribution[];
}

/**
 * 扩展点注册器
 */
export interface ExtensionRegistry {
  /** 注册扩展 */
  register<T extends PluginContribution>(contribution: T): void;
  /** 取消注册扩展 */
  unregister(pluginId: string, contributionPoint: ExtensionPoint): void;
  /** 获取扩展 */
  get<T extends PluginContribution>(point: ExtensionPoint): T[];
  /** 获取指定类型的扩展 */
  getByType<T extends PluginContribution>(point: ExtensionPoint, type: string): T[];
}

/**
 * 插件管理器接口
 */
export interface PluginManager {
  /** 注册插件 */
  register(plugin: Plugin): Promise<void>;
  /** 取消注册插件 */
  unregister(pluginId: string): Promise<void>;
  /** 激活插件 */
  activate(pluginId: string): Promise<void>;
  /** 停用插件 */
  deactivate(pluginId: string): Promise<void>;
  /** 获取所有插件 */
  getPlugins(): Plugin[];
  /** 获取激活的插件 */
  getActivePlugins(): Plugin[];
  /** 检查插件是否已激活 */
  isActive(pluginId: string): boolean;
}

/**
 * 插件配置
 */
export interface PluginConfig {
  /** 是否启用插件系统 */
  enabled?: boolean;
  /** 插件目录 */
  pluginDir?: string;
  /** 自动激活插件 */
  autoActivate?: string[];
  /** 插件白名单 */
  whitelist?: string[];
  /** 插件黑名单 */
  blacklist?: string[];
  /** 开发模式 */
  devMode?: boolean;
}