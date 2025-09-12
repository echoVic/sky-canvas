/**
 * 工具 ViewModel - 复杂模式
 * 使用 ToolManager 协调工具、快捷键、历史等复杂交互逻辑
 */

import { proxy, snapshot } from 'valtio';
// ViewModel不需要DI装饰器，使用构造函数注入
import { IToolManager } from '../managers/ToolManager';
import { IEventBusService } from '../services/eventBus/eventBusService';
import { IViewModel } from './interfaces/IViewModel';

/**
 * 工具状态
 */
export interface IToolState {
  currentTool: string;
  availableTools: string[];
  toolMode: string;
  cursor: string;
  isInteracting: boolean;
  
  // 工具特定状态
  isDrawing: boolean;
  isDragging: boolean;
  startPoint: { x: number; y: number } | null;
  
  // 快捷键状态
  shortcutsEnabled: boolean;
}

/**
 * 工具 ViewModel 接口
 */
export interface IToolViewModel extends IViewModel {
  state: IToolState;
  
  // 工具管理
  activateTool(toolName: string): boolean;
  getCurrentTool(): string;
  getAvailableTools(): string[];
  
  // 鼠标事件处理
  handleMouseDown(x: number, y: number, event?: MouseEvent): void;
  handleMouseMove(x: number, y: number, event?: MouseEvent): void;
  handleMouseUp(x: number, y: number, event?: MouseEvent): void;
  
  // 键盘事件处理
  handleKeyDown(event: KeyboardEvent): void;
  handleKeyUp(event: KeyboardEvent): void;
  
  // 状态查询
  isToolActive(toolName: string): boolean;
  getCurrentCursor(): string;
  canUseTool(toolName: string): boolean;
}

/**
 * 工具 ViewModel 实现
 */
export class ToolViewModel implements IToolViewModel {
  private readonly _state: IToolState;

  constructor(
    private toolManager: IToolManager,
    private eventBus: IEventBusService
  ) {
    // 使用 Valtio proxy 创建响应式状态
    this._state = proxy<IToolState>({
      currentTool: 'select',
      availableTools: [],
      toolMode: 'select',
      cursor: 'default',
      isInteracting: false,
      isDrawing: false,
      isDragging: false,
      startPoint: null,
      shortcutsEnabled: true
    });

    this.setupEventListeners();
  }

  get state(): IToolState {
    return this._state;
  }

  async initialize(): Promise<void> {
    this.updateState();
    this.eventBus.emit('tool-viewmodel:initialized', {});
  }

  getSnapshot() {
    return snapshot(this._state);
  }

  dispose(): void {
    this.eventBus.emit('tool-viewmodel:disposed', {});
  }

  // === 工具管理 ===

  activateTool(toolName: string): boolean {
    const success = this.toolManager.activateTool(toolName);
    if (success) {
      this.updateToolState();
    }
    return success;
  }

  getCurrentTool(): string {
    return this._state.currentTool;
  }

  getAvailableTools(): string[] {
    return this.toolManager.getAvailableTools();
  }

  // === 事件处理 ===

  handleMouseDown(x: number, y: number, event?: MouseEvent): void {
    this._state.isInteracting = true;
    this._state.startPoint = { x, y };
    
    // 委托给 ToolManager
    this.toolManager.handleMouseDown({
      point: { x, y },
      shiftKey: event?.shiftKey || false,
      ctrlKey: event?.ctrlKey || false,
      altKey: event?.altKey || false
    });
    
    this.updateInteractionState();
  }

  handleMouseMove(x: number, y: number, event?: MouseEvent): void {
    if (!this._state.isInteracting) return;
    
    // 委托给 ToolManager
    this.toolManager.handleMouseMove({
      point: { x, y },
      shiftKey: event?.shiftKey || false,
      ctrlKey: event?.ctrlKey || false,
      altKey: event?.altKey || false
    });
    
    this.updateInteractionState();
  }

  handleMouseUp(x: number, y: number, event?: MouseEvent): void {
    this._state.isInteracting = false;
    this._state.startPoint = null;
    
    // 委托给 ToolManager
    this.toolManager.handleMouseUp({
      point: { x, y },
      shiftKey: event?.shiftKey || false,
      ctrlKey: event?.ctrlKey || false,
      altKey: event?.altKey || false
    });
    
    this.updateInteractionState();
  }

  handleKeyDown(event: KeyboardEvent): void {
    if (!this._state.shortcutsEnabled) return;
    
    // 委托给 ToolManager
    this.toolManager.handleKeyDown(event);
  }

  handleKeyUp(event: KeyboardEvent): void {
    if (!this._state.shortcutsEnabled) return;
    
    // 委托给 ToolManager
    this.toolManager.handleKeyUp(event);
  }

  // === 状态查询 ===

  isToolActive(toolName: string): boolean {
    return this._state.currentTool === toolName;
  }

  getCurrentCursor(): string {
    return this.toolManager.getCurrentCursor();
  }

  canUseTool(toolName: string): boolean {
    return this._state.availableTools.includes(toolName);
  }

  // === 私有方法 ===

  /**
   * 设置事件监听器
   */
  private setupEventListeners(): void {
    // 监听工具变化
    this.eventBus.on('tool:activated', (data: any) => {
      this._state.currentTool = data.toolName;
      this._state.cursor = this.toolManager.getCurrentCursor();
      this.eventBus.emit('tool-viewmodel:toolChanged', { 
        toolName: data.toolName,
        cursor: this._state.cursor 
      });
    });

    // 监听快捷键状态
    this.eventBus.on('shortcut:enabled', () => {
      this._state.shortcutsEnabled = true;
    });

    this.eventBus.on('shortcut:disabled', () => {
      this._state.shortcutsEnabled = false;
    });

    // 监听交互状态变化
    this.eventBus.on('tool:drawingStarted', () => {
      this._state.isDrawing = true;
    });

    this.eventBus.on('tool:drawingEnded', () => {
      this._state.isDrawing = false;
    });

    this.eventBus.on('tool:draggingStarted', () => {
      this._state.isDragging = true;
    });

    this.eventBus.on('tool:draggingEnded', () => {
      this._state.isDragging = false;
    });
  }

  /**
   * 更新完整状态
   */
  private updateState(): void {
    this.updateToolState();
    this.updateInteractionState();
  }

  /**
   * 更新工具相关状态
   */
  private updateToolState(): void {
    this._state.currentTool = this.toolManager.getCurrentToolName() || 'select';
    this._state.availableTools = this.toolManager.getAvailableTools();
    this._state.toolMode = this.toolManager.getCurrentToolName() || 'select';
    this._state.cursor = this.toolManager.getCurrentCursor();
  }

  /**
   * 更新交互状态
   */
  private updateInteractionState(): void {
    // 根据当前工具和交互状态更新
    const currentTool = this.toolManager.getCurrentToolName();
    if (currentTool) {
      // 这里可以根据具体工具的状态来更新 ViewModel 状态
      // 例如：检查工具是否正在绘制、拖拽等
    }
  }
}