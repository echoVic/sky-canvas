/**
 * WebGL图形上下文实现
 */
import { IGraphicsContext, IGraphicsContextFactory, IPoint } from '../core/IGraphicsContext';
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
}

/**
 * WebGL上下文实现
 */
class WebGLContext implements IWebGLContext {
  public readonly width: number;
  public readonly height: number;
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
    this.projectionMatrix = Matrix3.projection(this.width, this.height);
    
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

  drawLine(from: IPoint, to: IPoint): void {
    this.renderManager.drawLine(
      from.x, from.y, to.x, to.y,
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

  drawImage(imageData: { source: any; dx?: number; dy?: number; dWidth?: number; dHeight?: number }): void {
    // WebGL图像绘制需要纹理
    // 这里是简化实现占位符
  }

  dispose(): void {
    this.renderManager.dispose();
  }
}
