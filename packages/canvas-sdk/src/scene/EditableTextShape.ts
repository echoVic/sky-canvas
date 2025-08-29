/**
 * 可编辑文本形状类 - 支持画布内直接编辑
 */
import { IShape, ISize, ShapeType, IShapeUpdate } from './IShape';
import { IPoint, IRect } from '@sky-canvas/render-engine';

export interface IEditableTextStyle {
  fontSize?: number;
  fontFamily?: string;
  color?: string;
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  align?: 'left' | 'center' | 'right';
  baseline?: 'top' | 'middle' | 'bottom' | 'alphabetic';
  lineHeight?: number;
  padding?: number;
  backgroundColor?: string;
}

/**
 * 可编辑文本形状类
 */
export class EditableTextShape implements IShape {
  readonly type: ShapeType = 'text';

  public position: IPoint;
  public size: ISize;
  public visible: boolean = true;
  public zIndex: number = 0;
  public text: string;
  public style: Required<IEditableTextStyle>;
  
  // 编辑状态
  public isEditing: boolean = false;
  public cursorPosition: number = 0;
  public cursorVisible: boolean = true;
  
  // 内部状态
  private _lines: string[] = [];
  private _cursorBlinkTimer: number | null = null;
  private _minWidth: number = 20;
  private _minHeight: number = 20;

  constructor(
    public readonly id: string,
    position: IPoint,
    text: string = '',
    style: IEditableTextStyle = {}
  ) {
    this.position = { ...position };
    this.text = text;
    
    // 设置默认样式
    this.style = {
      fontSize: style.fontSize || 16,
      fontFamily: style.fontFamily || 'Arial, sans-serif',
      color: style.color || '#000000',
      bold: style.bold || false,
      italic: style.italic || false,
      underline: style.underline || false,
      align: style.align || 'left',
      baseline: style.baseline || 'top',
      lineHeight: style.lineHeight || 1.2,
      padding: style.padding || 8,
      backgroundColor: style.backgroundColor || 'transparent'
    };
    
    this.cursorPosition = text.length;
    this.size = this.calculateTextSize();
    this.updateLines();
  }

  /**
   * 更新文本行
   */
  private updateLines(): void {
    this._lines = this.text ? this.text.split('\n') : [''];
  }

  /**
   * 计算文本尺寸
   */
  private calculateTextSize(): ISize {
    const tempCanvas = document.createElement('canvas');
    const ctx = tempCanvas.getContext('2d');
    
    if (!ctx) {
      return { 
        width: Math.max(this._minWidth, this.text.length * this.style.fontSize * 0.6), 
        height: Math.max(this._minHeight, this.style.fontSize * this.style.lineHeight) 
      };
    }

    this.updateLines();
    
    // 设置字体样式
    const fontWeight = this.style.bold ? 'bold' : 'normal';
    const fontStyle = this.style.italic ? 'italic' : 'normal';
    ctx.font = `${fontStyle} ${fontWeight} ${this.style.fontSize}px ${this.style.fontFamily}`;
    
    // 计算最大宽度
    let maxWidth = 0;
    for (const line of this._lines) {
      const lineWidth = ctx.measureText(line || ' ').width;
      maxWidth = Math.max(maxWidth, lineWidth);
    }
    
    // 确保最小尺寸
    const width = Math.max(this._minWidth, maxWidth + this.style.padding * 2);
    const height = Math.max(
      this._minHeight, 
      this._lines.length * this.style.fontSize * this.style.lineHeight + this.style.padding * 2
    );
    
    return { width, height };
  }

  /**
   * 开始编辑模式
   */
  startEditing(): void {
    this.isEditing = true;
    this.cursorVisible = true;
    this.startCursorBlink();
    
    // 如果是空文本，设置光标在开头
    if (this.text.length === 0) {
      this.cursorPosition = 0;
    }
  }

  /**
   * 结束编辑模式
   */
  stopEditing(): void {
    this.isEditing = false;
    this.cursorVisible = false;
    this.stopCursorBlink();
  }

  /**
   * 开始光标闪烁
   */
  private startCursorBlink(): void {
    this.stopCursorBlink();
    this._cursorBlinkTimer = window.setInterval(() => {
      this.cursorVisible = !this.cursorVisible;
    }, 500); // 每500ms闪烁一次
  }

  /**
   * 停止光标闪烁
   */
  private stopCursorBlink(): void {
    if (this._cursorBlinkTimer !== null) {
      clearInterval(this._cursorBlinkTimer);
      this._cursorBlinkTimer = null;
    }
  }

