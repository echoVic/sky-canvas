/**
 * 扩展注册表 - 基于VSCode的扩展点系统
 * 管理所有扩展点和扩展的注册与激活
 */

import { Emitter, IDisposable, IEvent } from '../events/EventBus';

export interface JSONSchema {
  type: string;
  properties?: Record<string, any>;
  items?: JSONSchema;
  [key: string]: any;
}

export interface IExtensionPoint<T> {
  readonly name: string;
  readonly description: string;
  readonly schema: JSONSchema;
  setHandler(handler: (extensions: IExtensionDescription<T>[]) => void): void;
  getContributions(): IExtensionDescription<T>[];
}

export interface IExtensionDescription<T = any> {
  readonly extensionId: string;
  readonly value: T;
}

export interface IExtensionManifest {
  readonly name: string;
  readonly displayName?: string;
  readonly version: string;
  readonly description: string;
  readonly publisher: string;
  readonly main: string;
  readonly activationEvents: string[];
  readonly contributes?: Record<string, any>;
  readonly engines?: Record<string, string>;
  readonly categories?: string[];
  readonly keywords?: string[];
}

export interface IExtension {
  readonly id: string;
  readonly manifest: IExtensionManifest;
  readonly extensionLocation: string;
  readonly isBuiltin: boolean;
}

export enum ExtensionState {
  Uninstalled = 0,
  Installed = 1,
  Disabled = 2,
  Enabled = 3,
  Activating = 4,
  Activated = 5,
  Deactivating = 6,
  Failed = 7
}

export interface IExtensionInstance {
  readonly extension: IExtension;
  state: ExtensionState;
  module?: any;
  context?: IExtensionContext | undefined;
  activationPromise?: Promise<void> | undefined;
}

export interface IExtensionContext {
  readonly subscriptions: IDisposable[];
  readonly workspaceState: IMemento;
  readonly globalState: IMemento;
  readonly extensionPath: string;
  asAbsolutePath(relativePath: string): string;
}

export interface IMemento {
  get<T>(key: string): T | undefined;
  get<T>(key: string, defaultValue: T): T;
  update(key: string, value: any): Promise<void>;
}

class ExtensionPoint<T> implements IExtensionPoint<T> {
  private _handler?: (extensions: IExtensionDescription<T>[]) => void;
  private _contributions: IExtensionDescription<T>[] = [];

  constructor(
    public readonly name: string,
    public readonly description: string,
    public readonly schema: JSONSchema
  ) {}

  setHandler(handler: (extensions: IExtensionDescription<T>[]) => void): void {
    this._handler = handler;
    if (this._contributions.length > 0) {
      handler(this._contributions);
    }
  }

  addContribution(contribution: IExtensionDescription<T>): void {
    this._contributions.push(contribution);
    if (this._handler) {
      this._handler(this._contributions);
    }
  }

  removeContribution(extensionId: string): void {
    const index = this._contributions.findIndex(c => c.extensionId === extensionId);
    if (index >= 0) {
      this._contributions.splice(index, 1);
      if (this._handler) {
        this._handler(this._contributions);
      }
    }
  }

  getContributions(): IExtensionDescription<T>[] {
    return [...this._contributions];
  }
}

/**
 * 扩展点注册表
 */
export class ExtensionPointRegistry {
  private _extensionPoints = new Map<string, IExtensionPoint<any>>();
  private _onExtensionPointRegistered = new Emitter<IExtensionPoint<any>>();

  readonly onExtensionPointRegistered: IEvent<IExtensionPoint<any>> = this._onExtensionPointRegistered.event;

  registerExtensionPoint<T>(
    name: string,
    description: string,
    schema: JSONSchema
  ): IExtensionPoint<T> {
    if (this._extensionPoints.has(name)) {
      throw new Error(`Extension point ${name} is already registered`);
    }

    const extensionPoint = new ExtensionPoint<T>(name, description, schema);
    this._extensionPoints.set(name, extensionPoint);
    this._onExtensionPointRegistered.fire(extensionPoint);

    return extensionPoint;
  }

  getExtensionPoint<T>(name: string): IExtensionPoint<T> | undefined {
    return this._extensionPoints.get(name);
  }

  getAllExtensionPoints(): IExtensionPoint<any>[] {
    return Array.from(this._extensionPoints.values());
  }

  dispose(): void {
    this._extensionPoints.clear();
    this._onExtensionPointRegistered.dispose();
  }
}

/**
 * 扩展注册表
 */
export class ExtensionRegistry {
  private _extensions = new Map<string, IExtension>();
  private _extensionInstances = new Map<string, IExtensionInstance>();
  private _extensionPointRegistry: ExtensionPointRegistry;
  private _onExtensionRegistered = new Emitter<IExtension>();
  private _onExtensionUnregistered = new Emitter<string>();

  readonly onExtensionRegistered: IEvent<IExtension> = this._onExtensionRegistered.event;
  readonly onExtensionUnregistered: IEvent<string> = this._onExtensionUnregistered.event;

  constructor(extensionPointRegistry: ExtensionPointRegistry) {
    this._extensionPointRegistry = extensionPointRegistry;
  }

  registerExtension(extension: IExtension): void {
    if (this._extensions.has(extension.id)) {
      throw new Error(`Extension ${extension.id} is already registered`);
    }

    this._extensions.set(extension.id, extension);
    this._extensionInstances.set(extension.id, {
      extension,
      state: ExtensionState.Installed
    });

    // 注册扩展的贡献点
    this._registerContributions(extension);

    this._onExtensionRegistered.fire(extension);
  }

