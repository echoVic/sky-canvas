/**
 * 基础事件系统 - 简化版本用于兼容
 */

import { Vector2, IPoint } from '@sky-canvas/render-engine';

/**
 * 事件类型枚举
 */
export enum EventType {
  // 基础事件
  CUSTOM = 'custom',
  
  // 鼠标事件
  MOUSE_DOWN = 'mousedown',
  MOUSE_UP = 'mouseup',
  MOUSE_MOVE = 'mousemove',
  MOUSE_ENTER = 'mouseenter',
  MOUSE_LEAVE = 'mouseleave',
  CLICK = 'click',
  DOUBLE_CLICK = 'dblclick',
  
  // 键盘事件
  KEY_DOWN = 'keydown',
  KEY_UP = 'keyup',
  
  // 触摸事件
  TOUCH_START = 'touchstart',
  TOUCH_MOVE = 'touchmove',
  TOUCH_END = 'touchend',
  TOUCH_CANCEL = 'touchcancel',
  
  // 手势事件
  GESTURE_START = 'gesturestart',
  GESTURE_CHANGE = 'gesturechange',
  GESTURE_END = 'gestureend',
  
  // 选择事件
  SELECTION_CHANGE = 'selectionchange'
}

/**
 * 基础事件接口
 */
export interface IEvent {
  type: EventType | string;
  timestamp: number;
  target?: any;
  data?: any;
}

/**
 * 基础事件实现
 */
export class EventImpl implements IEvent {
  type: EventType | string;
  timestamp: number;
  target?: any;
  data?: any;

  constructor(type: EventType | string, data?: any) {
    this.type = type;
    this.timestamp = Date.now();
    this.data = data;
  }
}

/**
 * 鼠标事件接口
 */
export interface MouseEvent extends IEvent {
  type: EventType.MOUSE_DOWN | EventType.MOUSE_UP | EventType.MOUSE_MOVE | EventType.CLICK | EventType.DOUBLE_CLICK;
  position: IPoint;
  button: number;
  ctrlKey: boolean;
  shiftKey: boolean;
  altKey: boolean;
}

/**
 * 触摸点接口
 */
export interface Touch {
  identifier: number;
  screenPosition: IPoint;
  clientPosition: IPoint;
  force?: number;
}

/**
 * 触摸事件接口
 */
export interface TouchEvent extends IEvent {
  type: EventType.TOUCH_START | EventType.TOUCH_MOVE | EventType.TOUCH_END | EventType.TOUCH_CANCEL;
  touches: Touch[];
  changedTouches: Touch[];
  targetTouches: Touch[];
}

/**
 * 手势事件接口
 */
export interface GestureEvent extends IEvent {
  type: EventType.GESTURE_START | EventType.GESTURE_CHANGE | EventType.GESTURE_END;
  center: IPoint;
  scale: number;
  rotation: number;
  velocity: Vector2;
}

/**
 * 事件监听器接口
 */
export interface IEventListener {
  (event: IEvent): void;
}

/**
 * 事件分发器 - 简化版本
 */
export class EventDispatcher {
  private listeners: Map<string, IEventListener[]> = new Map();

  /**
   * 添加事件监听器
   */
  addEventListener(type: string, listener: IEventListener): void {
    if (!this.listeners.has(type)) {
      this.listeners.set(type, []);
    }
    this.listeners.get(type)!.push(listener);
  }

  /**
   * 移除事件监听器
   */
  removeEventListener(type: string, listener: IEventListener): void {
    const listeners = this.listeners.get(type);
    if (listeners) {
      const index = listeners.indexOf(listener);
      if (index !== -1) {
        listeners.splice(index, 1);
      }
    }
  }

  /**
   * 移除所有监听器
   */
  removeAllListeners(): void {
    this.listeners.clear();
  }

  /**
   * 分发事件
   */
  dispatchEvent(event: IEvent): void {
    const listeners = this.listeners.get(event.type);
    if (listeners) {
      event.target = event.target || this;
      for (const listener of listeners) {
        try {
          listener(event);
        } catch (error) {
          console.error('Event listener error:', error);
        }
      }
    }
  }

  /**
   * 检查是否有监听器
   */
  hasEventListener(type: string): boolean {
    const listeners = this.listeners.get(type);
    return listeners ? listeners.length > 0 : false;
  }
}

/**
 * 事件工厂
 */
export class EventFactory {
  /**
   * 创建鼠标事件
   */
  static createMouseEvent(
    type: EventType.MOUSE_DOWN | EventType.MOUSE_UP | EventType.MOUSE_MOVE | EventType.CLICK,
    position: IPoint,
    button: number = 0,
    ctrlKey: boolean = false,
    shiftKey: boolean = false,
    altKey: boolean = false
  ): MouseEvent {
    return {
      type,
      position,
      button,
      ctrlKey,
      shiftKey,
      altKey,
      timestamp: Date.now()
    };
  }

  /**
   * 创建触摸事件
   */
  static createTouchEvent(
    type: EventType.TOUCH_START | EventType.TOUCH_MOVE | EventType.TOUCH_END,
    touches: Touch[],
    changedTouches: Touch[],
    targetTouches: Touch[]
  ): TouchEvent {
    return {
      type,
      touches,
      changedTouches,
      targetTouches,
      timestamp: Date.now()
    };
  }

  /**
   * 创建手势事件
   */
  static createGestureEvent(
    type: EventType.GESTURE_START | EventType.GESTURE_CHANGE | EventType.GESTURE_END,
    center: IPoint,
    scale: number = 1,
    rotation: number = 0,
    velocity: Vector2 = new Vector2(0, 0),
    deltaX: number = 0,
    deltaY: number = 0,
    direction?: Vector2
  ): GestureEvent {
    const event = {
      type,
      center,
      scale,
      rotation,
      velocity,
      timestamp: Date.now()
    } as GestureEvent & { deltaX?: number; deltaY?: number; direction?: Vector2 };

    if (deltaX !== 0) event.deltaX = deltaX;
    if (deltaY !== 0) event.deltaY = deltaY;
    if (direction) event.direction = direction;

    return event;
  }
}