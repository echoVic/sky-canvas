/**
 * 事件分发器 - 统一的事件分发机制
 */

import { IBaseEvent, EventListener } from './InputEvents';

/**
 * 事件分发器
 */
export class EventDispatcher {
  private _listeners: Map<string, Set<EventListener>> = new Map();
  private _onceListeners: Map<string, Set<EventListener>> = new Map();
  private _disposed = false;

  /**
   * 添加事件监听器
   */
  addEventListener<T extends IBaseEvent>(
    type: string, 
    listener: EventListener<T>,
    once: boolean = false
  ): void {
    if (this._disposed) {
      throw new Error('EventDispatcher is disposed');
    }

    const listenersMap = once ? this._onceListeners : this._listeners;
    
    if (!listenersMap.has(type)) {
      listenersMap.set(type, new Set());
    }
    
    listenersMap.get(type)!.add(listener as EventListener);
  }

  /**
   * 移除事件监听器
   */
  removeEventListener<T extends IBaseEvent>(
    type: string, 
    listener: EventListener<T>
  ): void {
    if (this._disposed) {
      return;
    }

    const listeners = this._listeners.get(type);
    if (listeners) {
      listeners.delete(listener as EventListener);
    }
    
    const onceListeners = this._onceListeners.get(type);
    if (onceListeners) {
      onceListeners.delete(listener as EventListener);
    }
  }

  /**
   * 分发事件
   */
  dispatchEvent(event: IBaseEvent): boolean {
    if (this._disposed) {
      return false;
    }

    const listeners = this._listeners.get(event.type);
    const onceListeners = this._onceListeners.get(event.type);
    
    // 执行普通监听器
    if (listeners) {
      for (const listener of listeners) {
        if (event.isPropagationStopped()) break;
        try {
          listener(event);
        } catch (error) {
          console.error('Event listener error:', error);
        }
      }
    }
    
    // 执行一次性监听器
    if (onceListeners) {
      for (const listener of onceListeners) {
        if (event.isPropagationStopped()) break;
        try {
          listener(event);
        } catch (error) {
          console.error('Once event listener error:', error);
        }
      }
      // 清空一次性监听器
      onceListeners.clear();
    }
    
    return !event.isDefaultPrevented();
  }

  /**
   * 添加一次性事件监听器
   */
  once<T extends IBaseEvent>(
    type: string, 
    listener: EventListener<T>
  ): void {
    this.addEventListener(type, listener, true);
  }

  /**
   * 移除所有监听器
   */
  removeAllListeners(type?: string): void {
    if (this._disposed) {
      return;
    }

    if (type) {
      this._listeners.delete(type);
      this._onceListeners.delete(type);
    } else {
      this._listeners.clear();
      this._onceListeners.clear();
    }
  }

  /**
   * 检查是否有监听器
   */
  hasListeners(type: string): boolean {
    const listeners = this._listeners.get(type);
    const onceListeners = this._onceListeners.get(type);
    
    return (listeners?.size ?? 0) > 0 || (onceListeners?.size ?? 0) > 0;
  }

  /**
   * 获取监听器数量
   */
  getListenerCount(type: string): number {
    const listeners = this._listeners.get(type);
    const onceListeners = this._onceListeners.get(type);
    
    return (listeners?.size || 0) + (onceListeners?.size || 0);
  }

  /**
   * 获取所有事件类型
   */
  getEventTypes(): string[] {
    const allTypes = new Set<string>();
    
    for (const type of this._listeners.keys()) {
      allTypes.add(type);
    }
    
    for (const type of this._onceListeners.keys()) {
      allTypes.add(type);
    }
    
    return Array.from(allTypes);
  }

  /**
   * 销毁分发器
   */
  dispose(): void {
    if (this._disposed) {
      return;
    }

    this._disposed = true;
    this._listeners.clear();
    this._onceListeners.clear();
  }
}

/**
 * 全局事件分发器
 */
export class GlobalEventDispatcher extends EventDispatcher {
  private static _instance?: GlobalEventDispatcher;

  static getInstance(): GlobalEventDispatcher {
    if (!GlobalEventDispatcher._instance) {
      GlobalEventDispatcher._instance = new GlobalEventDispatcher();
    }
    return GlobalEventDispatcher._instance;
  }

  static dispose(): void {
    if (GlobalEventDispatcher._instance) {
      GlobalEventDispatcher._instance.dispose();
      GlobalEventDispatcher._instance = undefined;
    }
  }
}