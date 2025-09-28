/**
 * SDK 事件类型定义
 * SDK 层统一的事件接口，隔离底层 Model 事件
 */

/**
 * SDK 变化事件接口
 */
export interface SDKChangeEvent {
  type: 'graphics-changed' | 'selection-changed' | 'history-changed' | 'render-completed' | 'action-error' | 'system-error';
  data?: any;
  timestamp?: number;
  error?: Error;
}

/**
 * 图形变化事件数据
 */
export interface GraphicsChangedEventData {
  added?: string[];
  removed?: string[];
  updated?: string[];
}

/**
 * 选择变化事件数据
 */
export interface SelectionChangedEventData {
  selected?: string[];
  deselected?: string[];
  current: string[];
}

/**
 * 历史变化事件数据
 */
export interface HistoryChangedEventData {
  canUndo: boolean;
  canRedo: boolean;
  historySize: number;
}

/**
 * 渲染完成事件数据
 */
export interface RenderCompletedEventData {
  frameTime: number;
  graphicsRendered: number;
}

/**
 * Action 错误事件数据
 */
export interface ActionErrorEventData {
  actionType: string;
  actionId?: string;
  error: Error;
  payload?: any;
  retryCount?: number;
  canRetry: boolean;
}

/**
 * 系统错误事件数据
 */
export interface SystemErrorEventData {
  component: string;
  error: Error;
  context?: Record<string, any>;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

/**
 * SDK 事件监听器接口
 */
export interface SDKEventListener {
  (event: SDKChangeEvent): void;
}