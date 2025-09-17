/**
 * 统一的事件类型定义
 * 集中管理所有交互相关的事件类型和常量
 */

/**
 * 输入事件类型枚举
 * 统一所有输入相关的事件类型
 */
export enum InputEventType {
  // === 鼠标事件 ===
  MOUSE_DOWN = 'mousedown',
  MOUSE_MOVE = 'mousemove',
  MOUSE_UP = 'mouseup',
  MOUSE_WHEEL = 'mousewheel',
  MOUSE_ENTER = 'mouseenter',
  MOUSE_LEAVE = 'mouseleave',

  // === 触摸事件 ===
  TOUCH_START = 'touchstart',
  TOUCH_MOVE = 'touchmove',
  TOUCH_END = 'touchend',
  TOUCH_CANCEL = 'touchcancel',

  // === 键盘事件 ===
  KEY_DOWN = 'keydown',
  KEY_UP = 'keyup',
  KEY_PRESS = 'keypress',

  // === 手势事件 ===
  GESTURE_START = 'gesturestart',
  GESTURE_CHANGE = 'gesturechange',
  GESTURE_END = 'gestureend',
  GESTURE_CANCEL = 'gesturecancel',

  // === 组合事件 ===
  CLICK = 'click',
  DOUBLE_CLICK = 'doubleclick',
  LONG_PRESS = 'longpress',

  // === 拖拽事件 ===
  DRAG_START = 'dragstart',
  DRAG_MOVE = 'dragmove',
  DRAG_END = 'dragend'
}

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
 * 事件桥接类型枚举
 */
export enum BridgeEventType {
  // 输入事件
  MOUSE_DOWN = 'mousedown',
  MOUSE_MOVE = 'mousemove',
  MOUSE_UP = 'mouseup',
  MOUSE_WHEEL = 'mousewheel',

  // 触摸事件
  TOUCH_START = 'touchstart',
  TOUCH_MOVE = 'touchmove',
  TOUCH_END = 'touchend',
  TOUCH_CANCEL = 'touchcancel',

  // 键盘事件
  KEY_DOWN = 'keydown',
  KEY_UP = 'keyup',

  // 手势事件
  GESTURE_START = 'gesturestart',
  GESTURE_CHANGE = 'gesturechange',
  GESTURE_END = 'gestureend',

  // 场景事件
  SCENE_UPDATE = 'sceneupdate',
  SELECTION_CHANGE = 'selectionchange',
  TRANSFORM_CHANGE = 'transformchange',

  // 系统事件
  RENDER_START = 'renderstart',
  RENDER_END = 'renderend',
  FRAME_START = 'framestart',
  FRAME_END = 'frameend'
}

/**
 * 事件优先级
 */
export enum EventPriority {
  IMMEDIATE = 0,    // 立即处理（如鼠标点击）
  HIGH = 1,         // 高优先级（如键盘输入）
  NORMAL = 2,       // 正常优先级（如鼠标移动）
  LOW = 3,          // 低优先级（如场景更新）
  IDLE = 4          // 空闲时处理（如统计更新）
}

/**
 * 碰撞检测类型
 */
export enum CollisionType {
  POINT = 'point',
  CIRCLE = 'circle',
  RECT = 'rect',
  POLYGON = 'polygon'
}

/**
 * 事件常量定义
 */
export const EVENT_CONSTANTS = Object.freeze({
  // 双击检测
  DOUBLE_CLICK_DELAY: 300,
  DOUBLE_CLICK_MAX_DISTANCE: 5,

  // 长按检测
  LONG_PRESS_DELAY: 500,

  // 手势识别阈值
  GESTURE_MIN_DISTANCE: 10,
  GESTURE_MIN_SCALE: 0.1,
  GESTURE_MIN_ROTATION: 0.1,

  // 事件去重窗口
  DEDUPLICATION_WINDOW: 16, // 16ms

  // 事件处理超时
  EVENT_TIMEOUT: 5000,

  // 队列限制
  MAX_QUEUE_SIZE: 1000,
  MAX_LISTENERS_PER_EVENT: 50,

  // 时间片调度
  TIME_SLICE: 5 // 5ms
});

/**
 * 修饰键状态
 */
export interface ModifierState {
  ctrl: boolean;
  shift: boolean;
  alt: boolean;
  meta: boolean;
}

/**
 * 鼠标按键映射
 */
export const MOUSE_BUTTONS = Object.freeze({
  PRIMARY: 0,   // 主按键（通常是左键）
  AUXILIARY: 1, // 辅助按键（通常是滚轮）
  SECONDARY: 2, // 次按键（通常是右键）
  FOURTH: 3,    // 第四个按键（通常是后退键）
  FIFTH: 4      // 第五个按键（通常是前进键）
});

/**
 * 键盘键码映射（常用键）
 */
export const KEY_CODES = Object.freeze({
  // 方向键
  ARROW_UP: 'ArrowUp',
  ARROW_DOWN: 'ArrowDown',
  ARROW_LEFT: 'ArrowLeft',
  ARROW_RIGHT: 'ArrowRight',

  // 功能键
  ESCAPE: 'Escape',
  ENTER: 'Enter',
  SPACE: 'Space',
  TAB: 'Tab',
  BACKSPACE: 'Backspace',
  DELETE: 'Delete',

  // 修饰键
  SHIFT: 'Shift',
  CTRL: 'Control',
  ALT: 'Alt',
  META: 'Meta',

  // 字母键（部分）
  A: 'KeyA',
  C: 'KeyC',
  V: 'KeyV',
  X: 'KeyX',
  Z: 'KeyZ',
  Y: 'KeyY'
});