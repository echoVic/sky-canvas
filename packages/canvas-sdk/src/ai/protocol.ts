/**
 * AI扩展通信协议实现
 * 为Sky Canvas画板SDK提供标准化的AI交互协议
 */

import { EventEmitter } from 'eventemitter3';
import { CanvasSDK } from '../CanvasSDK';
import { IShapeEntity } from '../models/entities/Shape';
import {
  AI_PROTOCOL_VERSION,
  AICapability,
  AIErrorType,
  IAIError,
  IAIEvent,
  IAIExtensionConfig,
  IAIMessage,
  IAIRequest,
  IAIRequestOptions,
  IAIResponse,
  IAIResponsePayload,
  ICanvasContext,
  IShapeData,
  MessagePriority,
  OperationStatus,
  ShapeType
} from './types';

/**
 * AI扩展接口
 */
export interface IAIExtension {
  /** 扩展名称 */
  readonly name: string;
  /** 扩展版本 */
  readonly version: string;
  /** 支持的AI能力 */
  readonly capabilities: AICapability[];
  /** 是否已连接 */
  readonly isConnected: boolean;
  /** 扩展配置 */
  readonly config: IAIExtensionConfig;

  /**
   * 连接到AI服务
   */
  connect(): Promise<void>;

  /**
   * 断开AI服务连接
   */
  disconnect(): Promise<void>;

  /**
   * 处理AI请求
   * @param request AI请求
   * @returns AI响应的Promise
   */
  processRequest(request: IAIRequest): Promise<IAIResponse>;

  /**
   * 检查是否支持指定能力
   * @param capability AI能力
   */
  supportsCapability(capability: AICapability): boolean;

  /**
   * 获取能力的详细信息
   * @param capability AI能力
   */
  getCapabilityInfo(capability: AICapability): any;

  /**
   * 更新扩展配置
   * @param config 新的配置
   */
  updateConfig(config: Partial<IAIExtensionConfig>): Promise<void>;
}

/**
 * AI协议管理器
 * 负责管理AI扩展的注册、通信和协调
 */
export class AIProtocolManager extends EventEmitter {
  private extensions: Map<string, IAIExtension> = new Map();
  private activeRequests: Map<string, IAIRequest> = new Map();
  private canvasSDK: CanvasSDK;
  private messageHandlers: Map<string, Function> = new Map();

  constructor(canvasSDK: CanvasSDK) {
    super();
    this.canvasSDK = canvasSDK;
    this.setupMessageHandlers();
  }

  /**
   * 注册AI扩展
   * @param extension AI扩展实例
   */
  async registerExtension(extension: IAIExtension): Promise<void> {
    if (this.extensions.has(extension.name)) {
      throw new Error(`Extension '${extension.name}' is already registered`);
    }

    // 验证扩展配置
    this.validateExtension(extension);

    // 注册扩展
    this.extensions.set(extension.name, extension);

    // 连接扩展
    try {
      await extension.connect();
      this.emit('ready', { extension: extension.name });
    } catch (error) {
      this.extensions.delete(extension.name);
      throw new Error(`Failed to connect extension '${extension.name}': ${error}`);
    }
  }

  /**
   * 注销AI扩展
   * @param extensionName 扩展名称
   */
  async unregisterExtension(extensionName: string): Promise<void> {
    const extension = this.extensions.get(extensionName);
    if (!extension) {
      throw new Error(`Extension '${extensionName}' not found`);
    }

    try {
      await extension.disconnect();
      this.extensions.delete(extensionName);
      this.emit('disconnected', { extension: extensionName });
    } catch (error) {
      console.error(`Error disconnecting extension '${extensionName}':`, error);
    }
  }

  /**
   * 获取已注册的扩展
   * @param extensionName 扩展名称
   */
  getExtension(extensionName: string): IAIExtension | null {
    return this.extensions.get(extensionName) || null;
  }

  /**
   * 获取所有已注册的扩展
   */
  getExtensions(): IAIExtension[] {
    return Array.from(this.extensions.values());
  }

