/**
 * 形状 ViewModels - 管理具体形状的创建和编辑逻辑
 *
 * 架构说明：
 * - 每个形状 ViewModel 负责管理该形状的创建过程
 * - 直接使用 render-engine 的 Shape 类作为数据模型
 * - 通过 CanvasManager 将创建的形状添加到画布
 */

export { ICircleViewModel, CircleViewModel } from './CircleViewModel';
export type { ICircleState } from './CircleViewModel';

export { IRectangleViewModel, RectangleViewModel } from './RectangleViewModel';
export type { IRectangleState } from './RectangleViewModel';

// TODO: 添加其他形状 ViewModels
// export { LineViewModel } from './LineViewModel';
// export { PathViewModel } from './PathViewModel';
// export { TextViewModel } from './TextViewModel';