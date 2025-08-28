/**
 * WebGL图形上下文实现
 */
export interface IWebGLContext extends IGraphicsContext {
  readonly gl: WebGLRenderingContext;
  
  // WebGL特有方法
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
    if (!gl) {
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

  constructor(gl: WebGLRenderingContext, canvas: HTMLCanvasElement) {
    this.gl = gl;
    this.width = canvas.width;
    this.height = canvas.height;
    
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
    // WebGL没有状态栈，需要手动实现
    // 这里简化实现，实际应该保存变换矩阵等状态
  }

  restore(): void {
    // WebGL状态恢复
  }

  translate(x: number, y: number): void {
    // 在WebGL中，平移通过变换矩阵实现
    // 这里需要与着色器配合
  }

  rotate(angle: number): void {
    // 旋转变换
  }

  scale(scaleX: number, scaleY: number): void {
    // 缩放变换
  }

  setOpacity(opacity: number): void {
    // 设置全局透明度
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

  dispose(): void {
    // WebGL上下文清理
  }
}