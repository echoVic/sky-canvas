/**
 * AI扩展示例实现
 * 展示如何使用Sky Canvas AI扩展协议
 */

import { CanvasSDK } from '../CanvasSDK';
import {
  AIProtocolManager,
  BaseAIExtension
} from './protocol';
import {
  AICapability,
  AIErrorType,
  IAIExtensionConfig,
  IAIRequest,
  IAIResponse,
  IAutoCompletionResponse,
  ICanvasContext,
  IShapeCreationRequest,
  IShapeCreationResponse,
  IShapeData,
  IShapeModificationRequest,
  IShapeModificationResponse,
  ISmartSelectionResponse,
  ITextGenerationRequest,
  ITextGenerationResponse,
  ShapeType
} from './types';

// ==================== 智能文本生成扩展 ====================

/**
 * 智能文本生成AI扩展示例
 * 模拟与大语言模型的交互，提供文本生成功能
 */
export class SmartTextAIExtension extends BaseAIExtension {
  private apiKey: string;
  private endpoint: string;

  constructor(apiKey: string, endpoint: string = 'https://api.example.com/v1/generate') {
    const config: IAIExtensionConfig = {
      name: 'SmartTextAI',
      version: '1.0.0',
      capabilities: [
        AICapability.TEXT_GENERATION,
        AICapability.AUTO_COMPLETION,
        AICapability.CONTENT_ANALYSIS
      ],
      endpoint,
      authentication: {
        type: 'api_key',
        config: { apiKey }
      },
      defaultOptions: {
        timeout: 30000,
        retryCount: 3
      },
      security: {
        allowedOperations: [
          AICapability.TEXT_GENERATION,
          AICapability.AUTO_COMPLETION,
          AICapability.CONTENT_ANALYSIS
        ],
        deniedOperations: [],
        accessLevel: 'read',
        sandboxMode: true,
        contentFiltering: true
      }
    };

    super(config);
    this.apiKey = apiKey;
    this.endpoint = endpoint;
  }

  async connect(): Promise<void> {
    // 模拟连接过程
    try {
      // 这里可以进行实际的API连接测试
      await this.testConnection();
      this._isConnected = true;
      console.log(`SmartTextAI extension connected to ${this.endpoint}`);
    } catch (error) {
      throw new Error(`Failed to connect to SmartTextAI: ${error}`);
    }
  }

  async disconnect(): Promise<void> {
    this._isConnected = false;
    console.log('SmartTextAI extension disconnected');
  }

  async processRequest(request: IAIRequest): Promise<IAIResponse> {
    if (!this.validatePermissions(request)) {
      return this.createErrorResponse(request, {
        type: AIErrorType.PERMISSION_ERROR,
        code: 'PERMISSION_DENIED',
        message: 'Permission denied for this operation',
        timestamp: Date.now(),
        retryable: false
      });
    }

    try {
      switch (request.capability) {
        case AICapability.TEXT_GENERATION:
          return await this.handleTextGeneration(request);
        case AICapability.AUTO_COMPLETION:
          return await this.handleAutoCompletion(request);
        case AICapability.CONTENT_ANALYSIS:
          return await this.handleContentAnalysis(request);
        default:
          return this.createErrorResponse(request, {
            type: AIErrorType.CAPABILITY_NOT_SUPPORTED,
            code: 'UNSUPPORTED_CAPABILITY',
            message: `Capability ${request.capability} is not supported`,
            timestamp: Date.now(),
            retryable: false
          });
      }
    } catch (error) {
      return this.createErrorResponse(request, {
        type: AIErrorType.PROCESSING_ERROR,
        code: 'PROCESSING_FAILED',
        message: error instanceof Error ? error.message : 'Unknown error',
        timestamp: Date.now(),
        retryable: true
      });
    }
  }

