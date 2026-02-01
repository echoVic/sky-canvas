/**
 * 插件上下文工厂
 * 创建插件运行时所需的各种管理器
 */

import type { IEventBus } from '../events/EventBus'
import type {
  DialogConfig,
  MenuItemConfig,
  NotificationConfig,
  PanelConfig,
  PluginContext,
  PluginLogger,
  PluginResourceManager,
  PluginStorage,
  PluginUIManager,
  ToolbarButtonConfig,
} from './PluginSystemTypes'

/**
 * 插件上下文工厂类
 */
export class PluginContextFactory {
  constructor(private eventBus: IEventBus) {}

  /**
   * 创建插件上下文
   */
  createContext(pluginId: string, config: unknown): PluginContext {
    return {
      renderEngine: null,
      eventBus: this.eventBus,
      pluginId,
      pluginPath: '',
      config,
      resources: this.createResourceManager(pluginId),
      logger: this.createLogger(pluginId),
      storage: this.createStorage(pluginId),
      ui: this.createUIManager(pluginId),
    }
  }

  /**
   * 创建资源管理器
   */
  private createResourceManager(_pluginId: string): PluginResourceManager {
    return {
      async loadTexture(path: string): Promise<HTMLImageElement> {
        const img = new Image()
        img.src = path
        return new Promise((resolve, reject) => {
          img.onload = () => resolve(img)
          img.onerror = reject
        })
      },

      async loadShader(path: string): Promise<string> {
        const response = await fetch(path)
        return response.text()
      },

      async loadAudio(path: string): Promise<AudioBuffer> {
        const response = await fetch(path)
        const arrayBuffer = await response.arrayBuffer()
        const audioContext = new AudioContext()
        return audioContext.decodeAudioData(arrayBuffer)
      },

      async loadJSON(path: string): Promise<unknown> {
        const response = await fetch(path)
        return response.json()
      },

      getAssetUrl(path: string): string {
        return path
      },

      dispose(): void {
        // TODO: 清理资源
      },
    }
  }

  /**
   * 创建日志器
   */
  private createLogger(pluginId: string): PluginLogger {
    const prefix = `[Plugin:${pluginId}]`
    return {
      debug: (message: string, ...args: unknown[]) => console.debug(prefix, message, ...args),
      info: (message: string, ...args: unknown[]) => console.info(prefix, message, ...args),
      warn: (message: string, ...args: unknown[]) => console.warn(prefix, message, ...args),
      error: (message: string, ...args: unknown[]) => console.error(prefix, message, ...args),
    }
  }

  /**
   * 创建存储管理器
   */
  private createStorage(pluginId: string): PluginStorage {
    const prefix = `plugin_${pluginId}_`

    return {
      get(key: string): unknown {
        const fullKey = prefix + key
        const value = localStorage.getItem(fullKey)
        return value ? JSON.parse(value) : undefined
      },

      set(key: string, value: unknown): void {
        const fullKey = prefix + key
        localStorage.setItem(fullKey, JSON.stringify(value))
      },

      remove(key: string): void {
        const fullKey = prefix + key
        localStorage.removeItem(fullKey)
      },

      clear(): void {
        const keys = Object.keys(localStorage).filter((key) => key.startsWith(prefix))
        keys.forEach((key) => {
          localStorage.removeItem(key)
        })
      },

      keys(): string[] {
        return Object.keys(localStorage)
          .filter((key) => key.startsWith(prefix))
          .map((key) => key.substring(prefix.length))
      },
    }
  }

  /**
   * 创建UI管理器
   */
  private createUIManager(_pluginId: string): PluginUIManager {
    return {
      addMenuItem: (_item: MenuItemConfig) => {
        // TODO: 实现菜单项添加
      },

      addToolbarButton: (_button: ToolbarButtonConfig) => {
        // TODO: 实现工具栏按钮添加
      },

      addPanel: (_panel: PanelConfig) => {
        // TODO: 实现面板添加
      },

      async showDialog(config: DialogConfig): Promise<unknown> {
        return new Promise((resolve) => {
          if (confirm(config.message)) {
            resolve(0)
          } else {
            resolve(1)
          }
        })
      },

      showNotification: (config: NotificationConfig) => {
        console.info(`[Notification] ${config.title}: ${config.message}`)
      },
    }
  }
}
