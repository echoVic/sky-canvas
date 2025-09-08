import { IPoint as Point } from '@sky-canvas/render-engine';
import { Vector2 } from '../math';

/**
 * 事件类型枚举
 */
export enum EventType {
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
 * 基础事件接口
 */
export interface BaseEvent {
  type: EventType;
  timestamp: number;
  preventDefault(): void;
  stopPropagation(): void;
  isDefaultPrevented(): boolean;
  isPropagationStopped(): boolean;
}

/**
 * 指针事件接口
 */
export interface PointerEvent extends BaseEvent {
  pointerId: number;
  screenPosition: Point;
  worldPosition: Point;
  button: number;
  buttons: number;
  ctrlKey: boolean;
  shiftKey: boolean;
  altKey: boolean;
  metaKey: boolean;
}

/**
 * 鼠标事件接口
 */
export interface MouseEvent extends PointerEvent {
  deltaX?: number;
  deltaY?: number;
  deltaZ?: number;
}

/**
 * 触摸点接口
 */
export interface Touch {
  identifier: number;
  screenPosition: Point;
  worldPosition: Point;
  force?: number;
  radiusX?: number;
  radiusY?: number;
}

/**
 * 触摸事件接口
 */
export interface TouchEvent extends BaseEvent {
  touches: Touch[];
  changedTouches: Touch[];
  targetTouches: Touch[];
}

/**
 * 手势事件接口
 */
export interface GestureEvent extends BaseEvent {
  center: Point;
  scale: number;
  rotation: number;
  velocity: Vector2;
  deltaScale: number;
  deltaRotation: number;
  deltaTranslation: Vector2;
}

/**
 * 事件监听器类型
 */
export type EventListener<T extends BaseEvent = BaseEvent> = (event: T) => void;

/**
 * 事件实现基类
 */
export class EventImpl implements BaseEvent {
  public type: EventType;
  public timestamp: number;
  private _defaultPrevented: boolean = false;
  private _propagationStopped: boolean = false;

  constructor(type: EventType) {
    this.type = type;
    this.timestamp = performance.now();
  }

  preventDefault(): void {
    this._defaultPrevented = true;
  }

  stopPropagation(): void {
    this._propagationStopped = true;
  }

  isDefaultPrevented(): boolean {
    return this._defaultPrevented;
  }

  isPropagationStopped(): boolean {
    return this._propagationStopped;
  }
}

/**
 * 事件分发器
 */
export class EventDispatcher {
  private _listeners: Map<EventType, Set<EventListener>> = new Map();
  private _onceListeners: Map<EventType, Set<EventListener>> = new Map();

  /**
   * 添加事件监听器
   */
  addEventListener<T extends BaseEvent>(
    type: EventType, 
    listener: EventListener<T>,
    once: boolean = false
  ): void {
    const listenersMap = once ? this._onceListeners : this._listeners;
    
    if (!listenersMap.has(type)) {
      listenersMap.set(type, new Set());
    }
    
    listenersMap.get(type)!.add(listener as EventListener);
  }

  /**
   * 移除事件监听器
   */
  removeEventListener<T extends BaseEvent>(
    type: EventType, 
    listener: EventListener<T>
  ): void {
    const listeners = this._listeners.get(type);
    if (listeners) {
      listeners.delete(listener as EventListener);
    }
    
    const onceListeners = this._onceListeners.get(type);
    if (onceListeners) {
      onceListeners.delete(listener as EventListener);
    }
  }

  /**
   * 分发事件
   */
  dispatchEvent(event: BaseEvent): boolean {
    const listeners = this._listeners.get(event.type);
    const onceListeners = this._onceListeners.get(event.type);
    
    // 执行普通监听器
    if (listeners) {
      for (const listener of listeners) {
        if (event.isPropagationStopped()) break;
        listener(event);
      }
    }
    
    // 执行一次性监听器
    if (onceListeners) {
      for (const listener of onceListeners) {
        if (event.isPropagationStopped()) break;
        listener(event);
      }
      // 清空一次性监听器
      onceListeners.clear();
    }
    
    return !event.isDefaultPrevented();
  }

  /**
   * 移除所有监听器
   */
  removeAllListeners(type?: EventType): void {
    if (type) {
      this._listeners.delete(type);
      this._onceListeners.delete(type);
    } else {
      this._listeners.clear();
      this._onceListeners.clear();
    }
  }

  /**
   * 检查是否有监听器
   */
  hasListeners(type: EventType): boolean {
    const listeners = this._listeners.get(type);
    const onceListeners = this._onceListeners.get(type);
    
    return (listeners?.size ?? 0) > 0 || (onceListeners?.size ?? 0) > 0;
  }

  /**
   * 获取监听器数量
   */
  getListenerCount(type: EventType): number {
    const listeners = this._listeners.get(type);
    const onceListeners = this._onceListeners.get(type);
    
    return (listeners?.size || 0) + (onceListeners?.size || 0);
  }
}

/**
 * 输入状态管理器
 */
export class InputState {
  private _mousePosition: Point = { x: 0, y: 0 };
  private _mouseButtons: Set<number> = new Set();
  private _keys: Set<string> = new Set();
  private _touches: Map<number, Touch> = new Map();
  private _modifiers: {
    ctrl: boolean;
    shift: boolean;
    alt: boolean;
    meta: boolean;
  } = { ctrl: false, shift: false, alt: false, meta: false };