  private async testConnection(): Promise<void> {
    // 模拟API连接测试
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  private async handleTextGeneration(request: IAIRequest): Promise<IAIResponse> {
    const payload = request.payload as ITextGenerationRequest;
    
    // 模拟文本生成
    const generatedText = await this.generateText(
      payload.prompt,
      payload.options?.maxLength || 100,
      payload.context
    );

    const response: ITextGenerationResponse = {
      text: generatedText,
      confidence: 0.85,
      metadata: {
        tokensUsed: generatedText.length,
        processingTime: 150
      }
    };

    return this.createSuccessResponse(request, response);
  }

  private async handleAutoCompletion(request: IAIRequest): Promise<IAIResponse> {
    // 模拟自动补全逻辑
    await new Promise(resolve => setTimeout(resolve, 50));

    const suggestions = [
      { text: 'create rectangle', displayText: 'Create Rectangle', type: 'command', score: 0.9 },
      { text: 'create circle', displayText: 'Create Circle', type: 'command', score: 0.85 },
      { text: 'create text', displayText: 'Create Text', type: 'command', score: 0.8 }
    ];

    return this.createSuccessResponse(request, {
      suggestions,
      hasMore: false
    });
  }

  private async handleContentAnalysis(request: IAIRequest): Promise<IAIResponse> {
    // 模拟内容分析
    await new Promise(resolve => setTimeout(resolve, 200));

    const analysis = {
      type: 'structure',
      score: 75,
      details: {
        elementCount: 5,
        hierarchyDepth: 2,
        alignmentScore: 80
      },
      issues: [
        {
          severity: 'medium' as const,
          description: 'Some elements are not properly aligned',
          affectedShapes: ['shape1', 'shape2']
        }
      ]
    };

    return this.createSuccessResponse(request, {
      analysis,
      summary: 'The canvas structure is generally good but could benefit from better alignment.'
    });
  }

  private async generateText(prompt: string, maxLength: number, context?: ICanvasContext): Promise<string> {
    // 模拟文本生成逻辑
    await new Promise(resolve => setTimeout(resolve, 100));
    
    const templates = [
      `Based on your request "${prompt}", here's a suggestion...`,
      `For the "${prompt}" task, consider the following approach...`,
      `To achieve "${prompt}", you might want to...`
    ];

    const template = templates[Math.floor(Math.random() * templates.length)];
    return template ? template.substring(0, maxLength) : '';
  }
}

// ==================== 图形生成扩展 ====================

/**
 * 智能图形生成AI扩展示例
 * 基于自然语言描述创建和修改图形
 */
export class ShapeGeneratorAIExtension extends BaseAIExtension {
  constructor() {
    const config: IAIExtensionConfig = {
      name: 'ShapeGeneratorAI',
      version: '1.0.0',
      capabilities: [
        AICapability.SHAPE_CREATION,
        AICapability.SHAPE_MODIFICATION,
        AICapability.LAYOUT_OPTIMIZATION
      ],
      defaultOptions: {
        timeout: 10000,
        retryCount: 2
      },
      security: {
        allowedOperations: [
          AICapability.SHAPE_CREATION,
          AICapability.SHAPE_MODIFICATION,
          AICapability.LAYOUT_OPTIMIZATION
        ],
        deniedOperations: [],
        accessLevel: 'write',
        sandboxMode: false,
        contentFiltering: false
      }
    };

    super(config);
  }

  async connect(): Promise<void> {
    await new Promise(resolve => setTimeout(resolve, 50));
    this._isConnected = true;
    console.log('ShapeGeneratorAI extension connected');
  }

  async disconnect(): Promise<void> {
    this._isConnected = false;
    console.log('ShapeGeneratorAI extension disconnected');
  }

