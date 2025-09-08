// import { Point } from '../../types'; // 未使用，暂时注释
import { Vector2 } from '../math';
import { EventType, GestureEvent, TouchEvent, EventFactory, EventDispatcher } from './EventSystem';

/**
 * 手势类型枚举
 */
export enum GestureType {
  TAP = 'tap',
  DOUBLE_TAP = 'doubletap',
  LONG_PRESS = 'longpress',
  PAN = 'pan',
  PINCH = 'pinch',
  ROTATE = 'rotate',
  SWIPE = 'swipe'
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
export interface GestureConfig {
  // 通用配置
  enabled: boolean;
  
  // 点击手势配置
  tapMaxDistance: number;
  tapMaxDuration: number;
  doubleTapMaxInterval: number;
  doubleTapMaxDistance: number;
  
  // 长按手势配置
  longPressMinDuration: number;
  longPressMaxDistance: number;
  
  // 平移手势配置
  panMinDistance: number;
  
  // 缩放手势配置
  pinchMinScale: number;
  pinchMaxScale: number;
  
  // 旋转手势配置
  rotateMinAngle: number;
  
  // 滑动手势配置
  swipeMinDistance: number;
  swipeMaxDuration: number;
  swipeMinVelocity: number;
}

/**
 * 触摸点追踪信息
 */
interface TouchTracker {
  id: number;
  startPosition: Vector2;
  currentPosition: Vector2;
  previousPosition: Vector2;
  startTime: number;
  lastMoveTime: number;
  velocity: Vector2;
}

/**
 * 手势识别器
 */
export class GestureRecognizer extends EventDispatcher {
  private _config: GestureConfig;
  private _activeTouches: Map<number, TouchTracker> = new Map();
  private _gestureState: GestureState = GestureState.POSSIBLE;
  private _currentGesture: GestureType | null = null;
  
  // 手势数据
  private _gestureCenter: Vector2 = new Vector2(0, 0);
  private _gestureScale: number = 1.0;
  private _gestureRotation: number = 0;
  private _gestureVelocity: Vector2 = new Vector2(0, 0);
  private _initialDistance: number = 0;
  private _initialAngle: number = 0;
  
  // 定时器
  private _longPressTimer: number | null = null;
  private _doubleTapTimer: number | null = null;
  private _lastTapTime: number = 0;
  private _lastTapPosition: Vector2 | null = null;

  constructor(config?: Partial<GestureConfig>) {
    super();
    
    this._config = {
      enabled: true,
      tapMaxDistance: 10,
      tapMaxDuration: 300,
      doubleTapMaxInterval: 300,
      doubleTapMaxDistance: 20,
      longPressMinDuration: 500,
      longPressMaxDistance: 10,
      panMinDistance: 10,
      pinchMinScale: 0.5,
      pinchMaxScale: 3.0,
      rotateMinAngle: 5 * Math.PI / 180, // 5度
      swipeMinDistance: 50,
      swipeMaxDuration: 300,
      swipeMinVelocity: 300,
      ...config
    };
  }

  /**
   * 处理触摸开始事件
   */
  handleTouchStart(event: TouchEvent): void {
    if (!this._config.enabled) return;

    for (const touch of event.changedTouches) {
      const tracker: TouchTracker = {
        id: touch.identifier,
        startPosition: new Vector2(touch.screenPosition.x, touch.screenPosition.y),
        currentPosition: new Vector2(touch.screenPosition.x, touch.screenPosition.y),
        previousPosition: new Vector2(touch.screenPosition.x, touch.screenPosition.y),
        startTime: performance.now(),
        lastMoveTime: performance.now(),
        velocity: new Vector2(0, 0)
      };
      
      this._activeTouches.set(touch.identifier, tracker);
    }

    this.updateGestureData();
    this.recognizeGestures();
  }

  /**
   * 处理触摸移动事件
   */
  handleTouchMove(event: TouchEvent): void {
    if (!this._config.enabled) return;

    const currentTime = performance.now();
    
    for (const touch of event.changedTouches) {
      const tracker = this._activeTouches.get(touch.identifier);
      if (!tracker) continue;

      tracker.previousPosition = tracker.currentPosition.clone();
      tracker.currentPosition = new Vector2(touch.screenPosition.x, touch.screenPosition.y);
      
      // 计算速度
      const deltaTime = currentTime - tracker.lastMoveTime;
      if (deltaTime > 0) {
        const deltaPosition = tracker.currentPosition.subtract(tracker.previousPosition);
        tracker.velocity = deltaPosition.multiplyScalar(1000 / deltaTime); // 像素/秒
      }
      
      tracker.lastMoveTime = currentTime;
    }

    this.updateGestureData();
    this.recognizeGestures();
  }

  /**
   * 处理触摸结束事件
   */
  handleTouchEnd(event: TouchEvent): void {
    if (!this._config.enabled) return;

    for (const touch of event.changedTouches) {
      this._activeTouches.delete(touch.identifier);
    }

    this.updateGestureData();
    this.recognizeGestures();
    
    if (this._activeTouches.size === 0) {
      this.endGesture();
    }
  }

