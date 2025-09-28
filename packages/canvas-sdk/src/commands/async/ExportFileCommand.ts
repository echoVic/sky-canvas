/**
* 文件导出异步命令
 * 支持将Canvas内容导出为各种格式
 */

import { AsyncCommand } from '../base';
import { ICanvasModel } from '../../models/CanvasModel';
import { GraphicData } from '../../actions/types';
import { Shape } from '@sky-canvas/render-engine';

/**
 * 文件导出参数
 */
export interface ExportFileParams {
  filename?: string;
  format: 'json' | 'svg' | 'png' | 'jpg';
  quality?: number; // 用于jpg格式
  includeOnlySelected?: boolean; // 仅导出选中的形状
  bounds?: {
    x: number;
    y: number;
    width: number;
    height: number;
  }; // 导出区域
}

/**
 * 文件导出命令
 * 支持多种格式的导出
 */
export class ExportFileCommand extends AsyncCommand {
  private params: ExportFileParams;
  private exportedContent?: string | Blob;

  constructor(model: ICanvasModel, params: ExportFileParams) {
    super(model, `Export to ${params.format.toUpperCase()}`);
    this.params = params;
  }

  async execute(): Promise<void> {
    this.resetProgress();
    this.updateProgress(0, 4); // 4个主要步骤

    try {
      // 第1步：收集要导出的形状
      this.updateProgress(1);
      const shapes = this.collectShapes();
      this.checkAborted();

      // 第2步：生成导出内容
      this.updateProgress(2);
      const content = await this.generateContent(shapes);
      this.checkAborted();

      // 第3步：处理内容格式
      this.updateProgress(3);
      this.exportedContent = await this.processContent(content);
      this.checkAborted();

      // 第4步：下载文件
      this.updateProgress(4);
      await this.downloadFile();

      this.markAsExecuted();
    } catch (error) {
      if (error instanceof Error && error.message === 'Command was aborted') {
        throw error;
      }
      throw new Error(`Export failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async undo(): Promise<void> {
    // 导出操作无法撤销，这里只是标记状态
    this.markAsNotExecuted();
  }

  /**
   * 收集要导出的形状
   */
  private collectShapes(): any[] {
    let shapes = this.model.getShapes();

    if (this.params.includeOnlySelected) {
      const selectedIds = this.model.getSelection();
      shapes = shapes.filter(shape => selectedIds.includes(shape.id!));
    }

    if (this.params.bounds) {
      const bounds = this.params.bounds;
      shapes = shapes.filter(shape =>
        this.isShapeInBounds(shape, bounds)
      );
    }

    return shapes;
  }

  /**
   * 检查形状是否在导出区域内
   */
  private isShapeInBounds(shape: Shape, bounds: { x: number; y: number; width: number; height: number }): boolean {
    const shapeAny = shape as any;
    const width = shapeAny.width || (shapeAny.radius ? shapeAny.radius * 2 : 0);
    const height = shapeAny.height || (shapeAny.radius ? shapeAny.radius * 2 : 0);
    const shapeRight = shape.x + width;
    const shapeBottom = shape.y + height;
    const boundsRight = bounds.x + bounds.width;
    const boundsBottom = bounds.y + bounds.height;

    return !(
      shape.x > boundsRight ||
      shapeRight < bounds.x ||
      shape.y > boundsBottom ||
      shapeBottom < bounds.y
    );
  }

  /**
   * 生成导出内容
   */
  private async generateContent(shapes: Shape[]): Promise<string> {
    switch (this.params.format) {
      case 'json':
        return this.generateJsonContent(shapes);
      case 'svg':
        return this.generateSvgContent(shapes);
      case 'png':
      case 'jpg':
        return this.generateImageContent(shapes);
      default:
        throw new Error(`Unsupported export format: ${this.params.format}`);
    }
  }

  /**
   * 生成JSON内容
   */
  private generateJsonContent(shapes: Shape[]): string {
    const data = {
      version: '1.0',
      timestamp: Date.now(),
      shapes: shapes.map(shape => this.shapeToGraphicData(shape))
    };

    return JSON.stringify(data, null, 2);
  }

  /**
   * 生成SVG内容
   */
  private generateSvgContent(shapes: Shape[]): string {
    // 计算SVG边界
    const bounds = this.calculateBounds(shapes);

    let svgContent = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg"
     width="${bounds.width}"
     height="${bounds.height}"
     viewBox="${bounds.x} ${bounds.y} ${bounds.width} ${bounds.height}">
`;

    // 按z-index排序
    const sortedShapes = [...shapes].sort((a, b) => (a.zIndex || 0) - (b.zIndex || 0));

    for (const shape of sortedShapes) {
      svgContent += this.shapeToSvgElement(shape);
    }

    svgContent += '</svg>';
    return svgContent;
  }

  /**
   * 生成图片内容（需要Canvas API）
   */
  private async generateImageContent(shapes: Shape[]): Promise<string> {
    // 这里需要使用Canvas API来绘制形状
    const bounds = this.calculateBounds(shapes);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d')!;

    canvas.width = bounds.width;
    canvas.height = bounds.height;

    // 设置白色背景
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, bounds.width, bounds.height);

    // 按z-index排序绘制
    const sortedShapes = [...shapes].sort((a, b) => (a.zIndex || 0) - (b.zIndex || 0));

    for (const shape of sortedShapes) {
      await this.drawShapeOnCanvas(ctx, shape, bounds);
    }

    // 转换为Data URL
    const quality = this.params.quality || 0.92;
    const mimeType = this.params.format === 'png' ? 'image/png' : 'image/jpeg';
    return canvas.toDataURL(mimeType, quality);
  }

  /**
   * 计算形状边界
   */
  private calculateBounds(shapes: Shape[]): { x: number; y: number; width: number; height: number } {
    if (shapes.length === 0) {
      return { x: 0, y: 0, width: 800, height: 600 };
    }

    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;

    for (const shape of shapes) {
      const shapeAny = shape as any;
      const left = shape.x;
      const top = shape.y;
      const width = shapeAny.width || (shapeAny.radius ? shapeAny.radius * 2 : 100);
      const height = shapeAny.height || (shapeAny.radius ? shapeAny.radius * 2 : 100);
      const right = shape.x + width;
      const bottom = shape.y + height;

      minX = Math.min(minX, left);
      minY = Math.min(minY, top);
      maxX = Math.max(maxX, right);
      maxY = Math.max(maxY, bottom);
    }

    // 添加一些边距
    const padding = 20;
    return {
      x: minX - padding,
      y: minY - padding,
      width: maxX - minX + padding * 2,
      height: maxY - minY + padding * 2
    };
  }

  /**
   * 将形状转换为GraphicData
   */
  private shapeToGraphicData(shape: Shape): GraphicData {
    const shapeAny = shape as any;
    return {
      id: shape.id,
      type: shape.type as any,
      x: shape.x,
      y: shape.y,
      width: shapeAny.width,
      height: shapeAny.height,
      radius: shapeAny.radius,
      text: shapeAny.text,
      style: shapeAny.style,
      visible: shape.visible,
      locked: shapeAny.locked,
      zIndex: shape.zIndex
    };
  }

  /**
   * 将形状转换为SVG元素
   */
  private shapeToSvgElement(shape: Shape): string {
    const shapeAny = shape as any;
    const style = shapeAny.style || {};
    const fill = style.fill || '#000000';
    const stroke = style.stroke || 'none';
    const strokeWidth = style.strokeWidth || 0;
    const opacity = style.opacity || 1;

    const commonAttrs = `fill="${fill}" stroke="${stroke}" stroke-width="${strokeWidth}" opacity="${opacity}"`;

    switch (shape.type) {
      case 'rectangle':
        return `<rect x="${shape.x}" y="${shape.y}" width="${shapeAny.width}" height="${shapeAny.height}" ${commonAttrs} />\n`;

      case 'circle':
        return `<circle cx="${shape.x}" cy="${shape.y}" r="${shapeAny.radius}" ${commonAttrs} />\n`;

      case 'text':
        const fontSize = style.fontSize || 16;
        return `<text x="${shape.x}" y="${shape.y}" font-size="${fontSize}" ${commonAttrs}>${shapeAny.text || ''}</text>\n`;

      default:
        return `<!-- Unsupported shape type: ${shape.type} -->\n`;
    }
  }

  /**
   * 在Canvas上绘制形状
   */
  private async drawShapeOnCanvas(ctx: CanvasRenderingContext2D, shape: Shape, bounds: { x: number; y: number }): Promise<void> {
    const shapeAny = shape as any;
    const style = shapeAny.style || {};
    const adjustedX = shape.x - bounds.x;
    const adjustedY = shape.y - bounds.y;

    ctx.save();

    if (style.opacity !== undefined) {
      ctx.globalAlpha = style.opacity;
    }

    switch (shape.type) {
      case 'rectangle':
        if (style.fill) {
          ctx.fillStyle = style.fill;
          ctx.fillRect(adjustedX, adjustedY, shapeAny.width, shapeAny.height);
        }
        if (style.stroke && style.strokeWidth) {
          ctx.strokeStyle = style.stroke;
          ctx.lineWidth = style.strokeWidth;
          ctx.strokeRect(adjustedX, adjustedY, shapeAny.width, shapeAny.height);
        }
        break;

      case 'circle':
        ctx.beginPath();
        ctx.arc(adjustedX, adjustedY, shapeAny.radius, 0, 2 * Math.PI);
        if (style.fill) {
          ctx.fillStyle = style.fill;
          ctx.fill();
        }
        if (style.stroke && style.strokeWidth) {
          ctx.strokeStyle = style.stroke;
          ctx.lineWidth = style.strokeWidth;
          ctx.stroke();
        }
        break;

      case 'text':
        if (shapeAny.text) {
          const fontSize = style.fontSize || 16;
          ctx.font = `${fontSize}px Arial`;
          if (style.fill) {
            ctx.fillStyle = style.fill;
            ctx.fillText(shapeAny.text, adjustedX, adjustedY);
          }
          if (style.stroke && style.strokeWidth) {
            ctx.strokeStyle = style.stroke;
            ctx.lineWidth = style.strokeWidth;
            ctx.strokeText(shapeAny.text, adjustedX, adjustedY);
          }
        }
        break;
    }

    ctx.restore();
  }

  /**
   * 处理内容格式
   */
  private async processContent(content: string): Promise<string | Blob> {
    if (this.params.format === 'png' || this.params.format === 'jpg') {
      // 将Data URL转换为Blob
      return this.dataURLToBlob(content);
    }
    return content;
  }

  /**
   * Data URL转Blob
   */
  private dataURLToBlob(dataURL: string): Blob {
    const arr = dataURL.split(',');
    const mimeMatch = arr[0].match(/:(.*?);/);
    const mime = mimeMatch ? mimeMatch[1] : 'image/png';
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);

    while (n--) {
      u8arr[n] = bstr.charCodeAt(n);
    }

    return new Blob([u8arr], { type: mime });
  }

  /**
   * 下载文件
   */
  private async downloadFile(): Promise<void> {
    if (!this.exportedContent) return;

    const filename = this.params.filename || this.generateFilename();

    // 创建下载链接
    const url = typeof this.exportedContent === 'string'
      ? `data:text/plain;charset=utf-8,${encodeURIComponent(this.exportedContent)}`
      : URL.createObjectURL(this.exportedContent);

    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.style.display = 'none';

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    // 清理URL对象
    if (typeof this.exportedContent !== 'string') {
      URL.revokeObjectURL(url);
    }
  }

  /**
   * 生成默认文件名
   */
  private generateFilename(): string {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
    return `canvas-export-${timestamp}.${this.params.format}`;
  }
}