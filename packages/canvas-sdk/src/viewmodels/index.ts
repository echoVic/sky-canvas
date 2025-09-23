/**
 * MVVM架构 - ViewModel层导出
 */

// ViewModel 接口
export type * from './types/IViewModel';

// ViewModel 实现
export { SceneViewModel } from './SceneViewModel';
export { ViewportViewModel } from './ViewportViewModel';
export { SelectionViewModel } from './SelectionViewModel';

// 简单 ViewModels（直接使用 Services）
export * from './ThemeViewModel';
export * from './ZoomViewModel';

// 复杂 ViewModels（使用 Managers）
export * from './CanvasViewModel';
export * from './ToolViewModel';

// 形状 ViewModels
export * from './shapes';

// 其他视图模型（扩展时添加）
// export * from './shapes/ShapeViewModel';
// export * from './history/HistoryViewModel';