  // 鼠标状态
  get mousePosition(): Point {
    return { ...this._mousePosition };
  }

  setMousePosition(position: Point): void {
    this._mousePosition = { ...position };
  }

  isMouseButtonDown(button: number): boolean {
    return this._mouseButtons.has(button);
  }

  setMouseButtonDown(button: number): void {
    this._mouseButtons.add(button);
  }

  setMouseButtonUp(button: number): void {
    this._mouseButtons.delete(button);
  }

  getMouseButtons(): number[] {
    return Array.from(this._mouseButtons);
  }

  // 键盘状态
  isKeyDown(key: string): boolean {
    return this._keys.has(key.toLowerCase());
  }

  setKeyDown(key: string): void {
    this._keys.add(key.toLowerCase());
  }

  setKeyUp(key: string): void {
    this._keys.delete(key.toLowerCase());
  }

  getDownKeys(): string[] {
    return Array.from(this._keys);
  }

  // 修饰键状态
  get modifiers() {
    return { ...this._modifiers };
  }

  setModifiers(modifiers: Partial<typeof this._modifiers>): void {
    Object.assign(this._modifiers, modifiers);
  }

  // 触摸状态
  getTouches(): Touch[] {
    return Array.from(this._touches.values());
  }

  getTouch(id: number): Touch | undefined {
    return this._touches.get(id);
  }

  setTouch(touch: Touch): void {
    this._touches.set(touch.identifier, touch);
  }

  removeTouch(id: number): void {
    this._touches.delete(id);
  }

  clearTouches(): void {
    this._touches.clear();
  }

  // 重置状态
  reset(): void {
    this._mouseButtons.clear();
    this._keys.clear();
    this._touches.clear();
    this._modifiers = { ctrl: false, shift: false, alt: false, meta: false };
  }

  // 调试信息
  getDebugInfo(): object {
    return {
      mousePosition: this._mousePosition,
      mouseButtons: Array.from(this._mouseButtons),
      keys: Array.from(this._keys),
      modifiers: this._modifiers,
      touches: this.getTouches().map(t => ({
        id: t.identifier,
        position: t.screenPosition
      }))
    };
  }
}

/**
 * 事件工厂
 */
export class EventFactory {
  static createMouseEvent(
    type: EventType,
    nativeEvent: globalThis.MouseEvent,
    worldPosition: Point
  ): MouseEvent {
    const baseEvent = new EventImpl(type);
    const event = baseEvent as unknown as MouseEvent;
    
    event.pointerId = 1; // 鼠标总是ID为1
    event.screenPosition = { x: nativeEvent.clientX, y: nativeEvent.clientY };
    event.worldPosition = worldPosition;
    event.button = nativeEvent.button;
    event.buttons = nativeEvent.buttons;
    event.ctrlKey = nativeEvent.ctrlKey;
    event.shiftKey = nativeEvent.shiftKey;
    event.altKey = nativeEvent.altKey;
    event.metaKey = nativeEvent.metaKey;
    
    if (type === EventType.MOUSE_WHEEL && 'deltaX' in nativeEvent) {
      const wheelEvent = nativeEvent as WheelEvent;
      event.deltaX = wheelEvent.deltaX;
      event.deltaY = wheelEvent.deltaY;
      event.deltaZ = wheelEvent.deltaZ;
    }
    
    return event;
  }

  static createTouchEvent(
    type: EventType,
    nativeEvent: globalThis.TouchEvent,
    worldPositions: Point[]
  ): TouchEvent {
    const baseEvent = new EventImpl(type);
    const event = baseEvent as unknown as TouchEvent;
    
    const createTouch = (nativeTouch: globalThis.Touch, worldPos: Point): Touch => ({
      identifier: nativeTouch.identifier,
      screenPosition: { x: nativeTouch.clientX, y: nativeTouch.clientY },
      worldPosition: worldPos,
      force: nativeTouch.force,
      radiusX: nativeTouch.radiusX,
      radiusY: nativeTouch.radiusY
    });
    
    event.touches = Array.from(nativeEvent.touches).map((touch, i) => 
      createTouch(touch, worldPositions[i] || { x: 0, y: 0 })
    );
    
    event.changedTouches = Array.from(nativeEvent.changedTouches).map((touch, i) => 
      createTouch(touch, worldPositions[i] || { x: 0, y: 0 })
    );
    
    event.targetTouches = Array.from(nativeEvent.targetTouches).map((touch, i) => 
      createTouch(touch, worldPositions[i] || { x: 0, y: 0 })
    );
    
    return event;
  }

  static createGestureEvent(
    type: EventType,
    center: Point,
    scale: number,
    rotation: number,
    velocity: Vector2,
    deltaScale: number = 0,
    deltaRotation: number = 0,
    deltaTranslation: Vector2 = new Vector2(0, 0)
  ): GestureEvent {
    const baseEvent = new EventImpl(type);
    const event = baseEvent as unknown as GestureEvent;
    
    event.center = center;
    event.scale = scale;
    event.rotation = rotation;
    event.velocity = velocity;
    event.deltaScale = deltaScale;
    event.deltaRotation = deltaRotation;
    event.deltaTranslation = deltaTranslation;
    
    return event;
  }
}
