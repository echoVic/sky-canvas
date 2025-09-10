/**
 * 基础设施服务统一导出
 * 所有服务都符合 DI 架构，可注入使用
 */

// 事件总线服务
export { 
  IEventBusService, 
  EventBusService,
  type IEventBusService as EventBusServiceInterface 
} from './eventBus/eventBusService';

// 渲染服务
export { 
  ICanvasRenderingService, 
  CanvasRenderingService,
  type ICanvasRenderingService as CanvasRenderingServiceInterface 
} from './rendering/renderingService';

// 配置服务
export { 
  IConfigurationService, 
  ConfigurationService,
  type IConfigurationService as ConfigurationServiceInterface 
} from './configuration/configurationService';

// 日志服务
export { 
  ILogService, 
  LogService,
  type ILogService as LogServiceInterface,
  type LogLevel 
} from './logging/logService';

// 历史服务
export { 
  IHistoryService, 
  HistoryService,
  type IHistoryService as HistoryServiceInterface,
  type ICommand 
} from './history/historyService';

// 交互服务
export { 
  IInteractionService, 
  InteractionService,
  type IInteractionService as InteractionServiceInterface,
  type ITool 
} from './interaction/interactionService';