  unregisterExtension(extensionId: string): void {
    const extension = this._extensions.get(extensionId);
    if (!extension) {
      return;
    }

    // 移除扩展的贡献点
    this._unregisterContributions(extension);

    this._extensions.delete(extensionId);
    this._extensionInstances.delete(extensionId);

    this._onExtensionUnregistered.fire(extensionId);
  }

  getExtension(extensionId: string): IExtension | undefined {
    return this._extensions.get(extensionId);
  }

  getAllExtensions(): IExtension[] {
    return Array.from(this._extensions.values());
  }

  getExtensionInstance(extensionId: string): IExtensionInstance | undefined {
    return this._extensionInstances.get(extensionId);
  }

  private _registerContributions(extension: IExtension): void {
    const contributes = extension.manifest.contributes;
    if (!contributes) {
      return;
    }

    for (const [pointName, contributions] of Object.entries(contributes)) {
      const extensionPoint = this._extensionPointRegistry.getExtensionPoint(pointName);
      if (extensionPoint && Array.isArray(contributions)) {
        for (const contribution of contributions) {
          (extensionPoint as any).addContribution({
            extensionId: extension.id,
            value: contribution
          });
        }
      }
    }
  }

  private _unregisterContributions(extension: IExtension): void {
    const contributes = extension.manifest.contributes;
    if (!contributes) {
      return;
    }

    for (const pointName of Object.keys(contributes)) {
      const extensionPoint = this._extensionPointRegistry.getExtensionPoint(pointName);
      if (extensionPoint) {
        (extensionPoint as any).removeContribution(extension.id);
      }
    }
  }

  dispose(): void {
    this._extensions.clear();
    this._extensionInstances.clear();
    this._onExtensionRegistered.dispose();
    this._onExtensionUnregistered.dispose();
  }
}

/**
 * 预定义的扩展点
 */
export function createBuiltinExtensionPoints(registry: ExtensionPointRegistry): void {
  // 画布工具扩展点
  registry.registerExtensionPoint('canvasTools', '画布工具扩展点', {
    type: 'array',
    items: {
      type: 'object',
      properties: {
        id: { type: 'string' },
        name: { type: 'string' },
        icon: { type: 'string' },
        category: { type: 'string' },
        command: { type: 'string' },
        keybinding: { type: 'string' }
      },
      required: ['id', 'name', 'command']
    }
  });

  // 渲染器扩展点
  registry.registerExtensionPoint('renderers', '自定义渲染器扩展点', {
    type: 'array',
    items: {
      type: 'object',
      properties: {
        id: { type: 'string' },
        name: { type: 'string' },
        priority: { type: 'number' },
        supportedFormats: { type: 'array', items: { type: 'string' } }
      },
      required: ['id', 'name']
    }
  });

  // 主题扩展点
  registry.registerExtensionPoint('themes', '主题扩展点', {
    type: 'array',
    items: {
      type: 'object',
      properties: {
        id: { type: 'string' },
        label: { type: 'string' },
        uiTheme: { type: 'string', enum: ['vs', 'vs-dark', 'hc-black'] },
        path: { type: 'string' }
      },
      required: ['id', 'label', 'path']
    }
  });

  // 命令扩展点
  registry.registerExtensionPoint('commands', '命令扩展点', {
    type: 'array',
    items: {
      type: 'object',
      properties: {
        command: { type: 'string' },
        title: { type: 'string' },
        category: { type: 'string' },
        icon: { type: 'string' },
        when: { type: 'string' }
      },
      required: ['command', 'title']
    }
  });

  // 菜单扩展点
  registry.registerExtensionPoint('menus', '菜单扩展点', {
    type: 'object',
    properties: {
      'canvas/toolbar': { type: 'array' },
      'canvas/context': { type: 'array' },
      'canvas/menubar': { type: 'array' }
    }
  });

  // 键绑定扩展点
  registry.registerExtensionPoint('keybindings', '键绑定扩展点', {
    type: 'array',
    items: {
      type: 'object',
      properties: {
        command: { type: 'string' },
        key: { type: 'string' },
        mac: { type: 'string' },
        when: { type: 'string' }
      },
      required: ['command', 'key']
    }
  });

  // 配置扩展点
  registry.registerExtensionPoint('configuration', '配置扩展点', {
    type: 'object',
    properties: {
      title: { type: 'string' },
      properties: { type: 'object' }
    }
  });

  // 导出器扩展点
  registry.registerExtensionPoint('exporters', '导出器扩展点', {
    type: 'array',
    items: {
      type: 'object',
      properties: {
        id: { type: 'string' },
        name: { type: 'string' },
        fileExtensions: { type: 'array', items: { type: 'string' } },
        mimeTypes: { type: 'array', items: { type: 'string' } }
      },
      required: ['id', 'name']
    }
  });

  // 导入器扩展点
  registry.registerExtensionPoint('importers', '导入器扩展点', {
    type: 'array',
    items: {
      type: 'object',
      properties: {
        id: { type: 'string' },
        name: { type: 'string' },
        fileExtensions: { type: 'array', items: { type: 'string' } },
        mimeTypes: { type: 'array', items: { type: 'string' } }
      },
      required: ['id', 'name']
    }
  });
}
