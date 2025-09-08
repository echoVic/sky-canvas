import { TextShape } from './TextShape';
import { TextRange, TextFormat, TextRun, FontInfo, FontLoadStatus } from './TextTypes';
import { IPoint, IRect, IGraphicsContext } from '@sky-canvas/render-engine';
import { IShape, IShapeUpdate, IShapeData, ShapeType } from './IShape';

/**
 * 富文本形状
 */
export class RichTextShape extends TextShape {
  readonly type: ShapeType = 'text';
  public visible: boolean = true;
  public zIndex: number = 0;
  public selected: boolean = false;
  public locked: boolean = false;
  
  private textRuns: TextRun[] = [];
  private isEditing: boolean = false;
  private caretPosition: number = 0;
  private selectionRange: TextRange | null = null;
  private fontCache: Map<string, FontLoadStatus> = new Map();
  private lineHeight: number = 1.2;
  
  constructor(
    public readonly id: string,
    text: string = '', 
    position: IPoint = { x: 0, y: 0 }
  ) {
    super(id, position, text);
    
    // 初始化默认文本运行
    if (text) {
      this.textRuns.push({
        text,
        format: this.getDefaultFormat(),
        range: { start: 0, end: text.length }
      });
    }
  }
  
  /**
   * 获取默认文本格式
   */
  private getDefaultFormat(): TextFormat {
    return {
      fontFamily: 'Arial, sans-serif',
      fontSize: 16,
      fontWeight: 'normal',
      fontStyle: 'normal',
      textDecoration: 'none',
      color: '#000000'
    };
  }
  
  /**
   * 应用格式到文本范围
   */
  applyFormat(range: TextRange, format: TextFormat): void {
    if (range.start < 0 || range.end > this.getText().length || range.start > range.end) {
      throw new Error('Invalid text range');
    }
    
    // 标准化范围
    const normalizedRange = {
      start: Math.max(0, range.start),
      end: Math.min(this.getText().length, range.end)
    };
    
    // 分割现有的文本运行
    this.splitTextRuns(normalizedRange);
    
    // 应用新格式
    const newFormat: TextFormat = { ...format };
    const formatRun: TextRun = {
      text: this.getText().substring(normalizedRange.start, normalizedRange.end),
      format: newFormat,
      range: { ...normalizedRange }
    };
    
    // 插入或替换文本运行
    this.insertTextRun(formatRun);
    
    // 合并相邻的相同格式运行
    this.mergeTextRuns();
    
    this.requestRender();
  }
  
  /**
   * 分割文本运行
   */
  private splitTextRuns(range: TextRange): void {
    const newRuns: TextRun[] = [];
    
    for (const run of this.textRuns) {
      if (run.range.end <= range.start || run.range.start >= range.end) {
        // 不重叠，保留原样
        newRuns.push(run);
      } else if (run.range.start < range.start && run.range.end > range.end) {
        // 完全包含范围，需要分成三段
        newRuns.push({
          text: run.text.substring(0, range.start - run.range.start),
          format: { ...run.format },
          range: { start: run.range.start, end: range.start }
        });
        
        newRuns.push({
          text: run.text.substring(range.start - run.range.start, range.end - run.range.start),
          format: { ...run.format },
          range: { ...range }
        });
        
        newRuns.push({
          text: run.text.substring(range.end - run.range.start),
          format: { ...run.format },
          range: { start: range.end, end: run.range.end }
        });
      } else if (run.range.start < range.start) {
        // 部分重叠（左端）
        newRuns.push({
          text: run.text.substring(0, range.start - run.range.start),
          format: { ...run.format },
          range: { start: run.range.start, end: range.start }
        });
        
        newRuns.push({
          text: run.text.substring(range.start - run.range.start),
          format: { ...run.format },
          range: { start: range.start, end: run.range.end }
        });
      } else if (run.range.end > range.end) {
        // 部分重叠（右端）
        newRuns.push({
          text: run.text.substring(0, range.end - run.range.start),
          format: { ...run.format },
          range: { start: run.range.start, end: range.end }
        });
        
        newRuns.push({
          text: run.text.substring(range.end - run.range.start),
          format: { ...run.format },
          range: { start: range.end, end: run.range.end }
        });
      } else {
        // 完全在范围内，保留原样（将在后续步骤中被替换）
        newRuns.push(run);
      }
    }
    
    this.textRuns = newRuns;
  }
  
