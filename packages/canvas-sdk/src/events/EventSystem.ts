import {
  IBaseEvent,
  InputEventFactory,
  IPoint as Point,
  BaseEvent as RenderBaseEvent,
  EventDispatcher as RenderEventDispatcher,
  InputEventListener as RenderEventListener,
  Vector2
} from '@sky-canvas/render-engine';

/**
 * 事件类型枚举 - 现在继承自 Render Engine
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
 * 基础事件接口 - 现在继承自 Render Engine
 */
export interface BaseEvent extends IBaseEvent {
  type: EventType;
}

/**
 * Canvas SDK 基础事件实现
 */
export class CanvasBaseEvent extends RenderBaseEvent implements BaseEvent {
  public type: EventType;

  constructor(type: EventType) {
    super(type);
    this.type = type;
  }
}

/**
 * 指针事件接口 - 现在继承自 Render Engine
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
 * 鼠标事件接口 - 现在继承自 Render Engine
 */
export interface MouseEvent extends PointerEvent {
  deltaX?: number;
  deltaY?: number;
  deltaZ?: number;
}

/**
 * 触摸点接口 - 现在继承自 Render Engine
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
 * 触摸事件接口 - 现在继承自 Render Engine
 */
export interface TouchEvent extends BaseEvent {
  touches: Touch[];
  changedTouches: Touch[];
  targetTouches: Touch[];
}

/**
 * 手势事件接口 - 现在继承自 Render Engine
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
 * 事件实现基类 - 现在继承自 Render Engine
 */
export class EventImpl extends CanvasBaseEvent {
  constructor(type: EventType) {
    super(type);
  }
}

/**
 * 事件分发器 - 现在基于 Render Engine 实现
 */
export class EventDispatcher {
  private _renderDispatcher: RenderEventDispatcher;

  constructor() {
    this._renderDispatcher = new RenderEventDispatcher();
  }

  /**
   * 添加事件监听器（兼容旧接口）
   */
  addEventListener<T extends BaseEvent>(
    type: EventType, 
    listener: EventListener<T>,
    once: boolean = false
  ): void {
    this._renderDispatcher.addEventListener(type, listener as RenderEventListener, once);
  }

  /**
   * 移除事件监听器（兼容旧接口）
   */
  removeEventListener<T extends BaseEvent>(
    type: EventType, 
    listener: EventListener<T>
  ): void {
    this._renderDispatcher.removeEventListener(type, listener as RenderEventListener);
  }

  /**
   * 分发事件（兼容旧接口）
   */
  dispatchEvent(event: BaseEvent): boolean {
    return this._renderDispatcher.dispatchEvent(event);
  }

  /**
   * 移除所有监听器（兼容旧接口）
   */
  removeAllListeners(type?: EventType): void {
    this._renderDispatcher.removeAllListeners(type);
  }

  /**
   * 检查是否有监听器（兼容旧接口）
   */
  hasListeners(type: EventType): boolean {
    return this._renderDispatcher.hasListeners(type);
  }

  /**
   * 获取监听器数量（兼容旧接口）
   */
  getListenerCount(type: EventType): number {
    return this._renderDispatcher.getListenerCount(type);
  }

  /**
   * 销毁分发器
   */
  dispose(): void {
    this._renderDispatcher.dispose();
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
 * 事件工厂 - 现在委托给 Render Engine 的工厂
 */
export class EventFactory {
  static createMouseEvent(
    type: EventType,
    nativeEvent: globalThis.MouseEvent,
    worldPosition: Point
  ): MouseEvent {
    const renderEvent = InputEventFactory.createMouseEvent(
      type,
      nativeEvent,
      worldPosition
    );
    // 添加 Canvas SDK 特定的类型信息
    (renderEvent as any).type = type;
    return renderEvent as MouseEvent;
  }

  static createTouchEvent(
    type: EventType,
    nativeEvent: globalThis.TouchEvent,
    worldPositions: Point[]
  ): TouchEvent {
    const renderEvent = InputEventFactory.createTouchEvent(
      type,
      nativeEvent,
      worldPositions
    );
    // 添加 Canvas SDK 特定的类型信息
    (renderEvent as any).type = type;
    return renderEvent as TouchEvent;
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
    const renderEvent = InputEventFactory.createGestureEvent(
      type,
      center,
      scale,
      rotation,
      velocity,
      deltaScale,
      deltaRotation,
      deltaTranslation
    );
    // 添加 Canvas SDK 特定的类型信息
    (renderEvent as any).type = type;
    return renderEvent as GestureEvent;
  }
}
