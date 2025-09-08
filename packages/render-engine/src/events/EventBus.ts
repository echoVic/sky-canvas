/**
 * 事件总线接口和实现
 */

/**
 * 可释放资源的接口
 */
export interface IDisposable {
  dispose(): void;
}

/**
 * 事件监听器类型
 */
export type EventListener<T = any> = (event: T) => void;

/**
 * 事件总线类
 */
export class EventBus implements IDisposable {
  private listeners: Map<string, Set<EventListener>> = new Map();

  /**
   * 添加事件监听器
   */
  on<T = any>(eventType: string, listener: EventListener<T>): void {
    if (!this.listeners.has(eventType)) {
      this.listeners.set(eventType, new Set());
    }
    this.listeners.get(eventType)!.add(listener);
  }

  /**
   * 移除事件监听器
   */
  off<T = any>(eventType: string, listener: EventListener<T>): void {
    const listeners = this.listeners.get(eventType);
    if (listeners) {
      listeners.delete(listener);
      if (listeners.size === 0) {
        this.listeners.delete(eventType);
      }
    }
  }

  /**
   * 触发事件
   */
  emit<T = any>(eventType: string, event: T): void {
    const listeners = this.listeners.get(eventType);
    if (listeners) {
      listeners.forEach(listener => {
        try {
          listener(event);
        } catch (error) {
          console.error(`Error in event listener for ${eventType}:`, error);
        }
      });
    }
  }

  /**
   * 一次性事件监听器
   */
  once<T = any>(eventType: string, listener: EventListener<T>): void {
    const onceListener = (event: T) => {
      this.off(eventType, onceListener);
      listener(event);
    };
    this.on(eventType, onceListener);
  }

  /**
   * 清理所有监听器
   */
  dispose(): void {
    this.listeners.clear();
  }

  /**
   * 获取事件类型列表
   */
  getEventTypes(): string[] {
    return Array.from(this.listeners.keys());
  }

  /**
   * 获取指定事件的监听器数量
   */
  getListenerCount(eventType: string): number {
    const listeners = this.listeners.get(eventType);
    return listeners ? listeners.size : 0;
  }
}

/**
 * 默认事件总线实例
 */
export const eventBus = new EventBus();