/**
 * 插件开发SDK - 为插件开发者提供便捷的开发工具
 */

import { 
  Plugin, 
  PluginManifest, 
  PluginContext, 
  ExtensionPointDeclaration,
  ExtensionPointType,
  PluginPermission,
  Tool,
  CustomRenderer,
  MenuItem,
  ToolbarButton,
  Panel
} from '../types/PluginTypes';

/**
 * 插件基类 - 提供通用功能
 */
export abstract class BasePlugin implements Plugin {
  protected context!: PluginContext;

  async activate(context: PluginContext): Promise<void> {
    this.context = context;
    await this.onActivate();
  }

  async deactivate(): Promise<void> {
    await this.onDeactivate();
  }

  protected abstract onActivate(): Promise<void>;
  protected abstract onDeactivate(): Promise<void>;

  // 便捷方法
  protected log(level: 'debug' | 'info' | 'warn' | 'error', message: string, ...args: any[]): void {
    this.context.logger[level](message, ...args);
  }

  protected getConfig<T = any>(key: string, defaultValue?: T): T {
    return this.context.config.get(key, defaultValue);
  }

  protected setConfig(key: string, value: any): void {
    this.context.config.set(key, value);
  }

  protected emit(event: string, ...args: any[]): void {
    this.context.events.emit(event, ...args);
  }

  protected on(event: string, listener: (...args: any[]) => void): void {
    this.context.events.on(event, listener);
  }
}

/**
 * 工具插件基类
 */
export abstract class ToolPlugin extends BasePlugin {
  protected abstract createTool(): Tool;

  protected async onActivate(): Promise<void> {
    const tool = this.createTool();
    this.context.api.tools.register(tool);
    this.log('info', `Tool '${tool.name}' registered`);
  }

  protected async onDeactivate(): Promise<void> {
    const tool = this.createTool();
    this.context.api.tools.unregister(tool.id);
    this.log('info', `Tool '${tool.name}' unregistered`);
  }
}

/**
 * 渲染器插件基类
 */
export abstract class RendererPlugin extends BasePlugin {
  protected abstract createRenderer(): CustomRenderer;

  protected async onActivate(): Promise<void> {
    const renderer = this.createRenderer();
    this.context.api.renderers.register(renderer);
    this.log('info', `Renderer '${renderer.name}' registered`);
  }

  protected async onDeactivate(): Promise<void> {
    const renderer = this.createRenderer();
    this.context.api.renderers.unregister(renderer.id);
    this.log('info', `Renderer '${renderer.name}' unregistered`);
  }
}

/**
 * UI扩展插件基类
 */
export abstract class UIPlugin extends BasePlugin {
  private registeredMenuItems: string[] = [];
  private registeredToolbarButtons: string[] = [];
  private registeredPanels: string[] = [];

  protected async onActivate(): Promise<void> {
    await this.setupUI();
  }

  protected async onDeactivate(): Promise<void> {
    await this.cleanupUI();
  }

  protected abstract setupUI(): Promise<void>;

  protected async cleanupUI(): Promise<void> {
    // 清理菜单项
    for (const id of this.registeredMenuItems) {
      this.context.api.ui.removeMenuItem(id);
    }
    this.registeredMenuItems = [];

    // 清理工具栏按钮
    for (const id of this.registeredToolbarButtons) {
      this.context.api.ui.removeToolbarButton(id);
    }
    this.registeredToolbarButtons = [];

    // 清理面板
    for (const id of this.registeredPanels) {
      this.context.api.ui.removePanel(id);
    }
    this.registeredPanels = [];
  }

  protected addMenuItem(item: MenuItem): void {
    this.context.api.ui.addMenuItem(item);
    this.registeredMenuItems.push(item.id);
  }

  protected addToolbarButton(button: ToolbarButton): void {
    this.context.api.ui.addToolbarButton(button);
    this.registeredToolbarButtons.push(button.id);
  }

  protected addPanel(panel: Panel): void {
    this.context.api.ui.addPanel(panel);
    this.registeredPanels.push(panel.id);
  }
}

/**
 * 插件清单构建器
 */
export class PluginManifestBuilder {
  private manifest: Partial<PluginManifest> = {
    extensionPoints: [],
    permissions: [],
    keywords: []
  };

  id(id: string): this {
    this.manifest.id = id;
    return this;
  }

  name(name: string): this {
    this.manifest.name = name;
    return this;
  }

  version(version: string): this {
    this.manifest.version = version;
    return this;
  }

  description(description: string): this {
    this.manifest.description = description;
    return this;
  }

  author(author: string): this {
    this.manifest.author = author;
    return this;
  }

  license(license: string): this {
    this.manifest.license = license;
    return this;
  }

  homepage(homepage: string): this {
    this.manifest.homepage = homepage;
    return this;
  }

  repository(repository: string): this {
    this.manifest.repository = repository;
    return this;
  }

