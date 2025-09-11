/**
 * AI扩展系统类型定义
 * 为Sky Canvas画板SDK提供完整的AI交互能力
 */

import { IPoint, IRect } from '@sky-canvas/render-engine';

// ==================== 基础类型 ====================

// 定义 ShapeType
export type ShapeType = 'rectangle' | 'circle' | 'path' | 'text';

// 定义 IShapeUpdate 接口
export interface IShapeUpdate {
  position?: { x: number; y: number };
  size?: { width: number; height: number };
  style?: Record<string, any>;
  visible?: boolean;
  zIndex?: number;
  [key: string]: any;
}

/**
 * AI扩展协议版本
 */
export const AI_PROTOCOL_VERSION = '1.0.0';

/**
 * 消息优先级
 */
export enum MessagePriority {
  LOW = 0,
  NORMAL = 1,
  HIGH = 2,
  URGENT = 3
}

/**
 * 操作状态
 */
export enum OperationStatus {
  PENDING = 'pending',
  IN_PROGRESS = 'in_progress',
  SUCCESS = 'success',
  ERROR = 'error',
  CANCELLED = 'cancelled'
}

/**
 * AI能力类型
 */
export enum AICapability {
  TEXT_GENERATION = 'text_generation',
  SHAPE_CREATION = 'shape_creation',
  SHAPE_MODIFICATION = 'shape_modification',
  LAYOUT_OPTIMIZATION = 'layout_optimization',
  STYLE_SUGGESTION = 'style_suggestion',
  CONTENT_ANALYSIS = 'content_analysis',
  AUTO_COMPLETION = 'auto_completion',
  SMART_SELECTION = 'smart_selection'
}

// ==================== 消息基础结构 ====================

/**
 * 基础消息接口
 */
export interface IAIMessage {
  /** 消息唯一标识符 */
  id: string;
  /** 协议版本 */
  version: string;
  /** 时间戳 */
  timestamp: number;
  /** 消息优先级 */
  priority: MessagePriority;
  /** 会话ID（用于关联多个相关消息） */
  sessionId?: string;
  /** 消息类型 */
  type: 'request' | 'response' | 'event';
}

/**
 * AI请求消息
 */
export interface IAIRequest extends IAIMessage {
  type: 'request';
  /** 请求的AI能力 */
  capability: AICapability;
  /** 请求负载 */
  payload: IAIRequestPayload;
  /** 请求选项 */
  options?: IAIRequestOptions;
}

/**
 * AI响应消息
 */
export interface IAIResponse extends IAIMessage {
  type: 'response';
  /** 对应的请求ID */
  requestId: string;
  /** 操作状态 */
  status: OperationStatus;
  /** 响应负载 */
  payload: IAIResponsePayload;
  /** 错误信息（当状态为ERROR时） */
  error?: IAIError;
}

/**
 * AI事件消息
 */
export interface IAIEvent extends IAIMessage {
  type: 'event';
  /** 事件名称 */
  event: string;
  /** 事件负载 */
  payload: any;
}

// ==================== 请求/响应负载 ====================

/**
 * AI请求负载联合类型
 */
export type IAIRequestPayload = 
  | ITextGenerationRequest
  | IShapeCreationRequest
  | IShapeModificationRequest
  | ILayoutOptimizationRequest
  | IStyleSuggestionRequest
  | IContentAnalysisRequest
  | IAutoCompletionRequest
  | ISmartSelectionRequest;

/**
 * AI响应负载联合类型
 */
export type IAIResponsePayload = 
  | ITextGenerationResponse
  | IShapeCreationResponse
  | IShapeModificationResponse
  | ILayoutOptimizationResponse
  | IStyleSuggestionResponse
  | IContentAnalysisResponse
  | IAutoCompletionResponse
  | ISmartSelectionResponse;

// ==================== 具体请求类型 ====================

/**
 * 文本生成请求
 */
export interface ITextGenerationRequest {
  /** 输入提示文本 */
  prompt: string;
  /** 上下文信息 */
  context?: ICanvasContext;
  /** 生成选项 */
  options?: {
    maxLength?: number;
    temperature?: number;
    style?: string;
  };
}