  /**
   * 处理触摸取消事件
   */
  handleTouchCancel(event: TouchEvent): void {
    if (!this._config.enabled) return;

    for (const touch of event.changedTouches) {
      this._activeTouches.delete(touch.identifier);
    }

    this.cancelGesture();
  }

  /**
   * 更新手势数据
   */
  private updateGestureData(): void {
    const touches = Array.from(this._activeTouches.values());
    
    if (touches.length === 0) {
      return;
    }

    // 计算中心点
    let centerX = 0;
    let centerY = 0;
    for (const touch of touches) {
      centerX += touch.currentPosition.x;
      centerY += touch.currentPosition.y;
    }
    this._gestureCenter = new Vector2(centerX / touches.length, centerY / touches.length);

    // 计算平均速度
    let velocityX = 0;
    let velocityY = 0;
    for (const touch of touches) {
      velocityX += touch.velocity.x;
      velocityY += touch.velocity.y;
    }
    this._gestureVelocity = new Vector2(velocityX / touches.length, velocityY / touches.length);

    // 双指手势数据
    if (touches.length === 2) {
      const touch1 = touches[0];
      const touch2 = touches[1];
      
      if (touch1 && touch2) {
        // 计算距离和角度
        const currentDistance = touch1.currentPosition.distance(touch2.currentPosition);
        const currentAngle = Math.atan2(
          touch2.currentPosition.y - touch1.currentPosition.y,
          touch2.currentPosition.x - touch1.currentPosition.x
        );
      
      if (this._gestureState === GestureState.POSSIBLE) {
        this._initialDistance = currentDistance;
        this._initialAngle = currentAngle;
        this._gestureScale = 1.0;
        this._gestureRotation = 0;
      } else {
          this._gestureScale = currentDistance / this._initialDistance;
          this._gestureRotation = currentAngle - this._initialAngle;
        }
      }
    }
  }

  /**
   * 识别手势
   */
  private recognizeGestures(): void {
    const touchCount = this._activeTouches.size;
    
    if (touchCount === 0) {
      return;
    }

    if (touchCount === 1) {
      this.recognizeSingleTouchGestures();
    } else if (touchCount === 2) {
      this.recognizeMultiTouchGestures();
    }
  }

  /**
   * 识别单点触摸手势
   */
  private recognizeSingleTouchGestures(): void {
    const touch = Array.from(this._activeTouches.values())[0];
    if (!touch) return;
    
    const currentTime = performance.now();
    const duration = currentTime - touch.startTime;
    const distance = touch.startPosition.distance(touch.currentPosition);

    // 长按手势
    if (this._currentGesture === null && distance < this._config.longPressMaxDistance) {
      if (!this._longPressTimer) {
        this._longPressTimer = window.setTimeout(() => {
          if (this._activeTouches.has(touch.id)) {
            this.startGesture(GestureType.LONG_PRESS);
          }
        }, this._config.longPressMinDuration);
      }
    } else {
      this.clearLongPressTimer();
    }

    // 平移手势
    if (distance > this._config.panMinDistance) {
      if (this._currentGesture === null) {
        this.startGesture(GestureType.PAN);
      } else if (this._currentGesture === GestureType.PAN) {
        this.updateGesture();
      }
    }

    // 滑动手势检测（在触摸结束时）
    if (this._activeTouches.size === 0) {
      const velocity = this._gestureVelocity.magnitude();
      if (distance > this._config.swipeMinDistance && 
          duration < this._config.swipeMaxDuration &&
          velocity > this._config.swipeMinVelocity) {
        this.dispatchSwipeGesture(touch);
      }
    }
  }

  /**
   * 识别多点触摸手势
   */
  private recognizeMultiTouchGestures(): void {
    // 缩放手势
    if (Math.abs(this._gestureScale - 1.0) > 0.1) {
      if (this._currentGesture === null) {
        this.startGesture(GestureType.PINCH);
      } else if (this._currentGesture === GestureType.PINCH) {
        this.updateGesture();
      }
    }

    // 旋转手势
    if (Math.abs(this._gestureRotation) > this._config.rotateMinAngle) {
      if (this._currentGesture === null) {
        this.startGesture(GestureType.ROTATE);
      } else if (this._currentGesture === GestureType.ROTATE) {
        this.updateGesture();
      }
    }
  }

  /**
   * 开始手势
   */
  private startGesture(type: GestureType): void {
    this._currentGesture = type;
    this._gestureState = GestureState.BEGAN;
    
    const event = this.createGestureEvent(EventType.GESTURE_START);
    this.dispatchEvent(event);
  }

  /**
   * 更新手势
   */
  private updateGesture(): void {
    if (this._currentGesture === null) return;
    
    this._gestureState = GestureState.CHANGED;
    
    const event = this.createGestureEvent(EventType.GESTURE_CHANGE);
    this.dispatchEvent(event);
  }

