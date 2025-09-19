/**
 * 框架无关的图形上下文接口
 * 提供统一的图形操作抽象，不依赖具体的渲染后端
 */

export interface IPoint {
  x: number;
  y: number;
}

export interface ISize {
  width: number;
  height: number;
}

export interface IRect extends IPoint, ISize {}

export interface IColor {
  r: number;
  g: number;
  b: number;
  a?: number;
}

export interface ITransform {
  a: number; // scaleX
  b: number; // skewY
  c: number; // skewX
  d: number; // scaleY
  e: number; // translateX
  f: number; // translateY
}

/**
 * 图形样式接口
 */
export interface IGraphicsStyle {
  fillColor?: IColor | string;
  strokeColor?: IColor | string;
  lineWidth?: number;
  lineCap?: 'butt' | 'round' | 'square';
  lineJoin?: 'miter' | 'round' | 'bevel';
  opacity?: number;
  shadowColor?: IColor | string;
  shadowBlur?: number;
  shadowOffsetX?: number;
  shadowOffsetY?: number;
}

/**
 * 文本样式接口
 */
export interface ITextStyle extends IGraphicsStyle {
  fontFamily?: string;
  fontSize?: number;
  fontWeight?: 'normal' | 'bold' | 'lighter' | 'bolder' | number;
  fontStyle?: 'normal' | 'italic' | 'oblique';
  textAlign?: 'left' | 'center' | 'right' | 'start' | 'end';
  textBaseline?: 'top' | 'middle' | 'bottom' | 'alphabetic' | 'hanging';
}

/**
 * 图形上下文状态
 */
export interface IGraphicsState {
  transform: ITransform;
  style: IGraphicsStyle;
  clipPath?: IPath;
}

/**
 * 路径接口
 */
export interface IPath {
  moveTo(x: number, y: number): void;
  lineTo(x: number, y: number): void;
  quadraticCurveTo(cpx: number, cpy: number, x: number, y: number): void;
  bezierCurveTo(cp1x: number, cp1y: number, cp2x: number, cp2y: number, x: number, y: number): void;
  arc(x: number, y: number, radius: number, startAngle: number, endAngle: number, counterclockwise?: boolean): void;
  rect(x: number, y: number, width: number, height: number): void;
  closePath(): void;
  getBounds(): IRect;
}

/**
 * 图像数据接口
 */
export interface IImageData {
  width: number;
  height: number;
  data: Uint8ClampedArray;
}

/**
 * 框架无关的图形上下文接口
 * 提供统一的图形操作抽象，不依赖具体的渲染后端
 */
export interface IGraphicsContext {
  // 基础属性
  readonly width: number;
  readonly height: number;
  readonly devicePixelRatio: number;

  // 状态管理
  save(): void;
  restore(): void;
  getState(): IGraphicsState;
  setState(state: Partial<IGraphicsState>): void;

  // 变换操作
  setTransform(transform: ITransform): void;
  transform(a: number, b: number, c: number, d: number, e: number, f: number): void;
  translate(x: number, y: number): void;
  rotate(angle: number): void;
  scale(x: number, y: number): void;
  resetTransform(): void;

  // 样式设置
  setStyle(style: Partial<IGraphicsStyle>): void;
  setFillColor(color: IColor | string): void;
  setStrokeColor(color: IColor | string): void;
  setFillStyle(color: IColor | string): void;
  setStrokeStyle(color: IColor | string): void;
  setLineWidth(width: number): void;
  setOpacity(opacity: number): void;
  setGlobalAlpha(alpha: number): void;
  setLineDash(segments: number[]): void;
  setTextAlign(align: 'left' | 'center' | 'right' | 'start' | 'end'): void;
  setTextBaseline(baseline: 'top' | 'middle' | 'bottom' | 'alphabetic' | 'hanging'): void;
  setFont(font: string): void;

  // 清除和渲染
  clear(): void;
  clearRect(x: number, y: number, width: number, height: number): void;
  present(): void; // 提交当前渲染通道

  // 路径绘制
  beginPath(): void;
  closePath(): void;
  moveTo(x: number, y: number): void;
  lineTo(x: number, y: number): void;
  quadraticCurveTo(cpx: number, cpy: number, x: number, y: number): void;
  bezierCurveTo(cp1x: number, cp1y: number, cp2x: number, cp2y: number, x: number, y: number): void;
  arc(x: number, y: number, radius: number, startAngle: number, endAngle: number, counterclockwise?: boolean): void;
  rect(x: number, y: number, width: number, height: number): void;

  // 绘制方法
  fill(): void;
  stroke(): void;
  fillRect(x: number, y: number, width: number, height: number): void;
  strokeRect(x: number, y: number, width: number, height: number): void;
  drawLine(x1: number, y1: number, x2: number, y2: number): void;
  drawRect(rect: IRect, fill?: boolean, stroke?: boolean): void;

  // 圆形绘制
  fillCircle(x: number, y: number, radius: number): void;
  strokeCircle(x: number, y: number, radius: number): void;
  drawCircle(center: IPoint, radius: number, fill?: boolean, stroke?: boolean): void;

  // 文本绘制
  fillText(text: string, x: number, y: number, style?: ITextStyle): void;
  strokeText(text: string, x: number, y: number, style?: ITextStyle): void;
  measureText(text: string, style?: ITextStyle): { width: number; height: number };

  // 图像操作
  drawImage(imageData: IImageData, dx: number, dy: number): void;
  drawImage(imageData: IImageData, dx: number, dy: number, dw: number, dh: number): void;
  getImageData(x: number, y: number, width: number, height: number): IImageData;
  putImageData(imageData: IImageData, x: number, y: number): void;

  // 裁剪
  clip(): void;
  clipRect(x: number, y: number, width: number, height: number): void;

  // 坐标转换
  screenToWorld(point: IPoint): IPoint;
  worldToScreen(point: IPoint): IPoint;

  // 资源管理
  dispose(): void;
}


/**
 * 图形能力接口
 */
export interface IGraphicsCapabilities {
  supportsHardwareAcceleration: boolean;
  supportsTransforms: boolean;
  supportsFilters: boolean;
  supportsBlending: boolean;
  maxTextureSize: number;
  supportedFormats: string[];
}