  /**
   * 插入文本运行
   */
  private insertTextRun(newRun: TextRun): void {
    const insertIndex = this.textRuns.findIndex(run => run.range.start >= newRun.range.start);
    
    if (insertIndex === -1) {
      this.textRuns.push(newRun);
    } else {
      this.textRuns.splice(insertIndex, 0, newRun);
    }
  }
  
  /**
   * 合并相同格式的相邻文本运行
   */
  private mergeTextRuns(): void {
    if (this.textRuns.length <= 1) return;
    
    const mergedRuns: TextRun[] = [];
    let currentRun = { ...this.textRuns[0] };
    
    for (let i = 1; i < this.textRuns.length; i++) {
      const nextRun = this.textRuns[i];
      
      // 检查格式是否相同且范围是否连续
      if (
        this.formatsEqual(currentRun.format, nextRun.format) &&
        currentRun.range.end === nextRun.range.start
      ) {
        // 合并运行
        currentRun.text += nextRun.text;
        currentRun.range.end = nextRun.range.end;
      } else {
        // 不能合并，保存当前运行并开始新的
        mergedRuns.push(currentRun);
        currentRun = { ...nextRun };
      }
    }
    
    // 添加最后一个运行
    mergedRuns.push(currentRun);
    
    this.textRuns = mergedRuns;
  }
  
  /**
   * 检查两个格式是否相等
   */
  private formatsEqual(format1: TextFormat, format2: TextFormat): boolean {
    return (
      format1.fontFamily === format2.fontFamily &&
      format1.fontSize === format2.fontSize &&
      format1.fontWeight === format2.fontWeight &&
      format1.fontStyle === format2.fontStyle &&
      format1.textDecoration === format2.textDecoration &&
      format1.color === format2.color &&
      format1.backgroundColor === format2.backgroundColor
    );
  }
  
  /**
   * 插入文本
   */
  insertText(position: number, text: string): void {
    const fullText = this.getText();
    const newText = fullText.substring(0, position) + text + fullText.substring(position);
    
    // 更新所有文本运行的范围
    this.textRuns.forEach(run => {
      if (run.range.start >= position) {
        run.range.start += text.length;
        run.range.end += text.length;
      } else if (run.range.end > position) {
        run.range.end += text.length;
      }
    });
    
    // 在光标位置插入新的文本运行
    const newRun: TextRun = {
      text,
      format: this.getCurrentFormatAtPosition(position),
      range: { start: position, end: position + text.length }
    };
    
    this.insertTextRun(newRun);
    this.mergeTextRuns();
    
    this.updateText(newText);
    this.updateCaretPosition(position + text.length);
  }
  
  /**
   * 删除文本
   */
  deleteText(range: TextRange): void {
    if (range.start < 0 || range.end > this.getText().length || range.start >= range.end) {
      return;
    }
    
    const fullText = this.getText();
    const newText = fullText.substring(0, range.start) + fullText.substring(range.end);
    
    // 移除被删除范围内的文本运行
    this.textRuns = this.textRuns.filter(run => 
      run.range.end <= range.start || run.range.start >= range.end
    );
    
    // 更新剩余文本运行的范围
    this.textRuns.forEach(run => {
      if (run.range.start >= range.end) {
        run.range.start -= (range.end - range.start);
        run.range.end -= (range.end - range.start);
      } else if (run.range.end > range.start) {
        run.range.end = Math.max(range.start, run.range.end - (range.end - range.start));
      }
    });
    
    this.updateText(newText);
    this.updateCaretPosition(range.start);
  }
  
  /**
   * 获取指定位置的当前格式
   */
  private getCurrentFormatAtPosition(position: number): TextFormat {
    for (const run of this.textRuns) {
      if (position >= run.range.start && position <= run.range.end) {
        return { ...run.format };
      }
    }
    
    return this.getDefaultFormat();
  }
  
  /**
   * 开始编辑
   */
  startEditing(): void {
    this.isEditing = true;
    this.requestRender();
  }
  
