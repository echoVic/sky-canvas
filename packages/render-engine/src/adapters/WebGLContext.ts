/**
 * WebGL图形上下文实现
 */
import { IGraphicsCapabilities, IGraphicsContext, IGraphicsContextFactory, IImageData, IPoint } from '../graphics/IGraphicsContext';
import { Matrix3 } from '../math/Matrix3';
import { WebGLRenderManager } from './WebGLRenderManager';

export interface IWebGLContext extends IGraphicsContext {
  readonly gl: WebGLRenderingContext;
  
  // WebGL特有方法
  clear(color?: string): void;
  setBlendMode(mode: string): void;
  drawElements(count: number, offset: number): void;
  drawArrays(mode: number, first: number, count: number): void;
  createBuffer(): WebGLBuffer | null;
  bindBuffer(target: number, buffer: WebGLBuffer | null): void;
  bufferData(target: number, data: BufferSource | null, usage: number): void;
  useProgram(program: WebGLProgram | null): void;
  bindTexture(target: number, texture: WebGLTexture | null): void;
}

/**
 * WebGL上下文工厂
 */
export class WebGLContextFactory implements IGraphicsContextFactory<HTMLCanvasElement> {
  isSupported(): boolean {
    try {
      const canvas = document.createElement('canvas');
      const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
      return gl !== null;
    } catch {
      return false;
    }
  }

  async createContext(canvas: HTMLCanvasElement): Promise<IWebGLContext> {
    const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
    if (!gl || !(gl instanceof WebGLRenderingContext)) {
      throw new Error('WebGL not supported');
    }

    return new WebGLContext(gl, canvas);
  }

  getCapabilities(): IGraphicsCapabilities {
    return {
      supportsHardwareAcceleration: true,
      supportsTransforms: true,
      supportsBlending: true,
      supportsFilters: false,
      maxTextureSize: 4096,
      supportedFormats: ['png', 'jpg', 'jpeg', 'webp']
    };
  }
}

/**
 * WebGL上下文实现
 */
class WebGLContext implements IWebGLContext {
  public readonly width: number;
  public readonly height: number;
  public readonly devicePixelRatio: number = window.devicePixelRatio || 1;
  public readonly gl: WebGLRenderingContext;

  // 变换矩阵栈
  private transformStack: Matrix3[] = [];
  private currentTransform: Matrix3;
  private projectionMatrix: Matrix3;
  
  // 状态栈
  private stateStack: Array<{
    transform: Matrix3;
    fillStyle: string;
    strokeStyle: string;
    lineWidth: number;
    globalAlpha: number;
  }> = [];
  
  // 当前样式状态
  private fillStyle: string = '#000000';
  private strokeStyle: string = '#000000';
  private lineWidth: number = 1;
  private globalAlpha: number = 1;

  // 渲染管理器
  private renderManager: WebGLRenderManager;

  constructor(gl: WebGLRenderingContext, canvas: HTMLCanvasElement) {
    this.gl = gl;
    this.width = canvas.width;
    this.height = canvas.height;
    
    // 初始化变换矩阵
    this.currentTransform = Matrix3.identity();
    // 创建投影矩阵 - 简化实现
    this.projectionMatrix = Matrix3.identity();
    
    // 初始化渲染管理器
    this.renderManager = new WebGLRenderManager(gl);
    
    // 初始化WebGL状态
    this.setupWebGLState();
  }

  private setupWebGLState(): void {
    // 启用混合
    this.gl.enable(this.gl.BLEND);
    this.gl.blendFunc(this.gl.SRC_ALPHA, this.gl.ONE_MINUS_SRC_ALPHA);

    // 设置清除颜色
    this.gl.clearColor(0, 0, 0, 0);

    // 禁用深度测试（2D渲染）
    this.gl.disable(this.gl.DEPTH_TEST);

    // 设置视口
    this.gl.viewport(0, 0, this.width, this.height);
  }

  clear(color?: string): void {
    if (color) {
      // 简单的颜色解析
      const rgba = this.parseColor(color);
      this.gl.clearColor(rgba[0], rgba[1], rgba[2], rgba[3]);
    }
    this.gl.clear(this.gl.COLOR_BUFFER_BIT);
  }

  save(): void {
    // 保存当前状态到栈
    this.stateStack.push({
      transform: this.currentTransform.clone(),
      fillStyle: this.fillStyle,
      strokeStyle: this.strokeStyle,
      lineWidth: this.lineWidth,
      globalAlpha: this.globalAlpha
    });
  }