  /**
   * 插入文本
   */
  insertText(text: string): void {
    const before = this.text.substring(0, this.cursorPosition);
    const after = this.text.substring(this.cursorPosition);
    
    this.text = before + text + after;
    this.cursorPosition += text.length;
    
    this.updateTextMetrics();
  }

  /**
   * 删除字符（退格）
   */
  deleteChar(): boolean {
    if (this.cursorPosition > 0) {
      const before = this.text.substring(0, this.cursorPosition - 1);
      const after = this.text.substring(this.cursorPosition);
      
      this.text = before + after;
      this.cursorPosition--;
      
      this.updateTextMetrics();
      return true;
    }
    return false;
  }

  /**
   * 删除向前的字符（Delete键）
   */
  deleteForwardChar(): boolean {
    if (this.cursorPosition < this.text.length) {
      const before = this.text.substring(0, this.cursorPosition);
      const after = this.text.substring(this.cursorPosition + 1);
      
      this.text = before + after;
      
      this.updateTextMetrics();
      return true;
    }
    return false;
  }

  /**
   * 移动光标
   */
  moveCursor(offset: number): void {
    const newPosition = this.cursorPosition + offset;
    this.cursorPosition = Math.max(0, Math.min(this.text.length, newPosition));
    
    // 重置光标可见性
    this.cursorVisible = true;
    if (this.isEditing) {
      this.startCursorBlink();
    }
  }

  /**
   * 基于点击位置设置光标
   */
  setCursorFromPoint(point: IPoint, context: CanvasRenderingContext2D): void {
    const fontWeight = this.style.bold ? 'bold' : 'normal';
    const fontStyle = this.style.italic ? 'italic' : 'normal';
    context.font = `${fontStyle} ${fontWeight} ${this.style.fontSize}px ${this.style.fontFamily}`;
    
    const relativeX = point.x - this.position.x - this.style.padding;
    const relativeY = point.y - this.position.y - this.style.padding;
    
    // 确定点击的行
    const lineHeight = this.style.fontSize * this.style.lineHeight;
    let lineIndex = Math.floor(relativeY / lineHeight);
    lineIndex = Math.max(0, Math.min(this._lines.length - 1, lineIndex));
    
    const line = this._lines[lineIndex] || '';
    
    // 在该行中找到最接近的字符位置
    let bestDistance = Infinity;
    let bestCharIndex = 0;
    
    for (let i = 0; i <= line.length; i++) {
      const textWidth = context.measureText(line.substring(0, i)).width;
      const distance = Math.abs(textWidth - relativeX);
      
      if (distance < bestDistance) {
        bestDistance = distance;
        bestCharIndex = i;
      }
    }
    
    // 计算在整个文本中的位置
    let textPosition = 0;
    for (let i = 0; i < lineIndex; i++) {
      textPosition += (this._lines[i]?.length || 0) + 1; // +1 for newline
    }
    textPosition += bestCharIndex;
    
    this.cursorPosition = Math.min(textPosition, this.text.length);
    
    // 重置光标可见性
    this.cursorVisible = true;
    if (this.isEditing) {
      this.startCursorBlink();
    }
  }

  /**
   * 获取光标屏幕位置
   */
  private getCursorScreenPosition(context: CanvasRenderingContext2D): IPoint {
    const fontWeight = this.style.bold ? 'bold' : 'normal';
    const fontStyle = this.style.italic ? 'italic' : 'normal';
    context.font = `${fontStyle} ${fontWeight} ${this.style.fontSize}px ${this.style.fontFamily}`;
    
    // 找到光标所在的行和列
    let currentPos = 0;
    let lineIndex = 0;
    let charIndex = 0;
    
    for (let i = 0; i < this._lines.length; i++) {
      const lineLength = this._lines[i]?.length || 0;
      if (currentPos + lineLength >= this.cursorPosition) {
        lineIndex = i;
        charIndex = this.cursorPosition - currentPos;
        break;
      }
      currentPos += lineLength + 1; // +1 for newline character
    }
    
    // 确保不超出范围
    if (lineIndex >= this._lines.length) {
      lineIndex = this._lines.length - 1;
      charIndex = this._lines[lineIndex]?.length || 0;
    }
    
    const line = this._lines[lineIndex] || '';
    const textBeforeCursor = line.substring(0, Math.min(charIndex, line.length));
    const textWidth = context.measureText(textBeforeCursor).width;
    
    const x = this.position.x + this.style.padding + textWidth;
    const y = this.position.y + this.style.padding + lineIndex * this.style.fontSize * this.style.lineHeight;
    
    return { x, y };
  }

