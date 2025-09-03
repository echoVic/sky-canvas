import { IShape } from '../scene/IShape';
import { Scene } from '../scene/Scene';
import { Rect } from '@sky-canvas/render-engine';

/**
 * 导出选项接口
 */
export interface ExportOptions {
  width?: number;
  height?: number;
  backgroundColor?: string;
  quality?: number; // 0-1，用于PNG/JPEG
  scale?: number;  // 缩放因子
}

/**
 * 导入导出管理器
 */
export class ImportExportManager {
  /**
   * 导出到SVG
   */
  exportToSVG(shapes: IShape[], options?: { width?: number; height?: number }): string {
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
   * 形状转SVG
   */
  private shapeToSVG(shape: IShape): string | null {
    const bounds = shape.getBounds();
    
    // 根据形状类型生成SVG
    if (shape.constructor.name.includes('Rectangle')) {
      return `<rect x="${bounds.x}" y="${bounds.y}" width="${bounds.width}" height="${bounds.height}" fill="black"/>`;
    } else if (shape.constructor.name.includes('Circle')) {
      const cx = bounds.x + bounds.width / 2;
      const cy = bounds.y + bounds.height / 2;
      const r = Math.min(bounds.width, bounds.height) / 2;
      return `<circle cx="${cx}" cy="${cy}" r="${r}" fill="black"/>`;
    } else if (shape.constructor.name.includes('Path')) {
      // 检查是否是高级路径形状，支持导出为SVG路径数据
      if (typeof (shape as any).toSVGPathData === 'function') {
        const pathData = (shape as any).toSVGPathData();
        if (pathData) {
          return `<path d="${pathData}" fill="none" stroke="black"/>`;
        }
      }
      // 路径形状需要特殊处理
      return `<path d="M ${bounds.x} ${bounds.y} L ${bounds.x + bounds.width} ${bounds.y + bounds.height}" fill="none" stroke="black"/>`;
    } else if (shape.constructor.name.includes('Text')) {
      // 处理文本形状
      let text = '';
      if (typeof (shape as any).getText === 'function') {
        text = (shape as any).getText();
      }
      return `<text x="${bounds.x}" y="${bounds.y + bounds.height}" font-family="Arial" font-size="16">${text}</text>`;
    }
    
    // 默认矩形
    return `<rect x="${bounds.x}" y="${bounds.y}" width="${bounds.width}" height="${bounds.height}" fill="black"/>`;
  }
  
  /**
   * 导出到PNG
   */
  exportToPNG(canvas: HTMLCanvasElement, options?: ExportOptions): Promise<Blob> {
    return new Promise((resolve, reject) => {
      try {
        const exportCanvas = this.createExportCanvas(canvas, options);
        exportCanvas.toBlob((blob) => {
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error('Failed to create blob from canvas'));
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
  exportToJPEG(canvas: HTMLCanvasElement, options?: ExportOptions): Promise<Blob> {
    return new Promise((resolve, reject) => {
      try {
        const exportCanvas = this.createExportCanvas(canvas, options);
        exportCanvas.toBlob((blob) => {
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error('Failed to create blob from canvas'));
          }
        }, 'image/jpeg', options?.quality || 0.92);
      } catch (error) {
        reject(error);
      }
    });
  }
  
  /**
   * 创建导出画布
   */
  private createExportCanvas(canvas: HTMLCanvasElement, options?: ExportOptions): HTMLCanvasElement {
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
  
  /**
   * 导出到JSON
   */
  exportToJSON(scene: Scene): string {
    const sceneData = {
      version: '1.0',
      shapes: scene.getShapes().map(shape => this.shapeToJSON(shape)),
      metadata: {
        exportTime: new Date().toISOString(),
        shapeCount: scene.getShapes().length
      }
    };
    
    return JSON.stringify(sceneData, null, 2);
  }
  
  /**
   * 形状转JSON
   */
  private shapeToJSON(shape: IShape): any {
    return {
      id: shape.id,
      type: shape.constructor.name,
      position: shape.getPosition(),
      size: shape.getSize(),
      visible: shape.visible,
      zIndex: shape.zIndex,
      // 添加其他形状特定的属性
      properties: this.getShapeProperties(shape)
    };
  }
  
  /**
   * 获取形状属性
   */
  private getShapeProperties(shape: IShape): any {
    const properties: any = {};
    
    // 尝试获取常见的形状属性
    if (typeof (shape as any).getRadius === 'function') {
      properties.radius = (shape as any).getRadius();
    }
    
    if (typeof (shape as any).getText === 'function') {
      properties.text = (shape as any).getText();
    }
    
    if (typeof (shape as any).getPoints === 'function') {
      properties.points = (shape as any).getPoints();
    }
    
    if (typeof (shape as any).getColor === 'function') {
      properties.color = (shape as any).getColor();
    }
    
    // 高级路径形状的特殊属性
    if (typeof (shape as any).getPathData === 'function') {
      properties.pathData = (shape as any).getPathData();
    }
    
    // 富文本形状的特殊属性
    if (typeof (shape as any).getTextRuns === 'function') {
      properties.textRuns = (shape as any).getTextRuns();
    }
    
    return properties;
  }
  
  /**
   * 从JSON导入
   */
  importFromJSON(jsonData: string): Scene {
    const sceneData = JSON.parse(jsonData);
    const scene = new Scene();
    
    if (sceneData.shapes) {
      sceneData.shapes.forEach((shapeData: any) => {
        const shape = this.jsonToShape(shapeData);
        if (shape) {
          scene.addShape(shape);
        }
      });
    }
    
    return scene;
  }
  
  /**
   * JSON转形状
   */
  private jsonToShape(shapeData: any): IShape | null {
    // 简化实现：需要根据实际的形状类来创建
    console.warn(`JSON to shape conversion requires implementation of specific shape factories for type: ${shapeData.type}`);
    
    // 基本的形状重构实现
    try {
      // 这里应该根据shapeData.type创建相应的形状实例
      // 由于需要访问具体的形状类，这里只是示意实现
      const shape: any = {
        id: shapeData.id,
        type: shapeData.type,
        position: shapeData.position,
        size: shapeData.size,
        visible: shapeData.visible,
        zIndex: shapeData.zIndex
      };
      
      // 根据类型设置特定属性
      if (shapeData.properties) {
        Object.assign(shape, shapeData.properties);
      }
      
      return shape as IShape;
    } catch (error) {
      console.error('Failed to create shape from JSON:', error);
      return null;
    }
  }
  
  /**
   * 从SVG导入
   */
  importFromSVG(svgData: string): IShape[] {
    // 解析SVG数据并转换为形状
    const parser = new DOMParser();
    const doc = parser.parseFromString(svgData, 'image/svg+xml');
    const shapes: IShape[] = [];
    
    // 处理SVG元素
    const svgElements = doc.querySelectorAll('rect, circle, path, line, polyline, polygon');
    
    svgElements.forEach(element => {
      const shape = this.svgElementToShape(element);
      if (shape) {
        shapes.push(shape);
      }
    });
    
    return shapes;
  }
  
  /**
   * SVG元素转形状
   */
  private svgElementToShape(element: Element): IShape | null {
    const tagName = element.tagName.toLowerCase();
    
    switch (tagName) {
      case 'rect':
        return this.svgRectToShape(element);
      case 'circle':
        return this.svgCircleToShape(element);
      case 'path':
        return this.svgPathToShape(element);
      case 'line':
        return this.svgLineToShape(element);
      default:
        console.warn(`Unsupported SVG element: ${tagName}`);
        return null;
    }
  }
  
  /**
   * SVG矩形转形状
   */
  private svgRectToShape(element: Element): IShape | null {
    const x = parseFloat(element.getAttribute('x') || '0');
    const y = parseFloat(element.getAttribute('y') || '0');
    const width = parseFloat(element.getAttribute('width') || '0');
    const height = parseFloat(element.getAttribute('height') || '0');
    
    // 简化实现：需要创建具体的矩形形状
    console.warn(`SVG rect to shape conversion requires implementation: ${x},${y} ${width}x${height}`);
    
    // 基本数据结构
    const shape: any = {
      id: `imported_rect_${Date.now()}`,
      type: 'rectangle',
      position: { x, y },
      size: { width, height }
    };
    
    return shape as IShape;
  }
  
  /**
   * SVG圆形转形状
   */
  private svgCircleToShape(element: Element): IShape | null {
    const cx = parseFloat(element.getAttribute('cx') || '0');
    const cy = parseFloat(element.getAttribute('cy') || '0');
    const r = parseFloat(element.getAttribute('r') || '0');
    
    // 简化实现：需要创建具体的圆形形状
    console.warn(`SVG circle to shape conversion requires implementation: center(${cx},${cy}) radius(${r})`);
    
    // 基本数据结构
    const shape: any = {
      id: `imported_circle_${Date.now()}`,
      type: 'circle',
      position: { x: cx - r, y: cy - r },
      size: { width: r * 2, height: r * 2 }
    };
    
    return shape as IShape;
  }
  
  /**
   * SVG路径转形状
   */
  private svgPathToShape(element: Element): IShape | null {
    const pathData = element.getAttribute('d') || '';
    
    // 简化实现：需要创建具体的路径形状
    console.warn(`SVG path to shape conversion requires implementation: ${pathData}`);
    
    // 基本数据结构
    const shape: any = {
      id: `imported_path_${Date.now()}`,
      type: 'path',
      pathData: pathData
    };
    
    return shape as IShape;
  }
  
  /**
   * SVG线条转形状
   */
  private svgLineToShape(element: Element): IShape | null {
    const x1 = parseFloat(element.getAttribute('x1') || '0');
    const y1 = parseFloat(element.getAttribute('y1') || '0');
    const x2 = parseFloat(element.getAttribute('x2') || '0');
    const y2 = parseFloat(element.getAttribute('y2') || '0');
    
    // 简化实现：需要创建具体的线条形状
    console.warn(`SVG line to shape conversion requires implementation: from(${x1},${y1}) to(${x2},${y2})`);
    
    // 基本数据结构
    const shape: any = {
      id: `imported_line_${Date.now()}`,
      type: 'line',
      points: [
        { x: x1, y: y1 },
        { x: x2, y: y2 }
      ]
    };
    
    return shape as IShape;
  }
  
  /**
   * 从图像文件导入
   */
  async importFromImage(imageFile: File): Promise<any> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
          resolve({
            image: img,
            width: img.width,
            height: img.height
          });
        };
        img.onerror = reject;
        img.src = event.target?.result as string;
      };
      
      reader.onerror = reject;
      reader.readAsDataURL(imageFile);
    });
  }
  
  /**
   * 批量导出
   */
  async batchExport(shapes: IShape[], format: 'svg' | 'png' | 'json', options?: ExportOptions): Promise<Blob | string> {
    switch (format) {
      case 'svg':
        return new Blob([this.exportToSVG(shapes, options)], { type: 'image/svg+xml' });
      case 'png':
        // 需要canvas参数
        throw new Error('PNG export requires canvas parameter');
      case 'json':
        return this.exportToJSON(new Scene()); // 简化实现
      default:
        throw new Error(`Unsupported export format: ${format}`);
    }
  }
}