/**
 * 核心批处理模块导出
 */

export type {
  BatchStats, IBatchRenderer,
  IRenderable
} from './IBatchRenderer';

export type {
  BatchContext,
  BatchData, IBatchStrategy
} from './IBatchStrategy';

export {
  BatchBuffer,
  BatchDataUtils, type BatchKey,
  type RenderBatch, type Vertex
} from './BatchData';

export {
  BatchManager,
  createBatchManager,
  type BatchManagerConfig
} from './BatchManager';
