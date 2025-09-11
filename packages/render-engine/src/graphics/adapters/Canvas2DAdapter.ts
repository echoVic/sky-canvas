/**
 * Canvas2D适配器
 * 将HTML5 Canvas 2D API适配到IGraphicsContext接口
 */

import {
  IColor,
  IGraphicsCapabilities,
  IGraphicsContext,
  IGraphicsContextFactory,
  IGraphicsState,
  IGraphicsStyle,
  IImageData,
  IPoint,
  IRect,
  ITextStyle,
  ITransform
} from '../IGraphicsContext';

/**
 * 颜色转换工具
 */
class ColorUtils {
  static toCanvasColor(color: IColor | string): string {
    if (typeof color === 'string') {
      return color;
    }
    const { r, g, b, a = 1 } = color;
    return `rgba(${Math.round(r * 255)}, ${Math.round(g * 255)}, ${Math.round(b * 255)}, ${a})`;
  }
}

/**
 * Canvas2D图形上下文适配器
 */
export class Canvas2DGraphicsContext implements IGraphicsContext {
  private ctx: CanvasRenderingContext2D;
  private canvas: HTMLCanvasElement;
  private stateStack: IGraphicsState[] = [];
  private currentState: IGraphicsState;

  constructor(canvas: HTMLCanvasElement) {
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('Failed to get 2D rendering context');
    }
    
