/**
 * 交互事件系统导出
 */

// 输入事件系统
export {
  BaseEvent, createGestureEvent, createMouseEvent, createTouchEvent, InputState
} from './InputEvents';

export type {
  IPoint, IBaseEvent, IGestureEvent, IMouseEvent,
  EventListener, IPointerEvent, ITouch, ITouchEvent
} from './InputEvents';

// 手势识别器
export { GestureRecognizer } from './GestureRecognizer';

export type {
  GestureState, GestureType, IGestureConfig
} from './GestureRecognizer';

