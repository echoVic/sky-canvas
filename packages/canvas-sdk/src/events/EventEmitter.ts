/**
 * 事件发射器 - 简化版本用于兼容
 */

/**
 * 事件监听器类型
 */
export type EventListener = (...args: any[]) => void;

/**
 * 事件发射器类
 */
export class EventEmitter {
  private events: Map<string, EventListener[]> = new Map();

  /**
   * 添加事件监听器
   */
  on(event: string, listener: EventListener): this {
    if (!this.events.has(event)) {
      this.events.set(event, []);
    }
    this.events.get(event)!.push(listener);
    return this;
  }

  /**
   * 添加一次性事件监听器
   */
  once(event: string, listener: EventListener): this {
    const onceListener = (...args: any[]) => {
      listener(...args);
      this.off(event, onceListener);
    };
    this.on(event, onceListener);
    return this;
  }

  /**
   * 移除事件监听器
   */
  off(event: string, listener?: EventListener): this {
    if (!listener) {
      this.events.delete(event);
      return this;
    }

    const listeners = this.events.get(event);
    if (listeners) {
      const index = listeners.indexOf(listener);
      if (index !== -1) {
        listeners.splice(index, 1);
      }
      if (listeners.length === 0) {
        this.events.delete(event);
      }
    }
    return this;
  }

  /**
   * 触发事件
   */
  emit(event: string, ...args: any[]): this {
    const listeners = this.events.get(event);
    if (listeners) {
      for (const listener of listeners) {
        try {
          listener(...args);
        } catch (error) {
          console.error(`Error in event listener for "${event}":`, error);
        }
      }
    }
    return this;
  }

  /**
   * 获取事件监听器数量
   */
  listenerCount(event: string): number {
    const listeners = this.events.get(event);
    return listeners ? listeners.length : 0;
  }

  /**
   * 获取所有事件名称
   */
  eventNames(): string[] {
    return Array.from(this.events.keys());
  }

  /**
   * 移除所有监听器
   */
  removeAllListeners(event?: string): this {
    if (event) {
      this.events.delete(event);
    } else {
      this.events.clear();
    }
    return this;
  }
}