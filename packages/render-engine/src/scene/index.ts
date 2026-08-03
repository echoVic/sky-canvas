/**
 * 声明式场景模块导出
 */

export type { SceneInstances, TextDraw } from './convert'
export { parseColor, sceneToInstances } from './convert'
export { type Bounds, boundsIntersect, nodeBounds, nodeCenter } from './geometry'
export type { DocConnection, DocGroup, DocNode } from './document'
export { SceneDocument } from './document'
export type { OpResult, SceneOp } from './ops'
export { applyOps } from './ops'
export { SceneRenderer, type SceneRendererOptions } from './SceneRenderer'
export type {
  SceneSnapshot,
  SnapshotConnection,
  SnapshotObject,
  SnapshotOptions,
} from './snapshot'
export { snapshot, snapshotText } from './snapshot'
export type { Scene, SceneNode, SceneViewport } from './types'
