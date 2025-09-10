/**
 * 事件系统实现 - 现在基于统一的 Render Engine 事件系统
 */
import {
  InputEventFactory,
  IPoint,
  EventDispatcher as RenderEventDispatcher,
  InputEventListener as RenderEventListener
} from '@sky-canvas/render-engine';
import { IGestureEvent, IMouseEvent, ITouchEvent } from './types';

/**
 * 事件类型枚举
 */
export enum EventType {
  // 鼠标事件
  MOUSE_DOWN = 'mousedown',
  MOUSE_MOVE = 'mousemove',
  MOUSE_UP = 'mouseup',
  
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
  SELECTION_CHANGE = 'selectionchange',
}

/**
 * 事件调度器 - 现在基于统一的 Render Engine 事件系统
 */
export class EventDispatcher {
  private _renderDispatcher: RenderEventDispatcher;

  constructor() {
    this._renderDispatcher = new RenderEventDispatcher();
  }

  addEventListener(type: string, listener: Function): void {
    this._renderDispatcher.addEventListener(type, listener as RenderEventListener);
  }

  removeEventListener(type: string, listener: Function): void {
    this._renderDispatcher.removeEventListener(type, listener as RenderEventListener);
  }

  dispatchEvent(event: any): void {
    this._renderDispatcher.dispatchEvent(event);
  }

  removeAllListeners(): void {
    this._renderDispatcher.removeAllListeners();
  }

  dispose(): void {
    this._renderDispatcher.dispose();
  }
}

/**
 * 事件工厂 - 现在基于统一的 Render Engine 事件工厂
 */
export class EventFactory {
  static createMouseEvent(
    type: string, 
    nativeEvent: MouseEvent, 
    worldPosition: IPoint,
    screenPosition?: IPoint
  ): IMouseEvent {
    // 使用 Render Engine 的事件工厂创建事件
    const renderEvent = InputEventFactory.createMouseEvent(
      type,
      nativeEvent,
      worldPosition
    );
    
    // 转换为 Canvas SDK 的接口格式
    return {
      type,
      screenPosition: screenPosition || { x: nativeEvent.clientX, y: nativeEvent.clientY },
      worldPosition,
      button: nativeEvent.button,
      ctrlKey: nativeEvent.ctrlKey,
      shiftKey: nativeEvent.shiftKey,
      altKey: nativeEvent.altKey,
      metaKey: nativeEvent.metaKey,
      timestamp: renderEvent.timestamp
    };
  }

  static createTouchEvent(
    type: string,
    nativeEvent: TouchEvent,
    worldPositions: IPoint[]
  ): ITouchEvent {
    // 使用 Render Engine 的事件工厂创建事件
    const renderEvent = InputEventFactory.createTouchEvent(
      type,
      nativeEvent,
      worldPositions
    );
    
    // 转换为 Canvas SDK 的接口格式
    return {
      type,
      touches: worldPositions,
      timestamp: renderEvent.timestamp
    };
  }

  static createGestureEvent(
    type: string,
    center: IPoint,
    deltaTranslation: IPoint = { x: 0, y: 0 },
    deltaScale: number = 0,
    deltaRotation: number = 0
  ): IGestureEvent {
    return {
      type,
      center,
      deltaTranslation,
      deltaScale,
      deltaRotation,
      timestamp: performance.now()
    };
  }
}

/**
 * 手势识别器
 */
export class GestureRecognizer extends EventDispatcher {
  private enabled = true;
  private activeTouches: Touch[] = [];
  private lastTouchPositions: IPoint[] = [];
  private lastDistance = 0;
  private lastAngle = 0;
  private gestureActive = false;

  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }

  handleTouchStart(event: ITouchEvent): void {
    if (!this.enabled) return;

    if (event.touches.length === 2 && event.touches[0] && event.touches[1]) {
      // 开始双指手势
      this.lastTouchPositions = [...event.touches];
      this.lastDistance = this.calculateDistance(event.touches[0], event.touches[1]);
      this.lastAngle = this.calculateAngle(event.touches[0], event.touches[1]);
      this.gestureActive = true;

      const center = this.calculateCenter(event.touches);
      const gestureEvent = EventFactory.createGestureEvent(EventType.GESTURE_START, center);
      this.dispatchEvent(gestureEvent);
    }
  }

  handleTouchMove(event: ITouchEvent): void {
    if (!this.enabled || !this.gestureActive || event.touches.length !== 2 || !event.touches[0] || !event.touches[1]) return;

    const currentDistance = this.calculateDistance(event.touches[0], event.touches[1]);
    const currentAngle = this.calculateAngle(event.touches[0], event.touches[1]);
    const center = this.calculateCenter(event.touches);

    // 计算变化量
    const deltaScale = (currentDistance - this.lastDistance) / this.lastDistance;
    const deltaRotation = currentAngle - this.lastAngle;
    
    const deltaTranslation = {
      x: center.x - this.calculateCenter(this.lastTouchPositions).x,
      y: center.y - this.calculateCenter(this.lastTouchPositions).y
    };

    const gestureEvent = EventFactory.createGestureEvent(
      EventType.GESTURE_CHANGE, 
      center, 
      deltaTranslation, 
      deltaScale, 
      deltaRotation
    );
    this.dispatchEvent(gestureEvent);

    // 更新上次状态
    this.lastTouchPositions = [...event.touches];
    this.lastDistance = currentDistance;
    this.lastAngle = currentAngle;
  }

  handleTouchEnd(event: ITouchEvent): void {
    if (!this.enabled) return;

    if (this.gestureActive && event.touches.length < 2) {
      // 结束手势
      this.gestureActive = false;
      const center = this.lastTouchPositions.length > 0 ? 
        this.calculateCenter(this.lastTouchPositions) : { x: 0, y: 0 };
      
      const gestureEvent = EventFactory.createGestureEvent(EventType.GESTURE_END, center);
      this.dispatchEvent(gestureEvent);
      
      this.lastTouchPositions = [];
    }
  }

  handleTouchCancel(event: ITouchEvent): void {
    this.handleTouchEnd(event);
  }

  private calculateDistance(p1: IPoint, p2: IPoint): number {
    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  private calculateAngle(p1: IPoint, p2: IPoint): number {
    return Math.atan2(p2.y - p1.y, p2.x - p1.x);
  }

  private calculateCenter(points: IPoint[]): IPoint {
    if (points.length === 0) return { x: 0, y: 0 };
    
    const sum = points.reduce(
      (acc, point) => ({ x: acc.x + point.x, y: acc.y + point.y }),
      { x: 0, y: 0 }
    );
    
    return { x: sum.x / points.length, y: sum.y / points.length };
  }

  dispose(): void {
    this.removeAllListeners();
    this.activeTouches = [];
    this.lastTouchPositions = [];
    this.gestureActive = false;
  }
}