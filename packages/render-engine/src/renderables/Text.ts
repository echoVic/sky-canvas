/**
 * Text 文本图形
 * 直接实现 IRenderable 接口，不依赖 Shape
 */
import { IGraphicsContext, IPoint, IRect } from '../core/interface/IGraphicsContext';
import { IRenderable } from '../core/types';
import { Transform } from '../math/Transform';
import { Vector2 } from '../math/Vector2';

/**
 * 文本样式接口
 */
export interface TextStyle {
  /** 填充颜色 */
  fill?: string;
  /** 描边颜色 */
  stroke?: string;
  /** 描边宽度 */
  strokeWidth?: number;
  /** 透明度 0-1 */
  opacity?: number;
}

/**
 * 文本配置接口
 */
export interface TextConfig {
  /** 位置 X 坐标 */
  x?: number;
  /** 位置 Y 坐标 */
  y?: number;
  /** 旋转角度（弧度） */
  rotation?: number;
  /** X 轴缩放 */
  scaleX?: number;
  /** Y 轴缩放 */
  scaleY?: number;
  /** 是否可见 */
  visible?: boolean;
  /** Z 轴层级 */
  zIndex?: number;
  /** 样式配置 */
  style?: TextStyle;
  /** 文本内容 */
  text?: string;
  /** 字体大小 */
  fontSize?: number;
  /** 字体族 */
  fontFamily?: string;
  /** 字体权重 */
  fontWeight?: 'normal' | 'bold' | 'lighter' | 'bolder' | number;
  /** 字体样式 */
  fontStyle?: 'normal' | 'italic' | 'oblique';
  /** 文本对齐方式 */
  textAlign?: 'left' | 'center' | 'right' | 'start' | 'end';
  /** 文本基线 */
  textBaseline?: 'top' | 'middle' | 'bottom' | 'alphabetic' | 'hanging';
  /** 最大宽度（用于自动换行） */
  maxWidth?: number;
  /** 行高 */
  lineHeight?: number;
}

/**
 * Text 文本类
 * 直接实现 IRenderable，专门用于文本渲染
 */
export class Text implements IRenderable {
  private _id: string;
  private _visible: boolean;
  private _zIndex: number;
  private _transform: Transform;
  private _style: TextStyle;

  // 文本特有属性
  private _text: string;
  private _fontSize: number;
  private _fontFamily: string;
  private _fontWeight: string | number;
  private _fontStyle: string;
  private _textAlign: 'left' | 'center' | 'right' | 'start' | 'end';
  private _textBaseline: 'top' | 'middle' | 'bottom' | 'alphabetic' | 'hanging';
  private _maxWidth?: number;
  private _lineHeight: number;

  constructor(config: TextConfig = {}) {
    this._id = this.generateId();
    this._visible = config.visible ?? true;
    this._zIndex = config.zIndex ?? 0;
    this._transform = new Transform(
      new Vector2(config.x ?? 0, config.y ?? 0),
      config.rotation ?? 0,
      new Vector2(config.scaleX ?? 1, config.scaleY ?? 1)
    );
    this._style = {
      fill: '#000000',
      stroke: undefined,
      strokeWidth: 1,
      opacity: 1,
      ...config.style
    };

    // 文本属性
    this._text = config.text ?? '';
    this._fontSize = config.fontSize ?? 16;
    this._fontFamily = config.fontFamily ?? 'Arial';
    this._fontWeight = config.fontWeight ?? 'normal';
    this._fontStyle = config.fontStyle ?? 'normal';
    this._textAlign = config.textAlign ?? 'left';
    this._textBaseline = config.textBaseline ?? 'alphabetic';
    this._maxWidth = config.maxWidth;
    this._lineHeight = config.lineHeight ?? this._fontSize * 1.2;
  }

  get id(): string {
    return this._id;
  }

  get type(): string {
    return 'text';
  }

  get visible(): boolean {
    return this._visible;
  }

  get zIndex(): number {
    return this._zIndex;
  }

  get transform(): Transform {
    return this._transform;
  }

  // 便利属性访问器
  get x(): number {
    return this._transform.position.x;
  }

