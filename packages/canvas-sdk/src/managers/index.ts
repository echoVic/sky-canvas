/**
 * 管理器层 - 协调 Services 和 Business 层
 * 为复杂的 ViewModels 提供业务逻辑协调
 */

export { CanvasManager, ICanvasManager } from './CanvasManager'
export type { CanvasStats } from './ICanvasManager'
export type { ILayerInfo, ISceneManagerState } from './SceneManager'
export { ISceneManager, SceneManager } from './SceneManager'
export type { IToolManager } from './ToolManager'
export { ToolManager } from './ToolManager'
export type { ITransactionManager } from './TransactionManager'
export { TransactionManager, transactional, transactionalAsync } from './TransactionManager'
