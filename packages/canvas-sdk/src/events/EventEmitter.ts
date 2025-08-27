/**
 * 事件发射器实现
 */

/**
 * 事件监听器类型
 */
type EventListener<T> = (data: T) => void;

/**
 * 事件发射器基类
 */
export class EventEmitter<TEvents extends Record<string, any>> {
  private listeners: Map<keyof TEvents, Set<EventListener<any>>> = new Map();

  /**
   * 添加事件监听器
   * @param event 事件名称
   * @param listener 监听器函数
   */
  on<K extends keyof TEvents>(event: K, listener: EventListener<TEvents[K]>): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(listener);
  }

  /**
   * 移除事件监听器
   * @param event 事件名称
   * @param listener 监听器函数
   */
  off<K extends keyof TEvents>(event: K, listener: EventListener<TEvents[K]>): void {
    const eventListeners = this.listeners.get(event);
    if (eventListeners) {
      eventListeners.delete(listener);
      if (eventListeners.size === 0) {
        this.listeners.delete(event);
      }
    }
  }

  /**
   * 添加一次性事件监听器
   * @param event 事件名称
   * @param listener 监听器函数
   */
  once<K extends keyof TEvents>(event: K, listener: EventListener<TEvents[K]>): void {
    const onceWrapper = (data: TEvents[K]) => {
      listener(data);
      this.off(event, onceWrapper);
    };
    this.on(event, onceWrapper);
  }

  /**
   * 触发事件
   * @param event 事件名称
   * @param data 事件数据
   */
  emit<K extends keyof TEvents>(event: K, data: TEvents[K]): void {
    const eventListeners = this.listeners.get(event);
    if (eventListeners) {
      // 复制监听器集合，避免在触发过程中修改导致问题
      const listeners = Array.from(eventListeners);
      for (const listener of listeners) {
        try {
          listener(data);
        } catch (error) {
          console.error(`Error in event listener for event '${String(event)}':`, error);
        }
      }
    }
  }

  /**
   * 移除所有监听器
   * @param event 可选的事件名称，如果不提供则移除所有事件的监听器
   */
  removeAllListeners<K extends keyof TEvents>(event?: K): void {
    if (event) {
      this.listeners.delete(event);
    } else {
      this.listeners.clear();
    }
  }

  /**
   * 获取事件监听器数量
   * @param event 事件名称
   */
  listenerCount<K extends keyof TEvents>(event: K): number {
    const eventListeners = this.listeners.get(event);
    return eventListeners ? eventListeners.size : 0;
  }

  /**
   * 获取所有事件名称
   */
  eventNames(): (keyof TEvents)[] {
    return Array.from(this.listeners.keys());
  }
}