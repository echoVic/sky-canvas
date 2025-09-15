/**
 * WebGL图形上下文实现
 */
import {
  BatchManager,
  createBatchManagerWithDefaultStrategies,
  IRenderable,
  type BatchManagerConfig
} from '../batch';
import { IGraphicsCapabilities, IGraphicsContext, IGraphicsContextFactory, IImageData, IPoint, ITransform } from '../graphics/IGraphicsContext';
import { Matrix3 } from '../math/Matrix3';
import { BufferManager, IBuffer } from '../webgl/BufferManager';
import { SHADER_LIBRARY } from '../webgl/ShaderLibrary';
import { IShaderProgram, ShaderManager } from '../webgl/ShaderManager';
import { AdvancedShaderManager } from '../webgl/AdvancedShaderManager';
import { WebGLOptimizer } from '../webgl/WebGLOptimizer';
import { GeometryGenerator } from './GeometryGenerator';

/**
 * WebGL上下文高级功能配置
 */
export interface WebGLAdvancedConfig {
  /** 启用高级着色器管理 */
  enableAdvancedShaders?: boolean;
  /** 启用WebGL优化器 */
  enableOptimizer?: boolean;
  /** 高级着色器管理器配置 */
  advancedShaderConfig?: {
    enableHotReload?: boolean;
    precompileCommonVariants?: boolean;
    enableAsyncCompilation?: boolean;
  };
  /** WebGL优化器配置 */
  optimizerConfig?: {
    enableStateTracking?: boolean;
    enableBatchOptimization?: boolean;
    enableShaderWarmup?: boolean;
    enableBufferPooling?: boolean;
  };
}

export interface IWebGLContext extends IGraphicsContext {
  readonly gl: WebGLRenderingContext;

  // WebGL特有的基础方法
  clear(color?: string): void;
  setBlendMode(mode: string): void;
  drawElements(count: number, offset: number): void;
  drawArrays(mode: number, first: number, count: number): void;
  createBuffer(): WebGLBuffer | null;
  bindBuffer(target: number, buffer: WebGLBuffer | null): void;
  bufferData(target: number, data: BufferSource | null, usage: number): void;
  useProgram(program: WebGLProgram | null): void;
  bindTexture(target: number, texture: WebGLTexture | null): void;

  // 高级功能访问接口
  getAdvancedShaderManager?(): AdvancedShaderManager | undefined;
  getWebGLOptimizer?(): WebGLOptimizer | undefined;
}


/**
 * WebGL上下文实现
 */
export class WebGLContext implements IWebGLContext {
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


  // 批处理和着色器管理
  private shaderManager: ShaderManager;
  private bufferManager: BufferManager;
  private batchManager: BatchManager;

  // 高级功能（可选）
  private advancedShaderManager?: AdvancedShaderManager;
  private webglOptimizer?: WebGLOptimizer;

  // 常用缓冲区
  private vertexBuffer: IBuffer | null = null;
  private indexBuffer: IBuffer | null = null;
  private currentShader: IShaderProgram | null = null;

  constructor(
    gl: WebGLRenderingContext,
    canvas: HTMLCanvasElement,
    config?: Partial<BatchManagerConfig>,
    advancedConfig?: WebGLAdvancedConfig
  ) {
    this.gl = gl;
    this.width = canvas.width;
    this.height = canvas.height;

    // 初始化变换矩阵
    this.currentTransform = Matrix3.identity();
    // 创建投影矩阵 - 简化实现
    this.projectionMatrix = Matrix3.identity();

    // 初始化基础管理器
    this.shaderManager = new ShaderManager(this.gl);
    this.bufferManager = new BufferManager(this.gl);
    this.batchManager = createBatchManagerWithDefaultStrategies(this.gl, config);

    // 初始化高级功能（如果启用）
    this.initializeAdvancedFeatures(advancedConfig);

    // 初始化WebGL状态
    this.setupWebGLState();
    this.setup();
  }

