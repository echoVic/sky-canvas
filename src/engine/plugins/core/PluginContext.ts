/**
 * 插件上下文实现 - 为插件提供API访问和服务
 */

import { 
  PluginContext, 
  PluginManifest, 
  PluginAPI, 
  PluginConfig, 
  PluginEventEmitter, 
  PluginResourceManager, 
  PluginLogger,
  MenuItem,
  ToolbarButton,
  Panel,
  Dialog,
  Notification,
  FileFilter,
  Tool,
  CustomRenderer
} from '../types/PluginTypes';
import { PluginManager } from './PluginManager';

export class PluginContextImpl implements PluginContext {
  public readonly manifest: PluginManifest;
  public readonly api: PluginAPI;
  public readonly config: PluginConfig;
  public readonly events: PluginEventEmitter;
  public readonly resources: PluginResourceManager;
  public readonly logger: PluginLogger;

  constructor(manifest: PluginManifest, pluginManager: PluginManager) {
    this.manifest = manifest;
    this.api = new PluginAPIImpl(manifest.id, pluginManager);
    this.config = new PluginConfigImpl(manifest.id);
    this.events = new PluginEventEmitterImpl();
    this.resources = new PluginResourceManagerImpl(manifest.id);
    this.logger = new PluginLoggerImpl(manifest.id);
  }
}

/**
 * 插件API实现
 */
class PluginAPIImpl implements PluginAPI {
  constructor(
    private pluginId: string,
    private pluginManager: PluginManager
  ) {}

  canvas = {
    getRenderer: () => {
      this.checkPermission('canvas.getRenderer');
      // 返回当前渲染器实例
      return window.currentRenderer || null;
    },

    addShape: (shape: any) => {
      this.checkPermission('canvas.addShape');
      // 添加图形到画布
      const event = new CustomEvent('plugin:addShape', { detail: { shape, pluginId: this.pluginId } });
      window.dispatchEvent(event);
    },

    removeShape: (id: string) => {
      this.checkPermission('canvas.removeShape');
      // 从画布移除图形
      const event = new CustomEvent('plugin:removeShape', { detail: { id, pluginId: this.pluginId } });
      window.dispatchEvent(event);
    },

    updateShape: (id: string, updates: any) => {
      this.checkPermission('canvas.updateShape');
      // 更新图形
      const event = new CustomEvent('plugin:updateShape', { detail: { id, updates, pluginId: this.pluginId } });
      window.dispatchEvent(event);
    },

    getShapes: () => {
      this.checkPermission('canvas.getShapes');
      // 获取所有图形
      return window.currentShapes || [];
    },

    clear: () => {
      this.checkPermission('canvas.clear');
      // 清空画布
      const event = new CustomEvent('plugin:clearCanvas', { detail: { pluginId: this.pluginId } });
      window.dispatchEvent(event);
    }
  };

  ui = {
    addMenuItem: (item: MenuItem) => {
      this.checkPermission('ui.addMenuItem');
      const event = new CustomEvent('plugin:addMenuItem', { 
        detail: { item: { ...item, pluginId: this.pluginId } } 
      });
      window.dispatchEvent(event);
    },

    removeMenuItem: (id: string) => {
      this.checkPermission('ui.removeMenuItem');
      const event = new CustomEvent('plugin:removeMenuItem', { 
        detail: { id, pluginId: this.pluginId } 
      });
      window.dispatchEvent(event);
    },

    addToolbarButton: (button: ToolbarButton) => {
      this.checkPermission('ui.addToolbarButton');
      const event = new CustomEvent('plugin:addToolbarButton', { 
        detail: { button: { ...button, pluginId: this.pluginId } } 
      });
      window.dispatchEvent(event);
    },

    removeToolbarButton: (id: string) => {
      this.checkPermission('ui.removeToolbarButton');
      const event = new CustomEvent('plugin:removeToolbarButton', { 
        detail: { id, pluginId: this.pluginId } 
      });
      window.dispatchEvent(event);
    },

    addPanel: (panel: Panel) => {
      this.checkPermission('ui.addPanel');
      const event = new CustomEvent('plugin:addPanel', { 
        detail: { panel: { ...panel, pluginId: this.pluginId } } 
      });
      window.dispatchEvent(event);
    },

    removePanel: (id: string) => {
      this.checkPermission('ui.removePanel');
      const event = new CustomEvent('plugin:removePanel', { 
        detail: { id, pluginId: this.pluginId } 
      });
      window.dispatchEvent(event);
    },

    showDialog: async (dialog: Dialog): Promise<any> => {
      this.checkPermission('ui.showDialog');
      return new Promise((resolve) => {
        const event = new CustomEvent('plugin:showDialog', { 
          detail: { 
            dialog: { ...dialog, pluginId: this.pluginId },
            callback: resolve
          } 
        });
        window.dispatchEvent(event);
      });
    },

    showNotification: (notification: Notification) => {
      this.checkPermission('ui.showNotification');
      const event = new CustomEvent('plugin:showNotification', { 
        detail: { notification: { ...notification, pluginId: this.pluginId } } 
      });
      window.dispatchEvent(event);
    }
  };

