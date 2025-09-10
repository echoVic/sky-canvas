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
 * 类型安全的事件发射器
 * 基于EventBus，但提供更强的类型支持
 */
export class EventEmitter<TEvents extends Record<string, any>> extends EventBus {
  /**
   * 添加类型安全的事件监听器
   */
  on<K extends keyof TEvents>(event: K, listener: EventListener<TEvents[K]>): void {
    super.on(event as string, listener);
  }

  /**
   * 移除类型安全的事件监听器
   */
  off<K extends keyof TEvents>(event: K, listener: EventListener<TEvents[K]>): void {
    super.off(event as string, listener);
  }

  /**
   * 发射类型安全的事件
   */
  emit<K extends keyof TEvents>(event: K, data: TEvents[K]): void {
    super.emit(event as string, data);
  }

  /**
   * 添加类型安全的一次性事件监听器
   */
  once<K extends keyof TEvents>(event: K, listener: EventListener<TEvents[K]>): void {
    super.once(event as string, listener);
  }

  /**
   * 移除所有监听器
   */
  removeAllListeners<K extends keyof TEvents>(event?: K): void {
    if (event) {
      const listeners = (this as any).listeners.get(event as string);
      if (listeners) {
        listeners.clear();
        (this as any).listeners.delete(event as string);
      }
    } else {
      (this as any).listeners.clear();
    }
  }

  /**
   * 获取事件监听器数量
   */
  listenerCount<K extends keyof TEvents>(event: K): number {
    return this.getListenerCount(event as string);
  }

  /**
   * 获取所有事件名称
   */
  eventNames(): (keyof TEvents)[] {
    return this.getEventTypes() as (keyof TEvents)[];
  }
}

/**
 * 输入事件类型枚举
 */
export enum InputEventType {
  // 鼠标事件
  MOUSE_DOWN = 'mousedown',
  MOUSE_UP = 'mouseup',
  MOUSE_MOVE = 'mousemove',
  MOUSE_ENTER = 'mouseenter',
  MOUSE_LEAVE = 'mouseleave',
  MOUSE_WHEEL = 'mousewheel',
  CLICK = 'click',
  DOUBLE_CLICK = 'doubleclick',
  
  // 触摸事件
  TOUCH_START = 'touchstart',
  TOUCH_END = 'touchend',
  TOUCH_MOVE = 'touchmove',
  TOUCH_CANCEL = 'touchcancel',
  
  // 手势事件
  GESTURE_START = 'gesturestart',
  GESTURE_END = 'gestureend',
  GESTURE_CHANGE = 'gesturechange',
  
  // 自定义事件
  SELECTION_CHANGE = 'selectionchange',
  VIEWPORT_CHANGE = 'viewportchange',
  SCENE_CHANGE = 'scenechange'
}

/**
 * 默认事件总线实例
 */
export const eventBus = new EventBus();