  /**
   * 结束编辑
   */
  endEditing(): void {
    this.isEditing = false;
    this.selectionRange = null;
    this.requestRender();
  }
  
  /**
   * 更新光标位置
   */
  updateCaretPosition(position: number): void {
    this.caretPosition = Math.max(0, Math.min(this.getText().length, position));
    this.requestRender();
  }
  
  /**
   * 设置选择范围
   */
  setSelectionRange(range: TextRange | null): void {
    if (range === null) {
      this.selectionRange = null;
    } else {
      this.selectionRange = {
        start: Math.max(0, Math.min(this.getText().length, range.start)),
        end: Math.max(0, Math.min(this.getText().length, range.end))
      };
    }
    this.requestRender();
  }
  
  /**
   * 获取选择范围
   */
  getSelectionRange(): TextRange | null {
    return this.selectionRange ? { ...this.selectionRange } : null;
  }
  
  /**
   * 获取光标位置
   */
  getCaretPosition(): number {
    return this.caretPosition;
  }
  
  /**
   * 检查是否在编辑模式
   */
  isEditingText(): boolean {
    return this.isEditing;
  }
  
  /**
   * 获取文本运行
   */
  getTextRuns(): TextRun[] {
    return [...this.textRuns];
  }
  
  /**
   * 设置文本运行
   */
  setTextRuns(runs: TextRun[]): void {
    this.textRuns = runs.map(run => ({ ...run }));
    this.requestRender();
  }
  
  /**
   * 渲染文本
   */
  render(context: any): void {
    // 应用基本样式
    const defaultFormat = this.getDefaultFormat();
    context.font = this.getFontString(defaultFormat);
    context.fillStyle = defaultFormat.color || '#000000';
    
    // 渲染文本运行
    this.textRuns.forEach(run => {
      context.save();
      
      // 应用运行格式
      context.font = this.getFontString(run.format);
      context.fillStyle = run.format.color || defaultFormat.color || '#000000';
      
      // 渲染背景色
      if (run.format.backgroundColor) {
        const textWidth = context.measureText(run.text).width;
        const fontSize = run.format.fontSize || defaultFormat.fontSize || 16;
        const lineHeight = fontSize * this.lineHeight;
        
        context.fillStyle = run.format.backgroundColor;
        context.fillRect(
          this.position.x, 
          this.position.y + (run.range.start * lineHeight / this.getText().length),
          textWidth,
          lineHeight
        );
        
        context.fillStyle = run.format.color || defaultFormat.color || '#000000';
      }
      
      // 渲染文本
      context.fillText(run.text, this.position.x, this.position.y);
      
      // 渲染装饰线
      if (run.format.textDecoration === 'underline') {
        const textWidth = context.measureText(run.text).width;
        const fontSize = run.format.fontSize || defaultFormat.fontSize || 16;
        context.beginPath();
        context.moveTo(this.position.x, this.position.y + 2);
        context.lineTo(this.position.x + textWidth, this.position.y + 2);
        context.stroke();
      } else if (run.format.textDecoration === 'line-through') {
        const textWidth = context.measureText(run.text).width;
        const fontSize = run.format.fontSize || defaultFormat.fontSize || 16;
        context.beginPath();
        context.moveTo(this.position.x, this.position.y - fontSize / 3);
        context.lineTo(this.position.x + textWidth, this.position.y - fontSize / 3);
        context.stroke();
      }
      
      context.restore();
    });
    
    // 渲染编辑相关元素
    if (this.isEditing) {
      this.renderEditingElements(context);
    }
  }
  
