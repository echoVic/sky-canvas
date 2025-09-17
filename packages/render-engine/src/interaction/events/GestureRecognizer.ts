/**
 * 手势识别器 - 识别和处理多点触控手势
 */

import EventEmitter3 from 'eventemitter3';
import { Vector2 } from '../../math/Vector2';
import { IGestureEvent, IPoint, ITouchEvent, createGestureEvent } from './InputEvents';

/**
 * 手势类型枚举
 */
export enum GestureType {
  PINCH = 'pinch',
  ROTATE = 'rotate',
  PAN = 'pan',
  TAP = 'tap',
  DOUBLE_TAP = 'doubletap',
  LONG_PRESS = 'longpress'
}

/**
 * 手势状态枚举
 */
export enum GestureState {
  POSSIBLE = 'possible',
  BEGAN = 'began',
  CHANGED = 'changed',
  ENDED = 'ended',
  CANCELLED = 'cancelled',
  FAILED = 'failed'
}

/**
 * 手势配置接口
 */
export interface IGestureConfig {
  minDistance?: number;
  minScale?: number;
  minRotation?: number;
  tapTimeout?: number;
  longPressTimeout?: number;
  doubleTapDelay?: number;
}

// 手势识别器事件接口
export interface GestureRecognizerEvents {
  // 标准事件
  update: GestureRecognizer;
  destroy: GestureRecognizer;

  // 手势识别事件
  gesturestart: IGestureEvent;
  gesturechange: IGestureEvent;
  gestureend: IGestureEvent;
  gesturecancel: IGestureEvent;
  tap: { position: IPoint };
  doubletap: { position: IPoint };
  longpress: { position: IPoint };
  pan: { startPosition: IPoint; currentPosition: IPoint; deltaX: number; deltaY: number };
  pinch: { scale: number; center: IPoint };
  rotate: { rotation: number; center: IPoint };
}

/**
 * 手势识别器
 */
export class GestureRecognizer extends EventEmitter3<GestureRecognizerEvents> {
  private _enabled = true;
  private _config: Required<IGestureConfig>;
  
  // 触摸状态
  private _activeTouches: Map<number, IPoint> = new Map();
  private _lastTouchPositions: IPoint[] = [];
  private _lastDistance = 0;
  private _lastAngle = 0;
  private _lastCenter: IPoint = { x: 0, y: 0 };
  private _initialCenter: IPoint = { x: 0, y: 0 };
  
  // 手势状态
  private _gestureActive = false;
  private _gestureType?: GestureType;
  private _gestureState = GestureState.POSSIBLE;
  
  // 计时器
  private _tapTimer?: number;
  private _longPressTimer?: number;
  private _doubleTapTimer?: number;
  
  // 累计变化
  private _totalScale = 1;
  private _totalRotation = 0;
  private _totalTranslation = new Vector2(0, 0);

  constructor(config: IGestureConfig = {}) {
    super();
    
    this._config = {
      minDistance: config.minDistance ?? 10,
      minScale: config.minScale ?? 0.1,
      minRotation: config.minRotation ?? 0.1,
      tapTimeout: config.tapTimeout ?? 300,
      longPressTimeout: config.longPressTimeout ?? 500,
      doubleTapDelay: config.doubleTapDelay ?? 300
    };
  }

  /**
   * 启用/禁用手势识别
   */
  setEnabled(enabled: boolean): void {
    this._enabled = enabled;
    if (!enabled) {
      this._reset();
    }
  }

  isEnabled(): boolean {
    return this._enabled;
  }

  /**
   * 处理触摸开始事件
   */
  handleTouchStart(event: ITouchEvent): void {
    if (!this._enabled) return;

    // 更新触摸点
    for (const touch of event.changedTouches) {
      if (touch && touch.identifier !== undefined) {
        this._activeTouches.set(touch.identifier, touch.worldPosition);
      }
    }

    const touchCount = this._activeTouches.size;

    if (touchCount === 1) {
      // 单指触摸 - 可能是点击或长按
      this._handleSingleTouchStart(event);
    } else if (touchCount === 2) {
      // 双指触摸 - 开始手势识别
      this._handleGestureStart();
    } else if (touchCount > 2) {
      // 多指触摸 - 取消当前手势
      this._cancelGesture();
    }
  }

  /**
   * 处理触摸移动事件
   */
  handleTouchMove(event: ITouchEvent): void {
    if (!this._enabled) return;

    // 更新触摸点
    for (const touch of event.changedTouches) {
      if (touch && touch.identifier !== undefined) {
        this._activeTouches.set(touch.identifier, touch.worldPosition);
      }
    }

    const touchCount = this._activeTouches.size;

    if (touchCount === 1) {
      // 单指移动 - 可能是拖拽
      this._handleSingleTouchMove(event);
    } else if (touchCount === 2 && this._gestureActive) {
      // 双指移动 - 更新手势
      this._handleGestureChange();
    }
  }

