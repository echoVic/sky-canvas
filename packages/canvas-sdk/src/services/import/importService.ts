/**
 * 导入服务 - 单一职责：处理各种格式的导入功能
 */

import { injectable } from '../../di/ServiceIdentifier';
import { ShapeEntity, ShapeEntityFactory } from '../../models/entities/Shape';

/**
 * 导入结果接口
 */
export interface IImportResult {
  success: boolean;
  shapes: ShapeEntity[];
  errors: string[];
  metadata?: {
    version?: string;
    timestamp?: string;
    originalFormat?: string;
  };
}

/**
 * 导入服务接口
 */
export interface IImportService {
  // JSON 导入
  importFromJSON(jsonString: string): Promise<IImportResult>;
  
  // 文件导入
  importFromFile(file: File): Promise<IImportResult>;
  
  // SVG 导入 (基础支持)
  importFromSVG(svgString: string): Promise<IImportResult>;
  
  // 图片导入 (转换为背景形状)
  importImage(file: File): Promise<IImportResult>;
  
  // 验证文件格式
  validateFileFormat(file: File): boolean;
}

/**
 * 支持的文件格式
 */
export enum SupportedFormat {
  JSON = 'json',
  SVG = 'svg',
  PNG = 'png',
  JPEG = 'jpeg',
  JPG = 'jpg'
}

/**
 * 导入服务实现
 */
@injectable
export class ImportService implements IImportService {

  /**
   * 从JSON导入
   */
  async importFromJSON(jsonString: string): Promise<IImportResult> {
    try {
      const data = JSON.parse(jsonString);
      
      if (!data.shapes || !Array.isArray(data.shapes)) {
        return {
          success: false,
          shapes: [],
          errors: ['Invalid JSON format: missing shapes array']
        };
      }
      
      const shapes: ShapeEntity[] = [];
      const errors: string[] = [];
      
      data.shapes.forEach((shapeData: any, index: number) => {
        try {
          const shape = this.createShapeFromData(shapeData);
          if (shape) {
            shapes.push(shape);
          } else {
            errors.push(`Failed to create shape at index ${index}`);
          }
        } catch (error) {
          errors.push(`Error processing shape at index ${index}: ${error}`);
        }
      });
      
      return {
        success: errors.length === 0,
        shapes,
        errors,
        metadata: {
          version: data.version,
          timestamp: data.timestamp,
          originalFormat: 'json'
        }
      };
    } catch (error) {
      return {
        success: false,
        shapes: [],
        errors: [`JSON parsing error: ${error}`]
      };
    }
  }

  /**
   * 从文件导入
   */
  async importFromFile(file: File): Promise<IImportResult> {
    if (!this.validateFileFormat(file)) {
      return {
        success: false,
        shapes: [],
        errors: [`Unsupported file format: ${file.type}`]
      };
    }
    
    const extension = file.name.split('.').pop()?.toLowerCase();
    
    try {
      switch (extension) {
        case 'json':
          const jsonContent = await this.readFileAsText(file);
          return this.importFromJSON(jsonContent);
          
        case 'svg':
          const svgContent = await this.readFileAsText(file);
          return this.importFromSVG(svgContent);
          
        case 'png':
        case 'jpg':
        case 'jpeg':
          return this.importImage(file);
          
        default:
          return {
            success: false,
            shapes: [],
            errors: [`Unsupported file extension: ${extension}`]
          };
      }
    } catch (error) {
      return {
        success: false,
        shapes: [],
        errors: [`File reading error: ${error}`]
      };
    }
  }

  /**
   * 从SVG导入 (基础支持)
   */
  async importFromSVG(svgString: string): Promise<IImportResult> {
    try {
      // 基础的SVG解析，可以扩展更复杂的解析逻辑
      const parser = new DOMParser();
      const svgDoc = parser.parseFromString(svgString, 'image/svg+xml');
      const svgElement = svgDoc.querySelector('svg');
      
      if (!svgElement) {
        return {
          success: false,
          shapes: [],
          errors: ['Invalid SVG format']
        };
      }
      
      const shapes: ShapeEntity[] = [];
      const errors: string[] = [];
      
      // 解析基本形状
      const rects = svgElement.querySelectorAll('rect');
      const circles = svgElement.querySelectorAll('circle');
      const paths = svgElement.querySelectorAll('path');
      
      // 转换矩形
      rects.forEach((rect, index) => {
        try {
          const shape = this.createRectangleFromSVG(rect);
          if (shape) shapes.push(shape);
        } catch (error) {
          errors.push(`Error parsing rectangle ${index}: ${error}`);
        }
      });
      
      // 转换圆形
      circles.forEach((circle, index) => {
        try {
          const shape = this.createCircleFromSVG(circle);
          if (shape) shapes.push(shape);
        } catch (error) {
          errors.push(`Error parsing circle ${index}: ${error}`);
        }
      });
      
      // 转换路径
      paths.forEach((path, index) => {
        try {
          const shape = this.createPathFromSVG(path);
          if (shape) shapes.push(shape);
        } catch (error) {
          errors.push(`Error parsing path ${index}: ${error}`);
        }
      });
      
      return {
        success: true,
        shapes,
        errors,
        metadata: {
          originalFormat: 'svg'
        }
      };
    } catch (error) {
      return {
        success: false,
        shapes: [],
        errors: [`SVG parsing error: ${error}`]
      };
    }
  }

