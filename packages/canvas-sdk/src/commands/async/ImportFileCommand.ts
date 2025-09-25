/**
 * 文件导入异步命令
 * 支持从文件导入Canvas内容
 */

import { AsyncCommand } from '../base';
import { CanvasModel } from '../../models/CanvasModel';
import { ShapeData } from '../../actions/types';

/**
 * 文件导入参数
 */
export interface ImportFileParams {
  file?: File;
  url?: string;
  format?: 'json' | 'svg' | 'png' | 'jpg';
  replaceExisting?: boolean; // 是否替换现有内容
  position?: { x: number; y: number }; // 导入位置
}

/**
 * 文件导入命令
 * 支持多种文件格式的导入
 */
export class ImportFileCommand extends AsyncCommand {
  private params: ImportFileParams;
  private importedShapeIds: string[] = [];
  private originalShapes?: ShapeData[];

  constructor(model: CanvasModel, params: ImportFileParams) {
    super(model, `Import file ${params.file?.name || params.url || 'unknown'}`);
    this.params = params;
  }

  async execute(): Promise<void> {
    this.resetProgress();
    this.updateProgress(0, 3); // 3个主要步骤

    try {
      // 第1步：读取文件内容
      this.updateProgress(1);
      const fileContent = await this.readFileContent();
      this.checkAborted();

      // 第2步：解析内容
      this.updateProgress(2);
      const shapeData = await this.parseFileContent(fileContent);
      this.checkAborted();

      // 第3步：导入到模型
      this.updateProgress(3);
      await this.importShapes(shapeData);

      this.markAsExecuted();
    } catch (error) {
      if (error instanceof Error && error.message === 'Command was aborted') {
        throw error;
      }
      throw new Error(`Import failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async undo(): Promise<void> {
    // 如果是替换现有内容，则恢复原有形状
    if (this.params.replaceExisting && this.originalShapes) {
      // 清空当前形状
      const currentShapes = this.model.getShapes();
      for (const shape of currentShapes) {
        this.model.removeShape(shape.id!);
      }

      // 恢复原有形状
      for (const shapeData of this.originalShapes) {
        this.model.addShape(this.createShapeFromData(shapeData));
      }
    } else {
      // 只删除导入的形状
      for (const shapeId of this.importedShapeIds) {
        this.model.removeShape(shapeId);
      }
    }

    this.markAsNotExecuted();
  }

  /**
   * 读取文件内容
   */
  private async readFileContent(): Promise<string | ArrayBuffer> {
    if (this.params.file) {
      return this.readFile(this.params.file);
    } else if (this.params.url) {
      return this.fetchFromUrl(this.params.url);
    } else {
      throw new Error('No file or URL provided');
    }
  }

  /**
   * 读取本地文件
   */
  private readFile(file: File): Promise<string | ArrayBuffer> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = () => {
        if (reader.result) {
          resolve(reader.result);
        } else {
          reject(new Error('Failed to read file'));
        }
      };

      reader.onerror = () => reject(new Error(`File read error: ${reader.error?.message}`));

      // 根据文件类型选择读取方式
      const format = this.params.format || this.getFormatFromFile(file);
      if (format === 'json' || format === 'svg') {
        reader.readAsText(file);
      } else {
        reader.readAsArrayBuffer(file);
      }
    });
  }

  /**
   * 从URL获取内容
   */
  private async fetchFromUrl(url: string): Promise<string | ArrayBuffer> {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to fetch from URL: ${response.statusText}`);
    }

    const format = this.params.format || this.getFormatFromUrl(url);
    if (format === 'json' || format === 'svg') {
      return response.text();
    } else {
      return response.arrayBuffer();
    }
  }

  /**
   * 解析文件内容
   */
  private async parseFileContent(content: string | ArrayBuffer): Promise<ShapeData[]> {
    const format = this.params.format || 'json';

    switch (format) {
      case 'json':
        return this.parseJsonContent(content as string);
      case 'svg':
        return this.parseSvgContent(content as string);
      case 'png':
      case 'jpg':
        return this.parseImageContent(content as ArrayBuffer);
      default:
        throw new Error(`Unsupported format: ${format}`);
    }
  }

