/**
 * 工具 ViewModels - 管理工具状态和交互
 *
 * 架构说明：
 * - 简单工具：直接使用 Services (SelectTool -> SelectionService)
 * - 复杂工具：通过 Manager 协调多个 Services (DrawingTools -> CanvasManager)
 */

export type { IArrowToolState } from './ArrowToolViewModel'
export { ArrowToolViewModel, IArrowToolViewModel } from './ArrowToolViewModel'
export type { ICircleToolState } from './CircleToolViewModel'
export { CircleToolViewModel, ICircleToolViewModel } from './CircleToolViewModel'
export type { IDrawToolState } from './DrawToolViewModel'
export { DrawToolViewModel, IDrawToolViewModel } from './DrawToolViewModel'
export type { IEllipseToolState } from './EllipseToolViewModel'
export { EllipseToolViewModel, IEllipseToolViewModel } from './EllipseToolViewModel'
export type { IEraserToolState } from './EraserToolViewModel'
export { EraserToolViewModel, IEraserToolViewModel } from './EraserToolViewModel'
export type { IEyedropperToolState } from './EyedropperToolViewModel'
export { EyedropperToolViewModel, IEyedropperToolViewModel } from './EyedropperToolViewModel'
export type { IHandToolState } from './HandToolViewModel'
export { HandToolViewModel, IHandToolViewModel } from './HandToolViewModel'
export type { IImageToolState } from './ImageToolViewModel'
export { IImageToolViewModel, ImageToolViewModel } from './ImageToolViewModel'
export type { ILineToolState } from './LineToolViewModel'
export { ILineToolViewModel, LineToolViewModel } from './LineToolViewModel'
export type { IPolygonToolState } from './PolygonToolViewModel'
export { IPolygonToolViewModel, PolygonToolViewModel } from './PolygonToolViewModel'
export type { IRectangleToolState } from './RectangleToolViewModel'
export { IRectangleToolViewModel, RectangleToolViewModel } from './RectangleToolViewModel'
export type { HandlePosition, HandleType, IBounds, ISelectToolState } from './SelectToolViewModel'
export { ISelectToolViewModel, SelectToolViewModel } from './SelectToolViewModel'
export type { IStarToolState } from './StarToolViewModel'
export { IStarToolViewModel, StarToolViewModel } from './StarToolViewModel'
export type { ITextToolState } from './TextToolViewModel'
export { ITextToolViewModel, TextToolViewModel } from './TextToolViewModel'
