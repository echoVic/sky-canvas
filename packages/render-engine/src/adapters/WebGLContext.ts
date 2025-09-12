/**
 * WebGL图形上下文实现
 */
import { IGraphicsCapabilities, IGraphicsContext, IGraphicsContextFactory, IImageData, IPoint, ITransform } from '../graphics/IGraphicsContext';
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
    
    // 保存WebGL状态
    this.transformStack.push(this.currentTransform.clone());
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
      
      // 恢复WebGL线宽状态
      this.gl.lineWidth(this.lineWidth);
    }
    
    // 恢复变换栈
    const transform = this.transformStack.pop();
    if (transform) {
      this.currentTransform = transform;
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
    this.textAlign = align;
  }

  setTextBaseline(baseline: 'top' | 'middle' | 'bottom' | 'alphabetic' | 'hanging'): void {
    this.textBaseline = baseline;
  }

  setFont(font: string): void {
    this.currentFont = font;
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

  // 状态管理
  getState(): any {
    return {
      transform: this.currentTransform.clone(),
      fillStyle: this.fillStyle,
      strokeStyle: this.strokeStyle,
      lineWidth: this.lineWidth,
      globalAlpha: this.globalAlpha
    };
  }

  setState(state: any): void {
    if (state.transform) this.currentTransform = state.transform.clone();
    if (state.fillStyle) this.fillStyle = state.fillStyle;
    if (state.strokeStyle) this.strokeStyle = state.strokeStyle;
    if (state.lineWidth) this.setLineWidth(state.lineWidth);
    if (state.globalAlpha) this.setGlobalAlpha(state.globalAlpha);
  }

  setTransform(transform: ITransform): void {
    // 将ITransform转换为Matrix3
    this.currentTransform = new Matrix3([
      transform.a, transform.b, 0,
      transform.c, transform.d, 0,
      transform.e, transform.f, 1
    ]);
  }

  transform(a: number, b: number, c: number, d: number, e: number, f: number): void {
    const matrix = new Matrix3([
      a, b, 0,
      c, d, 0,
      e, f, 1
    ]);
    this.currentTransform.multiply(matrix);
  }

  resetTransform(): void {
    this.currentTransform = Matrix3.identity();
  }

  setStyle(style: any): void {
    if (style.fillStyle) this.fillStyle = style.fillStyle;
    if (style.strokeStyle) this.strokeStyle = style.strokeStyle;
    if (style.lineWidth) this.setLineWidth(style.lineWidth);
    if (style.globalAlpha) this.setGlobalAlpha(style.globalAlpha);
  }

  setFillColor(color: string): void {
    this.fillStyle = color;
  }

  setStrokeColor(color: string): void {
    this.strokeStyle = color;
  }

  clearRect(x: number, y: number, width: number, height: number): void {
    // WebGL中清除矩形区域需要使用剪切
    this.gl.enable(this.gl.SCISSOR_TEST);
    this.gl.scissor(x, this.height - y - height, width, height);
    this.gl.clearColor(0, 0, 0, 0);
    this.gl.clear(this.gl.COLOR_BUFFER_BIT);
    this.gl.disable(this.gl.SCISSOR_TEST);
  }

  present(): void {
    // WebGL需要显式提交渲染
  }

  // 路径相关状态
  private currentPath: { x: number; y: number }[] = [];
  private pathStarted: boolean = false;

  beginPath(): void {
    this.currentPath = [];
    this.pathStarted = true;
  }

  closePath(): void {
    if (this.currentPath.length > 0) {
      const firstPoint = this.currentPath[0];
      this.currentPath.push({ x: firstPoint.x, y: firstPoint.y });
    }
  }

  moveTo(x: number, y: number): void {
    this.currentPath = [{ x, y }];
    this.pathStarted = true;
  }

  lineTo(x: number, y: number): void {
    if (this.pathStarted) {
      this.currentPath.push({ x, y });
    }
  }

  quadraticCurveTo(cpx: number, cpy: number, x: number, y: number): void {
    if (this.pathStarted && this.currentPath.length > 0) {
      const lastPoint = this.currentPath[this.currentPath.length - 1];
      // 用多段直线近似二次贝塞尔曲线
      const segments = 20;
      for (let i = 1; i <= segments; i++) {
        const t = i / segments;
        const it = 1 - t;
        const newX = it * it * lastPoint.x + 2 * it * t * cpx + t * t * x;
        const newY = it * it * lastPoint.y + 2 * it * t * cpy + t * t * y;
        this.currentPath.push({ x: newX, y: newY });
      }
    }
  }

  bezierCurveTo(cp1x: number, cp1y: number, cp2x: number, cp2y: number, x: number, y: number): void {
    if (this.pathStarted && this.currentPath.length > 0) {
      const lastPoint = this.currentPath[this.currentPath.length - 1];
      // 用多段直线近似三次贝塞尔曲线
      const segments = 30;
      for (let i = 1; i <= segments; i++) {
        const t = i / segments;
        const it = 1 - t;
        const newX = it * it * it * lastPoint.x + 3 * it * it * t * cp1x + 3 * it * t * t * cp2x + t * t * t * x;
        const newY = it * it * it * lastPoint.y + 3 * it * it * t * cp1y + 3 * it * t * t * cp2y + t * t * t * y;
        this.currentPath.push({ x: newX, y: newY });
      }
    }
  }

  arc(x: number, y: number, radius: number, startAngle: number, endAngle: number, counterclockwise?: boolean): void {
    const segments = Math.max(16, Math.ceil(Math.abs(endAngle - startAngle) * 32 / (2 * Math.PI)));
    const angleStep = (endAngle - startAngle) / segments * (counterclockwise ? -1 : 1);
    
    for (let i = 0; i <= segments; i++) {
      const angle = startAngle + angleStep * i;
      const pointX = x + Math.cos(angle) * radius;
      const pointY = y + Math.sin(angle) * radius;
      
      if (i === 0 && !this.pathStarted) {
        this.moveTo(pointX, pointY);
      } else {
        this.lineTo(pointX, pointY);
      }
    }
  }

  rect(x: number, y: number, width: number, height: number): void {
    this.moveTo(x, y);
    this.lineTo(x + width, y);
    this.lineTo(x + width, y + height);
    this.lineTo(x, y + height);
    this.closePath();
  }

  fill(): void {
    if (this.currentPath.length >= 3) {
      this.renderManager.drawPolygon(this.currentPath, this.fillStyle);
      this.flushRender();
    }
  }

  stroke(): void {
    if (this.currentPath.length >= 2) {
      for (let i = 0; i < this.currentPath.length - 1; i++) {
        const p1 = this.currentPath[i];
        const p2 = this.currentPath[i + 1];
        this.renderManager.drawLine(p1.x, p1.y, p2.x, p2.y, this.strokeStyle, this.lineWidth);
      }
      this.flushRender();
    }
  }

  fillRect(x: number, y: number, width: number, height: number): void {
    this.renderManager.drawRectangle(x, y, width, height, this.fillStyle);
    this.flushRender();
  }

  strokeRect(x: number, y: number, width: number, height: number): void {
    this.renderManager.drawRectangle(x, y, width, height, undefined, this.strokeStyle, this.lineWidth);
    this.flushRender();
  }

  fillCircle(x: number, y: number, radius: number): void {
    this.renderManager.drawCircle(x, y, radius, this.fillStyle);
    this.flushRender();
  }

  strokeCircle(x: number, y: number, radius: number): void {
    this.renderManager.drawCircle(x, y, radius, undefined, this.strokeStyle, this.lineWidth);
    this.flushRender();
  }

  // 文本渲染状态
  private currentFont: string = '16px Arial';
  private textAlign: string = 'left';
  private textBaseline: string = 'alphabetic';

  fillText(text: string, x: number, y: number, style?: any): void {
    // WebGL文本渲染需要纹理，这里使用简化实现
    // 实际项目中可以使用文本纹理或SDF字体
    console.warn('WebGL text rendering not fully implemented, use Canvas2D for text');
    this.renderManager.drawText(text, x, y, this.fillStyle, this.currentFont);
  }

  strokeText(text: string, x: number, y: number, style?: any): void {
    console.warn('WebGL text rendering not fully implemented, use Canvas2D for text');
    this.renderManager.drawText(text, x, y, this.strokeStyle, this.currentFont, true);
  }

  measureText(text: string, style?: any): { width: number; height: number } {
    // 简单的文本测量实现
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.font = style?.font || this.currentFont;
      const metrics = ctx.measureText(text);
      return { 
        width: metrics.width, 
        height: parseInt(this.currentFont) || 16 // 简化的高度估算
      };
    }
    return { width: text.length * 8, height: 16 }; // 简化估算
  }

  getImageData(x: number, y: number, width: number, height: number): ImageData {
    const pixels = new Uint8ClampedArray(width * height * 4);
    // WebGL读取像素数据
    this.gl.readPixels(x, this.height - y - height, width, height, this.gl.RGBA, this.gl.UNSIGNED_BYTE, pixels);
    
    // 翻转Y轴（WebGL和Canvas的Y轴方向相反）
    const flippedPixels = new Uint8ClampedArray(pixels.length);
    for (let row = 0; row < height; row++) {
      const srcRow = height - 1 - row;
      for (let col = 0; col < width; col++) {
        const srcIndex = (srcRow * width + col) * 4;
        const dstIndex = (row * width + col) * 4;
        flippedPixels[dstIndex] = pixels[srcIndex];
        flippedPixels[dstIndex + 1] = pixels[srcIndex + 1];
        flippedPixels[dstIndex + 2] = pixels[srcIndex + 2];
        flippedPixels[dstIndex + 3] = pixels[srcIndex + 3];
      }
    }
    
    return new ImageData(flippedPixels, width, height);
  }

  putImageData(imageData: ImageData, x: number, y: number): void {
    // WebGL中放置图像数据需要创建纹理
    const texture = this.gl.createTexture();
    this.gl.bindTexture(this.gl.TEXTURE_2D, texture);
    this.gl.texImage2D(
      this.gl.TEXTURE_2D,
      0,
      this.gl.RGBA,
      imageData.width,
      imageData.height,
      0,
      this.gl.RGBA,
      this.gl.UNSIGNED_BYTE,
      imageData.data
    );
    
    // 设置纹理参数
    this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MIN_FILTER, this.gl.NEAREST);
    this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MAG_FILTER, this.gl.NEAREST);
    
    // 渲染纹理到指定位置
    this.renderManager.drawTexture(texture, x, y, imageData.width, imageData.height);
    
    // 清理纹理
    this.gl.deleteTexture(texture);
  }

  // 裁剪状态
  private clipRegions: { x: number; y: number; width: number; height: number }[] = [];

  clip(): void {
    // 使用当前路径作为裁剪区域
    if (this.currentPath.length >= 3) {
      // 简化实现：计算路径的边界框作为裁剪区域
      let minX = this.currentPath[0].x;
      let minY = this.currentPath[0].y;
      let maxX = minX;
      let maxY = minY;
      
      for (const point of this.currentPath) {
        minX = Math.min(minX, point.x);
        minY = Math.min(minY, point.y);
        maxX = Math.max(maxX, point.x);
        maxY = Math.max(maxY, point.y);
      }
      
      this.clipRect(minX, minY, maxX - minX, maxY - minY);
    }
  }

  clipRect(x: number, y: number, width: number, height: number): void {
    // 保存当前裁剪区域
    this.clipRegions.push({ x, y, width, height });
    
    // 启用剪切测试
    this.gl.enable(this.gl.SCISSOR_TEST);
    
    // 计算与现有裁剪区域的交集
    const currentClip = this.getCurrentClipRect();
    this.gl.scissor(currentClip.x, this.height - currentClip.y - currentClip.height, currentClip.width, currentClip.height);
  }
  
  private getCurrentClipRect(): { x: number; y: number; width: number; height: number } {
    if (this.clipRegions.length === 0) {
      return { x: 0, y: 0, width: this.width, height: this.height };
    }
    
    // 计算所有裁剪区域的交集
    let result = this.clipRegions[0];
    for (let i = 1; i < this.clipRegions.length; i++) {
      const clip = this.clipRegions[i];
      const x1 = Math.max(result.x, clip.x);
      const y1 = Math.max(result.y, clip.y);
      const x2 = Math.min(result.x + result.width, clip.x + clip.width);
      const y2 = Math.min(result.y + result.height, clip.y + clip.height);
      
      result = {
        x: x1,
        y: y1,
        width: Math.max(0, x2 - x1),
        height: Math.max(0, y2 - y1)
      };
    }
    
    return result;
  }

  dispose(): void {
    this.renderManager.dispose();
  }
}
