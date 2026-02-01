/**
 * 事件总线接口和实现
 * 基于 EventEmitter3 提供类型安全的事件处理
 */

import { EventEmitter as EventEmitter3 } from 'eventemitter3'

/**
 * 可释放资源的接口
 */
export interface IDisposable {
  dispose(): void
}

/**
 * 事件监听器类型
 */
export type EventListener<T = unknown> = (event: T) => void

/**
 * 事件总线接口
 */
export interface IEventBus {
  on<T = unknown>(eventType: string, listener: EventListener<T>): IDisposable
  off<T = unknown>(eventType: string, listener: EventListener<T>): void
  emit<T = unknown>(eventType: string, event: T): void
  dispose(): void
}

/**
 * 基于 EventEmitter3 的事件总线类
 */
export class EventBus implements IEventBus, IDisposable {
  private emitter: EventEmitter3

  constructor() {
    this.emitter = new EventEmitter3()
  }

  /**
   * 添加事件监听器
   */
  on<T = unknown>(eventType: string, listener: EventListener<T>): IDisposable {
    this.emitter.on(eventType, listener)

    // 返回可释放的对象
    return {
      dispose: () => {
        this.off(eventType, listener)
      },
    }
  }

  /**
   * 移除事件监听器
   */
  off<T = unknown>(eventType: string, listener: EventListener<T>): void {
    this.emitter.off(eventType, listener)
  }

  /**
   * 触发事件
   */
  emit<T = unknown>(eventType: string, event: T): void {
    this.emitter.emit(eventType, event)
  }

  /**
   * 一次性事件监听器
   */
  once<T = unknown>(eventType: string, listener: EventListener<T>): IDisposable {
    this.emitter.once(eventType, listener)

    return {
      dispose: () => {
        this.off(eventType, listener)
      },
    }
  }

  /**
   * 清理所有监听器
   */
  dispose(): void {
    this.emitter.removeAllListeners()
  }

  /**
   * 获取事件类型列表
   */
  getEventTypes(): string[] {
    return this.emitter.eventNames() as string[]
  }

  /**
   * 获取指定事件的监听器数量
   */
  getListenerCount(eventType: string): number {
    return this.emitter.listenerCount(eventType)
  }
}

/**
 * 类型安全的事件发射器
 * 基于 EventEmitter3，提供更强的类型支持
 */
export class EventEmitter<TEvents extends Record<string, unknown>> {
  private emitter: EventEmitter3

  constructor() {
    this.emitter = new EventEmitter3()
  }

  /**
   * 添加类型安全的事件监听器
   */
  on<K extends keyof TEvents>(event: K, listener: EventListener<TEvents[K]>): IDisposable {
    this.emitter.on(event as string, listener)

    return {
      dispose: () => {
        this.off(event, listener)
      },
    }
  }

  /**
   * 移除类型安全的事件监听器
   */
  off<K extends keyof TEvents>(event: K, listener: EventListener<TEvents[K]>): void {
    this.emitter.off(event as string, listener)
  }

  /**
   * 发射类型安全的事件
   */
  emit<K extends keyof TEvents>(event: K, data: TEvents[K]): void {
    this.emitter.emit(event as string, data)
  }

  /**
   * 添加类型安全的一次性事件监听器
   */
  once<K extends keyof TEvents>(event: K, listener: EventListener<TEvents[K]>): IDisposable {
    this.emitter.once(event as string, listener)

    return {
      dispose: () => {
        this.off(event, listener)
      },
    }
  }

  /**
   * 移除所有监听器
   */
  removeAllListeners<K extends keyof TEvents>(event?: K): void {
    if (event) {
      this.emitter.removeAllListeners(event as string)
    } else {
      this.emitter.removeAllListeners()
    }
  }

  /**
   * 获取事件监听器数量
   */
  listenerCount<K extends keyof TEvents>(event: K): number {
    return this.emitter.listenerCount(event as string)
  }

  /**
   * 获取所有事件名称
   */
  eventNames(): (keyof TEvents)[] {
    return this.emitter.eventNames() as (keyof TEvents)[]
  }

  /**
   * 清理所有监听器
   */
  dispose(): void {
    this.emitter.removeAllListeners()
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
  SCENE_CHANGE = 'scenechange',
}

/**
 * 默认事件总线实例
 */
export const eventBus = new EventBus()
