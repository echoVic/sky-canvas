/**
 * 扩展生命周期管理器 - 基于VSCode的扩展激活机制
 * 管理扩展的激活、停用和生命周期
 */

import { Emitter, IDisposable, IEvent } from '../events/EventBus';
import {
  ExtensionRegistry,
  ExtensionState,
  IExtension,
  IExtensionContext,
  IExtensionInstance,
  IMemento
} from './ExtensionRegistry';

export interface IActivationEvent {
  readonly extensionId: string;
  readonly activationEvent: string;
}

export interface IExtensionActivationResult {
  readonly extensionId: string;
  readonly success: boolean;
  readonly error?: Error;
}

/**
 * 内存状态存储
 */
class MemoryMemento implements IMemento {
  private _data = new Map<string, any>();

  get<T>(key: string): T | undefined;
  get<T>(key: string, defaultValue: T): T;
  get<T>(key: string, defaultValue?: T): T | undefined {
    const value = this._data.get(key);
    return value !== undefined ? value : defaultValue;
  }

  async update(key: string, value: any): Promise<void> {
    if (value === undefined) {
      this._data.delete(key);
    } else {
      this._data.set(key, value);
    }
  }

  clear(): void {
    this._data.clear();
  }
}

/**
 * 扩展上下文实现
 */
class ExtensionContext implements IExtensionContext {
  readonly subscriptions: IDisposable[] = [];
  readonly workspaceState: IMemento;
  readonly globalState: IMemento;
  readonly extensionPath: string;

  constructor(extension: IExtension) {
    this.extensionPath = extension.extensionLocation;
    this.workspaceState = new MemoryMemento();
    this.globalState = new MemoryMemento();
  }

  asAbsolutePath(relativePath: string): string {
    return `${this.extensionPath}/${relativePath}`;
  }

  dispose(): void {
    this.subscriptions.forEach(disposable => {
      try {
        disposable.dispose();
      } catch (error) {
        console.error('Error disposing extension subscription:', error);
      }
    });
    this.subscriptions.length = 0;
  }
}

/**
 * 激活事件管理器
 */
class ActivationEventManager {
  private _activationEvents = new Map<string, Set<string>>();
  private _onActivationEvent = new Emitter<IActivationEvent>();

  readonly onActivationEvent: IEvent<IActivationEvent> = this._onActivationEvent.event;

  registerActivationEvents(extensionId: string, events: string[]): void {
    if (!this._activationEvents.has(extensionId)) {
      this._activationEvents.set(extensionId, new Set());
    }
    
    const extensionEvents = this._activationEvents.get(extensionId)!;
    events.forEach(event => extensionEvents.add(event));
  }

  unregisterActivationEvents(extensionId: string): void {
    this._activationEvents.delete(extensionId);
  }

  fireActivationEvent(activationEvent: string): void {
    for (const [extensionId, events] of this._activationEvents.entries()) {
      if (events.has(activationEvent) || events.has('*')) {
        this._onActivationEvent.fire({ extensionId, activationEvent });
      }
    }
  }

  getActivationEvents(extensionId: string): string[] {
    const events = this._activationEvents.get(extensionId);
    return events ? Array.from(events) : [];
  }

  dispose(): void {
    this._activationEvents.clear();
    this._onActivationEvent.dispose();
  }
}

/**
 * 扩展生命周期管理器
 */
export class ExtensionLifecycleManager {
  private _extensionRegistry: ExtensionRegistry;
  private _activationEventManager: ActivationEventManager;
  private _onExtensionActivated = new Emitter<IExtensionActivationResult>();
  private _onExtensionDeactivated = new Emitter<string>();
  private _disposed = false;

  readonly onExtensionActivated: IEvent<IExtensionActivationResult> = this._onExtensionActivated.event;
  readonly onExtensionDeactivated: IEvent<string> = this._onExtensionDeactivated.event;

  constructor(extensionRegistry: ExtensionRegistry) {
    this._extensionRegistry = extensionRegistry;
    this._activationEventManager = new ActivationEventManager();

    // 监听激活事件
    this._activationEventManager.onActivationEvent(event => {
      this.activateExtension(event.extensionId).catch(error => {
        console.error(`Failed to activate extension ${event.extensionId}:`, error);
      });
    });

    // 监听扩展注册事件
    this._extensionRegistry.onExtensionRegistered(extension => {
      this._activationEventManager.registerActivationEvents(
        extension.id,
        extension.manifest.activationEvents
      );
    });

    this._extensionRegistry.onExtensionUnregistered(extensionId => {
      this._activationEventManager.unregisterActivationEvents(extensionId);
      this.deactivateExtension(extensionId).catch(error => {
        console.error(`Failed to deactivate extension ${extensionId}:`, error);
      });
    });
  }