  /**
   * 处理触摸结束事件
   */
  handleTouchEnd(event: ITouchEvent): void {
    if (!this._enabled) return;

    // 移除结束的触摸点
    for (const touch of event.changedTouches) {
      if (touch && touch.identifier !== undefined) {
        this._activeTouches.delete(touch.identifier);
      }
    }

    const touchCount = this._activeTouches.size;

    if (touchCount === 0) {
      // 所有触摸结束
      this._handleAllTouchesEnded();
    } else if (touchCount === 1 && this._gestureActive) {
      // 从双指变为单指 - 结束手势
      this._endGesture();
    }
  }

  /**
   * 处理触摸取消事件
   */
  handleTouchCancel(event: ITouchEvent): void {
    if (!this._enabled) return;

    this._cancelGesture();
    this._reset();
  }

  /**
   * 处理单指触摸开始
   */
  private _handleSingleTouchStart(event: ITouchEvent): void {
    const touch = event.changedTouches[0];
    if (!touch) return;

    // 设置长按计时器
    this._longPressTimer = window.setTimeout(() => {
      this._recognizeLongPress(touch.worldPosition);
    }, this._config.longPressTimeout);

    // 清除之前的点击计时器
    if (this._tapTimer) {
      clearTimeout(this._tapTimer);
      this._tapTimer = undefined;
    }
  }

  /**
   * 处理单指移动
   */
  private _handleSingleTouchMove(event: ITouchEvent): void {
    // 如果移动距离超过阈值，取消点击和长按
    const touch = event.changedTouches[0];
    if (!touch) return;

    const startPosition = this._activeTouches.get(touch.identifier);
    if (startPosition) {
      const distance = this._calculateDistance(startPosition, touch.worldPosition);
      if (distance > this._config.minDistance) {
        this._clearTimers();
      }
    }
  }

  /**
   * 处理手势开始
   */
  private _handleGestureStart(): void {
    if (this._activeTouches.size !== 2) return;

    const touches = Array.from(this._activeTouches.values());
    // 确保有两个有效的触摸点
    if (touches.length !== 2 || !touches[0] || !touches[1]) return;
    
    this._lastTouchPositions = [...touches];
    this._lastDistance = this._calculateDistance(touches[0], touches[1]);
    this._lastAngle = this._calculateAngle(touches[0], touches[1]);
    this._lastCenter = this._calculateCenter(touches);
    this._initialCenter = { ...this._lastCenter };
    
    this._gestureActive = true;
    this._gestureState = GestureState.BEGAN;
    this._totalScale = 1;
    this._totalRotation = 0;
    this._totalTranslation = new Vector2(0, 0);

    // 发送手势开始事件
    const gestureEvent = createGestureEvent(
      'gesturestart',
      this._lastCenter,
      this._totalScale,
      this._totalRotation,
      new Vector2(0, 0),
      0,
      0,
      new Vector2(0, 0)
    );
    this.emit('gesturestart', gestureEvent);

    // 清除其他计时器
    this._clearTimers();
  }

  /**
   * 处理手势变化
   */
  private _handleGestureChange(): void {
    if (!this._gestureActive || this._activeTouches.size !== 2) return;

    const touches = Array.from(this._activeTouches.values());
    const currentDistance = this._calculateDistance(touches[0], touches[1]);
    const currentAngle = this._calculateAngle(touches[0], touches[1]);
    const currentCenter = this._calculateCenter(touches);

    // 计算变化量
    const deltaScale = this._lastDistance > 0 ? (currentDistance - this._lastDistance) / this._lastDistance : 0;
    const deltaRotation = currentAngle - this._lastAngle;
    const deltaTranslation = new Vector2(
      currentCenter.x - this._lastCenter.x,
      currentCenter.y - this._lastCenter.y
    );

    // 更新累计值
    this._totalScale += deltaScale;
    this._totalRotation += deltaRotation;
    this._totalTranslation = this._totalTranslation.add(deltaTranslation);

    // 计算速度（简化版本）
    const velocity = new Vector2(
      deltaTranslation.x * 60, // 假设60fps
      deltaTranslation.y * 60
    );

    // 发送手势变化事件
    const gestureEvent = createGestureEvent(
      'gesturechange',
      currentCenter,
      this._totalScale,
      this._totalRotation,
      velocity,
      deltaScale,
      deltaRotation,
      deltaTranslation
    );
    this.emit('gesturechange', gestureEvent);

    // 更新上次状态
    this._lastTouchPositions = [...touches];
    this._lastDistance = currentDistance;
    this._lastAngle = currentAngle;
    this._lastCenter = currentCenter;
    this._gestureState = GestureState.CHANGED;
  }