  set x(value: number) {
    this._transform.position = new Vector2(value, this._transform.position.y);
  }

  get y(): number {
    return this._transform.position.y;
  }

  set y(value: number) {
    this._transform.position = new Vector2(this._transform.position.x, value);
  }

  get rotation(): number {
    return this._transform.rotation;
  }

  set rotation(value: number) {
    this._transform.rotation = value;
  }

  get scaleX(): number {
    return this._transform.scale.x;
  }

  set scaleX(value: number) {
    this._transform.scale = new Vector2(value, this._transform.scale.y);
  }

  get scaleY(): number {
    return this._transform.scale.y;
  }

  set scaleY(value: number) {
    this._transform.scale = new Vector2(this._transform.scale.x, value);
  }

  // 样式属性访问器
  get opacity(): number {
    return this._style.opacity ?? 1;
  }

  set opacity(value: number) {
    this._style.opacity = Math.max(0, Math.min(1, value));
  }

  get fill(): string | undefined {
    return this._style.fill;
  }

  set fill(value: string | undefined) {
    this._style.fill = value;
  }

  get stroke(): string | undefined {
    return this._style.stroke;
  }

  set stroke(value: string | undefined) {
    this._style.stroke = value;
  }

  get strokeWidth(): number {
    return this._style.strokeWidth ?? 1;
  }

  set strokeWidth(value: number) {
    this._style.strokeWidth = Math.max(0, value);
  }

  // 文本属性访问器
  get text(): string {
    return this._text;
  }

  set text(value: string) {
    this._text = value;
  }

  get fontSize(): number {
    return this._fontSize;
  }

  set fontSize(value: number) {
    this._fontSize = Math.max(1, value);
  }

  get fontFamily(): string {
    return this._fontFamily;
  }

  set fontFamily(value: string) {
    this._fontFamily = value;
  }

  get fontWeight(): string | number {
    return this._fontWeight;
  }

  set fontWeight(value: string | number) {
    this._fontWeight = value;
  }

  get fontStyle(): string {
    return this._fontStyle;
  }

  set fontStyle(value: string) {
    this._fontStyle = value;
  }

  get textAlign(): 'left' | 'center' | 'right' | 'start' | 'end' {
    return this._textAlign;
  }

  set textAlign(value: 'left' | 'center' | 'right' | 'start' | 'end') {
    this._textAlign = value;
  }

  get textBaseline(): 'top' | 'middle' | 'bottom' | 'alphabetic' | 'hanging' {
    return this._textBaseline;
  }

  set textBaseline(value: 'top' | 'middle' | 'bottom' | 'alphabetic' | 'hanging') {
    this._textBaseline = value;
  }

  get maxWidth(): number | undefined {
    return this._maxWidth;
  }

  set maxWidth(value: number | undefined) {
    this._maxWidth = value;
  }

  get lineHeight(): number {
    return this._lineHeight;
  }

  set lineHeight(value: number) {
    this._lineHeight = Math.max(1, value);
  }

  // 链式调用方法
  setVisible(value: boolean): this {
    this._visible = value;
    return this;
  }

  setZIndex(value: number): this {
    this._zIndex = value;
    return this;
  }

  position(): IPoint;
  position(point: IPoint): this;
  position(x: number, y: number): this;
  position(xOrPoint?: number | IPoint, y?: number): this | IPoint {
    if (xOrPoint === undefined) {
      return { x: this.x, y: this.y };
    }
    if (typeof xOrPoint === 'object') {
      this.x = xOrPoint.x;
      this.y = xOrPoint.y;
    } else {
      this.x = xOrPoint;
      this.y = y!;
    }
    return this;
  }

  scale(): IPoint;
  scale(value: number): this;
  scale(scaleX: number, scaleY: number): this;
  scale(xOrValue?: number, scaleY?: number): this | IPoint {
    if (xOrValue === undefined) {
      return { x: this.scaleX, y: this.scaleY };
    }
    if (scaleY === undefined) {
      this.scaleX = this.scaleY = xOrValue;
    } else {
      this.scaleX = xOrValue;
      this.scaleY = scaleY;
    }
    return this;
  }

