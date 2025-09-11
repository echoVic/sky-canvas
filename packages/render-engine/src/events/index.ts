/**
 * 统一事件系统导出
 */

// 基础事件总线和事件发射器
export {
  EventBus, eventBus, EventEmitter, InputEventType
} from './EventBus';

export type {
  EventListener, IDisposable, IEventBus
} from './EventBus';

// 输入事件系统
export {
  BaseEvent, InputEventFactory, InputState
} from './InputEvents';

export type {
  IPoint as EventIPoint, IBaseEvent, IGestureEvent, IMouseEvent, 
  EventListener as InputEventListener, IPointerEvent, ITouch, ITouchEvent
} from './InputEvents';

// 事件分发器
export { EventDispatcher, GlobalEventDispatcher } from './EventDispatcher';

// 手势识别器
export { GestureRecognizer } from './GestureRecognizer';

export type {
  GestureState, GestureType, IGestureConfig
} from './GestureRecognizer';

// 向后兼容的简化接口
export { EventBus as UnifiedEventBus } from './EventBus';
export { EventDispatcher as UnifiedEventDispatcher } from './EventDispatcher';
export { GestureRecognizer as UnifiedGestureRecognizer } from './GestureRecognizer';
