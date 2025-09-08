/**
 * 事件总线服务实现
 */

import { injectable } from '../di/ServiceIdentifier';
import { IEventBusService } from '../di/ServiceIdentifiers';

/**
 * 事件监听器接口
 */
interface EventListener<T = any> {
  handler: (data: T) => void;
  once: boolean;
}

/**
 * 事件总线服务实现
 */
@injectable
export class EventBusService implements IEventBusService {
  private listeners: Map<string, EventListener[]> = new Map();
  private maxListeners = 100; // 防止内存泄漏
  
  /**
   * 发出事件
   */
  emit<T>(event: string, data: T): void {
    const eventListeners = this.listeners.get(event);
    if (!eventListeners || eventListeners.length === 0) {
      return;
    }
    
    // 创建监听器副本，避免在触发过程中修改原数组
    const listenersToCall = [...eventListeners];
    
    // 移除一次性监听器
    const remainingListeners = eventListeners.filter(listener => !listener.once);
    this.listeners.set(event, remainingListeners);
    
    // 触发所有监听器
    for (const listener of listenersToCall) {
      try {
        listener.handler(data);
      } catch (error) {
        console.error(`Error in event listener for "${event}":`, error);
      }
    }
  }
  
  /**
   * 监听事件
   */
  on<T>(event: string, handler: (data: T) => void): void {
    this.addListener(event, handler, false);
  }
  
  /**
   * 监听事件（一次性）
   */
  once<T>(event: string, handler: (data: T) => void): void {
    this.addListener(event, handler, true);
  }
  
  /**
   * 取消监听事件
   */
  off(event: string, handler?: Function): void {
    const eventListeners = this.listeners.get(event);
    if (!eventListeners) {
      return;
    }
    
    if (!handler) {
      // 移除所有监听器
      this.listeners.delete(event);
      return;
    }
    
    // 移除指定监听器
    const filteredListeners = eventListeners.filter(
      listener => listener.handler !== handler
    );
    
    if (filteredListeners.length === 0) {
      this.listeners.delete(event);
    } else {
      this.listeners.set(event, filteredListeners);
    }
  }
  
  /**
   * 移除所有监听器
   */
  removeAllListeners(event?: string): void {
    if (event) {
      this.listeners.delete(event);
    } else {
      this.listeners.clear();
    }
  }
  
  /**
   * 添加监听器
   */
  private addListener(event: string, handler: Function, once: boolean): void {
    let eventListeners = this.listeners.get(event);
    if (!eventListeners) {
      eventListeners = [];
      this.listeners.set(event, eventListeners);
    }
    
    // 检查是否超过最大监听器数量
    if (eventListeners.length >= this.maxListeners) {
      console.warn(
        `Event "${event}" has ${eventListeners.length} listeners. ` +
        'Possible memory leak detected.'
      );
    }
    
    eventListeners.push({ handler: handler as any, once });
  }
  
  /**
   * 获取事件的监听器数量
   */
  listenerCount(event: string): number {
    const eventListeners = this.listeners.get(event);
    return eventListeners ? eventListeners.length : 0;
  }
  
  /**
   * 获取所有事件名称
   */
  eventNames(): string[] {
    return Array.from(this.listeners.keys());
  }
  
  /**
   * 设置最大监听器数量
   */
  setMaxListeners(max: number): void {
    this.maxListeners = Math.max(0, max);
  }
  
  /**
   * 获取最大监听器数量
   */
  getMaxListeners(): number {
    return this.maxListeners;
  }
}
