/**
 * MVVM架构 - ViewModel层导出
 */

// ViewModel 接口
export * from './interfaces/IViewModel';

// ViewModel 实现
export * from './SceneViewModel';
export * from './ViewportViewModel';
export * from './SelectionViewModel';

// 画布视图模型（保持兼容性）
// export * from './canvas/CanvasViewModel';

// 其他视图模型（扩展时添加）
// export * from './shapes/ShapeViewModel';
// export * from './tools/ToolViewModel';
// export * from './history/HistoryViewModel';