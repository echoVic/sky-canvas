/**
 * 工具 ViewModel - 复杂模式
 * 使用 ToolManager 协调工具、快捷键、历史等复杂交互逻辑
 */

import { proxy, snapshot } from 'valtio';
import { IToolManager } from '../managers/ToolManager';
import { IViewModel } from './interfaces/IViewModel';

/**
 * 工具 UI 状态（区别于 IToolState 基础接口）
 */
export interface IToolUIState {
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
 * 工具 UI ViewModel 接口（区别于 IToolViewModel 基础接口）
 */
export interface IToolUIViewModel extends IViewModel {
  state: IToolUIState;

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
export class ToolViewModel implements IToolUIViewModel {
  private readonly _state: IToolUIState;

  constructor(
    private toolManager: IToolManager
  ) {
    this._state = proxy<IToolUIState>({
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
  }

  get state(): IToolUIState {
    return this._state;
  }

  async initialize(): Promise<void> {
    this.updateState();
  }

  getSnapshot() {
    return snapshot(this._state);
  }

  dispose(): void {
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

    this.toolManager.handleMouseDown({
      point: { x, y },
      button: event?.button ?? 0,
      shiftKey: event?.shiftKey ?? false,
      ctrlKey: event?.ctrlKey ?? false,
      metaKey: event?.metaKey ?? false,
      altKey: event?.altKey ?? false,
      originalEvent: event
    });

    this.updateInteractionState();
  }

  handleMouseMove(x: number, y: number, event?: MouseEvent): void {
    if (!this._state.isInteracting) return;

    this.toolManager.handleMouseMove({
      point: { x, y },
      button: event?.button ?? 0,
      shiftKey: event?.shiftKey ?? false,
      ctrlKey: event?.ctrlKey ?? false,
      metaKey: event?.metaKey ?? false,
      altKey: event?.altKey ?? false,
      originalEvent: event
    });

    this.updateInteractionState();
  }

  handleMouseUp(x: number, y: number, event?: MouseEvent): void {
    this._state.isInteracting = false;
    this._state.startPoint = null;

    this.toolManager.handleMouseUp({
      point: { x, y },
      button: event?.button ?? 0,
      shiftKey: event?.shiftKey ?? false,
      ctrlKey: event?.ctrlKey ?? false,
      metaKey: event?.metaKey ?? false,
      altKey: event?.altKey ?? false,
      originalEvent: event
    });

    this.updateInteractionState();
  }

  handleKeyDown(event: KeyboardEvent): void {
    if (!this._state.shortcutsEnabled) return;
    
    this.toolManager.handleKeyDown(event);
  }

  handleKeyUp(event: KeyboardEvent): void {
    if (!this._state.shortcutsEnabled) return;
    
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
    const currentTool = this.toolManager.getCurrentToolName();
    if (currentTool) {
    }
  }
}
