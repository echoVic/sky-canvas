/**
 * 统一交互管理器
 * 整合事件分发、输入状态、手势识别等功能，提供统一的交互系统入口
 */

import { IPoint } from '../core/interface/IGraphicsContext';
import { Vector2 } from '../math/Vector2';
import EventEmitter3 from 'eventemitter3';
import { GestureRecognizer, IGestureConfig } from './events/GestureRecognizer';
import { IBaseEvent, IGestureEvent, IMouseEvent, InputState, ITouchEvent } from './events/InputEvents';
import { EVENT_CONSTANTS, GestureType, InputEventType } from './EventTypes';

/**
 * 交互配置接口
*/
export interface InteractionConfig {
  /** 是否启用手势识别 */
  enableGestures?: boolean;

  /** 是否启用鼠标交互 */
  enableMouse?: boolean;

  /** 是否启用触摸交互 */
  enableTouch?: boolean;

  /** 是否启用键盘交互 */
  enableKeyboard?: boolean;

  /** 手势识别配置 */
  gestureConfig?: IGestureConfig;

  /** 是否阻止默认行为 */
  preventDefault?: boolean;

  /** 是否阻止事件冒泡 */
  stopPropagation?: boolean;
}


/**
 * 视口变换接口
 */
export interface ViewportTransform {
  screenToWorld(point: IPoint): IPoint;
  worldToScreen(point: IPoint): IPoint;
}

// 交互管理器事件接口
export interface InteractionManagerEvents {
  // 标准事件
  update: InteractionManager;
  destroy: InteractionManager;

  // 鼠标事件
  mousedown: IMouseEvent;
  mouseup: IMouseEvent;
  mousemove: IMouseEvent;
  mousewheel: { deltaX: number; deltaY: number; deltaZ: number; clientX: number; clientY: number };
  click: IMouseEvent;
  doubleclick: IMouseEvent;

  // 触摸事件
  touchstart: ITouchEvent;
  touchmove: ITouchEvent;
  touchend: ITouchEvent;
  touchcancel: ITouchEvent;

  // 手势事件
  gesturestart: IGestureEvent;
  gesturechange: IGestureEvent;
  gestureend: IGestureEvent;

  // 拖拽事件
  dragstart: IMouseEvent;
  drag: IMouseEvent;
  dragend: IMouseEvent;
}

/**
 * 统一交互管理器
 */
export class InteractionManager extends EventEmitter3<InteractionManagerEvents> {
  private _canvas: HTMLCanvasElement;
  private _inputState: InputState;
  private _gestureRecognizer: GestureRecognizer;
  private _config: Required<InteractionConfig>;
  private _viewportTransform?: ViewportTransform;

  // 事件监听器存储
  private _boundHandlers: Map<string, (event: any) => void> = new Map();

  // 双击检测
  private _lastClickTime = 0;
  private _lastClickPosition: IPoint = { x: 0, y: 0 };
  private _doubleClickDelay = EVENT_CONSTANTS.DOUBLE_CLICK_DELAY;
  private _doubleClickMaxDistance = EVENT_CONSTANTS.DOUBLE_CLICK_MAX_DISTANCE;

  // 长按检测
  private _longPressTimer?: number;
  private _longPressDelay = EVENT_CONSTANTS.LONG_PRESS_DELAY;

  // 拖拽检测
  private _isDragging = false;
  private _dragStartPosition: IPoint = { x: 0, y: 0 };
  private _dragThreshold = 5; // 拖拽阈值

  constructor(canvas: HTMLCanvasElement, config: InteractionConfig = {}) {
    super();

    this._canvas = canvas;
    this._inputState = new InputState();
    this._gestureRecognizer = new GestureRecognizer(config.gestureConfig);

    this._config = {
      enableGestures: true,
      enableMouse: true,
      enableTouch: true,
      enableKeyboard: true,
      preventDefault: true,
      stopPropagation: false,
      gestureConfig: {},
      ...config
    } as Required<InteractionConfig>;

    this._setupEventListeners();
    this._setupGestureListeners();
  }

  /**
   * 设置视口变换
   */
  setViewportTransform(transform: ViewportTransform): void {
    this._viewportTransform = transform;
  }

  /**
   * 获取输入状态
   */
  get inputState(): InputState {
    return this._inputState;
  }

  /**
   * 获取手势识别器
   */
  get gestureRecognizer(): GestureRecognizer {
    return this._gestureRecognizer;
  }

  /**
   * 获取画布元素
   */
  get canvas(): HTMLCanvasElement {
    return this._canvas;
  }

  /**
   * 获取当前配置
   */
  get config(): Required<InteractionConfig> {
    return { ...this._config };
  }

