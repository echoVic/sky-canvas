/**
 * 接口优化系统导出
 * 提供Canvas SDK与Render Engine之间的高效通信机制
 */

// 数据桥接器
export {
  DataBridge,
  type DataChange,
  DataChangeType,
  globalDataBridge,
  type IncrementalData,
  type SyncConfig,
} from './DataBridge'
// 事件桥接器
export {
  type BridgeEvent,
  type BridgeEventListener,
  BridgeEventType,
  EventBridge,
  type EventFilter,
  EventPriority,
  type EventTransformer,
  globalEventBridge,
} from './EventBridge'
// 核心优化组件
export {
  BatchCallManager,
  DataTransferOptimizer,
  GlobalInterfaceOptimizer,
  globalInterfaceOptimizer,
  InterfaceInterceptor,
  ObjectPool,
  ObjectPoolManager,
} from './OptimizedInterface'
// 渲染桥接器
export {
  type BatchRenderCommand,
  CacheKeyGenerator,
  RenderBridge,
  type RenderCommand,
  RenderCommandOptimizer,
  RenderCommandType,
  type RenderState,
} from './RenderBridge'
