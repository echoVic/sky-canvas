/**
 * 工具 ViewModels - 管理工具状态和交互
 * 
 * 架构说明：
 * - 简单工具：直接使用 Services (SelectTool -> SelectionService)
 * - 复杂工具：通过 Manager 协调多个 Services (DrawingTools -> CanvasManager)
 */

export { ISelectToolViewModel, SelectToolViewModel } from './SelectToolViewModel';
export type { ISelectToolState } from './SelectToolViewModel';

export { IRectangleToolViewModel, RectangleToolViewModel } from './RectangleToolViewModel';
export type { IRectangleToolState } from './RectangleToolViewModel';

// TODO: 添加其他工具 ViewModels
// export { CircleToolViewModel } from './CircleToolViewModel';
// export { LineToolViewModel } from './LineToolViewModel';
// export { PathToolViewModel } from './PathToolViewModel';