  /**
   * 是否正在拖拽
   */
  get isDragging(): boolean {
    return this._isDragging;
  }

  /**
   * 获取拖拽开始位置
   */
  get dragStartPosition(): IPoint {
    return { ...this._dragStartPosition };
  }

  /**
   * 更新配置
   */
  configure(config: Partial<InteractionConfig>): void {
    const oldConfig = { ...this._config };
    Object.assign(this._config, config);

    // 如果启用/禁用状态发生变化，重新设置监听器
    if (oldConfig.enableMouse !== this._config.enableMouse ||
        oldConfig.enableTouch !== this._config.enableTouch ||
        oldConfig.enableKeyboard !== this._config.enableKeyboard) {
      this._removeEventListeners();
      this._setupEventListeners();
    }

    // 更新手势识别器
    this._gestureRecognizer.setEnabled(this._config.enableGestures);
  }

  /**
   * 设置事件监听器
   */
  private _setupEventListeners(): void {
    // 鼠标事件
    if (this._config.enableMouse) {
      this._addCanvasListener('mousedown', this._handleMouseDown.bind(this));
      this._addCanvasListener('mousemove', this._handleMouseMove.bind(this));
      this._addCanvasListener('mouseup', this._handleMouseUp.bind(this));
      this._addCanvasListener('wheel', this._handleMouseWheel.bind(this));
      this._addCanvasListener('mouseenter', this._handleMouseEnter.bind(this));
      this._addCanvasListener('mouseleave', this._handleMouseLeave.bind(this));
      this._addCanvasListener('contextmenu', this._handleContextMenu.bind(this));
    }

    // 触摸事件
    if (this._config.enableTouch) {
      this._addCanvasListener('touchstart', this._handleTouchStart.bind(this));
      this._addCanvasListener('touchmove', this._handleTouchMove.bind(this));
      this._addCanvasListener('touchend', this._handleTouchEnd.bind(this));
      this._addCanvasListener('touchcancel', this._handleTouchCancel.bind(this));
    }

    // 键盘事件
    if (this._config.enableKeyboard) {
      this._addWindowListener('keydown', this._handleKeyDown.bind(this));
      this._addWindowListener('keyup', this._handleKeyUp.bind(this));
    }
  }

  /**
   * 移除事件监听器
   */
  private _removeEventListeners(): void {
    for (const [type, handler] of this._boundHandlers) {
      if (type.startsWith('canvas:')) {
        this._canvas.removeEventListener(type.replace('canvas:', ''), handler);
      } else if (type.startsWith('window:')) {
        window.removeEventListener(type.replace('window:', ''), handler);
      }
    }
    this._boundHandlers.clear();
  }

  /**
   * 添加画布事件监听器
   */
  private _addCanvasListener(type: string, handler: (event: any) => void): void {
    const key = `canvas:${type}`;
    this._boundHandlers.set(key, handler);
    this._canvas.addEventListener(type, handler, { passive: !this._config.preventDefault });
  }

  /**
   * 添加窗口事件监听器
   */
  private _addWindowListener(type: string, handler: (event: any) => void): void {
    const key = `window:${type}`;
    this._boundHandlers.set(key, handler);
    window.addEventListener(type, handler, { passive: !this._config.preventDefault });
  }

  /**
   * 设置手势监听器
   */
  private _setupGestureListeners(): void {
    this._gestureRecognizer.on(GestureType.PINCH, (event: any) => {
      this._dispatchGestureEvent(InputEventType.GESTURE_CHANGE, event);
    });

    this._gestureRecognizer.on(GestureType.ROTATE, (event: any) => {
      this._dispatchGestureEvent(InputEventType.GESTURE_CHANGE, event);
    });

    this._gestureRecognizer.on(GestureType.PAN, (event: any) => {
      this._dispatchGestureEvent(InputEventType.GESTURE_CHANGE, event);
    });
  }