/**
 * 形状创建请求
 */
export interface IShapeCreationRequest {
  /** 自然语言描述 */
  description: string;
  /** 目标形状类型（可选） */
  shapeType?: ShapeType;
  /** 目标位置（可选） */
  position?: IPoint;
  /** 参考形状ID（用于相对定位） */
  referenceShapeId?: string;
  /** 上下文信息 */
  context?: ICanvasContext;
}

/**
 * 形状修改请求
 */
export interface IShapeModificationRequest {
  /** 目标形状ID数组 */
  shapeIds: string[];
  /** 修改描述 */
  modification: string;
  /** 上下文信息 */
  context?: ICanvasContext;
}

/**
 * 布局优化请求
 */
export interface ILayoutOptimizationRequest {
  /** 目标形状ID数组（空数组表示所有形状） */
  shapeIds: string[];
  /** 优化目标 */
  objective: 'alignment' | 'distribution' | 'spacing' | 'grouping' | 'auto';
  /** 约束条件 */
  constraints?: ILayoutConstraints;
  /** 上下文信息 */
  context?: ICanvasContext;
}

/**
 * 样式建议请求
 */
export interface IStyleSuggestionRequest {
  /** 目标形状ID数组 */
  shapeIds: string[];
  /** 样式类型 */
  styleType: 'color' | 'font' | 'size' | 'theme' | 'all';
  /** 设计意图 */
  intent?: string;
  /** 上下文信息 */
  context?: ICanvasContext;
}

/**
 * 内容分析请求
 */
export interface IContentAnalysisRequest {
  /** 分析类型 */
  analysisType: 'structure' | 'accessibility' | 'design_principles' | 'content_quality';
  /** 目标范围（空数组表示整个画布） */
  scope?: string[];
  /** 上下文信息 */
  context?: ICanvasContext;
}

/**
 * 自动补全请求
 */
export interface IAutoCompletionRequest {
  /** 当前输入 */
  input: string;
  /** 输入类型 */
  inputType: 'command' | 'text' | 'property';
  /** 上下文信息 */
  context?: ICanvasContext;
}

/**
 * 智能选择请求
 */
export interface ISmartSelectionRequest {
  /** 选择条件 */
  criteria: string;
  /** 选择模式 */
  mode: 'add' | 'remove' | 'replace';
  /** 当前选中的形状ID数组 */
  currentSelection?: string[];
  /** 上下文信息 */
  context?: ICanvasContext;
}

// ==================== 具体响应类型 ====================

/**
 * 文本生成响应
 */
export interface ITextGenerationResponse {
  /** 生成的文本 */
  text: string;
  /** 信心分数 */
  confidence: number;
  /** 生成元数据 */
  metadata?: {
    tokensUsed?: number;
    processingTime?: number;
  };
}

/**
 * 形状创建响应
 */
export interface IShapeCreationResponse {
  /** 创建的形状数据 */
  shapes: IShapeData[];
  /** 创建操作的解释 */
  explanation?: string;
  /** 信心分数 */
  confidence: number;
}

/**
 * 形状修改响应
 */
export interface IShapeModificationResponse {
  /** 修改建议 */
  modifications: IShapeModificationSuggestion[];
  /** 修改操作的解释 */
  explanation?: string;
  /** 信心分数 */
  confidence: number;
}

/**
 * 布局优化响应
 */
export interface ILayoutOptimizationResponse {
  /** 优化建议 */
  optimizations: ILayoutOptimizationSuggestion[];
  /** 优化操作的解释 */
  explanation?: string;
  /** 预期的改进效果 */
  expectedImprovement?: number;
}

/**
 * 样式建议响应
 */
export interface IStyleSuggestionResponse {
  /** 样式建议 */
  suggestions: IStyleSuggestion[];
  /** 建议的解释 */
  explanation?: string;
  /** 应用顺序 */
  applicationOrder?: number[];
}

/**
 * 内容分析响应
 */