  /**
   * 根据能力查找扩展
   * @param capability AI能力
   */
  getExtensionsByCapability(capability: AICapability): IAIExtension[] {
    return Array.from(this.extensions.values())
      .filter(ext => ext.supportsCapability(capability));
  }

  /**
   * 发送AI请求
   * @param request AI请求
   * @param extensionName 指定的扩展名称（可选）
   */
  async sendRequest(request: IAIRequest, extensionName?: string): Promise<IAIResponse> {
    // 验证请求
    this.validateRequest(request);

    // 选择扩展
    const extension = extensionName 
      ? this.getExtension(extensionName)
      : this.selectBestExtension(request.capability);

    if (!extension) {
      throw this.createError(
        AIErrorType.CAPABILITY_NOT_SUPPORTED,
        `No extension available for capability: ${request.capability}`
      );
    }

    if (!extension.isConnected) {
      throw this.createError(
        AIErrorType.NETWORK_ERROR,
        `Extension '${extension.name}' is not connected`
      );
    }

    // 记录活动请求
    this.activeRequests.set(request.id, request);

    try {
      // 发送处理开始事件
      this.emit('processing_started', {
        requestId: request.id,
        capability: request.capability
      });

      // 设置超时处理
      const timeout = request.options?.timeout || 30000;
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => {
          reject(this.createError(
            AIErrorType.TIMEOUT_ERROR,
            `Request timeout after ${timeout}ms`
          ));
        }, timeout);
      });

      // 处理请求
      const response = await Promise.race([
        extension.processRequest(request),
        timeoutPromise
      ]);

      // 验证响应
      this.validateResponse(response, request);

      // 发送处理完成事件
      this.emit('processing_completed', {
        requestId: request.id,
        duration: Date.now() - request.timestamp
      });

      return response;

    } catch (error) {
      // 发送处理失败事件
      const aiError = error instanceof Error 
        ? this.createError(AIErrorType.PROCESSING_ERROR, error.message)
        : error as IAIError;
      
      this.emit('processing_failed', {
        requestId: request.id,
        error: aiError
      });

      throw aiError;

    } finally {
      // 清理活动请求
      this.activeRequests.delete(request.id);
    }
  }

  /**
   * 创建AI请求
   * @param capability AI能力
   * @param payload 请求负载
   * @param options 请求选项
   */
  createRequest(
    capability: AICapability,
    payload: any,
    options?: IAIRequestOptions
  ): IAIRequest {
    return {
      id: this.generateRequestId(),
      version: AI_PROTOCOL_VERSION,
      timestamp: Date.now(),
      priority: MessagePriority.NORMAL,
      type: 'request',
      capability,
      payload,
      options: options || undefined as any
    };
  }

  /**
   * 获取画布上下文信息
   */
  getCanvasContext(): ICanvasContext {
    const shapes = this.canvasSDK.getShapes();
    const selectedShapes = this.canvasSDK.getSelectedShapes();
    const canvas = this.canvasSDK.getCanvas();

    return {
      canvasSize: canvas ? {
        width: canvas.width,
        height: canvas.height
      } : { width: 0, height: 0 },
      selectedShapes: selectedShapes.map(shape => shape.id),
      shapes: shapes.map(shape => this.convertShapeToData(shape)),
      viewport: {
        x: 0,
        y: 0,
        width: canvas?.width || 0,
        height: canvas?.height || 0
      },
      zoomLevel: 1.0 // TODO: 从实际的视图管理器获取
    };
  }

  /**
   * 取消活动请求
   * @param requestId 请求ID
   */
  cancelRequest(requestId: string): boolean {
    if (this.activeRequests.has(requestId)) {
      this.activeRequests.delete(requestId);
      return true;
    }
    return false;
  }

  /**
   * 获取活动请求数量
   */
  getActiveRequestCount(): number {
    return this.activeRequests.size;
  }

  /**
   * 销毁协议管理器
   */
  async dispose(): Promise<void> {
    // 断开所有扩展
    const disconnectPromises = Array.from(this.extensions.values())
      .map(ext => ext.disconnect().catch(err => 
        console.error(`Error disconnecting extension '${ext.name}':`, err)
      ));

    await Promise.allSettled(disconnectPromises);

    // 清理数据
    this.extensions.clear();
    this.activeRequests.clear();
    this.messageHandlers.clear();

    // 清理事件监听器
    this.removeAllListeners();
  }

  // ==================== 私有方法 ====================

  /**
   * 设置消息处理器
   */
  private setupMessageHandlers(): void {
    // 这里可以添加通用的消息处理逻辑
  }

  /**
   * 验证AI扩展
   * @param extension AI扩展
   */
  private validateExtension(extension: IAIExtension): void {
    if (!extension.name || !extension.version || !extension.capabilities) {
      throw new Error('Invalid extension: missing required properties');
    }

    if (extension.capabilities.length === 0) {
      throw new Error('Invalid extension: no capabilities defined');
    }
  }

  /**
   * 验证AI请求
   * @param request AI请求
   */
  private validateRequest(request: IAIRequest): void {
    if (!request.id || !request.version || !request.capability || !request.payload) {
      throw this.createError(
        AIErrorType.INVALID_REQUEST,
        'Invalid request: missing required fields'
      );
    }

    if (request.version !== AI_PROTOCOL_VERSION) {
      throw this.createError(
        AIErrorType.INVALID_REQUEST,
        `Unsupported protocol version: ${request.version}`
      );
    }
  }

  /**
   * 验证AI响应
   * @param response AI响应
   * @param request 对应的请求
   */
  private validateResponse(response: IAIResponse, request: IAIRequest): void {
    if (!response.id || !response.requestId || !response.status) {
      throw this.createError(
        AIErrorType.PROCESSING_ERROR,
        'Invalid response: missing required fields'
      );
    }

    if (response.requestId !== request.id) {
      throw this.createError(
        AIErrorType.PROCESSING_ERROR,
        'Response request ID does not match'
      );
    }
  }

  /**
   * 选择最佳扩展
   * @param capability AI能力
   */
  private selectBestExtension(capability: AICapability): IAIExtension | null {
    const candidates = this.getExtensionsByCapability(capability)
      .filter(ext => ext.isConnected);

    if (candidates.length === 0) {
      return null;
    }

    // 简单选择第一个可用的扩展
    // TODO: 实现更智能的选择算法（基于性能、负载等）
    return candidates[0] || null;
  }

  /**
   * 转换形状为数据格式
   * @param shape 形状对象
   */
  private convertShapeToData(shape: IShapeEntity): IShapeData {
    return {
      id: shape.id,
      type: shape.type as ShapeType,
      position: shape.transform.position,
      size: (shape as any).size || { width: 0, height: 0 }, // 临时处理
      style: {}, // TODO: 从实际形状获取样式信息
      visible: shape.visible,
      zIndex: shape.zIndex,
      properties: {} // TODO: 从实际形状获取其他属性
    };
  }

  /**
   * 生成请求ID
   */
  private generateRequestId(): string {
    return `ai_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * 创建AI错误
   * @param type 错误类型
   * @param message 错误消息
   * @param details 错误详情
   */
  private createError(
    type: AIErrorType,
    message: string,
    details?: any
  ): IAIError {
    return {
      type,
      code: type.toString(),
      message,
      details,
      timestamp: Date.now(),
      retryable: this.isRetryableError(type)
    };
  }

  /**
   * 检查错误是否可重试
   * @param type 错误类型
   */
  private isRetryableError(type: AIErrorType): boolean {
    const retryableTypes = [
      AIErrorType.NETWORK_ERROR,
      AIErrorType.TIMEOUT_ERROR,
      AIErrorType.RATE_LIMIT_ERROR,
      AIErrorType.INTERNAL_ERROR
    ];
    return retryableTypes.includes(type);
  }
}

/**
 * 抽象AI扩展基类
 * 提供AI扩展的基础实现
 */
export abstract class BaseAIExtension extends EventEmitter implements IAIExtension {
  protected _config: IAIExtensionConfig;
  protected _isConnected: boolean = false;

  constructor(config: IAIExtensionConfig) {
    super();
    this._config = config;
  }

  get name(): string {
    return this._config.name;
  }

  get version(): string {
    return this._config.version;
  }

  get capabilities(): AICapability[] {
    return this._config.capabilities;
  }

  get isConnected(): boolean {
    return this._isConnected;
  }

  get config(): IAIExtensionConfig {
    return { ...this._config };
  }

  /**
   * 连接到AI服务（抽象方法）
   */
  abstract connect(): Promise<void>;

  /**
   * 断开AI服务连接（抽象方法）
   */
  abstract disconnect(): Promise<void>;

  /**
   * 处理AI请求（抽象方法）
   * @param request AI请求
   */
  abstract processRequest(request: IAIRequest): Promise<IAIResponse>;

  /**
   * 检查是否支持指定能力
   * @param capability AI能力
   */
  supportsCapability(capability: AICapability): boolean {
    return this._config.capabilities.includes(capability);
  }

  /**
   * 获取能力的详细信息
   * @param capability AI能力
   */
  getCapabilityInfo(capability: AICapability): any {
    // 子类可以重写此方法提供更详细的信息
    return {
      capability,
      supported: this.supportsCapability(capability)
    };
  }

  /**
   * 更新扩展配置
   * @param config 新的配置
   */
  async updateConfig(config: Partial<IAIExtensionConfig>): Promise<void> {
    this._config = { ...this._config, ...config };
    this.emit('config_updated', {
      extension: this.name,
      config
    });
  }

  /**
   * 创建成功响应
   * @param request 原始请求
   * @param payload 响应负载
   */
  protected createSuccessResponse(request: IAIRequest, payload: any): IAIResponse {
    return {
      id: this.generateResponseId(),
      version: AI_PROTOCOL_VERSION,
      timestamp: Date.now(),
      priority: request.priority,
      type: 'response',
      requestId: request.id,
      status: OperationStatus.SUCCESS,
      payload
    };
  }

  /**
   * 创建错误响应
   * @param request 原始请求
   * @param error 错误信息
   */
  protected createErrorResponse(request: IAIRequest, error: IAIError): IAIResponse {
    return {
      id: this.generateResponseId(),
      version: AI_PROTOCOL_VERSION,
      timestamp: Date.now(),
      priority: request.priority,
      type: 'response',
      requestId: request.id,
      status: OperationStatus.ERROR,
      payload: {} as IAIResponsePayload,
      error
    };
  }

  /**
   * 生成响应ID
   */
  protected generateResponseId(): string {
    return `resp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * 验证请求权限
   * @param request AI请求
   */
  protected validatePermissions(request: IAIRequest): boolean {
    const security = this._config.security;
    if (!security) return true;

    // 检查操作权限
    if (security.allowedOperations.length > 0) {
      if (!security.allowedOperations.includes(request.capability)) {
        return false;
      }
    }

    if (security.deniedOperations.includes(request.capability)) {
      return false;
    }

    return true;
  }
}

/**
 * AI协议工具类
 */
export class AIProtocolUtils {
  /**
   * 验证消息格式
   * @param message AI消息
   */
  static validateMessage(message: IAIMessage): boolean {
    return !!(
      message.id &&
      message.version &&
      message.timestamp &&
      typeof message.priority === 'number' &&
      message.type
    );
  }

  /**
   * 创建事件消息
   * @param event 事件名称
   * @param payload 事件负载
   */
  static createEvent(event: string, payload: any): IAIEvent {
    return {
      id: `event_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      version: AI_PROTOCOL_VERSION,
      timestamp: Date.now(),
      priority: MessagePriority.NORMAL,
      type: 'event',
      event,
      payload
    };
  }

  /**
   * 检查协议版本兼容性
   * @param version 协议版本
   */
  static isVersionCompatible(version: string): boolean {
    // 简单的版本检查，可以根据需要扩展
    return version === AI_PROTOCOL_VERSION;
  }

  /**
   * 格式化错误消息
   * @param error AI错误
   */
  static formatError(error: IAIError): string {
    return `[${error.type}] ${error.message} (Code: ${error.code})`;
  }
}