/**
 * 快捷键服务 - 处理键盘快捷键功能
 * 功能单一：只负责快捷键的注册、监听和触发
 */

import { createServiceIdentifier, injectable, inject } from '../../di/ServiceIdentifier';
import { IEventBusService } from '../eventBus/eventBusService';

/**
 * 快捷键配置
 */
export interface IShortcutConfig {
  key: string;
  ctrlKey?: boolean;
  shiftKey?: boolean;
  altKey?: boolean;
  metaKey?: boolean;
  description?: string;
}

/**
 * 快捷键处理器
 */
export type ShortcutHandler = (event: KeyboardEvent) => void | boolean;

/**
 * 快捷键事件数据
 */
export interface IShortcutEventData {
  shortcutId: string;
  config: IShortcutConfig;
  event: KeyboardEvent;
}

/**
 * 快捷键服务接口
 */
export interface IShortcutService {
  register(id: string, config: IShortcutConfig, handler: ShortcutHandler): void;
  unregister(id: string): void;
  enable(): void;
  disable(): void;
  isEnabled(): boolean;
  getRegisteredShortcuts(): Map<string, { config: IShortcutConfig; handler: ShortcutHandler }>;
  clear(): void;
}

/**
 * 快捷键服务标识符
 */
export const IShortcutService = createServiceIdentifier<IShortcutService>('ShortcutService');

/**
 * 快捷键服务实现
 */
@injectable
export class ShortcutService implements IShortcutService {
  private shortcuts = new Map<string, { config: IShortcutConfig; handler: ShortcutHandler }>();
  private enabled = false;
  private boundHandler: (event: KeyboardEvent) => void;

  constructor(
    @inject(IEventBusService) private eventBus: IEventBusService
  ) {
    this.boundHandler = this.handleKeydown.bind(this);
  }

  register(id: string, config: IShortcutConfig, handler: ShortcutHandler): void {
    this.shortcuts.set(id, { config, handler });
    this.eventBus.emit('shortcut:registered', { id, config });
  }

  unregister(id: string): void {
    if (this.shortcuts.delete(id)) {
      this.eventBus.emit('shortcut:unregistered', { id });
    }
  }

  enable(): void {
    if (this.enabled) return;
    
    this.enabled = true;
    document.addEventListener('keydown', this.boundHandler, true);
    this.eventBus.emit('shortcut:enabled', {});
  }

  disable(): void {
    if (!this.enabled) return;
    
    this.enabled = false;
    document.removeEventListener('keydown', this.boundHandler, true);
    this.eventBus.emit('shortcut:disabled', {});
  }

  isEnabled(): boolean {
    return this.enabled;
  }

  getRegisteredShortcuts(): Map<string, { config: IShortcutConfig; handler: ShortcutHandler }> {
    return new Map(this.shortcuts);
  }

  clear(): void {
    this.shortcuts.clear();
    this.eventBus.emit('shortcut:cleared', {});
  }

  /**
   * 处理键盘事件
   */
  private handleKeydown(event: KeyboardEvent): void {
    // 忽略在输入框中的按键
    const target = event.target as HTMLElement;
    if (target && (
      target.tagName === 'INPUT' ||
      target.tagName === 'TEXTAREA' ||
      target.contentEditable === 'true'
    )) {
      return;
    }

    // 查找匹配的快捷键
    for (const [id, { config, handler }] of this.shortcuts) {
      if (this.matchesShortcut(event, config)) {
        // 发布快捷键触发事件
        this.eventBus.emit<IShortcutEventData>('shortcut:triggered', {
          shortcutId: id,
          config,
          event
        });

        // 调用处理器
        const result = handler(event);
        
        // 如果处理器返回 false，阻止默认行为和事件传播
        if (result !== false) {
          event.preventDefault();
          event.stopPropagation();
        }
        
        break; // 只触发第一个匹配的快捷键
      }
    }
  }

  /**
   * 检查键盘事件是否匹配快捷键配置
   */
  private matchesShortcut(event: KeyboardEvent, config: IShortcutConfig): boolean {
    // 检查主键
    if (event.key.toLowerCase() !== config.key.toLowerCase()) {
      return false;
    }

    // 检查修饰键
    if (!!event.ctrlKey !== !!config.ctrlKey) return false;
    if (!!event.shiftKey !== !!config.shiftKey) return false;
    if (!!event.altKey !== !!config.altKey) return false;
    if (!!event.metaKey !== !!config.metaKey) return false;

    return true;
  }
}