  /**
   * 处理鼠标按下事件
   */
  private _handleMouseDown(event: MouseEvent): void {
    if (this._config.preventDefault) {
      event.preventDefault();
    }
    if (this._config.stopPropagation) {
      event.stopPropagation();
    }

    const worldPosition = this._screenToWorld({ x: event.clientX, y: event.clientY });

    this._inputState.setMousePosition(worldPosition);
    this._inputState.setMouseButtonDown(event.button);
    this._inputState.setModifiers({
      ctrl: event.ctrlKey,
      shift: event.shiftKey,
      alt: event.altKey,
      meta: event.metaKey
    });

    // 检测双击
    const now = performance.now();
    const distance = Math.sqrt(
      Math.pow(worldPosition.x - this._lastClickPosition.x, 2) +
      Math.pow(worldPosition.y - this._lastClickPosition.y, 2)
    );

    if (now - this._lastClickTime < this._doubleClickDelay &&
        distance < this._doubleClickMaxDistance) {
      this._dispatchMouseEvent(InputEventType.DOUBLE_CLICK, event, worldPosition);
      this._lastClickTime = 0; // 重置，避免三击
    } else {
      this._dispatchMouseEvent(InputEventType.MOUSE_DOWN, event, worldPosition);
      this._startLongPressDetection(worldPosition);
    }

    this._lastClickTime = now;
    this._lastClickPosition = worldPosition;

    // 记录拖拽开始位置
    this._dragStartPosition = worldPosition;
  }

  /**
   * 处理鼠标移动事件
   */
  private _handleMouseMove(event: MouseEvent): void {
    if (this._config.preventDefault) {
      event.preventDefault();
    }

    const worldPosition = this._screenToWorld({ x: event.clientX, y: event.clientY });
    this._inputState.setMousePosition(worldPosition);

    // 检测拖拽
    this._checkDragStart(worldPosition);

    // 如果正在拖拽，发送拖拽移动事件
    if (this._isDragging) {
      this._dispatchDragEvent(InputEventType.DRAG_MOVE, worldPosition);
    }

    this._dispatchMouseEvent(InputEventType.MOUSE_MOVE, event, worldPosition);
    this._cancelLongPress(); // 移动时取消长按
  }

  /**
   * 处理鼠标抬起事件
   */
  private _handleMouseUp(event: MouseEvent): void {
    if (this._config.preventDefault) {
      event.preventDefault();
    }

    const worldPosition = this._screenToWorld({ x: event.clientX, y: event.clientY });
    this._inputState.setMouseButtonUp(event.button);

    this._dispatchMouseEvent(InputEventType.MOUSE_UP, event, worldPosition);
    this._dispatchMouseEvent(InputEventType.CLICK, event, worldPosition);
    this._cancelLongPress();

    // 结束拖拽
    this._endDrag(worldPosition);
  }

  /**
   * 处理鼠标滚轮事件
   */
  private _handleMouseWheel(event: WheelEvent): void {
    if (this._config.preventDefault) {
      event.preventDefault();
    }

    const worldPosition = this._screenToWorld({ x: event.clientX, y: event.clientY });
    this._dispatchMouseEvent(InputEventType.MOUSE_WHEEL, event, worldPosition, {
      deltaX: event.deltaX,
      deltaY: event.deltaY,
      deltaZ: event.deltaZ
    });
  }

  /**
   * 处理鼠标进入事件
   */
  private _handleMouseEnter(event: MouseEvent): void {
    const worldPosition = this._screenToWorld({ x: event.clientX, y: event.clientY });
    this._dispatchMouseEvent(InputEventType.MOUSE_ENTER, event, worldPosition);
  }

  /**
   * 处理鼠标离开事件
   */
  private _handleMouseLeave(event: MouseEvent): void {
    const worldPosition = this._screenToWorld({ x: event.clientX, y: event.clientY });
    this._dispatchMouseEvent(InputEventType.MOUSE_LEAVE, event, worldPosition);
    this._cancelLongPress();
  }

  /**
   * 处理右键菜单事件
   */
  private _handleContextMenu(event: MouseEvent): void {
    if (this._config.preventDefault) {
      event.preventDefault();
    }
  }

  /**
   * 处理触摸开始事件
   */
  private _handleTouchStart(event: TouchEvent): void {
    if (this._config.preventDefault) {
      event.preventDefault();
    }

    this._processTouchEvent(InputEventType.TOUCH_START, event);

    if (this._config.enableGestures) {
      this._gestureRecognizer.handleTouchStart(this._createTouchEvent(event));
    }
  }

  /**
   * 处理触摸移动事件
   */
  private _handleTouchMove(event: TouchEvent): void {
    if (this._config.preventDefault) {
      event.preventDefault();
    }

    this._processTouchEvent(InputEventType.TOUCH_MOVE, event);

    if (this._config.enableGestures) {
      this._gestureRecognizer.handleTouchMove(this._createTouchEvent(event));
    }
  }

  /**
   * 处理触摸结束事件
   */
  private _handleTouchEnd(event: TouchEvent): void {
    if (this._config.preventDefault) {
      event.preventDefault();
    }

    this._processTouchEvent(InputEventType.TOUCH_END, event);

    if (this._config.enableGestures) {
      this._gestureRecognizer.handleTouchEnd(this._createTouchEvent(event));
    }
  }