  /**
   * 初始化高级功能
   */
  private initializeAdvancedFeatures(advancedConfig?: WebGLAdvancedConfig): void {
    if (!advancedConfig) return;

    // 初始化高级着色器管理器
    if (advancedConfig.enableAdvancedShaders) {
      this.advancedShaderManager = new AdvancedShaderManager(this.gl, advancedConfig.advancedShaderConfig);
    }

    // 初始化WebGL优化器
    if (advancedConfig.enableOptimizer) {
      this.webglOptimizer = new WebGLOptimizer(
        this.gl,
        this.shaderManager,
        this.bufferManager,
        advancedConfig.optimizerConfig
      );
    }
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

  /**
   * 初始化设置
   */
  private setup(): void {
    try {
      // 初始化基础着色器
      for (const [name, shaderSource] of Object.entries(SHADER_LIBRARY)) {
        this.shaderManager.createShader({
          name,
          vertex: shaderSource.vertex,
          fragment: shaderSource.fragment
        });
      }
      console.log('WebGL context setup completed');
    } catch (error) {
      console.error('WebGL setup failed:', error);
    }
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
    // WebGL中的路径填充需要上层渲染器实现
    console.log('Path fill operation - requires higher level renderer');
  }

  stroke(): void {
    // WebGL中的路径描边需要上层渲染器实现
    console.log('Path stroke operation - requires higher level renderer');
  }

  fillRect(x: number, y: number, width: number, height: number): void {
    const color = GeometryGenerator.parseColor(this.fillStyle);
    const renderable = this.createRectangleRenderable(x, y, width, height, color);
    this.batchManager.addRenderable(renderable);
  }

  strokeRect(x: number, y: number, width: number, height: number): void {
    const color = GeometryGenerator.parseColor(this.strokeStyle);
    this.drawRectangleStroke(x, y, width, height, this.strokeStyle, this.lineWidth);
  }

  fillCircle(x: number, y: number, radius: number): void {
    const color = GeometryGenerator.parseColor(this.fillStyle);
    const renderable = this.createCircleRenderable(x, y, radius, 32, color);
    this.batchManager.addRenderable(renderable);
  }

  strokeCircle(x: number, y: number, radius: number): void {
    const strokeColorParsed = GeometryGenerator.parseColor(this.strokeStyle);
    const outerRadius = radius + this.lineWidth / 2;
    const outerRenderable = this.createCircleRenderable(x, y, outerRadius, 32, strokeColorParsed);
    this.batchManager.addRenderable(outerRenderable);
  }

  // 文本渲染状态
  private currentFont: string = '16px Arial';
  private textAlign: string = 'left';
  private textBaseline: string = 'alphabetic';

  fillText(text: string, x: number, y: number, style?: any): void {
    // WebGL文本渲染需要上层渲染器实现
    console.log('Text fill operation - requires higher level renderer with texture system');
  }

  strokeText(text: string, x: number, y: number, style?: any): void {
    // WebGL文本描边需要上层渲染器实现
    console.log('Text stroke operation - requires higher level renderer with texture system');
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
    
    // 渲染纹理到指定位置需要上层渲染器实现
    console.log('Texture rendering operation - requires higher level renderer');
    
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

  // IGraphicsContext要求的高级绘图方法
  drawRect(rect: { x: number; y: number; width: number; height: number }, fill?: boolean, stroke?: boolean): void {
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

  drawLine(x1: number, y1: number, x2: number, y2: number): void {
    const color = GeometryGenerator.parseColor(this.strokeStyle);
    const renderable = this.createLineRenderable(x1, y1, x2, y2, this.lineWidth, color);
    this.batchManager.addRenderable(renderable);
  }


  /**
   * 执行批处理渲染
   */
  present(): void {
    // 创建投影矩阵并执行渲染
    const projectionMatrix = this.createProjectionMatrix();
    const combinedMatrix = projectionMatrix.multiply(this.currentTransform);
    this.batchManager.flush(combinedMatrix);
  }

  /**
   * 创建投影矩阵
   */
  private createProjectionMatrix(): Matrix3 {
    // 创建正交投影矩阵，覆盖整个画布
    const left = 0;
    const right = this.width;
    const bottom = this.height;
    const top = 0;

    const width = right - left;
    const height = bottom - top;

    return new Matrix3([
      2 / width, 0, 0,
      0, -2 / height, 0,
      -(right + left) / width, (bottom + top) / height, 1
    ]);
  }

  /**
   * 创建矩形可渲染对象
   */
  private createRectangleRenderable(
    x: number, y: number, width: number, height: number,
    color: [number, number, number, number]
  ): IRenderable {
    const vertices = new Float32Array([
      // position + color + uv
      x, y, color[0], color[1], color[2], color[3], 0, 0,
      x + width, y, color[0], color[1], color[2], color[3], 1, 0,
      x + width, y + height, color[0], color[1], color[2], color[3], 1, 1,
      x, y + height, color[0], color[1], color[2], color[3], 0, 1
    ]);

    const indices = new Uint16Array([0, 1, 2, 0, 2, 3]);

    return {
      getVertices: () => vertices,
      getIndices: () => indices,
      getShader: () => 'basic_shape',
      getBlendMode: () => 0, // NORMAL
      getZIndex: () => 0
    };
  }

  /**
   * 创建圆形可渲染对象
   */
  private createCircleRenderable(
    centerX: number, centerY: number, radius: number, segments: number,
    color: [number, number, number, number]
  ): IRenderable {
    const vertexCount = segments + 1; // 中心点 + 圆周点
    const vertices = new Float32Array(vertexCount * 8); // position(2) + color(4) + uv(2)
    const indices: number[] = [];

    // 中心点
    vertices[0] = centerX;
    vertices[1] = centerY;
    vertices[2] = color[0];
    vertices[3] = color[1];
    vertices[4] = color[2];
    vertices[5] = color[3];
    vertices[6] = 0.5; // UV中心
    vertices[7] = 0.5;

    // 圆周点
    for (let i = 0; i < segments; i++) {
      const angle = (i / segments) * 2 * Math.PI;
      const x = centerX + Math.cos(angle) * radius;
      const y = centerY + Math.sin(angle) * radius;

      const offset = (i + 1) * 8;
      vertices[offset] = x;
      vertices[offset + 1] = y;
      vertices[offset + 2] = color[0];
      vertices[offset + 3] = color[1];
      vertices[offset + 4] = color[2];
      vertices[offset + 5] = color[3];
      vertices[offset + 6] = 0.5 + Math.cos(angle) * 0.5; // UV
      vertices[offset + 7] = 0.5 + Math.sin(angle) * 0.5;

      // 创建三角形索引
      const next = (i + 1) % segments + 1;
      indices.push(0, i + 1, next);
    }

    return {
      getVertices: () => vertices,
      getIndices: () => new Uint16Array(indices),
      getShader: () => 'basic_shape',
      getBlendMode: () => 0,
      getZIndex: () => 0
    };
  }

  /**
   * 绘制矩形描边
   */
  private drawRectangleStroke(
    x: number, y: number, width: number, height: number,
    strokeColor: string, strokeWidth: number
  ): void {
    const color = GeometryGenerator.parseColor(strokeColor);

    // 绘制四条边线
    const lines = [
      // 上边
      { x1: x, y1: y, x2: x + width, y2: y },
      // 右边
      { x1: x + width, y1: y, x2: x + width, y2: y + height },
      // 下边
      { x1: x + width, y1: y + height, x2: x, y2: y + height },
      // 左边
      { x1: x, y1: y + height, x2: x, y2: y }
    ];

    lines.forEach(line => {
      const renderable = this.createLineRenderable(
        line.x1, line.y1, line.x2, line.y2, strokeWidth, color
      );
      this.batchManager.addRenderable(renderable);
    });
  }

  /**
   * 创建线条可渲染对象
   */
  private createLineRenderable(
    x1: number, y1: number, x2: number, y2: number, width: number,
    color: [number, number, number, number]
  ): IRenderable {
    // 简化的线条实现：创建矩形表示线条
    const dx = x2 - x1;
    const dy = y2 - y1;
    const angle = Math.atan2(dy, dx);

    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    const halfWidth = width / 2;

    // 创建线条的四个顶点（矩形）
    const vertices = new Float32Array([
      x1 - sin * halfWidth, y1 + cos * halfWidth, color[0], color[1], color[2], color[3], 0, 0,
      x2 - sin * halfWidth, y2 + cos * halfWidth, color[0], color[1], color[2], color[3], 1, 0,
      x2 + sin * halfWidth, y2 - cos * halfWidth, color[0], color[1], color[2], color[3], 1, 1,
      x1 + sin * halfWidth, y1 - cos * halfWidth, color[0], color[1], color[2], color[3], 0, 1
    ]);

    const indices = new Uint16Array([0, 1, 2, 0, 2, 3]);

    return {
      getVertices: () => vertices,
      getIndices: () => indices,
      getShader: () => 'basic_shape',
      getBlendMode: () => 0,
      getZIndex: () => 0
    };
  }

  /**
   * 获取高级着色器管理器
   */
  getAdvancedShaderManager(): AdvancedShaderManager | undefined {
    return this.advancedShaderManager;
  }

  /**
   * 获取WebGL优化器
   */
  getWebGLOptimizer(): WebGLOptimizer | undefined {
    return this.webglOptimizer;
  }

  /**
   * 销毁上下文及其资源
   */
  dispose(): void {
    // 销毁高级功能
    if (this.advancedShaderManager) {
      this.advancedShaderManager.dispose();
    }
    if (this.webglOptimizer) {
      this.webglOptimizer.dispose();
    }

    // 销毁基础管理器
    this.batchManager.dispose();
    this.shaderManager.dispose();
    this.bufferManager.dispose();

    // 清理缓冲区
    if (this.vertexBuffer) {
      this.vertexBuffer.dispose(this.gl);
    }
    if (this.indexBuffer) {
      this.indexBuffer.dispose(this.gl);
    }
  }

  /**
   * 检查 WebGL 支持
   */
  static isSupported(): boolean {
    try {
      const canvas = document.createElement('canvas');
      const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
      return gl !== null;
    } catch {
      return false;
    }
  }

  /**
   * 获取 WebGL 能力信息
   */
  static getCapabilities(): IGraphicsCapabilities {
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