    this.canvas = canvas;
    this.ctx = ctx;
    this.currentState = this.createDefaultState();
  }

  // 基础属性
  get width(): number {
    return this.canvas.width;
  }

  get height(): number {
    return this.canvas.height;
  }

  get devicePixelRatio(): number {
    return window.devicePixelRatio || 1;
  }

  // 状态管理
  save(): void {
    this.ctx.save();
    this.stateStack.push({ ...this.currentState });
  }

  restore(): void {
    this.ctx.restore();
    if (this.stateStack.length > 0) {
      this.currentState = this.stateStack.pop()!;
    }
  }

  getState(): IGraphicsState {
    return { ...this.currentState };
  }

  setState(state: Partial<IGraphicsState>): void {
    this.currentState = { ...this.currentState, ...state };
    this.applyStateToContext();
  }

  // 变换操作
  setTransform(transform: ITransform): void {
    const { a, b, c, d, e, f } = transform;
    this.ctx.setTransform(a, b, c, d, e, f);
    this.currentState.transform = { ...transform };
  }

  transform(a: number, b: number, c: number, d: number, e: number, f: number): void {
    this.ctx.transform(a, b, c, d, e, f);
    // 更新当前变换状态（简化处理）
    const current = this.currentState.transform;
    this.currentState.transform = {
      a: current.a * a + current.c * b,
      b: current.b * a + current.d * b,
      c: current.a * c + current.c * d,
      d: current.b * c + current.d * d,
      e: current.a * e + current.c * f + current.e,
      f: current.b * e + current.d * f + current.f
    };
  }

  translate(x: number, y: number): void {
    this.ctx.translate(x, y);
    this.currentState.transform.e += x;
    this.currentState.transform.f += y;
  }

  rotate(angle: number): void {
    this.ctx.rotate(angle);
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    const { a, b, c, d } = this.currentState.transform;
    this.currentState.transform.a = a * cos + c * sin;
    this.currentState.transform.b = b * cos + d * sin;
    this.currentState.transform.c = c * cos - a * sin;
    this.currentState.transform.d = d * cos - b * sin;
  }

  scale(x: number, y: number): void {
    this.ctx.scale(x, y);
    this.currentState.transform.a *= x;
    this.currentState.transform.b *= x;
    this.currentState.transform.c *= y;
    this.currentState.transform.d *= y;
  }

  resetTransform(): void {
    this.ctx.resetTransform();
    this.currentState.transform = {
      a: 1, b: 0, c: 0, d: 1, e: 0, f: 0
    };
  }

  // 样式设置
  setStyle(style: Partial<IGraphicsStyle>): void {
    this.currentState.style = { ...this.currentState.style, ...style };
    this.applyStyleToContext(style);
  }

  setFillColor(color: IColor | string): void {
    const canvasColor = ColorUtils.toCanvasColor(color);
    this.ctx.fillStyle = canvasColor;
    this.currentState.style.fillColor = color;
  }

  setStrokeColor(color: IColor | string): void {
    const canvasColor = ColorUtils.toCanvasColor(color);
    this.ctx.strokeStyle = canvasColor;
    this.currentState.style.strokeColor = color;
  }

  setLineWidth(width: number): void {
    this.currentState.style.lineWidth = width;
    this.ctx.lineWidth = width;
  }

  setFillStyle(color: IColor | string): void {
    this.setFillColor(color);
  }

  setStrokeStyle(color: IColor | string): void {
    this.setStrokeColor(color);
  }

  drawLine(x1: number, y1: number, x2: number, y2: number): void {
    this.beginPath();
    this.moveTo(x1, y1);
    this.lineTo(x2, y2);
    this.stroke();
  }

  drawRect(rect: IRect, fill?: boolean, stroke?: boolean): void {
    if (fill) {
      this.fillRect(rect.x, rect.y, rect.width, rect.height);
    }
    if (stroke) {
      this.strokeRect(rect.x, rect.y, rect.width, rect.height);
    }
  }

  drawCircle(center: IPoint, radius: number, fill?: boolean, stroke?: boolean): void {
    if (fill) {
      this.fillCircle(center.x, center.y, radius);
    }
    if (stroke) {
      this.strokeCircle(center.x, center.y, radius);
    }
  }

  setOpacity(opacity: number): void {
    this.ctx.globalAlpha = opacity;
    this.currentState.style.opacity = opacity;
  }

  setFont(font: string): void {
    this.ctx.font = font;
  }

  setGlobalAlpha(alpha: number): void {
    this.ctx.globalAlpha = Math.max(0, Math.min(1, alpha));
  }

  setLineDash(segments: number[]): void {
    this.ctx.setLineDash(segments);
  }

  setTextAlign(align: 'left' | 'center' | 'right' | 'start' | 'end'): void {
    this.ctx.textAlign = align;
  }

  setTextBaseline(baseline: 'top' | 'middle' | 'bottom' | 'alphabetic' | 'hanging'): void {
    this.ctx.textBaseline = baseline;
  }

  // 基础绘制操作
  clear(): void {
    this.ctx.save();
    this.ctx.resetTransform();
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this.ctx.restore();
  }

  clearRect(x: number, y: number, width: number, height: number): void {
    this.ctx.clearRect(x, y, width, height);
  }

  present(): void {
    // Canvas2D 自动显示绘制内容，无需手动提交
  }

  // 路径绘制
  beginPath(): void {
    this.ctx.beginPath();
  }

  closePath(): void {
    this.ctx.closePath();
  }

  moveTo(x: number, y: number): void {
    this.ctx.moveTo(x, y);
  }

  lineTo(x: number, y: number): void {
    this.ctx.lineTo(x, y);
  }

  quadraticCurveTo(cpx: number, cpy: number, x: number, y: number): void {
    this.ctx.quadraticCurveTo(cpx, cpy, x, y);
  }

  bezierCurveTo(cp1x: number, cp1y: number, cp2x: number, cp2y: number, x: number, y: number): void {
    this.ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, x, y);
  }

  arc(x: number, y: number, radius: number, startAngle: number, endAngle: number, counterclockwise?: boolean): void {
    this.ctx.arc(x, y, radius, startAngle, endAngle, counterclockwise);
  }

  rect(x: number, y: number, width: number, height: number): void {
    this.ctx.rect(x, y, width, height);
  }

  // 填充和描边
  fill(): void {
    this.ctx.fill();
  }

  stroke(): void {
    this.ctx.stroke();
  }

  fillRect(x: number, y: number, width: number, height: number): void {
    this.ctx.fillRect(x, y, width, height);
  }

  strokeRect(x: number, y: number, width: number, height: number): void {
    this.ctx.strokeRect(x, y, width, height);
  }

  // 圆形绘制
  fillCircle(x: number, y: number, radius: number): void {
    this.ctx.beginPath();
    this.ctx.arc(x, y, radius, 0, 2 * Math.PI);
    this.ctx.fill();
  }

  strokeCircle(x: number, y: number, radius: number): void {
    this.ctx.beginPath();
    this.ctx.arc(x, y, radius, 0, 2 * Math.PI);
    this.ctx.stroke();
  }

  // 文本绘制
  fillText(text: string, x: number, y: number, style?: ITextStyle): void {
    if (style) {
      this.applyTextStyle(style);
    }
    this.ctx.fillText(text, x, y);
  }

  strokeText(text: string, x: number, y: number, style?: ITextStyle): void {
    if (style) {
      this.applyTextStyle(style);
    }
    this.ctx.strokeText(text, x, y);
  }

  measureText(text: string, style?: ITextStyle): { width: number; height: number } {
    if (style) {
      this.applyTextStyle(style);
    }
    const metrics = this.ctx.measureText(text);
    return {
      width: metrics.width,
      height: metrics.actualBoundingBoxAscent + metrics.actualBoundingBoxDescent
    };
  }

  // 图像操作
  drawImage(imageData: IImageData, dx: number, dy: number): void;
  drawImage(imageData: IImageData, dx: number, dy: number, dw: number, dh: number): void;
  drawImage(imageData: IImageData, dx: number, dy: number, dw?: number, dh?: number): void {
    const canvas = document.createElement('canvas');
    canvas.width = imageData.width;
    canvas.height = imageData.height;
    const ctx = canvas.getContext('2d')!;
    const canvasImageData = ctx.createImageData(imageData.width, imageData.height);
    canvasImageData.data.set(imageData.data);
    ctx.putImageData(canvasImageData, 0, 0);
    
    if (dw !== undefined && dh !== undefined) {
      this.ctx.drawImage(canvas, dx, dy, dw, dh);
    } else {
      this.ctx.drawImage(canvas, dx, dy);
    }
  }

  getImageData(x: number, y: number, width: number, height: number): IImageData {
    const imageData = this.ctx.getImageData(x, y, width, height);
    return {
      width: imageData.width,
      height: imageData.height,
      data: imageData.data
    };
  }

  putImageData(imageData: IImageData, x: number, y: number): void {
    const canvasImageData = this.ctx.createImageData(imageData.width, imageData.height);
    canvasImageData.data.set(imageData.data);
    this.ctx.putImageData(canvasImageData, x, y);
  }

  // 裁剪
  clip(): void {
    this.ctx.clip();
  }

  clipRect(x: number, y: number, width: number, height: number): void {
    this.ctx.beginPath();
    this.ctx.rect(x, y, width, height);
    this.ctx.clip();
  }

  // 坐标转换
  screenToWorld(point: IPoint): IPoint {
    const rect = this.canvas.getBoundingClientRect();
    const scaleX = this.canvas.width / rect.width;
    const scaleY = this.canvas.height / rect.height;
    
    return {
      x: (point.x - rect.left) * scaleX,
      y: (point.y - rect.top) * scaleY
    };
  }

  worldToScreen(point: IPoint): IPoint {
    const rect = this.canvas.getBoundingClientRect();
    const scaleX = rect.width / this.canvas.width;
    const scaleY = rect.height / this.canvas.height;
    
    return {
      x: point.x * scaleX + rect.left,
      y: point.y * scaleY + rect.top
    };
  }

  // 资源管理
  dispose(): void {
    // Canvas2D 不需要特殊的清理操作
  }

  // 私有方法
  private createDefaultState(): IGraphicsState {
    return {
      transform: { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 },
      style: {
        fillColor: '#000000',
        strokeColor: '#000000',
        lineWidth: 1,
        lineCap: 'butt',
        lineJoin: 'miter',
        opacity: 1
      }
    };
  }

  private applyStateToContext(): void {
    this.applyStyleToContext(this.currentState.style);
  }

  private applyStyleToContext(style: Partial<IGraphicsStyle>): void {
    if (style.fillColor !== undefined) {
      this.ctx.fillStyle = ColorUtils.toCanvasColor(style.fillColor);
    }
    if (style.strokeColor !== undefined) {
      this.ctx.strokeStyle = ColorUtils.toCanvasColor(style.strokeColor);
    }
    if (style.lineWidth !== undefined) {
      this.ctx.lineWidth = style.lineWidth;
    }
    if (style.lineCap !== undefined) {
      this.ctx.lineCap = style.lineCap;
    }
    if (style.lineJoin !== undefined) {
      this.ctx.lineJoin = style.lineJoin;
    }
    if (style.opacity !== undefined) {
      this.ctx.globalAlpha = style.opacity;
    }
    if (style.shadowColor !== undefined) {
      this.ctx.shadowColor = ColorUtils.toCanvasColor(style.shadowColor);
    }
    if (style.shadowBlur !== undefined) {
      this.ctx.shadowBlur = style.shadowBlur;
    }
    if (style.shadowOffsetX !== undefined) {
      this.ctx.shadowOffsetX = style.shadowOffsetX;
    }
    if (style.shadowOffsetY !== undefined) {
      this.ctx.shadowOffsetY = style.shadowOffsetY;
    }
  }

  private applyTextStyle(style: ITextStyle): void {
    let font = '';
    if (style.fontStyle) {
      font += style.fontStyle + ' ';
    }
    if (style.fontWeight) {
      font += style.fontWeight + ' ';
    }
    if (style.fontSize) {
      font += style.fontSize + 'px ';
    }
    if (style.fontFamily) {
      font += style.fontFamily;
    }
    
    if (font.trim()) {
      this.ctx.font = font.trim();
    }
    
    if (style.textAlign) {
      this.ctx.textAlign = style.textAlign;
    }
    if (style.textBaseline) {
      this.ctx.textBaseline = style.textBaseline;
    }
    
    // 应用通用样式
    this.applyStyleToContext(style);
  }
}

/**
 * Canvas2D图形上下文工厂
 */
export class Canvas2DGraphicsContextFactory implements IGraphicsContextFactory<HTMLCanvasElement> {
  async createContext(canvas: HTMLCanvasElement): Promise<IGraphicsContext> {
    return new Canvas2DGraphicsContext(canvas);
  }

  isSupported(): boolean {
    try {
      const canvas = document.createElement('canvas');
      return !!(canvas.getContext && canvas.getContext('2d'));
    } catch {
      return false;
    }
  }

  getCapabilities(): IGraphicsCapabilities {
    return {
      supportsHardwareAcceleration: false,
      supportsTransforms: true,
      supportsFilters: true,
      supportsBlending: true,
      maxTextureSize: 4096, // 一般的Canvas2D限制
      supportedFormats: ['png', 'jpeg', 'webp', 'svg']
    };
  }
}