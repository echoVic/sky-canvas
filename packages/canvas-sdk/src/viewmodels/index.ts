/**
 * MVVM架构 - ViewModel层导出
 */

// ViewModel 接口
export * from './interfaces/IViewModel';

// ViewModel 实现
export * from './SceneViewModel';
export * from './ViewportViewModel';
export * from './SelectionViewModel';

// 简单 ViewModels（直接使用 Services）
export * from './ThemeViewModel';
export * from './ZoomViewModel';

// 复杂 ViewModels（使用 Managers）
export * from './CanvasViewModel';
export * from './ToolViewModel';

// 工具 ViewModels
export * from './tools';

// 其他视图模型（扩展时添加）
// export * from './shapes/ShapeViewModel';
// export * from './history/HistoryViewModel';