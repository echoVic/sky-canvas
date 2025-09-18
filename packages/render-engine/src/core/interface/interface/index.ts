/**
 * 接口优化系统导出
 * 提供Canvas SDK与Render Engine之间的高效通信机制
 */

// 核心优化组件
export {
  BatchCallManager,
  ObjectPoolManager,
  ObjectPool,
  DataTransferOptimizer,
  InterfaceInterceptor,
  GlobalInterfaceOptimizer,
  globalInterfaceOptimizer
} from './OptimizedInterface';

// 渲染桥接器
export {
  RenderBridge,
  BridgeCommandType,
  BridgeCommandOptimizer,
  CacheKeyGenerator,
  type BridgeCommand,
  type BatchBridgeCommand,
  type BridgeRenderState
} from './RenderBridge';

// 数据桥接器
export {
  DataBridge,
  DataChangeType,
  globalDataBridge,
  type DataChange,
  type IncrementalData,
  type SyncConfig
} from './DataBridge';