  async activateExtension(extensionId: string): Promise<void> {
    if (this._disposed) {
      throw new Error('ExtensionLifecycleManager is disposed');
    }

    const extensionInstance = this._extensionRegistry.getExtensionInstance(extensionId);
    if (!extensionInstance) {
      throw new Error(`Extension ${extensionId} is not registered`);
    }

    // 检查扩展状态
    if (extensionInstance.state === ExtensionState.Activated) {
      return; // 已经激活
    }

    if (extensionInstance.state === ExtensionState.Activating) {
      return extensionInstance.activationPromise; // 正在激活
    }

    if (extensionInstance.state !== ExtensionState.Enabled && 
        extensionInstance.state !== ExtensionState.Installed) {
      throw new Error(`Extension ${extensionId} cannot be activated (state: ${extensionInstance.state})`);
    }

    // 开始激活过程
    extensionInstance.state = ExtensionState.Activating;
    extensionInstance.activationPromise = this._doActivateExtension(extensionInstance);

    try {
      await extensionInstance.activationPromise;
      extensionInstance.state = ExtensionState.Activated;
      
      this._onExtensionActivated.fire({
        extensionId,
        success: true
      });
    } catch (error) {
      extensionInstance.state = ExtensionState.Failed;
      
      this._onExtensionActivated.fire({
        extensionId,
        success: false,
        error: error as Error
      });
      
      throw error;
    } finally {
      extensionInstance.activationPromise = undefined;
    }
  }

  private async _doActivateExtension(extensionInstance: IExtensionInstance): Promise<void> {
    const { extension } = extensionInstance;
    
    try {
      // 动态加载扩展模块
      const modulePath = `${extension.extensionLocation}/${extension.manifest.main}`;
      const extensionModule = await import(modulePath);

      // 创建扩展上下文
      const context = new ExtensionContext(extension);
      extensionInstance.context = context;

      // 调用激活函数
      if (extensionModule.activate && typeof extensionModule.activate === 'function') {
        await extensionModule.activate(context);
      }

      extensionInstance.module = extensionModule;
      
    } catch (error) {
      // 清理上下文
      if (extensionInstance.context) {
        extensionInstance.context.dispose();
        extensionInstance.context = undefined;
      }
      
      throw new Error(`Failed to activate extension ${extension.id}: ${error}`);
    }
  }

  async deactivateExtension(extensionId: string): Promise<void> {
    if (this._disposed) {
      return;
    }

    const extensionInstance = this._extensionRegistry.getExtensionInstance(extensionId);
    if (!extensionInstance || extensionInstance.state !== ExtensionState.Activated) {
      return;
    }

    try {
      extensionInstance.state = ExtensionState.Deactivating;

      // 调用停用函数
      if (extensionInstance.module?.deactivate && 
          typeof extensionInstance.module.deactivate === 'function') {
        await extensionInstance.module.deactivate();
      }

      // 清理上下文
      if (extensionInstance.context) {
        extensionInstance.context.dispose();
        extensionInstance.context = undefined;
      }

      extensionInstance.module = undefined;
      extensionInstance.state = ExtensionState.Enabled;

      this._onExtensionDeactivated.fire(extensionId);

    } catch (error) {
      console.error(`Failed to deactivate extension ${extensionId}:`, error);
      extensionInstance.state = ExtensionState.Failed;
    }
  }

  async deactivateAllExtensions(): Promise<void> {
    const extensions = this._extensionRegistry.getAllExtensions();
    const deactivationPromises = extensions.map(ext => 
      this.deactivateExtension(ext.id).catch(error => {
        console.error(`Failed to deactivate extension ${ext.id}:`, error);
      })
    );

    await Promise.all(deactivationPromises);
  }

  fireActivationEvent(activationEvent: string): void {
    if (!this._disposed) {
      this._activationEventManager.fireActivationEvent(activationEvent);
    }
  }

  getExtensionState(extensionId: string): ExtensionState | undefined {
    const instance = this._extensionRegistry.getExtensionInstance(extensionId);
    return instance?.state;
  }

  getActivatedExtensions(): IExtension[] {
    return this._extensionRegistry.getAllExtensions().filter(ext => {
      const instance = this._extensionRegistry.getExtensionInstance(ext.id);
      return instance?.state === ExtensionState.Activated;
    });
  }

  dispose(): void {
    if (this._disposed) {
      return;
    }

    this._disposed = true;

    // 停用所有扩展
    this.deactivateAllExtensions().catch(error => {
      console.error('Error deactivating extensions during disposal:', error);
    });

    this._activationEventManager.dispose();
    this._onExtensionActivated.dispose();
    this._onExtensionDeactivated.dispose();
  }
}
