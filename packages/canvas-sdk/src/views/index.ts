/**
 * MVVM架构 - View层导出
 * 真正的视图组件 - 画板上的视觉元素
 */

export * from './GuideView' // 辅助线视图
// 视图接口
export * from './interfaces/ICanvasView'
export * from './LayerView' // 图层视图（图层面板）
// 视图实现 - 画板上的视觉组件
export * from './SceneView' // 场景视图（背景、网格）
export * from './SelectionView' // 选择视图（选择框、手柄）
export * from './ShapeView' // 形状视图（图形渲染）

// 绑定适配器（扩展时添加）
// export * from './bindings/ReactCanvasBinding';
// export * from './bindings/VueCanvasBinding';
