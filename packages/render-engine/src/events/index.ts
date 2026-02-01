/**
 * 统一事件系统导出
 */

export type {
  EventListener,
  IDisposable,
  IEventBus,
} from './EventBus'
// 基础事件总线和事件发射器
// 向后兼容的简化接口
export {
  EventBus,
  EventBus as UnifiedEventBus,
  EventEmitter,
  eventBus,
  InputEventType,
} from './EventBus'
// 事件分发器
export {
  EventDispatcher,
  EventDispatcher as UnifiedEventDispatcher,
  GlobalEventDispatcher,
} from './EventDispatcher'
export type {
  GestureState,
  GestureType,
  IGestureConfig,
} from './GestureRecognizer'
// 手势识别器
export {
  GestureRecognizer,
  GestureRecognizer as UnifiedGestureRecognizer,
} from './GestureRecognizer'
export type {
  EventListener as InputEventListener,
  IBaseEvent,
  IGestureEvent,
  IMouseEvent,
  IPoint as EventIPoint,
  IPointerEvent,
  ITouch,
  ITouchEvent,
} from './InputEvents'
// 输入事件系统
export {
  BaseEvent,
  InputEventFactory,
  InputState,
} from './InputEvents'
export type {
  IGestureEvent as InputGestureEvent,
  IKeyboardEvent,
  IMouseEvent as InputMouseEvent,
  InputManagerConfig,
  InputManagerEvents,
  ITouchEvent as InputTouchEvent,
  ITouchPoint,
} from './InputManager'
// 统一输入管理器
export {
  createInputManager,
  InputManager,
  InputManager as UnifiedInputManager,
} from './InputManager'
