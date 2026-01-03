/**
 * WebGPU 上下文实现
 * 使用模块化的渲染器、缓冲区管理器和管线管理器
 */

import {
  IColor,
  IGraphicsCapabilities,
  IGraphicsContext,
  IGraphicsState,
  IGraphicsStyle,
  IImageData,
  IPoint,
  ITextStyle,
  ITransform
} from '../../graphics/IGraphicsContext';
import { Rectangle } from '../../math/Rectangle';
import { WebGPURenderer } from './WebGPURenderer';
import {
  WebGPUContextConfig,
  WebGPUDeviceInfo,
  WebGPURenderState,
  DEFAULT_WEBGPU_CONFIG,
  getGPU
} from './WebGPUTypes';
import { Color } from './WebGPUGeometry';

/**
 * WebGPU 上下文类
 */
export class WebGPUContext implements IGraphicsContext {
  private canvas: HTMLCanvasElement;
  private config: Required<WebGPUContextConfig>;
  private deviceInfo: WebGPUDeviceInfo;
  private renderState: WebGPURenderState;
  private isInitialized = false;
  private stateStack: IGraphicsState[] = [];
  private currentState: IGraphicsState;

  // WebGPU 资源
  private adapter: GPUAdapter | null = null;
  private device: GPUDevice | null = null;
  private gpuContext: GPUCanvasContext | null = null;
  private format: GPUTextureFormat = 'bgra8unorm';
  private renderer: WebGPURenderer | null = null;

  readonly width: number;
  readonly height: number;
  readonly devicePixelRatio: number = window.devicePixelRatio || 1;

  constructor(canvas: HTMLCanvasElement, config: WebGPUContextConfig = {}) {
    this.width = canvas.width;
    this.height = canvas.height;
    this.canvas = canvas;
    this.config = { ...DEFAULT_WEBGPU_CONFIG, ...config };

    this.deviceInfo = {
      name: 'WebGPU Device',
      vendor: 'Unknown',
      architecture: 'Unknown',
      maxTextureSize: 8192,
      maxBufferSize: 268435456
    };

    this.renderState = {
      viewport: new Rectangle(0, 0, canvas.width, canvas.height),
      scissorTest: false,
      blendMode: 'normal',
      depthTest: false,
      cullFace: false
    };

    this.currentState = {
      transform: { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 },
      style: {
        fillColor: { r: 0, g: 0, b: 0, a: 1 },
        strokeColor: { r: 0, g: 0, b: 0, a: 1 },
        lineWidth: 1,
        opacity: 1
      }
    };
  }

  /**
   * 初始化 WebGPU 上下文
   */
  async initialize(): Promise<boolean> {
    try {
      const gpu = getGPU();
      if (!gpu) {
        console.warn('WebGPU not supported');
        return false;
      }

      this.adapter = await gpu.requestAdapter({
        powerPreference: this.config.powerPreference,
        forceFallbackAdapter: this.config.forceFallbackAdapter
      });

      if (!this.adapter) {
        console.warn('No WebGPU adapter found');
        return false;
      }

      this.device = await this.adapter.requestDevice();
      this.gpuContext = this.canvas.getContext('webgpu');

      if (!this.gpuContext) {
        console.warn('Failed to get WebGPU canvas context');
        return false;
      }

      this.format = gpu.getPreferredCanvasFormat();
      this.gpuContext.configure({
        device: this.device,
        format: this.format,
        alphaMode: this.config.premultipliedAlpha ? 'premultiplied' : 'opaque'
      });

      // 创建渲染器
      this.renderer = new WebGPURenderer({
        device: this.device,
        context: this.gpuContext,
        format: this.format,
        width: this.width,
        height: this.height
      });

      this.isInitialized = true;
      console.log('WebGPU context initialized successfully');
      return true;
    } catch (error) {
      console.error('Failed to initialize WebGPU context:', error);
      return false;
    }
  }

  isContextInitialized(): boolean {
    return this.isInitialized;
  }

  getCanvas(): HTMLCanvasElement {
    return this.canvas;
  }

  getDeviceInfo(): WebGPUDeviceInfo {
    return { ...this.deviceInfo };
  }

  // 状态管理
  save(): void {
    this.stateStack.push(JSON.parse(JSON.stringify(this.currentState)));
  }

  restore(): void {
    if (this.stateStack.length > 0) {
      this.currentState = this.stateStack.pop()!;
    }
  }

  getState(): IGraphicsState {
    return JSON.parse(JSON.stringify(this.currentState));
  }

  setState(state: Partial<IGraphicsState>): void {
    this.currentState = { ...this.currentState, ...state };
  }

  // 变换方法
  setTransform(transform: ITransform): void {
    this.currentState.transform = { ...transform };
    this.renderer?.updateTransform(transform);
  }

  transform(a: number, b: number, c: number, d: number, e: number, f: number): void {
    const t = this.currentState.transform;
    this.currentState.transform = {
      a: t.a * a + t.c * b,
      b: t.b * a + t.d * b,
      c: t.a * c + t.c * d,
      d: t.b * c + t.d * d,
      e: t.a * e + t.c * f + t.e,
      f: t.b * e + t.d * f + t.f
    };
    this.renderer?.updateTransform(this.currentState.transform);
  }

  translate(x: number, y: number): void {
    this.transform(1, 0, 0, 1, x, y);
  }

  rotate(angle: number): void {
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    this.transform(cos, sin, -sin, cos, 0, 0);
  }

  scale(x: number, y: number): void {
    this.transform(x, 0, 0, y, 0, 0);
  }

  resetTransform(): void {
    this.currentState.transform = { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 };
    this.renderer?.updateTransform(this.currentState.transform);
  }

  // 样式方法
  setStyle(style: Partial<IGraphicsStyle>): void {
    this.currentState.style = { ...this.currentState.style, ...style };
  }

  setFillColor(color: IColor | string): void {
    this.currentState.style.fillColor = color;
  }

  setStrokeColor(color: IColor | string): void {
    this.currentState.style.strokeColor = color;
  }

  setLineWidth(width: number): void {
    this.currentState.style.lineWidth = width;
  }

  setOpacity(opacity: number): void {
    this.currentState.style.opacity = opacity;
  }

  setFillStyle(color: IColor | string): void {
    this.setFillColor(color);
  }

  setStrokeStyle(color: IColor | string): void {
    this.setStrokeColor(color);
  }

  setGlobalAlpha(alpha: number): void {
    this.setOpacity(alpha);
  }

  /**
   * 静态创建方法
   */
  static async create(canvas: HTMLCanvasElement, config?: WebGPUContextConfig): Promise<WebGPUContext | null> {
    try {
      const context = new WebGPUContext(canvas, config);
      const success = await context.initialize();
      return success ? context : null;
    } catch (error) {
      console.error('Failed to create WebGPU context:', error);
      return null;
    }
  }

  getDevice(): GPUDevice | null {
    return this.device;
  }

  getGPUContext(): GPUCanvasContext | null {
    return this.gpuContext;
  }

  getFormat(): GPUTextureFormat {
    return this.format;
  }

  getRenderer(): WebGPURenderer | null {
    return this.renderer;
  }

  dispose(): void {
    this.renderer?.dispose();
    this.renderer = null;
    this.device = null;
    this.adapter = null;
    this.gpuContext = null;
    this.isInitialized = false;
  }
}