  async processRequest(request: IAIRequest): Promise<IAIResponse> {
    if (!this.validatePermissions(request)) {
      return this.createErrorResponse(request, {
        type: AIErrorType.PERMISSION_ERROR,
        code: 'PERMISSION_DENIED',
        message: 'Permission denied for this operation',
        timestamp: Date.now(),
        retryable: false
      });
    }

    try {
      switch (request.capability) {
        case AICapability.SHAPE_CREATION:
          return await this.handleShapeCreation(request);
        case AICapability.SHAPE_MODIFICATION:
          return await this.handleShapeModification(request);
        case AICapability.LAYOUT_OPTIMIZATION:
          return await this.handleLayoutOptimization(request);
        default:
          return this.createErrorResponse(request, {
            type: AIErrorType.CAPABILITY_NOT_SUPPORTED,
            code: 'UNSUPPORTED_CAPABILITY',
            message: `Capability ${request.capability} is not supported`,
            timestamp: Date.now(),
            retryable: false
          });
      }
    } catch (error) {
      return this.createErrorResponse(request, {
        type: AIErrorType.PROCESSING_ERROR,
        code: 'PROCESSING_FAILED',
        message: error instanceof Error ? error.message : 'Unknown error',
        timestamp: Date.now(),
        retryable: true
      });
    }
  }

  private async handleShapeCreation(request: IAIRequest): Promise<IAIResponse> {
    const payload = request.payload as IShapeCreationRequest;
    
    // 解析自然语言描述
    const shapeInfo = this.parseShapeDescription(payload.description);
    
    // 生成形状数据
    const shapes = await this.generateShapes(shapeInfo, payload.context);

    const response: IShapeCreationResponse = {
      shapes,
      explanation: `Created ${shapes.length} shape(s) based on: "${payload.description}"`,
      confidence: 0.8
    };

    return this.createSuccessResponse(request, response);
  }

  private async handleShapeModification(request: IAIRequest): Promise<IAIResponse> {
    const payload = request.payload as IShapeModificationRequest;
    
    // 分析修改请求
    const modifications = await this.analyzeModification(
      payload.modification,
      payload.shapeIds,
      payload.context
    );

    const response: IShapeModificationResponse = {
      modifications,
      explanation: `Suggested modifications for: "${payload.modification}"`,
      confidence: 0.75
    };

    return this.createSuccessResponse(request, response);
  }

  private async handleLayoutOptimization(request: IAIRequest): Promise<IAIResponse> {
    // 模拟布局优化
    await new Promise(resolve => setTimeout(resolve, 150));

    const optimizations = [
      {
        action: 'align' as const,
        shapeIds: ['shape1', 'shape2'],
        parameters: { alignment: 'center', axis: 'vertical' },
        priority: 1,
        description: 'Align shapes vertically'
      }
    ];

    return this.createSuccessResponse(request, {
      optimizations,
      explanation: 'Optimized layout for better visual balance',
      expectedImprovement: 25
    });
  }

  private parseShapeDescription(description: string): any {
    // 简单的描述解析逻辑
    const lowerDesc = description.toLowerCase();
    
    let shapeType: ShapeType = 'rectangle';
    if (lowerDesc.includes('circle') || lowerDesc.includes('round')) {
      shapeType = 'circle';
    } else if (lowerDesc.includes('line')) {
      shapeType = 'path';
    } else if (lowerDesc.includes('text')) {
      shapeType = 'text';
    }

    return {
      type: shapeType,
      count: lowerDesc.includes('two') ? 2 : 1,
      color: this.extractColor(lowerDesc),
      size: this.extractSize(lowerDesc)
    };
  }

  private extractColor(description: string): string {
    const colors = ['red', 'blue', 'green', 'yellow', 'orange', 'purple', 'black', 'white'];
    for (const color of colors) {
      if (description.includes(color)) {
        return color;
      }
    }
    return '#000000';
  }

  private extractSize(description: string): 'small' | 'medium' | 'large' {
    if (description.includes('small')) return 'small';
    if (description.includes('large') || description.includes('big')) return 'large';
    return 'medium';
  }