  main(main: string): this {
    this.manifest.main = main;
    return this;
  }

  minEngineVersion(version: string): this {
    this.manifest.minEngineVersion = version;
    return this;
  }

  addKeyword(keyword: string): this {
    this.manifest.keywords!.push(keyword);
    return this;
  }

  addKeywords(...keywords: string[]): this {
    this.manifest.keywords!.push(...keywords);
    return this;
  }

  addPermission(permission: PluginPermission): this {
    if (!this.manifest.permissions!.includes(permission)) {
      this.manifest.permissions!.push(permission);
    }
    return this;
  }

  addPermissions(...permissions: PluginPermission[]): this {
    for (const permission of permissions) {
      this.addPermission(permission);
    }
    return this;
  }

  addExtensionPoint(extensionPoint: ExtensionPointDeclaration): this {
    this.manifest.extensionPoints!.push(extensionPoint);
    return this;
  }

  addDependency(name: string, version: string): this {
    if (!this.manifest.dependencies) {
      this.manifest.dependencies = {};
    }
    this.manifest.dependencies[name] = version;
    return this;
  }

  addPeerDependency(name: string, version: string): this {
    if (!this.manifest.peerDependencies) {
      this.manifest.peerDependencies = {};
    }
    this.manifest.peerDependencies[name] = version;
    return this;
  }

  addAsset(asset: string): this {
    if (!this.manifest.assets) {
      this.manifest.assets = [];
    }
    this.manifest.assets.push(asset);
    return this;
  }

  setConfigSchema(schema: Record<string, any>): this {
    this.manifest.configSchema = schema;
    return this;
  }

  build(): PluginManifest {
    // 验证必需字段
    const required = ['id', 'name', 'version', 'description', 'author', 'license', 'main', 'minEngineVersion'];
    for (const field of required) {
      if (!this.manifest[field as keyof PluginManifest]) {
        throw new Error(`Missing required field: ${field}`);
      }
    }

    return this.manifest as PluginManifest;
  }
}

/**
 * 扩展点声明构建器
 */
export class ExtensionPointBuilder {
  private declaration: Partial<ExtensionPointDeclaration> = {};

  id(id: string): this {
    this.declaration.id = id;
    return this;
  }

  type(type: ExtensionPointType): this {
    this.declaration.type = type;
    return this;
  }

  name(name: string): this {
    this.declaration.name = name;
    return this;
  }

  description(description: string): this {
    this.declaration.description = description;
    return this;
  }

  required(required: boolean = true): this {
    this.declaration.required = required;
    return this;
  }

  config(config: Record<string, any>): this {
    this.declaration.config = config;
    return this;
  }

  build(): ExtensionPointDeclaration {
    const required = ['id', 'type', 'name', 'description'];
    for (const field of required) {
      if (!this.declaration[field as keyof ExtensionPointDeclaration]) {
        throw new Error(`Missing required field: ${field}`);
      }
    }

    if (this.declaration.required === undefined) {
      this.declaration.required = false;
    }

    return this.declaration as ExtensionPointDeclaration;
  }
}

/**
 * 工具构建器
 */
export class ToolBuilder {
  private tool: Partial<Tool> = {};

  id(id: string): this {
    this.tool.id = id;
    return this;
  }

  name(name: string): this {
    this.tool.name = name;
    return this;
  }

  icon(icon: string): this {
    this.tool.icon = icon;
    return this;
  }

  cursor(cursor: string): this {
    this.tool.cursor = cursor;
    return this;
  }

  shortcut(shortcut: string): this {
    this.tool.shortcut = shortcut;
    return this;
  }

  onActivate(handler: () => void): this {
    this.tool.onActivate = handler;
    return this;
  }

  onDeactivate(handler: () => void): this {
    this.tool.onDeactivate = handler;
    return this;
  }

  onMouseDown(handler: (event: MouseEvent) => void): this {
    this.tool.onMouseDown = handler;
    return this;
  }

  onMouseMove(handler: (event: MouseEvent) => void): this {
    this.tool.onMouseMove = handler;
    return this;
  }

  onMouseUp(handler: (event: MouseEvent) => void): this {
    this.tool.onMouseUp = handler;
    return this;
  }

  onKeyDown(handler: (event: KeyboardEvent) => void): this {
    this.tool.onKeyDown = handler;
    return this;
  }

  onKeyUp(handler: (event: KeyboardEvent) => void): this {
    this.tool.onKeyUp = handler;
    return this;
  }

  build(): Tool {
    const required = ['id', 'name', 'icon'];
    for (const field of required) {
      if (!this.tool[field as keyof Tool]) {
        throw new Error(`Missing required field: ${field}`);
      }
    }

    return this.tool as Tool;
  }
}

/**
 * 插件开发工具类
 */
