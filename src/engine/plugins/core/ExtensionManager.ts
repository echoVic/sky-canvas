/**
 * 扩展点管理器 - 负责扩展点的定义、注册和管理
 */

import {
  ExtensionPoint,
  ExtensionPointDeclaration,
  ExtensionPointType,
  ExtensionProvider
} from '../types/PluginTypes';

export class ExtensionManager {
  private extensionPoints = new Map<string, ExtensionPoint>();
  private providers = new Map<string, Map<string, ExtensionProvider>>();
  private listeners = new Map<string, Set<Function>>();

  /**
   * 定义扩展点
   */
  defineExtensionPoint(declaration: ExtensionPointDeclaration): void {
    if (this.extensionPoints.has(declaration.id)) {
      throw new Error(`Extension point '${declaration.id}' already exists`);
    }

    const extensionPoint: ExtensionPoint = {
      id: declaration.id,
      type: declaration.type,
      name: declaration.name,
      description: declaration.description,
      providers: []
    };

    this.extensionPoints.set(declaration.id, extensionPoint);
    this.providers.set(declaration.id, new Map());
    
    this.emit('extension-point:defined', extensionPoint);
  }

  /**
   * 注册扩展提供者
   */
  registerProvider(
    extensionPointId: string, 
    provider: ExtensionProvider
  ): void {
    const extensionPoint = this.extensionPoints.get(extensionPointId);
    if (!extensionPoint) {
      throw new Error(`Extension point '${extensionPointId}' not found`);
    }

    const providers = this.providers.get(extensionPointId)!;
    const providerId = `${provider.pluginId}:${provider.extensionId}`;
    
    if (providers.has(providerId)) {
      throw new Error(`Provider '${providerId}' already registered for extension point '${extensionPointId}'`);
    }

    providers.set(providerId, provider);
    extensionPoint.providers.push(provider);
    
    this.emit('provider:registered', extensionPointId, provider);
  }

  /**
   * 注销扩展提供者
   */
  unregisterProvider(extensionPointId: string, pluginId: string, extensionId: string): void {
    const extensionPoint = this.extensionPoints.get(extensionPointId);
    if (!extensionPoint) {
      return;
    }

    const providers = this.providers.get(extensionPointId)!;
    const providerId = `${pluginId}:${extensionId}`;
    
    const provider = providers.get(providerId);
    if (provider) {
      providers.delete(providerId);
      
      const index = extensionPoint.providers.findIndex(p => 
        p.pluginId === pluginId && p.extensionId === extensionId
      );
      if (index >= 0) {
        extensionPoint.providers.splice(index, 1);
      }
      
      this.emit('provider:unregistered', extensionPointId, providerId);
    }
  }

  /**
   * 注销插件的所有扩展提供者
   */
  unregisterPluginProviders(pluginId: string): void {
    for (const [extensionPointId, providers] of this.providers) {
      const toRemove: string[] = [];
      
      for (const [providerId, provider] of providers) {
        if (provider.pluginId === pluginId) {
          toRemove.push(providerId);
        }
      }
      
      for (const providerId of toRemove) {
        const provider = providers.get(providerId)!;
        this.unregisterProvider(extensionPointId, provider.pluginId, provider.extensionId);
      }
    }
  }

  /**
   * 获取扩展点
   */
  getExtensionPoint(id: string): ExtensionPoint | undefined {
    return this.extensionPoints.get(id);
  }

  /**
   * 获取所有扩展点
   */
  getAllExtensionPoints(): ExtensionPoint[] {
    return Array.from(this.extensionPoints.values());
  }

  /**
   * 获取扩展点的提供者
   */
  getProviders(extensionPointId: string): ExtensionProvider[] {
    const extensionPoint = this.extensionPoints.get(extensionPointId);
    return extensionPoint ? [...extensionPoint.providers] : [];
  }

  /**
   * 获取特定类型的扩展点
   */
  getExtensionPointsByType(type: ExtensionPointType): ExtensionPoint[] {
    return Array.from(this.extensionPoints.values())
      .filter(ep => ep.type === type);
  }

  /**
   * 检查扩展点是否存在
   */
  hasExtensionPoint(id: string): boolean {
    return this.extensionPoints.has(id);
  }

  /**
   * 检查提供者是否已注册
   */
  hasProvider(extensionPointId: string, pluginId: string, extensionId: string): boolean {
    const providers = this.providers.get(extensionPointId);
    if (!providers) return false;
    
    const providerId = `${pluginId}:${extensionId}`;
    return providers.has(providerId);
  }