  /**
   * 处理触摸取消事件
   */
  private _handleTouchCancel(event: TouchEvent): void {
    this._processTouchEvent(InputEventType.TOUCH_CANCEL, event);

    if (this._config.enableGestures) {
      this._gestureRecognizer.handleTouchCancel(this._createTouchEvent(event));
    }
  }

  /**
   * 处理键盘按下事件
   */
  private _handleKeyDown(event: KeyboardEvent): void {
    this._inputState.setKeyDown(event.key);
    this._inputState.setModifiers({
      ctrl: event.ctrlKey,
      shift: event.shiftKey,
      alt: event.altKey,
      meta: event.metaKey
    });

    const customEvent = this._createKeyEvent(InputEventType.KEY_DOWN, event);
    this.emit('keydown' as any, customEvent);
  }

  /**
   * 处理键盘抬起事件
   */
  private _handleKeyUp(event: KeyboardEvent): void {
    this._inputState.setKeyUp(event.key);

    const customEvent = this._createKeyEvent(InputEventType.KEY_UP, event);
    this.emit('keyup' as any, customEvent);
  }

  /**
   * 分发鼠标事件
   */
  private _dispatchMouseEvent(
    type: InputEventType,
    nativeEvent: MouseEvent,
    worldPosition: IPoint,
    additional?: Partial<IMouseEvent>
  ): void {
    const event = this._createMouseEvent(type, nativeEvent, worldPosition);
    if (additional) {
      Object.assign(event, additional);
    }
    this.emit(event.type as any, event);
  }

  /**
   * 分发手势事件
   */
  private _dispatchGestureEvent(type: InputEventType, gestureData: any): void {
    const event = this._createGestureEvent(type, gestureData);
    this.emit(event.type as any, event);
  }

  /**
   * 处理触摸事件
   */
  private _processTouchEvent(type: InputEventType, nativeEvent: TouchEvent): void {
    // 更新触摸状态
    for (let i = 0; i < nativeEvent.changedTouches.length; i++) {
      const touch = nativeEvent.changedTouches[i];
      const worldPosition = this._screenToWorld({ x: touch.clientX, y: touch.clientY });
      const touchData = {
        identifier: touch.identifier,
        screenPosition: { x: touch.clientX, y: touch.clientY },
        worldPosition,
        force: touch.force,
        radiusX: touch.radiusX,
        radiusY: touch.radiusY
      };

      if (type === InputEventType.TOUCH_START || type === InputEventType.TOUCH_MOVE) {
        this._inputState.setTouch(touchData);
      } else {
        this._inputState.removeTouch(touch.identifier);
      }
    }

    const event = this._createTouchEvent(nativeEvent);
    this.emit(event.type as any, event);
  }

  /**
   * 开始长按检测
   */
  private _startLongPressDetection(position: IPoint): void {
    this._cancelLongPress();

    this._longPressTimer = window.setTimeout(() => {
      this._dispatchLongPressEvent(position);
    }, this._longPressDelay);
  }

  /**
   * 取消长按检测
   */
  private _cancelLongPress(): void {
    if (this._longPressTimer) {
      clearTimeout(this._longPressTimer);
      this._longPressTimer = undefined;
    }
  }

  /**
   * 分发长按事件
   */
  private _dispatchLongPressEvent(position: IPoint): void {
    const event = {
      type: InputEventType.LONG_PRESS,
      timestamp: performance.now(),
      position,
      preventDefault: () => {},
      stopPropagation: () => {},
      isDefaultPrevented: () => false,
      isPropagationStopped: () => false
    } as IBaseEvent & { position: IPoint };

    this.emit(event.type as any, event);
  }

  /**
   * 屏幕坐标转世界坐标
   */
  private _screenToWorld(screenPosition: IPoint): IPoint {
    if (this._viewportTransform) {
      return this._viewportTransform.screenToWorld(screenPosition);
    }

    // 默认实现：相对于画布的坐标
    const rect = this._canvas.getBoundingClientRect();
    return {
      x: screenPosition.x - rect.left,
      y: screenPosition.y - rect.top
    };
  }

  /**
   * 创建鼠标事件
   */
  private _createMouseEvent(type: string, nativeEvent: MouseEvent, worldPosition: IPoint): IMouseEvent {
    return {
      type,
      timestamp: performance.now(),
      pointerId: 1,
      screenPosition: { x: nativeEvent.clientX, y: nativeEvent.clientY },
      worldPosition,
      button: nativeEvent.button,
      buttons: nativeEvent.buttons,
      ctrlKey: nativeEvent.ctrlKey,
      shiftKey: nativeEvent.shiftKey,
      altKey: nativeEvent.altKey,
      metaKey: nativeEvent.metaKey,
      preventDefault: () => nativeEvent.preventDefault(),
      stopPropagation: () => nativeEvent.stopPropagation(),
      isDefaultPrevented: () => nativeEvent.defaultPrevented,
      isPropagationStopped: () => false
    } as IMouseEvent;
  }