  private async generateShapes(shapeInfo: any, context?: ICanvasContext): Promise<IShapeData[]> {
    await new Promise(resolve => setTimeout(resolve, 100));

    const shapes: IShapeData[] = [];
    const baseSize = shapeInfo.size === 'small' ? 50 : shapeInfo.size === 'large' ? 150 : 100;

    for (let i = 0; i < shapeInfo.count; i++) {
      shapes.push({
        id: `generated_${Date.now()}_${i}`,
        type: shapeInfo.type,
        position: {
          x: 100 + i * 120,
          y: 100
        },
        size: {
          width: baseSize,
          height: baseSize
        },
        style: {
          fill: shapeInfo.color,
          stroke: '#000000',
          strokeWidth: 1
        },
        visible: true,
        zIndex: 1,
        properties: {
          generated: true,
          source: 'ai'
        }
      });
    }

    return shapes;
  }

  private async analyzeModification(
    modification: string,
    shapeIds: string[],
    context?: ICanvasContext
  ): Promise<any[]> {
    await new Promise(resolve => setTimeout(resolve, 100));

    // 简单的修改分析
    const modifications = [];

    if (modification.toLowerCase().includes('bigger') || modification.toLowerCase().includes('larger')) {
      for (const shapeId of shapeIds) {
        modifications.push({
          shapeId,
          update: {
            size: { width: 120, height: 120 }
          },
          reason: 'Increase size as requested',
          priority: 1
        });
      }
    }

    if (modification.toLowerCase().includes('color')) {
      const color = this.extractColor(modification.toLowerCase());
      for (const shapeId of shapeIds) {
        modifications.push({
          shapeId,
          update: {
            style: { fill: color }
          },
          reason: `Change color to ${color}`,
          priority: 2
        });
      }
    }

    return modifications;
  }
}

// ==================== 使用示例 ====================

/**
 * AI扩展使用示例
 */
export class AIExtensionExample {
  private protocolManager: AIProtocolManager;
  private canvasSDK: CanvasSDK;

  constructor(canvasSDK: CanvasSDK) {
    this.canvasSDK = canvasSDK;
    this.protocolManager = new AIProtocolManager(canvasSDK);
  }

  /**
   * 初始化AI扩展系统
   */
  async initializeAIExtensions(): Promise<void> {
    try {
      // 注册文本生成扩展
      const textExtension = new SmartTextAIExtension('your-api-key-here');
      await this.protocolManager.registerExtension(textExtension);

      // 注册图形生成扩展
      const shapeExtension = new ShapeGeneratorAIExtension();
      await this.protocolManager.registerExtension(shapeExtension);

      console.log('AI extensions initialized successfully');

      // 设置事件监听
      this.setupEventListeners();

    } catch (error) {
      console.error('Failed to initialize AI extensions:', error);
    }
  }

  /**
   * 文本生成示例
   */
  async generateTextExample(): Promise<void> {
    try {
      const request = this.protocolManager.createRequest(
        AICapability.TEXT_GENERATION,
        {
          prompt: 'Generate a description for a modern dashboard design',
          context: this.protocolManager.getCanvasContext(),
          options: {
            maxLength: 200,
            style: 'professional'
          }
        }
      );

      const response = await this.protocolManager.sendRequest(request, 'SmartTextAI');
      
      if (response.status === 'success') {
        const textResponse = response.payload as ITextGenerationResponse;
        console.log('Generated text:', textResponse.text);
        console.log('Confidence:', textResponse.confidence);
      }

    } catch (error) {
      console.error('Text generation failed:', error);
    }
  }

  /**
   * 图形创建示例
   */
  async createShapeExample(): Promise<void> {
    try {
      const request = this.protocolManager.createRequest(
        AICapability.SHAPE_CREATION,
        {
          description: 'Create two blue circles for a logo design',
          context: this.protocolManager.getCanvasContext()
        }
      );

      const response = await this.protocolManager.sendRequest(request, 'ShapeGeneratorAI');
      
      if (response.status === 'success') {
        const shapeResponse = response.payload as IShapeCreationResponse;
        console.log('Created shapes:', shapeResponse.shapes);
        
        // 将生成的形状添加到画布
        for (const shapeData of shapeResponse.shapes) {
          // 这里需要根据实际的形状实现来创建形状对象
          console.log('Would create shape:', shapeData);
        }
      }

    } catch (error) {
      console.error('Shape creation failed:', error);
    }
  }