  /**
   * 处理所有触摸结束
   */
  private _handleAllTouchesEnded(): void {
    if (this._gestureActive) {
      this._endGesture();
    } else {
      // 可能是点击
      this._handlePotentialTap();
    }
  }

  /**
   * 结束手势
   */
  private _endGesture(): void {
    if (!this._gestureActive) return;

    const gestureEvent = createGestureEvent(
      'gestureend',
      this._lastCenter,
      this._totalScale,
      this._totalRotation,
      new Vector2(0, 0),
      0,
      0,
      new Vector2(0, 0)
    );
    this.emit('gestureend', gestureEvent);

    this._reset();
  }

  /**
   * 取消手势
   */
  private _cancelGesture(): void {
    if (this._gestureActive) {
      const gestureEvent = createGestureEvent(
        'gesturecancel',
        this._lastCenter,
        this._totalScale,
        this._totalRotation,
        new Vector2(0, 0),
        0,
        0,
        new Vector2(0, 0)
      );
      this.emit('gesturecancel', gestureEvent);
    }

    this._reset();
  }

  /**
   * 处理可能的点击
   */
  private _handlePotentialTap(): void {
    if (this._activeTouches.size === 0 && this._longPressTimer) {
      // 是一个快速点击
      clearTimeout(this._longPressTimer);
      this._longPressTimer = undefined;

      if (this._doubleTapTimer) {
        // 双击
        clearTimeout(this._doubleTapTimer);
        this._doubleTapTimer = undefined;
        this._recognizeDoubleTap();
      } else {
        // 可能是单击，等待双击延迟
        this._doubleTapTimer = window.setTimeout(() => {
          this._recognizeTap();
          this._doubleTapTimer = undefined;
        }, this._config.doubleTapDelay);
      }
    }
  }

  /**
   * 识别点击
   */
  private _recognizeTap(): void {
    // 这里可以发送点击事件
    console.log('Tap recognized');
  }

  /**
   * 识别双击
   */
  private _recognizeDoubleTap(): void {
    // 这里可以发送双击事件
    console.log('Double tap recognized');
  }

  /**
   * 识别长按
   */
  private _recognizeLongPress(position: IPoint): void {
    // 这里可以发送长按事件
    console.log('Long press recognized at', position);
  }

  /**
   * 计算两点距离
   */
  private _calculateDistance(p1: IPoint, p2: IPoint): number {
    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  /**
   * 计算两点角度
   */
  private _calculateAngle(p1: IPoint, p2: IPoint): number {
    return Math.atan2(p2.y - p1.y, p2.x - p1.x);
  }

  /**
   * 计算多点中心
   */
  private _calculateCenter(points: IPoint[]): IPoint {
    if (points.length === 0) return { x: 0, y: 0 };
    
    const sum = points.reduce(
      (acc, point) => ({ x: acc.x + point.x, y: acc.y + point.y }),
      { x: 0, y: 0 }
    );
    
    return { x: sum.x / points.length, y: sum.y / points.length };
  }

  /**
   * 清除所有计时器
   */
  private _clearTimers(): void {
    if (this._tapTimer) {
      clearTimeout(this._tapTimer);
      this._tapTimer = undefined;
    }
    if (this._longPressTimer) {
      clearTimeout(this._longPressTimer);
      this._longPressTimer = undefined;
    }
    if (this._doubleTapTimer) {
      clearTimeout(this._doubleTapTimer);
      this._doubleTapTimer = undefined;
    }
  }

  /**
   * 重置状态
   */
  private _reset(): void {
    this._activeTouches.clear();
    this._lastTouchPositions = [];
    this._gestureActive = false;
    this._gestureState = GestureState.POSSIBLE;
    this._gestureType = undefined;
    this._totalScale = 1;
    this._totalRotation = 0;
    this._totalTranslation = new Vector2(0, 0);
    this._clearTimers();
  }

  /**
   * 获取当前手势状态
   */
  getGestureState(): GestureState {
    return this._gestureState;
  }

  /**
   * 获取当前手势类型
   */
  getGestureType(): GestureType | undefined {
    return this._gestureType;
  }

  /**
   * 销毁手势识别器
   */
  dispose(): void {
    // 1. 先发送 destroy 事件
    this.emit('destroy', this);

    // 2. 清理定时器和状态
    this._clearTimers();
    this._reset();

    // 3. 最后移除所有监听器
    this.removeAllListeners();
  }
}