  restore(): void {
    // 从栈恢复状态
    const state = this.stateStack.pop();
    if (state) {
      this.currentTransform = state.transform;
      this.fillStyle = state.fillStyle;
      this.strokeStyle = state.strokeStyle;
      this.lineWidth = state.lineWidth;
      this.globalAlpha = state.globalAlpha;
    }
  }

  translate(x: number, y: number): void {
    this.currentTransform.translate(x, y);
  }

  rotate(angle: number): void {
    this.currentTransform.rotate(angle);
  }

  scale(scaleX: number, scaleY: number): void {
    this.currentTransform.scale(scaleX, scaleY);
  }

  setOpacity(opacity: number): void {
    this.globalAlpha = Math.max(0, Math.min(1, opacity));
  }

  // WebGL特有方法
  setBlendMode(mode: string): void {
    switch (mode) {
      case 'normal':
        this.gl.blendFunc(this.gl.SRC_ALPHA, this.gl.ONE_MINUS_SRC_ALPHA);
        break;
      case 'additive':
        this.gl.blendFunc(this.gl.SRC_ALPHA, this.gl.ONE);
        break;
      case 'multiply':
        this.gl.blendFunc(this.gl.DST_COLOR, this.gl.ZERO);
        break;
      default:
        this.gl.blendFunc(this.gl.SRC_ALPHA, this.gl.ONE_MINUS_SRC_ALPHA);
    }
  }

  drawElements(count: number, offset: number = 0): void {
    this.gl.drawElements(this.gl.TRIANGLES, count, this.gl.UNSIGNED_SHORT, offset);
  }

  drawArrays(mode: number, first: number, count: number): void {
    this.gl.drawArrays(mode, first, count);
  }

  createBuffer(): WebGLBuffer | null {
    return this.gl.createBuffer();
  }

  bindBuffer(target: number, buffer: WebGLBuffer | null): void {
    this.gl.bindBuffer(target, buffer);
  }

  bufferData(target: number, data: BufferSource | null, usage: number): void {
    this.gl.bufferData(target, data, usage);
  }

  useProgram(program: WebGLProgram | null): void {
    this.gl.useProgram(program);
  }

  bindTexture(target: number, texture: WebGLTexture | null): void {
    this.gl.bindTexture(target, texture);
  }

  screenToWorld(point: IPoint): IPoint {
    // WebGL屏幕坐标转换
    return {
      x: point.x,
      y: this.height - point.y // WebGL的Y轴是反向的
    };
  }

  worldToScreen(point: IPoint): IPoint {
    return {
      x: point.x,
      y: this.height - point.y
    };
  }

  private parseColor(colorStr: string): [number, number, number, number] {
    // 简化的颜色解析，支持十六进制
    if (colorStr.startsWith('#')) {
      const hex = colorStr.slice(1);
      const r = parseInt(hex.slice(0, 2), 16) / 255;
      const g = parseInt(hex.slice(2, 4), 16) / 255;
      const b = parseInt(hex.slice(4, 6), 16) / 255;
      return [r, g, b, 1];
    }
    return [1, 1, 1, 1]; // 默认白色
  }

  /**
   * 获取当前变换矩阵
   */
  getCurrentTransform(): Matrix3 {
    return this.currentTransform.clone();
  }

  /**
   * 获取投影矩阵
   */
  getProjectionMatrix(): Matrix3 {
    return this.projectionMatrix.clone();
  }

  /**
   * 获取组合的MVP矩阵
   */
  getMVPMatrix(): Matrix3 {
    return this.projectionMatrix.clone().multiply(this.currentTransform);
  }

  // 缺失的接口方法实现
  setStrokeStyle(style: string): void {
    this.strokeStyle = style;
  }

  setFillStyle(style: string): void {
    this.fillStyle = style;
  }

  setLineWidth(width: number): void {
    this.lineWidth = Math.max(0, width);
    this.gl.lineWidth(width);
  }

  setLineDash(segments: number[]): void {
    // WebGL中虚线需要通过着色器实现
  }

  setGlobalAlpha(alpha: number): void {
    this.globalAlpha = Math.max(0, Math.min(1, alpha));
  }

  setTextAlign(align: 'left' | 'center' | 'right' | 'start' | 'end'): void {
    // WebGL中文本对齐需要在文本渲染时处理
  }

  setTextBaseline(baseline: 'top' | 'middle' | 'bottom' | 'alphabetic' | 'hanging'): void {
    // WebGL中文本基线需要在文本渲染时处理
  }

  setFont(font: string): void {
    // WebGL中字体设置需要在文本渲染时处理
    // 这里可以解析字体字符串并存储字体信息
  }