  /**
   * 自动补全示例
   */
  async autoCompletionExample(input: string): Promise<string[]> {
    try {
      const request = this.protocolManager.createRequest(
        AICapability.AUTO_COMPLETION,
        {
          input,
          inputType: 'command',
          context: this.protocolManager.getCanvasContext()
        }
      );

      const response = await this.protocolManager.sendRequest(request, 'SmartTextAI');
      
      if (response.status === 'success') {
        const completionResponse = response.payload as IAutoCompletionResponse;
        return completionResponse.suggestions.map((s: any) => s.text);
      }

      return [];

    } catch (error) {
      console.error('Auto completion failed:', error);
      return [];
    }
  }

  /**
   * 智能选择示例
   */
  async smartSelectionExample(): Promise<void> {
    try {
      const request = this.protocolManager.createRequest(
        AICapability.SMART_SELECTION,
        {
          criteria: 'select all circles',
          mode: 'replace',
          currentSelection: this.canvasSDK.getSelectedShapes().map(s => s.id),
          context: this.protocolManager.getCanvasContext()
        }
      );

      const response = await this.protocolManager.sendRequest(request);
      
      if (response.status === 'success') {
        const selectionResponse = response.payload as ISmartSelectionResponse;
        
        // 应用智能选择结果
        this.canvasSDK.clearSelection();
        for (const shapeId of selectionResponse.selectedShapeIds) {
          this.canvasSDK.selectShape(shapeId);
        }
        
        console.log('Smart selection applied:', selectionResponse.selectedShapeIds);
      }

    } catch (error) {
      console.error('Smart selection failed:', error);
    }
  }

  /**
   * 设置事件监听器
   */
  private setupEventListeners(): void {
    // 监听AI处理事件
    this.protocolManager.on('processing_started', (data) => {
      console.log(`AI processing started: ${data.capability} (${data.requestId})`);
    });

    this.protocolManager.on('processing_completed', (data) => {
      console.log(`AI processing completed: ${data.requestId} (${data.duration}ms)`);
    });

    this.protocolManager.on('processing_failed', (data) => {
      console.error(`AI processing failed: ${data.requestId}`, data.error);
    });

    // 监听扩展状态变化
    this.protocolManager.on('ready', (data) => {
      console.log(`AI extension ready: ${data.extension}`);
    });

    this.protocolManager.on('disconnected', (data) => {
      console.log(`AI extension disconnected: ${data.extension}`);
    });
  }

  /**
   * 清理资源
   */
  async dispose(): Promise<void> {
    await this.protocolManager.dispose();
  }
}

// ==================== 高级使用示例 ====================

/**
 * 批量AI操作示例
 */
export class BatchAIOperations {
  private protocolManager: AIProtocolManager;

  constructor(protocolManager: AIProtocolManager) {
    this.protocolManager = protocolManager;
  }

  /**
   * 批量创建多种图形
   */
  async createComplexLayout(): Promise<void> {
    const requests = [
      this.protocolManager.createRequest(
        AICapability.SHAPE_CREATION,
        { description: 'Create a header rectangle' }
      ),
      this.protocolManager.createRequest(
        AICapability.SHAPE_CREATION,
        { description: 'Create navigation circles' }
      ),
      this.protocolManager.createRequest(
        AICapability.SHAPE_CREATION,
        { description: 'Create content text areas' }
      )
    ];

    try {
      const responses = await Promise.all(
        requests.map(req => this.protocolManager.sendRequest(req))
      );

      console.log('Complex layout created with', responses.length, 'AI operations');
      
      // 优化布局
      const optimizeRequest = this.protocolManager.createRequest(
        AICapability.LAYOUT_OPTIMIZATION,
        {
          shapeIds: [], // 所有形状
          objective: 'auto',
          context: this.protocolManager.getCanvasContext()
        }
      );

      await this.protocolManager.sendRequest(optimizeRequest);

    } catch (error) {
      console.error('Batch operation failed:', error);
    }
  }
}