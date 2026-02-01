/**
 * 事件发射器基类
 * 提供事件订阅和发布功能
 */

export class EventEmitter<T extends Record<string, (...args: any[]) => void>> {
  private listeners: Map<keyof T, Set<Function>> = new Map()

  /**
   * 订阅事件
   */
  on<K extends keyof T>(event: K, listener: T[K]): this {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set())
    }
    this.listeners.get(event)!.add(listener)
    return this
  }

  /**
   * 取消订阅事件
   */
  off<K extends keyof T>(event: K, listener?: T[K]): this {
    const eventListeners = this.listeners.get(event)
    if (!eventListeners) {
      return this
    }

    if (listener) {
      eventListeners.delete(listener)
      if (eventListeners.size === 0) {
        this.listeners.delete(event)
      }
    } else {
      this.listeners.delete(event)
    }

    return this
  }

  /**
   * 订阅一次性事件
   */
  once<K extends keyof T>(event: K, listener: T[K]): this {
    const onceWrapper = ((...args: Parameters<T[K]>) => {
      this.off(event, onceWrapper as T[K])
      ;(listener as any)(...args)
    }) as T[K]

    return this.on(event, onceWrapper)
  }

  /**
   * 发布事件
   */
  emit<K extends keyof T>(event: K, ...args: Parameters<T[K]>): this {
    const eventListeners = this.listeners.get(event)
    if (eventListeners) {
      eventListeners.forEach((listener) => {
        try {
          ;(listener as any)(...args)
        } catch (error) {
          console.error(`Error in event listener for '${String(event)}':`, error)
        }
      })
    }
    return this
  }

  /**
   * 移除所有事件监听器
   */
  removeAllListeners(): this {
    this.listeners.clear()
    return this
  }

  /**
   * 获取指定事件的监听器数量
   */
  listenerCount<K extends keyof T>(event: K): number {
    const eventListeners = this.listeners.get(event)
    return eventListeners ? eventListeners.size : 0
  }

  /**
   * 获取所有事件名称
   */
  eventNames(): (keyof T)[] {
    return Array.from(this.listeners.keys())
  }

  /**
   * 检查是否有指定事件的监听器
   */
  hasListeners<K extends keyof T>(event: K): boolean {
    return this.listenerCount(event) > 0
  }
}
