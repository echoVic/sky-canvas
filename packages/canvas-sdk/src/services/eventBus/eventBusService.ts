/**
 * 事件总线服务
 */

import { createServiceIdentifier, injectable } from '../../di/ServiceIdentifier';

/**
 * 事件总线服务接口
 */
export interface IEventBusService {
  emit<T>(event: string, data: T): void;
  on<T>(event: string, handler: (data: T) => void): void;
  off(event: string, handler?: Function): void;
  once<T>(event: string, handler: (data: T) => void): void;
  removeAllListeners(event?: string): void;
}

/**
 * 事件总线服务标识符
 */
export const IEventBusService = createServiceIdentifier<IEventBusService>('EventBusService');

/**
 * 事件总线服务实现 - 集成VSCode风格的事件系统
 */
@injectable
export class EventBusService implements IEventBusService {
  private listeners = new Map<string, Function[]>();

  emit<T>(event: string, data: T): void {
    const handlers = this.listeners.get(event);
    if (handlers) {
      handlers.forEach(handler => {
        try {
          handler(data);
        } catch (error) {
          console.error(`Error in event handler for "${event}":`, error);
        }
      });
    }
  }

  on<T>(event: string, handler: (data: T) => void): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event)!.push(handler);
  }

  off(event: string, handler?: Function): void {
    if (!handler) {
      this.listeners.delete(event);
      return;
    }

    const handlers = this.listeners.get(event);
    if (handlers) {
      const index = handlers.indexOf(handler);
      if (index > -1) {
        handlers.splice(index, 1);
      }
      if (handlers.length === 0) {
        this.listeners.delete(event);
      }
    }
  }

  once<T>(event: string, handler: (data: T) => void): void {
    const onceHandler = (data: T) => {
      handler(data);
      this.off(event, onceHandler);
    };
    this.on(event, onceHandler);
  }

  removeAllListeners(event?: string): void {
    if (event) {
      this.listeners.delete(event);
    } else {
      this.listeners.clear();
    }
  }
}