  /**
   * 更新文本度量
   */
  private updateTextMetrics(): void {
    this.size = this.calculateTextSize();
  }

  /**
   * 渲染文本
   */
  render(context: CanvasRenderingContext2D): void {
    if (!this.visible) return;

    context.save();
    
    // 如果是编辑状态，绘制编辑区域
    if (this.isEditing) {
      // 绘制半透明白色背景
      context.fillStyle = 'rgba(255, 255, 255, 0.95)';
      context.fillRect(this.position.x, this.position.y, this.size.width, this.size.height);
    } else if (this.style.backgroundColor !== 'transparent') {
      // 非编辑状态下的背景
      context.fillStyle = this.style.backgroundColor;
      context.fillRect(this.position.x, this.position.y, this.size.width, this.size.height);
    }
    
    // 设置文本样式
    const fontWeight = this.style.bold ? 'bold' : 'normal';
    const fontStyle = this.style.italic ? 'italic' : 'normal';
    context.font = `${fontStyle} ${fontWeight} ${this.style.fontSize}px ${this.style.fontFamily}`;
    context.fillStyle = this.style.color;
    context.textAlign = 'left';
    context.textBaseline = 'top';
    
    // 渲染每一行文本
    const lineHeight = this.style.fontSize * this.style.lineHeight;
    for (let i = 0; i < this._lines.length; i++) {
      const line = this._lines[i] || '';
      const x = this.position.x + this.style.padding;
      const y = this.position.y + this.style.padding + i * lineHeight;
      
      if (line) {
        context.fillText(line, x, y);
      }
      
      // 如果有下划线
      if (this.style.underline && line.length > 0) {
        const lineWidth = context.measureText(line).width;
        const underlineY = y + this.style.fontSize;
        
        context.beginPath();
        context.moveTo(x, underlineY);
        context.lineTo(x + lineWidth, underlineY);
        context.strokeStyle = this.style.color;
        context.lineWidth = 1;
        context.stroke();
      }
    }
    
    // 渲染光标
    if (this.isEditing && this.cursorVisible) {
      const cursorPos = this.getCursorScreenPosition(context);
      
      context.strokeStyle = this.style.color;
      context.lineWidth = 1;
      context.beginPath();
      context.moveTo(cursorPos.x, cursorPos.y);
      context.lineTo(cursorPos.x, cursorPos.y + this.style.fontSize);
      context.stroke();
    }
    
    context.restore();
  }

  /**
   * 获取边界框
   */
  getBounds(): IRect {
    return {
      x: this.position.x,
      y: this.position.y,
      width: this.size.width,
      height: this.size.height
    };
  }

  /**
   * 点击测试
   */
  hitTest(point: IPoint): boolean {
    const bounds = this.getBounds();
    return (
      point.x >= bounds.x &&
      point.x <= bounds.x + bounds.width &&
      point.y >= bounds.y &&
      point.y <= bounds.y + bounds.height
    );
  }

  /**
   * 克隆形状
   */
  clone(): EditableTextShape {
    const cloned = new EditableTextShape(
      `${this.id}_copy_${Date.now()}`,
      { ...this.position },
      this.text,
      { ...this.style }
    );
    cloned.visible = this.visible;
    cloned.zIndex = this.zIndex;
    return cloned;
  }

  /**
   * 更新形状
   */
  update(updates: IShapeUpdate): void {
    if (updates.position) {
      Object.assign(this.position, updates.position);
    }
    if (updates.size) {
      Object.assign(this.size, updates.size);
    }
    if (updates.visible !== undefined) {
      this.visible = updates.visible;
    }
    if (updates.zIndex !== undefined) {
      this.zIndex = updates.zIndex;
    }
  }

  /**
   * 更新文本内容
   */
  setText(text: string): void {
    this.text = text;
    this.cursorPosition = Math.min(this.cursorPosition, text.length);
    this.updateTextMetrics();
    this.updateLines();
  }

  /**
   * 更新文本样式
   */
  setStyle(style: Partial<IEditableTextStyle>): void {
    Object.assign(this.style, style);
    this.updateTextMetrics();
  }

  /**
   * 销毁形状
   */
  dispose(): void {
    this.stopCursorBlink();
    this._lines = [];
  }
}