export interface IContentAnalysisResponse {
  /** 分析结果 */
  analysis: IAnalysisResult;
  /** 改进建议 */
  suggestions?: IImprovementSuggestion[];
  /** 分析摘要 */
  summary: string;
}

/**
 * 自动补全响应
 */
export interface IAutoCompletionResponse {
  /** 补全建议 */
  suggestions: ICompletionSuggestion[];
  /** 是否还有更多建议 */
  hasMore: boolean;
}

/**
 * 智能选择响应
 */
export interface ISmartSelectionResponse {
  /** 选中的形状ID数组 */
  selectedShapeIds: string[];
  /** 选择的解释 */
  explanation?: string;
  /** 选择信心分数 */
  confidence: number;
}

// ==================== 辅助数据结构 ====================

/**
 * 画布上下文信息
 */
export interface ICanvasContext {
  /** 画布尺寸 */
  canvasSize: { width: number; height: number };
  /** 当前选中的形状 */
  selectedShapes: string[];
  /** 所有形状的信息 */
  shapes: IShapeData[];
  /** 可见区域 */
  viewport: IRect;
  /** 缩放级别 */
  zoomLevel: number;
  /** 当前工具 */
  currentTool?: string;
  /** 用户偏好设置 */
  userPreferences?: any;
}

/**
 * 形状数据
 */
export interface IShapeData {
  /** 形状ID */
  id: string;
  /** 形状类型 */
  type: ShapeType;
  /** 位置 */
  position: IPoint;
  /** 尺寸 */
  size: { width: number; height: number };
  /** 样式属性 */
  style: any;
  /** 可见性 */
  visible: boolean;
  /** Z轴层级 */
  zIndex: number;
  /** 其他属性 */
  properties?: Record<string, any>;
}

/**
 * 形状修改建议
 */
export interface IShapeModificationSuggestion {
  /** 目标形状ID */
  shapeId: string;
  /** 修改内容 */
  update: IShapeUpdate;
  /** 修改原因 */
  reason?: string;
  /** 优先级 */
  priority: number;
}

/**
 * 布局约束
 */
export interface ILayoutConstraints {
  /** 保持相对位置 */
  maintainRelativePositions?: boolean;
  /** 最小间距 */
  minSpacing?: number;
  /** 对齐网格 */
  snapToGrid?: boolean;
  /** 边界约束 */
  bounds?: IRect;
}

/**
 * 布局优化建议
 */
export interface ILayoutOptimizationSuggestion {
  /** 操作类型 */
  action: 'move' | 'resize' | 'group' | 'align';
  /** 目标形状ID数组 */
  shapeIds: string[];
  /** 操作参数 */
  parameters: any;
  /** 优先级 */
  priority: number;
  /** 预期效果描述 */
  description?: string;
}

/**
 * 样式建议
 */
export interface IStyleSuggestion {
  /** 目标形状ID数组 */
  shapeIds: string[];
  /** 样式属性 */
  styleProperties: Record<string, any>;
  /** 建议类型 */
  type: 'color' | 'font' | 'size' | 'spacing' | 'theme';
  /** 建议原因 */
  reason?: string;
  /** 优先级 */
  priority: number;
}

/**
 * 分析结果
 */
export interface IAnalysisResult {
  /** 分析类型 */
  type: string;
  /** 评分（0-100） */
  score: number;
  /** 详细结果 */
  details: Record<string, any>;
  /** 问题列表 */
  issues?: IAnalysisIssue[];
}

/**
 * 分析问题
 */
export interface IAnalysisIssue {
  /** 问题严重程度 */
  severity: 'low' | 'medium' | 'high';
  /** 问题描述 */
  description: string;
  /** 影响的形状ID数组 */
  affectedShapes?: string[];
  /** 建议的修复方案 */
  suggestedFix?: string;
}

/**
 * 改进建议
 */
export interface IImprovementSuggestion {
  /** 建议类型 */
  type: string;
  /** 建议描述 */
  description: string;
  /** 预期改进效果 */
  expectedImprovement: number;
  /** 实施复杂度 */
  complexity: 'low' | 'medium' | 'high';
}

