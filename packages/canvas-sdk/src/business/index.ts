/**
 * 业务层组件 - 复杂业务逻辑组件
 * 这些组件不通过DI管理，而是在需要时直接创建
 */

// 碰撞检测
export * from './collision/CollisionDetection';

// 选择管理
export * from './selection/SelectionManager';

// 手势识别
export * from './gestures/GestureRecognizer';