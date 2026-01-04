/**
 * 管理器层 - 协调 Services 和 Business 层
 * 为复杂的 ViewModels 提供业务逻辑协调
 */

export { CanvasManager, ICanvasManager } from './CanvasManager';
export type { CanvasStats } from './ICanvasManager';

export { ToolManager } from './ToolManager';
export type { IToolManager } from './ToolManager';

export { ISceneManager, SceneManager } from './SceneManager';
export type { ILayerInfo, ISceneManagerState } from './SceneManager';


export { transactional, transactionalAsync, TransactionManager } from './TransactionManager';
export type { ITransactionManager } from './TransactionManager';

