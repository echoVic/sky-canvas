/**
 * 交互系统统一导出
 */

// 核心交互管理器
export { InteractionManager } from './InteractionManager';
export type { InteractionConfig, ViewportTransform } from './InteractionManager';

// 统一事件类型
export * from './EventTypes';

// 事件系统
export {
  InputState
} from './events';

export type {
  EventListener, IBaseEvent, IGestureEvent, IMouseEvent, IPointerEvent, ITouch, ITouchEvent
} from './events';

// 手势识别
export { GestureRecognizer, GestureState, GestureType } from './events/GestureRecognizer';
export type { IGestureConfig } from './events/GestureRecognizer';

// 事件桥接
export { EventBridge, globalEventBridge } from './EventBridge';
export type { BridgeEvent, BridgeEventListener, EventFilter, EventTransformer } from './EventBridge';
