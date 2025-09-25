/**
 * 工具选择命令
 * 处理工具状态的切换
 */

import { BaseCommand } from '../base';
import { CanvasModel } from '../../models/CanvasModel';

/**
 * 工具类型定义
 */
export type ToolType = 'select' | 'pan' | 'zoom' | 'draw' | 'rectangle' | 'circle' | 'diamond' | 'text' | 'line' | 'arrow';

/**
 * 工具命令参数
 */
export interface ToolCommandParams {
  toolType: ToolType;
  previousTool?: ToolType;
}

/**
 * 工具选择命令
 *
 * 注意：这个命令不会修改Model状态，主要用于记录工具切换历史
 * 实际的工具逻辑由前端状态管理处理
 */
export class ToolCommand extends BaseCommand {
  private params: ToolCommandParams;

  constructor(model: CanvasModel, params: ToolCommandParams) {
    super(model, `Tool change to ${params.toolType}`);
    this.params = params;
  }

  async execute(): Promise<void> {
    // 工具选择不需要修改Model状态
    // 这里可以触发工具相关的初始化逻辑
    console.log(`Tool changed to: ${this.params.toolType}`);

    // 可以在这里添加工具特定的初始化逻辑
    this.initializeTool(this.params.toolType);
  }

  async undo(): Promise<void> {
    // 恢复到之前的工具
    if (this.params.previousTool) {
      console.log(`Tool restored to: ${this.params.previousTool}`);
      this.initializeTool(this.params.previousTool);
    }
  }

  /**
   * 初始化特定工具的逻辑
   */
  private initializeTool(toolType: ToolType): void {
    switch (toolType) {
      case 'select':
        // 选择工具的初始化逻辑
        break;
      case 'rectangle':
      case 'circle':
      case 'diamond':
        // 形状工具的初始化逻辑
        break;
      case 'text':
        // 文本工具的初始化逻辑
        break;
      case 'pan':
        // 平移工具的初始化逻辑
        break;
      case 'zoom':
        // 缩放工具的初始化逻辑
        break;
      default:
        // 默认工具逻辑
        break;
    }
  }

  /**
   * 获取当前工具类型
   */
  getToolType(): ToolType {
    return this.params.toolType;
  }

  /**
   * 获取之前的工具类型
   */
  getPreviousToolType(): ToolType | undefined {
    return this.params.previousTool;
  }
}