  /**
   * 解析JSON内容
   */
  private parseJsonContent(content: string): ShapeData[] {
    try {
      const data = JSON.parse(content);

      if (Array.isArray(data)) {
        return data.filter(item => this.isValidShapeData(item));
      } else if (data && Array.isArray(data.shapes)) {
        return data.shapes.filter((item: any) => this.isValidShapeData(item));
      } else if (this.isValidShapeData(data)) {
        return [data];
      } else {
        throw new Error('Invalid JSON structure');
      }
    } catch (error) {
      throw new Error(`JSON parse error: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * 解析SVG内容（简化版）
   */
  private parseSvgContent(content: string): ShapeData[] {
    // 这是一个简化的SVG解析器，实际项目中需要更完善的实现
    const shapes: ShapeData[] = [];

    // 解析矩形
    const rectMatches = content.match(/<rect[^>]*>/g);
    if (rectMatches) {
      for (const match of rectMatches) {
        const x = this.extractAttribute(match, 'x') || 0;
        const y = this.extractAttribute(match, 'y') || 0;
        const width = this.extractAttribute(match, 'width') || 100;
        const height = this.extractAttribute(match, 'height') || 100;
        const fill = this.extractAttribute(match, 'fill') || '#000000';

        shapes.push({
          type: 'rectangle',
          x: Number(x),
          y: Number(y),
          width: Number(width),
          height: Number(height),
          style: { fill }
        });
      }
    }

    // 解析圆形
    const circleMatches = content.match(/<circle[^>]*>/g);
    if (circleMatches) {
      for (const match of circleMatches) {
        const cx = this.extractAttribute(match, 'cx') || 0;
        const cy = this.extractAttribute(match, 'cy') || 0;
        const r = this.extractAttribute(match, 'r') || 50;
        const fill = this.extractAttribute(match, 'fill') || '#000000';

        shapes.push({
          type: 'circle',
          x: Number(cx),
          y: Number(cy),
          radius: Number(r),
          style: { fill }
        });
      }
    }

    return shapes;
  }

  /**
   * 解析图片内容（创建图片形状）
   */
  private parseImageContent(content: ArrayBuffer): ShapeData[] {
    // 将图片作为base64编码保存在形状数据中
    const uint8Array = new Uint8Array(content);
    let binary = '';
    for (let i = 0; i < uint8Array.length; i++) {
      binary += String.fromCharCode(uint8Array[i]);
    }
    const base64 = btoa(binary);
    const mimeType = this.params.format === 'png' ? 'image/png' : 'image/jpeg';
    const dataUrl = `data:${mimeType};base64,${base64}`;

    return [{
      type: 'rectangle', // 用矩形形状承载图片
      x: this.params.position?.x || 0,
      y: this.params.position?.y || 0,
      width: 200, // 默认尺寸，实际应该根据图片尺寸调整
      height: 150,
      style: {
        fill: `url(${dataUrl})`
      }
    }];
  }

  /**
   * 导入形状到模型
   */
  private async importShapes(shapes: ShapeData[]): Promise<void> {
    if (this.params.replaceExisting) {
      // 保存原有形状用于撤销
      this.originalShapes = this.model.getShapes().map(shape => ({
        id: shape.id,
        type: shape.constructor.name.toLowerCase() as any,
        x: shape.x,
        y: shape.y,
        width: (shape as any).width,
        height: (shape as any).height,
        radius: (shape as any).radius,
        text: (shape as any).text,
        style: shape.style(),
        zIndex: shape.zIndex
      }));

      // 清空现有形状
      const currentShapes = this.model.getShapes();
      for (const shape of currentShapes) {
        this.model.removeShape(shape.id!);
      }
    }

    // 添加导入的形状
    const offsetX = this.params.position?.x || 0;
    const offsetY = this.params.position?.y || 0;

    for (const shapeData of shapes) {
      // 应用位置偏移
      const adjustedShapeData = {
        ...shapeData,
        x: shapeData.x + offsetX,
        y: shapeData.y + offsetY
      };

      const shape = this.createShapeFromData(adjustedShapeData);
      this.model.addShape(shape);
      this.importedShapeIds.push(shape.id!);
    }
  }

  /**
   * 从ShapeData创建Shape对象
   */
  private createShapeFromData(data: ShapeData): any {
    // 这里需要根据实际的Shape类来创建
    // 简化实现，实际需要根据render-engine的Shape类来创建
    return {
      id: data.id || `shape-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type: data.type,
      x: data.x,
      y: data.y,
      width: data.width,
      height: data.height,
      radius: data.radius,
      text: data.text,
      style: data.style,
      zIndex: data.zIndex || 0,
      visible: data.visible !== false,
      locked: data.locked || false
    };
  }

  /**
   * 验证形状数据
   */
  private isValidShapeData(data: any): data is ShapeData {
    return data &&
      typeof data === 'object' &&
      typeof data.type === 'string' &&
      typeof data.x === 'number' &&
      typeof data.y === 'number';
  }

  /**
   * 从文件名推断格式
   */
  private getFormatFromFile(file: File): string {
    const extension = file.name.split('.').pop()?.toLowerCase();
    switch (extension) {
      case 'json': return 'json';
      case 'svg': return 'svg';
      case 'png': return 'png';
      case 'jpg':
      case 'jpeg': return 'jpg';
      default: return 'json';
    }
  }

  /**
   * 从URL推断格式
   */
  private getFormatFromUrl(url: string): string {
    const extension = url.split('.').pop()?.toLowerCase();
    return this.getFormatFromFile({ name: `file.${extension}` } as File);
  }

  /**
   * 从XML属性中提取值
   */
  private extractAttribute(xmlString: string, attributeName: string): string | null {
    const regex = new RegExp(`${attributeName}\\s*=\\s*["']([^"']*)["']`);
    const match = xmlString.match(regex);
    return match ? match[1] : null;
  }
}