  style(): TextStyle;
  style(style: Partial<TextStyle>): this;
  style(style?: Partial<TextStyle>): this | TextStyle {
    if (style === undefined) {
      return { ...this._style };
    }
    this._style = { ...this._style, ...style };
    return this;
  }

  move(deltaX: number, deltaY: number): this {
    this.x += deltaX;
    this.y += deltaY;
    return this;
  }

  moveTo(x: number, y: number): this {
    this.x = x;
    this.y = y;
    return this;
  }

  rotate(deltaAngle: number): this {
    this.rotation += deltaAngle;
    return this;
  }

  rotateTo(angle: number): this {
    this.rotation = angle;
    return this;
  }

  scaleBy(factor: number): this;
  scaleBy(factorX: number, factorY: number): this;
  scaleBy(factorX: number, factorY?: number): this {
    if (factorY === undefined) {
      this.scaleX *= factorX;
      this.scaleY *= factorX;
    } else {
      this.scaleX *= factorX;
      this.scaleY *= factorY;
    }
    return this;
  }

  scaleTo(scale: number): this;
  scaleTo(scaleX: number, scaleY: number): this;
  scaleTo(scaleX: number, scaleY?: number): this {
    if (scaleY === undefined) {
      this.scaleX = this.scaleY = scaleX;
    } else {
      this.scaleX = scaleX;
      this.scaleY = scaleY;
    }
    return this;
  }

  // 文本特有方法
  setText(text: string): this {
    this._text = text;
    return this;
  }

  setFont(fontSize: number, fontFamily?: string): this {
    this._fontSize = Math.max(1, fontSize);
    if (fontFamily) {
      this._fontFamily = fontFamily;
    }
    return this;
  }

  setTextAlign(align: 'left' | 'center' | 'right' | 'start' | 'end'): this {
    this._textAlign = align;
    return this;
  }

  setTextBaseline(baseline: 'top' | 'middle' | 'bottom' | 'alphabetic' | 'hanging'): this {
    this._textBaseline = baseline;
    return this;
  }

  /**
   * 渲染文本
   */
  render(context: IGraphicsContext): void {
    if (!this.visible || !this._text) return;

    this.saveAndRestore(context, () => {
      this.applyTransform(context);
      this.applyStyle(context);

      // 设置字体
      const font = `${this._fontStyle} ${this._fontWeight} ${this._fontSize}px ${this._fontFamily}`;
      context.setFont(font);
      context.setTextAlign(this._textAlign);
      context.setTextBaseline(this._textBaseline);

      // 处理多行文本
      const lines = this.getTextLines(context);

      lines.forEach((line, index) => {
        const y = index * this._lineHeight;

        // 填充文本
        if (this.fill) {
          context.setFillColor(this.fill);
          context.fillText(line, 0, y);
        }

        // 描边文本
        if (this.stroke && this.strokeWidth > 0) {
          context.setStrokeColor(this.stroke);
          context.setLineWidth(this.strokeWidth);
          context.strokeText(line, 0, y);
        }
      });
    });
  }

  /**
   * 点击测试
   */
  hitTest(point: IPoint): boolean {
    const bounds = this.getBounds();
    return point.x >= bounds.x &&
           point.x <= bounds.x + bounds.width &&
           point.y >= bounds.y &&
           point.y <= bounds.y + bounds.height;
  }

  /**
   * 获取边界框
   */
  getBounds(): IRect {
    const metrics = this.measureText();

    // 根据 textAlign 调整 x 坐标
    let x = this.x;
    if (this._textAlign === 'center') {
      x -= metrics.width / 2;
    } else if (this._textAlign === 'right' || this._textAlign === 'end') {
      x -= metrics.width;
    }

    // 根据 textBaseline 调整 y 坐标
    let y = this.y;
    if (this._textBaseline === 'top') {
      y = this.y;
    } else if (this._textBaseline === 'middle') {
      y = this.y - metrics.height / 2;
    } else if (this._textBaseline === 'bottom') {
      y = this.y - metrics.height;
    } else { // alphabetic, hanging
      y = this.y - metrics.height * 0.8; // 近似值
    }

    return {
      x,
      y,
      width: metrics.width,
      height: metrics.height
    };
  }

