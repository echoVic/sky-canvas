/**
 * 工具管理器 - 协调工具 ViewModels、快捷键、历史等复杂交互逻辑
 * 纯业务协调单元，协调多个工具 ViewModels
 */

import { createDecorator } from '../di';
import { ICanvasManager } from './CanvasManager';
import { ISelectToolViewModel, IRectangleToolViewModel } from '../viewmodels/tools';
import { IShortcutService, IHistoryService, IEventBusService } from '../services';
import type { ILogService } from '../services';

/**
 * 工具管理器接口
 */
export interface IToolManager {
  // 工具管理
  activateTool(toolName: string): boolean;
  getCurrentToolName(): string | null;
  getAvailableTools(): string[];
  
  // 事件处理
  handleMouseDown(event: any): void;
  handleMouseMove(event: any): void;
  handleMouseUp(event: any): void;
  handleKeyDown(event: KeyboardEvent): void;
  handleKeyUp(event: KeyboardEvent): void;
  
  // 状态查询
  getCurrentCursor(): string;
  
  dispose(): void;
}

/**
 * 工具管理器服务标识符
 */
export const IToolManager = createDecorator<IToolManager>('ToolManager');

/**
 * 工具管理器实现
 */
export class ToolManager implements IToolManager {
  private toolViewModels: Map<string, any> = new Map();
  private currentToolName: string | null = null;

  constructor(
    private canvasManager: ICanvasManager,
    private selectToolViewModel: ISelectToolViewModel,
    private rectangleToolViewModel: IRectangleToolViewModel,
    private shortcutService: IShortcutService,
    private historyService: IHistoryService,
    private eventBus: IEventBusService,
    private logService: ILogService
  ) {
    this.initializeToolViewModels();
    this.registerShortcuts();
    this.logService.info('ToolManager initialized');
  }

  /**
   * 初始化所有工具 ViewModels
   */
  private initializeToolViewModels(): void {
    // 注册工具 ViewModels
    this.toolViewModels.set('select', this.selectToolViewModel);
    this.toolViewModels.set('rectangle', this.rectangleToolViewModel);
    // TODO: 添加其他工具 ViewModels
    // this.toolViewModels.set('circle', this.circleToolViewModel);
    // this.toolViewModels.set('line', this.lineToolViewModel);
    // this.toolViewModels.set('path', this.pathToolViewModel);

    // 默认激活选择工具
    this.activateTool('select');
  }

  /**
   * 注册工具快捷键
   */
  private registerShortcuts(): void {
    // 工具切换快捷键
    this.shortcutService.register('tool-select', { key: 's' }, () => {
      this.activateTool('select');
    });

    this.shortcutService.register('tool-rectangle', { key: 'r' }, () => {
      this.activateTool('rectangle');
    });

    this.shortcutService.register('tool-circle', { key: 'c' }, () => {
      this.activateTool('circle');
    });

    this.shortcutService.register('tool-line', { key: 'l' }, () => {
      this.activateTool('line');
    });

    // 通用操作快捷键
    this.shortcutService.register('copy', { key: 'c', ctrlKey: true }, () => {
      this.canvasManager.copySelectedShapes();
    });

    this.shortcutService.register('cut', { key: 'x', ctrlKey: true }, () => {
      this.canvasManager.cutSelectedShapes();
    });

    this.shortcutService.register('paste', { key: 'v', ctrlKey: true }, () => {
      this.canvasManager.paste();
    });

    this.shortcutService.register('undo', { key: 'z', ctrlKey: true }, () => {
      this.canvasManager.undo();
    });

    this.shortcutService.register('redo', { key: 'y', ctrlKey: true }, () => {
      this.canvasManager.redo();
    });

    // 启用快捷键服务
    this.shortcutService.enable();
  }

  /**
   * 激活工具
   */
  activateTool(toolName: string): boolean {
    const toolViewModel = this.toolViewModels.get(toolName);
    if (!toolViewModel) {
      console.warn(`Tool '${toolName}' not found`);
      return false;
    }

    // 停用当前工具
    if (this.currentToolName) {
      const currentTool = this.toolViewModels.get(this.currentToolName);
      if (currentTool && currentTool.deactivate) {
        currentTool.deactivate();
      }
    }

    // 激活新工具
    this.currentToolName = toolName;
    if (toolViewModel.activate) {
      toolViewModel.activate();
    }

    this.eventBus.emit('tool:activated', { toolName });
    this.logService.info(`Tool activated: ${toolName}`);
    return true;
  }

  /**
   * 获取当前工具名称
   */
  getCurrentToolName(): string | null {
    return this.currentToolName;
  }

  /**
   * 获取所有工具名称
   */
  getAvailableTools(): string[] {
    return Array.from(this.toolViewModels.keys());
  }

  /**
   * 处理鼠标按下事件
   */
  handleMouseDown(event: any): void {
    if (!this.currentToolName) return;
    
    const currentTool = this.toolViewModels.get(this.currentToolName);
    if (currentTool && currentTool.handleMouseDown) {
      currentTool.handleMouseDown(event.point.x, event.point.y, event);
    }
  }

  /**
   * 处理鼠标移动事件
   */
  handleMouseMove(event: any): void {
    if (!this.currentToolName) return;
    
    const currentTool = this.toolViewModels.get(this.currentToolName);
    if (currentTool && currentTool.handleMouseMove) {
      currentTool.handleMouseMove(event.point.x, event.point.y, event);
    }
  }

  /**
   * 处理鼠标抬起事件
   */
  handleMouseUp(event: any): void {
    if (!this.currentToolName) return;
    
    const currentTool = this.toolViewModels.get(this.currentToolName);
    if (currentTool && currentTool.handleMouseUp) {
      currentTool.handleMouseUp(event.point.x, event.point.y, event);
    }
  }

  /**
   * 处理键盘按下事件
   */
  handleKeyDown(event: KeyboardEvent): void {
    if (!this.currentToolName) return;
    
    const currentTool = this.toolViewModels.get(this.currentToolName);
    if (currentTool && currentTool.handleKeyDown) {
      currentTool.handleKeyDown(event);
    }
  }

  /**
   * 处理键盘抬起事件
   */
  handleKeyUp(event: KeyboardEvent): void {
    if (!this.currentToolName) return;
    
    const currentTool = this.toolViewModels.get(this.currentToolName);
    if (currentTool && currentTool.handleKeyUp) {
      currentTool.handleKeyUp(event);
    }
  }

  /**
   * 获取当前鼠标样式
   */
  getCurrentCursor(): string {
    if (!this.currentToolName) return 'default';
    
    const currentTool = this.toolViewModels.get(this.currentToolName);
    return currentTool?.state?.cursor || 'default';
  }

  /**
   * 销毁管理器
   */
  dispose(): void {
    // 停用所有工具
    this.toolViewModels.forEach((tool, name) => {
      if (tool.deactivate) {
        tool.deactivate();
      }
    });
    
    // 禁用快捷键
    this.shortcutService.disable();
    
    this.logService.info('ToolManager disposed');
  }
}