  /**
   * 渲染编辑元素（光标、选择区域等）
   */
  private renderEditingElements(context: CanvasRenderingContext2D): void {
    context.save();
    
    const defaultFormat = this.getDefaultFormat();
    const fontSize = defaultFormat.fontSize || 16;
    
    // 渲染选择区域
    if (this.selectionRange && this.selectionRange.start !== this.selectionRange.end) {
      context.fillStyle = 'rgba(59, 130, 246, 0.3)';
      
      const startOffset = this.getTextOffsetAtPosition(this.selectionRange.start);
      const endOffset = this.getTextOffsetAtPosition(this.selectionRange.end);
      
      context.fillRect(
        this.position.x + startOffset,
        this.position.y - fontSize,
        endOffset - startOffset,
        fontSize * this.lineHeight
      );
    }
    
    // 渲染光标
    if (!this.selectionRange || this.selectionRange.start === this.selectionRange.end) {
      context.strokeStyle = '#007acc';
      context.lineWidth = 2;
      
      const caretOffset = this.getTextOffsetAtPosition(this.caretPosition);
      context.beginPath();
      context.moveTo(this.position.x + caretOffset, this.position.y - fontSize);
      context.lineTo(this.position.x + caretOffset, this.position.y + fontSize * (this.lineHeight - 1));
      context.stroke();
    }
    
    context.restore();
  }
  
  /**
   * 获取文本位置的像素偏移
   */
  private getTextOffsetAtPosition(position: number): number {
    if (position <= 0) return 0;
    if (position >= this.getText().length) {
      return this.measureTextWidth(this.getText());
    }
    
    const text = this.getText().substring(0, position);
    return this.measureTextWidth(text);
  }
  
  /**
   * 测量文本宽度
   */
  private measureTextWidth(text: string): number {
    const context = document.createElement('canvas').getContext('2d');
    if (!context) return 0;
    
    const format = this.getDefaultFormat();
    context.font = this.getFontString(format);
    return context.measureText(text).width;
  }
  
  /**
   * 获取字体字符串
   */
  private getFontString(format: TextFormat): string {
    const fontStyle = format.fontStyle === 'italic' ? 'italic' : 'normal';
    const fontWeight = format.fontWeight || 'normal';
    const fontSize = format.fontSize || 16;
    const fontFamily = format.fontFamily || 'Arial, sans-serif';
    
    return `${fontStyle} ${fontWeight} ${fontSize}px ${fontFamily}`;
  }
  
  /**
   * 加载字体
   */
  async loadFont(fontInfo: FontInfo): Promise<void> {
    const fontKey = `${fontInfo.family}-${fontInfo.weight}-${fontInfo.style}`;
    
    // 检查缓存
    if (this.fontCache.get(fontKey) === 'loaded') {
      return;
    }
    
    // 设置加载状态
    this.fontCache.set(fontKey, 'loading');
    
    try {
      if (fontInfo.url) {
        // 创建CSS字体规则
        const style = document.createElement('style');
        style.textContent = `
          @font-face {
            font-family: '${fontInfo.family}';
            font-weight: ${fontInfo.weight};
            font-style: ${fontInfo.style};
            src: url('${fontInfo.url}');
          }
        `;
        document.head.appendChild(style);
      }
      
      // 等待字体加载
      await document.fonts.load(`${fontInfo.weight} ${fontInfo.style} 16px ${fontInfo.family}`);
      
      // 更新缓存
      this.fontCache.set(fontKey, 'loaded');
    } catch (error) {
      this.fontCache.set(fontKey, 'failed');
      throw new Error(`Failed to load font: ${fontInfo.family}`);
    }
  }
  
  /**
   * 检查字体是否已加载
   */
  isFontLoaded(fontInfo: FontInfo): boolean {
    const fontKey = `${fontInfo.family}-${fontInfo.weight}-${fontInfo.style}`;
    return this.fontCache.get(fontKey) === 'loaded';
  }
  
  /**
   * 获取边界（只读属性，实现IRenderable接口）
   */
  get bounds(): IRect {
    return this.getBounds();
  }

  /**
   * 获取文本边界
   */
  getBounds(): IRect {
    const bounds = super.getBounds();
    
    // 计算所有文本运行的实际边界
    if (this.textRuns.length > 0) {
      const context = document.createElement('canvas').getContext('2d');
      if (context) {
        let maxWidth = 0;
        let totalHeight = 0;
        
        for (const run of this.textRuns) {
          context.font = this.getFontString(run.format);
          const metrics = context.measureText(run.text);
          maxWidth = Math.max(maxWidth, metrics.width);
          
          const fontSize = run.format.fontSize || this.getDefaultFormat().fontSize || 16;
          totalHeight += fontSize * this.lineHeight;
        }
        
        bounds.width = maxWidth;
        bounds.height = totalHeight;
      }
    }
    
    return bounds;
  }
  
