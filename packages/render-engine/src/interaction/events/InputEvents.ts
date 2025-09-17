/**
 * 输入事件系统 - 统一的输入事件处理
 */

import { Vector2 } from "../../math";


/**
 * 点位置接口
 */
export interface IPoint {
  x: number;
  y: number;
}

/**
 * 基础事件接口
 */
export interface IBaseEvent {
  type: string;
  timestamp: number;
  preventDefault(): void;
  stopPropagation(): void;
  isDefaultPrevented(): boolean;
  isPropagationStopped(): boolean;
}

/**
 * 指针事件接口
 */
export interface IPointerEvent extends IBaseEvent {
  pointerId: number;
  screenPosition: IPoint;
  worldPosition: IPoint;
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
export interface IMouseEvent extends IPointerEvent {
  deltaX?: number;
  deltaY?: number;
  deltaZ?: number;
}

/**
 * 触摸点接口
 */
export interface ITouch {
  identifier: number;
  screenPosition: IPoint;
  worldPosition: IPoint;
  force?: number;
  radiusX?: number;
  radiusY?: number;
}

/**
 * 触摸事件接口
 */
export interface ITouchEvent extends IBaseEvent {
  touches: ITouch[];
  changedTouches: ITouch[];
  targetTouches: ITouch[];
}

/**
 * 手势事件接口
 */
export interface IGestureEvent extends IBaseEvent {
  center: IPoint;
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
export type EventListener<T extends IBaseEvent = IBaseEvent> = (event: T) => void;

/**
 * 事件实现基类
 */
export class BaseEvent implements IBaseEvent {
  public type: string;
  public timestamp: number;
  private _defaultPrevented: boolean = false;
  private _propagationStopped: boolean = false;

  constructor(type: string) {
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
 * 输入状态管理器
 */
export class InputState {
  private _mousePosition: IPoint = { x: 0, y: 0 };
  private _mouseButtons: Set<number> = new Set();
  private _keys: Set<string> = new Set();
  private _touches: Map<number, ITouch> = new Map();
  private _modifiers: {
    ctrl: boolean;
    shift: boolean;
    alt: boolean;
    meta: boolean;
  } = { ctrl: false, shift: false, alt: false, meta: false };

  // 鼠标状态
  get mousePosition(): IPoint {
    return { ...this._mousePosition };
  }

  setMousePosition(position: IPoint): void {
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
  getTouches(): ITouch[] {
    return Array.from(this._touches.values());
  }

  getTouch(id: number): ITouch | undefined {
    return this._touches.get(id);
  }

  setTouch(touch: ITouch): void {
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
    this._mousePosition = { x: 0, y: 0 };
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
 * 创建鼠标事件的工具函数
 */
export function createMouseEvent(
  type: string,
  nativeEvent: globalThis.MouseEvent,
  worldPosition: IPoint
): IMouseEvent {
  const baseEvent = new BaseEvent(type);
  const event = baseEvent as unknown as IMouseEvent;

  event.pointerId = 1; // 鼠标总是ID为1
  event.screenPosition = { x: nativeEvent.clientX, y: nativeEvent.clientY };
  event.worldPosition = worldPosition;
  event.button = nativeEvent.button;
  event.buttons = nativeEvent.buttons;
  event.ctrlKey = nativeEvent.ctrlKey;
  event.shiftKey = nativeEvent.shiftKey;
  event.altKey = nativeEvent.altKey;
  event.metaKey = nativeEvent.metaKey;

  if (type === 'mousewheel' && 'deltaX' in nativeEvent) {
    const wheelEvent = nativeEvent as WheelEvent;
    event.deltaX = wheelEvent.deltaX;
    event.deltaY = wheelEvent.deltaY;
    event.deltaZ = wheelEvent.deltaZ;
  }

  return event;
}

/**
 * 创建触摸事件的工具函数
 */
export function createTouchEvent(
  type: string,
  nativeEvent: globalThis.TouchEvent,
  worldPositions: IPoint[]
): ITouchEvent {
  const baseEvent = new BaseEvent(type);
  const event = baseEvent as unknown as ITouchEvent;

  const createTouch = (nativeTouch: globalThis.Touch, worldPos: IPoint): ITouch => ({
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

/**
 * 创建手势事件的工具函数
 */
export function createGestureEvent(
  type: string,
  center: IPoint,
  scale: number,
  rotation: number,
  velocity: Vector2,
  deltaScale: number = 0,
  deltaRotation: number = 0,
  deltaTranslation: Vector2 = new Vector2(0, 0)
): IGestureEvent {
  const baseEvent = new BaseEvent(type);
  const event = baseEvent as unknown as IGestureEvent;

  event.center = center;
  event.scale = scale;
  event.rotation = rotation;
  event.velocity = velocity;
  event.deltaScale = deltaScale;
  event.deltaRotation = deltaRotation;
  event.deltaTranslation = deltaTranslation;

  return event;
}