/**
 * 画布渲染服务实现
 */

import { Injectable, Inject } from '../di';
import { 
  ICanvasRenderingService, 
  IEventBusService, 
  ILogService
} from '../di';

/**
 * 画布渲染服务实现
 */
@Injectable
export class CanvasRenderingService implements ICanvasRenderingService {
  private canvas: HTMLCanvasElement | null = null;
  private context: CanvasRenderingContext2D | null = null;
  private isInitialized = false;
  private renderLoop: number | null = null;
  private fps = 60;
  private lastFrameTime = 0;
  private eventBus: IEventBusService;
  private logger: ILogService;
  
  constructor(
    eventBus: IEventBusService,
    logger: ILogService
  ) {
    this.eventBus = eventBus;
    this.logger = logger;
  }

  /**
   * 初始化渲染服务
   */
  async initialize(canvas: HTMLCanvasElement, config?: any): Promise<void> {
    if (this.isInitialized) {
      throw new Error('Rendering service already initialized');
    }

    this.canvas = canvas;
    this.context = canvas.getContext('2d');
    
    if (!this.context) {
      throw new Error('Failed to get 2D rendering context');
    }

    // 设置画布属性
    this.setupCanvas();
    
    // 开始渲染循环
    this.startRenderLoop();
    
    this.isInitialized = true;
    this.logger.info('Canvas rendering service initialized');
    this.eventBus.emit('rendering:initialized', { canvas, config });
  }

  /**
   * 设置画布属性
   */
  private setupCanvas(): void {
    if (!this.canvas || !this.context) return;

    // 设置高DPI显示支持
    const dpr = window.devicePixelRatio || 1;
    const rect = this.canvas.getBoundingClientRect();
    
    this.canvas.width = rect.width * dpr;
    this.canvas.height = rect.height * dpr;
    
    this.context.scale(dpr, dpr);
    this.canvas.style.width = rect.width + 'px';
    this.canvas.style.height = rect.height + 'px';

    // 设置默认样式
    this.context.lineCap = 'round';
    this.context.lineJoin = 'round';
    this.context.imageSmoothingEnabled = true;
  }

  /**
   * 开始渲染循环
   */
  private startRenderLoop(): void {
    const frameInterval = 1000 / this.fps;
    
    const render = (currentTime: number) => {
      if (currentTime - this.lastFrameTime >= frameInterval) {
        this.render();
        this.lastFrameTime = currentTime;
      }
      
      this.renderLoop = requestAnimationFrame(render);
    };
    
    this.renderLoop = requestAnimationFrame(render);
    this.logger.debug('Render loop started');
  }

  /**
   * 停止渲染循环
   */
  private stopRenderLoop(): void {
    if (this.renderLoop) {
      cancelAnimationFrame(this.renderLoop);
      this.renderLoop = null;
      this.logger.debug('Render loop stopped');
    }
  }

  /**
   * 渲染一帧
   */
  render(): void {
    if (!this.context || !this.canvas) return;

    // 清空画布
    this.clear();
    
    // 触发渲染事件，让其他服务绘制内容
    this.eventBus.emit('rendering:frame', { 
      context: this.context, 
      canvas: this.canvas 
    });
  }

  /**
   * 清空画布
   */
  clear(color?: string): void {
    if (!this.context || !this.canvas) return;

    if (color) {
      this.context.fillStyle = color;
      this.context.fillRect(0, 0, this.canvas.width, this.canvas.height);
    } else {
      this.context.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }
  }

  /**
   * 设置渲染上下文状态
   */
  setStrokeStyle(style: string): void {
    if (this.context) {
      this.context.strokeStyle = style;
    }
  }

  setFillStyle(style: string): void {
    if (this.context) {
      this.context.fillStyle = style;
    }
  }

  setLineWidth(width: number): void {
    if (this.context) {
      this.context.lineWidth = width;
    }
  }

  /**
   * 绘制基本形状
   */
  drawRect(x: number, y: number, width: number, height: number, filled: boolean = false): void {
    if (!this.context) return;

    if (filled) {
      this.context.fillRect(x, y, width, height);
    } else {
      this.context.strokeRect(x, y, width, height);
    }
  }

  drawCircle(x: number, y: number, radius: number, filled: boolean = false): void {
    if (!this.context) return;

    this.context.beginPath();
    this.context.arc(x, y, radius, 0, 2 * Math.PI);
    
    if (filled) {
      this.context.fill();
    } else {
      this.context.stroke();
    }
  }

  drawLine(x1: number, y1: number, x2: number, y2: number): void {
    if (!this.context) return;

    this.context.beginPath();
    this.context.moveTo(x1, y1);
    this.context.lineTo(x2, y2);
    this.context.stroke();
  }

  /**
   * 保存和恢复绘图状态
   */
  save(): void {
    if (this.context) {
      this.context.save();
    }
  }

  restore(): void {
    if (this.context) {
      this.context.restore();
    }
  }

  /**
   * 变换操作
   */
  translate(x: number, y: number): void {
    if (this.context) {
      this.context.translate(x, y);
    }
  }

  rotate(angle: number): void {
    if (this.context) {
      this.context.rotate(angle);
    }
  }

  scale(x: number, y: number): void {
    if (this.context) {
      this.context.scale(x, y);
    }
  }

  /**
   * 获取画布信息
   */
  getCanvas(): HTMLCanvasElement | null {
    return this.canvas;
  }

  getContext(): CanvasRenderingContext2D | null {
    return this.context;
  }

  getSize(): { width: number; height: number } {
    if (!this.canvas) {
      return { width: 0, height: 0 };
    }
    return {
      width: this.canvas.width,
      height: this.canvas.height
    };
  }

  /**
   * 设置FPS
   */
  setFPS(fps: number): void {
    this.fps = Math.max(1, Math.min(120, fps));
    this.logger.debug(`FPS set to ${this.fps}`);
  }

  /**
   * 获取当前FPS
   */
  getFPS(): number {
    return this.fps;
  }

  /**
   * 截图功能
   */
  toDataURL(type: string = 'image/png', quality?: number): string {
    if (!this.canvas) {
      throw new Error('Canvas not available');
    }
    return this.canvas.toDataURL(type, quality);
  }

  /**
   * 启动渲染服务
   */
  start(): void {
    this.startRenderLoop();
    this.eventBus.emit('render:started', {});
  }

  /**
   * 停止渲染服务
   */
  stop(): void {
    this.stopRenderLoop();
    this.eventBus.emit('render:stopped', {});
  }

  /**
   * 获取渲染引擎
   */
  getRenderEngine(): any {
    return {
      type: 'canvas2d',
      context: this.context,
      canvas: this.canvas
    };
  }

  /**
   * 检查是否正在运行
   */
  isRunning(): boolean {
    return this.renderLoop !== null;
  }

  /**
   * 获取渲染统计信息
   */
  getStats(): any {
    return {
      fps: this.fps,
      lastFrameTime: this.lastFrameTime,
      isRunning: this.isRunning(),
      canvasSize: this.getSize()
    };
  }

  /**
   * 销毁渲染服务
   */
  dispose(): void {
    this.stopRenderLoop();
    
    this.canvas = null;
    this.context = null;
    this.isInitialized = false;
    
    this.logger.info('Canvas rendering service disposed');
    this.eventBus.emit('rendering:disposed', {});
  }
}
