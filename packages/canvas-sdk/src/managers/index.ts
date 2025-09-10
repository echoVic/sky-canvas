/**
 * 管理器层 - 协调 Services 和 Business 层
 * 为复杂的 ViewModels 提供业务逻辑协调
 */

export { CanvasManager } from './CanvasManager';
export type { ICanvasManager } from './CanvasManager';

export { ToolManager } from './ToolManager';
export type { IToolManager } from './ToolManager';

export { SceneManager } from './SceneManager';
export type { ISceneManager, ILayerInfo, ISceneState } from './SceneManager';

export { ImportExportManager } from './ImportExportManager';
export type { IImportExportManager, IBatchOperationOptions } from './ImportExportManager';

export { TransactionManager } from './TransactionManager';
export type { ITransactionManager } from './TransactionManager';
export { transactional, transactionalAsync } from './TransactionManager';
