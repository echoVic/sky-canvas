/**
 * 文本形状实现
 */
import { IShape, ISize, ShapeType } from './IShape';
import { IPoint, IRect } from '@sky-canvas/render-engine';

export interface ITextStyle {
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
 * 文本形状类
 */
export class TextShape implements IShape {
  readonly type: ShapeType = 'text';

  public position: IPoint;
  public size: ISize;
  public visible: boolean = true;
  public zIndex: number = 0;
  public text: string;
  public style: ITextStyle;

  constructor(
    public readonly id: string,
    position: IPoint,
    text: string,
    style: ITextStyle = {}
  ) {
    this.position = { ...position };
    this.text = text;
    this.style = {
      fontSize: 16,
      fontFamily: 'Arial',
      color: '#000000',
      align: 'left',
      baseline: 'alphabetic',
      ...style
    };

    // 计算文本尺寸
    this.size = this.calculateTextSize();
  }

  /**
   * 计算文本尺寸
   */
  private calculateTextSize(): ISize {
    // 创建临时canvas来测量文本尺寸
    const tempCanvas = document.createElement('canvas');
    const ctx = tempCanvas.getContext('2d');
    
    if (!ctx) {
      return { width: this.text.length * (this.style.fontSize || 16) * 0.6, height: this.style.fontSize || 16 };
    }

    // 设置字体样式
    const fontSize = this.style.fontSize || 16;
    const fontFamily = this.style.fontFamily || 'Arial';
    const fontWeight = this.style.bold ? 'bold' : 'normal';
    const fontStyle = this.style.italic ? 'italic' : 'normal';
    
    ctx.font = `${fontStyle} ${fontWeight} ${fontSize}px ${fontFamily}`;
    
    // 测量文本
    const metrics = ctx.measureText(this.text);
    const width = metrics.width;
    const height = fontSize * 1.2; // 行高约为字体大小的1.2倍
    
    return { width, height };
  }

  render(context: any): void {
    if (!context || !this.visible || !this.text) return;

    try {
      context.save();

      // 设置字体样式
      const fontSize = this.style.fontSize || 16;
      const fontFamily = this.style.fontFamily || 'Arial';
      const fontWeight = this.style.bold ? 'bold' : 'normal';
      const fontStyle = this.style.italic ? 'italic' : 'normal';
      
      context.font = `${fontStyle} ${fontWeight} ${fontSize}px ${fontFamily}`;
      context.fillStyle = this.style.color || '#000000';
      context.textAlign = this.style.align || 'left';
      context.textBaseline = this.style.baseline || 'alphabetic';

      // 计算渲染位置
      let x = this.position.x;
      const y = this.position.y;

      // 根据对齐方式调整x位置
      if (this.style.align === 'center') {
        x = this.position.x + this.size.width / 2;
      } else if (this.style.align === 'right') {
        x = this.position.x + this.size.width;
      }

      // 渲染文本
      context.fillText(this.text, x, y);

      // 如果有下划线
      if (this.style.underline) {
        const lineY = y + 2;
        context.beginPath();
        context.moveTo(this.position.x, lineY);
        context.lineTo(this.position.x + this.size.width, lineY);
        context.strokeStyle = this.style.color || '#000000';
        context.lineWidth = 1;
        context.stroke();
      }

      context.restore();
    } catch (error) {
      console.warn('Failed to render TextShape:', error);
    }
  }

  getBounds(): IRect {
    return {
      x: this.position.x,
      y: this.position.y - (this.style.fontSize || 16),
      width: this.size.width,
      height: this.size.height
    };
  }

  hitTest(point: IPoint): boolean {
    const bounds = this.getBounds();
    return (
      point.x >= bounds.x &&
      point.x <= bounds.x + bounds.width &&
      point.y >= bounds.y &&
      point.y <= bounds.y + bounds.height
    );
  }

  clone(): TextShape {
    const cloned = new TextShape(
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
   * 更新文本内容
   */
  setText(text: string): void {
    this.text = text;
    this.size = this.calculateTextSize();
  }

  /**
   * 更新文本样式
   */
  setStyle(style: Partial<ITextStyle>): void {
    this.style = { ...this.style, ...style };
    this.size = this.calculateTextSize();
  }

  dispose(): void {
    // 文本形状没有需要特殊清理的资源
  }
}