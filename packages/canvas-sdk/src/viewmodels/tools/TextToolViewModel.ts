/**
 * 文本工具 ViewModel
 * 使用 CanvasManager 进行形状管理
 */

import { proxy } from 'valtio';

import { IPoint } from '@sky-canvas/render-engine';
import { createDecorator } from '../../di';
import { ICanvasManager } from '../../managers/CanvasManager';
import { ITextEntity, ShapeEntityFactory } from '../../models/entities/Shape';
import { IEventBusService } from '../../services/eventBus/eventBusService';
import { IViewModel } from '../interfaces/IViewModel';

/**
 * 文本工具状态
 */
export interface ITextToolState {
  isEditing: boolean;
  editPosition: IPoint | null;
  currentText: string;
  currentShape: ITextEntity | null;
  cursor: string;
  enabled: boolean;
}

/**
 * 文本工具 ViewModel 接口
 */
export interface ITextToolViewModel extends IViewModel {
  state: ITextToolState;

  activate(): void;
  deactivate(): void;

  handleMouseDown(x: number, y: number, event?: MouseEvent): void;
  handleMouseMove(x: number, y: number, event?: MouseEvent): void;
  handleMouseUp(x: number, y: number, event?: MouseEvent): void;

  // 文本编辑
  startEditing(x: number, y: number): void;
  updateText(text: string): void;
  commitText(): void;
  cancelEditing(): void;

  isCurrentlyEditing(): boolean;
  getCurrentShape(): ITextEntity | null;
}

/**
 * 文本工具 ViewModel 服务标识符
 */
export const ITextToolViewModel = createDecorator<ITextToolViewModel>('TextToolViewModel');

/**
 * 文本工具 ViewModel 实现
 */
export class TextToolViewModel implements ITextToolViewModel {
  private readonly _state: ITextToolState;

  constructor(
    @ICanvasManager private canvasManager: ICanvasManager,
    @IEventBusService private eventBus: IEventBusService
  ) {
    this._state = proxy<ITextToolState>({
      isEditing: false,
      editPosition: null,
      currentText: '',
      currentShape: null,
      cursor: 'text',
      enabled: false
    });
  }

  get state(): ITextToolState {
    return this._state;
  }

  async initialize(): Promise<void> {
    this.eventBus.emit('text-tool-viewmodel:initialized', {});
  }

  dispose(): void {
    this.deactivate();
    this.eventBus.emit('text-tool-viewmodel:disposed', {});
  }

  getSnapshot() {
    return this._state;
  }

  activate(): void {
    this._state.enabled = true;
    this._state.cursor = 'text';
    this.eventBus.emit('tool:activated', { toolName: 'text' });
  }

  deactivate(): void {
    if (this._state.isEditing) {
      this.commitText();
    }
    this._state.enabled = false;
    this.reset();
  }

  handleMouseDown(x: number, y: number, _event?: MouseEvent): void {
    if (!this._state.enabled) return;

    // 如果正在编辑，先提交当前文本
    if (this._state.isEditing) {
      this.commitText();
    }

    // 开始新的文本编辑
    this.startEditing(x, y);
  }

  handleMouseMove(_x: number, _y: number, _event?: MouseEvent): void {
    // 文本工具不需要处理鼠标移动
  }

  handleMouseUp(_x: number, _y: number, _event?: MouseEvent): void {
    // 文本工具不需要处理鼠标抬起
  }

  startEditing(x: number, y: number): void {
    this._state.isEditing = true;
    this._state.editPosition = { x, y };
    this._state.currentText = '';

    this._state.currentShape = ShapeEntityFactory.createText(
      '',
      { x, y },
      {
        fillColor: '#1f2937',
        opacity: 1
      }
    );

    this.eventBus.emit('text-tool:editing-started', {
      position: { x, y }
    });
  }

  updateText(text: string): void {
    if (!this._state.isEditing || !this._state.currentShape) return;

    this._state.currentText = text;
    this._state.currentShape = {
      ...this._state.currentShape,
      content: text
    };

    this.eventBus.emit('text-tool:text-updated', { text });
  }

  commitText(): void {
    if (!this._state.isEditing || !this._state.currentShape) return;

    // 只有非空文本才添加到画布
    if (this._state.currentText.trim().length > 0) {
      this.canvasManager.addShape(this._state.currentShape);
      this.eventBus.emit('text-tool:text-committed', {
        text: this._state.currentText
      });
    }

    this.reset();
  }

  cancelEditing(): void {
    this.eventBus.emit('text-tool:editing-cancelled', {});
    this.reset();
  }

  isCurrentlyEditing(): boolean {
    return this._state.isEditing;
  }

  getCurrentShape(): ITextEntity | null {
    return this._state.currentShape;
  }

  private reset(): void {
    this._state.isEditing = false;
    this._state.editPosition = null;
    this._state.currentText = '';
    this._state.currentShape = null;
  }
}