  /**
   * 导入图片 (转换为背景形状)
   */
  async importImage(file: File): Promise<IImportResult> {
    try {
      const imageUrl = URL.createObjectURL(file);
      
      // 创建一个表示图片的形状（可以扩展为专门的图片形状类型）
      const shape = ShapeEntityFactory.createRectangle(
        { x: 0, y: 0 },
        { width: 400, height: 300 }, // 默认尺寸，实际使用时应该获取图片尺寸
        {
          fillColor: 'transparent'
        }
      );
      
      // 添加图片数据（这里简化处理，实际需要更复杂的图片形状类型）
      (shape as any).imageUrl = imageUrl;
      (shape as any).fileName = file.name;
      
      return {
        success: true,
        shapes: [shape],
        errors: [],
        metadata: {
          originalFormat: file.type,
          fileName: file.name
        }
      };
    } catch (error) {
      return {
        success: false,
        shapes: [],
        errors: [`Image import error: ${error}`]
      };
    }
  }

  /**
   * 验证文件格式
   */
  validateFileFormat(file: File): boolean {
    const supportedTypes = [
      'application/json',
      'image/svg+xml',
      'text/svg+xml',
      'image/png',
      'image/jpeg',
      'image/jpg'
    ];
    
    const supportedExtensions = ['json', 'svg', 'png', 'jpg', 'jpeg'];
    const extension = file.name.split('.').pop()?.toLowerCase();
    
    return supportedTypes.includes(file.type) || (extension ? supportedExtensions.includes(extension) : false);
  }

  // === 私有方法 ===

  /**
   * 从数据创建形状
   */
  private createShapeFromData(data: any): ShapeEntity | null {
    if (!data.type || !data.id) return null;
    
    try {
      switch (data.type) {
        case 'rectangle':
          return ShapeEntityFactory.createRectangle(
            data.transform?.position || { x: 0, y: 0 },
            data.size || { width: 100, height: 100 },
            data.style || {}
          );
          
        case 'circle':
          return ShapeEntityFactory.createCircle(
            data.transform?.position || { x: 0, y: 0 },
            data.radius || 50,
            data.style || {}
          );
          
        case 'path':
          return ShapeEntityFactory.createPath(
            data.pathData || 'M 0 0',
            data.transform?.position || { x: 0, y: 0 },
            data.style || {}
          );
          
        case 'text':
          return ShapeEntityFactory.createText(
            data.content || '',
            data.transform?.position || { x: 0, y: 0 },
            data.style || {}
          );
          
        default:
          return null;
      }
    } catch (error) {
      console.error('Error creating shape from data:', error);
      return null;
    }
  }

  /**
   * 从SVG矩形创建形状
   */
  private createRectangleFromSVG(rect: SVGRectElement): ShapeEntity | null {
    const x = parseFloat(rect.getAttribute('x') || '0');
    const y = parseFloat(rect.getAttribute('y') || '0');
    const width = parseFloat(rect.getAttribute('width') || '100');
    const height = parseFloat(rect.getAttribute('height') || '100');
    const fill = rect.getAttribute('fill') || 'black';
    const stroke = rect.getAttribute('stroke') || 'none';
    const strokeWidth = parseFloat(rect.getAttribute('stroke-width') || '0');
    
    return ShapeEntityFactory.createRectangle(
      { x, y },
      { width, height },
      {
        fillColor: fill,
        strokeColor: stroke,
        strokeWidth
      }
    );
  }

  /**
   * 从SVG圆形创建形状
   */
  private createCircleFromSVG(circle: SVGCircleElement): ShapeEntity | null {
    const cx = parseFloat(circle.getAttribute('cx') || '0');
    const cy = parseFloat(circle.getAttribute('cy') || '0');
    const r = parseFloat(circle.getAttribute('r') || '50');
    const fill = circle.getAttribute('fill') || 'black';
    const stroke = circle.getAttribute('stroke') || 'none';
    const strokeWidth = parseFloat(circle.getAttribute('stroke-width') || '0');
    
    return ShapeEntityFactory.createCircle(
      { x: cx - r, y: cy - r },
      r,
      {
        fillColor: fill,
        strokeColor: stroke,
        strokeWidth
      }
    );
  }

  /**
   * 从SVG路径创建形状
   */
  private createPathFromSVG(path: SVGPathElement): ShapeEntity | null {
    const pathData = path.getAttribute('d') || 'M 0 0';
    const fill = path.getAttribute('fill') || 'none';
    const stroke = path.getAttribute('stroke') || 'black';
    const strokeWidth = parseFloat(path.getAttribute('stroke-width') || '1');
    
    return ShapeEntityFactory.createPath(
      pathData,
      { x: 0, y: 0 },
      {
        fillColor: fill,
        strokeColor: stroke,
        strokeWidth
      }
    );
  }

  /**
   * 读取文件为文本
   */
  private readFileAsText(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => reject(reader.error);
      reader.readAsText(file);
    });
  }
}