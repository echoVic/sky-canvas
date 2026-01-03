/**
 * 快捷键服务 - 处理键盘快捷键功能
 * 功能单一：只负责快捷键的注册、监听和触发
 */

import { createDecorator } from '../../di';

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
  readonly _serviceBrand: undefined;
  register(id: string, config: IShortcutConfig, handler: ShortcutHandler): void;
  unregister(id: string): void;
  enable(): void;
  disable(): void;
  isEnabled(): boolean;
  getRegisteredShortcuts(): Map<string, { config: IShortcutConfig; handler: ShortcutHandler }>;
  clear(): void;
  dispose(): void;
}

/**
 * 快捷键服务标识符
 */
export const IShortcutService = createDecorator<IShortcutService>('ShortcutService');

/**
 * 快捷键服务实现
 */
export class ShortcutService implements IShortcutService {
  readonly _serviceBrand: undefined;
  private shortcuts = new Map<string, { config: IShortcutConfig; handler: ShortcutHandler }>();
  private enabled = false;
  private boundHandler: (event: KeyboardEvent) => void;

  constructor() {
    this.boundHandler = this.handleKeydown.bind(this);
  }

  register(id: string, config: IShortcutConfig, handler: ShortcutHandler): void {
    this.shortcuts.set(id, { config, handler });
  }

  unregister(id: string): void {
    this.shortcuts.delete(id);
  }

  enable(): void {
    if (this.enabled) return;
    
    this.enabled = true;
    document.addEventListener('keydown', this.boundHandler, true);
  }

  disable(): void {
    if (!this.enabled) return;
    
    this.enabled = false;
    document.removeEventListener('keydown', this.boundHandler, true);
  }

  isEnabled(): boolean {
    return this.enabled;
  }

  getRegisteredShortcuts(): Map<string, { config: IShortcutConfig; handler: ShortcutHandler }> {
    return new Map(this.shortcuts);
  }

  clear(): void {
    this.shortcuts.clear();
  }

  dispose(): void {
    this.disable();
    this.shortcuts.clear();
  }

  private handleKeydown(event: KeyboardEvent): void {
    const target = event.target as HTMLElement;
    if (target && (
      target.tagName === 'INPUT' ||
      target.tagName === 'TEXTAREA' ||
      target.contentEditable === 'true'
    )) {
      return;
    }

    for (const [_id, { config, handler }] of this.shortcuts) {
      if (this.matchesShortcut(event, config)) {
        const result = handler(event);
        
        if (result !== false) {
          event.preventDefault();
          event.stopPropagation();
        }
        
        break;
      }
    }
  }

  /**
   * 检查键盘事件是否匹配快捷键配置
   */
  private matchesShortcut(event: KeyboardEvent, config: IShortcutConfig): boolean {
    if (event.key.toLowerCase() !== config.key.toLowerCase()) {
      return false;
    }

    if (!!event.ctrlKey !== !!config.ctrlKey) return false;
    if (!!event.shiftKey !== !!config.shiftKey) return false;
    if (!!event.altKey !== !!config.altKey) return false;
    if (!!event.metaKey !== !!config.metaKey) return false;

    return true;
  }
}
