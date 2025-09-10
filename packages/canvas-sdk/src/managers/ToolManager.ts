/**
 * 工具管理器
 * 管理所有交互工具的生命周期和状态
 */

import { CanvasManager } from './CanvasManager';
import { SelectTool } from '../tools/SelectTool';
import { RectangleTool } from '../tools/RectangleTool';
import { CircleTool } from '../tools/CircleTool';
import { LineTool } from '../tools/LineTool';
import { IInteractionTool, InteractionMode } from '../tools/types';

/**
 * 工具管理器
 */
export class ToolManager {
  private canvasManager: CanvasManager;
  private tools: Map<string, IInteractionTool> = new Map();
  private currentTool: IInteractionTool | null = null;

  constructor(canvasManager: CanvasManager) {
    this.canvasManager = canvasManager;
    this.initializeTools();
  }

  /**
   * 初始化所有工具
   */
  private initializeTools(): void {
    // 创建所有工具实例，传入 CanvasManager
    const tools = [
      new SelectTool(this.canvasManager),
      new RectangleTool(this.canvasManager),
      new CircleTool(this.canvasManager),
      new LineTool(this.canvasManager)
    ];

    // 注册所有工具
    tools.forEach(tool => {
      this.tools.set(tool.name, tool);
    });

    // 默认激活选择工具
    this.activateTool('select');
  }

  /**
   * 激活工具
   */
  activateTool(toolName: string): boolean {
    const tool = this.tools.get(toolName);
    if (!tool) {
      console.warn(`Tool '${toolName}' not found`);
      return false;
    }

    // 停用当前工具
    if (this.currentTool) {
      this.currentTool.deactivate();
    }

    // 激活新工具
    this.currentTool = tool;
    this.currentTool.activate();

    console.log(`Tool activated: ${toolName}`);
    return true;
  }

  /**
   * 获取当前工具
   */
  getCurrentTool(): IInteractionTool | null {
    return this.currentTool;
  }

  /**
   * 获取当前工具名称
   */
  getCurrentToolName(): string | null {
    return this.currentTool?.name || null;
  }

  /**
   * 获取当前交互模式
   */
  getCurrentMode(): InteractionMode | null {
    return this.currentTool?.mode || null;
  }

  /**
   * 检查工具是否存在
   */
  hasTool(toolName: string): boolean {
    return this.tools.has(toolName);
  }

  /**
   * 获取所有工具名称
   */
  getAvailableTools(): string[] {
    return Array.from(this.tools.keys());
  }

  /**
   * 获取工具
   */
  getTool(toolName: string): IInteractionTool | undefined {
    return this.tools.get(toolName);
  }

  /**
   * 添加自定义工具
   */
  addTool(tool: IInteractionTool): void {
    this.tools.set(tool.name, tool);
  }

  /**
   * 移除工具
   */
  removeTool(toolName: string): boolean {
    if (this.currentTool?.name === toolName) {
      this.currentTool.deactivate();
      this.currentTool = null;
    }
    
    return this.tools.delete(toolName);
  }

  /**
   * 委托鼠标事件到当前工具
   */
  handleMouseDown(event: any): void {
    this.currentTool?.onMouseDown?.(event);
  }

  handleMouseMove(event: any): void {
    this.currentTool?.onMouseMove?.(event);
  }

  handleMouseUp(event: any): void {
    this.currentTool?.onMouseUp?.(event);
  }

  /**
   * 委托键盘事件到当前工具
   */
  handleKeyDown(event: KeyboardEvent): void {
    this.currentTool?.onKeyDown?.(event);
  }

  handleKeyUp(event: KeyboardEvent): void {
    this.currentTool?.onKeyUp?.(event);
  }

  /**
   * 获取当前工具的光标样式
   */
  getCurrentCursor(): string {
    return this.currentTool?.cursor || 'default';
  }

  /**
   * 销毁工具管理器
   */
  dispose(): void {
    // 停用当前工具
    if (this.currentTool) {
      this.currentTool.deactivate();
      this.currentTool = null;
    }

    // 清空所有工具
    this.tools.clear();
  }
}