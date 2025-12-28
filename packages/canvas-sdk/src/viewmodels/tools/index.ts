/**
 * 工具 ViewModels - 管理工具状态和交互
 *
 * 架构说明：
 * - 简单工具：直接使用 Services (SelectTool -> SelectionService)
 * - 复杂工具：通过 Manager 协调多个 Services (DrawingTools -> CanvasManager)
 */

export { ISelectToolViewModel, SelectToolViewModel } from './SelectToolViewModel';
export type { ISelectToolState, HandleType, HandlePosition, IBounds } from './SelectToolViewModel';

export { IRectangleToolViewModel, RectangleToolViewModel } from './RectangleToolViewModel';
export type { IRectangleToolState } from './RectangleToolViewModel';

export { ICircleToolViewModel, CircleToolViewModel } from './CircleToolViewModel';
export type { ICircleToolState } from './CircleToolViewModel';

export { ILineToolViewModel, LineToolViewModel } from './LineToolViewModel';
export type { ILineToolState } from './LineToolViewModel';

export { ITextToolViewModel, TextToolViewModel } from './TextToolViewModel';
export type { ITextToolState } from './TextToolViewModel';

export { IArrowToolViewModel, ArrowToolViewModel } from './ArrowToolViewModel';
export type { IArrowToolState } from './ArrowToolViewModel';

export { IDrawToolViewModel, DrawToolViewModel } from './DrawToolViewModel';
export type { IDrawToolState } from './DrawToolViewModel';