  /**
   * 获取插件的所有扩展提供者
   */
  getPluginProviders(pluginId: string): Map<string, ExtensionProvider[]> {
    const result = new Map<string, ExtensionProvider[]>();
    
    for (const [extensionPointId, providers] of this.providers) {
      const pluginProviders = Array.from(providers.values())
        .filter(provider => provider.pluginId === pluginId);
      
      if (pluginProviders.length > 0) {
        result.set(extensionPointId, pluginProviders);
      }
    }
    
    return result;
  }

  /**
   * 执行扩展点的所有提供者
   */
  async executeProviders<T = any>(
    extensionPointId: string, 
    method: string, 
    ...args: any[]
  ): Promise<T[]> {
    const providers = this.getProviders(extensionPointId);
    const results: T[] = [];
    
    for (const provider of providers) {
      try {
        const implementation = provider.implementation;
        if (implementation && typeof implementation[method] === 'function') {
          const result = await implementation[method](...args);
          results.push(result);
        }
      } catch (error) {
        console.error(`Error executing provider ${provider.pluginId}:${provider.extensionId}`, error);
      }
    }
    
    return results;
  }

  /**
   * 查找第一个匹配的提供者实现
   */
  findProvider<T = any>(
    extensionPointId: string, 
    predicate?: (provider: ExtensionProvider) => boolean
  ): T | undefined {
    const providers = this.getProviders(extensionPointId);
    
    for (const provider of providers) {
      if (!predicate || predicate(provider)) {
        return provider.implementation as T;
      }
    }
    
    return undefined;
  }

  /**
   * 事件监听
   */
  on(event: string, listener: Function): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(listener);
  }

  /**
   * 移除事件监听
   */
  off(event: string, listener: Function): void {
    const listeners = this.listeners.get(event);
    if (listeners) {
      listeners.delete(listener);
    }
  }

  /**
   * 触发事件
   */
  private emit(event: string, ...args: any[]): void {
    const listeners = this.listeners.get(event);
    if (listeners) {
      for (const listener of listeners) {
        try {
          listener(...args);
        } catch (error) {
          console.error(`Error in event listener for '${event}'`, error);
        }
      }
    }
  }

  /**
   * 清理所有扩展点和提供者
   */
  clear(): void {
    this.extensionPoints.clear();
    this.providers.clear();
    this.listeners.clear();
  }

  /**
   * 获取扩展点统计信息
   */
  getStats(): {
    extensionPoints: number;
    totalProviders: number;
    providersByType: Record<ExtensionPointType, number>;
  } {
    const providersByType: Record<ExtensionPointType, number> = {} as any;
    let totalProviders = 0;
    
    for (const extensionPoint of this.extensionPoints.values()) {
      const count = extensionPoint.providers.length;
      totalProviders += count;
      
      if (!providersByType[extensionPoint.type]) {
        providersByType[extensionPoint.type] = 0;
      }
      providersByType[extensionPoint.type] += count;
    }
    
    return {
      extensionPoints: this.extensionPoints.size,
      totalProviders,
      providersByType
    };
  }
}

// 默认扩展点定义
export const DEFAULT_EXTENSION_POINTS: ExtensionPointDeclaration[] = [
  {
    id: 'canvas.tools',
    type: ExtensionPointType.TOOL,
    name: '画布工具',
    description: '注册自定义绘图工具',
    required: false
  },
  {
    id: 'canvas.renderers',
    type: ExtensionPointType.RENDERER,
    name: '渲染器',
    description: '注册自定义渲染器',
    required: false
  },
  {
    id: 'ui.menu',
    type: ExtensionPointType.MENU_ITEM,
    name: '菜单项',
    description: '添加自定义菜单项',
    required: false
  },
  {
    id: 'ui.toolbar',
    type: ExtensionPointType.TOOLBAR_BUTTON,
    name: '工具栏按钮',
    description: '添加自定义工具栏按钮',
    required: false
  },
  {
    id: 'ui.panels',
    type: ExtensionPointType.PANEL,
    name: '面板',
    description: '添加自定义面板',
    required: false
  },
  {
    id: 'file.exporters',
    type: ExtensionPointType.EXPORTER,
    name: '导出器',
    description: '注册文件导出器',
    required: false
  },
  {
    id: 'file.importers',
    type: ExtensionPointType.IMPORTER,
    name: '导入器',
    description: '注册文件导入器',
    required: false
  },
  {
    id: 'canvas.filters',
    type: ExtensionPointType.FILTER,
    name: '滤镜',
    description: '注册图像滤镜',
    required: false
  }
];
