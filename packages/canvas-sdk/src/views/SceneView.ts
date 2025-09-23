/**
 * 场景视图
 * 负责渲染整个画布场景（背景、网格等）
 */

import { ISceneViewModel, IViewportState, IViewportViewModel } from '../viewmodels/types/IViewModel';

export interface ISceneViewConfig {
  backgroundColor?: string;
  showGrid?: boolean;
  gridColor?: string;
  gridSize?: number;
  showRulers?: boolean;
  rulerColor?: string;
}

export class SceneView {
  private config: ISceneViewConfig = {};
  private canvas!: HTMLCanvasElement;
  private ctx!: CanvasRenderingContext2D;

  constructor(
    private sceneViewModel: ISceneViewModel,
    private viewportViewModel: IViewportViewModel
  ) {}

  /**
   * 初始化场景视图
   */
  initialize(canvas: HTMLCanvasElement, config: ISceneViewConfig = {}): void {
    this.canvas = canvas;
    this.config = {
      backgroundColor: '#FFFFFF',
      showGrid: true,
      gridColor: '#E0E0E0',
      gridSize: 20,
      showRulers: false,
      rulerColor: '#CCCCCC',
      ...config
    };

    const context = canvas.getContext('2d');
    if (!context) {
      throw new Error('无法获取 2D 渲染上下文');
    }
    this.ctx = context;
  }

  /**
   * 渲染场景背景和网格
   */
  render(viewport: IViewportState): void {
    if (!this.ctx) return;

    // 清空画布
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    // 渲染背景
    this.renderBackground();

    // 渲染网格
    if (this.config.showGrid) {
      this.renderGrid(viewport);
    }

    // 渲染标尺
    if (this.config.showRulers) {
      this.renderRulers(viewport);
    }
  }

  /**
   * 渲染背景
   */
  private renderBackground(): void {
    if (this.config.backgroundColor) {
      this.ctx.fillStyle = this.config.backgroundColor;
      this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    }
  }

  /**
   * 渲染网格
   */
  private renderGrid(viewport: IViewportState): void {
    if (!this.config.gridSize) return;

    const { x, y, zoom } = viewport;
    const gridSize = this.config.gridSize * zoom;

    // 计算网格起始位置
    const startX = (-x % gridSize + gridSize) % gridSize;
    const startY = (-y % gridSize + gridSize) % gridSize;

    this.ctx.save();
    this.ctx.strokeStyle = this.config.gridColor || '#E0E0E0';
    this.ctx.lineWidth = 1;
    this.ctx.globalAlpha = Math.min(1, zoom * 0.5); // 缩放时调整透明度

    // 绘制垂直线
    for (let i = startX; i < this.canvas.width; i += gridSize) {
      this.ctx.beginPath();
      this.ctx.moveTo(i, 0);
      this.ctx.lineTo(i, this.canvas.height);
      this.ctx.stroke();
    }

    // 绘制水平线
    for (let i = startY; i < this.canvas.height; i += gridSize) {
      this.ctx.beginPath();
      this.ctx.moveTo(0, i);
      this.ctx.lineTo(this.canvas.width, i);
      this.ctx.stroke();
    }

    this.ctx.restore();
  }

  /**
   * 渲染标尺
   */
  private renderRulers(viewport: IViewportState): void {
    const rulerSize = 30;
    const { x, y, zoom } = viewport;

    this.ctx.save();
    this.ctx.fillStyle = this.config.rulerColor || '#CCCCCC';
    this.ctx.strokeStyle = '#999999';
    this.ctx.lineWidth = 1;
    this.ctx.font = '10px Arial';
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';

    // 水平标尺
    this.ctx.fillRect(0, 0, this.canvas.width, rulerSize);
    this.ctx.strokeRect(0, 0, this.canvas.width, rulerSize);

    // 垂直标尺
    this.ctx.fillRect(0, 0, rulerSize, this.canvas.height);
    this.ctx.strokeRect(0, 0, rulerSize, this.canvas.height);

    // 标尺刻度
    this.renderRulerMarks(viewport, rulerSize);

    this.ctx.restore();
  }

  /**
   * 渲染标尺刻度
   */
  private renderRulerMarks(viewport: IViewportState, rulerSize: number): void {
    const { x, y, zoom } = viewport;
    const step = this.getRulerStep(zoom);
    const stepPixels = step * zoom;

    // 水平标尺刻度
    const startX = Math.floor(-x / stepPixels) * stepPixels;
    for (let i = startX; i < this.canvas.width; i += stepPixels) {
      const worldX = (i - viewport.x) / zoom;
      
      this.ctx.beginPath();
      this.ctx.moveTo(i, rulerSize - 5);
      this.ctx.lineTo(i, rulerSize);
      this.ctx.stroke();
      
      this.ctx.fillStyle = '#333333';
      this.ctx.fillText(Math.round(worldX).toString(), i, rulerSize / 2);
    }

    // 垂直标尺刻度
    const startY = Math.floor(-y / stepPixels) * stepPixels;
    for (let i = startY; i < this.canvas.height; i += stepPixels) {
      const worldY = (i - viewport.y) / zoom;
      
      this.ctx.beginPath();
      this.ctx.moveTo(rulerSize - 5, i);
      this.ctx.lineTo(rulerSize, i);
      this.ctx.stroke();
      
      this.ctx.save();
      this.ctx.translate(rulerSize / 2, i);
      this.ctx.rotate(-Math.PI / 2);
      this.ctx.fillStyle = '#333333';
      this.ctx.fillText(Math.round(worldY).toString(), 0, 0);
      this.ctx.restore();
    }
  }

  /**
   * 根据缩放级别计算标尺步长
   */
  private getRulerStep(zoom: number): number {
    const baseStep = 100;
    if (zoom < 0.1) return baseStep * 10;
    if (zoom < 0.5) return baseStep * 5;
    if (zoom < 1) return baseStep * 2;
    if (zoom < 2) return baseStep;
    if (zoom < 5) return baseStep / 2;
    return baseStep / 5;
  }

  /**
   * 更新配置
   */
  updateConfig(config: Partial<ISceneViewConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * 获取配置
   */
  getConfig(): ISceneViewConfig {
    return { ...this.config };
  }

  /**
   * 销毁视图
   */
  dispose(): void {
    // 清理资源
  }
}