  /**
   * 创建触摸事件
   */
  private _createTouchEvent(nativeEvent: TouchEvent): ITouchEvent {
    const convertTouches = (touches: TouchList) => {
      const touchArray: Touch[] = [];
      for (let i = 0; i < touches.length; i++) {
        touchArray.push(touches[i]);
      }
      return touchArray.map(touch => ({
        identifier: touch.identifier,
        screenPosition: { x: touch.clientX, y: touch.clientY },
        worldPosition: this._screenToWorld({ x: touch.clientX, y: touch.clientY }),
        force: touch.force,
        radiusX: touch.radiusX,
        radiusY: touch.radiusY
      }));
    };

    return {
      type: nativeEvent.type,
      timestamp: performance.now(),
      touches: convertTouches(nativeEvent.touches),
      changedTouches: convertTouches(nativeEvent.changedTouches),
      targetTouches: convertTouches(nativeEvent.targetTouches),
      preventDefault: () => nativeEvent.preventDefault(),
      stopPropagation: () => nativeEvent.stopPropagation(),
      isDefaultPrevented: () => nativeEvent.defaultPrevented,
      isPropagationStopped: () => false
    } as ITouchEvent;
  }

  /**
   * 创建手势事件
   */
  private _createGestureEvent(type: string, gestureData: any): IGestureEvent {
    return {
      type,
      timestamp: performance.now(),
      center: gestureData.center || { x: 0, y: 0 },
      scale: gestureData.scale || 1,
      rotation: gestureData.rotation || 0,
      velocity: gestureData.velocity || new Vector2(0, 0),
      deltaScale: gestureData.deltaScale || 0,
      deltaRotation: gestureData.deltaRotation || 0,
      deltaTranslation: gestureData.deltaTranslation || new Vector2(0, 0),
      preventDefault: () => {},
      stopPropagation: () => {},
      isDefaultPrevented: () => false,
      isPropagationStopped: () => false
    } as IGestureEvent;
  }

  /**
   * 创建键盘事件
   */
  private _createKeyEvent(type: string, nativeEvent: KeyboardEvent): IBaseEvent & { key: string; code: string } {
    return {
      type,
      timestamp: performance.now(),
      key: nativeEvent.key,
      code: nativeEvent.code,
      preventDefault: () => nativeEvent.preventDefault(),
      stopPropagation: () => nativeEvent.stopPropagation(),
      isDefaultPrevented: () => nativeEvent.defaultPrevented,
      isPropagationStopped: () => false
    } as IBaseEvent & { key: string; code: string };
  }

  /**
   * 检测拖拽开始
   */
  private _checkDragStart(currentPosition: IPoint): void {
    if (this._isDragging || !this._inputState.isMouseButtonDown(0)) {
      return;
    }

    const distance = Math.sqrt(
      Math.pow(currentPosition.x - this._dragStartPosition.x, 2) +
      Math.pow(currentPosition.y - this._dragStartPosition.y, 2)
    );

    if (distance > this._dragThreshold) {
      this._isDragging = true;
      this._dispatchDragEvent(InputEventType.DRAG_START, currentPosition);
    }
  }

  /**
   * 结束拖拽
   */
  private _endDrag(position: IPoint): void {
    if (this._isDragging) {
      this._isDragging = false;
      this._dispatchDragEvent(InputEventType.DRAG_END, position);
    }
  }

  /**
   * 分发拖拽事件
   */
  private _dispatchDragEvent(type: InputEventType, position: IPoint): void {
    const event = {
      type,
      timestamp: performance.now(),
      position,
      startPosition: this._dragStartPosition,
      preventDefault: () => {},
      stopPropagation: () => {},
      isDefaultPrevented: () => false,
      isPropagationStopped: () => false
    } as IBaseEvent & {
      position: IPoint;
      startPosition: IPoint;
    };

    this.emit(event.type as any, event);
  }

  /**
   * 销毁交互管理器
   */
  dispose(): void {
    // 1. 先发送 destroy 事件
    this.emit('destroy', this);

    // 2. 清理资源
    this._removeEventListeners();
    this._cancelLongPress();
    this._gestureRecognizer.dispose?.();

    // 3. 最后移除所有监听器
    this.removeAllListeners();
  }
}