/**
 * 补全建议
 */
export interface ICompletionSuggestion {
  /** 建议文本 */
  text: string;
  /** 显示文本 */
  displayText?: string;
  /** 建议类型 */
  type: 'command' | 'parameter' | 'value';
  /** 匹配分数 */
  score: number;
  /** 额外信息 */
  metadata?: any;
}

// ==================== 配置和选项 ====================

/**
 * AI请求选项
 */
export interface IAIRequestOptions {
  /** 超时时间（毫秒） */
  timeout?: number;
  /** 是否需要流式响应 */
  streaming?: boolean;
  /** 重试次数 */
  retryCount?: number;
  /** 缓存策略 */
  cache?: 'none' | 'memory' | 'persistent';
  /** 调试模式 */
  debug?: boolean;
}

/**
 * AI扩展配置
 */
export interface IAIExtensionConfig {
  /** 扩展名称 */
  name: string;
  /** 扩展版本 */
  version: string;
  /** 支持的能力 */
  capabilities: AICapability[];
  /** API端点 */
  endpoint?: string;
  /** 认证信息 */
  authentication?: IAIAuthentication;
  /** 默认选项 */
  defaultOptions?: IAIRequestOptions;
  /** 安全设置 */
  security?: IAISecurityConfig;
}

/**
 * AI认证信息
 */
export interface IAIAuthentication {
  /** 认证类型 */
  type: 'none' | 'api_key' | 'oauth' | 'custom';
  /** 认证配置 */
  config: Record<string, any>;
}

/**
 * AI安全配置
 */
export interface IAISecurityConfig {
  /** 允许的操作类型 */
  allowedOperations: string[];
  /** 禁止的操作类型 */
  deniedOperations: string[];
  /** 访问权限级别 */
  accessLevel: 'read' | 'write' | 'admin';
  /** 沙箱模式 */
  sandboxMode: boolean;
  /** 内容过滤 */
  contentFiltering: boolean;
}

// ==================== 错误处理 ====================

/**
 * AI错误类型
 */
export enum AIErrorType {
  NETWORK_ERROR = 'network_error',
  AUTHENTICATION_ERROR = 'authentication_error',
  PERMISSION_ERROR = 'permission_error',
  VALIDATION_ERROR = 'validation_error',
  PROCESSING_ERROR = 'processing_error',
  TIMEOUT_ERROR = 'timeout_error',
  RATE_LIMIT_ERROR = 'rate_limit_error',
  CAPABILITY_NOT_SUPPORTED = 'capability_not_supported',
  INVALID_REQUEST = 'invalid_request',
  INTERNAL_ERROR = 'internal_error'
}

/**
 * AI错误接口
 */
export interface IAIError {
  /** 错误类型 */
  type: AIErrorType;
  /** 错误代码 */
  code: string;
  /** 错误消息 */
  message: string;
  /** 错误详情 */
  details?: any;
  /** 错误发生时间 */
  timestamp: number;
  /** 是否可重试 */
  retryable: boolean;
  /** 建议的重试延迟（毫秒） */
  retryAfter?: number;
}

// ==================== 事件类型 ====================

/**
 * AI扩展事件类型
 */
export interface IAIExtensionEvents {
  /** 扩展准备就绪 */
  'ready': { extension: string };
  /** 扩展断开连接 */
  'disconnected': { extension: string; reason?: string };
  /** 处理开始 */
  'processing_started': { requestId: string; capability: AICapability };
  /** 处理进度更新 */
  'processing_progress': { requestId: string; progress: number; stage?: string };
  /** 处理完成 */
  'processing_completed': { requestId: string; duration: number };
  /** 处理失败 */
  'processing_failed': { requestId: string; error: IAIError };
  /** 能力变更 */
  'capabilities_changed': { extension: string; capabilities: AICapability[] };
  /** 配置更新 */
  'config_updated': { extension: string; config: Partial<IAIExtensionConfig> };
}