  drawRect(rect: { x: number; y: number; width: number; height: number }, fill?: boolean, stroke?: boolean): void {
    const fillColor = fill ? this.fillStyle : undefined;
    const strokeColor = stroke ? this.strokeStyle : undefined;
    const strokeWidth = stroke ? this.lineWidth : undefined;
    
    this.renderManager.drawRectangle(
      rect.x, rect.y, rect.width, rect.height,
      fillColor, strokeColor, strokeWidth
    );
    
    // 立即渲染以保持与Canvas2D的兼容性
    this.flushRender();
  }

  drawCircle(center: IPoint, radius: number, fill?: boolean, stroke?: boolean): void {
    const fillColor = fill ? this.fillStyle : undefined;
    const strokeColor = stroke ? this.strokeStyle : undefined;
    const strokeWidth = stroke ? this.lineWidth : undefined;
    
    this.renderManager.drawCircle(
      center.x, center.y, radius,
      fillColor, strokeColor, strokeWidth
    );
    
    // 立即渲染以保持与Canvas2D的兼容性
    this.flushRender();
  }

  drawLine(x1: number, y1: number, x2: number, y2: number): void {
    this.renderManager.drawLine(
      x1, y1, x2, y2,
      this.strokeStyle, this.lineWidth
    );
    
    // 立即渲染以保持与Canvas2D的兼容性
    this.flushRender();
  }
  
  /**
   * 执行渲染
   */
  private flushRender(): void {
    this.renderManager.flush(this.projectionMatrix, this.currentTransform);
  }

  drawImage(imageData: IImageData, dx: number, dy: number): void;
  drawImage(imageData: IImageData, dx: number, dy: number, dw: number, dh: number): void;
  drawImage(imageData: IImageData, dx: number, dy: number, dw?: number, dh?: number): void {
    // WebGL图像绘制需要纹理
    // 这里是简化实现占位符
    console.log('Drawing image', { imageData, dx, dy, dw, dh });
  }

  // 添加缺失的接口方法
  getState(): any {
    return {}; // 占位符实现
  }

  setState(state: any): void {
    // 占位符实现
  }

  setTransform(transform: any): void {
    this.currentTransform = transform;
  }

  transform(a: number, b: number, c: number, d: number, e: number, f: number): void {
    // 占位符实现
  }

  resetTransform(): void {
    this.currentTransform = Matrix3.identity();
  }

  setStyle(style: any): void {
    // 占位符实现
  }

  setFillColor(color: any): void {
    // 占位符实现
  }

  setStrokeColor(color: any): void {
    // 占位符实现
  }

  clearRect(x: number, y: number, width: number, height: number): void {
    // 占位符实现
  }

  present(): void {
    // WebGL需要显式提交渲染
  }

  beginPath(): void {
    // 占位符实现
  }

  closePath(): void {
    // 占位符实现
  }

  moveTo(x: number, y: number): void {
    // 占位符实现
  }

  lineTo(x: number, y: number): void {
    // 占位符实现
  }

  quadraticCurveTo(cpx: number, cpy: number, x: number, y: number): void {
    // 占位符实现
  }

  bezierCurveTo(cp1x: number, cp1y: number, cp2x: number, cp2y: number, x: number, y: number): void {
    // 占位符实现
  }

  arc(x: number, y: number, radius: number, startAngle: number, endAngle: number, counterclockwise?: boolean): void {
    // 占位符实现
  }

  rect(x: number, y: number, width: number, height: number): void {
    // 占位符实现
  }

  fill(): void {
    // 占位符实现
  }

  stroke(): void {
    // 占位符实现
  }

  fillRect(x: number, y: number, width: number, height: number): void {
    // 占位符实现
  }

  strokeRect(x: number, y: number, width: number, height: number): void {
    // 占位符实现
  }

  fillCircle(x: number, y: number, radius: number): void {
    // 占位符实现
  }

  strokeCircle(x: number, y: number, radius: number): void {
    // 占位符实现
  }

  fillText(text: string, x: number, y: number, style?: any): void {
    // 占位符实现
  }

  strokeText(text: string, x: number, y: number, style?: any): void {
    // 占位符实现
  }

  measureText(text: string, style?: any): { width: number; height: number } {
    return { width: 0, height: 0 }; // 占位符实现
  }

  getImageData(x: number, y: number, width: number, height: number): any {
    return null; // 占位符实现
  }

  putImageData(imageData: any, x: number, y: number): void {
    // 占位符实现
  }

  clip(): void {
    // 占位符实现
  }

  clipRect(x: number, y: number, width: number, height: number): void {
    // 占位符实现
  }

  dispose(): void {
    this.renderManager.dispose();
  }
}
