/**
 * 导出服务 - 单一职责：处理各种格式的导出功能
 */

import { Shape } from '@sky-canvas/render-engine';
import { createDecorator } from '../../di';

/**
 * 导出选项接口
 */
export interface IExportOptions {
  width?: number;
  height?: number;
  backgroundColor?: string;
  quality?: number; // 0-1，用于PNG/JPEG
  scale?: number;  // 缩放因子
}

/**
 * 导出服务接口
 */
export interface IExportService {
  // SVG 导出
  exportToSVG(shapes: Shape[], options?: { width?: number; height?: number }): string;
  
  // 图片导出
  exportToPNG(canvas: HTMLCanvasElement, options?: IExportOptions): Promise<Blob>;
  exportToJPEG(canvas: HTMLCanvasElement, options?: IExportOptions): Promise<Blob>;
  
  // JSON 导出
  exportToJSON(shapes: Shape[]): string;
  
  // 下载文件
  downloadFile(content: string | Blob, filename: string, mimeType?: string): void;
}

export const IExportService = createDecorator<IExportService>('ExportService');

/**
 * 导出服务实现
 */
export class ExportService implements IExportService {
  
  /**
   * 导出到SVG
   */
  exportToSVG(shapes: Shape[], options?: { width?: number; height?: number }): string {
    const width = options?.width || 800;
    const height = options?.height || 600;
    
    let svg = `<?xml version="1.0" encoding="UTF-8"?>\n`;
    svg += `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">\n`;
    
    // 添加背景
    svg += `  <rect width="100%" height="100%" fill="white"/>\n`;
    
    // 导出每个形状
    shapes.forEach(shape => {
      if (shape.visible) {
        const shapeSVG = this.shapeToSVG(shape);
        if (shapeSVG) {
          svg += `  ${shapeSVG}\n`;
        }
      }
    });
    
    svg += `</svg>`;
    return svg;
  }

  /**
   * 导出到PNG
   */
  exportToPNG(canvas: HTMLCanvasElement, options?: IExportOptions): Promise<Blob> {
    return new Promise((resolve, reject) => {
      try {
        const exportCanvas = this.createExportCanvas(canvas, options);
        exportCanvas.toBlob((blob) => {
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error('Failed to create PNG blob'));
          }
        }, 'image/png', options?.quality || 0.92);
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * 导出到JPEG
   */
  exportToJPEG(canvas: HTMLCanvasElement, options?: IExportOptions): Promise<Blob> {
    return new Promise((resolve, reject) => {
      try {
        const exportCanvas = this.createExportCanvas(canvas, options);
        exportCanvas.toBlob((blob) => {
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error('Failed to create JPEG blob'));
          }
        }, 'image/jpeg', options?.quality || 0.8);
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * 导出到JSON
   */
  exportToJSON(shapes: Shape[]): string {
    const exportData = {
      version: '1.0',
      shapes: shapes.filter(shape => shape.visible),
      timestamp: new Date().toISOString()
    };
    
    return JSON.stringify(exportData, null, 2);
  }

  /**
   * 下载文件
   */
  downloadFile(content: string | Blob, filename: string, mimeType?: string): void {
    let blob: Blob;
    
    if (content instanceof Blob) {
      blob = content;
    } else {
      blob = new Blob([content], { type: mimeType || 'text/plain' });
    }
    
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.style.display = 'none';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    // 清理URL对象
    URL.revokeObjectURL(url);
  }

  // === 私有方法 ===

  /**
   * 形状转SVG
   */
  private shapeToSVG(shape: Shape): string | null {
    const style = shape.style();
    const fill = style.fill || 'black';
    const stroke = style.stroke || 'none';
    const strokeWidth = style.strokeWidth || 0;
    
    switch (shape.constructor.name.toLowerCase()) {
      case 'rectangle':
        const rectShape = shape as any;
        const bounds = shape.getBounds();
        return `<rect x="${shape.x}" y="${shape.y}" width="${bounds.width}" height="${bounds.height}" fill="${fill}" stroke="${stroke}" stroke-width="${strokeWidth}"/>`;

      case 'circle':
        const circleBounds = shape.getBounds();
        const radius = circleBounds.width / 2;
        const cx = shape.x + radius;
        const cy = shape.y + radius;
        return `<circle cx="${cx}" cy="${cy}" r="${radius}" fill="${fill}" stroke="${stroke}" stroke-width="${strokeWidth}"/>`;
        
      case 'path':
        const pathShape = shape as any;
        return `<path d="${pathShape.pathData || 'M 0 0'}" fill="none" stroke="${stroke}" stroke-width="${strokeWidth}"/>`;
        
      case 'text':
        const textShape = shape as any;
        return `<text x="${shape.x}" y="${shape.y + (textShape.fontSize || 16)}" font-family="${textShape.fontFamily || 'Arial'}" font-size="${textShape.fontSize || 16}" fill="${fill}">${textShape.content || ''}</text>`;

      default:
        // 默认矩形
        return `<rect x="${shape.x}" y="${shape.y}" width="100" height="100" fill="${fill}" stroke="${stroke}" stroke-width="${strokeWidth}"/>`;
    }
  }

  /**
   * 创建导出画布
   */
  private createExportCanvas(canvas: HTMLCanvasElement, options?: IExportOptions): HTMLCanvasElement {
    const scale = options?.scale || 1;
    const width = (options?.width || canvas.width) * scale;
    const height = (options?.height || canvas.height) * scale;
    
    const exportCanvas = document.createElement('canvas');
    exportCanvas.width = width;
    exportCanvas.height = height;
    
    const ctx = exportCanvas.getContext('2d');
    if (!ctx) {
      throw new Error('Failed to get 2D context');
    }
    
    // 设置背景色
    if (options?.backgroundColor) {
      ctx.fillStyle = options.backgroundColor;
      ctx.fillRect(0, 0, width, height);
    }
    
    // 绘制原画布内容
    ctx.scale(scale, scale);
    ctx.drawImage(canvas, 0, 0);
    
    return exportCanvas;
  }
}