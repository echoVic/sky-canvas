/**
 * 工具管理器 - 协调工具 ViewModels、快捷键、历史等复杂交互逻辑
 * 纯业务协调单元，协调多个工具 ViewModels
 */

import { createDecorator } from '../di';
import { IEventBusService, IHistoryService, ILogService, IShortcutService } from '../services';
import { ICanvasMouseEvent, IToolViewModel } from '../viewmodels/interfaces/IViewModel';
import {
  IArrowToolViewModel,
  ICircleToolViewModel,
  IDrawToolViewModel,
  ILineToolViewModel,
  IRectangleToolViewModel,
  ISelectToolViewModel,
  ITextToolViewModel
} from '../viewmodels/tools';
import { ICanvasManager } from './CanvasManager';

/**
 * 工具管理器接口
 */
export interface IToolManager {
  // 工具管理
  activateTool(toolName: string): boolean;
  getCurrentToolName(): string | null;
  getAvailableTools(): string[];

  // 事件处理
  handleMouseDown(event: ICanvasMouseEvent): void;
  handleMouseMove(event: ICanvasMouseEvent): void;
  handleMouseUp(event: ICanvasMouseEvent): void;
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
  private toolViewModels: Map<string, IToolViewModel> = new Map();
  private currentToolName: string | null = null;

  constructor(
    @ICanvasManager private canvasManager: ICanvasManager,
    @ISelectToolViewModel private selectToolViewModel: ISelectToolViewModel,
    @IRectangleToolViewModel private rectangleToolViewModel: IRectangleToolViewModel,
    @ICircleToolViewModel private circleToolViewModel: ICircleToolViewModel,
    @ILineToolViewModel private lineToolViewModel: ILineToolViewModel,
    @ITextToolViewModel private textToolViewModel: ITextToolViewModel,
    @IArrowToolViewModel private arrowToolViewModel: IArrowToolViewModel,
    @IDrawToolViewModel private drawToolViewModel: IDrawToolViewModel,
    @IShortcutService private shortcutService: IShortcutService,
    @IHistoryService private historyService: IHistoryService,
    @IEventBusService private eventBus: IEventBusService,
    @ILogService private logService: ILogService
  ) {
    this.initializeToolViewModels();
    this.registerShortcuts();
    this.logService.info('ToolManager initialized');
  }

  /**
   * 初始化所有工具 ViewModels
   */
  private initializeToolViewModels(): void {
    // 注册已实现的工具 ViewModels
    this.toolViewModels.set('select', this.selectToolViewModel);
    this.toolViewModels.set('rectangle', this.rectangleToolViewModel);
    this.toolViewModels.set('circle', this.circleToolViewModel);
    this.toolViewModels.set('line', this.lineToolViewModel);
    this.toolViewModels.set('text', this.textToolViewModel);
    this.toolViewModels.set('arrow', this.arrowToolViewModel);
    this.toolViewModels.set('draw', this.drawToolViewModel);

    // 注册占位符工具 - 暂时未实现的工具
    const placeholderTools = ['diamond', 'image', 'sticky', 'link', 'frame', 'hand'];
    placeholderTools.forEach(toolName => {
      this.toolViewModels.set(toolName, this.createPlaceholderTool(toolName));
    });

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

    this.shortcutService.register('tool-text', { key: 't' }, () => {
      this.activateTool('text');
    });

    this.shortcutService.register('tool-arrow', { key: 'a' }, () => {
      this.activateTool('arrow');
    });

    this.shortcutService.register('tool-draw', { key: 'd' }, () => {
      this.activateTool('draw');
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
      this.logService.warn(`Tool '${toolName}' not found`);
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
  handleMouseDown(event: ICanvasMouseEvent): void {
    if (!this.currentToolName) return;

    const currentTool = this.toolViewModels.get(this.currentToolName);
    if (currentTool && currentTool.handleMouseDown) {
      currentTool.handleMouseDown(event.point.x, event.point.y, event.originalEvent);
    }
  }

  /**
   * 处理鼠标移动事件
   */
  handleMouseMove(event: ICanvasMouseEvent): void {
    if (!this.currentToolName) return;

    const currentTool = this.toolViewModels.get(this.currentToolName);
    if (currentTool && currentTool.handleMouseMove) {
      currentTool.handleMouseMove(event.point.x, event.point.y, event.originalEvent);
    }
  }

  /**
   * 处理鼠标抬起事件
   */
  handleMouseUp(event: ICanvasMouseEvent): void {
    if (!this.currentToolName) return;

    const currentTool = this.toolViewModels.get(this.currentToolName);
    if (currentTool && currentTool.handleMouseUp) {
      currentTool.handleMouseUp(event.point.x, event.point.y, event.originalEvent);
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
   * 创建占位符工具
   */
  private createPlaceholderTool(toolName: string): IToolViewModel {
    const cursor = this.getCursorForTool(toolName);
    return {
      state: {
        enabled: false,
        cursor
      },
      activate: () => {
        this.logService.info(`Placeholder tool '${toolName}' activated - not implemented yet`);
        this.eventBus.emit('tool:activated', { toolName });
      },
      deactivate: () => {
        this.logService.debug(`Placeholder tool '${toolName}' deactivated`);
      },
      handleMouseDown: () => {
        this.logService.debug(`Tool '${toolName}' mouse down - not implemented`);
      },
      handleMouseMove: () => {
        this.logService.debug(`Tool '${toolName}' mouse move - not implemented`);
      },
      handleMouseUp: () => {
        this.logService.debug(`Tool '${toolName}' mouse up - not implemented`);
      },
      handleKeyDown: () => {
        this.logService.debug(`Tool '${toolName}' key down - not implemented`);
      },
      handleKeyUp: () => {
        this.logService.debug(`Tool '${toolName}' key up - not implemented`);
      },
      initialize: async () => {},
      dispose: () => {},
      getSnapshot: () => ({ enabled: false, cursor })
    };
  }

  /**
   * 获取工具对应的鼠标样式
   */
  private getCursorForTool(toolName: string): string {
    const cursorMap: Record<string, string> = {
      'select': 'default',
      'hand': 'grab',
      'rectangle': 'crosshair',
      'diamond': 'crosshair',
      'circle': 'crosshair',
      'arrow': 'crosshair',
      'line': 'crosshair',
      'draw': 'crosshair',
      'text': 'text',
      'image': 'crosshair',
      'sticky': 'crosshair',
      'link': 'pointer',
      'frame': 'crosshair'
    };
    return cursorMap[toolName] || 'default';
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