  file = {
    open: async (filters?: FileFilter[]): Promise<File | null> => {
      this.checkPermission('file.open');
      return new Promise((resolve) => {
        const input = document.createElement('input');
        input.type = 'file';
        if (filters && filters.length > 0) {
          input.accept = filters.map(f => f.extensions.map(ext => `.${ext}`).join(',')).join(',');
        }
        input.onchange = (e) => {
          const file = (e.target as HTMLInputElement).files?.[0] || null;
          resolve(file);
        };
        input.click();
      });
    },

    save: async (data: any, filename?: string): Promise<void> => {
      this.checkPermission('file.save');
      const blob = new Blob([JSON.stringify(data)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename || 'plugin-data.json';
      a.click();
      URL.revokeObjectURL(url);
    },

    import: async (data: any): Promise<void> => {
      this.checkPermission('file.import');
      const event = new CustomEvent('plugin:importData', { 
        detail: { data, pluginId: this.pluginId } 
      });
      window.dispatchEvent(event);
    },

    export: async (format: string): Promise<any> => {
      this.checkPermission('file.export');
      return new Promise((resolve) => {
        const event = new CustomEvent('plugin:exportData', { 
          detail: { format, pluginId: this.pluginId, callback: resolve } 
        });
        window.dispatchEvent(event);
      });
    }
  };

  tools = {
    register: (tool: Tool) => {
      this.checkPermission('tools.register');
      const event = new CustomEvent('plugin:registerTool', { 
        detail: { tool: { ...tool, pluginId: this.pluginId } } 
      });
      window.dispatchEvent(event);
    },

    unregister: (id: string) => {
      this.checkPermission('tools.unregister');
      const event = new CustomEvent('plugin:unregisterTool', { 
        detail: { id, pluginId: this.pluginId } 
      });
      window.dispatchEvent(event);
    },

    getActive: (): Tool | null => {
      return window.currentTool || null;
    },

    setActive: (id: string) => {
      this.checkPermission('tools.setActive');
      const event = new CustomEvent('plugin:setActiveTool', { 
        detail: { id, pluginId: this.pluginId } 
      });
      window.dispatchEvent(event);
    }
  };

  renderers = {
    register: (renderer: CustomRenderer) => {
      this.checkPermission('renderers.register');
      const event = new CustomEvent('plugin:registerRenderer', { 
        detail: { renderer: { ...renderer, pluginId: this.pluginId } } 
      });
      window.dispatchEvent(event);
    },

    unregister: (id: string) => {
      this.checkPermission('renderers.unregister');
      const event = new CustomEvent('plugin:unregisterRenderer', { 
        detail: { id, pluginId: this.pluginId } 
      });
      window.dispatchEvent(event);
    },

    getAvailable: (): CustomRenderer[] => {
      return window.availableRenderers || [];
    }
  };

  private checkPermission(apiPath: string): void {
    const permissionManager = this.pluginManager.getPermissionManager();
    if (!permissionManager.validateAPICall(this.pluginId, apiPath)) {
      throw new Error(`Permission denied for API call: ${apiPath}`);
    }
  }
}

/**
 * 插件配置实现
 */
class PluginConfigImpl implements PluginConfig {
  private storage = new Map<string, any>();
  private storageKey: string;

  constructor(pluginId: string) {
    this.storageKey = `plugin_config_${pluginId}`;
    this.loadFromStorage();
  }

  get<T = any>(key: string, defaultValue?: T): T {
    return this.storage.has(key) ? this.storage.get(key) : defaultValue;
  }

  set(key: string, value: any): void {
    this.storage.set(key, value);
    this.saveToStorage();
  }

  has(key: string): boolean {
    return this.storage.has(key);
  }

  delete(key: string): void {
    this.storage.delete(key);
    this.saveToStorage();
  }

  clear(): void {
    this.storage.clear();
    this.saveToStorage();
  }

  getAll(): Record<string, any> {
    const result: Record<string, any> = {};
    for (const [key, value] of this.storage) {
      result[key] = value;
    }
    return result;
  }

  private loadFromStorage(): void {
    try {
      const stored = localStorage.getItem(this.storageKey);
      if (stored) {
        const data = JSON.parse(stored);
        for (const [key, value] of Object.entries(data)) {
          this.storage.set(key, value);
        }
      }
    } catch (error) {
      console.error('Error loading plugin config from storage', error);
    }
  }

  private saveToStorage(): void {
    try {
      const data = this.getAll();
      localStorage.setItem(this.storageKey, JSON.stringify(data));
    } catch (error) {
      console.error('Error saving plugin config to storage', error);
    }
  }
}

/**
 * 插件事件发射器实现
 */
class PluginEventEmitterImpl implements PluginEventEmitter {
  private listeners = new Map<string, Set<Function>>();

  on(event: string, listener: (...args: any[]) => void): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(listener);
  }

  off(event: string, listener: (...args: any[]) => void): void {
    const listeners = this.listeners.get(event);
    if (listeners) {
      listeners.delete(listener);
    }
  }

  emit(event: string, ...args: any[]): void {
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

  once(event: string, listener: (...args: any[]) => void): void {
    const onceListener = (...args: any[]) => {
      this.off(event, onceListener);
      listener(...args);
    };
    this.on(event, onceListener);
  }
}

/**
 * 插件资源管理器实现
 */
class PluginResourceManagerImpl implements PluginResourceManager {
  private cache = new Map<string, any>();
  private baseUrl: string;

  constructor(pluginId: string) {
    this.baseUrl = `/plugins/${pluginId}/assets/`;
  }

  async loadAsset(path: string): Promise<any> {
    if (this.cache.has(path)) {
      return this.cache.get(path);
    }

    try {
      const url = this.getAssetUrl(path);
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`Failed to load asset: ${path}`);
      }

      let asset;
      const contentType = response.headers.get('content-type');
      
      if (contentType?.includes('application/json')) {
        asset = await response.json();
      } else if (contentType?.includes('text/')) {
        asset = await response.text();
      } else {
        asset = await response.blob();
      }

      this.cache.set(path, asset);
      return asset;
    } catch (error) {
      console.error(`Error loading asset '${path}'`, error);
      throw error;
    }
  }

  getAssetUrl(path: string): string {
    return this.baseUrl + path;
  }

  async preloadAssets(paths: string[]): Promise<void> {
    const promises = paths.map(path => this.loadAsset(path));
    await Promise.all(promises);
  }

  cleanup(): void {
    this.cache.clear();
  }
}

/**
 * 插件日志记录器实现
 */
class PluginLoggerImpl implements PluginLogger {
  constructor(private pluginId: string) {}

  debug(message: string, ...args: any[]): void {
    console.debug(`[Plugin:${this.pluginId}]`, message, ...args);
  }

  info(message: string, ...args: any[]): void {
    console.info(`[Plugin:${this.pluginId}]`, message, ...args);
  }

  warn(message: string, ...args: any[]): void {
    console.warn(`[Plugin:${this.pluginId}]`, message, ...args);
  }

  error(message: string, ...args: any[]): void {
    console.error(`[Plugin:${this.pluginId}]`, message, ...args);
  }
}
