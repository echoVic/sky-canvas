/**
 * 统一事件系统导出
 */

// 基础事件总线和事件发射器
export { 
  EventBus, 
  EventEmitter, 
  eventBus, 
  InputEventType,
  IDisposable as EventIDisposable,
  Emitter,
  DisposableStore,
  MessageRouter,
  StateSynchronizationService,
  IMessage,
  IMessageHandler,
  IMessageMiddleware,
  IStateChangeEvent,
  IStateSubscriber
} from './EventBus';

// 输入事件系统
export { 
  IPoint as EventIPoint,
  IBaseEvent,
  IPointerEvent,
  IMouseEvent,
  ITouch,
  ITouchEvent,
  IGestureEvent,
  EventListener as InputEventListener,
  BaseEvent,
  InputState,
  InputEventFactory
} from './InputEvents';

// 事件分发器
export { EventDispatcher, GlobalEventDispatcher } from './EventDispatcher';

// 手势识别器
export { 
  GestureRecognizer, 
  GestureType, 
  GestureState, 
  IGestureConfig 
} from './GestureRecognizer';

// 向后兼容的简化接口
export { EventBus as UnifiedEventBus } from './EventBus';
export { EventDispatcher as UnifiedEventDispatcher } from './EventDispatcher';
export { GestureRecognizer as UnifiedGestureRecognizer } from './GestureRecognizer';