  /**
   * 克隆文本对象
   */
  clone(): Text {
    return new Text({
      x: this.x,
      y: this.y,
      rotation: this.rotation,
      scaleX: this.scaleX,
      scaleY: this.scaleY,
      visible: this.visible,
      zIndex: this.zIndex,
      style: this.style(),
      text: this._text,
      fontSize: this._fontSize,
      fontFamily: this._fontFamily,
      fontWeight: this._fontWeight as 'normal' | 'bold' | 'lighter' | 'bolder' | number,
      fontStyle: this._fontStyle as 'normal' | 'italic' | 'oblique',
      textAlign: this._textAlign,
      textBaseline: this._textBaseline,
      maxWidth: this._maxWidth,
      lineHeight: this._lineHeight
    });
  }

  /**
   * 清理资源
   */
  dispose(): void {
    // Text 对象没有需要特别清理的资源
  }

  /**
   * 生成唯一 ID
   */
  private generateId(): string {
    return `text-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * 测量文本尺寸
   */
  private measureText(): { width: number; height: number } {
    // 简化的文本测量，实际应该使用 canvas 的 measureText
    // 或者 features/text 模块的测量功能
    const lines = this._text.split('\n');
    const maxLineLength = Math.max(...lines.map(line => line.length));

    return {
      width: maxLineLength * this._fontSize * 0.6, // 粗略估算
      height: lines.length * this._lineHeight
    };
  }

  /**
   * 获取文本行数组（处理换行）
   */
  private getTextLines(context: IGraphicsContext): string[] {
    const lines = this._text.split('\n');

    // 如果没有设置最大宽度，直接返回原始行
    if (!this._maxWidth) {
      return lines;
    }

    // 处理自动换行
    const wrappedLines: string[] = [];

    for (const line of lines) {
      if (!line) {
        wrappedLines.push('');
        continue;
      }

      const metrics = context.measureText(line);
      if (metrics.width <= this._maxWidth) {
        wrappedLines.push(line);
      } else {
        // 需要换行
        const words = line.split(' ');
        let currentLine = '';

        for (const word of words) {
          const testLine = currentLine ? `${currentLine} ${word}` : word;
          const testMetrics = context.measureText(testLine);

          if (testMetrics.width <= this._maxWidth) {
            currentLine = testLine;
          } else {
            if (currentLine) {
              wrappedLines.push(currentLine);
              currentLine = word;
            } else {
              // 单个词太长，强制换行
              wrappedLines.push(word);
            }
          }
        }

        if (currentLine) {
          wrappedLines.push(currentLine);
        }
      }
    }

    return wrappedLines;
  }

  /**
   * 应用样式到图形上下文
   */
  private applyStyle(context: IGraphicsContext): void {
    if (this._style.opacity !== undefined && this._style.opacity < 1) {
      context.setGlobalAlpha(this._style.opacity);
    }
  }

  /**
   * 应用变换到图形上下文
   */
  private applyTransform(context: IGraphicsContext): void {
    const matrix = this._transform.matrix;
    // 提取变换值并应用
    const pos = this._transform.position;
    context.translate(pos.x, pos.y);
    if (this._transform.rotation !== 0) {
      context.rotate(this._transform.rotation);
    }
    const scale = this._transform.scale;
    if (scale.x !== 1 || scale.y !== 1) {
      context.scale(scale.x, scale.y);
    }
  }

  /**
   * 保存并恢复上下文状态
   */
  private saveAndRestore(context: IGraphicsContext, callback: () => void): void {
    context.save();
    try {
      callback();
    } finally {
      context.restore();
    }
  }

  /**
   * 静态工厂方法
   */
  static create(config: TextConfig): Text {
    return new Text(config);
  }

  static createAt(x: number, y: number, text: string): Text {
    return new Text({ x, y, text });
  }

  static createWithFont(x: number, y: number, text: string, fontSize: number, fontFamily?: string): Text {
    return new Text({ x, y, text, fontSize, fontFamily });
  }
}