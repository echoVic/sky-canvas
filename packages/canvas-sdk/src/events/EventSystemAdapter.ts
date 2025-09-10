/**
 * 事件系统适配器 - 将 Canvas SDK 事件系统适配到统一的 Render Engine 事件系统
 */

import {
  EventBus,
  ITouchEvent,
  InputEventFactory,
  EventDispatcher as RenderEventDispatcher,
  InputEventListener as RenderEventListener,
  GestureRecognizer as RenderGestureRecognizer,
  eventBus
} from '@sky-canvas/render-engine';

import { IDisposable } from './EventBus';

/**
 * 事件系统适配器
 * 提供从旧事件系统到新事件系统的平滑过渡
 */
export class EventSystemAdapter {
  private _renderEventBus: EventBus;
  private _renderEventDispatcher: RenderEventDispatcher;
  private _renderGestureRecognizer: RenderGestureRecognizer;
  private _disposed = false;

  constructor() {
    this._renderEventBus = new EventBus();
    this._renderEventDispatcher = new RenderEventDispatcher();
    this._renderGestureRecognizer = new RenderGestureRecognizer();
  }

  /**
   * 兼容旧的 EventBus 接口
   */
  createEventBusAdapter() {
    return {
      on: <T>(eventName: string, listener: (data: T) => void): IDisposable => {
        // 使用全局事件总线，因为 EventBus.on 返回 void
        eventBus.on(eventName, listener);
        return {
          dispose: () => {
            // EventBus 不支持直接 dispose，需要手动实现
            console.warn('EventBus dispose not fully supported in adapter');
          }
        };
      },

      once: <T>(eventName: string, listener: (data: T) => void): IDisposable => {
        eventBus.once(eventName, listener);
        return {
          dispose: () => {
            console.warn('EventBus dispose not fully supported in adapter');
          }
        };
      },

      emit: <T>(eventName: string, data: T): void => {
        this._renderEventBus.emit(eventName, data);
      },

      fire: <T>(eventName: string, event: T): void => {
        this._renderEventBus.emit(eventName, event);
      },

      getEvent: <T>(eventName: string) => {
        // EventBus 没有 getEvent 方法，这里返回一个空的事件绑定函数
        return (listener: any) => {
          return this._renderEventBus.on<T>(eventName, listener);
        };
      },

      dispose: (): void => {
        this._renderEventBus.dispose();
      }
    };
  }

  /**
   * 兼容旧的 EventDispatcher 接口
   */
  createEventDispatcherAdapter() {
    return {
      addEventListener: (type: string, listener: Function): void => {
        this._renderEventDispatcher.addEventListener(type, listener as RenderEventListener);
      },

      removeEventListener: (type: string, listener: Function): void => {
        this._renderEventDispatcher.removeEventListener(type, listener as RenderEventListener);
      },

      dispatchEvent: (event: any): void => {
        this._renderEventDispatcher.dispatchEvent(event);
      },

      removeAllListeners: (type?: string): void => {
        this._renderEventDispatcher.removeAllListeners(type);
      }
    };
  }

  /**
   * 兼容旧的 GestureRecognizer 接口
   */
  createGestureRecognizerAdapter() {
    return {
      setEnabled: (enabled: boolean): void => {
        this._renderGestureRecognizer.setEnabled(enabled);
      },

      handleTouchStart: (event: any): void => {
        // 转换事件格式
        const touchEvent = this._convertToRenderTouchEvent('touchstart', event);
        this._renderGestureRecognizer.handleTouchStart(touchEvent);
      },

      handleTouchMove: (event: any): void => {
        const touchEvent = this._convertToRenderTouchEvent('touchmove', event);
        this._renderGestureRecognizer.handleTouchMove(touchEvent);
      },

      handleTouchEnd: (event: any): void => {
        const touchEvent = this._convertToRenderTouchEvent('touchend', event);
        this._renderGestureRecognizer.handleTouchEnd(touchEvent);
      },

      handleTouchCancel: (event: any): void => {
        const touchEvent = this._convertToRenderTouchEvent('touchcancel', event);
        this._renderGestureRecognizer.handleTouchCancel(touchEvent);
      },

      addEventListener: (type: string, listener: Function): void => {
        this._renderGestureRecognizer.addEventListener(type, listener as RenderEventListener);
      },

      removeEventListener: (type: string, listener: Function): void => {
        this._renderGestureRecognizer.removeEventListener(type, listener as RenderEventListener);
      },

      dispose: (): void => {
        this._renderGestureRecognizer.dispose();
      }
    };
  }

  /**
   * 转换触摸事件格式
   */
  private _convertToRenderTouchEvent(type: string, oldEvent: any): ITouchEvent {
    // 这里需要根据旧事件格式转换为新格式
    return InputEventFactory.createTouchEvent(
      type,
      oldEvent.nativeEvent || oldEvent,
      oldEvent.touches || []
    );
  }

  /**
   * 获取底层的 Render Engine 事件系统
   */
  getRenderEventBus(): EventBus {
    return this._renderEventBus;
  }

  getRenderEventDispatcher(): RenderEventDispatcher {
    return this._renderEventDispatcher;
  }

  getRenderGestureRecognizer(): RenderGestureRecognizer {
    return this._renderGestureRecognizer;
  }

  /**
   * 销毁适配器
   */
  dispose(): void {
    if (this._disposed) return;

    this._disposed = true;
    this._renderEventBus.dispose();
    this._renderEventDispatcher.dispose();
    this._renderGestureRecognizer.dispose();
  }
}

/**
 * 全局事件系统适配器实例
 */
export const globalEventAdapter = new EventSystemAdapter();