  /**
   * 结束手势
   */
  private endGesture(): void {
    if (this._currentGesture !== null) {
      this._gestureState = GestureState.ENDED;
      
      const event = this.createGestureEvent(EventType.GESTURE_END);
      this.dispatchEvent(event);
    }

    // 检测点击手势
    this.checkTapGesture();
    
    this.resetGesture();
  }

  /**
   * 取消手势
   */
  private cancelGesture(): void {
    this._gestureState = GestureState.CANCELLED;
    this.resetGesture();
  }

  /**
   * 重置手势状态
   */
  private resetGesture(): void {
    this._currentGesture = null;
    this._gestureState = GestureState.POSSIBLE;
    this._gestureScale = 1.0;
    this._gestureRotation = 0;
    this._gestureVelocity = new Vector2(0, 0);
    this.clearLongPressTimer();
  }

  /**
   * 检测点击手势
   */
  private checkTapGesture(): void {
    if (this._activeTouches.size > 0) return;

    const currentTime = performance.now();
    
    // 检查是否为有效的点击
    const touches = Array.from(this._activeTouches.values());
    if (touches.length === 1) {
      const touch = touches[0];
      const duration = currentTime - touch.startTime;
      const distance = touch.startPosition.distance(touch.currentPosition);
      
      if (duration < this._config.tapMaxDuration && distance < this._config.tapMaxDistance) {
        // 检查双击
        if (this._lastTapTime > 0 && 
            currentTime - this._lastTapTime < this._config.doubleTapMaxInterval &&
            this._lastTapPosition &&
            touch.startPosition.distance(this._lastTapPosition) < this._config.doubleTapMaxDistance) {
          
          this.dispatchTapGesture(GestureType.DOUBLE_TAP, touch.startPosition);
          this._lastTapTime = 0;
          this._lastTapPosition = null;
        } else {
          // 延迟分发单击事件，等待可能的双击
          this._doubleTapTimer = window.setTimeout(() => {
            this.dispatchTapGesture(GestureType.TAP, touch.startPosition);
          }, this._config.doubleTapMaxInterval);
          
          this._lastTapTime = currentTime;
          this._lastTapPosition = touch.startPosition.clone();
        }
      }
    }
  }

  /**
   * 分发点击手势事件
   */
  private dispatchTapGesture(type: GestureType, position: Vector2): void {
    const event = EventFactory.createGestureEvent(
      EventType.GESTURE_START,
      { x: position.x, y: position.y },
      1.0,
      0,
      new Vector2(0, 0)
    );
    
    // 添加手势类型信息
    (event as GestureEvent & { gestureType: GestureType }).gestureType = type;
    
    this.dispatchEvent(event);
  }

  /**
   * 分发滑动手势事件
   */
  private dispatchSwipeGesture(touch: TouchTracker): void {
    const direction = touch.currentPosition.subtract(touch.startPosition).normalize();
    
    const event = EventFactory.createGestureEvent(
      EventType.GESTURE_START,
      { x: touch.currentPosition.x, y: touch.currentPosition.y },
      1.0,
      0,
      touch.velocity,
      0,
      0,
      direction
    );
    
    // 添加手势类型信息
    (event as GestureEvent & { gestureType: GestureType; swipeDirection: Vector2 }).gestureType = GestureType.SWIPE;
    (event as GestureEvent & { gestureType: GestureType; swipeDirection: Vector2 }).swipeDirection = direction;
    
    this.dispatchEvent(event);
  }

  /**
   * 创建手势事件
   */
  private createGestureEvent(type: EventType): GestureEvent {
    return EventFactory.createGestureEvent(
      type,
      { x: this._gestureCenter.x, y: this._gestureCenter.y },
      this._gestureScale,
      this._gestureRotation,
      this._gestureVelocity
    );
  }

  /**
   * 清除长按定时器
   */
  private clearLongPressTimer(): void {
    if (this._longPressTimer) {
      clearTimeout(this._longPressTimer);
      this._longPressTimer = null;
    }
  }

  /**
   * 清除双击定时器
   */
  private clearDoubleTapTimer(): void {
    if (this._doubleTapTimer) {
      clearTimeout(this._doubleTapTimer);
      this._doubleTapTimer = null;
    }
  }

  /**
   * 更新配置
   */
  updateConfig(config: Partial<GestureConfig>): void {
    Object.assign(this._config, config);
  }

  /**
   * 获取配置
   */
  getConfig(): GestureConfig {
    return { ...this._config };
  }

  /**
   * 启用/禁用手势识别
   */
  setEnabled(enabled: boolean): void {
    this._config.enabled = enabled;
    if (!enabled) {
      this.cancelGesture();
      this._activeTouches.clear();
    }
  }

  /**
   * 获取当前手势状态
   */
  getCurrentGesture(): { type: GestureType | null; state: GestureState } {
    return {
      type: this._currentGesture,
      state: this._gestureState
    };
  }

  /**
   * 销毁手势识别器
   */
  dispose(): void {
    this.cancelGesture();
    this._activeTouches.clear();
    this.clearLongPressTimer();
    this.clearDoubleTapTimer();
    this.removeAllListeners();
  }
}