  /**
   * 请求重新渲染
   */
  private requestRender(): void {
    // 在实际实现中，这里会触发渲染更新
    console.log('Rich text shape updated, requesting render');
  }
  
  /**
   * 克隆形状
   */
  clone(): IShape {
    const cloned = new RichTextShape(
      `${this.id}_clone_${Date.now()}`,
      this.getText(),
      { ...this.position }
    );
    
    cloned.textRuns = this.textRuns.map(run => ({ ...run }));
    cloned.visible = this.visible;
    cloned.zIndex = this.zIndex;
    cloned.selected = this.selected;
    cloned.locked = this.locked;
    
    return cloned;
  }
  
  /**
   * 更新形状属性
   */
  update(update: IShapeUpdate): void {
    if (update.position) {
      this.position = { ...this.position, ...update.position };
    }
    if (update.size) {
      this.size = { ...this.size, ...update.size };
    }
    if (update.visible !== undefined) {
      this.visible = update.visible;
    }
    if (update.zIndex !== undefined) {
      this.zIndex = update.zIndex;
    }
    if (update.selected !== undefined) {
      this.selected = update.selected;
    }
    if (update.locked !== undefined) {
      this.locked = update.locked;
    }
  }
  
  /**
   * 序列化形状数据
   */
  serialize(): IShapeData {
    return {
      id: this.id,
      type: this.type,
      position: { ...this.position },
      size: { ...this.size },
      visible: this.visible,
      zIndex: this.zIndex,
      selected: this.selected,
      locked: this.locked,
      text: this.getText(),
      textRuns: this.textRuns.map(run => ({ ...run }))
    };
  }
  
  /**
   * 从序列化数据恢复
   */
  deserialize(data: IShapeData): void {
    this.position = { ...data.position };
    this.size = { ...data.size };
    this.visible = data.visible;
    this.zIndex = data.zIndex;
    this.selected = data.selected;
    this.locked = data.locked;
    
    if (data.text) {
      this.updateText(data.text);
    }
    
    if (data.textRuns) {
      this.textRuns = data.textRuns.map((run: any) => ({ ...run }));
    }
  }
  
  /**
   * 销毁形状
   */
  dispose(): void {
    // 清理资源
    this.textRuns = [];
    this.fontCache.clear();
  }
  
  /**
   * 获取位置
   */
  getPosition(): IPoint {
    return { ...this.position };
  }
  
  /**
   * 设置位置
   */
  setPosition(position: IPoint): void {
    this.position = { ...position };
  }
  
  /**
   * 获取尺寸
   */
  getSize(): { width: number; height: number } {
    return { ...this.size };
  }
  
  /**
   * 设置尺寸
   */
  setSize(size: { width: number; height: number }): void {
    this.size = { ...size };
  }
  
  /**
   * 获取文本
   */
  getText(): string {
    // 从textRuns重建文本
    return this.textRuns.map(run => run.text).join('');
  }
  
  /**
   * 更新文本
   */
  updateText(text: string): void {
    // 更新父类文本
    super.setText(text);
    // 重新计算尺寸
    this.size = this.calculateRichTextSize();
  }
  
  /**
   * 计算文本尺寸
   */
  private calculateRichTextSize(): { width: number; height: number } {
    // 创建临时canvas来测量文本尺寸
    const tempCanvas = document.createElement('canvas');
    const ctx = tempCanvas.getContext('2d');
    
    if (!ctx) {
      return { width: this.getText().length * 16 * 0.6, height: 16 };
    }

    // 设置字体样式
    const defaultFormat = this.getDefaultFormat();
    const fontSize = defaultFormat.fontSize || 16;
    const fontFamily = defaultFormat.fontFamily || 'Arial';
    
    ctx.font = `${fontSize}px ${fontFamily}`;
    
    // 测量文本
    const metrics = ctx.measureText(this.getText());
    const width = metrics.width;
    const height = fontSize * 1.2; // 行高约为字体大小的1.2倍
    
    return { width, height };
  }
}