export class PluginDevTools {
  /**
   * 验证插件清单
   */
  static validateManifest(manifest: PluginManifest): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // 检查必需字段
    const required = ['id', 'name', 'version', 'description', 'author', 'license', 'main', 'minEngineVersion'];
    for (const field of required) {
      if (!manifest[field as keyof PluginManifest]) {
        errors.push(`Missing required field: ${field}`);
      }
    }

    // 验证版本格式
    if (manifest.version && !/^\d+\.\d+\.\d+/.test(manifest.version)) {
      errors.push(`Invalid version format: ${manifest.version}`);
    }

    // 验证插件ID格式
    if (manifest.id && !/^[a-z0-9-_.]+$/.test(manifest.id)) {
      errors.push(`Invalid plugin ID format: ${manifest.id}`);
    }

    // 验证权限
    if (manifest.permissions) {
      for (const permission of manifest.permissions) {
        if (!Object.values(PluginPermission).includes(permission)) {
          errors.push(`Invalid permission: ${permission}`);
        }
      }
    }

    // 验证扩展点
    if (manifest.extensionPoints) {
      for (const ep of manifest.extensionPoints) {
        if (!ep.id || !ep.type || !ep.name) {
          errors.push(`Invalid extension point: missing required fields`);
        }
        if (!Object.values(ExtensionPointType).includes(ep.type)) {
          errors.push(`Invalid extension point type: ${ep.type}`);
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * 生成插件模板
   */
  static generateTemplate(manifest: PluginManifest): string {
    return `/**
 * ${manifest.name} - ${manifest.description}
 * Version: ${manifest.version}
 * Author: ${manifest.author}
 */

import { BasePlugin, PluginContext } from '@sky-canvas/plugin-sdk';

export default class ${this.toPascalCase(manifest.id)}Plugin extends BasePlugin {
  protected async onActivate(): Promise<void> {
    this.log('info', '${manifest.name} plugin activated');
    
    // TODO: 实现插件激活逻辑
  }

  protected async onDeactivate(): Promise<void> {
    this.log('info', '${manifest.name} plugin deactivated');
    
    // TODO: 实现插件停用逻辑
  }
}`;
  }

  /**
   * 生成工具插件模板
   */
  static generateToolTemplate(manifest: PluginManifest, toolName: string): string {
    return `/**
 * ${manifest.name} - ${manifest.description}
 */

import { ToolPlugin, ToolBuilder, Tool } from '@sky-canvas/plugin-sdk';

export default class ${this.toPascalCase(manifest.id)}Plugin extends ToolPlugin {
  protected createTool(): Tool {
    return new ToolBuilder()
      .id('${manifest.id}-tool')
      .name('${toolName}')
      .icon('🔧') // 替换为实际图标
      .onActivate(() => {
        this.log('info', '${toolName} tool activated');
      })
      .onMouseDown((event) => {
        // TODO: 实现鼠标按下逻辑
      })
      .onMouseMove((event) => {
        // TODO: 实现鼠标移动逻辑
      })
      .onMouseUp((event) => {
        // TODO: 实现鼠标释放逻辑
      })
      .build();
  }
}`;
  }

  /**
   * 生成UI插件模板
   */
  static generateUITemplate(manifest: PluginManifest): string {
    return `/**
 * ${manifest.name} - ${manifest.description}
 */

import { UIPlugin } from '@sky-canvas/plugin-sdk';
import React from 'react';

export default class ${this.toPascalCase(manifest.id)}Plugin extends UIPlugin {
  protected async setupUI(): Promise<void> {
    // 添加菜单项
    this.addMenuItem({
      id: '${manifest.id}-menu',
      label: '${manifest.name}',
      action: () => {
        this.context.api.ui.showNotification({
          type: 'info',
          title: '${manifest.name}',
          message: 'Hello from ${manifest.name}!'
        });
      }
    });

    // 添加工具栏按钮
    this.addToolbarButton({
      id: '${manifest.id}-button',
      label: '${manifest.name}',
      icon: '🔧', // 替换为实际图标
      action: () => {
        // TODO: 实现按钮点击逻辑
      }
    });

    // 添加面板
    this.addPanel({
      id: '${manifest.id}-panel',
      title: '${manifest.name}',
      component: ${this.toPascalCase(manifest.id)}Panel,
      position: 'right'
    });
  }
}

// 面板组件
const ${this.toPascalCase(manifest.id)}Panel: React.FC = () => {
  return (
    <div className="p-4">
      <h3 className="text-lg font-semibold mb-2">${manifest.name}</h3>
      <p className="text-gray-600">${manifest.description}</p>
      {/* TODO: 添加面板内容 */}
    </div>
  );
};`;
  }

  /**
   * 转换为PascalCase
   */
  private static toPascalCase(str: string): string {
    return str
      .split(/[-_.]/)
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join('');
  }
}

// 导出便捷函数
export const createManifest = () => new PluginManifestBuilder();
export const createExtensionPoint = () => new ExtensionPointBuilder();
export const createTool = () => new ToolBuilder();
