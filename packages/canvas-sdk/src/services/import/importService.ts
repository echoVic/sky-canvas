/**
 * 导入服务 - 单一职责：处理各种格式的导入功能
 */

// 导入服务不需要DI注册，作为工具类使用
import { Circle, Rectangle, Shape } from '@sky-canvas/render-engine';
import { createDecorator } from '../../di';

/**
 * 导入结果接口
 */
export interface IImportResult {
  success: boolean;
  shapes: Shape[];
  errors: string[];
  metadata?: {
    version?: string;
    timestamp?: string;
    originalFormat?: string;
    fileName?: string;
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

export const IImportService = createDecorator<IImportService>('ImportService');

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
      
      const shapes: Shape[] = [];
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
      
      const shapes: Shape[] = [];
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
      const shape = new Rectangle({
        x: 0,
        y: 0,
        width: 400,
        height: 300,
        style: {
          fill: 'transparent'
        }
      });
      
      // render-engine 的 Shape 类型不支持 metadata 属性
      // 图片信息暂时无法保存到形状中
      
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
  private createShapeFromData(data: any): Shape | null {
    if (!data.type || !data.id) return null;
    
    try {
      switch (data.type) {
        case 'rectangle':
          const pos = data.transform?.position || { x: 0, y: 0 };
          const size = data.size || { width: 100, height: 100 };
          return new Rectangle({
            x: pos.x,
            y: pos.y,
            width: size.width,
            height: size.height,
            style: data.style || {}
          });

        case 'circle':
          const circlePos = data.transform?.position || { x: 0, y: 0 };
          const radius = data.radius || 50;
          return new Circle({
            x: circlePos.x + radius,
            y: circlePos.y + radius,
            radius: radius,
            style: data.style || {}
          });

        case 'path':
          // Path 类型暂不支持，返回占位Rectangle
          const pathPos = data.transform?.position || { x: 0, y: 0 };
          return new Rectangle({
            x: pathPos.x,
            y: pathPos.y,
            width: 100,
            height: 100,
            style: data.style || {}
          });

        case 'text':
          // Text 类型暂不支持，返回占位Rectangle
          const textPos = data.transform?.position || { x: 0, y: 0 };
          return new Rectangle({
            x: textPos.x,
            y: textPos.y,
            width: 100,
            height: 50,
            style: data.style || {}
          });
          
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
  private createRectangleFromSVG(rect: SVGRectElement): Shape | null {
    const x = parseFloat(rect.getAttribute('x') || '0');
    const y = parseFloat(rect.getAttribute('y') || '0');
    const width = parseFloat(rect.getAttribute('width') || '100');
    const height = parseFloat(rect.getAttribute('height') || '100');
    const fill = rect.getAttribute('fill') || 'black';
    const stroke = rect.getAttribute('stroke') || 'none';
    const strokeWidth = parseFloat(rect.getAttribute('stroke-width') || '0');
    
    return new Rectangle({
      x,
      y,
      width,
      height,
      style: {
        fill: fill,
        stroke: stroke,
        strokeWidth
      }
    });
  }

  /**
   * 从SVG圆形创建形状
   */
  private createCircleFromSVG(circle: SVGCircleElement): Shape | null {
    const cx = parseFloat(circle.getAttribute('cx') || '0');
    const cy = parseFloat(circle.getAttribute('cy') || '0');
    const r = parseFloat(circle.getAttribute('r') || '50');
    const fill = circle.getAttribute('fill') || 'black';
    const stroke = circle.getAttribute('stroke') || 'none';
    const strokeWidth = parseFloat(circle.getAttribute('stroke-width') || '0');
    
    return new Circle({
      x: cx,
      y: cy,
      radius: r,
      style: {
        fill: fill,
        stroke: stroke,
        strokeWidth
      }
    });
  }

  /**
   * 从SVG路径创建形状
   */
  private createPathFromSVG(path: SVGPathElement): Shape | null {
    const pathData = path.getAttribute('d') || 'M 0 0';
    const fill = path.getAttribute('fill') || 'none';
    const stroke = path.getAttribute('stroke') || 'black';
    const strokeWidth = parseFloat(path.getAttribute('stroke-width') || '1');
    
    // Path 暂不支持，返回占位Rectangle
    return new Rectangle({
      x: 0,
      y: 0,
      width: 100,
      height: 100,
      style: {
        fill: fill,
        stroke: stroke,
        strokeWidth
      }
    });
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