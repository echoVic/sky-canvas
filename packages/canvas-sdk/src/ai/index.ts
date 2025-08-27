/**
 * Sky Canvas AI扩展系统
 * 为画板SDK提供完整的AI交互能力
 */

// 导出核心类型定义
export * from './types';

// 导出协议实现
export * from './protocol';

// 导出示例实现
export * from './example';

// 重新导出常用接口，便于使用
export {
  AIProtocolManager,
  BaseAIExtension,
  AIProtocolUtils,
  type IAIExtension
} from './protocol';

export {
  AICapability,
  AIErrorType,
  OperationStatus,
  MessagePriority,
  AI_PROTOCOL_VERSION,
  type IAIRequest,
  type IAIResponse,
  type IAIExtensionConfig,
  type ICanvasContext
} from './types';

export {
  SmartTextAIExtension,
  ShapeGeneratorAIExtension,
  AIExtensionExample
} from './example';