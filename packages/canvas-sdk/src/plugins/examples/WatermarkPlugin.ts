/**
 * 水印插件示例
 * 为Canvas添加水印功能
 */

import { Action } from '../../actions/types';
import { BaseCommand } from '../../commands/base';
import { CanvasModel } from '../../models/CanvasModel';
import { ActionContribution, CommandContribution, Plugin, PluginContext } from '../types';

/**
 * 水印参数
 */
interface WatermarkParams {
  text: string;
  position: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'center';
  opacity: number;
  fontSize: number;
  color: string;
}

/**
 * 水印命令
 */
class WatermarkCommand extends BaseCommand {
  private params: WatermarkParams;
  private watermarkId?: string;

  constructor(model: CanvasModel, params: WatermarkParams) {
    super(model, 'Add watermark');
    this.params = params;
  }

  async execute(): Promise<void> {
    // 计算水印位置
    const { x, y } = this.calculatePosition();

    // 创建水印形状
    const watermarkShape = {
      id: `watermark-${Date.now()}`,
      type: 'text' as const,
      x,
      y,
      text: this.params.text,
      style: {
        fill: this.params.color,
        fontSize: this.params.fontSize,
        opacity: this.params.opacity,
        fontFamily: 'Arial, sans-serif',
        textAlign: 'center',
        pointerEvents: 'none' // 水印不可交互
      },
      locked: true, // 锁定水印，防止意外修改
      zIndex: 999999 // 确保水印在最上层
    };

    this.watermarkId = watermarkShape.id;
    // 暂时禁用水印添加功能
    // this.model.addShape(watermarkShape);
    this.markAsExecuted();
  }

  async undo(): Promise<void> {
    if (this.watermarkId) {
      this.model.removeShape(this.watermarkId);
      this.watermarkId = undefined;
    }
    this.markAsNotExecuted();
  }

  /**
   * 计算水印位置
   */
  private calculatePosition(): { x: number; y: number } {
    // 简化实现，实际需要根据Canvas尺寸计算
    const canvasWidth = 800; // 应该从模型或上下文获取
    const canvasHeight = 600;

    switch (this.params.position) {
      case 'top-left':
        return { x: 20, y: 30 };
      case 'top-right':
        return { x: canvasWidth - 20, y: 30 };
      case 'bottom-left':
        return { x: 20, y: canvasHeight - 20 };
      case 'bottom-right':
        return { x: canvasWidth - 20, y: canvasHeight - 20 };
      case 'center':
      default:
        return { x: canvasWidth / 2, y: canvasHeight / 2 };
    }
  }
}

/**
 * 水印插件
 */
export const WatermarkPlugin: Plugin = {
  metadata: {
    id: 'watermark-plugin',
    name: 'Watermark Plugin',
    version: '1.0.0',
    description: 'Add watermark to canvas',
    author: 'Sky Canvas Team',
    sdkVersion: '^1.0.0'
  },

  contributions: [
    // Action贡献：添加水印Action
    {
      point: 'action',
      content: {
        type: 'ADD_WATERMARK',
        creator: (payload: WatermarkParams) => ({
          type: 'ADD_WATERMARK',
          payload,
          metadata: {
            timestamp: Date.now(),
            source: 'user' as const
          }
        }),
        description: 'Add watermark to canvas'
      }
    } as ActionContribution,

    // Command贡献：水印命令
    {
      point: 'command',
      content: {
        actionType: 'ADD_WATERMARK',
        creator: (model: CanvasModel, action: Action) => {
          return new WatermarkCommand(model, action.payload as WatermarkParams);
        },
        priority: 10
      }
    } as CommandContribution
  ],

  async activate(context: PluginContext): Promise<void> {
    context.logger?.info('Watermark plugin activated');

    // 可以在这里添加插件初始化逻辑
    // 比如监听特定事件、注册UI组件等
  },

  async deactivate(context: PluginContext): Promise<void> {
    context.logger?.info('Watermark plugin deactivated');

    // 清理插件资源
    // 比如移除事件监听器、清理UI组件等
  }
};

/**
 * 水印插件的便利API
 */
export const WatermarkAPI = {
  /**
   * 添加文本水印
   */
  addTextWatermark: async (
    dispatch: (action: Action) => Promise<void>,
    text: string,
    options: Partial<Omit<WatermarkParams, 'text'>> = {}
  ) => {
    const params: WatermarkParams = {
      text,
      position: options.position || 'bottom-right',
      opacity: options.opacity || 0.3,
      fontSize: options.fontSize || 14,
      color: options.color || '#666666'
    };

    await dispatch({
      type: 'ADD_WATERMARK',
      payload: params,
      metadata: {
        timestamp: Date.now(),
        source: 'system'
      }
    });
  },

  /**
   * 添加版权水印
   */
  addCopyrightWatermark: async (
    dispatch: (action: Action) => Promise<void>,
    owner: string,
    year?: number
  ) => {
    const currentYear = year || new Date().getFullYear();
    const text = `© ${currentYear} ${owner}`;

    await WatermarkAPI.addTextWatermark(dispatch, text, {
      position: 'bottom-right',
      opacity: 0.4,
      fontSize: 12,
      color: '#888888'
    });
  },

  /**
   * 添加时间戳水印
   */
  addTimestampWatermark: async (
    dispatch: (action: Action) => Promise<void>,
    format: 'full' | 'date' | 'time' = 'full'
  ) => {
    const now = new Date();
    let text: string;

    switch (format) {
      case 'date':
        text = now.toLocaleDateString();
        break;
      case 'time':
        text = now.toLocaleTimeString();
        break;
      case 'full':
      default:
        text = now.toLocaleString();
        break;
    }

    await WatermarkAPI.addTextWatermark(dispatch, text, {
      position: 'bottom-left',
      opacity: 0.3,
      fontSize: 10,
      color: '#999999'
    });
  }
};